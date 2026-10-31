import { products, categories } from '../data/products';
import { blogArticles } from '../data/blogArticles';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

const BASE_URL = 'https://globalherbs.site';
const CURRENT_RELEASE_LASTMOD = '2026-10-31';
const POLICY_LASTMOD = '2026-10-29';

function parseIsoDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }
  return undefined;
}

// Non-indexable category slugs (controlled substances, pharmaceuticals, research chemicals, illicit products)
export const NON_INDEXABLE_CATEGORY_SLUGS = new Set([
  'benzodiazepines',
  'buy-peptide-weight-loss',
  'dmt',
  'lsd',
  'magic-mushroom',
  'mdma',
  'oxycodone',
  'painkillers-drugs',
  'psychedelic',
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
export function generateSitemapEntries(customArticles?: Array<{ slug: string; updatedAt?: string; publishedDate?: string }>): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    // Canonical public pages. /shop and /terms-conditions are aliases and stay out.
    { loc: `${BASE_URL}/`, lastmod: CURRENT_RELEASE_LASTMOD },
    { loc: `${BASE_URL}/products`, lastmod: CURRENT_RELEASE_LASTMOD },
    { loc: `${BASE_URL}/about`, lastmod: CURRENT_RELEASE_LASTMOD },
    { loc: `${BASE_URL}/shipping`, lastmod: POLICY_LASTMOD },
    { loc: `${BASE_URL}/returns`, lastmod: POLICY_LASTMOD },
    { loc: `${BASE_URL}/contact`, lastmod: CURRENT_RELEASE_LASTMOD },
    { loc: `${BASE_URL}/privacy`, lastmod: POLICY_LASTMOD },
    { loc: `${BASE_URL}/terms`, lastmod: POLICY_LASTMOD },
    { loc: `${BASE_URL}/blog`, lastmod: CURRENT_RELEASE_LASTMOD },
  ];

  // Exclude categories marked noindex by SEOHead.
  categories
    .filter((cat) => !NON_INDEXABLE_CATEGORY_SLUGS.has(cat.slug))
    .forEach((cat) => {
      entries.push({
        loc: `${BASE_URL}/category/${encodeURIComponent(cat.slug)}`,
        lastmod: CURRENT_RELEASE_LASTMOD,
      });
    });

  // Blog article URLs (published only).
  const articlesToInclude = customArticles || blogArticles;
  articlesToInclude.forEach((article) => {
    const lastmod =
      parseIsoDate((article as any).updatedAt) ||
      parseIsoDate((article as any).publishedDate) ||
      CURRENT_RELEASE_LASTMOD;

    entries.push({
      loc: `${BASE_URL}/blog/${encodeURIComponent(article.slug)}`,
      lastmod,
    });
  });

  // Product URLs. Keep these aligned with the category and product noindex rules above.
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
          lastmod: CURRENT_RELEASE_LASTMOD,
        });
      }
    });

  return entries;
}

/**
 * Generates complete XML string for sitemap.xml
 */
export function generateSitemapXML(customArticles?: Array<{ slug: string; updatedAt?: string; publishedDate?: string }>): string {
  const entries = generateSitemapEntries(customArticles);

  const urlNodes = entries
    .map((entry) => {
      const locTag = `    <loc>${escapeXml(entry.loc)}</loc>`;
      const lastmodTag = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '';
      return `  <url>\n${locTag}${lastmodTag}\n  </url>`;
    })
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
