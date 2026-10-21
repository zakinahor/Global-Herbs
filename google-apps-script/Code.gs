/**
 * Google Apps Script — Order & Form Notification Service for Global Herbs Inc.
 *
 * Primary Recipient: globalherbsinc@gmail.com
 * Handles:
 * 1. Admin Order Notifications (with full line items, billing, shipping, financials & payment metadata)
 * 2. Customer Order Confirmations (when 'to' is set to customer email)
 * 3. Customer Form & Support Inquiries (Contact, Support, B2B Wholesale, Product Reviews, Newsletter)
 * 4. Self-test function testSendToGlobalHerbs() for instant editor verification
 */

var ADMIN_RECIPIENT_EMAIL = "globalherbsinc@gmail.com";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", success: false, message: "Missing request body" });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ status: "error", success: false, message: "Invalid JSON in request body: " + parseErr.message });
    }

    // Resolve reference ID (orderId, orderNumber, id, or generated reference)
    var referenceId = String(data.orderId || data.orderNumber || data.id || data.referenceId || ("GH-" + Date.now())).trim();

    // Resolve target recipient email:
    // Check all possible recipient fields in priority order, defaulting strictly to globalherbsinc@gmail.com
    var rawRecipient = data.to || data.recipientEmail || data.recipient || data.adminEmail || data.email || data.targetEmail || ADMIN_RECIPIENT_EMAIL;
    var recipientEmail = sanitizeEmail(rawRecipient);

    // Guard: Prevent sending to any obsolete or non-dispensary email
    if (!recipientEmail || recipientEmail.toLowerCase() === "zakinahor692@gmail.com") {
      recipientEmail = ADMIN_RECIPIENT_EMAIL;
    }

    // Resolve customer details from either nested object or top-level properties
    var customerObj = (data.customer && typeof data.customer === "object") ? data.customer : {};
    var customerName = String(customerObj.name || data.customerName || data.name || "Valued Client").trim();
    var customerEmail = sanitizeEmail(customerObj.email || data.customerEmail || data.email || "");
    var customerPhone = String(customerObj.phone || data.customerPhone || data.phone || "Not provided").trim();

    // Resolve financial totals
    var totalsObj = (data.totals && typeof data.totals === "object") ? data.totals : {};
    var resolvedTotal = Number(totalsObj.total || data.orderTotal || data.total || 0);
    var resolvedCurrency = String(data.currency || totalsObj.currency || "USD").toUpperCase();

    // Resolve order/inquiry status
    var status = String(data.status || data.orderStatus || "New Submission Received").trim();

    // Determine subject line
    var isCustomerConfirmation = (recipientEmail.toLowerCase() !== ADMIN_RECIPIENT_EMAIL.toLowerCase());
    var defaultSubject = isCustomerConfirmation
      ? ("Order Confirmation #" + referenceId + " — Global Herbs Inc.")
      : ("New Order #" + referenceId + " — " + customerName + " — $" + resolvedTotal.toFixed(2) + " " + resolvedCurrency);
    var subject = String(data.subject || defaultSubject).trim();

    // Build email bodies (prefer provided HTML/text, otherwise dynamically generate)
    var htmlBody = data.html || buildHtmlEmail(data, referenceId, customerName, customerEmail, customerPhone, resolvedTotal, resolvedCurrency, status);
    var plainBody = data.text || buildPlainTextEmail(data, referenceId, customerName, customerEmail, customerPhone, resolvedTotal, resolvedCurrency, status);

    var mailOptions = {
      to: recipientEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: "Global Herbs Inc."
    };

    // When emailing the admin, set Reply-To to the customer's email so clicking Reply in Gmail responds to the customer
    if (!isCustomerConfirmation && customerEmail) {
      mailOptions.replyTo = customerEmail;
    }

    // Send the email via Google MailApp
    MailApp.sendEmail(mailOptions);

    return createJsonResponse({
      success: true,
      status: "success",
      message: "Notification sent successfully to " + recipientEmail,
      orderId: referenceId,
      orderNumber: referenceId,
      recipient: recipientEmail,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      status: "error",
      message: err && err.message ? err.message : String(err)
    });
  }
}

function sanitizeEmail(raw) {
  if (!raw || typeof raw !== "string") return "";
  var cleaned = raw.trim();
  var angleMatch = cleaned.match(/<([^>]+)>/);
  if (angleMatch && angleMatch[1]) {
    cleaned = angleMatch[1].trim();
  }
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim().toLowerCase();
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : "";
}

