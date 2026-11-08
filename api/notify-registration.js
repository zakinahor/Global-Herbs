// api/notify-registration.js
// Vercel Serverless Function to notify administrator of new customer registrations

function parseRequestBody(req) {
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

function getAppsScriptUrl() {
  if (typeof process !== 'undefined' && process.env?.GOOGLE_APPS_SCRIPT_URL) {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL.trim();
    if (url.startsWith('https://script.google.com/')) return url;
  }
  return null;
}

function getAdminRecipientEmail() {
  if (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    if (email && email.includes('@')) return email;
  }
  return 'globalherbsinc@gmail.com';
}

export default async function handler(req, res) {
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

  try {
    const body = req.body || (await parseRequestBody(req));
    const { name, email, phone, accountStatus, accountType, customerId } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'A valid email address is required.' }));
      return;
    }

    const cleanName = (name || 'New Registered Customer').trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanStatus = (accountStatus || 'Active (Verification Pending)').trim();
    const cleanType = (accountType || 'Personal / Recreational').trim();

    const now = new Date();
    const regDate = now.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const regTime = now.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    const subject = 'NEW CUSTOMER REGISTRATION – GLOBAL HERBS';

    const plainText = [
      'A new customer has successfully registered on Global Herbs.',
      '',
      'Customer Details:',
      '',
      `- Full Name: ${cleanName}`,
      `- Email Address: ${cleanEmail}`,
      `- Registration Date: ${regDate}`,
      `- Registration Time: ${regTime}`,
      `- Account Status: ${cleanStatus}`,
      '',
      'Website: https://globalherbs.site',
      '',
      'This notification is for administrative purposes only.',
    ].join('\n');

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
    <div style="background:#064e3b;padding:24px;color:#ffffff;text-align:left;">
      <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">GLOBAL HERBS</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.9;text-transform:uppercase;letter-spacing:0.05em;">New Customer Registration Alert</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111827;">
        A new customer has successfully registered on <strong>Global Herbs</strong>.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
        <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#4b5563;">Customer Details</h3>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;width:150px;">Full Name:</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;">${cleanName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Email Address:</td>
            <td style="padding:6px 0;font-weight:600;color:#059669;"><a href="mailto:${cleanEmail}" style="color:#059669;text-decoration:none;">${cleanEmail}</a></td>
          </tr>
          ${cleanPhone ? `<tr><td style="padding:6px 0;color:#6b7280;">Phone:</td><td style="padding:6px 0;color:#111827;">${cleanPhone}</td></tr>` : ''}
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Registration Date:</td>
            <td style="padding:6px 0;color:#111827;">${regDate}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Registration Time:</td>
            <td style="padding:6px 0;color:#111827;">${regTime}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Account Status:</td>
            <td style="padding:6px 0;font-weight:600;color:#059669;">${cleanStatus}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Account Type:</td>
            <td style="padding:6px 0;color:#111827;">${cleanType}</td>
          </tr>
          ${customerId ? `<tr><td style="padding:6px 0;color:#6b7280;">Customer ID:</td><td style="padding:6px 0;font-family:monospace;color:#6b7280;">${customerId}</td></tr>` : ''}
        </table>
      </div>
      <p style="margin:20px 0 8px;font-size:14px;color:#374151;">
        Website: <a href="https://globalherbs.site" style="color:#059669;font-weight:600;text-decoration:none;">https://globalherbs.site</a>
      </p>
      <p style="margin:0;font-size:12px;color:#9ca3af;font-style:italic;">
        This notification is for administrative purposes only.
      </p>
    </div>
    <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
      Global Herbs Inc. &bull; Dispensary Administration &bull; <a href="https://globalherbs.site" style="color:#059669;text-decoration:none;">globalherbs.site</a>
    </div>
  </div>
</body>
</html>`;

    const adminEmail = getAdminRecipientEmail();
    const scriptUrl = getAppsScriptUrl();

    let notificationStatus = 'pending';
    let notificationMessageId = null;

    if (scriptUrl) {
      try {
        const payload = {
          orderNumber: `REG-${Date.now().toString(36).toUpperCase()}`,
          orderDate: `${regDate} ${regTime}`,
          status: 'Customer Registration',
          subject,
          text: plainText,
          html: htmlBody,
          recipient: adminEmail,
          to: adminEmail,
          adminEmail,
          customer: {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone || 'Not provided',
          },
          items: [
            {
              name: `Customer Registration: ${cleanName}`,
              variant: cleanType,
              quantity: 1,
              price: '0.00',
              subtotal: '0.00',
            },
          ],
          totals: {
            subtotal: '0.00',
            discount: '0.00',
            shipping: '0.00',
            tax: '0.00',
            total: '0.00',
            currency: 'USD',
          },
          notes: plainText,
        };

        const postRes = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        if (postRes.ok) {
          notificationStatus = 'sent';
          notificationMessageId = `gas-reg-${Date.now()}`;
        } else {
          notificationStatus = 'failed';
        }
      } catch (e) {
        console.warn('[Vercel Registration Notif] Fetch warning:', e);
        notificationStatus = 'failed';
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: true,
        message: 'Registration notification processed.',
        recipient: adminEmail,
        notificationStatus,
        notificationMessageId,
      })
    );
  } catch (err) {
    console.error('[Vercel Registration Notif Error]', err);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err?.message || 'Server error', notificationStatus: 'failed' }));
  }
}
