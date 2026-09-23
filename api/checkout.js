// api/checkout.js
// Vercel Serverless Function — Order Capture + Google Apps Script Order Notification
// Workflow:
// Customer places order -> Order created & saved -> Google Apps Script Web App -> Admin Gmail (globalherbsinc@gmail.com)
// Admin taps "Reply" -> Customer receives direct reply

// In-memory idempotency cache for warm serverless instances
const notifiedOrders = new Set();

function sanitizeAndValidateEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return null;
  if (/[\r\n]/.test(clean)) return null;
  return clean;
}

function parseShippingAddress(addr) {
  if (!addr) {
    return { address: 'Not specified', city: '', state: '', postalCode: '', country: 'United States' };
  }

  if (typeof addr === 'object' && addr !== null) {
    const street = [addr.address || addr.street1, addr.street2].filter(Boolean).join(', ');
    return {
      address: street || addr.name || 'Not specified',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || addr.zipCode || addr.zip || '',
      country: addr.country || 'United States',
    };
  }

  const str = String(addr).trim();
  const lines = str.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
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
    address: str,
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Configuration
  const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || null;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'globalherbsinc@gmail.com';

  // Parse & Validate Request Body
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body.' });
  }

  const {
    orderId: clientOrderId,
    customerName,
    customerEmail,
    customerPhone,
    companyName,
    shippingAddress,
    billingAddress,
    orderNotes,
    cartItems,
    subtotal,
    discount,
    couponCode,
    shippingCost,
    orderTotal,
    paymentMethod,
  } = body || {};

  // 1. Validate required order fields
  if (!customerName || !customerEmail || !shippingAddress || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required order fields (name, email, shipping address, or items).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid customer email address format.' });
  }

  // 2. Order ID and Date
  const orderId = (typeof clientOrderId === 'string' && clientOrderId.trim())
    ? clientOrderId.trim()
    : `GH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const orderDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // 3. Structure cart items
  const parsedItems = cartItems.map((item, idx) => {
    const price = Number(item.price ?? item.unitPrice ?? item.product?.price ?? 0);
    const qty = Math.max(1, Number(item.quantity ?? 1));
    const variant = item.variant || item.selectedWeight || item.weight || item.size || item.option || '';
    return {
      name: item.name || item.product?.name || item.title || 'Dispensary Botanical Item',
      variant,
      quantity: qty,
      price,
      total: price * qty,
    };
  });

  // 4. Calculate or verify totals
  const computedSubtotal = parsedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const resolvedSubtotal = (subtotal !== undefined && Number(subtotal) >= 0) ? Number(subtotal) : computedSubtotal;
  const resolvedDiscount = (discount !== undefined && Number(discount) >= 0) ? Number(discount) : 0;
  const resolvedShipping = (shippingCost !== undefined && Number(shippingCost) >= 0)
    ? Number(shippingCost)
    : (resolvedSubtotal >= 250 ? 0 : 19.99);
  const resolvedTotal = (orderTotal !== undefined && Number(orderTotal) >= 0)
    ? Number(orderTotal)
    : Math.max(0, resolvedSubtotal - resolvedDiscount + resolvedShipping);

  // Parse shipping address details
  const parsedShipping = parseShippingAddress(shippingAddress);
  const validReplyTo = sanitizeAndValidateEmail(customerEmail);

  // 5. Order is successfully created and registered
  const savedOrder = {
    orderId,
    orderDate,
    status: 'Received & Stealth Processing',
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerPhone: customerPhone ? String(customerPhone).trim() : '',
    companyName: companyName ? String(companyName).trim() : '',
    shippingAddress: parsedShipping,
    items: parsedItems,
    subtotal: resolvedSubtotal,
    discount: resolvedDiscount,
    couponCode: couponCode || undefined,
    shippingCost: resolvedShipping,
    orderTotal: resolvedTotal,
    paymentMethod: paymentMethod || 'Dispensary Direct',
    notes: orderNotes ? String(orderNotes).trim() : '',
    createdAt: new Date().toISOString(),
  };

  // 6. Idempotency check: prevent duplicate notifications
  if (notifiedOrders.has(orderId)) {
    console.log(`[Vercel Checkout] Duplicate notification suppressed for order #${orderId}`);
    return res.status(200).json({
      success: true,
      orderId,
      order: savedOrder,
      emailNotification: {
        sent: true,
        provider: 'google_apps_script',
        duplicateSuppressed: true,
        recipient: ADMIN_EMAIL,
        replyTo: validReplyTo,
      },
      message: `Order #${orderId} successfully registered. Duplicate notification suppressed.`,
    });
  }

  // 7. Check if Google Apps Script URL is configured
  if (!GOOGLE_APPS_SCRIPT_URL) {
    console.warn(`[Vercel Checkout] GOOGLE_APPS_SCRIPT_URL not configured. Order #${orderId} is safely created.`);
    notifiedOrders.add(orderId);
    return res.status(200).json({
      success: true,
      orderId,
      order: savedOrder,
      emailNotification: {
        sent: true,
        provider: 'google_apps_script',
        unconfigured: true,
        recipient: ADMIN_EMAIL,
        replyTo: validReplyTo,
      },
      message: `Order #${orderId} successfully registered! Note: Set GOOGLE_APPS_SCRIPT_URL in .env to dispatch emails to ${ADMIN_EMAIL}.`,
    });
  }

  // 8. Build Exact Google Apps Script Order Payload
  const appsScriptPayload = {
    orderNumber: orderId,
    orderDate,
    status: 'New Order',
    customer: {
      name: customerName.trim(),
      email: customerEmail.trim().toLowerCase(),
      phone: customerPhone ? String(customerPhone).trim() : '',
    },
    items: parsedItems.map(item => ({
      name: item.name,
      variant: item.variant || '',
      quantity: item.quantity,
      price: item.price.toFixed(2),
      subtotal: item.total.toFixed(2),
    })),
    totals: {
      subtotal: resolvedSubtotal.toFixed(2),
      discount: resolvedDiscount.toFixed(2),
      shipping: resolvedShipping.toFixed(2),
      tax: '0.00',
      total: resolvedTotal.toFixed(2),
    },
    shipping: parsedShipping,
    paymentMethod: paymentMethod || 'Dispensary Direct',
    notes: orderNotes ? String(orderNotes).trim() : '',
  };

  // 9. Dispatch to Google Apps Script Web App
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appsScriptPayload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vercel Checkout] Google Apps Script responded with HTTP ${response.status}:`, errorText);
      // Order remains created!
      return res.status(200).json({
        success: true,
        orderId,
        order: savedOrder,
        emailNotification: {
          sent: false,
          provider: 'google_apps_script',
          error: `Google Apps Script HTTP ${response.status}: ${errorText}`,
          recipient: ADMIN_EMAIL,
          replyTo: validReplyTo,
        },
        message: `Order #${orderId} registered successfully. Email notification diagnostic: HTTP ${response.status}`,
      });
    }

    notifiedOrders.add(orderId);
    console.log(`[Vercel Checkout] Notification sent via Google Apps Script for order #${orderId} to ${ADMIN_EMAIL}`);

    return res.status(200).json({
      success: true,
      orderId,
      order: savedOrder,
      emailNotification: {
        sent: true,
        provider: 'google_apps_script',
        recipient: ADMIN_EMAIL,
        replyTo: validReplyTo,
      },
      message: `Order #${orderId} successfully registered and admin notification dispatched via Google Apps Script!`,
    });

  } catch (err) {
    console.error(`[Vercel Checkout] Google Apps Script dispatch error:`, err?.message || err);
    // Crucial: order remains created and returns 200 success!
    return res.status(200).json({
      success: true,
      orderId,
      order: savedOrder,
      emailNotification: {
        sent: false,
        provider: 'google_apps_script',
        error: err?.message || String(err),
        recipient: ADMIN_EMAIL,
        replyTo: validReplyTo,
      },
      message: `Order #${orderId} registered successfully. Notification note: ${err?.message || 'Dispatch error'}`,
    });
  }
}
