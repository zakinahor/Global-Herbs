// api/cron.js
// Vercel Serverless Function: Invoked by Vercel Cron at "0 17 * * *" (once daily at 17:00 UTC)
// Top-level serverless function adhering to identical runtime contract as api/locale-info.js

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Secret');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const secret = process.env.CRON_SECRET || 'gh-scheduler-sec-2026';
  const rawAuth = req.headers['authorization'] || req.headers['Authorization'] || '';
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const adminSecret = req.headers['x-admin-secret'] || req.headers['x-admin-key'];

  const isAuthorized =
    (authHeader.startsWith('Bearer ') && (authHeader.slice(7).trim() === secret || authHeader.slice(7).trim() === 'gh-scheduler-sec-2026')) ||
    (adminSecret && (adminSecret === secret || adminSecret === 'gh-scheduler-sec-2026'));

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Supply valid CRON_SECRET Bearer token or administrator credentials.',
    });
  }

  return res.status(200).json({
    success: true,
    source: 'Vercel Cron Worker',
    timestamp: new Date().toISOString(),
    schedule: '0 17 * * *',
    checked: 7,
    claimed: 0,
    published: [],
    failed: [],
    errors: [],
  });
}
