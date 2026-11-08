/**
 * lib/email/orderNotification.ts
 *
 * Canonical Server-Side Email & Order Notification Engine for Global Herbs Inc.
 *
 * Architecture:
 * 1. Customer submits order or form on frontend -> Backend API validates & persists record first.
 * 2. Backend triggers `sendOrderNotification` (Admin Order Alert) or `sendCustomerInquiryNotification` (Admin Form Alert).
 * 3. Payload is formatted to satisfy both the live deployed Google Apps Script Web App contract
 *    (which requires `customer.email` and `items.length > 0`) and extended fields.
 * 4. Includes automatic retry with backoff for transient network/5xx errors, strict 20s timeout,
 *    idempotency protection against duplicate emails, and structured observability metadata.
 */

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface NotificationAuditRecord {
  notificationStatus: NotificationStatus;
  notificationMessageId: string | null;
  notificationSentAt: string | null;
  notificationError: string | null;
  notificationAttempts: number;
  recipient: string;
  replyTo: string | null;
  provider: 'google_apps_script';
  duplicateSuppressed?: boolean;
  unconfigured?: boolean;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface OrderItemInput {
  id?: string | number;
  productId?: string | number;
  name: string;
  variant?: string;
  weight?: string;
  size?: string;
  quantity: number;
  price: number | string;
  subtotal?: number | string;
  total?: number | string;
}

export interface OrderTotalsInput {
  subtotal: number | string;
  discount?: number | string;
  shipping?: number | string;
  tax?: number | string;
  total: number | string;
  currency?: string;
}

export interface OrderShippingInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  street?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  zipCode?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface OrderNotificationInput {
  orderNumber?: string;
  orderId?: string;
  orderDate?: string;
  status?: string;
  subject?: string;
  customer?: OrderCustomer;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
  items?: OrderItemInput[];
  cartItems?: OrderItemInput[];
  totals?: OrderTotalsInput;
  subtotal?: number | string;
  discount?: number | string;
  couponCode?: string;
  shippingCost?: number | string;
  tax?: number | string;
  orderTotal?: number | string;
  currency?: string;
  shipping?: OrderShippingInput | string;
  shippingAddress?: OrderShippingInput | string;
  shippingDetails?: OrderShippingInput;
  billingAddress?: OrderShippingInput | string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  trackingNumber?: string;
  notes?: string;
  orderNotes?: string;
  recipient?: string;
  adminEmail?: string;
  forceRetry?: boolean;
  text?: string;
  html?: string;
}

export interface CleanAppsScriptPayload {
  orderNumber: string;
  orderId?: string;
  orderDate: string;
  status: string;
  subject: string;
  recipient: string;
  to?: string;
  recipientEmail?: string;
  adminEmail: string;
  email?: string;
  targetEmail?: string;
  emailFrom: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  couponCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  total?: number | string;
  subtotal?: number | string;
  discount?: number | string;
  shippingCost?: number | string;
  tax?: number | string;
  customer: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  items: Array<{
    id?: string;
    name: string;
    variant: string;
    quantity: number;
    price: string;
    subtotal: string;
  }>;
  totals: {
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
    currency: string;
  };
  shipping: {
    name?: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billing?: {
    name?: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  notes: string;
  text?: string;
  html?: string;
  sendCustomerConfirmation?: boolean;
}

export interface OrderNotificationResult {
  success: boolean;
  orderNumber: string;
  recipient: string;
  replyTo?: string | null;
  unconfigured?: boolean;
  duplicateSuppressed?: boolean;
  error?: string | null;
  notificationStatus: NotificationStatus;
  notificationMessageId: string | null;
  notificationSentAt: string | null;
  notificationError: string | null;
  notificationAttempts: number;
}

// Idempotency cache (24-hour retention) to prevent duplicate notifications for the same order/submission
const processedOrders = new Map<
  string,
  {
    timestamp: number;
    success: boolean;
    messageId: string | null;
    sentAt: string | null;
  }
>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export function isOrderAlreadyProcessed(orderNumber: string): boolean {
  if (!orderNumber) return false;
  const cleanKey = orderNumber.trim().toUpperCase();
  const entry = processedOrders.get(cleanKey);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > IDEMPOTENCY_TTL_MS) {
    processedOrders.delete(cleanKey);
    return false;
  }
  return entry.success;
}

export function getProcessedOrderRecord(orderNumber: string) {
  if (!orderNumber) return null;
  return processedOrders.get(orderNumber.trim().toUpperCase()) || null;
}

export function markOrderProcessed(
  orderNumber: string,
  success: boolean,
  messageId: string | null = null,
  sentAt: string | null = null
): void {
  if (!orderNumber) return;
  const cleanKey = orderNumber.trim().toUpperCase();
  processedOrders.set(cleanKey, {
    timestamp: Date.now(),
    success,
    messageId,
    sentAt,
  });
}

/**
 * Validate and sanitize email to RFC 5322 compliance and prevent CRLF injection.
 */
export function sanitizeEmailAddress(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (/[\r\n]/.test(clean)) return null;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean) ? clean : null;
}

/**
 * Parses and cleans shipping/billing address input into individual structured fields.
 */
export function parseAddressBlock(input?: OrderShippingInput | string): {
  name?: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
} {
  const fallback = {
    address: 'Not provided',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  };

  if (!input) return fallback;

  if (typeof input === 'object' && input !== null) {
    const fullName =
      input.name ||
      [input.firstName, input.lastName].filter(Boolean).join(' ').trim() ||
      undefined;
    const streetParts = [
      input.address || input.street || input.street1,
      input.street2,
    ]
      .filter(Boolean)
      .join(', ');
    return {
      name: fullName,
      company: input.company || undefined,
      address: streetParts || 'Not provided',
      city: input.city || '',
      state: input.state || '',
      postalCode: input.postalCode || input.zipCode || input.zip || '',
      country: input.country || 'United States',
      phone: input.phone || undefined,
      email: input.email || undefined,
    };
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return fallback;
    try {
      if (trimmed.startsWith('{')) {
        const parsedObj = JSON.parse(trimmed);
        return parseAddressBlock(parsedObj);
      }
    } catch {
      // treat as plain string
    }
    const lines = trimmed
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length >= 3) {
      return {
        address: lines[0],
        city: lines[1] || '',
        state: lines[2] || '',
        postalCode: lines[3] || '',
        country: lines[4] || 'United States',
      };
    }
    return {
      address: trimmed,
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    };
  }

  return fallback;
}

/**
 * Normalizes any numeric or string financial amount to a formatted "0.00" string.
 */
export function formatCurrency(val?: number | string): string {
  if (val === undefined || val === null || val === '') return '0.00';
  if (typeof val === 'number') {
    return isNaN(val) ? '0.00' : val.toFixed(2);
  }
  const clean = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? '0.00' : parsed.toFixed(2);
}

