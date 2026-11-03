import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Dynamic / Static sitemap generator for Vercel
 * Serves canonical sitemap without requiring database connections or runtime compilations.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'dist/sitemap.xml'),
      path.join(process.cwd(), 'public/sitemap.xml'),
      path.join(process.cwd(), 'sitemap.xml'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const xml = fs.readFileSync(p, 'utf-8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        res.end(xml);
        return;
      }
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Sitemap file not found.');
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Error retrieving sitemap: ${err?.message || 'Unknown error'}`);
  }
}
