import type { IncomingMessage, ServerResponse } from 'http';
import { claimAndPublishDueArticles } from '../../src/server/blog/blogPublisher';
import { verifyCronAuthorization, verifyAdminSession } from '../../src/server/blog/cronAuth';

/**
 * Vercel Serverless Function: /api/cron/publish
 * Invoked by Vercel Cron according to vercel.json schedule.
 * Accepts GET and POST requests.
 * Secured with CRON_SECRET Bearer token (timing-safe comparison).
 */
export default async function handler(req: IncomingMessage & { query?: any; body?: any }, res: ServerResponse & { status: (code: number) => any; json: (data: any) => any; setHeader: (k: string, v: string) => any }) {
  // Set CORS & security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Secret, X-User-Email');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const cronAuth = verifyCronAuthorization(req);
  const isAdmin = verifyAdminSession(req);

  if (!cronAuth.authorized && !isAdmin) {
    console.warn('[VercelCron] Unauthorized invocation attempt:', cronAuth.reason);
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

  const source = cronAuth.authorized ? 'Vercel Cron Worker' : 'Administrator Manual Webhook';
  console.log(`[VercelCron] Executing scheduled publishing run via ${source}...`);

  try {
    const result = await claimAndPublishDueArticles(source, 5);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: true,
        source,
        timestamp: new Date().toISOString(),
        ...result,
      })
    );
  } catch (err: any) {
    console.error('[VercelCron] Execution failure:', err);
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
