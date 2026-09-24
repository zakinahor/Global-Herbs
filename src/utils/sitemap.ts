import { products, categories } from '../data/products';
import { blogArticles } from '../data/blogArticles';

export interface SitemapEntry {
  loc: string;
}

const BASE_URL = 'https://globalherbs.site';

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
export function generateSitemapEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    // Canonical public pages. /shop and /terms-conditions are aliases and stay out.
    { loc: `${BASE_URL}/` },
    { loc: `${BASE_URL}/products` },
    { loc: `${BASE_URL}/about` },
    { loc: `${BASE_URL}/shipping` },
    { loc: `${BASE_URL}/returns` },
    { loc: `${BASE_URL}/contact` },
    { loc: `${BASE_URL}/privacy` },
    { loc: `${BASE_URL}/terms` },
    { loc: `${BASE_URL}/blog` },
  ];

  // Exclude categories marked noindex by SEOHead.
  categories
    .filter((cat) => !NON_INDEXABLE_CATEGORY_SLUGS.has(cat.slug))
    .forEach((cat) => {
      entries.push({
        loc: `${BASE_URL}/category/${encodeURIComponent(cat.slug)}`,
      });
    });

  // Blog article URLs.
  blogArticles.forEach((article) => {
    entries.push({
      loc: `${BASE_URL}/blog/${encodeURIComponent(article.slug)}`,
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
