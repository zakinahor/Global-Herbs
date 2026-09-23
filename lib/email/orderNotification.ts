/**
 * lib/email/orderNotification.ts
 *
 * Implements the sendOrderNotification function to dispatch transactional order alerts
 * to the Google Apps Script Web App endpoint.
 *
 * Flow:
 * 1. Customer completes order checkout.
 * 2. Order details are formatted into a clean, standardized JSON payload.
 * 3. Payload is sent to GOOGLE_APPS_SCRIPT_URL via POST.
 * 4. Google Apps Script dispatches an email to globalherbsinc@gmail.com with customer Reply-To.
 * 5. Network errors and unconfigured URLs are handled gracefully so the checkout flow is NEVER blocked.
 */

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
}

export interface OrderItemInput {
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
}

export interface OrderShippingInput {
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  zipCode?: string;
  zip?: string;
  country?: string;
}

export interface OrderNotificationInput {
  orderNumber?: string;
  orderId?: string;
  orderDate?: string;
  status?: string;
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
  shippingCost?: number | string;
  orderTotal?: number | string;
  shipping?: OrderShippingInput | string;
  shippingAddress?: OrderShippingInput | string;
  shippingDetails?: OrderShippingInput;
  paymentMethod?: string;
  notes?: string;
  orderNotes?: string;
  recipient?: string;
  adminEmail?: string;
}

export interface CleanAppsScriptPayload {
  orderNumber: string;
  orderDate: string;
  status: string;
  recipient?: string;
  adminEmail?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
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
  };
  shipping: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  notes: string;
}

export interface OrderNotificationResult {
  success: boolean;
  orderNumber: string;
  recipient: string;
  replyTo?: string | null;
  unconfigured?: boolean;
  duplicateSuppressed?: boolean;
  error?: string | null;
}

// In-memory idempotency cache (24-hour retention) to prevent duplicate notifications
const processedOrders = new Map<string, { timestamp: number; success: boolean }>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function isOrderAlreadyProcessed(orderNumber: string): boolean {
  if (!orderNumber) return false;
  const entry = processedOrders.get(orderNumber);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > IDEMPOTENCY_TTL_MS) {
    processedOrders.delete(orderNumber);
    return false;
  }
  return entry.success;
}

function markOrderProcessed(orderNumber: string, success: boolean): void {
  if (!orderNumber) return;
  processedOrders.set(orderNumber, { timestamp: Date.now(), success });
}

/**
 * Parses and cleans shipping address input into individual structured fields.
 */
