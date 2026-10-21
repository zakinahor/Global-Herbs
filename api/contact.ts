import type { IncomingMessage, ServerResponse } from 'http';
import { sendCustomerInquiryNotification } from '../lib/email/orderNotification';

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

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
    return;
  }

  const body = req.body || (await parseRequestBody(req));
  const { name, email, subject, message, phone, productReference, orderReference } = body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'A valid email address is required.' }));
    return;
  }

  const cleanName = (name || '').trim() || 'Valued Client';
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const cleanSubject = (subject || 'Customer Inquiry').trim();
  const cleanMessage = (message || '').trim();

  if (!cleanMessage) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Please enter a message.' }));
    return;
  }

  const submissionId = `CNT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      success: true,
      submissionId,
      message: `Thank you, ${cleanName}! Your inquiry has been dispatched to globalherbsinc@gmail.com. We will reply shortly.`,
      notification: notificationResult,
    })
  );
}