function buildPlainTextEmail(data, refId, custName, custEmail, custPhone, total, currency, status) {
  var lines = [];
  lines.push("==================================================");
  lines.push("GLOBAL HERBS INC. — DISPENSARY NOTIFICATION");
  lines.push("==================================================");
  lines.push("Reference ID:    #" + refId);
  lines.push("Date / Time:     " + (data.orderDate || new Date().toISOString()));
  lines.push("Status:          " + status);
  lines.push("Customer Name:   " + custName);
  lines.push("Customer Email:  " + (custEmail || "Not provided"));
  lines.push("Customer Phone:  " + custPhone);
  if (data.paymentMethod) {
    lines.push("Payment Method:  " + data.paymentMethod);
  }
  if (data.paymentStatus) {
    lines.push("Payment Status:  " + data.paymentStatus);
  }
  if (data.transactionId) {
    lines.push("Transaction ID:  " + data.transactionId);
  }
  lines.push("");

  var items = Array.isArray(data.items) ? data.items : [];
  if (items.length > 0) {
    lines.push("--- LINE ITEMS ---");
    for (var i = 0; i < items.length; i++) {
      var itm = items[i];
      var qty = Number(itm.quantity || 1);
      var price = Number(itm.price || 0);
      var lineTotal = itm.subtotal !== undefined ? Number(itm.subtotal) : (itm.total !== undefined ? Number(itm.total) : qty * price);
      var variantInfo = itm.variant ? (" (" + itm.variant + ")") : "";
      lines.push((i + 1) + ". " + (itm.name || "Item") + variantInfo + " | Qty: " + qty + " @ $" + price.toFixed(2) + " = $" + lineTotal.toFixed(2));
    }
    lines.push("");
    lines.push("TOTAL: $" + total.toFixed(2) + " " + currency);
    lines.push("");
  }

  var shippingInfo = formatAddressBlock(data.shipping || data.shippingAddress);
  if (shippingInfo) {
    lines.push("--- DELIVERY ADDRESS ---");
    lines.push(shippingInfo);
    lines.push("");
  }

  var billingInfo = formatAddressBlock(data.billing || data.billingAddress);
  if (billingInfo && billingInfo !== shippingInfo) {
    lines.push("--- BILLING ADDRESS ---");
    lines.push(billingInfo);
    lines.push("");
  }

  if (data.notes) {
    lines.push("--- DETAILS / FULFILLMENT NOTES ---");
    lines.push(String(data.notes));
    lines.push("");
  }

  lines.push("==================================================");
  lines.push("Global Herbs Inc. | https://globalherbs.site");
  lines.push("Dispensary Contact: " + ADMIN_RECIPIENT_EMAIL + " | +1 (213) 280-1161");
  return lines.join("\n");
}

