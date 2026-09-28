/**
 * Order Notification Service Adapter
 * Powered by the canonical server-side notification engine (`lib/email/orderNotification.ts`).
 */

import {
  sendAppsScriptOrderNotification,
  AppsScriptOrderPayload,
  sanitizeAndValidateEmail,
  hasOrderBeenNotified,
  markOrderAsNotified,
  getNotificationConfig,
} from '../orderNotificationService';
import { parseAddressBlock } from '../../../lib/email/orderNotification';

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
  email?: string;
}

export interface AdminOrderNotificationData {
  orderId: string;
  orderDate?: string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  currency?: string;
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
  notificationStatus?: 'pending' | 'sent' | 'failed';
  notificationMessageId?: string | null;
  notificationSentAt?: string | null;
}

export {
  sanitizeAndValidateEmail,
  hasOrderBeenNotified,
  markOrderAsNotified,
  getNotificationConfig,
};

export function parseShippingAddress(addr: string | ShippingAddressData | undefined): {
  name?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
} {
  return parseAddressBlock(addr);
}

export function buildAppsScriptOrderPayload(data: AdminOrderNotificationData): AppsScriptOrderPayload {
  const shippingParsed = parseShippingAddress(data.shippingAddress);
  const billingParsed = data.billingAddress ? parseShippingAddress(data.billingAddress) : shippingParsed;

  return {
    orderNumber: data.orderId,
    orderDate: data.orderDate || new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    status: data.orderStatus || 'Received & Stealth Processing',
    currency: data.currency || 'USD',
    paymentMethod: data.paymentMethod || 'Dispensary Direct',
    paymentStatus: data.paymentStatus || 'Awaiting Payment Verification',
    transactionId: data.transactionId || `REF-${data.orderId}`,
    couponCode: data.couponCode,
    customer: {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone || '',
      company: data.companyName || undefined,
    },
    items: data.items.map(item => {
      const unitPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0;
      const total = item.total !== undefined ? item.total : (unitPrice * item.quantity);
      return {
        id: item.id || item.productId ? String(item.id || item.productId) : undefined,
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
      currency: data.currency || 'USD',
    },
    shipping: {
      name: shippingParsed.name || data.customerName,
      address: shippingParsed.address,
      city: shippingParsed.city,
      state: shippingParsed.state,
      postalCode: shippingParsed.postalCode,
      country: shippingParsed.country,
    },
    billing: {
      name: billingParsed.name || data.customerName,
      company: data.companyName,
      address: billingParsed.address,
      city: billingParsed.city,
      state: billingParsed.state,
      postalCode: billingParsed.postalCode,
      country: billingParsed.country,
      phone: data.customerPhone,
      email: data.customerEmail,
    },
    notes: data.orderNotes || '',
  };
}

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
    notificationStatus: result.notificationStatus,
    notificationMessageId: result.notificationMessageId,
    notificationSentAt: result.notificationSentAt,
  };
}
