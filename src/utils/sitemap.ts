import { products, categories } from '../data/products';
import { blogArticles } from '../data/blogArticles';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const BASE_URL = 'https://globalherbs.site';

// Non-indexable category slugs (controlled substances, pharmaceuticals, research chemicals, illicit products)
export const NON_INDEXABLE_CATEGORY_SLUGS = new Set([
  'pharmaceuticals',
  'research-chemicals',
  'psychedelics',
]);

// Non-indexable product IDs (illicit substances, prescription/controlled drugs, lab chemicals)
export const NON_INDEXABLE_PRODUCT_IDS = new Set([
  116, 117, 118, 119, 123, 141, 142, 143, 154, 155, 156, 157, 158, 159, 161, 162, 163, 164, 165, 166, 167, 168,
]);

/**
 * Generates structured URL list for sitemap XML output.
 * Ensures clean canonical, non-redirected URLs for search engine compliance.
 * Excludes non-indexable / controlled substances and utility pages.
 */
export function generateSitemapEntries(): SitemapEntry[] {
  const currentDate = new Date().toISOString().split('T')[0];

  const entries: SitemapEntry[] = [
    // Core Canonical Public Pages (8 core indexable landing pages)
    { loc: `${BASE_URL}/`, lastmod: currentDate, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE_URL}/products`, lastmod: currentDate, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/about`, lastmod: currentDate, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/shipping`, lastmod: currentDate, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/returns`, lastmod: currentDate, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/contact`, lastmod: currentDate, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/privacy`, lastmod: currentDate, changefreq: 'yearly', priority: 0.5 },
    { loc: `${BASE_URL}/blog`, lastmod: currentDate, changefreq: 'weekly', priority: 0.8 },
  ];

  // Add Legitimate Category clean URLs (7 cannabis/hemp/CBD/herbal categories)
  categories
    .filter((cat) => !NON_INDEXABLE_CATEGORY_SLUGS.has(cat.slug))
    .forEach((cat) => {
      entries.push({
        loc: `${BASE_URL}/category/${encodeURIComponent(cat.slug)}`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.8,
      });
    });

  // Add Blog Articles clean URLs (3 expert guides)
  blogArticles.forEach((article) => {
    let articleDate = currentDate;
    try {
      if (article.publishedDate) {
        const parsed = new Date(article.publishedDate);
        if (!isNaN(parsed.getTime())) {
          articleDate = parsed.toISOString().split('T')[0];
        }
      }
    } catch {
      articleDate = currentDate;
    }

    entries.push({
      loc: `${BASE_URL}/blog/${encodeURIComponent(article.slug)}`,
      lastmod: articleDate,
      changefreq: 'monthly',
      priority: 0.7,
    });
  });

  // Add Legitimate Product detail clean URLs (170 legitimate cannabis/hemp/CBD/herbal products)
  const seenProductUrls = new Set<string>();
  products
    .filter((product) => {
      if (NON_INDEXABLE_CATEGORY_SLUGS.has(product.categorySlug)) return false;
      if (NON_INDEXABLE_PRODUCT_IDS.has(product.id)) return false;
      return true;
    })
    .forEach((product) => {
      const productSlug = product.slug || String(product.id);
      const loc = `${BASE_URL}/products/${productSlug}`;
      if (!seenProductUrls.has(loc)) {
        seenProductUrls.add(loc);
        entries.push({
          loc,
          lastmod: currentDate,
          changefreq: 'weekly',
          priority: 0.8,
        });
      }
    });

  return entries;
}

/**
 * Generates complete XML string for sitemap.xml
 */
export function generateSitemapXML(): string {
  const entries = generateSitemapEntries();

  const urlNodes = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority.toFixed(1)}</priority>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
