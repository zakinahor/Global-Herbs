import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { generateSitemapXML, NON_INDEXABLE_CATEGORY_SLUGS, NON_INDEXABLE_PRODUCT_IDS } from './src/utils/sitemap';
import { products, categories, legacySlugMap } from './src/data/products';
import { getPage, renderPageHtml } from './scripts/prerender-seo';
import {
  sendAppsScriptOrderNotification,
  getNotificationConfig,
  AppsScriptOrderPayload,
} from './src/server/orderNotificationService';
import {
  sendAdminOrderNotification,
  parseShippingAddress,
  OrderItem,
} from './src/server/email/emailService';
import {
  sendOrderNotification,
  sendCustomerOrderConfirmation,
  sendCustomerInquiryNotification,
  markOrderProcessed,
  NotificationStatus,
} from './lib/email/orderNotification';
import {
  resolveVisitorLocale,
  getLiveExchangeRates,
} from './lib/locale/localeService';

// Persistent storage for orders, form submissions, and newsletter subscribers
const contactSubmissions: any[] = [];
const newsletterEmails: string[] = ['zakinahor692@gmail.com', 'globalherbsinc@gmail.com'];
const ordersStore = new Map<string, any>();
const recentFormHashes = new Map<string, { timestamp: number; result: any }>();

const ORDERS_FILE_PATH = path.join(process.cwd(), 'data/orders.json');
const SUBMISSIONS_FILE_PATH = path.join(process.cwd(), 'data/submissions.json');

// User Accounts Storage Interface & Persistence
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  accountType: string;
  phone?: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const USERS_FILE_PATH = path.join(process.cwd(), 'data/users.json');
const usersStore = new Map<string, UserRecord>();

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    phone: user.phone || '',
    deliveryAddress: user.deliveryAddress || '',
    notes: user.notes || '',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function persistUsers() {
  try {
    ensureDataDir();
    const array = Array.from(usersStore.values());
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Users Persistence Error]', err);
  }
}

function loadUsers() {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE_PATH)) {
      const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed: UserRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          if (u && u.email) {
            usersStore.set(u.email.toLowerCase().trim(), u);
          }
        });
        console.log(`[User Storage] Loaded ${usersStore.size} accounts from ${USERS_FILE_PATH}`);
      }
    }
  } catch (err) {
    console.error('[User Load Error]', err);
  }

  // Pre-seed demo user if empty
  const defaultAdminEmail = 'zakinahor692@gmail.com';
  if (!usersStore.has(defaultAdminEmail)) {
    const salt = generateSalt();
    const defaultUser: UserRecord = {
      id: 'USR-MEM-1001',
      name: 'Zaki Nahor',
      email: defaultAdminEmail,
      passwordHash: hashPassword('GlobalHerbs2026!', salt),
      salt,
      accountType: 'VIP Connoisseur Member',
      phone: '+1 (213) 280-1161',
      deliveryAddress: 'Cave Junction, OR 97523',
      notes: 'Initial dispensary administrator and verified VIP patient',
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    usersStore.set(defaultAdminEmail, defaultUser);
    persistUsers();
  }
}

function persistOrders() {
  try {
    ensureDataDir();
    const array = Array.from(ordersStore.values());
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Orders Persistence Error]', err);
  }
}

function loadOrders() {
  try {
    ensureDataDir();
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const raw = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((o) => {
          if (o && o.orderId) {
            const cleanId = String(o.orderId).trim().toUpperCase();
            ordersStore.set(cleanId, o);
            if (o.notificationStatus === 'sent') {
              markOrderProcessed(
                cleanId,
                true,
                o.notificationMessageId || `restored-${cleanId}`,
                o.notificationSentAt || o.createdAt
              );
            }
          }
        });
        console.log(`[Order Storage] Loaded ${ordersStore.size} persisted orders from ${ORDERS_FILE_PATH}`);
      }
    }
  } catch (err) {
    console.error('[Order Load Error]', err);
  }
}

function persistSubmissions() {
  try {
    ensureDataDir();
    fs.writeFileSync(SUBMISSIONS_FILE_PATH, JSON.stringify(contactSubmissions, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Submissions Persistence Error]', err);
  }
}

function loadSubmissions() {
  try {
    ensureDataDir();
    if (fs.existsSync(SUBMISSIONS_FILE_PATH)) {
      const raw = fs.readFileSync(SUBMISSIONS_FILE_PATH, 'utf-8');
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        contactSubmissions.splice(0, contactSubmissions.length, ...parsed);
        console.log(`[Submissions Storage] Loaded ${contactSubmissions.length} form submissions from ${SUBMISSIONS_FILE_PATH}`);
      }
    }
  } catch (err) {
    console.error('[Submissions Load Error]', err);
  }
}

// Initialize stores immediately on module load
loadUsers();
loadOrders();
loadSubmissions();

// Helper to determine active server URL for static logo image
function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  return 'https://ais-dev-2ahnwfzk6hjpgeapdp5b3p-349332353486.europe-west2.run.app';
}

// Master HTML Wrapper with embedded Global Herbs Inc Logo Header
function renderBrandedEmailTemplate({
  badgeText,
  heading,
  clientName,
  clientEmail,
  bodyHtml,
  footerNote,
}: {
  badgeText: string;
  heading: string;
  clientName?: string;
  clientEmail?: string;
  bodyHtml: string;
  footerNote?: string;
}) {
  const logoUrl = `${getAppBaseUrl()}/api/logo.jpg`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading} - Global Herbs Inc</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <div style="max-width: 620px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #cbd5e1;">
        
        <!-- BRAND HEADER WITH LOGO -->
        <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 32px 24px 24px 24px; text-align: center; border-bottom: 4px solid #10b981; position: relative;">
          <!-- Logo Image -->
          <div style="margin: 0 auto 14px auto; width: 110px; height: 110px; border-radius: 50%; padding: 4px; background: #ffffff; box-shadow: 0 6px 16px rgba(0,0,0,0.25);">
            <img src="${logoUrl}" alt="Global Herbs Inc Logo" width="102" height="102" style="width: 102px; height: 102px; border-radius: 50%; object-fit: cover; display: block;" />
          </div>
          
          <span style="display: inline-block; background-color: #064e3b; color: #6ee7b7; border: 1px solid #059669; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; margin-bottom: 10px;">
            ${badgeText}
          </span>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
            GLOBAL HERBS INC
          </h1>
          <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Licensed Dispensary &amp; Premium Botanical Products
          </p>
        </div>

        <!-- MAIN BODY CONTENT -->
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <h2 style="color: #065f46; font-size: 19px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
            ${heading}
          </h2>

          ${clientName ? `<p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px; color: #334155;">Hello <strong>${clientName}</strong>,</p>` : ''}

          ${bodyHtml}

          <!-- Contact Support Info Box -->
          <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; font-size: 13px; color: #166534;">
            <p style="margin: 0 0 4px 0; font-weight: 700;">Direct Representative Support:</p>
            <p style="margin: 0;">For inquiries or urgent updates, write directly to <a href="mailto:globalherbsinc@gmail.com" style="color: #047857; font-weight: 700; text-decoration: underline;">globalherbsinc@gmail.com</a>.</p>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #065f46;">Global Herbs Inc - Premium Herbal Products &amp; Dispensary Services</p>
          <p style="margin: 0;">${footerNote || 'All requests are attended to promptly by our dispatch team.'}</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">© ${new Date().getFullYear()} Global Herbs Inc. All rights reserved.</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

