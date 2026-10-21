import type { IncomingMessage, ServerResponse } from 'http';
import { blogStorage } from '../src/server/blog/blogStorage';
import { generateSitemapXML } from '../src/utils/sitemap';
import fs from 'fs';
import path from 'path';

/**
 * Dynamic sitemap generator for Vercel
 * Dynamically queries published articles without requiring a writable production disk.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // 1. Get live published articles from persistent database
    let publishedArticles = blogStorage.getPublishedArticles();

    // If cache not yet hydrated, attempt refresh
    if (publishedArticles.length === 0) {
      await blogStorage.refreshFromDatabase();
      publishedArticles = blogStorage.getPublishedArticles();
    }

    const xml = generateSitemapXML(publishedArticles);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=600');
    res.end(xml);
  } catch (err: any) {
    console.error('[Sitemap Handler] Error generating dynamic sitemap:', err);

    // Fallback to static build-time sitemap if available
    try {
      const staticPath = path.join(process.cwd(), 'dist/sitemap.xml');
      if (fs.existsSync(staticPath)) {
        const staticXml = fs.readFileSync(staticPath, 'utf-8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.end(staticXml);
        return;
      }
    } catch {}

    // Final emergency fallback using baseline
    const fallbackXml = generateSitemapXML();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end(fallbackXml);
  }
}