function parseShipping(input?: OrderShippingInput | string): {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
    return {
      address: input.address || input.street || 'Not provided',
      city: input.city || '',
      state: input.state || '',
      postalCode: input.postalCode || input.zipCode || input.zip || '',
      country: input.country || 'United States',
    };
  }

  if (typeof input === 'string') {
    const lines = input.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length >= 3) {
      return {
        address: lines[0],
        city: lines[1] || '',
        state: lines[2] || '',
        postalCode: lines[3] || '',
        country: 'United States',
      };
    }
    return {
      address: input.trim(),
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
function formatCurrency(val?: number | string): string {
  if (val === undefined || val === null || val === '') return '0.00';
  if (typeof val === 'number') {
    return isNaN(val) ? '0.00' : val.toFixed(2);
  }
  const clean = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? '0.00' : parsed.toFixed(2);
}

/**
 * Formats a flexible order input into a clean, strict JSON payload matching
 * the Google Apps Script endpoint contract.
 */
export function formatOrderPayload(order: OrderNotificationInput): CleanAppsScriptPayload {
  const orderNumber = (order.orderNumber || order.orderId || `GH-${Date.now()}`).trim();
  const orderDate = order.orderDate || new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const status = order.status || 'New Order';

  const customerName = (order.customer?.name || order.customerName || 'Valued Client').trim();
  const customerEmail = (order.customer?.email || order.customerEmail || '').trim().toLowerCase();
  const customerPhone = (order.customer?.phone || order.customerPhone || '').trim();

  const rawItems = order.items || order.cartItems || [];
  const items = rawItems.map((item, idx) => {
    const name = item.name || `Dispensary Item #${idx + 1}`;
    const variant = item.variant || item.weight || item.size || '';
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const priceStr = formatCurrency(item.price);
    const subtotalStr = item.subtotal || item.total
      ? formatCurrency(item.subtotal || item.total)
      : (parseFloat(priceStr) * quantity).toFixed(2);

    return {
      name,
      variant,
      quantity,
      price: priceStr,
      subtotal: subtotalStr,
    };
  });

  const subtotal = order.totals?.subtotal !== undefined
    ? formatCurrency(order.totals.subtotal)
    : order.subtotal !== undefined
    ? formatCurrency(order.subtotal)
    : items.reduce((acc, i) => acc + parseFloat(i.subtotal), 0).toFixed(2);

  const discount = order.totals?.discount !== undefined
    ? formatCurrency(order.totals.discount)
    : formatCurrency(order.discount || 0);

  const shipping = order.totals?.shipping !== undefined
    ? formatCurrency(order.totals.shipping)
    : formatCurrency(order.shippingCost || 0);

  const tax = order.totals?.tax !== undefined
    ? formatCurrency(order.totals.tax)
    : '0.00';

  const total = order.totals?.total !== undefined
    ? formatCurrency(order.totals.total)
    : order.orderTotal !== undefined
    ? formatCurrency(order.orderTotal)
    : Math.max(0, parseFloat(subtotal) - parseFloat(discount) + parseFloat(shipping)).toFixed(2);

  const shippingData = parseShipping(order.shippingDetails || order.shippingAddress || order.shipping);
  const paymentMethod = (order.paymentMethod || 'Dispensary Direct').trim();
  const notes = (order.notes || order.orderNotes || '').trim();

  return {
    orderNumber,
    orderDate,
    status,
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    items,
    totals: {
      subtotal,
      discount,
      shipping,
      tax,
      total,
    },
    shipping: shippingData,
    paymentMethod,
    notes,
    recipient: order.recipient || order.adminEmail,
    adminEmail: order.adminEmail || order.recipient,
  };
}

/**
 * Resolves the configured Google Apps Script Web App URL from environment variables.
 */
export function getAppsScriptUrl(): string | null {
  if (typeof process !== 'undefined' && process.env?.GOOGLE_APPS_SCRIPT_URL) {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL.trim();
    if (url.startsWith('http')) return url;
  }
  // Check client-side / Vite environment if available
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv?.VITE_GOOGLE_APPS_SCRIPT_URL) {
      const url = String(metaEnv.VITE_GOOGLE_APPS_SCRIPT_URL).trim();
      if (url.startsWith('http')) return url;
    }
  } catch {
    // Ignore context errors outside Vite client
  }
  return null;
}

/**
 * Resolves the administrator recipient email.
 */
export function getAdminRecipientEmail(): string {
  if (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) {
    const email = process.env.ADMIN_EMAIL.trim();
    if (email.includes('@')) return email;
  }
  return 'globalherbsinc@gmail.com';
}

/**
 * Sends an order notification to the Google Apps Script Web App endpoint.
 *
 * Guarantees:
 * - Formats order into clean JSON payload.
 * - Suppresses duplicate notifications (idempotency).
 * - Catches network timeouts, DNS failures, and HTTP errors gracefully.
 * - Never throws an error or blocks the checkout flow.
 */