/**
 * Formats human-readable payment method name.
 */
export function formatPaymentMethodLabel(method?: string): string {
  if (!method) return 'Dispensary Direct';
  const map: Record<string, string> = {
    btc: 'Bitcoin / Cryptocurrency (BTC, ETH, USDT)',
    zelle: 'Zelle / CashApp / Venmo Transfer',
    wire: 'Interac e-Transfer / Bank Wire',
    google_apple: 'Apple Pay / Google Pay Express',
  };
  return map[method.toLowerCase()] || method;
}

/**
 * Resolves the configured Google Apps Script Web App URL from server environment variables.
 */
export function getAppsScriptUrl(): string | null {
  if (typeof process !== 'undefined' && process.env?.GOOGLE_APPS_SCRIPT_URL) {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL.trim();
    if (url.startsWith('https://script.google.com/')) return url;
  }
  return null;
}

/**
 * Resolves the administrator recipient email.
 */
export function getAdminRecipientEmail(): string {
  if (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) {
    const email = sanitizeEmailAddress(process.env.ADMIN_EMAIL);
    if (email) return email;
  }
  return 'globalherbsinc@gmail.com';
}

/**
 * Resolves the configured sender email / display identity.
 */
export function getSenderEmail(): string {
  if (typeof process !== 'undefined') {
    const fromEnv =
      process.env?.EMAIL_FROM ||
      process.env?.FROM_EMAIL ||
      process.env?.GMAIL_SENDER_EMAIL;
    const clean = sanitizeEmailAddress(fromEnv);
    if (clean) return clean;
  }
  return 'globalherbsinc@gmail.com';
}

/**
 * Formats a flexible order input into a strict, complete JSON payload matching
 * the Google Apps Script endpoint contract and including all required admin fields.
 */
export function formatOrderPayload(
  order: OrderNotificationInput
): CleanAppsScriptPayload {
  const orderNumber = (
    order.orderNumber ||
    order.orderId ||
    `GH-${Date.now()}`
  ).trim();
  const orderDate =
    order.orderDate ||
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const status = order.status || 'Received & Stealth Processing';
  const currency = (order.currency || order.totals?.currency || 'USD')
    .trim()
    .toUpperCase();

  const customerName = (
    order.customer?.name ||
    order.customerName ||
    'Valued Customer'
  ).trim();
  const rawEmail = (
    order.customer?.email ||
    order.customerEmail ||
    ''
  ).trim();
  const customerEmail =
    sanitizeEmailAddress(rawEmail) || 'noreply@globalherbs.site';
  const customerPhone = (
    order.customer?.phone ||
    order.customerPhone ||
    ''
  ).trim();
  const companyName = (
    order.customer?.company ||
    order.companyName ||
    ''
  ).trim();

  const rawItems = order.items || order.cartItems || [];
  const items = rawItems.map((item, idx) => {
    const name = item.name || `Dispensary Product #${idx + 1}`;
    const variant = item.variant || item.weight || item.size || 'Standard';
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const priceStr = formatCurrency(item.price);
    const subtotalStr =
      item.subtotal !== undefined || item.total !== undefined
        ? formatCurrency(item.subtotal ?? item.total)
        : (parseFloat(priceStr) * quantity).toFixed(2);

    return {
      id: item.id || item.productId ? String(item.id || item.productId) : undefined,
      name,
      variant,
      quantity,
      price: priceStr,
      subtotal: subtotalStr,
    };
  });

  // Ensure items is NEVER empty so the deployed Google Apps Script Web App never rejects the payload
  if (items.length === 0) {
    items.push({
      id: 'ORDER-SUMMARY',
      name: `Order #${orderNumber}`,
      variant: status,
      quantity: 1,
      price: formatCurrency(order.orderTotal ?? order.totals?.total ?? 0),
      subtotal: formatCurrency(order.orderTotal ?? order.totals?.total ?? 0),
    });
  }

  const subtotal =
    order.totals?.subtotal !== undefined
      ? formatCurrency(order.totals.subtotal)
      : order.subtotal !== undefined
      ? formatCurrency(order.subtotal)
      : items.reduce((acc, i) => acc + parseFloat(i.subtotal), 0).toFixed(2);

  const discount =
    order.totals?.discount !== undefined
      ? formatCurrency(order.totals.discount)
      : formatCurrency(order.discount || 0);

  const shipping =
    order.totals?.shipping !== undefined
      ? formatCurrency(order.totals.shipping)
      : formatCurrency(order.shippingCost || 0);

  const tax =
    order.totals?.tax !== undefined
      ? formatCurrency(order.totals.tax)
      : formatCurrency(order.tax || 0);

  const total =
    order.totals?.total !== undefined
      ? formatCurrency(order.totals.total)
      : order.orderTotal !== undefined
      ? formatCurrency(order.orderTotal)
      : Math.max(
          0,
          parseFloat(subtotal) - parseFloat(discount) + parseFloat(shipping) + parseFloat(tax)
        ).toFixed(2);

  const shippingData = parseAddressBlock(
    order.shippingDetails || order.shippingAddress || order.shipping
  );
  const billingData = order.billingAddress
    ? parseAddressBlock(order.billingAddress)
    : shippingData;

  const paymentMethod = formatPaymentMethodLabel(order.paymentMethod);
  const paymentStatus = (
    order.paymentStatus || 'Awaiting Payment Verification / Pending Dispatch'
  ).trim();
  const transactionId = (
    order.transactionId ||
    order.trackingNumber ||
    `REF-${orderNumber}`
  ).trim();
  const couponCode = order.couponCode ? String(order.couponCode).trim() : undefined;

  // Build comprehensive structured summary in `notes` so even if the deployed Apps Script
  // uses a simpler template, 100% of billing, shipping, payment, and customer metadata is visible.
  const customerNotesRaw = (order.notes || order.orderNotes || '').trim();
  const AlreadyFormattedInquiry = customerNotesRaw.startsWith('CUSTOMER INQUIRY / FORM SUBMISSION');

  const enrichedNotes = AlreadyFormattedInquiry
    ? customerNotesRaw
    : [
        customerNotesRaw ? `CUSTOMER DELIVERY NOTES:\n${customerNotesRaw}\n` : '',
        `COMPLETE ORDER & FULFILLMENT SUMMARY`,
        `----------------------------------------`,
        `Order ID: ${orderNumber}`,
        `Order Date/Time: ${orderDate}`,
        `Order Status: ${status}`,
        `Payment Method: ${paymentMethod}`,
        `Payment Status: ${paymentStatus}`,
        `Transaction / Reference ID: ${transactionId}`,
        `Currency: ${currency}`,
        couponCode ? `Coupon Code Applied: ${couponCode} (-$${discount})` : '',
        companyName ? `Company Name: ${companyName}` : '',
        ``,
        `BILLING INFORMATION:`,
        `Name: ${billingData.name || customerName}`,
        billingData.company ? `Company: ${billingData.company}` : '',
        `Address: ${billingData.address}`,
        `City/State/ZIP: ${[billingData.city, billingData.state, billingData.postalCode].filter(Boolean).join(', ') || 'See address above'}`,
        `Country: ${billingData.country || 'United States'}`,
        `Email: ${customerEmail}`,
        `Phone: ${customerPhone || 'Not provided'}`,
        ``,
        `DELIVERY / SHIPPING ADDRESS:`,
        shippingData.name ? `Recipient: ${shippingData.name}` : `Recipient: ${customerName}`,
        `Street Address: ${shippingData.address}`,
        `City/State/ZIP: ${[shippingData.city, shippingData.state, shippingData.postalCode].filter(Boolean).join(', ') || 'See address above'}`,
        `Country: ${shippingData.country || 'United States'}`,
      ]
        .filter(Boolean)
        .join('\n');

  const adminEmail =
    sanitizeEmailAddress(order.recipient || order.adminEmail) ||
    getAdminRecipientEmail();

  const subject =
    order.subject ||
    `NEW CUSTOMER ORDER #${orderNumber} — ${customerName} — $${total} ${currency}`;

  return {
    orderNumber,
    orderId: orderNumber,
    orderDate,
    status,
    subject,
    recipient: adminEmail,
    to: adminEmail,
    recipientEmail: adminEmail,
    adminEmail,
    email: adminEmail,
    targetEmail: adminEmail,
    emailFrom: getSenderEmail(),
    currency,
    customerName,
    customerEmail,
    customerPhone: customerPhone || 'Not provided',
    total,
    subtotal,
    discount,
    shippingCost: shipping,
    tax,
    paymentMethod,
    paymentStatus,
    transactionId,
    couponCode,
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone || 'Not provided',
      company: companyName || undefined,
    },
    items,
    totals: {
      subtotal,
      discount,
      shipping,
      tax,
      total,
      currency,
    },
    shipping: {
      name: shippingData.name || customerName,
      address: shippingData.address,
      city: shippingData.city,
      state: shippingData.state,
      postalCode: shippingData.postalCode,
      country: shippingData.country,
    },
    billing: {
      name: billingData.name || customerName,
      company: billingData.company,
      address: billingData.address,
      city: billingData.city,
      state: billingData.state,
      postalCode: billingData.postalCode,
      country: billingData.country,
      phone: customerPhone || billingData.phone,
      email: customerEmail,
    },
    notes: enrichedNotes,
    text: order.text || enrichedNotes,
    html: order.html || undefined,
    sendCustomerConfirmation: true,
  };
}

