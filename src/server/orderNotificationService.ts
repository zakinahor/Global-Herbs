/**
 * Google Apps Script Order Notification Service
 * 
 * Flow:
 * 1. Customer completes checkout.
 * 2. Website validates the order.
 * 3. Website creates/saves the order successfully.
 * 4. Website sends the structured order JSON payload to Google Apps Script Web App.
 * 5. Google Apps Script uses MailApp to dispatch an email to globalherbsinc@gmail.com with customer Reply-To.
 * 6. Admin receives notification in Gmail and replies directly to the customer.
 * 
 * Order Safety Guarantee:
 * - Order is saved BEFORE notification.
 * - Notification failure NEVER rolls back or cancels a valid order.
 * - Idempotency cache prevents duplicate notifications for the same orderNumber.
 */

export interface AppsScriptOrderPayload {
  orderNumber: string;
  orderDate: string;
  status: string;
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

export interface NotificationDispatchResult {
  success: boolean;
  orderNumber: string;
  recipient: string;
  replyTo?: string | null;
  endpoint?: string;
  duplicateSuppressed?: boolean;
  unconfigured?: boolean;
  error?: string | null;
}

// In-memory idempotency cache (24 hours) to prevent duplicate notifications
const notifiedOrders = new Map<string, { timestamp: number; success: boolean }>();
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasOrderBeenNotified(orderNumber: string): boolean {
  if (!orderNumber) return false;
  const existing = notifiedOrders.get(orderNumber);
  if (!existing) return false;
  if (Date.now() - existing.timestamp > IDEMPOTENCY_WINDOW_MS) {
    notifiedOrders.delete(orderNumber);
    return false;
  }
  return existing.success;
}

export function markOrderAsNotified(orderNumber: string, success: boolean = true): void {
  if (!orderNumber) return;
  notifiedOrders.set(orderNumber, { timestamp: Date.now(), success });
}

/**
 * Validate and sanitize email to RFC 5322 compliance.
 * Protects against CRLF header injection.
 */
export function sanitizeAndValidateEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return null;
  if (/[\r\n]/.test(clean)) return null;
  return clean;
}

/**
 * Get active configuration for Google Apps Script notifications.
 */
export function getNotificationConfig() {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'globalherbsinc@gmail.com';
  return {
    appsScriptUrl,
    adminEmail,
    isConfigured: Boolean(appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')),
  };
}

/**
 * Sends order details to Google Apps Script Web App.
 * Safe & resilient: will never throw exceptions or disrupt completed orders.
 */
export async function sendAppsScriptOrderNotification(
  payload: AppsScriptOrderPayload
): Promise<NotificationDispatchResult> {
  const { orderNumber, customer } = payload;
  const config = getNotificationConfig();
  const validReplyTo = sanitizeAndValidateEmail(customer?.email);

  // 1. Idempotency Check: Prevent duplicate notifications from page reloads or retries
  if (hasOrderBeenNotified(orderNumber)) {
    console.log(`[Google Apps Script] Notification for order #${orderNumber} already processed. Suppressing duplicate.`);
    return {
      success: true,
      orderNumber,
      recipient: config.adminEmail,
      replyTo: validReplyTo,
      duplicateSuppressed: true,
    };
  }

  // 2. Check if Google Apps Script URL is configured
  if (!config.appsScriptUrl) {
    console.warn(
      `[Google Apps Script] GOOGLE_APPS_SCRIPT_URL environment variable is not configured. Order #${orderNumber} is safely saved. Set GOOGLE_APPS_SCRIPT_URL in .env to dispatch notifications.`
    );
    markOrderAsNotified(orderNumber, true);
    return {
      success: true,
      orderNumber,
      recipient: config.adminEmail,
      replyTo: validReplyTo,
      unconfigured: true,
    };
  }

  // 3. Dispatch HTTP POST to Google Apps Script Web App
  try {
    console.log(`[Google Apps Script] Dispatching notification for order #${orderNumber} to: ${config.appsScriptUrl}`);

    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Crucial for Google Apps Script 302 redirects
      signal: AbortSignal.timeout(15000), // 15 second request timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      const failureNotice = `Google Apps Script returned HTTP ${response.status}: ${errorText.substring(0, 300)}`;
      console.error(`[Google Apps Script Error] ${failureNotice}`);
      return {
        success: false,
        orderNumber,
        recipient: config.adminEmail,
        replyTo: validReplyTo,
        endpoint: config.appsScriptUrl,
        error: failureNotice,
      };
    }

    let responseData: any = null;
    try {
      responseData = await response.json();
    } catch {
      // Non-JSON response text is fine if status was 200
    }

    markOrderAsNotified(orderNumber, true);
    console.log(`[Google Apps Script] Notification successfully received for order #${orderNumber}. Response:`, responseData || 'OK');

    return {
      success: true,
      orderNumber,
      recipient: config.adminEmail,
      replyTo: validReplyTo,
      endpoint: config.appsScriptUrl,
    };

  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[Google Apps Script Failure] Failed to send notification for order #${orderNumber}:`, errorMsg);

    // Return structured failure object so order remains intact
    return {
      success: false,
      orderNumber,
      recipient: config.adminEmail,
      replyTo: validReplyTo,
      endpoint: config.appsScriptUrl,
      error: errorMsg,
    };
  }
}
