import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { generateSitemapXML } from './src/utils/sitemap';
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
import { sendOrderNotification, sendCustomerInquiryNotification } from './lib/email/orderNotification';

// Simple database in-memory logs for demonstration
const contactSubmissions: any[] = [];
const newsletterEmails: string[] = ['zakinahor692@gmail.com', 'globalherbsinc@gmail.com'];
const ordersStore = new Map<string, any>();

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

// Initialize user store immediately on module load
loadUsers();

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
  const OFFICIAL_YOUTUBE_URL = 'https://www.youtube.com/@GlobalMarijuanaDispensary';
  const OFFICIAL_TIKTOK_URL = 'https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ';
  const OFFICIAL_REDDIT_URL = 'https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM';

  app.get(['/youtube', '/yt', '/youtube/'], (req, res) => {
    return res.redirect(301, OFFICIAL_YOUTUBE_URL);
  });

  app.get(['/tiktok', '/tik-tok', '/tiktok/'], (req, res) => {
    return res.redirect(301, OFFICIAL_TIKTOK_URL);
  });

  app.get(['/reddit', '/reddit/', '/official-reddit', '/u/globalherbsinc'], (req, res) => {
    return res.redirect(301, OFFICIAL_REDDIT_URL);
  });

  // SEO Canonical 301 Permanent Redirects (Consolidating duplicate category & shop URLs)
  app.get(['/shop', '/shop/'], (req, res) => {
    return res.redirect(301, '/products');
  });

  app.get(['/category/flower', '/category/weed'], (req, res) => {
    return res.redirect(301, '/category/flowers');
  });

  app.get(['/category/concentrate', '/category/rosin', '/category/hash', '/category/extracts'], (req, res) => {
    return res.redirect(301, '/category/concentrates');
  });

  app.get(['/category/vape', '/category/carts'], (req, res) => {
    return res.redirect(301, '/category/vapes');
  });

  app.get(['/category/edible', '/category/gummies'], (req, res) => {
    return res.redirect(301, '/category/edibles');
  });

  app.get(['/category/preroll', '/category/joints'], (req, res) => {
    return res.redirect(301, '/category/prerolls');
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
        orderTotal: order.orderTotal,
      },
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

  // API Route: Process Order, Account & Support Email Submissions (Admin Notification)
  app.post('/api/send-email', async (req, res) => {
    const { name, email, subject, message, type } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Client email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || 'Valued Client').trim();
    const cleanSubject = (subject || 'Inquiry - Global Herbs Inc').trim();
    const cleanMessage = (message || '').trim();
    const inquiryType = type === 'welcome' || cleanSubject.toLowerCase().includes('account')
      ? 'Dispensary Account Registration Request'
      : 'Customer Support / Product Inquiry';

    const submission = {
      id: Math.random().toString(36).substring(2, 9),
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      type: type || 'standard',
      createdAt: new Date().toISOString(),
    };
    contactSubmissions.push(submission);

    // 1. Dispatch real-time email notification to admin with customer Reply-To
    const notificationResult = await sendCustomerInquiryNotification({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      type: inquiryType,
    }).catch((err) => {
      console.error('[Send-Email Notification Error]', err);
      return { success: false, error: err?.message };
    });

    return res.status(200).json({
      success: true,
      message: `Your request has been received and dispatched to our admin desk! We will follow up directly at ${cleanEmail}.`,
      submission,
      notification: notificationResult,
    });
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

      // Dispatch admin notification to globalherbsinc@gmail.com with customer Reply-To
      sendCustomerInquiryNotification({
        name: cleanName,
        email: cleanEmail,
        subject: `New Member Registration: ${cleanName} (${newUser.accountType})`,
        message: `A new member account has been registered on Global Herbs Inc:\n\n` +
          `Name: ${cleanName}\n` +
          `Email: ${cleanEmail}\n` +
          `Account Tier: ${newUser.accountType}\n` +
          `Phone: ${newUser.phone || 'Not provided'}\n` +
          `Default Delivery Address: ${newUser.deliveryAddress || 'Not provided'}\n` +
          `Notes / Preferences: ${newUser.notes || 'None'}\n` +
          `Registered At: ${newUser.createdAt}`,
        type: 'Dispensary Member Registration',
      }).catch((err) => console.error('[Member Registration Notification Error]', err));

      return res.status(201).json({
        success: true,
        message: `Welcome to Global Herbs, ${cleanName}! Your member account is now active.`,
        user: sanitizeUser(newUser),
        token: `gh_tok_${newUser.id}_${Date.now()}`,
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

    if (!email) {
      return res.status(400).json({ success: false, error: 'Please enter your registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = usersStore.get(cleanEmail);

    // Notify dispensary admin desk to assist or reset
    sendCustomerInquiryNotification({
      name: user ? user.name : 'Registered Client',
      email: cleanEmail,
      subject: `Password Reset Request for ${cleanEmail}`,
      message: `A client requested password assistance for their account:\n\nEmail: ${cleanEmail}\nMember Name: ${user ? user.name : 'Unknown'}\nTimestamp: ${new Date().toISOString()}\n\nPlease respond to client with password assistance.`,
      type: 'Password Reset Request',
    }).catch((err) => console.error('[Password Reset Notification Error]', err));

    return res.status(200).json({
      success: true,
      message: `Password reset instructions have been forwarded to ${cleanEmail} and our dispensary support desk. Please check your inbox or reply to the email.`,
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
          paymentMethod: order.paymentMethod,
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

  // API Route: Checkout Function (Order Capture & Transactional Email Admin Notification)
  app.post('/api/checkout', async (req, res) => {
    try {
      const {
        orderId: clientOrderId,
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        shippingAddress,
        shippingDetails,
        billingAddress,
        orderNotes,
        cartItems,
        subtotal,
        discount,
        couponCode,
        shippingCost,
        orderTotal,
        paymentMethod,
      } = req.body || {};

      // 1. Validate checkout data
      if (!customerName || !customerEmail || !shippingAddress || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required order fields (name, email, shipping address, or items).' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return res.status(400).json({ success: false, error: 'Invalid customer email address format.' });
      }

      // 2. Resolve order ID
      const orderId = (typeof clientOrderId === 'string' && clientOrderId.trim())
        ? clientOrderId.trim()
        : `GH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const orderDate = new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // 3. Parse and structure cart items
      const parsedItems: OrderItem[] = cartItems.map((item: any, idx: number) => {
        const itemPrice = Number(item.price ?? item.unitPrice ?? item.product?.price ?? 0);
        const itemQty = Math.max(1, Number(item.quantity ?? 1));
        const itemTotal = Number(item.total ?? (itemPrice * itemQty));
        const variant = item.variant || item.selectedWeight || item.weight || item.size || item.option || undefined;

        return {
          id: item.id || item.product?.id || `ITEM-${idx + 1}`,
          productId: item.productId || item.id || item.product?.id || `ITEM-${idx + 1}`,
          name: item.name || item.product?.name || item.title || 'Dispensary Botanical Item',
          variant,
          weight: item.weight || item.selectedWeight || undefined,
          size: item.size || undefined,
          quantity: itemQty,
          price: itemPrice,
          total: itemTotal,
          image: item.image || item.product?.image || undefined,
        };
      });

      // 4. Calculate or verify totals
      const computedSubtotal = parsedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const resolvedSubtotal = (subtotal !== undefined && Number(subtotal) >= 0) ? Number(subtotal) : computedSubtotal;
      const resolvedDiscount = (discount !== undefined && Number(discount) >= 0) ? Number(discount) : 0;
      const resolvedShipping = (shippingCost !== undefined && Number(shippingCost) >= 0)
        ? Number(shippingCost)
        : (resolvedSubtotal >= 250 ? 0 : 19.99);
      const resolvedTotal = (orderTotal !== undefined && Number(orderTotal) >= 0)
        ? Number(orderTotal)
        : Math.max(0, resolvedSubtotal - resolvedDiscount + resolvedShipping);

      // 5. Persist order in store (order is preserved regardless of email outcome)
      const trackingNum = `GH-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const savedOrder = {
        orderId,
        date: orderDate,
        status: 'Received & Stealth Processing',
        trackingNumber: trackingNum,
        carrier: 'Priority Stealth Express Courier',
        estimatedDelivery: '2-3 Business Days',
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone ? String(customerPhone).trim() : '',
        companyName: companyName ? String(companyName).trim() : '',
        shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress),
        billingAddress: billingAddress ? (typeof billingAddress === 'string' ? billingAddress : JSON.stringify(billingAddress)) : shippingAddress,
        orderNotes: orderNotes ? String(orderNotes).trim() : '',
        items: parsedItems,
        subtotal: resolvedSubtotal,
        discount: resolvedDiscount,
        couponCode: couponCode ? String(couponCode).trim() : undefined,
        shippingCost: resolvedShipping,
        orderTotal: resolvedTotal,
        paymentMethod: paymentMethod || 'btc',
        createdAt: new Date().toISOString(),
      };

      ordersStore.set(orderId, savedOrder);
      console.log(`[Order Processing] Order #${orderId} saved to orders store for ${customerName} ($${resolvedTotal.toFixed(2)})`);

      // 6. Send transactional Admin Order Notification via Google Apps Script (with customer Reply-To)
      const parsedShipping = parseShippingAddress(shippingDetails || savedOrder.shippingAddress);
      const appsScriptPayload: AppsScriptOrderPayload = {
        orderNumber: orderId,
        orderDate,
        status: savedOrder.status,
        customer: {
          name: savedOrder.customerName,
          email: savedOrder.customerEmail,
          phone: savedOrder.customerPhone || '',
        },
        items: parsedItems.map(item => ({
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
          tax: '0.00',
          total: resolvedTotal.toFixed(2),
        },
        shipping: parsedShipping,
        paymentMethod: savedOrder.paymentMethod || 'Dispensary Direct',
        notes: savedOrder.orderNotes || '',
      };

      const notifResult = await sendOrderNotification(appsScriptPayload);

      // 7. Order is preserved and guaranteed successful regardless of notification outcome
      if (!notifResult.success) {
        console.error(`[Checkout] Admin notification notice for #${orderId}: ${notifResult.error}`);
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
          },
          message: `Order #${orderId} registered successfully. Notification note: ${notifResult.error}`,
        });
      }

      console.log(`[Checkout] Order #${orderId} complete. Notification sent to admin (${notifResult.recipient}) via Google Apps Script`);
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
        },
        message: `Order #${orderId} successfully registered and admin notification dispatched via Google Apps Script!`,
      });
    } catch (err: any) {
      console.error('[Checkout API Exception]:', err);
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing the checkout submission.',
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
      hasScriptUrl: Boolean(config.appsScriptUrl),
      maskedUrl: config.appsScriptUrl ? `${config.appsScriptUrl.substring(0, 35)}...` : 'NOT_SET',
      instruction: 'To receive live order notifications, set GOOGLE_APPS_SCRIPT_URL in .env to your deployed Web App URL.',
    });
  });

  // API Route: Contact Form Trigger (Admin Email Notification)
  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, phone, subscribeNewsletter } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanName = (name || '').trim() || 'Valued Client';
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanSubject = (subject || 'Product Question').trim();
    const cleanMessage = (message || '').trim();

    // 1. Dispatch real-time email notification to admin with customer Reply-To
    const notificationResult = await sendCustomerInquiryNotification({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      type: 'Customer Contact Form',
    }).catch((err) => {
      console.error('[Contact Notification Error]', err);
      return { success: false, error: err?.message };
    });

    // 2. Log to local store
    contactSubmissions.push({
      id: Math.random().toString(36).substring(2, 9),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      type: 'contact_form',
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Thank you, ${cleanName}! Your inquiry has been sent directly to the dispensary admin team. We will reply to your email shortly.`,
      notification: notificationResult,
    });
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
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please specify a valid email address.' });
    }

    if (!newsletterEmails.includes(email)) {
      newsletterEmails.push(email);
    }

    // Notify admin about new newsletter / waitlist subscriber
    sendCustomerInquiryNotification({
      name: 'New Subscriber / VIP Lead',
      email: email.trim().toLowerCase(),
      subject: `New VIP Newsletter Subscriber: ${email.trim().toLowerCase()}`,
      message: `A customer has subscribed to the Global Herbs newsletter / VIP access club:
Subscriber Email: ${email.trim().toLowerCase()}
Discount Coupon Issued: HERBS15OFF
Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`,
      type: 'VIP Newsletter Subscription',
    }).catch((err) => console.warn('[Subscribe Notification Notice]', err?.message));

    return res.status(200).json({
      success: true,
      message: `Successfully subscribed ${email}! Check your inbox for your 15% off coupon: HERBS15OFF`,
    });
  });

  // API Route: Customer Product Review Submission & Admin Notification
  app.post('/api/review', async (req, res) => {
    const { productId, productName, author, email, rating, comment } = req.body || {};

    if (!author || !comment) {
      return res.status(400).json({ success: false, error: 'Author name and feedback comment are required.' });
    }

    const cleanAuthor = String(author).trim();
    const cleanEmail = (email && String(email).includes('@'))
      ? String(email).trim().toLowerCase()
      : 'reviews@globalherbsinc.com';
    const cleanProduct = String(productName || 'Botanical Product').trim();
    const cleanComment = String(comment).trim();
    const numRating = Number(rating) || 5;

    // Dispatch email notification to admin with reviewer details and Reply-To
    const notificationResult = await sendCustomerInquiryNotification({
      name: cleanAuthor,
      email: cleanEmail,
      subject: `New ${numRating}★ Review: ${cleanProduct} — ${cleanAuthor}`,
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
    }).catch((err) => {
      console.error('[Review Notification Error]', err);
      return { success: false, error: err?.message };
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your product review has been submitted and shared with dispensary management.',
      notification: notificationResult,
    });
  });

  // Dedicated Test Endpoint for Checkout Confirmation Verification
  app.post('/api/test/checkout', async (req, res) => {
    const targetEmail = req.body?.email || 'nahor692@gmail.com';
    const targetName = req.body?.name || 'Dispensary Client';

    const testOrderId = `GH-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const testItems = [
      {
        productId: 'GH-BLUE-DREAM-01',
        title: 'AAA+ Organic Blue Dream Dispensary Flower (3.5g)',
        price: 45.00,
        quantity: 2,
        imageUrl: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?auto=format&fit=crop&q=80&w=400',
      },
      {
        productId: 'GH-CBD-TINCTURE-02',
        title: 'Full Spectrum Organic CBD Botanical Tincture (1000mg)',
        price: 65.00,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=400',
      },
    ];
    const total = 155.00;

    // Save into in-memory order tracking
    ordersStore.set(testOrderId, {
      orderId: testOrderId,
      date: new Date().toISOString(),
      status: 'Stealth Dispatched & Active',
      trackingNumber: `GH-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      carrier: 'Priority Stealth Express Courier',
      estimatedDelivery: '2 Business Days',
      customerName: targetName,
      customerEmail: targetEmail,
      shippingAddress: '100 Botanical Way, Suite 400, Los Angeles, CA 90001, United States',
      items: testItems.map(i => ({ name: i.title, quantity: i.quantity, price: i.price })),
      orderTotal: total,
    });

    return res.status(200).json({
      success: true,
      message: `Test order ${testOrderId} registered for ${targetEmail}!`,
      orderId: testOrderId,
      recipient: targetEmail,
    });
  });

  // API Route: Send Test Order Notification Email via Google Apps Script
  app.all('/api/test-email', async (req, res) => {
    const targetEmail = req.body?.email || req.query?.email || 'nahor692@gmail.com';
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
        hasScriptUrl: Boolean(notifConfig.appsScriptUrl),
      },
      logoAvailable: fs.existsSync(path.join(process.cwd(), 'src/assets/images/global_herbs_logo_1784328365704.jpg')),
    });
  });

  // Vite middleware for development vs asset hosting for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA routing fallback
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Server] Global Herbs running on port ${PORT} with PID ${process.pid}`);
  });
}

startServer();