// Serialized dispatch queue so concurrent order/form requests never collide on Google Apps Script
let dispatchQueuePromise: Promise<any> = Promise.resolve();
let lastDispatchCompletedAt = 0;
const MIN_DISPATCH_INTERVAL_MS = 650;

function enqueueAppsScriptDispatch<T>(task: () => Promise<T>): Promise<T> {
  const next = dispatchQueuePromise.then(async () => {
    const elapsed = Date.now() - lastDispatchCompletedAt;
    if (lastDispatchCompletedAt > 0 && elapsed < MIN_DISPATCH_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_DISPATCH_INTERVAL_MS - elapsed));
    }
    try {
      return await task();
    } finally {
      lastDispatchCompletedAt = Date.now();
    }
  });
  dispatchQueuePromise = next.catch(() => {});
  return next;
}

/**
 * Fetches the JSON response body from Google Apps Script's 302 echo redirect URL
 * (`https://script.googleusercontent.com/macros/echo?...`), retrying on transient edge 404/5xx.
 */
async function followAppsScriptEchoRedirect(
  echoUrl: string,
  maxEchoAttempts = 3
): Promise<{ status: number; text: string; ok: boolean }> {
  let lastStatus = 0;
  let lastText = '';

  for (let i = 1; i <= maxEchoAttempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    if (typeof timeoutId === 'object' && typeof (timeoutId as any).unref === 'function') {
      (timeoutId as any).unref();
    }
    try {
      const echoRes = await fetch(echoUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
        redirect: 'follow',
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      lastStatus = echoRes.status;
      lastText = await echoRes.text().catch(() => '');

      if (echoRes.ok) {
        return { status: echoRes.status, text: lastText, ok: true };
      }

      // Transient edge cache 404 or 5xx on script.googleusercontent.com/macros/echo
      if (i < maxEchoAttempts) {
        await new Promise((r) => setTimeout(r, i * 600));
        continue;
      }
    } catch (err: any) {
      lastText = err?.message || 'Echo redirect fetch error';
      if (i < maxEchoAttempts) {
        await new Promise((r) => setTimeout(r, i * 600));
        continue;
      }
    }
  }

  return { status: lastStatus, text: lastText, ok: false };
}

/**
 * Low-level HTTP POST dispatcher to Google Apps Script with serialized concurrency,
 * two-stage 302 redirect handling, automatic retry & timeout.
 */
async function postToAppsScriptWithRetry(
  scriptUrl: string,
  payload: Record<string, any>,
  maxAttempts = 3
): Promise<{
  ok: boolean;
  attempts: number;
  messageId: string | null;
  error: string | null;
}> {
  return enqueueAppsScriptDispatch(async () => {
    let lastError = 'Unknown error';
    const bodyString = JSON.stringify(payload);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      if (typeof timeoutId === 'object' && typeof (timeoutId as any).unref === 'function') {
        (timeoutId as any).unref();
      }

      try {
        // Stage 1: POST to script.google.com with redirect: 'manual'
        // Using text/plain;charset=utf-8 avoids strict preflight/header issues on Google Apps Script
        // while keeping e.postData.contents as the exact JSON string.
        const postResponse = await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            Accept: 'application/json, text/plain, */*',
          },
          body: bodyString,
          redirect: 'manual',
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        let responseStatus = postResponse.status;
        let responseText = '';
        let responseOk = postResponse.ok;

        // Stage 2: Handle 302/303/307 redirect from script.google.com -> script.googleusercontent.com/macros/echo
        if (
          responseStatus === 301 ||
          responseStatus === 302 ||
          responseStatus === 303 ||
          responseStatus === 307 ||
          responseStatus === 308
        ) {
          const locationUrl = postResponse.headers.get('location');
          if (locationUrl) {
            // Check if redirected to Google login page (misconfigured permissions)
            if (locationUrl.includes('accounts.google.com/ServiceLogin')) {
              lastError =
                'Google Apps Script redirected to login page. Ensure Web App is deployed with Who has access: "Anyone".';
              return { ok: false, attempts: attempt, messageId: null, error: lastError };
            }

            const echoResult = await followAppsScriptEchoRedirect(locationUrl, 3);
            responseStatus = echoResult.status;
            responseText = echoResult.text;
            responseOk = echoResult.ok;

            // If script.google.com executed doPost() and issued a valid macros/echo user_content_key,
            // but googleusercontent edge cache returned a transient 404, retry the POST if attempts remain.
            if (!responseOk && locationUrl.includes('script.googleusercontent.com/macros/echo')) {
              if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, attempt * 1200));
                continue;
              }
            }
          } else {
            responseOk = true;
          }
        } else {
          responseText = await postResponse.text().catch(() => '');
        }

        if (!responseOk) {
          lastError = `Google Apps Script HTTP ${responseStatus}: ${responseText.slice(0, 200)}`;
          // Retry on 5xx, 429 rate-limit, or transient 404 from Google edge
          if (
            (responseStatus >= 500 || responseStatus === 429 || responseStatus === 404) &&
            attempt < maxAttempts
          ) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          return { ok: false, attempts: attempt, messageId: null, error: lastError };
        }

        // Detect Google Drive "Page not found" or auth redirect HTML response
        if (
          responseText.includes('<title>Page not found</title>') ||
          responseText.includes('unable to open the file at present') ||
          responseText.includes('accounts.google.com/ServiceLogin') ||
          responseText.includes('<!DOCTYPE html><html lang="en"><head><meta name="description" content="Web word processing')
        ) {
          lastError =
            'Google Apps Script returned an HTML error page. Verify the Web App deployment is active.';
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          return { ok: false, attempts: attempt, messageId: null, error: lastError };
        }

        let responseData: any = null;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          // Non-JSON response with 200 status and no error page
        }

        if (responseData && (responseData.success === false || responseData.status === 'error')) {
          lastError =
            responseData.message ||
            responseData.error ||
            'Google Apps Script returned an error status';
          // If script lock was busy (503), retry
          if (lastError.toLowerCase().includes('busy') && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          return { ok: false, attempts: attempt, messageId: null, error: lastError };
        }

        const messageId =
          responseData?.messageId ||
          responseData?.data?.orderNumber ||
          `gas-${payload.orderNumber || Date.now()}-${Date.now()}`;

        return {
          ok: true,
          attempts: attempt,
          messageId: String(messageId),
          error: null,
        };
      } catch (err: any) {
        lastError =
          err?.name === 'AbortError'
            ? 'Request timed out after 20s while contacting Google Apps Script endpoint'
            : err?.message || 'Network error communicating with Google Apps Script';

        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 1500));
          continue;
        }
      }
    }

    return { ok: false, attempts: maxAttempts, messageId: null, error: lastError };
  });
}

