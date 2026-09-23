/**
 * Order Notification Service Adapter
 * Powered exclusively by Google Apps Script (MailApp).
 *
 * Direct Flow:
 * Website Order Saved -> Google Apps Script Web App -> Admin Gmail Inbox (globalherbsinc@gmail.com)
 * Admin taps "Reply" -> Customer receives direct reply
 *
 * No third-party email providers (MailerSend, Resend, SMTP, SendGrid, etc.).
 */

import {
  sendAppsScriptOrderNotification,
  AppsScriptOrderPayload,
  sanitizeAndValidateEmail,
  hasOrderBeenNotified,
  markOrderAsNotified,
  getNotificationConfig,
} from '../orderNotificationService';

export interface OrderItem {
  id?: string | number;
  productId?: string | number;
  name: string;
  variant?: string;
  weight?: string;
  size?: string;
  quantity: number;
  price: number;
  total?: number;
  image?: string;
}

export interface ShippingAddressData {
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface AdminOrderNotificationData {
  orderId: string;
  orderDate?: string;
  orderStatus?: string;
  paymentMethod?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  shippingCost: number;
  tax?: number;
  orderTotal: number;
  shippingAddress: string | ShippingAddressData;
  billingAddress?: string | ShippingAddressData;
  orderNotes?: string;
}

export interface EmailSendResult {
  success: boolean;
  orderId: string;
  provider: string;
  recipient: string;
  replyTo?: string | null;
  error?: string | null;
  duplicateSuppressed?: boolean;
  simulated?: boolean;
}

export {
  sanitizeAndValidateEmail,
  hasOrderBeenNotified,
  markOrderAsNotified,
  getNotificationConfig,
};

/**
 * Format shipping address into structured parts for the payload
 */
export function parseShippingAddress(addr: string | ShippingAddressData | undefined): {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
} {
  if (!addr) {
    return { address: 'Not provided', city: '', state: '', postalCode: '', country: 'United States' };
  }

  if (typeof addr === 'object' && addr !== null) {
    const street = [addr.address || addr.street1, addr.street2].filter(Boolean).join(', ');
    return {
      address: street || addr.name || 'Not provided',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || addr.zipCode || (addr as any).zip || '',
      country: addr.country || 'United States',
    };
  }

  const str = String(addr).trim();
  const lines = str.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  if (lines.length >= 3) {
    const street = lines[0];
    const cityStateZip = lines.slice(1).join(', ');
    return {
      address: street,
      city: lines[1] || '',
      state: lines[2] || '',
      postalCode: lines[3] || '',
      country: 'United States',
    };
  }

  return {
    address: str,
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  };
}

/**
 * Convert internal order structure into Google Apps Script JSON payload
 */
export function buildAppsScriptOrderPayload(data: AdminOrderNotificationData): AppsScriptOrderPayload {
  const shippingParsed = parseShippingAddress(data.shippingAddress);

  return {
    orderNumber: data.orderId,
    orderDate: data.orderDate || new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    status: data.orderStatus || 'New Order',
    customer: {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone || '',
    },
    items: data.items.map(item => {
      const unitPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0;
      const total = item.total !== undefined ? item.total : (unitPrice * item.quantity);
      return {
        name: item.name,
        variant: item.variant || item.weight || item.size || '',
        quantity: item.quantity,
        price: unitPrice.toFixed(2),
        subtotal: total.toFixed(2),
      };
    }),
    totals: {
      subtotal: Number(data.subtotal || 0).toFixed(2),
      discount: Number(data.discount || 0).toFixed(2),
      shipping: Number(data.shippingCost || 0).toFixed(2),
      tax: Number(data.tax || 0).toFixed(2),
      total: Number(data.orderTotal || 0).toFixed(2),
    },
    shipping: {
      address: shippingParsed.address,
      city: shippingParsed.city,
      state: shippingParsed.state,
      postalCode: shippingParsed.postalCode,
      country: shippingParsed.country,
    },
    paymentMethod: data.paymentMethod || 'Dispensary Direct',
    notes: data.orderNotes || '',
  };
}

/**
 * Primary Server Function: Send Admin Order Notification via Google Apps Script
 */
export async function sendAdminOrderNotification(
  data: AdminOrderNotificationData
): Promise<EmailSendResult> {
  const payload = buildAppsScriptOrderPayload(data);
  const result = await sendAppsScriptOrderNotification(payload);

  return {
    success: result.success,
    orderId: data.orderId,
    provider: 'google_apps_script',
    recipient: result.recipient,
    replyTo: result.replyTo,
    duplicateSuppressed: result.duplicateSuppressed || false,
    simulated: result.unconfigured || false,
    error: result.error || null,
  };
}