function buildHtmlEmail(data, refId, custName, custEmail, custPhone, total, currency, status) {
  var items = Array.isArray(data.items) ? data.items : [];
  var rowsHtml = "";
  for (var i = 0; i < items.length; i++) {
    var itm = items[i];
    var qty = Number(itm.quantity || 1);
    var price = Number(itm.price || 0);
    var lineTotal = itm.subtotal !== undefined ? Number(itm.subtotal) : (itm.total !== undefined ? Number(itm.total) : qty * price);
    var variantInfo = itm.variant ? ("<br/><span style='font-size:12px;color:#6b7280;'>" + escapeHtml(itm.variant) + "</span>") : "";

    rowsHtml += "<tr>" +
      "<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;'>" + escapeHtml(itm.name || "Item") + variantInfo + "</td>" +
      "<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;color:#374151;'>" + qty + "</td>" +
      "<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;color:#374151;'>$" + price.toFixed(2) + "</td>" +
      "<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;font-weight:600;color:#064e3b;'>$" + lineTotal.toFixed(2) + "</td>" +
      "</tr>";
  }

  var shippingInfo = formatAddressBlock(data.shipping || data.shippingAddress);
  var billingInfo = formatAddressBlock(data.billing || data.billingAddress);

  return "<div style='font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);'>" +
    "<div style='background:#064e3b;padding:24px 28px;color:#ffffff;'>" +
      "<h1 style='margin:0;font-size:22px;letter-spacing:-0.02em;'>Global Herbs Inc.</h1>" +
      "<p style='margin:6px 0 0;font-size:14px;opacity:0.9;'>Dispensary Notification Desk &bull; #" + escapeHtml(refId) + "</p>" +
    "</div>" +
    "<div style='padding:24px 28px;'>" +
      "<div style='display:flex;margin-bottom:20px;padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;'>" +
        "<span style='font-size:14px;color:#166534;font-weight:600;'>Status: " + escapeHtml(status) + "</span>" +
      "</div>" +
      "<table style='width:100%;margin-bottom:20px;border-collapse:collapse;font-size:14px;'>" +
        "<tr><td style='padding:4px 0;color:#6b7280;width:130px;'>Customer Name:</td><td style='padding:4px 0;font-weight:600;color:#111827;'>" + escapeHtml(custName) + "</td></tr>" +
        "<tr><td style='padding:4px 0;color:#6b7280;'>Customer Email:</td><td style='padding:4px 0;font-weight:600;color:#111827;'><a href='mailto:" + escapeHtml(custEmail) + "' style='color:#059669;text-decoration:none;'>" + escapeHtml(custEmail || "Not provided") + "</a></td></tr>" +
        "<tr><td style='padding:4px 0;color:#6b7280;'>Customer Phone:</td><td style='padding:4px 0;color:#111827;'>" + escapeHtml(custPhone) + "</td></tr>" +
        (data.paymentMethod ? "<tr><td style='padding:4px 0;color:#6b7280;'>Payment:</td><td style='padding:4px 0;color:#111827;'>" + escapeHtml(data.paymentMethod) + " (" + escapeHtml(data.paymentStatus || "Pending") + ")</td></tr>" : "") +
      "</table>" +
      (rowsHtml ? (
        "<table style='width:100%;border-collapse:collapse;margin:20px 0;'>" +
          "<thead><tr style='background:#f9fafb;border-bottom:2px solid #e5e7eb;'>" +
            "<th style='padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#4b5563;'>Product</th>" +
            "<th style='padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#4b5563;'>Qty</th>" +
            "<th style='padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#4b5563;'>Price</th>" +
            "<th style='padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#4b5563;'>Total</th>" +
          "</tr></thead>" +
          "<tbody>" + rowsHtml + "</tbody>" +
        "</table>" +
        "<div style='text-align:right;padding:12px 0;border-top:2px solid #e5e7eb;margin-bottom:20px;'>" +
          "<span style='font-size:18px;font-weight:700;color:#064e3b;'>Total: $" + total.toFixed(2) + " " + escapeHtml(currency) + "</span>" +
        "</div>"
      ) : "") +
      (shippingInfo ? (
        "<div style='margin-bottom:16px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;'>" +
          "<h3 style='margin:0 0 6px;font-size:13px;text-transform:uppercase;color:#4b5563;letter-spacing:0.04em;'>Delivery Address</h3>" +
          "<p style='margin:0;font-size:14px;color:#1f2937;white-space:pre-line;line-height:1.5;'>" + escapeHtml(shippingInfo) + "</p>" +
        "</div>"
      ) : "") +
      (data.notes ? (
        "<div style='margin-bottom:16px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;'>" +
          "<h3 style='margin:0 0 6px;font-size:13px;text-transform:uppercase;color:#4b5563;letter-spacing:0.04em;'>Notes & Details</h3>" +
          "<pre style='margin:0;font-size:13px;color:#374151;white-space:pre-wrap;font-family:inherit;line-height:1.5;'>" + escapeHtml(String(data.notes)) + "</pre>" +
        "</div>"
      ) : "") +
    "</div>" +
    "<div style='background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;'>" +
      "Global Herbs Inc. &bull; Dispensary Care &bull; <a href='https://globalherbs.site' style='color:#059669;text-decoration:none;'>globalherbs.site</a>" +
    "</div>" +
  "</div>";
}

function formatAddressBlock(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  if (typeof addr === "object") {
    var parts = [];
    if (addr.name) parts.push(addr.name);
    if (addr.company) parts.push(addr.company);
    if (addr.address || addr.street || addr.street1) parts.push(addr.address || addr.street || addr.street1);
    if (addr.street2) parts.push(addr.street2);
    var cityStateZip = [addr.city, addr.state, addr.postalCode || addr.zipCode || addr.zip].filter(Boolean).join(", ");
    if (cityStateZip) parts.push(cityStateZip);
    if (addr.country) parts.push(addr.country);
    return parts.join("\n");
  }
  return "";
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Self-Test Function: Run directly in script.google.com to verify delivery to globalherbsinc@gmail.com
 */
function testSendToGlobalHerbs() {
  var testData = {
    orderId: "TEST-" + Math.floor(100000 + Math.random() * 900000),
    orderDate: new Date().toISOString(),
    status: "Verification Diagnostic",
    subject: "Global Herbs Mail System Verification — " + new Date().toLocaleTimeString(),
    to: ADMIN_RECIPIENT_EMAIL,
    recipient: ADMIN_RECIPIENT_EMAIL,
    customer: {
      name: "Global Herbs Quality Assurance",
      email: ADMIN_RECIPIENT_EMAIL,
      phone: "+1 (213) 280-1161"
    },
    items: [
      { name: "Organic Blue Dream (3.5g)", quantity: 1, price: 45.00, subtotal: 45.00 }
    ],
    totals: { total: 45.00, currency: "USD" },
    shipping: { address: "Dispensary Order Desk", city: "Los Angeles", state: "CA", country: "United States" },
    notes: "Self-test executed from Google Apps Script editor to confirm delivery to globalherbsinc@gmail.com."
  };

  var mockEvent = { postData: { contents: JSON.stringify(testData) } };
  var response = doPost(mockEvent);
  Logger.log("Response: " + response.getContent());
}