/**
 * Primary Function: Sends an Admin Order Notification via Google Apps Script Web App.
 *
 * Guarantees:
 * - Formats order into a verified JSON payload with all required customer, product, billing, shipping, and payment details.
 * - Suppresses duplicate notifications for the same order ID unless `forceRetry: true` is passed.
 * - Retries transient failures up to 3 times.
 * - Returns full notification audit metadata (`notificationStatus`, `notificationMessageId`, `notificationSentAt`, `notificationError`).
 */
export async function sendOrderNotification(
  orderInput: OrderNotificationInput
): Promise<OrderNotificationResult> {
  const payload = formatOrderPayload(orderInput);
  const orderNumber = payload.orderNumber;
  const adminEmail = payload.recipient;
  const replyTo = sanitizeEmailAddress(payload.customer.email);

  // 1. Idempotency check: prevent duplicate notifications unless explicitly retrying
  if (!orderInput.forceRetry && isOrderAlreadyProcessed(orderNumber)) {
    const existing = getProcessedOrderRecord(orderNumber);
    console.log(
      `[Order Notification] Duplicate notification suppressed for #${orderNumber}`
    );
    return {
      success: true,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      duplicateSuppressed: true,
      notificationStatus: 'sent',
      notificationMessageId: existing?.messageId || `dup-${orderNumber}`,
      notificationSentAt: existing?.sentAt || new Date().toISOString(),
      notificationError: null,
      notificationAttempts: 1,
    };
  }

  // 2. Verify GOOGLE_APPS_SCRIPT_URL configuration
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    const configError =
      'GOOGLE_APPS_SCRIPT_URL environment variable is not configured on the server.';
    console.error(`[Order Notification Error] Order #${orderNumber}: ${configError}`);
    return {
      success: false,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      unconfigured: true,
      error: configError,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: configError,
      notificationAttempts: 0,
    };
  }

  // 3. Dispatch with automatic retry
  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, payload, 3);

  if (!dispatchResult.ok) {
    console.error(
      `[Order Notification Failed] Order #${orderNumber} after ${dispatchResult.attempts} attempt(s): ${dispatchResult.error}`
    );
    return {
      success: false,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      error: dispatchResult.error,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts,
    };
  }

  const sentAt = new Date().toISOString();
  markOrderProcessed(orderNumber, true, dispatchResult.messageId, sentAt);
  console.log(
    `[Order Notification Sent] Order #${orderNumber} delivered to admin (${adminEmail}) [msgId: ${dispatchResult.messageId}]`
  );

  return {
    success: true,
    orderNumber,
    recipient: adminEmail,
    replyTo,
    error: null,
    notificationStatus: 'sent',
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts,
  };
}

/**
 * Sends a separate Customer Order Confirmation Email to the customer's email address.
 * Kept distinct from the Administrator Order Notification so admin alerts are never impacted.
 */
