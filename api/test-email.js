// api/test-email.js
// Self-contained diagnostic test endpoint for Google Apps Script email notifications

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'globalherbsinc@gmail.com';

  let body = {};
  if (req.method === 'POST') {
    if (typeof req.body === 'object' && req.body !== null) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {}
    }
  }

  const targetEmail = body.email || adminEmail;
  const testOrderId = `GH-TEST-${Math.floor(100000 + Math.random() * 900000)}`;

  if (!scriptUrl) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: 'GOOGLE_APPS_SCRIPT_URL is not configured in environment variables.',
        configured: false,
        adminEmail,
        targetEmail,
        orderId: testOrderId,
      })
    );
    return;
  }

  const payload = {
    orderNumber: testOrderId,
    orderId: testOrderId,
    orderDate: new Date().toISOString(),
    status: 'Diagnostic Delivery Test',
    subject: `[Diagnostic Test] Global Herbs Notification Dispatch -> ${targetEmail}`,
    recipient: targetEmail,
    to: targetEmail,
    recipientEmail: targetEmail,
    adminEmail,
    email: targetEmail,
    targetEmail,
    emailFrom: 'globalherbsinc@gmail.com',
    customerName: 'Diagnostic Verification Desk',
    customerEmail: targetEmail,
    customerPhone: '+1 (213) 280-1161',
    customer: {
      name: 'Diagnostic Verification Desk',
      email: targetEmail,
      phone: '+1 (213) 280-1161',
    },
    items: [
      {
        name: 'Organic Blue Dream (3.5g)',
        variant: 'Pre-Packaged Dispensary Flower',
        quantity: 1,
        price: '45.00',
        subtotal: '45.00',
      },
    ],
    totals: {
      subtotal: '45.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '45.00',
      currency: 'USD',
    },
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
    transactionId: testOrderId,
    notes: `Diagnostic test order notification dispatched to verify deliverability to ${targetEmail}.`,
  };

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let parsedResponse = null;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = { raw: responseText };
    }

    res.statusCode = response.ok ? 200 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        orderId: testOrderId,
        targetEmail,
        provider: 'Google Apps Script',
        appsScriptResult: parsedResponse,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: `Fetch error: ${err?.message || 'Unknown network error'}`,
        orderId: testOrderId,
      })
    );
  }
}
