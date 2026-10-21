// api/notification-status.js
// Vercel Serverless Function to report mailing/notification system health & configuration

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'globalherbsinc@gmail.com';
  const emailFrom = process.env.EMAIL_FROM?.trim() || 'globalherbsinc@gmail.com';

  return res.status(200).json({
    provider: 'Google Apps Script (MailApp)',
    configured: Boolean(scriptUrl),
    adminEmail,
    emailFrom,
    hasScriptUrl: Boolean(scriptUrl),
    maskedUrl: scriptUrl ? `${scriptUrl.substring(0, 35)}...` : 'NOT_SET',
    status: scriptUrl ? 'OPERATIONAL' : 'UNCONFIGURED',
    timestamp: new Date().toISOString(),
  });
}
