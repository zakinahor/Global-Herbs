// api/blog-handler.js
// Vercel Serverless Function for /api/blog and /api/blog/:slug
// Self-contained, zero external database dependencies.

import fs from 'fs';
import path from 'path';

function loadArticles() {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'data/blog_articles.json'),
      path.join('/tmp', 'data/blog_articles.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('[Blog Handler] Error loading blog articles:', err);
  }
  return [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const articles = loadArticles();
  const published = articles.filter((a) => !a.status || a.status === 'published');

  // Route: /api/blog/:slug or /api/blog/article/:slug
  const parts = pathname.split('/').filter(Boolean);
  // e.g. ['api', 'blog', 'slug-name']
  if (parts.length >= 3 && parts[1] === 'blog') {
    const slug = decodeURIComponent(parts[2]).toLowerCase();
    const article = published.find((a) => (a.slug && a.slug.toLowerCase() === slug) || (a.id && a.id.toLowerCase() === slug));
    if (article) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.end(JSON.stringify(article));
      return;
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Article not found' }));
      return;
    }
  }

  // Route: /api/blog (list articles)
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('q');

  let filtered = [...published];
  if (category && category !== 'All') {
    filtered = filtered.filter((a) => a.category === category || a.categorySlug === category);
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter((a) => {
      const inTitle = (a.title || '').toLowerCase().includes(q);
      const inExcerpt = (a.excerpt || '').toLowerCase().includes(q);
      const inKeywords = (a.targetKeywords || []).some((kw) => (kw || '').toLowerCase().includes(q));
      return inTitle || inExcerpt || inKeywords;
    });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.end(JSON.stringify(filtered));
}
