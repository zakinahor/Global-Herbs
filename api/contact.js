// lib/email/orderNotification.ts
var processedOrders = /* @__PURE__ */ new Map();
var IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1e3;
function isOrderAlreadyProcessed(orderNumber) {
  if (!orderNumber) return false;
  const cleanKey = orderNumber.trim().toUpperCase();
  const entry = processedOrders.get(cleanKey);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > IDEMPOTENCY_TTL_MS) {
    processedOrders.delete(cleanKey);
    return false;
  }
  return entry.success;
}
function getProcessedOrderRecord(orderNumber) {
  if (!orderNumber) return null;
  return processedOrders.get(orderNumber.trim().toUpperCase()) || null;
}
function markOrderProcessed(orderNumber, success, messageId = null, sentAt = null) {
  if (!orderNumber) return;
  const cleanKey = orderNumber.trim().toUpperCase();
  processedOrders.set(cleanKey, {
    timestamp: Date.now(),
    success,
    messageId,
    sentAt
  });
}
function sanitizeEmailAddress(email) {
  if (!email || typeof email !== "string") return null;
  const clean = email.trim().toLowerCase();
  if (/[\r\n]/.test(clean)) return null;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean) ? clean : null;
}
function parseAddressBlock(input) {
  const fallback = {
    address: "Not provided",
    city: "",
    state: "",
    postalCode: "",
    country: "United States"
  };
  if (!input) return fallback;
  if (typeof input === "object" && input !== null) {
    const fullName = input.name || [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || void 0;
    const streetParts = [
      input.address || input.street || input.street1,
      input.street2
    ].filter(Boolean).join(", ");
    return {
      name: fullName,
      company: input.company || void 0,
      address: streetParts || "Not provided",
      city: input.city || "",
      state: input.state || "",
      postalCode: input.postalCode || input.zipCode || input.zip || "",
      country: input.country || "United States",
      phone: input.phone || void 0,
      email: input.email || void 0
    };
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return fallback;
    try {
      if (trimmed.startsWith("{")) {
        const parsedObj = JSON.parse(trimmed);
        return parseAddressBlock(parsedObj);
      }
    } catch {
    }
    const lines = trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length >= 3) {
      return {
        address: lines[0],
        city: lines[1] || "",
        state: lines[2] || "",
        postalCode: lines[3] || "",
        country: lines[4] || "United States"
      };
    }
    return {
      address: trimmed,
      city: "",
      state: "",
      postalCode: "",
      country: "United States"
    };
  }
  return fallback;
}
function formatCurrency(val) {
  if (val === void 0 || val === null || val === "") return "0.00";
  if (typeof val === "number") {
    return isNaN(val) ? "0.00" : val.toFixed(2);
  }
  const clean = String(val).replace(/[^0-9.-]+/g, "");
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? "0.00" : parsed.toFixed(2);
}
function formatPaymentMethodLabel(method) {
  if (!method) return "Dispensary Direct";
  const map = {
    btc: "Bitcoin / Cryptocurrency (BTC, ETH, USDT)",
    zelle: "Zelle / CashApp / Venmo Transfer",
    wire: "Interac e-Transfer / Bank Wire",
    google_apple: "Apple Pay / Google Pay Express"
  };
  return map[method.toLowerCase()] || method;
}
function getAppsScriptUrl() {
  if (typeof process !== "undefined" && process.env?.GOOGLE_APPS_SCRIPT_URL) {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL.trim();
    if (url.startsWith("https://script.google.com/")) return url;
  }
  return null;
}
function getAdminRecipientEmail() {
  if (typeof process !== "undefined" && process.env?.ADMIN_EMAIL) {
    const email = sanitizeEmailAddress(process.env.ADMIN_EMAIL);
    if (email) return email;
  }
  return "globalherbsinc@gmail.com";
}
function getSenderEmail() {
  if (typeof process !== "undefined") {
    const fromEnv = process.env?.EMAIL_FROM || process.env?.FROM_EMAIL || process.env?.GMAIL_SENDER_EMAIL;
    const clean = sanitizeEmailAddress(fromEnv);
    if (clean) return clean;
  }
  return "globalherbsinc@gmail.com";
}
function formatOrderPayload(order) {
  const orderNumber = (order.orderNumber || order.orderId || `GH-${Date.now()}`).trim();
  const orderDate = order.orderDate || (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const status = order.status || "Received & Stealth Processing";
  const currency = (order.currency || order.totals?.currency || "USD").trim().toUpperCase();
  const customerName = (order.customer?.name || order.customerName || "Valued Customer").trim();
  const rawEmail = (order.customer?.email || order.customerEmail || "").trim();
  const customerEmail = sanitizeEmailAddress(rawEmail) || "noreply@globalherbs.site";
  const customerPhone = (order.customer?.phone || order.customerPhone || "").trim();
  const companyName = (order.customer?.company || order.companyName || "").trim();
  const rawItems = order.items || order.cartItems || [];
  const items = rawItems.map((item, idx) => {
    const name = item.name || `Dispensary Product #${idx + 1}`;
    const variant = item.variant || item.weight || item.size || "Standard";
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const priceStr = formatCurrency(item.price);
    const subtotalStr = item.subtotal !== void 0 || item.total !== void 0 ? formatCurrency(item.subtotal ?? item.total) : (parseFloat(priceStr) * quantity).toFixed(2);
    return {
      id: item.id || item.productId ? String(item.id || item.productId) : void 0,
      name,
      variant,
      quantity,
      price: priceStr,
      subtotal: subtotalStr
    };
  });
  if (items.length === 0) {
    items.push({
      id: "ORDER-SUMMARY",
      name: `Order #${orderNumber}`,
      variant: status,
      quantity: 1,
      price: formatCurrency(order.orderTotal ?? order.totals?.total ?? 0),
      subtotal: formatCurrency(order.orderTotal ?? order.totals?.total ?? 0)
    });
  }
  const subtotal = order.totals?.subtotal !== void 0 ? formatCurrency(order.totals.subtotal) : order.subtotal !== void 0 ? formatCurrency(order.subtotal) : items.reduce((acc, i) => acc + parseFloat(i.subtotal), 0).toFixed(2);
  const discount = order.totals?.discount !== void 0 ? formatCurrency(order.totals.discount) : formatCurrency(order.discount || 0);
  const shipping = order.totals?.shipping !== void 0 ? formatCurrency(order.totals.shipping) : formatCurrency(order.shippingCost || 0);
  const tax = order.totals?.tax !== void 0 ? formatCurrency(order.totals.tax) : formatCurrency(order.tax || 0);
  const total = order.totals?.total !== void 0 ? formatCurrency(order.totals.total) : order.orderTotal !== void 0 ? formatCurrency(order.orderTotal) : Math.max(
    0,
    parseFloat(subtotal) - parseFloat(discount) + parseFloat(shipping) + parseFloat(tax)
  ).toFixed(2);
  const shippingData = parseAddressBlock(
    order.shippingDetails || order.shippingAddress || order.shipping
  );
  const billingData = order.billingAddress ? parseAddressBlock(order.billingAddress) : shippingData;
  const paymentMethod = formatPaymentMethodLabel(order.paymentMethod);
  const paymentStatus = (order.paymentStatus || "Awaiting Payment Verification / Pending Dispatch").trim();
  const transactionId = (order.transactionId || order.trackingNumber || `REF-${orderNumber}`).trim();
  const couponCode = order.couponCode ? String(order.couponCode).trim() : void 0;
  const customerNotesRaw = (order.notes || order.orderNotes || "").trim();
  const AlreadyFormattedInquiry = customerNotesRaw.startsWith("CUSTOMER INQUIRY / FORM SUBMISSION");
  const enrichedNotes = AlreadyFormattedInquiry ? customerNotesRaw : [
    customerNotesRaw ? `CUSTOMER DELIVERY NOTES:
${customerNotesRaw}
` : "",
    `COMPLETE ORDER & FULFILLMENT SUMMARY`,
    `----------------------------------------`,
    `Order ID: ${orderNumber}`,
    `Order Date/Time: ${orderDate}`,
    `Order Status: ${status}`,
    `Payment Method: ${paymentMethod}`,
    `Payment Status: ${paymentStatus}`,
    `Transaction / Reference ID: ${transactionId}`,
    `Currency: ${currency}`,
    couponCode ? `Coupon Code Applied: ${couponCode} (-$${discount})` : "",
    companyName ? `Company Name: ${companyName}` : "",
    ``,
    `BILLING INFORMATION:`,
    `Name: ${billingData.name || customerName}`,
    billingData.company ? `Company: ${billingData.company}` : "",
    `Address: ${billingData.address}`,
    `City/State/ZIP: ${[billingData.city, billingData.state, billingData.postalCode].filter(Boolean).join(", ") || "See address above"}`,
    `Country: ${billingData.country || "United States"}`,
    `Email: ${customerEmail}`,
    `Phone: ${customerPhone || "Not provided"}`,
    ``,
    `DELIVERY / SHIPPING ADDRESS:`,
    shippingData.name ? `Recipient: ${shippingData.name}` : `Recipient: ${customerName}`,
    `Street Address: ${shippingData.address}`,
    `City/State/ZIP: ${[shippingData.city, shippingData.state, shippingData.postalCode].filter(Boolean).join(", ") || "See address above"}`,
    `Country: ${shippingData.country || "United States"}`
  ].filter(Boolean).join("\n");
  const adminEmail = sanitizeEmailAddress(order.recipient || order.adminEmail) || getAdminRecipientEmail();
  const subject = order.subject || `New Order #${orderNumber} \u2014 ${customerName} \u2014 $${total} ${currency}`;
  return {
    orderNumber,
    orderId: orderNumber,
    orderDate,
    status,
    subject,
    recipient: adminEmail,
    to: adminEmail,
    recipientEmail: adminEmail,
    adminEmail,
    email: adminEmail,
    targetEmail: adminEmail,
    emailFrom: getSenderEmail(),
    currency,
    customerName,
    customerEmail,
    customerPhone: customerPhone || "Not provided",
    total,
    subtotal,
    discount,
    shippingCost: shipping,
    tax,
    paymentMethod,
    paymentStatus,
    transactionId,
    couponCode,
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone || "Not provided",
      company: companyName || void 0
    },
    items,
    totals: {
      subtotal,
      discount,
      shipping,
      tax,
      total,
      currency
    },
    shipping: {
      name: shippingData.name || customerName,
      address: shippingData.address,
      city: shippingData.city,
      state: shippingData.state,
      postalCode: shippingData.postalCode,
      country: shippingData.country
    },
    billing: {
      name: billingData.name || customerName,
      company: billingData.company,
      address: billingData.address,
      city: billingData.city,
      state: billingData.state,
      postalCode: billingData.postalCode,
      country: billingData.country,
      phone: customerPhone || billingData.phone,
      email: customerEmail
    },
    notes: enrichedNotes,
    sendCustomerConfirmation: true
  };
}
var dispatchQueuePromise = Promise.resolve();
var lastDispatchCompletedAt = 0;
var MIN_DISPATCH_INTERVAL_MS = 650;
function enqueueAppsScriptDispatch(task) {
  const next = dispatchQueuePromise.then(async () => {
    const elapsed = Date.now() - lastDispatchCompletedAt;
    if (lastDispatchCompletedAt > 0 && elapsed < MIN_DISPATCH_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_DISPATCH_INTERVAL_MS - elapsed));
    }
    try {
      return await task();
    } finally {
      lastDispatchCompletedAt = Date.now();
    }
  });
  dispatchQueuePromise = next.catch(() => {
  });
  return next;
}
async function followAppsScriptEchoRedirect(echoUrl, maxEchoAttempts = 3) {
  let lastStatus = 0;
  let lastText = "";
  for (let i = 1; i <= maxEchoAttempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15e3);
    if (typeof timeoutId === "object" && typeof timeoutId.unref === "function") {
      timeoutId.unref();
    }
    try {
      const echoRes = await fetch(echoUrl, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*"
        },
        redirect: "follow",
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
      lastStatus = echoRes.status;
      lastText = await echoRes.text().catch(() => "");
      if (echoRes.ok) {
        return { status: echoRes.status, text: lastText, ok: true };
      }
      if (i < maxEchoAttempts) {
        await new Promise((r) => setTimeout(r, i * 600));
        continue;
      }
    } catch (err) {
      lastText = err?.message || "Echo redirect fetch error";
      if (i < maxEchoAttempts) {
        await new Promise((r) => setTimeout(r, i * 600));
        continue;
      }
    }
  }
  return { status: lastStatus, text: lastText, ok: false };
}
async function postToAppsScriptWithRetry(scriptUrl, payload, maxAttempts = 3) {
  return enqueueAppsScriptDispatch(async () => {
    let lastError = "Unknown error";
    const bodyString = JSON.stringify(payload);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2e4);
      if (typeof timeoutId === "object" && typeof timeoutId.unref === "function") {
        timeoutId.unref();
      }
      try {
        const postResponse = await fetch(scriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
            Accept: "application/json, text/plain, */*"
          },
          body: bodyString,
          redirect: "manual",
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
        let responseStatus = postResponse.status;
        let responseText = "";
        let responseOk = postResponse.ok;
        if (responseStatus === 301 || responseStatus === 302 || responseStatus === 303 || responseStatus === 307 || responseStatus === 308) {
          const locationUrl = postResponse.headers.get("location");
          if (locationUrl) {
            if (locationUrl.includes("accounts.google.com/ServiceLogin")) {
              lastError = 'Google Apps Script redirected to login page. Ensure Web App is deployed with Who has access: "Anyone".';
              return { ok: false, attempts: attempt, messageId: null, error: lastError };
            }
            const echoResult = await followAppsScriptEchoRedirect(locationUrl, 3);
            responseStatus = echoResult.status;
            responseText = echoResult.text;
            responseOk = echoResult.ok;
            if (!responseOk && locationUrl.includes("script.googleusercontent.com/macros/echo")) {
              if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, attempt * 1200));
                continue;
              }
            }
          } else {
            responseOk = true;
          }
        } else {
          responseText = await postResponse.text().catch(() => "");
        }
        if (!responseOk) {
          lastError = `Google Apps Script HTTP ${responseStatus}: ${responseText.slice(0, 200)}`;
          if ((responseStatus >= 500 || responseStatus === 429 || responseStatus === 404) && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          return { ok: false, attempts: attempt, messageId: null, error: lastError };
        }
        if (responseText.includes("<title>Page not found</title>") || responseText.includes("unable to open the file at present") || responseText.includes("accounts.google.com/ServiceLogin") || responseText.includes('<!DOCTYPE html><html lang="en"><head><meta name="description" content="Web word processing')) {
          lastError = "Google Apps Script returned an HTML error page. Verify the Web App deployment is active.";
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          return { ok: false, attempts: attempt, messageId: null, error: lastError };
        }
        let responseData = null;
        try {
          responseData = JSON.parse(responseText);
        } catch {
        }
        if (responseData && (responseData.success === false || responseData.status === "error")) {
          lastError = responseData.message || responseData.error || "Google Apps Script returned an error status";
          if (lastError.toLowerCase().includes("busy") && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          return { ok: false, attempts: attempt, messageId: null, error: lastError };
        }
        const messageId = responseData?.messageId || responseData?.data?.orderNumber || `gas-${payload.orderNumber || Date.now()}-${Date.now()}`;
        return {
          ok: true,
          attempts: attempt,
          messageId: String(messageId),
          error: null
        };
      } catch (err) {
        lastError = err?.name === "AbortError" ? "Request timed out after 20s while contacting Google Apps Script endpoint" : err?.message || "Network error communicating with Google Apps Script";
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 1500));
          continue;
        }
      }
    }
    return { ok: false, attempts: maxAttempts, messageId: null, error: lastError };
  });
}
async function sendOrderNotification(orderInput) {
  const payload = formatOrderPayload(orderInput);
  const orderNumber = payload.orderNumber;
  const adminEmail = payload.recipient;
  const replyTo = sanitizeEmailAddress(payload.customer.email);
  if (!orderInput.forceRetry && isOrderAlreadyProcessed(orderNumber)) {
    const existing = getProcessedOrderRecord(orderNumber);
    console.log(
      `[Order Notification] Duplicate notification suppressed for #${orderNumber}`
    );
    return {
      success: true,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      duplicateSuppressed: true,
      notificationStatus: "sent",
      notificationMessageId: existing?.messageId || `dup-${orderNumber}`,
      notificationSentAt: existing?.sentAt || (/* @__PURE__ */ new Date()).toISOString(),
      notificationError: null,
      notificationAttempts: 1
    };
  }
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) {
    const configError = "GOOGLE_APPS_SCRIPT_URL environment variable is not configured on the server.";
    console.error(`[Order Notification Error] Order #${orderNumber}: ${configError}`);
    return {
      success: false,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      unconfigured: true,
      error: configError,
      notificationStatus: "failed",
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: configError,
      notificationAttempts: 0
    };
  }
  const dispatchResult = await postToAppsScriptWithRetry(scriptUrl, payload, 3);
  if (!dispatchResult.ok) {
    console.error(
      `[Order Notification Failed] Order #${orderNumber} after ${dispatchResult.attempts} attempt(s): ${dispatchResult.error}`
    );
    return {
      success: false,
      orderNumber,
      recipient: adminEmail,
      replyTo,
      error: dispatchResult.error,
      notificationStatus: "failed",
      notificationMessageId: null,
      notificationSentAt: null,
      notificationError: dispatchResult.error,
      notificationAttempts: dispatchResult.attempts
    };
  }
  const sentAt = (/* @__PURE__ */ new Date()).toISOString();
  markOrderProcessed(orderNumber, true, dispatchResult.messageId, sentAt);
  console.log(
    `[Order Notification Sent] Order #${orderNumber} delivered to admin (${adminEmail}) [msgId: ${dispatchResult.messageId}]`
  );
  return {
    success: true,
    orderNumber,
    recipient: adminEmail,
    replyTo,
    error: null,
    notificationStatus: "sent",
    notificationMessageId: dispatchResult.messageId,
    notificationSentAt: sentAt,
    notificationError: null,
    notificationAttempts: dispatchResult.attempts
  };
}
async function sendCustomerInquiryNotification(inquiry) {
  const adminEmail = sanitizeEmailAddress(inquiry.recipient) || getAdminRecipientEmail();
  const inquiryType = (inquiry.type || "Customer Contact Form").trim();
  const cleanName = (inquiry.name || "Valued Customer").trim();
  const cleanEmail = sanitizeEmailAddress(inquiry.email) || "inquiry@globalherbs.site";
  const cleanPhone = (inquiry.phone || "").trim();
  const cleanSubject = (inquiry.subject || "Customer Inquiry").trim();
  const cleanMessage = (inquiry.message || "").trim();
  const inquiryId = inquiry.id || `FORM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const submittedAt = (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const metadataLines = inquiry.metadata ? Object.entries(inquiry.metadata).filter(([, v]) => v !== void 0 && v !== null && v !== "").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`) : [];
  const formattedNotes = [
    `CUSTOMER INQUIRY / FORM SUBMISSION`,
    `========================================`,
    `Submission ID: ${inquiryId}`,
    `Form Type: ${inquiryType}`,
    `Subject / Topic: ${cleanSubject}`,
    `Submission Date/Time: ${submittedAt}`,
    `Customer Name: ${cleanName}`,
    `Customer Email (Reply-To): ${cleanEmail}`,
    `Customer Phone: ${cleanPhone || "Not provided"}`,
    inquiry.productReference ? `Product Reference: ${inquiry.productReference}` : "",
    inquiry.orderReference ? `Order Reference: ${inquiry.orderReference}` : "",
    ...metadataLines,
    ``,
    `SUBMITTED MESSAGE / DETAILS:`,
    `----------------------------------------`,
    cleanMessage || "(No additional message text provided)"
  ].filter((line) => line !== "").join("\n");
  const payload = {
    orderNumber: inquiryId,
    orderDate: submittedAt,
    status: `${inquiryType}: ${cleanSubject}`,
    subject: `[${inquiryType}] ${cleanSubject} \u2014 ${cleanName}`,
    recipient: adminEmail,
    adminEmail,
    customer: {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || "Not provided"
    },
    // Non-empty item guarantees the live Google Apps Script endpoint processes the form notification
    items: [
      {
        name: `${inquiryType}: ${cleanSubject}`,
        variant: inquiry.productReference || inquiry.orderReference || `From: ${cleanEmail}`,
        quantity: 1,
        price: "0.00",
        subtotal: "0.00"
      }
    ],
    totals: {
      subtotal: "0.00",
      discount: "0.00",
      shipping: "0.00",
      tax: "0.00",
      total: "0.00",
      currency: "USD"
    },
    shipping: {
      name: cleanName,
      address: `Website Form Submission (${inquiryType})`,
      city: cleanPhone ? `Phone: ${cleanPhone}` : "",
      state: "",
      postalCode: "",
      country: "Online Form"
    },
    paymentMethod: inquiryType,
    paymentStatus: "Form Submitted \u2014 Action Required",
    transactionId: inquiryId,
    notes: formattedNotes
  };
  console.log(
    `[Customer Form Notification] Dispatching ${inquiryType} (#${inquiryId}) from ${cleanEmail} to admin (${adminEmail})`
  );
  return sendOrderNotification(payload);
}

// api/contact.ts
function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method Not Allowed" }));
    return;
  }
  const body = req.body || await parseRequestBody(req);
  const { name, email, subject, message, phone, productReference, orderReference } = body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "A valid email address is required." }));
    return;
  }
  const cleanName = (name || "").trim() || "Valued Client";
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = (phone || "").trim();
  const cleanSubject = (subject || "Customer Inquiry").trim();
  const cleanMessage = (message || "").trim();
  if (!cleanMessage) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Please enter a message." }));
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
    type: "Customer Contact Form",
    productReference,
    orderReference
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      success: true,
      submissionId,
      message: `Thank you, ${cleanName}! Your inquiry has been dispatched to globalherbsinc@gmail.com. We will reply shortly.`,
      notification: notificationResult
    })
  );
}
export {
  handler as default
};
