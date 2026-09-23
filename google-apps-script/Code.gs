/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: GLOBAL HERBS ORDER NOTIFICATION WEB APP
 * ==============================================================================
 *
 * This Google Apps Script acts as the serverless notification endpoint for the
 * Global Herbs Dispensary website.
 *
 * It uses Google's built-in MailApp service to send the order notification
 * directly to the administrator's Gmail inbox (globalherbsinc@gmail.com).
 *
 * KEY FEATURES:
 * 1. ZERO third-party email providers (no Resend, Mailgun, MailerSend, SMTP, etc.).
 * 2. Automatic Reply-To set to the customer's email address.
 * 3. Formats full order details (items, variations, prices, shipping, notes, totals).
 * 4. Displays prominent instruction: "Reply directly to this email to contact the customer."
 * 5. Concurrency lock to safely handle simultaneous orders.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * ------------------------------------------------------------------------------
 * 1. Open Google Apps Script: https://script.google.com
 * 2. Click "New project" and name it: "Global Herbs Order Notifications"
 * 3. Delete any default code in Code.gs, and paste the entire contents of this file.
 * 4. (Optional) In Project Settings -> Script Properties, you can set:
 *      ADMIN_EMAIL = globalherbsinc@gmail.com
 *    If not set, it defaults to globalherbsinc@gmail.com automatically.
 * 5. Click "Deploy" (top right) -> "New deployment"
 * 6. Click the gear icon next to "Select type" and select "Web app"
 * 7. Set:
 *      - Description: "Global Herbs Order Notification Web App"
 *      - Execute as: "Me" (your Google account)
 *      - Who has access: "Anyone"
 * 8. Click "Deploy", review and grant necessary permissions (MailApp).
 * 9. Copy the "Web app URL" (format: https://script.google.com/macros/s/.../exec).
 * 10. Add it to your project environment:
 *       GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"
 *       ADMIN_EMAIL="globalherbsinc@gmail.com"
 * ==============================================================================
 */

// Default administrator recipient email
var DEFAULT_ADMIN_EMAIL = 'globalherbsinc@gmail.com';

/**
 * Handles incoming POST requests from the website checkout system.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for up to 10 seconds to handle concurrent orders safely
    lock.waitLock(10000);
  } catch (lockErr) {
    return createJsonResponse(false, 'Server busy, could not acquire script lock.', 503);
  }

  try {
    // 1. Verify that request body is present
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse(false, 'Bad Request: No post data contents received.', 400);
    }

    // 2. Parse JSON payload
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse(false, 'Bad Request: Malformed JSON in request body.', 400);
    }

    // 3. Extract order data using project structure
    var orderNumber = payload.orderNumber || 'GH-ORDER';
    var orderDate = payload.orderDate || new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    var status = payload.status || 'New Order';

    var customer = payload.customer || {};
    var customerName = (customer.name || 'Valued Customer').trim();
    var customerEmail = (customer.email || '').trim().toLowerCase();
    var customerPhone = (customer.phone || '').trim();

    var items = Array.isArray(payload.items) ? payload.items : [];
    var totals = payload.totals || {};
    var shipping = payload.shipping || {};
    var paymentMethod = payload.paymentMethod || 'Dispensary Direct';
    var notes = (payload.notes || '').trim();

    // 4. Resolve admin recipient email
    var adminEmail = DEFAULT_ADMIN_EMAIL;
    if (payload.recipient && typeof payload.recipient === 'string' && payload.recipient.indexOf('@') !== -1) {
      adminEmail = payload.recipient.trim();
    } else if (payload.adminEmail && typeof payload.adminEmail === 'string' && payload.adminEmail.indexOf('@') !== -1) {
      adminEmail = payload.adminEmail.trim();
    } else {
      try {
        var propEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
        if (propEmail && propEmail.indexOf('@') !== -1) {
          adminEmail = propEmail.trim();
        }
      } catch (propErr) {
        // Use DEFAULT_ADMIN_EMAIL
      }
    }

    // 5. Validate customer email for Reply-To
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var isValidCustomerEmail = emailRegex.test(customerEmail);
    var replyToEmail = isValidCustomerEmail ? customerEmail : null;

    // 6. Build Email Subject & Content
    var isCustomerInquiry = items.length === 0;
    var defaultSubject = isCustomerInquiry
      ? ('[' + status + '] ' + customerName + ' — Customer Message')
      : ('NEW ORDER #' + orderNumber + ' — ' + customerName);
    var subject = payload.subject || defaultSubject;

    var emailContent = buildOrderEmailContent(
      orderNumber,
      orderDate,
      status,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totals,
      shipping,
      paymentMethod,
      notes,
      replyToEmail
    );

    // 7. Send notification using Google's built-in MailApp service
    var mailOptions = {
      to: adminEmail,
      subject: subject,
      body: emailContent.text,
      htmlBody: emailContent.html,
      name: isCustomerInquiry ? 'Global Herbs Contact Desk' : 'Global Herbs Order Desk'
    };

    // If customer email is valid, set Reply-To so admin can click "Reply" directly
    if (replyToEmail) {
      mailOptions.replyTo = replyToEmail;
    }

    MailApp.sendEmail(mailOptions);

    return createJsonResponse(true, 'Order notification successfully dispatched to ' + adminEmail, 200, {
      orderNumber: orderNumber,
      recipient: adminEmail,
      replyTo: replyToEmail
    });

  } catch (err) {
    var errorMsg = err && err.toString ? err.toString() : 'Unknown internal error';
    return createJsonResponse(false, 'Error processing notification: ' + errorMsg, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Health check GET handler
 */
function doGet(e) {
  return createJsonResponse(true, 'Global Herbs Order Notification Web App is active and ready to receive POST requests.', 200);
}

/**
 * Helper to build responsive HTML and plain-text email templates.
 */
function buildOrderEmailContent(
  orderNumber,
  orderDate,
  status,
  customerName,
  customerEmail,
  customerPhone,
  items,
  totals,
  shipping,
  paymentMethod,
  notes,
  replyToEmail
) {
  // Format shipping address string
  var shippingStreet = shipping.address || 'Address not specified';
  var shippingCity = shipping.city || '';
  var shippingState = shipping.state || '';
  var shippingZip = shipping.postalCode || shipping.zipCode || shipping.zip || '';
  var shippingCountry = shipping.country || 'United States';

  var formattedAddress = shippingStreet;
  if (shippingCity || shippingState || shippingZip) {
    formattedAddress += '\n' + [shippingCity, shippingState, shippingZip].filter(Boolean).join(', ');
  }
  if (shippingCountry) {
    formattedAddress += '\n' + shippingCountry;
  }

  // Format financial totals
  var subtotalStr = totals.subtotal ? String(totals.subtotal) : '0.00';
  var discountStr = totals.discount ? String(totals.discount) : '0.00';
  var shippingStr = totals.shipping ? String(totals.shipping) : '0.00';
  var taxStr = totals.tax ? String(totals.tax) : '0.00';
  var totalStr = totals.total ? String(totals.total) : '0.00';

  var discountNum = parseFloat(discountStr.replace(/[^0-9.-]+/g, '')) || 0;
  var shippingNum = parseFloat(shippingStr.replace(/[^0-9.-]+/g, '')) || 0;

  // Build items HTML table rows
  var itemsHtmlRows = '';
  var itemsTextRows = '';

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var itemName = item.name || 'Botanical Product';
    var itemVariant = item.variant || item.weight || item.size || '';
    var itemQty = item.quantity || 1;
    var itemPrice = item.price ? String(item.price) : '0.00';
    var itemSubtotal = item.subtotal ? String(item.subtotal) : '0.00';

    var bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

    itemsHtmlRows += '<tr style="background-color: ' + bg + ';">' +
      '<td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">' +
        '<strong style="color: #0f172a;">' + escapeHtml(itemName) + '</strong>' +
        (itemVariant ? '<div style="font-size: 11px; color: #047857; font-weight: 600;">Option / Weight: ' + escapeHtml(itemVariant) + '</div>' : '') +
      '</td>' +
      '<td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">' + itemQty + '</td>' +
      '<td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">$' + itemPrice + '</td>' +
      '<td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; font-weight: 700; color: #065f46;">$' + itemSubtotal + '</td>' +
    '</tr>';

    itemsTextRows += '• ' + itemName + (itemVariant ? ' (' + itemVariant + ')' : '') +
      ' | Qty: ' + itemQty +
      ' | Price: $' + itemPrice +
      ' | Subtotal: $' + itemSubtotal + '\n';
  }

  var isCustomerInquiry = items.length === 0;

  // HTML Template
  var html = '<!DOCTYPE html>' +
  '<html>' +
  '<head><meta charset="utf-8"></head>' +
  '<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">' +
    '<div style="max-width: 620px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">' +
      // Header
      '<div style="background-color: #065f46; color: #ffffff; padding: 24px; text-align: center;">' +
        '<div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; margin-bottom: 6px;">' +
          (isCustomerInquiry ? 'Customer Contact / Inquiry Desk' : 'Google Apps Script Order Notification') +
        '</div>' +
        '<h1 style="margin: 0; font-size: 22px; font-weight: 800;">' +
          (isCustomerInquiry ? ('CUSTOMER MESSAGE: ' + escapeHtml(status)) : ('NEW ORDER #' + escapeHtml(orderNumber))) +
        '</h1>' +
        '<p style="margin: 6px 0 0 0; font-size: 13px; color: #d1fae5;">' + escapeHtml(customerName) + ' &bull; ' + escapeHtml(orderDate) + '</p>' +
      '</div>' +

      // Prominent Reply-To Instruction
      '<div style="background-color: #ecfdf5; border-left: 5px solid #059669; padding: 14px 18px; font-size: 13px; color: #065f46; line-height: 1.5;">' +
        '<strong>Direct Customer Reply:</strong> Reply directly to this email in your inbox to respond to ' + escapeHtml(customerName) + ' (' + escapeHtml(replyToEmail || customerEmail || 'N/A') + ').' +
      '</div>' +

      '<div style="padding: 24px;">' +
        // Customer & Order Info
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 13px;">' +
          '<tr>' +
            '<td width="50%" style="vertical-align: top; padding-right: 12px;">' +
              '<strong style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Details</strong>' +
              '<p style="margin: 6px 0 0 0; line-height: 1.5;">' +
                '<strong>' + escapeHtml(customerName) + '</strong><br>' +
                '<a href="mailto:' + escapeHtml(customerEmail) + '" style="color: #047857; text-decoration: none;">' + escapeHtml(customerEmail) + '</a><br>' +
                'Phone: ' + escapeHtml(customerPhone || 'Not provided') +
              '</p>' +
            '</td>' +
            '<td width="50%" style="vertical-align: top; padding-left: 12px;">' +
              '<strong style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Order & Payment</strong>' +
              '<p style="margin: 6px 0 0 0; line-height: 1.5;">' +
                'Status: <span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">' + escapeHtml(status) + '</span><br>' +
                'Payment Method: <strong>' + escapeHtml(paymentMethod) + '</strong>' +
              '</p>' +
            '</td>' +
          '</tr>' +
        '</table>' +

        // Shipping Address (Only show for orders)
        (!isCustomerInquiry ?
          '<div style="margin-bottom: 20px; font-size: 13px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">' +
            '<strong style="color: #64748b; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 0.5px;">Shipping Address</strong>' +
            '<div style="white-space: pre-line; line-height: 1.5; color: #0f172a; font-weight: 500;">' + escapeHtml(formattedAddress) + '</div>' +
          '</div>' : '') +

        // Items Table (Only show if items are present)
        (items.length > 0 ?
          '<div style="margin-bottom: 6px;"><strong style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Products Ordered</strong></div>' +
          '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
            '<thead>' +
              '<tr style="background-color: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">' +
                '<th style="padding: 10px 14px; text-align: left;">Product</th>' +
                '<th style="padding: 10px 14px; text-align: center;">Qty</th>' +
                '<th style="padding: 10px 14px; text-align: right;">Price</th>' +
                '<th style="padding: 10px 14px; text-align: right;">Subtotal</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + itemsHtmlRows + '</tbody>' +
          '</table>' : '') +

        // Totals Breakdown (Only show for orders)
        (!isCustomerInquiry ?
          '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px;">' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">' +
              '<span>Order Subtotal:</span>' +
              '<strong>$' + subtotalStr + '</strong>' +
            '</div>' +
            (discountNum > 0 ?
              '<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #15803d;">' +
                '<span>Discount:</span>' +
                '<strong>-$' + discountStr + '</strong>' +
              '</div>' : '') +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">' +
              '<span>Shipping:</span>' +
              '<strong>' + (shippingNum === 0 ? 'FREE Stealth Shipping' : '$' + shippingStr) + '</strong>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">' +
              '<span>Tax:</span>' +
              '<strong>$' + taxStr + '</strong>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; border-top: 2px solid #cbd5e1; padding-top: 10px; color: #065f46;">' +
              '<span>Final Total:</span>' +
              '<span>$' + totalStr + '</span>' +
            '</div>' +
          '</div>' : '') +

        // Customer Notes / Message
        (notes ?
          '<div style="margin-top: ' + (isCustomerInquiry ? '0' : '20px') + '; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px; font-size: 13px; color: #713f12;">' +
            '<strong style="display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px;">' +
              (isCustomerInquiry ? 'Customer Details & Message:' : 'Customer Notes:') +
            '</strong>' +
            '<div style="white-space: pre-wrap; font-family: monospace, sans-serif; font-size: 12px; line-height: 1.6; color: #1c1917;">' + escapeHtml(notes) + '</div>' +
          '</div>' : '') +
      '</div>' +

      // Footer
      '<div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">' +
        'Global Herbs Dispensary Notification System &bull; Powered by Google Apps Script (MailApp)<br>' +
        'Reply directly to this email to contact the customer.' +
      '</div>' +
    '</div>' +
  '</body>' +
  '</html>';

  // Plain Text Template
  var text = (isCustomerInquiry ? ('CUSTOMER MESSAGE: ' + status) : ('NEW ORDER #' + orderNumber)) + '\n' +
    '==================================================\n' +
    'Reply directly to this email in your inbox to respond to ' + customerName + ' (' + (replyToEmail || customerEmail || 'N/A') + ').\n\n' +
    'Date: ' + orderDate + '\n' +
    'Status: ' + status + '\n' +
    'Channel: ' + paymentMethod + '\n\n' +
    'CUSTOMER INFORMATION\n' +
    '--------------------\n' +
    'Name: ' + customerName + '\n' +
    'Email: ' + customerEmail + '\n' +
    'Phone: ' + (customerPhone || 'Not provided') + '\n\n' +
    (!isCustomerInquiry ? ('SHIPPING ADDRESS\n----------------\n' + formattedAddress + '\n\n') : '') +
    (items.length > 0 ? ('PRODUCTS ORDERED\n----------------\n' + itemsTextRows + '\n') : '') +
    (!isCustomerInquiry ? ('TOTALS\n------\nSubtotal: $' + subtotalStr + '\n' + (discountNum > 0 ? 'Discount: -$' + discountStr + '\n' : '') + 'Shipping: $' + shippingStr + '\nTax: $' + taxStr + '\nFinal Total: $' + totalStr + '\n\n') : '') +
    (notes ? (isCustomerInquiry ? '\nCUSTOMER MESSAGE & DETAILS:\n' : '\nCUSTOMER NOTES:\n') + notes + '\n' : '');

  return { html: html, text: text };
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createJsonResponse(success, message, statusCode, data) {
  var responseObj = {
    success: success,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
  if (data) {
    responseObj.data = data;
  }
  return ContentService.createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}
