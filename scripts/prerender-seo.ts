import fs from 'node:fs';
import path from 'node:path';
import { products, categories } from '../src/data/products';
import { blogArticles } from '../src/data/blogArticles';
import { categorySeoMap } from '../src/data/categorySeoData';
import { generateSitemapEntries, NON_INDEXABLE_CATEGORY_SLUGS, NON_INDEXABLE_PRODUCT_IDS } from '../src/utils/sitemap';

const BASE_URL = 'https://globalherbs.site';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const DEFAULT_IMAGE = `${BASE_URL}/images/global-herbs-logo.jpg`;
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

interface SeoPage {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  kind: 'website' | 'product' | 'article';
  schema?: Record<string, unknown>[];
}

function absoluteUrl(value: string | undefined): string {
  if (!value) return DEFAULT_IMAGE;
  try {
    return new URL(value, BASE_URL).href;
  } catch {
    return DEFAULT_IMAGE;
  }
}

function getPage(pathname: string): SeoPage | null {
  const canonical = `${BASE_URL}${pathname === '/' ? '/' : pathname}`;

  if (pathname === '/') {
    return {
      title: 'Global Herbs - Premium Legal Botanicals, THCa Strains & Natural Extracts',
      description: 'Shop lab-tested THCa flowers, solventless rosin, CBD, and botanical products from Global Herbs, with discreet shipping and secure online ordering.',
      canonical,
      kind: 'website',
    };
  }

  if (pathname === '/products') {
    return {
      title: 'Shop THCa, CBD & Botanical Products | Global Herbs',
      description: 'Browse Global Herbs products, including flowers, edibles, vapes, concentrates, and botanical wellness products.',
      canonical,
      kind: 'website',
      schema: [breadcrumbSchema([
        { name: 'Home', url: `${BASE_URL}/` },
        { name: 'Products', url: canonical },
      ])],
    };
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const slug = decodeURIComponent(productMatch[1]);
    const product = products.find((item) => item.slug === slug || String(item.id) === slug);
    if (!product || NON_INDEXABLE_PRODUCT_IDS.has(product.id) || NON_INDEXABLE_CATEGORY_SLUGS.has(product.categorySlug)) return null;

    const productCanonical = `${BASE_URL}/products/${product.slug || product.id}`;
    const categoryCanonical = `${BASE_URL}/category/${encodeURIComponent(product.categorySlug || product.category.toLowerCase().replace(/\s+/g, '-'))}`;
    const schemas: Record<string, unknown>[] = [breadcrumbSchema([
      { name: 'Home', url: `${BASE_URL}/` },
      { name: product.category, url: categoryCanonical },
      { name: product.name, url: productCanonical },
    ])];

    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [absoluteUrl(product.image)],
      description: product.description,
      category: product.category,
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: product.price.toFixed(2),
        itemCondition: 'https://schema.org/NewCondition',
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: productCanonical,
        seller: { '@type': 'Organization', name: 'Global Herbs' },
      },
    });

    return {
      title: product.seoTitle || `${product.name} - Buy ${product.category} Online | Global Herbs`,
      description: product.seoDescription || `${product.description || ''} Order ${product.name} ($${product.price.toFixed(2)}) online with fast, discreet shipping.`.trim(),
      canonical: productCanonical,
      image: absoluteUrl(product.image),
      kind: 'product',
      schema: schemas,
    };
  }

  const categoryMatch = pathname.match(/^\/category\/([^/]+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const category = categories.find((item) => item.slug === slug);
    if (!category || NON_INDEXABLE_CATEGORY_SLUGS.has(slug)) return null;

    const seo = categorySeoMap[slug];
    return {
      title: seo?.metaTitle || `Buy ${category.name} Online - Premium ${category.name} | Global Herbs`,
      description: seo?.metaDescription || `Shop top-quality ${category.name} at Global Herbs. Lab-tested products, best prices, fast delivery, and 100% discreet packaging guaranteed.`,
      canonical,
      kind: 'website',
      schema: [breadcrumbSchema([
        { name: 'Home', url: `${BASE_URL}/` },
        { name: category.name, url: canonical },
      ])],
    };
  }

  const articleMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (articleMatch) {
    const slug = decodeURIComponent(articleMatch[1]);
    const article = blogArticles.find((item) => item.slug === slug);
    if (!article) return null;

    return {
      title: article.metaTitle || `${article.title} | Global Herbs Guide`,
      description: article.metaDescription || article.excerpt,
      canonical,
      image: absoluteUrl(article.featuredImage),
      kind: 'article',
      schema: [
        breadcrumbSchema([
          { name: 'Home', url: `${BASE_URL}/` },
          { name: 'Knowledge Hub', url: `${BASE_URL}/blog` },
          { name: article.title, url: canonical },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: article.title,
          description: article.metaDescription || article.excerpt,
          image: [absoluteUrl(article.featuredImage)],
          datePublished: article.publishedDate,
          author: { '@type': 'Person', name: article.author.name, jobTitle: article.author.role },
          publisher: {
            '@type': 'Organization',
            name: 'Global Herbs',
            logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        },
      ],
    };
  }

  const pages: Record<string, Omit<SeoPage, 'canonical' | 'kind'>> = {
    '/about': {
      title: 'About Us - Global Herbs | Premium Online Dispensary',
      description: 'Learn about Global Herbs - your trusted source for premium lab-tested products, discreet shipping, and top customer satisfaction.',
    },
    '/shipping': {
      title: 'Shipping Policy & Delivery - Global Herbs',
      description: 'Global Herbs shipping policy: Fast, stealthy, and discreet delivery options. Free shipping on qualifying orders.',
    },
    '/returns': {
      title: 'Refund & Returns Policy - Global Herbs',
      description: 'Global Herbs refund and return policy. Customer satisfaction is our top priority.',
    },
    '/privacy': {
      title: 'Privacy Policy - Global Herbs',
      description: 'How Global Herbs protects your data and privacy with secure checkout and encrypted customer information.',
    },
    '/terms': {
      title: 'Terms & Discreet Shipping Conditions - Global Herbs',
      description: 'Dispensary terms of service, legal age 21+ eligibility, stealth double-seal odourless packaging, and guaranteed delivery policies.',
    },
    '/contact': {
      title: 'Contact Us - Global Herbs | Customer Support & Inquiries',
      description: 'Contact Global Herbs for product inquiries, custom orders, or account assistance. Fast responses within 1-2 hours.',
    },
    '/blog': {
      title: "Cannabis Education & Buyer's Guides | Global Herbs Knowledge Hub",
      description: 'Comprehensive educational guides on THCa flower, solventless Live Hash Rosin, Full Spectrum CBD drops for sleep, terpene profiles, and precise dosing charts.',
    },
  };

  const staticPage = pages[pathname];
  if (!staticPage) return null;
  const pageName: Record<string, string> = {
    '/about': 'About Us',
    '/shipping': 'Shipping Policy',
    '/returns': 'Refunds & Returns',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms & Discreet Shipping Conditions',
    '/contact': 'Contact Us',
    '/blog': 'Knowledge Hub',
  };
  return {
    ...staticPage,
    canonical,
    kind: 'website',
    schema: [breadcrumbSchema([
      { name: 'Home', url: `${BASE_URL}/` },
      { name: pageName[pathname], url: canonical },
    ])],
  };
}

function breadcrumbSchema(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setHeadTag(html: string, matcher: RegExp, tag: string): string {
  if (matcher.test(html)) return html.replace(matcher, tag);
  return html.replace('</head>', `${tag}\n  </head>`);
}

function setMeta(html: string, attribute: 'name' | 'property', key: string, value: string): string {
  const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`<meta\\s+${attribute}=["']${safeKey}["'][^>]*>`, 'i');
  return setHeadTag(html, matcher, `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`);
}

function renderPageHtml(template: string, page: SeoPage): string {
  let html = setHeadTag(template, /<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'name', 'robots', DEFAULT_ROBOTS);
  html = setHeadTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`);
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(html, 'property', 'og:type', page.kind === 'product' ? 'product' : page.kind === 'article' ? 'article' : 'website');
  html = setMeta(html, 'property', 'og:url', page.canonical);
  html = setMeta(html, 'property', 'og:image', page.image || DEFAULT_IMAGE);
  html = setMeta(html, 'name', 'twitter:card', page.kind === 'website' ? 'summary' : 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  html = setMeta(html, 'name', 'twitter:image', page.image || DEFAULT_IMAGE);

  if (page.schema?.length) {
    const schemaTag = `<script id="json-ld-schema" type="application/ld+json">${JSON.stringify(page.schema.length === 1 ? page.schema[0] : page.schema).replace(/</g, '\\u003c')}</script>`;
    html = setHeadTag(html, /<script\s+id=["']json-ld-schema["'][^>]*>[\s\S]*?<\/script>/i, schemaTag);
    if (!html.includes('id="json-ld-schema"')) html = html.replace('</head>', `  ${schemaTag}\n  </head>`);
  }

  return html;
}

function prerenderSeoPages() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) throw new Error(`Vite output not found: ${templatePath}`);
  const template = fs.readFileSync(templatePath, 'utf8');
  const seen = new Set<string>();
  let pagesWritten = 0;

  for (const entry of generateSitemapEntries()) {
    const pathname = decodeURI(new URL(entry.loc).pathname);
    if (seen.has(pathname)) continue;
    seen.add(pathname);

    const page = getPage(pathname);
    if (!page) continue;

    const relativeSegments = pathname.split('/').filter(Boolean);
    const outputPath = relativeSegments.length
      ? path.join(DIST_DIR, ...relativeSegments, 'index.html')
      : templatePath;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderPageHtml(template, page), 'utf8');
    pagesWritten += 1;
  }

  console.log(`[SEO Prerender] Wrote metadata for ${pagesWritten} canonical routes.`);
}

prerenderSeoPages();
