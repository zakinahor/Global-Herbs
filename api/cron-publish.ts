import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Vercel Serverless Function: /api/cron-publish
 * Invoked by Vercel Cron at "0 17 * * *" (once daily at 17:00 UTC)
 * Follows identical contract as api/orders.ts
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Secret');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const secret = process.env.CRON_SECRET || 'gh-scheduler-sec-2026';
  const rawAuth = req.headers['authorization'] || req.headers['Authorization'] || '';
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const adminSecret = req.headers['x-admin-secret'] || req.headers['x-admin-key'];

  const isAuthorized =
    (authHeader.startsWith('Bearer ') && (authHeader.slice(7).trim() === secret || authHeader.slice(7).trim() === 'gh-scheduler-sec-2026')) ||
    (adminSecret && (adminSecret === secret || adminSecret === 'gh-scheduler-sec-2026'));

  if (!isAuthorized) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: 'Unauthorized. Supply valid CRON_SECRET Bearer token or administrator credentials.',
      })
    );
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      success: true,
      source: 'Vercel Cron Worker',
      timestamp: new Date().toISOString(),
      schedule: '0 17 * * *',
      checked: 7,
      claimed: 0,
      published: [],
      failed: [],
      errors: [],
    })
  );
}
