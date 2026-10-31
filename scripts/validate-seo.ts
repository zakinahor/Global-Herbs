/**
 * scripts/validate-seo.ts
 *
 * Comprehensive Technical SEO Validation Suite for Global Herbs (https://globalherbs.site)
 * Validates:
 * 1. Sitemap XML syntax, URL count, and complete indexable coverage.
 * 2. Canonical URL alignment and strict exclusion of noindex/utility/duplicate/redirect URLs.
 * 3. Prerendered HTML integrity: Titles, meta descriptions, canonical tags, and robots directives.
 * 4. Schema.org JSON-LD structured data (Product, Offer, Shipping, Returns, BreadcrumbList, BlogPosting, WebSite, Org).
 * 5. Internal link graph integrity (crawlable <a> links connecting blog, categories, and products without 404s).
 * 6. Robots.txt configuration and Googlebot access.
 * 7. HTTP status code verification for canonical 200 OK and genuine 404 Not Found.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { generateSitemapEntries, NON_INDEXABLE_CATEGORY_SLUGS, NON_INDEXABLE_PRODUCT_IDS } from '../src/utils/sitemap';
import { products, categories } from '../src/data/products';
import { blogArticles } from '../src/data/blogArticles';

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
}

const results: ValidationResult[] = [];

function record(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', details?: string) {
  results.push({ category, test, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${test}${details ? ` -> ${details}` : ''}`);
}

async function runValidation() {
  console.log('\n======================================================');
  console.log('🔍 GLOBAL HERBS TECHNICAL SEO VALIDATION SUITE');
  console.log('   Target: https://globalherbs.site');
  console.log('======================================================\n');

  const distDir = path.resolve(process.cwd(), 'dist');
  const sitemapPath = path.resolve(distDir, 'sitemap.xml');
  const robotsPath = path.resolve(distDir, 'robots.txt');

  // --------------------------------------------------------------------------
  // 1. SITEMAP VALIDATION
  // --------------------------------------------------------------------------
  console.log('--- 1. SITEMAP VALIDATION ---');
  if (!fs.existsSync(sitemapPath)) {
    record('Sitemap', 'sitemap.xml exists in dist', 'FAIL', 'dist/sitemap.xml missing. Run build first.');
    return;
  }
  record('Sitemap', 'sitemap.xml exists in dist', 'PASS');

  const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');

  // Check valid XML declaration and schema
  if (sitemapXml.includes('<?xml version="1.0" encoding="UTF-8"?>') && sitemapXml.includes('schemas/sitemap/0.9')) {
    record('Sitemap', 'XML declaration and namespace valid', 'PASS');
  } else {
    record('Sitemap', 'XML declaration and namespace valid', 'FAIL', 'Missing standard sitemap.org namespace');
  }

  // Extract all <loc> and <lastmod>
  const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const lastmodMatches = [...sitemapXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);

  const uniqueLocs = new Set(locMatches);
  if (uniqueLocs.size === locMatches.length) {
    record('Sitemap', 'Zero duplicate URLs in sitemap', 'PASS', `Total: ${locMatches.length} unique URLs`);
  } else {
    record('Sitemap', 'Zero duplicate URLs in sitemap', 'FAIL', `${locMatches.length - uniqueLocs.size} duplicates found`);
  }

  // Validate lastmod formats (YYYY-MM-DD)
  const invalidDates = lastmodMatches.filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));
  if (invalidDates.length === 0) {
    record('Sitemap', 'All lastmod dates match W3C YYYY-MM-DD format', 'PASS', `${lastmodMatches.length} valid dates`);
  } else {
    record('Sitemap', 'All lastmod dates match W3C format', 'FAIL', `Invalid dates: ${invalidDates.slice(0, 3).join(', ')}`);
  }

  // Verify URL counts match indexable counts
  const expectedEntries = generateSitemapEntries();
  if (locMatches.length === expectedEntries.length) {
    record('Sitemap', 'Sitemap coverage matches canonical indexable catalog', 'PASS', `Expected: ${expectedEntries.length}, Found: ${locMatches.length}`);
  } else {
    record('Sitemap', 'Sitemap coverage matches canonical catalog', 'FAIL', `Expected ${expectedEntries.length}, got ${locMatches.length}`);
  }

  // Ensure NO non-indexable or utility routes are in the sitemap
  const disallowedPatterns = [
    '/checkout',
    '/order-tracking',
    '/admin',
    '/cart',
    '/search',
    '/shop',
    '/terms-conditions',
    ...Array.from(NON_INDEXABLE_CATEGORY_SLUGS).map((slug) => `/category/${slug}`),
  ];

  const leaks = locMatches.filter((url) => disallowedPatterns.some((pattern) => url.includes(pattern)));
  if (leaks.length === 0) {
    record('Sitemap', 'Zero utility, duplicate, or non-indexable routes in sitemap', 'PASS');
  } else {
    record('Sitemap', 'Zero utility or non-indexable routes in sitemap', 'FAIL', `Leaked URLs: ${leaks.join(', ')}`);
  }

  // Verify NO non-indexable products in sitemap
  const nonIndexableProductsInSitemap = locMatches.filter((url) => {
    return Array.from(NON_INDEXABLE_PRODUCT_IDS).some((id) => {
      const p = products.find((prod) => prod.id === id);
      return p && (url.endsWith(`/products/${p.slug}`) || url.endsWith(`/products/${p.id}`));
    });
  });

  if (nonIndexableProductsInSitemap.length === 0) {
    record('Sitemap', 'Zero non-indexable/controlled substance products in sitemap', 'PASS');
  } else {
    record('Sitemap', 'Zero non-indexable products in sitemap', 'FAIL', `Leaked: ${nonIndexableProductsInSitemap.join(', ')}`);
  }

  // --------------------------------------------------------------------------
  // 2. ROBOTS.TXT VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. ROBOTS.TXT VALIDATION ---');
  if (fs.existsSync(robotsPath)) {
    const robotsTxt = fs.readFileSync(robotsPath, 'utf-8');
    if (robotsTxt.includes('Sitemap: https://globalherbs.site/sitemap.xml')) {
      record('Robots', 'Robots.txt references canonical sitemap.xml', 'PASS');
    } else {
      record('Robots', 'Robots.txt references canonical sitemap.xml', 'FAIL', 'Missing Sitemap directive');
    }

    if (robotsTxt.includes('User-agent: Googlebot') && robotsTxt.includes('Allow: /')) {
      record('Robots', 'Googlebot explicitly permitted with crawl boundaries', 'PASS');
    } else {
      record('Robots', 'Googlebot explicitly permitted', 'FAIL', 'Missing Googlebot allow rule');
    }

    if (robotsTxt.includes('User-agent: Googlebot-Image') && robotsTxt.includes('Allow: /')) {
      record('Robots', 'Googlebot-Image permitted for product images', 'PASS');
    } else {
      record('Robots', 'Googlebot-Image permitted', 'FAIL', 'Googlebot-Image not explicitly allowed');
    }

    if (!robotsTxt.includes('Disallow: /assets') && !robotsTxt.includes('Disallow: /*.js') && !robotsTxt.includes('Disallow: /*.css')) {
      record('Robots', 'Essential JS, CSS, and asset files are NOT blocked from crawlers', 'PASS');
    } else {
      record('Robots', 'Essential assets not blocked', 'FAIL', 'Found disallow rule blocking critical rendering assets');
    }
  } else {
    record('Robots', 'robots.txt exists in dist', 'FAIL');
  }

  // --------------------------------------------------------------------------
  // 3. PRERENDERED HTML, CANONICALS, & METADATA AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 3. PRERENDERED HTML, CANONICALS, & META AUDIT ---');

  let missingTitles = 0;
  let missingDescriptions = 0;
  let missingCanonicals = 0;
  let canonicalMismatches = 0;
  let noindexInSitemap = 0;
  let missingStructuredData = 0;
  let validProductsTested = 0;

  for (const url of locMatches) {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    let htmlPath = path.join(distDir, pathname === '/' ? 'index.html' : pathname.endsWith('/') ? `${pathname}index.html` : `${pathname}/index.html`);
    if (!fs.existsSync(htmlPath)) {
      htmlPath = path.join(distDir, `${pathname}.html`);
    }

    if (!fs.existsSync(htmlPath)) {
      record('Prerender', `HTML exists for sitemap URL: ${pathname}`, 'FAIL', `Missing file: ${htmlPath}`);
      continue;
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (!titleMatch || !titleMatch[1].trim()) {
      missingTitles++;
    }

    // Meta Description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (!descMatch || !descMatch[1].trim()) {
      missingDescriptions++;
    }

    // Canonical
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
    if (!canonicalMatch) {
      missingCanonicals++;
    } else if (canonicalMatch[1] !== url) {
      canonicalMismatches++;
    }

    // Robots Directive in Sitemap HTML
    const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
    if (robotsMatch && robotsMatch[1].includes('noindex')) {
      noindexInSitemap++;
    }

    // Structured Data
    const ldJsonMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (ldJsonMatches.length === 0) {
      missingStructuredData++;
    } else {
      // Validate JSON syntax
      for (const m of ldJsonMatches) {
        try {
          const parsedSchema = JSON.parse(m[1]);
          if (pathname.startsWith('/products/')) {
            validProductsTested++;
            if (parsedSchema['@type'] === 'Product') {
              if (!parsedSchema.offers || !parsedSchema.offers.price || !parsedSchema.offers.shippingDetails || !parsedSchema.offers.hasMerchantReturnPolicy) {
                record('StructuredData', `Product schema full offer details for ${pathname}`, 'WARN', 'Missing shippingDetails or hasMerchantReturnPolicy');
              }
            }
          }
        } catch (e: any) {
          record('StructuredData', `Valid JSON-LD on ${pathname}`, 'FAIL', e.message);
        }
      }
    }
  }

  if (missingTitles === 0) {
    record('Metadata', '100% of sitemap URLs have page-specific <title> tags', 'PASS');
  } else {
    record('Metadata', 'Missing titles found', 'FAIL', `${missingTitles} pages missing title`);
  }

  if (missingDescriptions === 0) {
    record('Metadata', '100% of sitemap URLs have informative <meta description> tags', 'PASS');
  } else {
    record('Metadata', 'Missing meta descriptions', 'FAIL', `${missingDescriptions} pages missing description`);
  }

  if (missingCanonicals === 0 && canonicalMismatches === 0) {
    record('Canonicals', '100% of sitemap URLs have exact self-referential canonical tags', 'PASS', `${locMatches.length} verified`);
  } else {
    record('Canonicals', 'Canonical errors detected', 'FAIL', `Missing: ${missingCanonicals}, Mismatched: ${canonicalMismatches}`);
  }

  if (noindexInSitemap === 0) {
    record('Indexing', 'Zero pages in sitemap have conflicting noindex directives', 'PASS');
  } else {
    record('Indexing', 'Noindex in sitemap detected', 'FAIL', `${noindexInSitemap} pages have noindex in sitemap`);
  }

  if (missingStructuredData === 0) {
    record('StructuredData', '100% of sitemap URLs contain valid Schema.org JSON-LD', 'PASS', `${locMatches.length} validated`);
  } else {
    record('StructuredData', 'Missing structured data', 'FAIL', `${missingStructuredData} pages missing JSON-LD`);
  }

  // --------------------------------------------------------------------------
  // 4. NON-INDEXABLE & 404 INTEGRITY CHECK
  // --------------------------------------------------------------------------
  console.log('\n--- 4. NON-INDEXABLE & 404 INTEGRITY CHECK ---');

  const notFoundPath = path.join(distDir, '404.html');
  if (fs.existsSync(notFoundPath)) {
    const notFoundHtml = fs.readFileSync(notFoundPath, 'utf-8');
    if (notFoundHtml.includes('noindex, nofollow')) {
      record('404Page', '404.html exists and carries noindex, nofollow directives', 'PASS');
    } else {
      record('404Page', '404.html robots directive', 'FAIL', 'Missing noindex, nofollow');
    }
  } else {
    record('404Page', '404.html exists in dist', 'FAIL');
  }

  const checkoutPath = path.join(distDir, 'checkout/index.html');
  if (fs.existsSync(checkoutPath)) {
    const checkoutHtml = fs.readFileSync(checkoutPath, 'utf-8');
    if (checkoutHtml.includes('noindex, nofollow')) {
      record('UtilityRoutes', 'Checkout route carries noindex, nofollow directive', 'PASS');
    } else {
      record('UtilityRoutes', 'Checkout route robots directive', 'FAIL');
    }
  }

  const orderTrackingPath = path.join(distDir, 'order-tracking/index.html');
  if (fs.existsSync(orderTrackingPath)) {
    const trackingHtml = fs.readFileSync(orderTrackingPath, 'utf-8');
    if (trackingHtml.includes('noindex, nofollow')) {
      record('UtilityRoutes', 'Order tracking route carries noindex, nofollow directive', 'PASS');
    } else {
      record('UtilityRoutes', 'Order tracking robots directive', 'FAIL');
    }
  }

  // --------------------------------------------------------------------------
  // 5. INTERNAL LINK INTEGRITY & DISCOVERY CRAWL
  // --------------------------------------------------------------------------
  console.log('\n--- 5. INTERNAL LINK INTEGRITY & DISCOVERY CRAWL ---');

  const sitemapSet = new Set(locMatches);
  const internalLinkSet = new Set<string>();
  const brokenLinks: { source: string; target: string }[] = [];

  // Crawl sample pages: Home, Products, Categories, Blog hub, Blog detail
  const samplePagesToCrawl = [
    '/',
    '/products',
    '/category/flowers',
    '/category/concentrates',
    '/blog',
    '/blog/what-is-thca-vs-delta-9-thc-legal-potency-guide',
    '/blog/solventless-concentrates-guide-live-rosin-bubble-hash',
  ];

  let blogLinkedProducts = 0;

  for (const pagePath of samplePagesToCrawl) {
    const fileHtmlPath = path.join(distDir, pagePath === '/' ? 'index.html' : `${pagePath.replace(/^\//, '')}/index.html`);
    if (!fs.existsSync(fileHtmlPath)) continue;

    const htmlContent = fs.readFileSync(fileHtmlPath, 'utf-8');
    const hrefMatches = [...htmlContent.matchAll(/href=["'](\/[^"'#?]*)["']/g)].map((m) => m[1]);

    for (const href of hrefMatches) {
      if (href.startsWith('//') || href.startsWith('/api') || href.startsWith('/assets')) continue;
      internalLinkSet.add(href);

      // If on blog page, check if it links to products
      if (pagePath.startsWith('/blog/') && href.startsWith('/products/')) {
        blogLinkedProducts++;
      }

      // Check if destination exists
      const targetCanonical = `https://globalherbs.site${href}`;
      const targetIsStaticHtml =
        fs.existsSync(path.join(distDir, `${href.replace(/^\//, '')}/index.html`)) ||
        fs.existsSync(path.join(distDir, `${href.replace(/^\//, '')}.html`)) ||
        fs.existsSync(path.join(distDir, href === '/' ? 'index.html' : href.replace(/^\//, '')));

      if (!targetIsStaticHtml && !sitemapSet.has(targetCanonical) && !href.startsWith('/checkout') && !href.startsWith('/order-tracking') && !href.startsWith('/admin')) {
        brokenLinks.push({ source: pagePath, target: href });
      }
    }
  }

  if (brokenLinks.length === 0) {
    record('InternalLinks', 'All sampled internal links resolve to valid HTML destinations without 404s', 'PASS', `${internalLinkSet.size} unique links crawled`);
  } else {
    record('InternalLinks', 'Broken internal links found', 'FAIL', `${brokenLinks.length} broken: ${brokenLinks.map((b) => `${b.source} -> ${b.target}`).slice(0, 3).join(', ')}`);
  }

  if (blogLinkedProducts > 0) {
    record('InternalDiscovery', 'Blog guides include crawlable HTML links directly to featured products', 'PASS', `${blogLinkedProducts} product links found in sample guides`);
  } else {
    record('InternalDiscovery', 'Blog guides include crawlable HTML product links', 'FAIL', 'Zero product links found in blog guides');
  }

  // --------------------------------------------------------------------------
  // 6. LIVE HTTP STATUS VERIFICATION (IF DEV SERVER RUNNING)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. LIVE HTTP STATUS VERIFICATION ---');

  const testHttpUrls = [
    '/',
    '/products',
    '/about',
    '/category/flowers',
    '/products/thca-zkittlez-pie-indoor-flower',
    '/blog',
    '/blog/what-is-thca-vs-delta-9-thc-legal-potency-guide',
    '/sitemap.xml',
    '/robots.txt',
  ];

  let serverRunning = false;
  try {
    await checkEndpoint('http://localhost:3000/api/health');
    serverRunning = true;
  } catch {
    serverRunning = false;
  }

  if (serverRunning) {
    record('DevServer', 'Local server active on port 3000', 'PASS');
    let allHttp200 = true;

    for (const testUrl of testHttpUrls) {
      try {
        const res = await checkEndpoint(`http://localhost:3000${testUrl}`);
        if (res.statusCode !== 200) {
          allHttp200 = false;
          record('HTTPStatus', `GET ${testUrl} returns 200 OK`, 'FAIL', `Received HTTP ${res.statusCode}`);
        }
      } catch (err: any) {
        allHttp200 = false;
        record('HTTPStatus', `GET ${testUrl} returns 200 OK`, 'FAIL', err.message);
      }
    }

    if (allHttp200) {
      record('HTTPStatus', '100% of tested canonical routes return genuine HTTP 200 OK', 'PASS', `${testHttpUrls.length} routes verified`);
    }

    // Test 404 URL returns HTTP 404
    try {
      const notFoundRes = await checkEndpoint('http://localhost:3000/this-page-definitely-does-not-exist-xyz-987');
      if (notFoundRes.statusCode === 404) {
        record('HTTPStatus', 'Nonexistent URL returns genuine HTTP 404 (No soft 404)', 'PASS', 'Status 404 received');
      } else {
        record('HTTPStatus', 'Nonexistent URL returns genuine HTTP 404', 'FAIL', `Received status ${notFoundRes.statusCode}`);
      }
    } catch (err: any) {
      record('HTTPStatus', '404 check error', 'WARN', err.message);
    }
  } else {
    record('DevServer', 'Live HTTP checks against localhost:3000', 'WARN', 'Server not running on port 3000, validated static prerender files.');
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('📊 TECHNICAL SEO VALIDATION SUMMARY');
  console.log('======================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  const warns = results.filter((r) => r.status === 'WARN').length;

  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed:       ${passes}`);
  console.log(`Failed:       ${fails}`);
  console.log(`Warnings:     ${warns}`);

  if (fails > 0) {
    console.error('\n❌ SEO VALIDATION FAILED! Address the issues above before pushing.');
    process.exit(1);
  } else {
    console.log('\n✅ 100% TECHNICAL SEO REQUIREMENTS SATISFIED.');
    process.exit(0);
  }
}

function checkEndpoint(url: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        resolve({ statusCode: res.statusCode || 0, headers: res.headers });
      })
      .on('error', (err) => reject(err));
  });
}

runValidation().catch((err) => {
  console.error('Fatal validation runner error:', err);
  process.exit(1);
});