export async function sendOrderNotification(
  orderInput: OrderNotificationInput
): Promise<OrderNotificationResult> {
  const adminEmail = orderInput.recipient || orderInput.adminEmail || getAdminRecipientEmail();
  const payload = formatOrderPayload(orderInput);
  const orderNumber = payload.orderNumber;
  const replyTo = payload.customer.email || null;

  // 1. Idempotency check: prevent duplicate notifications
  if (isOrderAlreadyProcessed(orderNumber)) {
    console.log(`[Order Notification] Duplicate notification suppressed for order #${orderNumber}`);
    return {
      success: true,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      duplicateSuppressed: true,
    };
  }

  // 2. Check if GOOGLE_APPS_SCRIPT_URL is configured
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    console.warn(
      `[Order Notification] GOOGLE_APPS_SCRIPT_URL is not configured. ` +
      `Order #${orderNumber} registered safely without external dispatch. ` +
      `Set GOOGLE_APPS_SCRIPT_URL in .env to enable email alerts.`
    );
    markOrderProcessed(orderNumber, true);
    return {
      success: true,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      unconfigured: true,
    };
  }

  // 3. Dispatch HTTP POST to Google Apps Script Web App
  try {
    // 25-second timeout for Google Apps Script cold starts and MailApp delivery
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    if (typeof timeoutId === 'object' && typeof (timeoutId as any).unref === 'function') {
      (timeoutId as any).unref();
    }

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    const responseText = await response.text().catch(() => '');

    if (!response.ok) {
      const errorMsg = `Google Apps Script returned HTTP ${response.status}: ${responseText.slice(0, 200)}`;
      console.error(`[Order Notification Failure] Order #${orderNumber}:`, errorMsg);
      return {
        success: false,
        orderNumber,
        recipient: adminEmail,
        replyTo,
        error: errorMsg,
      };
    }

    // Detect Google Drive "Page not found" or auth redirect HTML response
    if (
      responseText.includes('<title>Page not found</title>') ||
      responseText.includes('unable to open the file at present') ||
      responseText.includes('accounts.google.com/ServiceLogin')
    ) {
      const errorMsg =
        'Google Apps Script returned "Page not found" or requires Google login. ' +
        'Please verify that your Google Apps Script is deployed as a Web App with: ' +
        'Execute as: "Me" and Who has access: "Anyone".';
      console.error(`[Order Notification Notice] Order #${orderNumber}:`, errorMsg);
      return {
        success: false,
        orderNumber,
        recipient: adminEmail,
        replyTo,
        error: errorMsg,
      };
    }

    // Try parsing JSON response from Google Apps Script
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Non-JSON response is acceptable as long as HTTP status is OK and no error detected
    }

    if (responseData && responseData.success === false) {
      const errorMsg = responseData.error || 'Apps Script returned success: false';
      console.warn(`[Order Notification] Apps Script reported: ${errorMsg}`);
      return {
        success: false,
        orderNumber,
        recipient: adminEmail,
        replyTo,
        error: errorMsg,
      };
    }

    markOrderProcessed(orderNumber, true);
    console.log(`[Order Notification Dispatched] Order #${orderNumber} notification sent to ${adminEmail}`);

    return {
      success: true,
      orderNumber,
      recipient: adminEmail,
      replyTo,
    };
  } catch (err: any) {
    // Network errors (e.g. offline, DNS failure, timeout abort) are caught and handled gracefully
    const errorMsg = err?.name === 'AbortError'
      ? 'Request timed out after 12s while contacting Google Apps Script endpoint'
      : (err?.message || 'Network error communicating with Google Apps Script');

    console.error(`[Order Notification Network Notice] Order #${orderNumber}:`, errorMsg);

    // Return non-blocking failure result
    return {
      success: false,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      error: errorMsg,
    };
  }
}

export interface CustomerInquiryInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  type?: string; // 'Contact Form' | 'Account Inquiry' | 'Product Review' | 'Newsletter' | 'Custom Request'
  recipient?: string;
  metadata?: Record<string, any>;
}

/**
 * Sends a customer inquiry, contact form message, or support request to the admin email
 * via Google Apps Script (MailApp).
 * Sets customer email as the Reply-To so the admin can reply directly to the customer in Gmail.
 */
export async function sendCustomerInquiryNotification(
  inquiry: CustomerInquiryInput
): Promise<OrderNotificationResult> {
  const adminEmail = inquiry.recipient || getAdminRecipientEmail();
  const inquiryType = inquiry.type || 'Customer Contact Form';
  const cleanName = (inquiry.name || 'Valued Customer').trim();
  const cleanEmail = (inquiry.email || '').trim().toLowerCase();
  const cleanPhone = (inquiry.phone || '').trim();
  const cleanSubject = (inquiry.subject || 'Customer Inquiry').trim();
  const cleanMessage = (inquiry.message || '').trim();
  const inquiryId = `INQ-${Date.now().toString(36).toUpperCase()}`;

  const formattedNotes = [
    `CUSTOMER INQUIRY / CONTACT SUBMISSION`,
    `----------------------------------------`,
    `Inquiry Type: ${inquiryType}`,
    `Subject: ${cleanSubject}`,
    `Customer Name: ${cleanName}`,
    `Customer Email: ${cleanEmail}`,
    `Phone: ${cleanPhone || 'Not provided'}`,
    `Submitted At: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`,
    ``,
    `CUSTOMER MESSAGE:`,
    cleanMessage || '(No additional text provided)',
  ].join('\n');

  const payload: CleanAppsScriptPayload = {
    orderNumber: inquiryId,
    orderDate: new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: `${inquiryType}: ${cleanSubject}`,
    recipient: adminEmail,
    adminEmail,
    customer: {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
    },
    items: [],
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '0.00',
    },
    shipping: {
      address: 'Web Inquiry / Digital Submission',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    },
    paymentMethod: inquiryType,
    notes: formattedNotes,
  };

  console.log(`[Customer Inquiry Trigger] Routing ${inquiryType} from ${cleanEmail} to admin (${adminEmail})`);
  return sendOrderNotification(payload);
}

export default sendOrderNotification;
