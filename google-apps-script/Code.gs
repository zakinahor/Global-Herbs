/**
 * Google Apps Script — Order & Form Notification Service
 *
 * Deployed as a Web App (`doPost`) executing as the account owner (`zakinahor692@gmail.com`).
 * Handles:
 * 1. Admin Order Notifications (with full billing, shipping, line items, financials, payment & status metadata)
 * 2. Customer Order Confirmation Emails
 * 3. Customer Form & Inquiry Notifications (Contact, Support, B2B Sample, Wholesale, Review, Newsletter, Auth)
 */

var ADMIN_RECIPIENT_EMAIL = "zakinahor692@gmail.com";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "Missing request body" });
    }

    var data = JSON.parse(e.postData.contents);

    if (!data.orderId) {
      return createJsonResponse({ status: "error", message: "Missing required field: orderId" });
    }

    // Target recipient: defaults to ADMIN_RECIPIENT_EMAIL unless explicitly overridden (e.g., customer confirmation)
    var recipientEmail = sanitizeEmail(data.to || data.recipientEmail || ADMIN_RECIPIENT_EMAIL);
    if (!recipientEmail) {
      return createJsonResponse({ status: "error", message: "Invalid recipient email address" });
    }

    var subject = data.subject || ("New Order #" + data.orderId + " — " + (data.customerName || "Customer") + " — $" + Number(data.total || 0).toFixed(2));
    var htmlBody = data.html || buildHtmlEmail(data);
    var plainBody = data.text || buildPlainTextEmail(data);

    var mailOptions = {
      to: recipientEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: "Global Herbs Inc."
    };

    var customerReplyTo = sanitizeEmail(data.customerEmail);
    if (customerReplyTo && recipientEmail === ADMIN_RECIPIENT_EMAIL) {
      mailOptions.replyTo = customerReplyTo;
    }

    MailApp.sendEmail(mailOptions);

    return createJsonResponse({
      status: "success",
      orderId: data.orderId,
      recipient: recipientEmail,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({
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
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : "";
}

function buildPlainTextEmail(data) {
  var lines = [];
  lines.push("==================================================");
  lines.push("GLOBAL HERBS INC. — NOTIFICATION");
  lines.push("==================================================");
  lines.push("Reference ID:   " + (data.orderId || "N/A"));
  lines.push("Date/Time:      " + (data.orderDate || new Date().toISOString()));
  lines.push("Customer Name:  " + (data.customerName || "N/A"));
  lines.push("Customer Email: " + (data.customerEmail || "N/A"));
  lines.push("Customer Phone: " + (data.customerPhone || "Not provided"));
  lines.push("Order Status:   " + (data.orderStatus || "Confirmed"));
  lines.push("Payment Method: " + (data.paymentMethod || "N/A"));
  lines.push("Payment Status: " + (data.paymentStatus || "N/A"));
  if (data.transactionId) {
    lines.push("Transaction ID: " + data.transactionId);
  }
  lines.push("");
  lines.push("--- ITEMS ---");
  var items = Array.isArray(data.items) ? data.items : [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var qty = Number(item.quantity || 1);
    var price = Number(item.price || 0);
    var lineTotal = item.lineTotal !== undefined ? Number(item.lineTotal) : qty * price;
    lines.push((i + 1) + ". " + (item.name || "Item") + " (Qty: " + qty + ") @ $" + price.toFixed(2) + " = $" + lineTotal.toFixed(2));
  }
  lines.push("");
  lines.push("Total: $" + Number(data.total || 0).toFixed(2) + " " + (data.currency || "USD"));
  lines.push("");
  lines.push("--- DELIVERY / DETAILS ---");
  if (typeof data.shipping === "string") {
    lines.push(data.shipping);
  } else if (data.shipping && typeof data.shipping === "object") {
    lines.push([data.shipping.address, data.shipping.city, data.shipping.state, data.shipping.zip, data.shipping.country].filter(Boolean).join(", "));
  }
  if (data.notes) {
    lines.push("");
    lines.push("--- NOTES ---");
    lines.push(data.notes);
  }
  return lines.join("\n");
}

function buildHtmlEmail(data) {
  var items = Array.isArray(data.items) ? data.items : [];
  var rowsHtml = "";
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var qty = Number(item.quantity || 1);
    var price = Number(item.price || 0);
    var lineTotal = item.lineTotal !== undefined ? Number(item.lineTotal) : qty * price;
    rowsHtml += "<tr>" +
      "<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>" + escapeHtml(item.name || "Item") + "</td>" +
      "<td style='padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;'>" + qty + "</td>" +
      "<td style='padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;'>$" + price.toFixed(2) + "</td>" +
      "<td style='padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;'>$" + lineTotal.toFixed(2) + "</td>" +
      "</tr>";
  }

  var shippingText = "";
  if (typeof data.shipping === "string") {
    shippingText = data.shipping;
  } else if (data.shipping && typeof data.shipping === "object") {
    shippingText = [data.shipping.address, data.shipping.city, data.shipping.state, data.shipping.zip, data.shipping.country].filter(Boolean).join(", ");
  }

  return "<div style='font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;'>" +
    "<h2 style='color:#064e3b;margin-top:0;'>Global Herbs Inc. — Order / Form Notification</h2>" +
    "<p><strong>Reference ID:</strong> " + escapeHtml(String(data.orderId || "")) + "</p>" +
    "<p><strong>Customer:</strong> " + escapeHtml(String(data.customerName || "")) + " (" + escapeHtml(String(data.customerEmail || "")) + ")</p>" +
    "<p><strong>Phone:</strong> " + escapeHtml(String(data.customerPhone || "Not provided")) + "</p>" +
    "<table style='width:100%;border-collapse:collapse;margin:16px 0;'>" +
    "<thead><tr style='background:#f3f4f6;'>" +
    "<th style='padding:8px;text-align:left;'>Item / Detail</th>" +
    "<th style='padding:8px;text-align:center;'>Qty</th>" +
    "<th style='padding:8px;text-align:right;'>Unit Price</th>" +
    "<th style='padding:8px;text-align:right;'>Total</th>" +
    "</tr></thead><tbody>" + rowsHtml + "</tbody></table>" +
    "<p style='font-size:16px;font-weight:bold;'>Total: $" + Number(data.total || 0).toFixed(2) + " " + escapeHtml(String(data.currency || "USD")) + "</p>" +
    "<hr style='border:none;border-top:1px solid #e5e7eb;margin:16px 0;'/>" +
    "<h3 style='font-size:14px;color:#064e3b;'>Delivery / Additional Information</h3>" +
    "<pre style='white-space:pre-wrap;font-family:Arial,sans-serif;background:#f9fafb;padding:12px;border-radius:6px;border:1px solid #e5e7eb;'>" + escapeHtml(shippingText) + "</pre>" +
    "</div>";
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
