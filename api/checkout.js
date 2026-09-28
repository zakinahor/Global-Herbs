// api/checkout.js
// Serverless Function — Order Capture + Google Apps Script Order Notification
// Synchronized with server.ts and lib/email/orderNotification.ts

const notifiedOrders = new Map();

function sanitizeAndValidateEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (/[\r\n]/.test(clean)) return null;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean) ? clean : null;
}

function parseShippingAddress(addr) {
  if (!addr) {
    return { address: 'Not specified', city: '', state: '', postalCode: '', country: 'United States' };
  }

  if (typeof addr === 'object' && addr !== null) {
    const street = [addr.address || addr.street1, addr.street2].filter(Boolean).join(', ');
    return {
      name: addr.name || [addr.firstName, addr.lastName].filter(Boolean).join(' ').trim() || undefined,
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
      country: lines[4] || 'United States',
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || null;
  const ADMIN_EMAIL = sanitizeAndValidateEmail(process.env.ADMIN_EMAIL) || 'globalherbsinc@gmail.com';
  const EMAIL_FROM = sanitizeAndValidateEmail(process.env.EMAIL_FROM || process.env.FROM_EMAIL) || 'globalherbsinc@gmail.com';

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body.' });
  }

  const {
    orderId: clientOrderId,
    idempotencyKey,
    customerName,
    customerEmail,
    customerPhone,
    companyName,
    shippingAddress: rawShippingAddress,
    shipping,
    shippingDetails: rawShippingDetails,
    billingAddress: rawBillingAddress,
    billing,
    orderNotes: rawOrderNotes,
    notes,
    cartItems: rawCartItems,
    items,
    subtotal,
    discount,
    couponCode,
    discountCode,
    shippingCost: rawShippingCost,
    shippingFee,
    tax,
    orderTotal: rawOrderTotal,
    total,
    currency,
    paymentMethod,
    paymentStatus,
    transactionId,
  } = body || {};

  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : Array.isArray(items) ? items : [];
  const shippingDetails = rawShippingDetails || (typeof shipping === 'object' && shipping !== null ? shipping : undefined);
  const shippingAddress =
    rawShippingAddress ||
    (typeof shipping === 'string'
      ? shipping
      : shipping && typeof shipping === 'object'
      ? [shipping.address, shipping.city, shipping.state, shipping.zip, shipping.country].filter(Boolean).join(', ')
      : '');
  const billingAddress =
    rawBillingAddress ||
    (typeof billing === 'string'
      ? billing
      : billing && typeof billing === 'object'
      ? [billing.address, billing.city, billing.state, billing.zip, billing.country].filter(Boolean).join(', ')
      : shippingAddress);
  const orderNotes = rawOrderNotes ?? notes ?? '';
  const shippingCost = rawShippingCost ?? shippingFee;
  const orderTotal = rawOrderTotal ?? total;
  const resolvedCouponCode = couponCode || discountCode;

  if (!customerName || !customerEmail || !shippingAddress || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required order fields (name, email, shipping address, or items).' });
  }

  const validReplyTo = sanitizeAndValidateEmail(customerEmail);
  if (!validReplyTo) {
    return res.status(400).json({ success: false, error: 'Invalid customer email address format.' });
  }

  const rawOrderId =
    (typeof clientOrderId === 'string' && clientOrderId.trim()) ||
    (typeof idempotencyKey === 'string' && idempotencyKey.trim()) ||
    `GH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const orderId = rawOrderId.trim().toUpperCase();

  const orderDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const parsedItems = cartItems.map((item, idx) => {
    const price = Math.max(0, Number(item.price ?? item.unitPrice ?? item.product?.price ?? 0) || 0);
    const qty = Math.max(1, Math.round(Number(item.quantity ?? 1) || 1));
    const variant = item.variant || item.selectedWeight || item.weight || item.size || item.option || 'Standard';
    return {
      id: item.id || item.productId || `ITEM-${idx + 1}`,
      name: item.name || item.product?.name || item.title || 'Dispensary Botanical Item',
      variant,
      quantity: qty,
      price,
      total: price * qty,
    };
  });

  const computedSubtotal = parsedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const resolvedSubtotal = (subtotal !== undefined && Number(subtotal) >= 0) ? Number(subtotal) : computedSubtotal;
  const resolvedDiscount = (discount !== undefined && Number(discount) >= 0) ? Number(discount) : 0;
  const resolvedShipping = (shippingCost !== undefined && Number(shippingCost) >= 0)
    ? Number(shippingCost)
    : (resolvedSubtotal >= 250 ? 0 : 19.99);
  const resolvedTax = (tax !== undefined && Number(tax) >= 0) ? Number(tax) : 0;
  const resolvedTotal = (orderTotal !== undefined && Number(orderTotal) >= 0)
    ? Number(orderTotal)
    : Math.max(0, resolvedSubtotal - resolvedDiscount + resolvedShipping + resolvedTax);
  const resolvedCurrency = (currency || 'USD').trim().toUpperCase();

  const parsedShipping = parseShippingAddress(shippingDetails || shippingAddress);
  const parsedBilling = billingAddress ? parseShippingAddress(billingAddress) : parsedShipping;

  const existingRecord = notifiedOrders.get(orderId);
  if (existingRecord && existingRecord.notificationStatus === 'sent') {
    return res.status(200).json({
      success: true,
      orderId,
      order: existingRecord.order,
      emailNotification: {
        sent: true,
        provider: 'google_apps_script',
        duplicateSuppressed: true,
        recipient: ADMIN_EMAIL,
        replyTo: validReplyTo,
        notificationStatus: 'sent',
        notificationMessageId: existingRecord.notificationMessageId,
        notificationSentAt: existingRecord.notificationSentAt,
      },
      message: `Order #${orderId} already registered. Duplicate notification suppressed.`,
    });
  }

  const savedOrder = {
    orderId,
    orderDate,
    status: 'Received & Stealth Processing',
    customerName: customerName.trim(),
    customerEmail: validReplyTo,
    customerPhone: customerPhone ? String(customerPhone).trim() : '',
    companyName: companyName ? String(companyName).trim() : '',
    shippingAddress: parsedShipping,
    billingAddress: parsedBilling,
    items: parsedItems,
    subtotal: resolvedSubtotal,
    discount: resolvedDiscount,
    couponCode: resolvedCouponCode || undefined,
    shippingCost: resolvedShipping,
    tax: resolvedTax,
    orderTotal: resolvedTotal,
    currency: resolvedCurrency,
    paymentMethod: paymentMethod || 'Dispensary Direct',
    paymentStatus: paymentStatus || 'Awaiting Payment Verification',
    transactionId: transactionId || `REF-${orderId}`,
    notes: orderNotes ? String(orderNotes).trim() : '',
    notificationStatus: 'pending',
    notificationAttempts: 0,
    notificationMessageId: null,
    notificationSentAt: null,
    notificationError: null,
    createdAt: new Date().toISOString(),
  };

  if (!GOOGLE_APPS_SCRIPT_URL) {
    const configError = 'GOOGLE_APPS_SCRIPT_URL environment variable is not configured.';
    savedOrder.notificationStatus = 'failed';
    savedOrder.notificationError = configError;
    return res.status(200).json({
      success: true,
      orderId,
      order: savedOrder,
      emailNotification: {
        sent: false,
        provider: 'google_apps_script',
        unconfigured: true,
        error: configError,
        recipient: ADMIN_EMAIL,
        replyTo: validReplyTo,
        notificationStatus: 'failed',
        notificationAttempts: 0,
        notificationMessageId: null,
        notificationSentAt: null,
        notificationError: configError,
      },
      message: `Order #${orderId} registered safely. Set GOOGLE_APPS_SCRIPT_URL to enable admin email alerts.`,
    });
  }

  const enrichedNotes = [
    savedOrder.notes ? `CUSTOMER DELIVERY NOTES:\n${savedOrder.notes}\n` : '',
    `COMPLETE ORDER & FULFILLMENT SUMMARY`,
    `----------------------------------------`,
    `Order ID: ${orderId}`,
    `Order Date/Time: ${orderDate}`,
    `Order Status: ${savedOrder.status}`,
    `Payment Method: ${savedOrder.paymentMethod}`,
    `Payment Status: ${savedOrder.paymentStatus}`,
    `Transaction / Reference ID: ${savedOrder.transactionId}`,
    `Currency: ${resolvedCurrency}`,
    savedOrder.couponCode ? `Coupon Code: ${savedOrder.couponCode} (-$${resolvedDiscount.toFixed(2)})` : '',
    savedOrder.companyName ? `Company: ${savedOrder.companyName}` : '',
    `Billing Address: ${parsedBilling.address}, ${[parsedBilling.city, parsedBilling.state, parsedBilling.postalCode].filter(Boolean).join(', ')} (${parsedBilling.country})`,
    `Delivery Address: ${parsedShipping.address}, ${[parsedShipping.city, parsedShipping.state, parsedShipping.postalCode].filter(Boolean).join(', ')} (${parsedShipping.country})`,
  ].filter(Boolean).join('\n');

  const appsScriptPayload = {
    orderNumber: orderId,
    orderDate,
    status: savedOrder.status,
    subject: `New Order #${orderId} — ${savedOrder.customerName} — $${resolvedTotal.toFixed(2)} ${resolvedCurrency}`,
    recipient: ADMIN_EMAIL,
    adminEmail: ADMIN_EMAIL,
    emailFrom: EMAIL_FROM,
    currency: resolvedCurrency,
    customer: {
      name: savedOrder.customerName,
      email: validReplyTo,
      phone: savedOrder.customerPhone || 'Not provided',
    },
    items: parsedItems.map(item => ({
      name: item.name,
      variant: item.variant || 'Standard',
      quantity: item.quantity,
      price: item.price.toFixed(2),
      subtotal: item.total.toFixed(2),
    })),
    totals: {
      subtotal: resolvedSubtotal.toFixed(2),
      discount: resolvedDiscount.toFixed(2),
      shipping: resolvedShipping.toFixed(2),
      tax: resolvedTax.toFixed(2),
      total: resolvedTotal.toFixed(2),
      currency: resolvedCurrency,
    },
    shipping: parsedShipping,
    billing: parsedBilling,
    paymentMethod: savedOrder.paymentMethod,
    paymentStatus: savedOrder.paymentStatus,
    transactionId: savedOrder.transactionId,
    notes: enrichedNotes,
  };

  let lastError = 'Unknown error';
  let attempts = 0;

  for (let attempt = 1; attempt <= 3; attempt++) {
    attempts = attempt;
    try {
      const postResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify(appsScriptPayload),
        redirect: 'manual',
        signal: AbortSignal.timeout(20000),
      });

      let responseStatus = postResponse.status;
      let responseText = '';
      let responseOk = postResponse.ok;

      if ([301, 302, 303, 307, 308].includes(responseStatus)) {
        const locationUrl = postResponse.headers.get('location');
        if (locationUrl) {
          const echoRes = await fetch(locationUrl, {
            method: 'GET',
            headers: { Accept: 'application/json, text/plain, */*' },
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
          });
          responseStatus = echoRes.status;
          responseText = await echoRes.text().catch(() => '');
          responseOk = echoRes.ok;
        } else {
          responseOk = true;
        }
      } else {
        responseText = await postResponse.text().catch(() => '');
      }

      if (!responseOk) {
        lastError = `Google Apps Script HTTP ${responseStatus}: ${responseText.slice(0, 200)}`;
        if ((responseStatus >= 500 || responseStatus === 429 || responseStatus === 404) && attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1200));
          continue;
        }
        break;
      }

      let responseData = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // non-JSON 200
      }

      if (responseData && (responseData.success === false || responseData.status === 'error')) {
        lastError = responseData.message || responseData.error || 'Apps Script returned success: false';
        if (lastError.toLowerCase().includes('busy') && attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1200));
          continue;
        }
        break;
      }

      const sentAt = new Date().toISOString();
      const messageId = responseData?.messageId || responseData?.data?.orderNumber || `gas-${orderId}-${Date.now()}`;
      savedOrder.notificationStatus = 'sent';
      savedOrder.notificationAttempts = attempts;
      savedOrder.notificationMessageId = messageId;
      savedOrder.notificationSentAt = sentAt;
      savedOrder.notificationError = null;

      notifiedOrders.set(orderId, {
        order: savedOrder,
        notificationStatus: 'sent',
        notificationAttempts: attempts,
        notificationMessageId: messageId,
        notificationSentAt: sentAt,
      });

      return res.status(200).json({
        success: true,
        orderId,
        order: savedOrder,
        emailNotification: {
          sent: true,
          provider: 'google_apps_script',
          recipient: ADMIN_EMAIL,
          replyTo: validReplyTo,
          notificationStatus: 'sent',
          notificationAttempts: attempts,
          notificationMessageId: messageId,
          notificationSentAt: sentAt,
          notificationError: null,
        },
        message: `Order #${orderId} successfully registered and admin notification dispatched!`,
      });
    } catch (err) {
      lastError = err?.message || String(err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1200));
        continue;
      }
    }
  }

  savedOrder.notificationStatus = 'failed';
  savedOrder.notificationAttempts = attempts;
  savedOrder.notificationError = lastError;
  return res.status(200).json({
    success: true,
    orderId,
    order: savedOrder,
    emailNotification: {
      sent: false,
      provider: 'google_apps_script',
      error: lastError,
      recipient: ADMIN_EMAIL,
      replyTo: validReplyTo,
      notificationStatus: 'failed',
      notificationAttempts: attempts,
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: lastError,
    },
    message: `Order #${orderId} registered safely. Notification note: ${lastError}`,
  });
}