export async function sendCustomerOrderConfirmation(
  orderInput: OrderNotificationInput
): Promise<OrderNotificationResult> {
  const payload = formatOrderPayload(orderInput);
  const customerEmail = sanitizeEmailAddress(
    orderInput.customer?.email || orderInput.customerEmail
  );
  const confirmationId = `CUST-CONF-${payload.orderNumber}`;

  if (!customerEmail) {
    return {
      success: false,
      orderNumber: confirmationId,
      recipient: '',
      error: 'No valid customer email provided for confirmation.',
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: 'No valid customer email provided',
      notificationAttempts: 0,
    };
  }

  if (!orderInput.forceRetry && isOrderAlreadyProcessed(confirmationId)) {
    const existing = getProcessedOrderRecord(confirmationId);
    return {
      success: true,
      orderNumber: confirmationId,
      recipient: customerEmail,
      replyTo: getAdminRecipientEmail(),
      duplicateSuppressed: true,
      notificationStatus: 'sent',
      notificationMessageId: existing?.messageId || `dup-${confirmationId}`,
      notificationSentAt: existing?.sentAt || new Date().toISOString(),
      notificationError: null,
      notificationAttempts: 1,
    };
  }

  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    return {
      success: false,
      orderNumber: confirmationId,
      recipient: customerEmail,
      unconfigured: true,
      error: 'GOOGLE_APPS_SCRIPT_URL is not configured.',
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: 'GOOGLE_APPS_SCRIPT_URL is not configured.',
      notificationAttempts: 0,
    };
  }

  const customerPayload: CleanAppsScriptPayload = {
    ...payload,
    orderNumber: payload.orderNumber,
    status: `Order Confirmation — ${payload.status}`,
    subject: `Order Confirmation #${payload.orderNumber} — Global Herbs Inc`,
    recipient: customerEmail,
    to: customerEmail,
    recipientEmail: customerEmail,
    adminEmail: customerEmail,
    email: customerEmail,
    targetEmail: customerEmail,
    customerEmail,
    notes: [
      `Thank you for your order with Global Herbs Inc, ${payload.customer.name}!`,
      ``,
      `ORDER CONFIRMATION DETAILS:`,
      `Order Reference: #${payload.orderNumber}`,
      `Order Date: ${payload.orderDate}`,
      `Payment Method: ${payload.paymentMethod}`,
      `Payment Status: ${payload.paymentStatus}`,
      `Order Total: $${payload.totals.total} ${payload.currency}`,
      ``,
      `DELIVERY INFORMATION:`,
      `${payload.shipping.name || payload.customer.name}`,
      `${payload.shipping.address}`,
      `${[payload.shipping.city, payload.shipping.state, payload.shipping.postalCode].filter(Boolean).join(', ')}`,
      `${payload.shipping.country}`,
      ``,
      `EXPECTED NEXT STEPS:`,
      `1. Once payment verification is complete, your order enters our Double Vacuum-Sealed Stealth Packaging queue.`,
      `2. Your tracking number will be activated within 12-24 business hours.`,
      `3. You can track your order status anytime at https://globalherbs.site/order-tracking using Order ID #${payload.orderNumber}.`,
      ``,
      `NEED ASSISTANCE?`,
      `Reply directly to this email or contact our dispatch desk at globalherbsinc@gmail.com or +1 (213) 280-1161.`,
    ].join('\n'),
  };

  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, customerPayload, 2);
  if (!dispatchResult.ok) {
    return {
      success: false,
      orderNumber: confirmationId,
      recipient: customerEmail,
      error: dispatchResult.error,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts,
    };
  }

  const sentAt = new Date().toISOString();
  markOrderProcessed(confirmationId, true, dispatchResult.messageId, sentAt);
  return {
    success: true,
    orderNumber: confirmationId,
    recipient: customerEmail,
    replyTo: getAdminRecipientEmail(),
    error: null,
    notificationStatus: 'sent',
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts,
  };
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ContactMessageInput {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  submissionDate?: string;
}

/**
 * Sends a distinct NEW CONTACT MESSAGE email to globalherbsinc@gmail.com
 */
export async function sendContactMessageNotification(
  input: ContactMessageInput
): Promise<OrderNotificationResult> {
  const cleanName = (input.name || 'Valued Client').trim();
  const cleanEmail = sanitizeEmailAddress(input.email) || 'contact@globalherbs.site';
  const cleanPhone = (input.phone || '').trim();
  const cleanSubject = (input.subject || 'General Inquiry').trim();
  const cleanMessage = (input.message || '').trim();
  const submissionId =
    input.id ||
    `CNT-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

  const now = input.submissionDate ? new Date(input.submissionDate) : new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const adminEmail = getAdminRecipientEmail();
  const subject = `NEW CONTACT MESSAGE – GLOBAL HERBS: ${cleanSubject}`;

  const plainText = [
    '==================================================',
    'GLOBAL HERBS — NEW CONTACT MESSAGE',
    '==================================================',
    '',
    'A new contact message has been submitted on Global Herbs.',
    '',
    'Contact Details:',
    `- Customer Name:   ${cleanName}`,
    `- Email Address:   ${cleanEmail}`,
    `- Phone Number:    ${cleanPhone || 'Not provided'}`,
    `- Subject / Topic: ${cleanSubject}`,
    `- Submission Date: ${dateStr}`,
    `- Submission Time: ${timeStr}`,
    `- Submission ID:   ${submissionId}`,
    '',
    'Message:',
    '--------------------------------------------------',
    cleanMessage || '(No message provided)',
    '--------------------------------------------------',
    '',
    'Website: https://globalherbs.site',
    'This notification is for administrative purposes only.',
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="background:#064e3b;padding:24px 28px;color:#ffffff;">
    <h1 style="margin:0;font-size:22px;letter-spacing:-0.02em;">Global Herbs Inc.</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Customer Support Desk &bull; Contact Message</p>
  </div>
  <div style="padding:26px 28px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <span style="display:inline-block;color:#166534;font-weight:700;font-size:15px;letter-spacing:0.02em;">
        NEW CONTACT MESSAGE
      </span>
      <p style="margin:6px 0 0;font-size:14px;color:#1f2937;">
        Topic: <strong>${escapeHtml(cleanSubject)}</strong>
      </p>
    </div>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 12px;">Contact Details</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:150px;border-bottom:1px solid #f3f4f6;">Customer Name:</td>
        <td style="padding:8px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(cleanName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Email Address:</td>
        <td style="padding:8px 0;font-weight:600;color:#059669;border-bottom:1px solid #f3f4f6;">
          <a href="mailto:${escapeHtml(cleanEmail)}" style="color:#059669;text-decoration:none;">${escapeHtml(cleanEmail)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Phone Number:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(cleanPhone || 'Not provided')}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Submission Date:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Submission Time:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${timeStr}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Submission ID:</td>
        <td style="padding:8px 0;color:#6b7280;font-family:monospace;">#${submissionId}</td>
      </tr>
    </table>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:16px 0 8px;">Message Content</h2>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;white-space:pre-wrap;font-size:14px;color:#1f2937;line-height:1.6;">${escapeHtml(cleanMessage)}</div>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">
      This notification is for administrative purposes only. Click Reply to answer ${escapeHtml(cleanName)} directly.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
    Global Herbs Inc. &bull; Dispensary Care &bull; <a href="https://globalherbs.site" style="color:#059669;text-decoration:none;">globalherbs.site</a>
  </div>
</div>
`;

  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    const configError = 'GOOGLE_APPS_SCRIPT_URL environment variable is not configured on the server.';
    return {
      success: false,
      orderNumber: submissionId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      unconfigured: true,
      error: configError,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: configError,
      notificationAttempts: 0,
    };
  }

  const payload: CleanAppsScriptPayload = {
    orderNumber: submissionId,
    orderId: submissionId,
    orderDate: `${dateStr} at ${timeStr}`,
    status: 'NEW CONTACT MESSAGE',
    subject,
    recipient: adminEmail,
    to: adminEmail,
    adminEmail,
    email: adminEmail,
    emailFrom: getSenderEmail(),
    currency: 'USD',
    paymentMethod: 'Contact Form Submission',
    paymentStatus: 'Action Required',
    transactionId: submissionId,
    customer: {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || 'Not provided',
    },
    items: [
      {
        name: `Contact: ${cleanSubject}`,
        variant: cleanName,
        quantity: 1,
        price: '0.00',
        subtotal: '0.00',
      },
    ],
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '0.00',
      currency: 'USD',
    },
    shipping: {
      address: 'Contact Message',
      city: '',
      state: '',
      postalCode: '',
      country: 'Online Form',
    },
    notes: plainText,
    text: plainText,
    html,
  };

  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, payload, 3);
  if (!dispatchResult.ok) {
    console.error(`[Contact Notification Failed] ${submissionId}: ${dispatchResult.error}`);
    return {
      success: false,
      orderNumber: submissionId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      error: dispatchResult.error,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts,
    };
  }

  const sentAt = new Date().toISOString();
  markOrderProcessed(submissionId, true, dispatchResult.messageId, sentAt);
  console.log(`[Contact Notification Sent] ${submissionId} -> ${adminEmail} (msgId: ${dispatchResult.messageId})`);

  return {
    success: true,
    orderNumber: submissionId,
    recipient: adminEmail,
    replyTo: cleanEmail,
    error: null,
    notificationStatus: 'sent',
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts,
  };
}

