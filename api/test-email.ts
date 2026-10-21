import type { IncomingMessage, ServerResponse } from 'http';
import { sendOrderNotification, getAdminRecipientEmail, getAppsScriptUrl } from '../lib/email/orderNotification';

function parseRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const body = req.method === 'POST' ? (req.body || (await parseRequestBody(req))) : {};
  const targetEmail = body.email || getAdminRecipientEmail();
  const testOrderId = `GH-TEST-${Math.floor(100000 + Math.random() * 900000)}`;

  const testPayload = {
    orderNumber: testOrderId,
    orderId: testOrderId,
    recipient: targetEmail,
    to: targetEmail,
    recipientEmail: targetEmail,
    adminEmail: targetEmail,
    email: targetEmail,
    targetEmail,
    customerName: 'Global Herbs Verification Desk',
    customerEmail: targetEmail,
    customerPhone: '+1 (213) 280-1161',
    customer: {
      name: 'Global Herbs Verification Desk',
      email: targetEmail,
      phone: '+1 (213) 280-1161',
    },
    items: [
      {
        name: 'Organic Blue Dream (3.5g)',
        variant: '3.5g Pre-Packaged Flower',
        quantity: 1,
        price: 45.0,
        subtotal: 45.0,
      },
    ],
    totals: {
      subtotal: 45.0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 45.0,
      currency: 'USD',
    },
    total: 45.0,
    shipping: {
      name: 'Global Herbs Inc.',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      postalCode: '97477',
      country: 'United States',
    },
    paymentMethod: 'Verification Diagnostic Test',
    paymentStatus: 'Test Flow Completed',
    notes: `Diagnostic test order notification dispatched to verify deliverability to ${targetEmail}.`,
    forceRetry: true,
  };

  const notifResult = await sendOrderNotification(testPayload);

  res.statusCode = notifResult.success ? 200 : 502;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      success: notifResult.success,
      orderId: testOrderId,
      targetEmail,
      provider: 'google_apps_script',
      scriptConfigured: Boolean(getAppsScriptUrl()),
      notificationResult: notifResult,
      timestamp: new Date().toISOString(),
    })
  );
}