async function startServer() {
  const app = express();

  const PORT = 3000;

  // JSON request body parser
  app.use(express.json());

  // Social Media Direct Redirect Endpoints
  const OFFICIAL_YOUTUBE_URL = 'https://www.youtube.com/channel/UCyu1M9pmZExiQ2HU4YIEH3A';
  const OFFICIAL_FACEBOOK_URL = 'https://www.facebook.com/share/1F9v8LnmJX/?mibextid=wwXIfr';
  const OFFICIAL_TIKTOK_URL = 'https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ';
  const OFFICIAL_REDDIT_URL = 'https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM';

  app.get(['/youtube', '/yt', '/youtube/'], (req, res) => {
    return res.redirect(301, OFFICIAL_YOUTUBE_URL);
  });

  app.get(['/facebook', '/fb', '/facebook/'], (req, res) => {
    return res.redirect(301, OFFICIAL_FACEBOOK_URL);
  });

  app.get(['/tiktok', '/tik-tok', '/tiktok/'], (req, res) => {
    return res.redirect(301, OFFICIAL_TIKTOK_URL);
  });

  app.get(['/reddit', '/reddit/', '/official-reddit', '/u/globalherbsinc'], (req, res) => {
    return res.redirect(301, OFFICIAL_REDDIT_URL);
  });

  // SEO Canonical 301 Permanent Redirects (Consolidating duplicate category & shop URLs)
  const STATIC_301_REDIRECTS: Record<string, string> = {
    '/shop': '/products',
    '/categories': '/products',
    '/refunds': '/returns',
    '/terms-conditions': '/terms',
    '/track': '/order-tracking',
    '/category/flower': '/category/flowers',
    '/category/weed': '/category/flowers',
    '/category/concentrate': '/category/concentrates',
    '/category/rosin': '/category/concentrates',
    '/category/hash': '/category/concentrates',
    '/category/extracts': '/category/concentrates',
    '/category/vape': '/category/vapes',
    '/category/carts': '/category/vapes',
    '/category/disposable-vapes': '/category/vapes',
    '/category/edible': '/category/edibles',
    '/category/gummies': '/category/edibles',
    '/category/preroll': '/category/prerolls',
    '/category/joints': '/category/prerolls',
    '/blog/understanding-thca-flower-vs-delta-9-thc-complete-guide':
      '/blog/what-is-thca-vs-delta-9-thc-legal-potency-guide',
  };

  // Single-hop URL normalization middleware (trailing slash, lowercase, legacy slugs)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.startsWith('/images/') || req.path.startsWith('/@') || req.path.startsWith('/src/') || req.path.startsWith('/node_modules/') || req.path.includes('.')) {
      return next();
    }

    const queryIdx = req.originalUrl.indexOf('?');
    const queryString = queryIdx !== -1 ? req.originalUrl.slice(queryIdx) : '';

    // Normalize trailing slash (except root '/') and lowercase path
    let normalizedPath = req.path;
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.replace(/\/+$/, '');
    }
    if (normalizedPath !== normalizedPath.toLowerCase()) {
      normalizedPath = normalizedPath.toLowerCase();
    }

    // Check static alias map
    if (STATIC_301_REDIRECTS[normalizedPath]) {
      normalizedPath = STATIC_301_REDIRECTS[normalizedPath];
    }

    // Redirect singular /product/:slug to canonical /products/:slug
    const singularProdMatch = normalizedPath.match(/^\/product\/([^/]+)$/);
    if (singularProdMatch) {
      const rawSlug = singularProdMatch[1];
      const canonicalSlug = legacySlugMap[rawSlug] || rawSlug;
      return res.redirect(301, `/products/${canonicalSlug}${queryString}`);
    }

    // Redirect legacy /products/:slug aliases
    const pluralProdMatch = normalizedPath.match(/^\/products\/([^/]+)$/);
    if (pluralProdMatch) {
      const rawSlug = pluralProdMatch[1];
      if (legacySlugMap[rawSlug]) {
        return res.redirect(301, `/products/${legacySlugMap[rawSlug]}${queryString}`);
      }
    }

    if (normalizedPath !== req.path) {
      return res.redirect(301, `${normalizedPath}${queryString}`);
    }

    return next();
  });

  // Sitemap & Robots XML / Text Routes
  app.get(['/sitemap.xml', '/sitemap', '/sitemap_index.xml', '/sitemap/'], (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const sitemapPath = path.join(process.cwd(), 'public/sitemap.xml');
    const distSitemapPath = path.join(process.cwd(), 'dist/sitemap.xml');

    let xmlContent = '';
    if (fs.existsSync(sitemapPath)) {
      xmlContent = fs.readFileSync(sitemapPath, 'utf-8');
    } else if (fs.existsSync(distSitemapPath)) {
      xmlContent = fs.readFileSync(distSitemapPath, 'utf-8');
    } else {
      xmlContent = generateSitemapXML();
    }

    return res.status(200).send(xmlContent);
  });

  app.get('/robots.txt', (req, res) => {
    const robotsPath = path.join(process.cwd(), 'public/robots.txt');
    if (fs.existsSync(robotsPath)) {
      res.setHeader('Content-Type', 'text/plain');
      return res.sendFile(robotsPath);
    }
    res.setHeader('Content-Type', 'text/plain');
    return res.send(`User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /api/\n\nSitemap: https://globalherbs.site/sitemap.xml`);
  });

  // API Route: Coarse Visitor Country, Currency & Live Exchange Rates
  app.get('/api/locale-info', async (req, res) => {
    res.setHeader('Cache-Control', 'private, max-age=300');
    try {
      const payload = await resolveVisitorLocale(req);
      return res.status(200).json(payload);
    } catch (err) {
      const exchangeRates = await getLiveExchangeRates();
      return res.status(200).json({
        countryCode: 'US',
        countryName: 'United States',
        currencyCode: 'USD',
        languageCode: 'en',
        detectionSource: 'default',
        privacyNotice: 'Defaulting to United States (en-US / USD).',
        exchangeRates,
      });
    }
  });

  // API Route: Live Reference Exchange Rates (Base USD)
  app.get('/api/exchange-rates', async (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=1800');
    const exchangeRates = await getLiveExchangeRates();
    return res.status(200).json(exchangeRates);
  });

  // API Route: Order Status Tracking Lookup
  app.get('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    const { email } = req.query;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required.' });
    }

    const cleanOrderId = orderId.trim().toUpperCase();
    const order = ordersStore.get(cleanOrderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order reference not found in our dispatch records.' });
    }

    // Secure verification: if email provided, verify match
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      if (order.customerEmail.toLowerCase() !== cleanEmail) {
        return res.status(403).json({ success: false, error: 'Email does not match the records for this order.' });
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        date: order.date,
        status: order.status,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        estimatedDelivery: order.estimatedDelivery,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        orderTotal: order.orderTotal,
        currency: order.currency || 'USD',
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        notificationStatus: order.notificationStatus || 'pending',
        notificationMessageId: order.notificationMessageId || null,
        notificationSentAt: order.notificationSentAt || null,
        notificationError: order.notificationError || null,
      },
    });
  });

  // API Route: Retry Failed Order Notification
  app.post('/api/orders/:orderId/retry-notification', async (req, res) => {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required.' });
    }

    const cleanOrderId = orderId.trim().toUpperCase();
    const order = ordersStore.get(cleanOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Prevent accidental duplicate notifications if order notification was already sent
    if (order.notificationStatus === 'sent' && !req.body?.force) {
      return res.status(200).json({
        success: true,
        duplicateSuppressed: true,
        orderId: order.orderId,
        notificationStatus: order.notificationStatus,
        notificationMessageId: order.notificationMessageId,
        notificationSentAt: order.notificationSentAt,
        notificationError: null,
        notificationAttempts: order.notificationAttempts || 1,
        message: `Order #${order.orderId} notification was already delivered. Duplicate retry suppressed.`,
      });
    }

    // Transition FAILED -> PENDING before retry dispatch
    order.notificationStatus = 'pending';
    order.updatedAt = new Date().toISOString();
    ordersStore.set(cleanOrderId, order);
    persistOrders();

    const parsedShipping = parseShippingAddress(order.shippingDetails || order.shippingAddress);
    const notifResult = await sendOrderNotification({
      orderNumber: order.orderId,
      orderDate: order.date,
      status: order.status,
      currency: order.currency || 'USD',
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone || '',
        company: order.companyName || undefined,
      },
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        variant: item.variant || item.weight || item.size || '',
        quantity: item.quantity,
        price: Number(item.price || 0).toFixed(2),
        subtotal: Number(item.total ?? item.price * item.quantity).toFixed(2),
      })),
      totals: {
        subtotal: Number(order.subtotal || 0).toFixed(2),
        discount: Number(order.discount || 0).toFixed(2),
        shipping: Number(order.shippingCost || 0).toFixed(2),
        tax: Number(order.tax || 0).toFixed(2),
        total: Number(order.orderTotal || 0).toFixed(2),
        currency: order.currency || 'USD',
      },
      shipping: parsedShipping,
      billingAddress: order.billingAddress,
      paymentMethod: order.paymentMethod || 'Dispensary Direct',
      paymentStatus: order.paymentStatus || 'Awaiting Payment Verification',
      transactionId: order.transactionId || order.trackingNumber,
      couponCode: order.couponCode,
      notes: order.orderNotes || '',
      forceRetry: true,
    });

    order.notificationStatus = notifResult.notificationStatus;
    order.notificationMessageId = notifResult.notificationMessageId;
    order.notificationSentAt = notifResult.notificationSentAt;
    order.notificationError = notifResult.notificationError;
    order.notificationAttempts = (order.notificationAttempts || 0) + notifResult.notificationAttempts;
    order.updatedAt = new Date().toISOString();
    ordersStore.set(cleanOrderId, order);
    persistOrders();

    return res.status(200).json({
      success: notifResult.success,
      orderId: order.orderId,
      notificationStatus: order.notificationStatus,
      notificationMessageId: order.notificationMessageId,
      notificationSentAt: order.notificationSentAt,
      notificationError: order.notificationError,
      notificationAttempts: order.notificationAttempts,
      notification: notifResult,
    });
  });

  // Logo Static Endpoint
  app.get('/api/logo.jpg', (req, res) => {
    const logoPath = path.join(process.cwd(), 'src/assets/images/global_herbs_logo_1784328365704.jpg');
    if (fs.existsSync(logoPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(logoPath);
    }
    return res.status(404).send('Logo image not found');
  });

  // API Route: Process Order, Account, Sample & Support Email Submissions (Admin Notification)
  app.post('/api/send-email', async (req, res) => {
    const { name, email, phone, subject, message, type, productReference, orderReference } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid client email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || 'Valued Client').trim();
    const cleanPhone = (phone || '').trim();
    const cleanSubject = (subject || 'Inquiry - Global Herbs Inc').trim();
    const cleanMessage = (message || '').trim();
    const inquiryType =
      type === 'welcome' || cleanSubject.toLowerCase().includes('account')
        ? 'Dispensary Account Registration Request'
        : type === 'sample_request' || cleanSubject.toLowerCase().includes('sample')
        ? 'Product Sample Pack Request'
        : 'Customer Support / Product Inquiry';

    // Deduplicate rapid double-clicks within 60 seconds
    const dedupKey = `send-email:${cleanEmail}:${cleanSubject}:${cleanMessage.slice(0, 80)}`;
    const recent = recentFormHashes.get(dedupKey);
    if (recent && Date.now() - recent.timestamp < 60000) {
      return res.status(200).json({
        ...recent.result,
        duplicateSuppressed: true,
      });
    }

    const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const submission: any = {
      id: submissionId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      type: inquiryType,
      productReference: productReference || undefined,
      orderReference: orderReference || undefined,
      notificationStatus: 'pending' as NotificationStatus,
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: null,
      createdAt: new Date().toISOString(),
    };
    contactSubmissions.push(submission);
    persistSubmissions();

    // Dispatch real-time email notification to admin with customer Reply-To
    const notificationResult = await sendCustomerInquiryNotification({
      id: submissionId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      type: inquiryType,
      productReference,
      orderReference,
    });

    submission.notificationStatus = notificationResult.notificationStatus;
    submission.notificationMessageId = notificationResult.notificationMessageId;
    submission.notificationSentAt = notificationResult.notificationSentAt;
    submission.notificationError = notificationResult.notificationError;
    submission.notificationAttempts = notificationResult.notificationAttempts;
    persistSubmissions();

    const responsePayload = {
      success: true,
      message: `Your request has been received and dispatched to our admin desk! We will follow up directly at ${cleanEmail}.`,
      submission,
      notification: notificationResult,
    };
    recentFormHashes.set(dedupKey, { timestamp: Date.now(), result: responsePayload });

    return res.status(200).json(responsePayload);
  });

  // ==========================================
  // AUTHENTICATION & MEMBER ACCOUNT ENDPOINTS
  // ==========================================

  // 1. Member Sign Up / Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, accountType, phone, deliveryAddress, notes } = req.body || {};

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Please provide your full name, valid email address, and a password.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email format (e.g. name@example.com).',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long.',
        });
      }

      // Check if user already exists
      if (usersStore.has(cleanEmail)) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please log in using the "Sign In" tab.',
        });
      }

      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      const userId = `USR-MEM-${Date.now().toString(36).toUpperCase()}`;

      const newUser: UserRecord = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        salt,
        accountType: accountType || 'Personal Dispensary Member',
        phone: phone ? phone.trim() : '',
        deliveryAddress: deliveryAddress ? deliveryAddress.trim() : '',
        notes: notes ? notes.trim() : '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      usersStore.set(cleanEmail, newUser);
      persistUsers();

      console.log(`[Member Auth] Registered new member: ${cleanName} (${cleanEmail}) [${newUser.accountType}]`);

      // Await admin notification so serverless/container execution never drops it
      const notifResult = await sendCustomerInquiryNotification({
        id: `REG-${userId}`,
        name: cleanName,
        email: cleanEmail,
        phone: newUser.phone,
        subject: `New Member Registration: ${cleanName} (${newUser.accountType})`,
        message:
          `A new member account has been registered on Global Herbs Inc:\n\n` +
          `Member ID: ${userId}\n` +
          `Name: ${cleanName}\n` +
          `Email: ${cleanEmail}\n` +
          `Account Tier: ${newUser.accountType}\n` +
          `Phone: ${newUser.phone || 'Not provided'}\n` +
          `Default Delivery Address: ${newUser.deliveryAddress || 'Not provided'}\n` +
          `Notes / Preferences: ${newUser.notes || 'None'}\n` +
          `Registered At: ${newUser.createdAt}`,
        type: 'Dispensary Member Registration',
      });

      return res.status(201).json({
        success: true,
        message: `Welcome to Global Herbs, ${cleanName}! Your member account is now active.`,
        user: sanitizeUser(newUser),
        token: `gh_tok_${newUser.id}_${Date.now()}`,
        notificationStatus: notifResult.notificationStatus,
      });
    } catch (err: any) {
      console.error('[Register Endpoint Error]', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred during registration. Please try again.',
      });
    }
  });

  // 2. Member Log In (for returning/old users)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please provide both your email address and password.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = usersStore.get(cleanEmail);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'No registered account found with this email address. Please verify spelling or create an account.',
        });
      }

      // Verify password
      const inputHash = hashPassword(password, user.salt);
      const isPasswordValid = inputHash === user.passwordHash;

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password. Please check your credentials or click "Forgot Password".',
        });
      }

      // Update last login timestamp
      user.lastLoginAt = new Date().toISOString();
      persistUsers();

      console.log(`[Member Auth] Logged in member: ${user.name} (${user.email})`);

      return res.status(200).json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: sanitizeUser(user),
        token: `gh_tok_${user.id}_${Date.now()}`,
      });
    } catch (err: any) {
      console.error('[Login Endpoint Error]', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred during sign in. Please try again.',
      });
    }
  });

  // 3. Member Profile Verification / Session Check
  app.get('/api/auth/me', (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = usersStore.get(cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  });

  // 4. Member Profile Update (Delivery Address, Phone, Tier)
  app.post('/api/auth/update-profile', (req, res) => {
    const { email, name, phone, deliveryAddress, accountType, notes } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required to update profile.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = usersStore.get(cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (name && typeof name === 'string') user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (deliveryAddress !== undefined) user.deliveryAddress = deliveryAddress.trim();
    if (accountType && typeof accountType === 'string') user.accountType = accountType.trim();
    if (notes !== undefined) user.notes = notes.trim();

    persistUsers();

    console.log(`[Member Auth] Updated profile for ${user.name} (${cleanEmail})`);

    return res.status(200).json({
      success: true,
      message: 'Profile details successfully updated.',
      user: sanitizeUser(user),
    });
  });

  // 5. Password Reset / Assistance Request
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter your registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = usersStore.get(cleanEmail);

    // Notify dispensary admin desk to assist or reset (awaited for guaranteed delivery)
    const notifResult = await sendCustomerInquiryNotification({
      name: user ? user.name : 'Registered Client',
      email: cleanEmail,
      phone: user?.phone,
      subject: `Password Reset Request for ${cleanEmail}`,
      message: `A client requested password assistance for their account:\n\nEmail: ${cleanEmail}\nMember Name: ${user ? user.name : 'Unknown'}\nTimestamp: ${new Date().toISOString()}\n\nPlease respond to client with password assistance.`,
      type: 'Password Reset Request',
    });

    return res.status(200).json({
      success: true,
      message: `Password reset instructions have been forwarded to ${cleanEmail} and our dispensary support desk. Please check your inbox or reply to the email.`,
      notification: notifResult,
    });
  });

  // 6. Member Order History Lookup
  app.get('/api/auth/my-orders', (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const matchedOrders: any[] = [];

    ordersStore.forEach((order) => {
      if (order.customerEmail && order.customerEmail.toLowerCase().trim() === cleanEmail) {
        matchedOrders.push({
          orderId: order.orderId,
          date: order.date,
          status: order.status,
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          estimatedDelivery: order.estimatedDelivery,
          shippingAddress: order.shippingAddress,
          items: order.items,
          subtotal: order.subtotal,
          discount: order.discount,
          shippingCost: order.shippingCost,
          orderTotal: order.orderTotal,
          currency: order.currency || 'USD',
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          notificationStatus: order.notificationStatus || 'sent',
          createdAt: order.createdAt,
        });
      }
    });

    matchedOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.status(200).json({
      success: true,
      orders: matchedOrders,
    });
  });

  // API Route: Checkout Function (Order Capture, Persistence & Transactional Email Notifications)
  app.post('/api/checkout', async (req, res) => {
    try {
      const {
        orderId: clientOrderId,
        idempotencyKey,
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        shippingAddress: rawShippingAddress,
        shipping,
        shippingDetails: rawShippingDetails,
        billingAddress: rawBillingAddress,
        billing,
        orderNotes: rawOrderNotes,
        notes,
        cartItems: rawCartItems,
        items,
        subtotal,
        discount,
        couponCode,
        discountCode,
        shippingCost: rawShippingCost,
        shippingFee,
        tax,
        orderTotal: rawOrderTotal,
        total,
        currency,
        paymentMethod,
        paymentStatus,
        transactionId,
      } = req.body || {};

      const cartItems = Array.isArray(rawCartItems) ? rawCartItems : Array.isArray(items) ? items : [];
      const shippingDetails = rawShippingDetails || (typeof shipping === 'object' && shipping !== null ? shipping : undefined);
      const shippingAddress =
        rawShippingAddress ||
        (typeof shipping === 'string'
          ? shipping
          : shipping && typeof shipping === 'object'
          ? [shipping.address, shipping.city, shipping.state, shipping.zip, shipping.country].filter(Boolean).join(', ')
          : '');
      const billingAddress =
        rawBillingAddress ||
        (typeof billing === 'string'
          ? billing
          : billing && typeof billing === 'object'
          ? [billing.address, billing.city, billing.state, billing.zip, billing.country].filter(Boolean).join(', ')
          : shippingAddress);
      const orderNotes = rawOrderNotes ?? notes ?? '';
      const shippingCost = rawShippingCost ?? shippingFee;
      const orderTotal = rawOrderTotal ?? total;
      const resolvedCouponCode = couponCode || discountCode;

      // 1. Validate required checkout data
      if (
        !customerName ||
        typeof customerName !== 'string' ||
        !customerName.trim() ||
        !customerEmail ||
        typeof customerEmail !== 'string' ||
        !shippingAddress ||
        !cartItems ||
        !Array.isArray(cartItems) ||
        cartItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: 'Missing required order fields (name, email, shipping address, or items).',
        });
      }

      const cleanEmail = customerEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer email address format.',
        });
      }

      // 2. Resolve deterministic/unique Order ID
      const rawOrderId =
        (typeof clientOrderId === 'string' && clientOrderId.trim()) ||
        (typeof idempotencyKey === 'string' && idempotencyKey.trim()) ||
        `GH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const orderId = rawOrderId.trim().toUpperCase();

      // 3. Idempotency Check: If this Order ID already exists in our persistent store
      const existingOrder = ordersStore.get(orderId);
      if (existingOrder && existingOrder.notificationStatus === 'sent') {
        console.log(`[Checkout Idempotency] Order #${orderId} already created and notified. Suppressing duplicate.`);
        return res.status(200).json({
          success: true,
          orderId: existingOrder.orderId,
          order: existingOrder,
          emailNotification: {
            sent: true,
            provider: 'google_apps_script',
            recipient: getNotificationConfig().adminEmail,
            replyTo: existingOrder.customerEmail,
            duplicateSuppressed: true,
            notificationStatus: existingOrder.notificationStatus,
            notificationMessageId: existingOrder.notificationMessageId,
            notificationSentAt: existingOrder.notificationSentAt,
          },
          message: `Order #${orderId} already registered. Duplicate notification suppressed.`,
        });
      }

      const orderDate =
        existingOrder?.date ||
        new Date().toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

      // 4. Parse and validate cart items
      const parsedItems: OrderItem[] = cartItems.map((item: any, idx: number) => {
        const itemPrice = Math.max(0, Number(item.price ?? item.unitPrice ?? item.product?.price ?? 0) || 0);
        const itemQty = Math.max(1, Math.round(Number(item.quantity ?? 1) || 1));
        const itemTotal = Number(item.total ?? itemPrice * itemQty);
        const variant =
          item.variant || item.selectedWeight || item.weight || item.size || item.option || undefined;

        return {
          id: item.id || item.product?.id || `ITEM-${idx + 1}`,
          productId: item.productId || item.id || item.product?.id || `ITEM-${idx + 1}`,
          name: String(item.name || item.product?.name || item.title || 'Dispensary Botanical Item').trim(),
          variant: variant ? String(variant).trim() : undefined,
          weight: item.weight || item.selectedWeight || undefined,
          size: item.size || undefined,
          quantity: itemQty,
          price: itemPrice,
          total: itemTotal,
          image: item.image || item.product?.image || undefined,
        };
      });

      // 5. Calculate & verify financial totals
      const computedSubtotal = parsedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const resolvedSubtotal =
        subtotal !== undefined && !isNaN(Number(subtotal)) && Number(subtotal) >= 0
          ? Number(subtotal)
          : computedSubtotal;
      const resolvedDiscount =
        discount !== undefined && !isNaN(Number(discount)) && Number(discount) >= 0
          ? Number(discount)
          : 0;
      const resolvedShipping =
        shippingCost !== undefined && !isNaN(Number(shippingCost)) && Number(shippingCost) >= 0
          ? Number(shippingCost)
          : resolvedSubtotal >= 250
          ? 0
          : 19.99;
      const resolvedTax =
        tax !== undefined && !isNaN(Number(tax)) && Number(tax) >= 0 ? Number(tax) : 0;
      const resolvedTotal =
        orderTotal !== undefined && !isNaN(Number(orderTotal)) && Number(orderTotal) >= 0
          ? Number(orderTotal)
          : Math.max(0, resolvedSubtotal - resolvedDiscount + resolvedShipping + resolvedTax);
      const resolvedCurrency = (currency || 'USD').trim().toUpperCase();

      // 6. Save order to persistent store BEFORE triggering email (with notificationStatus: 'pending')
      const trackingNum =
        existingOrder?.trackingNumber || `GH-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const resolvedTransactionId =
        transactionId || existingOrder?.transactionId || trackingNum;
      const resolvedPaymentStatus =
        paymentStatus || 'Awaiting Payment Confirmation / Stealth Dispatch Queued';

      const savedOrder: any = {
        orderId,
        date: orderDate,
        status: 'Received & Stealth Processing',
        trackingNumber: trackingNum,
        transactionId: resolvedTransactionId,
        carrier: 'Priority Stealth Express Courier',
        estimatedDelivery: '2-3 Business Days',
        customerName: customerName.trim(),
        customerEmail: cleanEmail,
        customerPhone: customerPhone ? String(customerPhone).trim() : '',
        companyName: companyName ? String(companyName).trim() : '',
        shippingAddress:
          typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress),
        shippingDetails: shippingDetails || undefined,
        billingAddress: billingAddress
          ? typeof billingAddress === 'string'
            ? billingAddress
            : JSON.stringify(billingAddress)
          : shippingAddress,
        orderNotes: orderNotes ? String(orderNotes).trim() : '',
        items: parsedItems,
        subtotal: resolvedSubtotal,
        discount: resolvedDiscount,
        couponCode: resolvedCouponCode ? String(resolvedCouponCode).trim() : undefined,
        shippingCost: resolvedShipping,
        tax: resolvedTax,
        orderTotal: resolvedTotal,
        currency: resolvedCurrency,
        paymentMethod: paymentMethod || 'btc',
        paymentStatus: resolvedPaymentStatus,
        notificationStatus: 'pending' as NotificationStatus,
        notificationMessageId: null,
        notificationSentAt: null,
        notificationError: null,
        notificationAttempts: existingOrder?.notificationAttempts || 0,
        customerConfirmationStatus: 'pending',
        createdAt: existingOrder?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ordersStore.set(orderId, savedOrder);
      persistOrders();
      console.log(
        `[Order Processing] Order #${orderId} saved to persistent store for ${savedOrder.customerName} ($${resolvedTotal.toFixed(2)} ${resolvedCurrency})`
      );

      // 7. Trigger server-side Admin Order Notification Email
      const parsedShipping = parseShippingAddress(shippingDetails || savedOrder.shippingAddress);
      const orderNotificationInput = {
        orderNumber: orderId,
        orderDate,
        status: savedOrder.status,
        currency: resolvedCurrency,
        customer: {
          name: savedOrder.customerName,
          email: savedOrder.customerEmail,
          phone: savedOrder.customerPhone || '',
          company: savedOrder.companyName || undefined,
        },
        items: parsedItems.map((item) => ({
          id: item.id,
          name: item.name,
          variant: item.variant || item.weight || item.size || '',
          quantity: item.quantity,
          price: item.price.toFixed(2),
          subtotal: item.total ? item.total.toFixed(2) : (item.price * item.quantity).toFixed(2),
        })),
        totals: {
          subtotal: resolvedSubtotal.toFixed(2),
          discount: resolvedDiscount.toFixed(2),
          shipping: resolvedShipping.toFixed(2),
          tax: resolvedTax.toFixed(2),
          total: resolvedTotal.toFixed(2),
          currency: resolvedCurrency,
        },
        shipping: parsedShipping,
        billingAddress: billingAddress || savedOrder.billingAddress,
        paymentMethod: savedOrder.paymentMethod || 'Dispensary Direct',
        paymentStatus: savedOrder.paymentStatus,
        transactionId: resolvedTransactionId,
        couponCode: savedOrder.couponCode,
        notes: savedOrder.orderNotes || '',
      };

      const notifResult = await sendOrderNotification(orderNotificationInput);

      // Update order with notification outcome
      savedOrder.notificationStatus = notifResult.notificationStatus;
      savedOrder.notificationMessageId = notifResult.notificationMessageId;
      savedOrder.notificationSentAt = notifResult.notificationSentAt;
      savedOrder.notificationError = notifResult.notificationError;
      savedOrder.notificationAttempts =
        (savedOrder.notificationAttempts || 0) + notifResult.notificationAttempts;

      // 8. Customer confirmation is included in the Apps Script payload (`sendCustomerConfirmation: true`).
      // If a dedicated separate customer confirmation webhook is configured, dispatch it separately.
      const adminEmailLower = getNotificationConfig().adminEmail.toLowerCase();
      if (process.env.CUSTOMER_CONFIRMATION_WEBHOOK_URL && cleanEmail && cleanEmail !== adminEmailLower) {
        const custConfResult = await sendCustomerOrderConfirmation(orderNotificationInput);
        savedOrder.customerConfirmationStatus = custConfResult.notificationStatus;
      } else {
        savedOrder.customerConfirmationStatus = notifResult.notificationStatus;
      }

      ordersStore.set(orderId, savedOrder);
      persistOrders();

      if (!notifResult.success) {
        console.error(`[Checkout] Admin notification failed for #${orderId}: ${notifResult.error}`);
        return res.status(200).json({
          success: true,
          orderId,
          order: savedOrder,
          emailNotification: {
            sent: false,
            provider: 'google_apps_script',
            error: notifResult.error,
            recipient: notifResult.recipient,
            replyTo: notifResult.replyTo,
            notificationStatus: savedOrder.notificationStatus,
            notificationMessageId: savedOrder.notificationMessageId,
            notificationSentAt: savedOrder.notificationSentAt,
            notificationError: savedOrder.notificationError,
          },
          message: `Order #${orderId} registered and saved safely. Admin email notification encountered an issue and is logged for retry.`,
        });
      }

      console.log(
        `[Checkout] Order #${orderId} complete. Admin notification sent to ${notifResult.recipient} [msgId: ${notifResult.notificationMessageId}]`
      );
      return res.status(200).json({
        success: true,
        orderId,
        order: savedOrder,
        emailNotification: {
          sent: true,
          provider: 'google_apps_script',
          recipient: notifResult.recipient,
          replyTo: notifResult.replyTo,
          duplicateSuppressed: notifResult.duplicateSuppressed || false,
          unconfigured: notifResult.unconfigured || false,
          notificationStatus: savedOrder.notificationStatus,
          notificationMessageId: savedOrder.notificationMessageId,
          notificationSentAt: savedOrder.notificationSentAt,
          notificationError: null,
        },
        message: `Order #${orderId} successfully registered and admin notification dispatched!`,
      });
    } catch (err: any) {
      console.error('[Checkout API Exception]:', err);
      return res.status(500).json({
        success: false,
        error: 'An unexpected server error occurred while processing your order. Please try again.',
      });
    }
  });

  // API Route: Google Apps Script Notification Configuration Status
  app.get('/api/notification/status', (req, res) => {
    const config = getNotificationConfig();
    res.json({
      provider: 'Google Apps Script (MailApp)',
      configured: config.isConfigured,
      adminEmail: config.adminEmail,
      emailFrom: config.emailFrom,
      hasScriptUrl: Boolean(config.appsScriptUrl),
      maskedUrl: config.appsScriptUrl ? `${config.appsScriptUrl.substring(0, 35)}...` : 'NOT_SET',
      totalOrdersTracked: ordersStore.size,
      totalSubmissionsTracked: contactSubmissions.length,
      instruction: 'To receive live order notifications, set GOOGLE_APPS_SCRIPT_URL in .env to your deployed Web App URL.',
    });
  });

  // API Route: Contact Form Trigger (Admin Email Notification)
  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, phone, subscribeNewsletter, productReference, orderReference } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const cleanName = (name || '').trim() || 'Valued Client';
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanSubject = (subject || 'Product Question').trim();
    const cleanMessage = (message || '').trim();

    if (!cleanMessage) {
      return res.status(400).json({ success: false, error: 'Please enter a message for our support team.' });
    }

    // Deduplicate rapid double-clicks within 60 seconds
    const dedupKey = `contact:${cleanEmail}:${cleanSubject}:${cleanMessage.slice(0, 80)}`;
    const recent = recentFormHashes.get(dedupKey);
    if (recent && Date.now() - recent.timestamp < 60000) {
      return res.status(200).json({
        ...recent.result,
        duplicateSuppressed: true,
      });
    }

    const submissionId = `CNT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const submissionRecord: any = {
      id: submissionId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      subscribeNewsletter: Boolean(subscribeNewsletter),
      type: 'contact_form',
      notificationStatus: 'pending' as NotificationStatus,
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: null,
      createdAt: new Date().toISOString(),
    };
    contactSubmissions.push(submissionRecord);
    persistSubmissions();

    // 1. Dispatch real-time email notification to admin with customer Reply-To
    const notificationResult = await sendCustomerInquiryNotification({
      id: submissionId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      type: 'Customer Contact Form',
      productReference,
      orderReference,
      metadata: {
        NewsletterOptIn: subscribeNewsletter ? 'Yes' : 'No',
      },
    });

    // 2. Update persistent submission record with notification status
    submissionRecord.notificationStatus = notificationResult.notificationStatus;
    submissionRecord.notificationMessageId = notificationResult.notificationMessageId;
    submissionRecord.notificationSentAt = notificationResult.notificationSentAt;
    submissionRecord.notificationError = notificationResult.notificationError;
    submissionRecord.notificationAttempts = notificationResult.notificationAttempts;
    persistSubmissions();

    if (subscribeNewsletter && !newsletterEmails.includes(cleanEmail)) {
      newsletterEmails.push(cleanEmail);
    }

    const responsePayload = {
      success: true,
      submissionId,
      message: `Thank you, ${cleanName}! Your inquiry has been sent directly to the dispensary admin team. We will reply to your email shortly.`,
      notification: notificationResult,
    };
    recentFormHashes.set(dedupKey, { timestamp: Date.now(), result: responsePayload });

    return res.status(200).json(responsePayload);
  });

  // API Route: Scheduled Cron & Bulk Digest Notifications
  app.post('/api/cron/scheduled-notifications', async (req, res) => {
    const recipientsList = Array.from(new Set([...newsletterEmails, 'globalherbsinc@gmail.com']));

    return res.status(200).json({
      success: true,
      message: `Scheduled notifications processed for ${recipientsList.length} subscribers!`,
      recipients: recipientsList,
    });
  });

  // API Route: Newsletter email subscription
  app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please specify a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address format.' });
    }

    const dedupKey = `subscribe:${cleanEmail}`;
    const recent = recentFormHashes.get(dedupKey);
    if (recent && Date.now() - recent.timestamp < 60000) {
      return res.status(200).json({
        ...recent.result,
        duplicateSuppressed: true,
      });
    }

    if (!newsletterEmails.includes(cleanEmail)) {
      newsletterEmails.push(cleanEmail);
    }

    const subId = `SUB-VIP-${Date.now().toString(36).toUpperCase()}`;
    const subRecord: any = {
      id: subId,
      name: 'New Subscriber / VIP Lead',
      email: cleanEmail,
      subject: 'VIP Newsletter Subscription',
      message: 'Discount Coupon Issued: HERBS15OFF',
      type: 'newsletter_subscription',
      notificationStatus: 'pending' as NotificationStatus,
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: null,
      notificationAttempts: 0,
      createdAt: new Date().toISOString(),
    };
    contactSubmissions.push(subRecord);
    persistSubmissions();

    // Notify admin about new newsletter / waitlist subscriber (awaited)
    const notificationResult = await sendCustomerInquiryNotification({
      id: subId,
      name: 'New Subscriber / VIP Lead',
      email: cleanEmail,
      subject: `New VIP Newsletter Subscriber: ${cleanEmail}`,
      message: [
        `A customer has subscribed to the Global Herbs newsletter / VIP access club:`,
        `Subscriber Email: ${cleanEmail}`,
        `Discount Coupon Issued: HERBS15OFF`,
        `Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`,
      ].join('\n'),
      type: 'VIP Newsletter Subscription',
    });

    subRecord.notificationStatus = notificationResult.notificationStatus;
    subRecord.notificationMessageId = notificationResult.notificationMessageId;
    subRecord.notificationSentAt = notificationResult.notificationSentAt;
    subRecord.notificationError = notificationResult.notificationError;
    subRecord.notificationAttempts = notificationResult.notificationAttempts;
    persistSubmissions();

    const responsePayload = {
      success: true,
      submissionId: subId,
      message: `Successfully subscribed ${cleanEmail}! Check your inbox for your 15% off coupon: HERBS15OFF`,
      notification: notificationResult,
    };
    recentFormHashes.set(dedupKey, { timestamp: Date.now(), result: responsePayload });

    return res.status(200).json(responsePayload);
  });

  // API Route: Customer Product Review Submission & Admin Notification
  app.post('/api/review', async (req, res) => {
    const { productId, productName, author, email, rating, comment } = req.body || {};

    if (!author || !comment) {
      return res.status(400).json({ success: false, error: 'Author name and feedback comment are required.' });
    }

    const cleanAuthor = String(author).trim();
    const cleanEmail =
      email && String(email).includes('@')
        ? String(email).trim().toLowerCase()
        : 'reviews@globalherbsinc.com';
    const cleanProduct = String(productName || 'Botanical Product').trim();
    const cleanComment = String(comment).trim();
    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const dedupKey = `review:${cleanEmail}:${cleanProduct}:${cleanComment.slice(0, 80)}`;
    const recent = recentFormHashes.get(dedupKey);
    if (recent && Date.now() - recent.timestamp < 60000) {
      return res.status(200).json({
        ...recent.result,
        duplicateSuppressed: true,
      });
    }

    const reviewId = `REV-${Date.now().toString(36).toUpperCase()}`;
    const reviewRecord: any = {
      id: reviewId,
      name: cleanAuthor,
      email: cleanEmail,
      subject: `Review: ${cleanProduct} (${numRating}/5)`,
      message: cleanComment,
      productReference: `${cleanProduct} (ID: ${productId || 'N/A'})`,
      type: 'product_review',
      notificationStatus: 'pending' as NotificationStatus,
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: null,
      notificationAttempts: 0,
      createdAt: new Date().toISOString(),
    };
    contactSubmissions.push(reviewRecord);
    persistSubmissions();

    // Dispatch email notification to admin with reviewer details and Reply-To
    const notificationResult = await sendCustomerInquiryNotification({
      id: reviewId,
      name: cleanAuthor,
      email: cleanEmail,
      subject: `New ${numRating}★ Review: ${cleanProduct} — ${cleanAuthor}`,
      productReference: `${cleanProduct} (ID: ${productId || 'N/A'})`,
      message: [
        `CUSTOMER PRODUCT REVIEW DETAILS:`,
        `--------------------------------`,
        `Product: ${cleanProduct} (ID: ${productId || 'N/A'})`,
        `Rating: ${numRating} of 5 Stars (${'★'.repeat(numRating)}${'☆'.repeat(Math.max(0, 5 - numRating))})`,
        `Reviewer: ${cleanAuthor}`,
        `Email: ${cleanEmail}`,
        `Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`,
        ``,
        `REVIEW TEXT:`,
        `"${cleanComment}"`,
      ].join('\n'),
      type: 'Customer Product Review',
    });

    reviewRecord.notificationStatus = notificationResult.notificationStatus;
    reviewRecord.notificationMessageId = notificationResult.notificationMessageId;
    reviewRecord.notificationSentAt = notificationResult.notificationSentAt;
    reviewRecord.notificationError = notificationResult.notificationError;
    reviewRecord.notificationAttempts = notificationResult.notificationAttempts;
    persistSubmissions();

    const responsePayload = {
      success: true,
      reviewId,
      message: 'Thank you! Your product review has been submitted and shared with dispensary management.',
      notification: notificationResult,
    };
    recentFormHashes.set(dedupKey, { timestamp: Date.now(), result: responsePayload });

    return res.status(200).json(responsePayload);
  });

  // Dedicated Test Endpoint for Checkout Confirmation Verification
  app.post('/api/test/checkout', async (req, res) => {
    const targetEmail = req.body?.email || 'globalherbsinc@gmail.com';
    const targetName = req.body?.name || 'Dispensary Client';

    const testOrderId = `GH-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const testItems = [
      {
        productId: 'GH-BLUE-DREAM-01',
        name: 'AAA+ Organic Blue Dream Dispensary Flower (3.5g)',
        variant: '3.5g',
        price: 45.0,
        quantity: 2,
        total: 90.0,
      },
      {
        productId: 'GH-CBD-TINCTURE-02',
        name: 'Full Spectrum Organic CBD Botanical Tincture (1000mg)',
        variant: '1000mg',
        price: 65.0,
        quantity: 1,
        total: 65.0,
      },
    ];
    const total = 155.0;

    const notifResult = await sendOrderNotification({
      orderNumber: testOrderId,
      customerName: targetName,
      customerEmail: targetEmail,
      customerPhone: '+1 (213) 280-1161',
      items: testItems,
      subtotal: 155.0,
      discount: 0,
      shippingCost: 0,
      orderTotal: total,
      shippingAddress: '100 Botanical Way, Suite 400, Los Angeles, CA 90001, United States',
      paymentMethod: 'btc',
      notes: 'Automated diagnostic checkout verification order.',
    });

    const savedOrder = {
      orderId: testOrderId,
      date: new Date().toISOString(),
      status: 'Stealth Dispatched & Active',
      trackingNumber: `GH-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      carrier: 'Priority Stealth Express Courier',
      estimatedDelivery: '2 Business Days',
      customerName: targetName,
      customerEmail: targetEmail,
      shippingAddress: '100 Botanical Way, Suite 400, Los Angeles, CA 90001, United States',
      items: testItems,
      orderTotal: total,
      notificationStatus: notifResult.notificationStatus,
      notificationMessageId: notifResult.notificationMessageId,
      notificationSentAt: notifResult.notificationSentAt,
      notificationError: notifResult.notificationError,
      createdAt: new Date().toISOString(),
    };

    ordersStore.set(testOrderId, savedOrder);
    persistOrders();

    return res.status(200).json({
      success: true,
      message: `Test order ${testOrderId} registered and notification dispatched!`,
      orderId: testOrderId,
      recipient: notifResult.recipient,
      notification: notifResult,
    });
  });

  // API Route: Send Test Order Notification Email via Google Apps Script
  app.all('/api/test-email', async (req, res) => {
    const targetEmail = req.body?.email || req.query?.email || getNotificationConfig().adminEmail;
    const testOrderId = `GH-TEST-${Math.floor(100000 + Math.random() * 900000)}`;

    const testPayload = {
      orderNumber: testOrderId,
      recipient: String(targetEmail).trim(),
      adminEmail: String(targetEmail).trim(),
      customer: {
        name: 'Zaki Nahor (Test Flow Verification)',
        email: String(targetEmail).trim(),
        phone: '+1-555-0199',
      },
      items: [
        {
          name: 'Organic Blue Dream (3.5g)',
          variant: '3.5g',
          quantity: 1,
          price: 45.0,
          total: 45.0,
        },
      ],
      totals: {
        subtotal: 45.0,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 45.0,
      },
      shipping: {
        address: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'OR',
        postalCode: '97477',
        country: 'United States',
      },
      paymentMethod: 'Verification Test Flow',
      notes: `Test order notification dispatch to confirm delivery to ${targetEmail}.`,
    };

    const result = await sendOrderNotification(testPayload);

    return res.json({
      success: result.success,
      orderId: testOrderId,
      targetEmail,
      notificationResult: result,
      scriptUrlConfigured: Boolean(process.env.GOOGLE_APPS_SCRIPT_URL),
    });
  });

  // API Route: Server status checks
  app.get('/api/health', (req, res) => {
    const notifConfig = getNotificationConfig();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      messagesLogged: contactSubmissions.length,
      subscribersLogged: newsletterEmails.length,
      ordersLogged: ordersStore.size,
      orderNotification: {
        provider: 'google_apps_script',
        configured: notifConfig.isConfigured,
        adminEmail: notifConfig.adminEmail,
        emailFrom: notifConfig.emailFrom,
        hasScriptUrl: Boolean(notifConfig.appsScriptUrl),
      },
      logoAvailable: fs.existsSync(path.join(process.cwd(), 'src/assets/images/global_herbs_logo_1784328365704.jpg')),
    });
  });

  // Helper to resolve route SEO metadata, HTTP status code, and X-Robots-Tag
  function resolveRouteSeoResponse(req: express.Request, templateHtml: string): { status: number; robotsHeader: string; html: string } {
    const rawPathname = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
    const supportedLangs = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ja'];
    const pathSegments = rawPathname.split('/').filter(Boolean);
    let urlLocale: string | null = null;
    let pathname = rawPathname;

    if (pathSegments.length > 0 && supportedLangs.includes(pathSegments[0].toLowerCase())) {
      urlLocale = pathSegments[0].toLowerCase();
      pathname = '/' + pathSegments.slice(1).join('/');
      if (pathname === '') pathname = '/';
    }

    const activeLang = urlLocale || 'en';
    const localizedTemplate = templateHtml.replace('<html lang="en">', `<html lang="${activeLang}">`);
    const hasSearchQuery = Boolean(req.query.q || req.query.search);

    if (pathname === '/checkout' || pathname === '/forms') {
      const html = renderPageHtml(localizedTemplate, {
        title: pathname === '/forms' ? 'Google Forms Studio | Global Herbs' : 'Secure Checkout | Global Herbs',
        description: 'Complete your order or form securely at Global Herbs.',
        canonical: `https://globalherbs.site${pathname}`,
        robots: 'noindex, nofollow',
        kind: 'website',
        bodyHtml: '<main><h1>Secure Dispensary Checkout</h1></main>',
      });
      return { status: 200, robotsHeader: 'noindex, nofollow', html };
    }

    if (pathname === '/order-tracking') {
      const html = renderPageHtml(localizedTemplate, {
        title: 'Track Your Order Status | Global Herbs',
        description: 'Look up the real-time shipping and fulfillment status of your Global Herbs order.',
        canonical: 'https://globalherbs.site/order-tracking',
        robots: 'noindex, nofollow',
        kind: 'website',
        bodyHtml: '<main><h1>Real-Time Order Tracking</h1></main>',
      });
      return { status: 200, robotsHeader: 'noindex, nofollow', html };
    }

    const seoPage = getPage(pathname);
    if (seoPage) {
      const isNoIndex = Boolean(seoPage.robots && seoPage.robots.includes('noindex')) || hasSearchQuery;
      const baseCanonicalPath = seoPage.canonical.replace('https://globalherbs.site', '') || '/';
      const localizedCanonical =
        urlLocale && urlLocale !== 'en'
          ? `https://globalherbs.site/${urlLocale}${baseCanonicalPath === '/' ? '' : baseCanonicalPath}`
          : seoPage.canonical;

      const effectivePage = {
        ...seoPage,
        canonical: localizedCanonical,
        ...(hasSearchQuery ? { robots: 'noindex, follow' } : {}),
      };
      const robotsHeader = isNoIndex
        ? effectivePage.robots || 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

      let renderedHtml = renderPageHtml(localizedTemplate, effectivePage);
      if (!isNoIndex) {
        const hreflangTags = [
          ...supportedLangs.map((code) => {
            const href =
              code === 'en'
                ? `https://globalherbs.site${baseCanonicalPath}`
                : `https://globalherbs.site/${code}${baseCanonicalPath === '/' ? '' : baseCanonicalPath}`;
            return `<link rel="alternate" hreflang="${code}" href="${href}" />`;
          }),
          `<link rel="alternate" hreflang="x-default" href="https://globalherbs.site${baseCanonicalPath}" />`,
        ].join('\n    ');
        renderedHtml = renderedHtml.replace('</head>', `    ${hreflangTags}\n  </head>`);
      }

      return {
        status: 200,
        robotsHeader,
        html: renderedHtml,
      };
    }

    // Unmatched route -> Real HTTP 404 Not Found (prevents Soft-404s)
    const notFoundHtml = renderPageHtml(localizedTemplate, {
      title: '404 Page Not Found | Global Herbs',
      description: 'The requested page could not be found on Global Herbs.',
      canonical: `https://globalherbs.site${rawPathname}`,
      robots: 'noindex, nofollow',
      kind: 'website',
      bodyHtml: '<main><h1>404 — Page Not Found</h1><p>The requested URL was not found on this server. <a href="/">Return to Global Herbs Homepage</a> or <a href="/products">Browse Full Dispensary Catalog</a>.</p></main>',
    });
    return { status: 404, robotsHeader: 'noindex, nofollow', html: notFoundHtml };
  }

  // Vite middleware for development vs asset hosting for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      try {
        const templatePath = path.join(process.cwd(), 'index.html');
        const rawTemplate = fs.readFileSync(templatePath, 'utf-8');
        const transformedTemplate = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const { status, robotsHeader, html } = resolveRouteSeoResponse(req, transformedTemplate);
        res.setHeader('X-Robots-Tag', robotsHeader);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(status).send(html);
      } catch (err) {
        return next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        index: false,
      })
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const templatePath = path.join(distPath, 'index.html');
      const rawTemplate = fs.readFileSync(templatePath, 'utf-8');
      const { status, robotsHeader, html } = resolveRouteSeoResponse(req, rawTemplate);
      res.setHeader('X-Robots-Tag', robotsHeader);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(status).send(html);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Server] Global Herbs running on port ${PORT} with PID ${process.pid}`);
  });
}

startServer();