export interface ProductEnquiryInput {
  id?: string;
  productName?: string;
  productReference?: string;
  productId?: string | number;
  productSku?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  submissionDate?: string;
}

/**
 * Sends a distinct NEW PRODUCT ENQUIRY email to globalherbsinc@gmail.com
 */
export async function sendProductEnquiryNotification(
  input: ProductEnquiryInput
): Promise<OrderNotificationResult> {
  const cleanProductRef = (input.productReference || input.productName || 'Dispensary Product').trim();
  const cleanName = (input.name || 'Valued Prospect').trim();
  const cleanEmail = sanitizeEmailAddress(input.email) || 'inquiry@globalherbs.site';
  const cleanPhone = (input.phone || '').trim();
  const cleanMessage = (input.message || '').trim();
  const enquiryId =
    input.id ||
    `ENQ-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

  const now = input.submissionDate ? new Date(input.submissionDate) : new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const adminEmail = getAdminRecipientEmail();
  const subject = `NEW PRODUCT ENQUIRY – GLOBAL HERBS: ${cleanProductRef}`;

  const plainText = [
    '==================================================',
    'GLOBAL HERBS — NEW PRODUCT ENQUIRY',
    '==================================================',
    '',
    'A new product enquiry has been submitted on Global Herbs.',
    '',
    'Product & Customer Details:',
    `- Product Name / Ref: ${cleanProductRef}`,
    `- Customer Name:      ${cleanName}`,
    `- Email Address:      ${cleanEmail}`,
    `- Phone Number:       ${cleanPhone || 'Not provided'}`,
    `- Submission Date:    ${dateStr}`,
    `- Submission Time:    ${timeStr}`,
    `- Enquiry ID:         ${enquiryId}`,
    '',
    'Enquiry Message:',
    '--------------------------------------------------',
    cleanMessage || '(No message provided)',
    '--------------------------------------------------',
    '',
    'Website: https://globalherbs.site',
    'This notification is for administrative purposes only.',
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="background:#064e3b;padding:24px 28px;color:#ffffff;">
    <h1 style="margin:0;font-size:22px;letter-spacing:-0.02em;">Global Herbs Inc.</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Product Desk &bull; Customer Enquiry</p>
  </div>
  <div style="padding:26px 28px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <span style="display:inline-block;color:#166534;font-weight:700;font-size:15px;letter-spacing:0.02em;">
        NEW PRODUCT ENQUIRY
      </span>
      <p style="margin:6px 0 0;font-size:14px;color:#1f2937;">
        Target Product: <strong>${escapeHtml(cleanProductRef)}</strong>
      </p>
    </div>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 12px;">Enquiry Details</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:150px;border-bottom:1px solid #f3f4f6;">Product:</td>
        <td style="padding:8px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(cleanProductRef)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Customer Name:</td>
        <td style="padding:8px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(cleanName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Email Address:</td>
        <td style="padding:8px 0;font-weight:600;color:#059669;border-bottom:1px solid #f3f4f6;">
          <a href="mailto:${escapeHtml(cleanEmail)}" style="color:#059669;text-decoration:none;">${escapeHtml(cleanEmail)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Phone Number:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(cleanPhone || 'Not provided')}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Submission Date:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Submission Time:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${timeStr}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Enquiry ID:</td>
        <td style="padding:8px 0;color:#6b7280;font-family:monospace;">#${enquiryId}</td>
      </tr>
    </table>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:16px 0 8px;">Enquiry Message</h2>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;white-space:pre-wrap;font-size:14px;color:#1f2937;line-height:1.6;">${escapeHtml(cleanMessage)}</div>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">
      This notification is for administrative purposes only. Click Reply to answer ${escapeHtml(cleanName)} directly.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
    Global Herbs Inc. &bull; Dispensary Care &bull; <a href="https://globalherbs.site" style="color:#059669;text-decoration:none;">globalherbs.site</a>
  </div>
</div>
`;

  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    const configError = 'GOOGLE_APPS_SCRIPT_URL environment variable is not configured on the server.';
    return {
      success: false,
      orderNumber: enquiryId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      unconfigured: true,
      error: configError,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: configError,
      notificationAttempts: 0,
    };
  }

  const payload: CleanAppsScriptPayload = {
    orderNumber: enquiryId,
    orderId: enquiryId,
    orderDate: `${dateStr} at ${timeStr}`,
    status: 'NEW PRODUCT ENQUIRY',
    subject,
    recipient: adminEmail,
    to: adminEmail,
    adminEmail,
    email: adminEmail,
    emailFrom: getSenderEmail(),
    currency: 'USD',
    paymentMethod: 'Product Enquiry',
    paymentStatus: 'Action Required',
    transactionId: enquiryId,
    customer: {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || 'Not provided',
    },
    items: [
      {
        name: `Enquiry: ${cleanProductRef}`,
        variant: cleanName,
        quantity: 1,
        price: '0.00',
        subtotal: '0.00',
      },
    ],
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '0.00',
      currency: 'USD',
    },
    shipping: {
      address: 'Product Enquiry',
      city: '',
      state: '',
      postalCode: '',
      country: 'Online Form',
    },
    notes: plainText,
    text: plainText,
    html,
  };

  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, payload, 3);
  if (!dispatchResult.ok) {
    console.error(`[Product Enquiry Failed] ${enquiryId}: ${dispatchResult.error}`);
    return {
      success: false,
      orderNumber: enquiryId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      error: dispatchResult.error,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts,
    };
  }

  const sentAt = new Date().toISOString();
  markOrderProcessed(enquiryId, true, dispatchResult.messageId, sentAt);
  console.log(`[Product Enquiry Sent] ${enquiryId} -> ${adminEmail} (msgId: ${dispatchResult.messageId})`);

  return {
    success: true,
    orderNumber: enquiryId,
    recipient: adminEmail,
    replyTo: cleanEmail,
    error: null,
    notificationStatus: 'sent',
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts,
  };
}

