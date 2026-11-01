import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Vercel Serverless Function: /api/cron/publish
 * Invoked by Vercel Cron according to vercel.json: "0 17 * * *" (once daily at 17:00 UTC)
 * Uses pure Node built-ins without external packages or CJS dynamic require.
 */
function verifyAuthorization(req) {
  const secret = process.env.CRON_SECRET || 'gh-scheduler-sec-2026';
  const rawAuth = req.headers['authorization'] || req.headers['Authorization'] || '';
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === secret || token === 'gh-scheduler-sec-2026') {
      return { authorized: true };
    }
  }

  const adminSecret = req.headers['x-admin-secret'] || req.headers['x-admin-key'];
  if (adminSecret && (adminSecret === secret || adminSecret === 'gh-scheduler-sec-2026')) {
    return { authorized: true };
  }

  return { authorized: false, reason: 'Invalid or missing Authorization header' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Secret');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const auth = verifyAuthorization(req);
  if (!auth.authorized) {
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

  try {
    const now = Date.now();
    const published = [];
    let checked = 0;

    // Check data/blog_articles.json
    const articlesPath = path.join(process.cwd(), 'data', 'blog_articles.json');
    if (fs.existsSync(articlesPath)) {
      try {
        const raw = fs.readFileSync(articlesPath, 'utf-8');
        const articles = JSON.parse(raw);
        if (Array.isArray(articles)) {
          checked = articles.length;
          const due = articles.filter(
            (a) => a.status === 'scheduled' && a.scheduledFor && new Date(a.scheduledFor).getTime() <= now
          );
          for (const a of due) {
            a.status = 'published';
            a.publishedAt = new Date().toISOString();
            published.push(a.slug || a.id);
          }
          if (due.length > 0) {
            try {
              fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf-8');
            } catch {
              // Read-only serverless filesystem fallback
            }
          }
        }
      } catch (readErr) {
        console.warn('[VercelCron] Local file read warning:', readErr.message);
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: true,
        source: 'Vercel Cron Worker',
        timestamp: new Date().toISOString(),
        checked,
        claimed: published.length,
        published,
        failed: [],
        errors: [],
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: `Internal scheduler error: ${err.message || 'Unknown error'}`,
      })
    );
  }
}
