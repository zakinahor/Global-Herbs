/**
 * Google Apps Script Order Notification Service
 *
 * Unified wrapper around the canonical `lib/email/orderNotification.ts` service
 * so all server modules share the same idempotency cache, retry logic, and
 * notification status tracking.
 */

import {
  sendOrderNotification,
  sanitizeEmailAddress,
  isOrderAlreadyProcessed,
  markOrderProcessed,
  getAppsScriptUrl,
  getAdminRecipientEmail,
  getSenderEmail,
  NotificationStatus,
} from '../../lib/email/orderNotification';

export interface AppsScriptOrderPayload {
  orderNumber: string;
  orderDate: string;
  status: string;
  subject?: string;
  currency?: string;
  paymentMethod: string;
  paymentStatus?: string;
  transactionId?: string;
  couponCode?: string;
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
    currency?: string;
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
  notificationStatus: NotificationStatus;
  notificationMessageId: string | null;
  notificationSentAt: string | null;
  notificationError: string | null;
  notificationAttempts: number;
}

export function hasOrderBeenNotified(orderNumber: string): boolean {
  return isOrderAlreadyProcessed(orderNumber);
}

export function markOrderAsNotified(orderNumber: string, success: boolean = true): void {
  markOrderProcessed(orderNumber, success);
}

export function sanitizeAndValidateEmail(email?: string | null): string | null {
  return sanitizeEmailAddress(email);
}

export function getNotificationConfig() {
  const appsScriptUrl = getAppsScriptUrl();
  const adminEmail = getAdminRecipientEmail();
  const emailFrom = getSenderEmail();
  return {
    appsScriptUrl,
    adminEmail,
    emailFrom,
    isConfigured: Boolean(appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')),
  };
}

export async function sendAppsScriptOrderNotification(
  payload: AppsScriptOrderPayload
): Promise<NotificationDispatchResult> {
  const config = getNotificationConfig();
  const result = await sendOrderNotification(payload);
  return {
    success: result.success,
    orderNumber: result.orderNumber,
    recipient: result.recipient,
    replyTo: result.replyTo,
    endpoint: config.appsScriptUrl || undefined,
    duplicateSuppressed: result.duplicateSuppressed,
    unconfigured: result.unconfigured,
    error: result.error,
    notificationStatus: result.notificationStatus,
    notificationMessageId: result.notificationMessageId,
    notificationSentAt: result.notificationSentAt,
    notificationError: result.notificationError,
    notificationAttempts: result.notificationAttempts,
  };
}