export interface NewsletterSubscriptionInput {
  id?: string;
  email: string;
  name?: string;
  subject?: string;
  subscriptionDate?: string;
  couponCode?: string;
  discountCode?: string;
}

/**
 * Sends a distinct NEW NEWSLETTER SUBSCRIPTION email to globalherbsinc@gmail.com
 */
export async function sendNewsletterSubscriptionNotification(
  input: NewsletterSubscriptionInput
): Promise<OrderNotificationResult> {
  const cleanEmail = sanitizeEmailAddress(input.email) || 'subscriber@globalherbs.site';
  const coupon = (input.discountCode || input.couponCode || 'HERBS15OFF').trim();
  const subId = `SUB-VIP-${Date.now().toString(36).toUpperCase()}`;

  const now = input.subscriptionDate ? new Date(input.subscriptionDate) : new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const adminEmail = getAdminRecipientEmail();
  const subject = `NEW NEWSLETTER SUBSCRIPTION – GLOBAL HERBS: ${cleanEmail}`;

  const plainText = [
    '==================================================',
    'GLOBAL HERBS — NEW NEWSLETTER SUBSCRIPTION',
    '==================================================',
    '',
    'A new customer has subscribed to the Global Herbs newsletter.',
    '',
    'Subscriber Details:',
    `- Email Address:      ${cleanEmail}`,
    `- Subscription Date:  ${dateStr}`,
    `- Subscription Time:  ${timeStr}`,
    `- Coupon Code Issued: ${coupon}`,
    `- Subscription ID:    ${subId}`,
    '',
    'Website: https://globalherbs.site',
    'This notification is for administrative purposes only.',
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="background:#064e3b;padding:24px 28px;color:#ffffff;">
    <h1 style="margin:0;font-size:22px;letter-spacing:-0.02em;">Global Herbs Inc.</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Audience &bull; VIP Newsletter Subscription</p>
  </div>
  <div style="padding:26px 28px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <span style="display:inline-block;color:#166534;font-weight:700;font-size:15px;letter-spacing:0.02em;">
        NEW NEWSLETTER SUBSCRIPTION
      </span>
      <p style="margin:6px 0 0;font-size:14px;color:#1f2937;">
        New subscriber: <strong style="color:#059669;">${escapeHtml(cleanEmail)}</strong>
      </p>
    </div>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 12px;">Subscriber Details</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:160px;border-bottom:1px solid #f3f4f6;">Email Address:</td>
        <td style="padding:8px 0;font-weight:600;color:#059669;border-bottom:1px solid #f3f4f6;">
          <a href="mailto:${escapeHtml(cleanEmail)}" style="color:#059669;text-decoration:none;">${escapeHtml(cleanEmail)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Subscription Date:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Subscription Time:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${timeStr}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Coupon Issued:</td>
        <td style="padding:8px 0;color:#111827;font-weight:700;border-bottom:1px solid #f3f4f6;">${escapeHtml(coupon)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Subscription ID:</td>
        <td style="padding:8px 0;color:#6b7280;font-family:monospace;">#${subId}</td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">
      This notification is for administrative purposes only.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
    Global Herbs Inc. &bull; Dispensary Care &bull; <a href="https://globalherbs.site" style="color:#059669;text-decoration:none;">globalherbs.site</a>
  </div>
</div>
`;

  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    const configError = 'GOOGLE_APPS_SCRIPT_URL environment variable is not configured on the server.';
    return {
      success: false,
      orderNumber: subId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      unconfigured: true,
      error: configError,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: configError,
      notificationAttempts: 0,
    };
  }

  const payload: CleanAppsScriptPayload = {
    orderNumber: subId,
    orderId: subId,
    orderDate: `${dateStr} at ${timeStr}`,
    status: 'NEW NEWSLETTER SUBSCRIPTION',
    subject,
    recipient: adminEmail,
    to: adminEmail,
    adminEmail,
    email: adminEmail,
    emailFrom: getSenderEmail(),
    currency: 'USD',
    paymentMethod: 'Newsletter Subscription',
    paymentStatus: 'Subscribed',
    transactionId: subId,
    customer: {
      name: 'Newsletter Subscriber',
      email: cleanEmail,
      phone: 'Not provided',
    },
    items: [
      {
        name: 'Newsletter Subscription: ' + cleanEmail,
        variant: coupon,
        quantity: 1,
        price: '0.00',
        subtotal: '0.00',
      },
    ],
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '0.00',
      currency: 'USD',
    },
    shipping: {
      address: 'Newsletter Subscriber',
      city: '',
      state: '',
      postalCode: '',
      country: 'Online Form',
    },
    notes: plainText,
    text: plainText,
    html,
  };

  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, payload, 3);
  if (!dispatchResult.ok) {
    console.error(`[Newsletter Notification Failed] ${subId}: ${dispatchResult.error}`);
    return {
      success: false,
      orderNumber: subId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      error: dispatchResult.error,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts,
    };
  }

  const sentAt = new Date().toISOString();
  markOrderProcessed(subId, true, dispatchResult.messageId, sentAt);
  console.log(`[Newsletter Notification Sent] ${subId} -> ${adminEmail} (msgId: ${dispatchResult.messageId})`);

  return {
    success: true,
    orderNumber: subId,
    recipient: adminEmail,
    replyTo: cleanEmail,
    error: null,
    notificationStatus: 'sent',
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts,
  };
}

export interface CustomerRegistrationInput {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  accountType?: string;
  accountStatus?: string;
  status?: string;
  customerId?: string;
  createdAt?: string;
}

/**
 * Sends a distinct NEW CUSTOMER REGISTRATION email to globalherbsinc@gmail.com
 * Formatted exactly per user specifications:
 *
 * Subject: NEW CUSTOMER REGISTRATION – GLOBAL HERBS
 * Body:
 * A new customer has successfully registered on Global Herbs.
 * Customer Details:
 * - Full Name: [Customer Name]
 * - Email Address: [Customer Email]
 * - Registration Date: [Date]
 * - Registration Time: [Time]
 * - Account Status: [Status]
 * Website: https://globalherbs.site
 * This notification is for administrative purposes only.
 */
export async function sendCustomerRegistrationNotification(
  input: CustomerRegistrationInput
): Promise<OrderNotificationResult> {
  const cleanName = (input.name || 'Valued Customer').trim();
  const cleanEmail = sanitizeEmailAddress(input.email) || 'customer@globalherbs.site';
  const cleanStatus = (input.accountStatus || input.status || 'Active / Verified').trim();
  const now = input.createdAt ? new Date(input.createdAt) : new Date();

  const regDate = now.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const regTime = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const adminEmail = getAdminRecipientEmail();
  const subject = 'NEW CUSTOMER REGISTRATION – GLOBAL HERBS';

  const plainText = [
    'A new customer has successfully registered on Global Herbs.',
    '',
    'Customer Details:',
    '',
    `- Full Name: ${cleanName}`,
    `- Email Address: ${cleanEmail}`,
    `- Registration Date: ${regDate}`,
    `- Registration Time: ${regTime}`,
    `- Account Status: ${cleanStatus}`,
    '',
    'Website: https://globalherbs.site',
    '',
    'This notification is for administrative purposes only.',
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="background:#064e3b;padding:24px 28px;color:#ffffff;">
    <h1 style="margin:0;font-size:22px;letter-spacing:-0.02em;">Global Herbs Inc.</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Customer Account System &bull; Registration Notification</p>
  </div>
  <div style="padding:26px 28px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <span style="display:inline-block;color:#166534;font-weight:700;font-size:15px;letter-spacing:0.02em;">
        NEW CUSTOMER REGISTRATION
      </span>
      <p style="margin:6px 0 0;font-size:14px;color:#1f2937;">
        A new customer has successfully registered on Global Herbs.
      </p>
    </div>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 12px;">Customer Details</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:150px;border-bottom:1px solid #f3f4f6;">Full Name:</td>
        <td style="padding:8px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(cleanName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Email Address:</td>
        <td style="padding:8px 0;font-weight:600;color:#059669;border-bottom:1px solid #f3f4f6;">
          <a href="mailto:${escapeHtml(cleanEmail)}" style="color:#059669;text-decoration:none;">${escapeHtml(cleanEmail)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Registration Date:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${regDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Registration Time:</td>
        <td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${regTime}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Account Status:</td>
        <td style="padding:8px 0;color:#111827;font-weight:600;">${escapeHtml(cleanStatus)}</td>
      </tr>
    </table>

    <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #e5e7eb;font-size:13px;color:#4b5563;margin-bottom:16px;">
      <strong>Website:</strong> <a href="https://globalherbs.site" style="color:#059669;text-decoration:underline;">https://globalherbs.site</a>
    </div>

    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">
      This notification is for administrative purposes only.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
    Global Herbs Inc. &bull; Administrative Systems &bull; <a href="https://globalherbs.site" style="color:#059669;text-decoration:none;">globalherbs.site</a>
  </div>
</div>
`;

  // Idempotency check: prevent duplicate registration emails for the same email within 24 hours
  const regId = `REG-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (isOrderAlreadyProcessed(regId)) {
    const existing = getProcessedOrderRecord(regId);
    return {
      success: true,
      orderNumber: regId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      duplicateSuppressed: true,
      notificationStatus: 'sent',
      notificationMessageId: existing?.messageId || `dup-${regId}`,
      notificationSentAt: existing?.sentAt || new Date().toISOString(),
      notificationError: null,
      notificationAttempts: 1,
    };
  }

  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    const configError = 'GOOGLE_APPS_SCRIPT_URL environment variable is not configured on the server.';
    return {
      success: false,
      orderNumber: regId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      unconfigured: true,
      error: configError,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: configError,
      notificationAttempts: 0,
    };
  }

  const payload: CleanAppsScriptPayload = {
    orderNumber: regId,
    orderId: regId,
    orderDate: `${regDate} at ${regTime}`,
    status: 'NEW CUSTOMER REGISTRATION',
    subject,
    recipient: adminEmail,
    to: adminEmail,
    adminEmail,
    email: adminEmail,
    emailFrom: getSenderEmail(),
    currency: 'USD',
    paymentMethod: 'Customer Registration',
    paymentStatus: cleanStatus,
    transactionId: regId,
    customer: {
      name: cleanName,
      email: cleanEmail,
      phone: input.phone || 'Not provided',
    },
    items: [
      {
        name: 'Customer Registration: ' + cleanName,
        variant: cleanStatus,
        quantity: 1,
        price: '0.00',
        subtotal: '0.00',
      },
    ],
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '0.00',
      currency: 'USD',
    },
    shipping: {
      address: 'Online Registration',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    },
    notes: plainText,
    text: plainText,
    html,
  };

  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, payload, 3);
  if (!dispatchResult.ok) {
    console.error(`[Registration Notification Failed] ${cleanEmail}: ${dispatchResult.error}`);
    return {
      success: false,
      orderNumber: regId,
      recipient: adminEmail,
      replyTo: cleanEmail,
      error: dispatchResult.error,
      notificationStatus: 'failed',
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts,
    };
  }

  const sentAt = new Date().toISOString();
  markOrderProcessed(regId, true, dispatchResult.messageId, sentAt);
  console.log(`[Registration Notification Sent] ${cleanEmail} -> ${adminEmail} (msgId: ${dispatchResult.messageId})`);

  return {
    success: true,
    orderNumber: regId,
    recipient: adminEmail,
    replyTo: cleanEmail,
    error: null,
    notificationStatus: 'sent',
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts,
  };
}

export interface CustomerInquiryInput {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  type?: string;
  productReference?: string;
  orderReference?: string;
  recipient?: string;
  metadata?: Record<string, any>;
}

/**
 * Universal dispatcher for backward compatibility that properly categorizes forms.
 */
export async function sendCustomerInquiryNotification(
  inquiry: CustomerInquiryInput
): Promise<OrderNotificationResult> {
  const typeLower = (inquiry.type || '').toLowerCase();

  if (typeLower.includes('newsletter') || typeLower.includes('vip')) {
    return sendNewsletterSubscriptionNotification({
      email: inquiry.email,
    });
  }

  if (typeLower.includes('registration') || typeLower.includes('member') || typeLower.includes('signup')) {
    return sendCustomerRegistrationNotification({
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      accountType: inquiry.type,
    });
  }

  if (typeLower.includes('sample') || typeLower.includes('product') || inquiry.productReference) {
    return sendProductEnquiryNotification({
      id: inquiry.id,
      productName: inquiry.productReference || inquiry.subject || 'Dispensary Product',
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      message: inquiry.message,
    });
  }

  return sendContactMessageNotification({
    id: inquiry.id,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    subject: inquiry.subject,
    message: inquiry.message,
  });
}

export default sendOrderNotification;
