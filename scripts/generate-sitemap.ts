import fs from 'fs';
import path from 'path';
import { generateSitemapXML } from '../src/utils/sitemap';
import { blogArticles } from '../src/data/blogArticles';

function buildSitemap() {
  let published = blogArticles;
  try {
    const dynamicPath = path.join(process.cwd(), 'data/blog_articles.json');
    if (fs.existsSync(dynamicPath)) {
      const parsed = JSON.parse(fs.readFileSync(dynamicPath, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        published = parsed.filter((a: any) => a.status === 'published');
      }
    }
  } catch (e) {
    console.warn('[Sitemap Generator] Using baseline articles:', e);
  }

  const xml = generateSitemapXML(published);
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const targetPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(targetPath, xml, 'utf8');
  console.log(`[Sitemap Generator] Wrote sitemap XML (${published.length} blog articles) to ${targetPath}`);
}

buildSitemap();
