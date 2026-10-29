import fs from 'node:fs';
import path from 'node:path';
import { products, categories } from '../src/data/products';
import { blogArticles } from '../src/data/blogArticles';
import { getCategorySeoData } from '../src/data/categorySeoData';
import {
  generateSitemapEntries,
  generateSitemapXML,
  NON_INDEXABLE_CATEGORY_SLUGS,
  NON_INDEXABLE_PRODUCT_IDS,
} from '../src/utils/sitemap';

const BASE_URL = 'https://globalherbs.site';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const DEFAULT_IMAGE = `${BASE_URL}/images/global-herbs-logo.jpg`;
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

export interface SeoPage {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  image?: string;
  kind: 'website' | 'product' | 'article';
  schema?: Record<string, unknown>[];
  bodyHtml: string;
}

function absoluteUrl(value: string | undefined): string {
  if (!value) return DEFAULT_IMAGE;
  try {
    return new URL(value, BASE_URL).href;
  } catch {
    return DEFAULT_IMAGE;
  }
}

function escapeHtml(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

const indexableCategories = categories.filter((c) => !NON_INDEXABLE_CATEGORY_SLUGS.has(c.slug));
const indexableProducts = products.filter(
  (p) => !NON_INDEXABLE_PRODUCT_IDS.has(p.id) && !NON_INDEXABLE_CATEGORY_SLUGS.has(p.categorySlug)
);

function renderSharedShell(mainContentHtml: string): string {
  const categoryLinksHtml = indexableCategories
    .map(
      (cat) =>
        `<li><a href="/category/${escapeHtml(cat.slug)}">${escapeHtml(cat.name)} (${cat.count})</a></li>`
    )
    .join('');

  const blogLinksHtml = blogArticles
    .map(
      (art) =>
        `<li><a href="/blog/${escapeHtml(art.slug)}">${escapeHtml(art.title)}</a></li>`
    )
    .join('');

  return `<div class="min-h-screen bg-white flex flex-col justify-between text-left">
    <header class="bg-emerald-950 text-white border-b border-emerald-900">
      <div class="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <a href="/" class="font-bold text-lg text-white">Global Herbs</a>
        <nav aria-label="Primary Navigation">
          <ul class="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <li><a href="/">Home</a></li>
            <li><a href="/products">All Products</a></li>
            ${categoryLinksHtml}
            <li><a href="/blog">Knowledge Hub</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/shipping">Shipping Policy</a></li>
            <li><a href="/returns">Refund &amp; Returns</a></li>
            <li><a href="/contact">Contact Support</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 py-10 w-full flex-grow">
      ${mainContentHtml}
    </main>
    <footer class="bg-zinc-950 text-white py-10 px-4 border-t border-zinc-900 text-xs">
      <div class="max-w-7xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h2 class="font-bold text-sm uppercase tracking-wider mb-2">Global Herbs Dispensary</h2>
          <p class="text-gray-400">238 Cedar Brook Ln, Cave Junction, OR 97523 United States</p>
          <p class="text-gray-400 mt-1">Phone: <a href="tel:+12132801161">+1 (213) 280-1161</a></p>
          <p class="text-gray-400 mt-1">Email: <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a></p>
          <p class="text-gray-400 mt-2">
            <a href="https://www.youtube.com/channel/UCyu1M9pmZExiQ2HU4YIEH3A" rel="noopener noreferrer">YouTube (@GlobalHerbsinc)</a> |
            <a href="https://www.facebook.com/share/1F9v8LnmJX/?mibextid=wwXIfr" rel="noopener noreferrer">Facebook (@GlobalHerbsinc)</a> |
            <a href="https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ" rel="noopener noreferrer">TikTok</a> |
            <a href="https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM" rel="noopener noreferrer">Reddit</a>
          </p>
        </div>
        <div>
          <h2 class="font-bold text-sm uppercase tracking-wider mb-2">Shop Categories</h2>
          <ul class="space-y-1 text-gray-400">${categoryLinksHtml}</ul>
        </div>
        <div>
          <h2 class="font-bold text-sm uppercase tracking-wider mb-2">Educational Guides</h2>
          <ul class="space-y-1 text-gray-400">
            <li><a href="/blog">All Educational Guides</a></li>
            ${blogLinksHtml}
          </ul>
        </div>
        <div>
          <h2 class="font-bold text-sm uppercase tracking-wider mb-2">Dispensary Policies</h2>
          <ul class="space-y-1 text-gray-400">
            <li><a href="/products">Full Dispensary Catalog</a></li>
            <li><a href="/about">About Our Shop</a></li>
            <li><a href="/shipping">Secure Shipping Policy</a></li>
            <li><a href="/returns">Refund and Returns Guarantee</a></li>
            <li><a href="/privacy">Privacy Policy Terms</a></li>
            <li><a href="/terms">Terms &amp; Discreet Shipping</a></li>
            <li><a href="/contact">Contact &amp; Support Desk</a></li>
          </ul>
        </div>
      </div>
    </footer>
  </div>`;
}

export function getPage(pathname: string): SeoPage | null {
  const canonical = `${BASE_URL}${pathname === '/' ? '/' : pathname}`;

  if (pathname === '/') {
    const categoryDirectoryHtml = indexableCategories
      .map((cat) => {
        const catSeo = getCategorySeoData(cat.slug);
        const catProds = indexableProducts.filter((p) => p.categorySlug === cat.slug);
        const prodItems = catProds
          .map(
            (p) =>
              `<li><a href="/products/${escapeHtml(p.slug || String(p.id))}">${escapeHtml(p.name)} — $${p.price.toFixed(2)}</a></li>`
          )
          .join('');
        return `<section class="mb-8">
          <h2><a href="/category/${escapeHtml(cat.slug)}">${escapeHtml(cat.name)} (${catProds.length} Lab-Tested Products)</a></h2>
          <p>${escapeHtml(catSeo?.overview || `Explore our lab-tested ${cat.name} collection with discreet vacuum-sealed delivery.`)}</p>
          <ul>${prodItems}</ul>
        </section>`;
      })
      .join('');

    const articlesHtml = blogArticles
      .map(
        (a) =>
          `<article class="mb-4">
            <h3><a href="/blog/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a></h3>
            <p>${escapeHtml(a.excerpt)}</p>
          </article>`
      )
      .join('');

    return {
      title: 'Global Herbs - Premium Legal Botanicals, THCa Strains & Natural Extracts',
      description:
        'Shop lab-tested THCa flowers, solventless rosin, CBD, and botanical products from Global Herbs, with discreet shipping and secure online ordering.',
      canonical,
      kind: 'website',
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          url: `${BASE_URL}/`,
          name: 'Global Herbs',
          publisher: { '@id': `${BASE_URL}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${BASE_URL}/products?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
      bodyHtml: renderSharedShell(`
        <section class="mb-10">
          <h1>Global Herbs — Lab-Tested THCa Flower, Solventless Concentrates &amp; Botanical Dispensary</h1>
          <p>Welcome to Global Herbs. Shop ${indexableProducts.length} third-party ISO-17025 lab-tested THCa cannabis strains, solventless live hash rosin, ceramic vape cartridges, full-spectrum edibles, and Farm Bill compliant CBD wellness products shipped with double vacuum-sealed stealth protection.</p>
          <p><a href="/products">Browse Full Dispensary Catalog</a> | <a href="/blog">Explore Cannabis Knowledge Hub</a> | <a href="/contact">24/6 Customer Support</a></p>
        </section>
        ${categoryDirectoryHtml}
        <section class="mt-10">
          <h2>Dispensary Insights &amp; Educational Buyer's Guides</h2>
          ${articlesHtml}
        </section>
      `),
    };
  }

  if (pathname === '/products') {
    const productListHtml = indexableProducts
      .map(
        (p) =>
          `<li>
            <a href="/products/${escapeHtml(p.slug || String(p.id))}"><strong>${escapeHtml(p.name)}</strong></a>
            <span> (${escapeHtml(p.category)} — $${p.price.toFixed(2)})</span>
            <p>${escapeHtml(p.description || '')}</p>
          </li>`
      )
      .join('');

    return {
      title: 'Shop THCa, CBD & Botanical Products | Global Herbs',
      description:
        'Browse Global Herbs products, including flowers, edibles, vapes, concentrates, and botanical wellness products.',
      canonical,
      kind: 'website',
      schema: [
        breadcrumbSchema([
          { name: 'Home', url: `${BASE_URL}/` },
          { name: 'Products', url: canonical },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Shop THCa, CBD & Botanical Products | Global Herbs',
          url: canonical,
          description:
            'Browse Global Herbs products, including flowers, edibles, vapes, concentrates, and botanical wellness products.',
        },
      ],
      bodyHtml: renderSharedShell(`
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <span>All Products</span></nav>
        <h1>All Lab-Tested Dispensary Products (${indexableProducts.length} Items)</h1>
        <p>Browse our complete menu of organic THCa flowers, solventless concentrates, vape cartridges, pre-rolls, edibles, CBD wellness tinctures, and vaporizer accessories.</p>
        <h2>Shop by Category</h2>
        <ul>
          ${indexableCategories
            .map((c) => `<li><a href="/category/${escapeHtml(c.slug)}">${escapeHtml(c.name)} (${c.count})</a></li>`)
            .join('')}
        </ul>
        <h2>Complete Product Catalog</h2>
        <ul>${productListHtml}</ul>
      `),
    };
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const slug = decodeURIComponent(productMatch[1]);
    const product = products.find((item) => item.slug === slug || String(item.id) === slug);
    if (!product) return null;

    const isNonIndexable =
      NON_INDEXABLE_PRODUCT_IDS.has(product.id) || NON_INDEXABLE_CATEGORY_SLUGS.has(product.categorySlug);
    const productCanonical = `${BASE_URL}/products/${product.slug || product.id}`;
    const categoryCanonical = `${BASE_URL}/category/${encodeURIComponent(
      product.categorySlug || product.category.toLowerCase().replace(/\s+/g, '-')
    )}`;

    // Circular ring peer selection so every product in a category receives equal internal incoming links
    const sameCatPool = indexableProducts.filter((p) => p.categorySlug === product.categorySlug);
    const currentIdx = sameCatPool.findIndex((p) => p.id === product.id);
    const related = [];
    if (sameCatPool.length > 1) {
      for (let offset = 1; offset <= Math.min(8, sameCatPool.length - 1); offset++) {
        const nextIdx = ((currentIdx >= 0 ? currentIdx : 0) + offset) % sameCatPool.length;
        const candidate = sameCatPool[nextIdx];
        if (candidate && candidate.id !== product.id) {
          related.push(candidate);
        }
      }
    }

    const relatedHtml = related
      .map(
        (r) =>
          `<li><a href="/products/${escapeHtml(r.slug || String(r.id))}">${escapeHtml(r.name)} — $${r.price.toFixed(2)}</a></li>`
      )
      .join('');

    const schemas: Record<string, unknown>[] = [];
    if (!isNonIndexable) {
      schemas.push(
        breadcrumbSchema([
          { name: 'Home', url: `${BASE_URL}/` },
          { name: product.category, url: categoryCanonical },
          { name: product.name, url: productCanonical },
        ])
      );
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: [absoluteUrl(product.image)],
        description: product.description,
        category: product.category,
        sku: product.sku || `GH-${product.id}`,
        brand: { '@type': 'Brand', name: product.brand || 'Global Herbs' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: product.price.toFixed(2),
          itemCondition: 'https://schema.org/NewCondition',
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: productCanonical,
          seller: { '@type': 'Organization', name: 'Global Herbs' },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: '19.99',
              currency: 'USD',
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'US',
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: {
                '@type': 'QuantitativeValue',
                minValue: 0,
                maxValue: 1,
                unitCode: 'd',
              },
              transitTime: {
                '@type': 'QuantitativeValue',
                minValue: 2,
                maxValue: 4,
                unitCode: 'd',
              },
            },
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'US',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 14,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
        },
      });
    }

    return {
      title: product.seoTitle || `${product.name} - Buy ${product.category} Online | Global Herbs`,
      description:
        product.seoDescription ||
        `${product.description || ''} Order ${product.name} ($${product.price.toFixed(2)}) online with fast, discreet shipping.`.trim(),
      canonical: productCanonical,
      robots: isNonIndexable ? 'noindex, nofollow' : DEFAULT_ROBOTS,
      image: absoluteUrl(product.image),
      kind: 'product',
      schema: schemas,
      bodyHtml: renderSharedShell(`
        <nav aria-label="Breadcrumb">
          <a href="/">Home</a> &rsaquo;
          <a href="/products">Shop</a> &rsaquo;
          <a href="/category/${escapeHtml(product.categorySlug)}">${escapeHtml(product.category)}</a> &rsaquo;
          <span>${escapeHtml(product.name)}</span>
        </nav>
        <article>
          <h1>${escapeHtml(product.name)}</h1>
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="600" height="600" loading="eager" />
          <p><strong>Category:</strong> <a href="/category/${escapeHtml(product.categorySlug)}">${escapeHtml(product.category)}</a></p>
          <p><strong>Brand / Cultivator:</strong> ${escapeHtml(product.brand || 'Global Herbs Reserve')}</p>
          <p><strong>Price:</strong> $${product.price.toFixed(2)} USD (${product.inStock ? 'In Stock' : 'Out of Stock'}) | <strong>SKU:</strong> ${escapeHtml(product.sku || `GH-${product.id}`)}</p>
          ${product.strainType ? `<p><strong>Strain Classification:</strong> ${escapeHtml(product.strainType)}</p>` : ''}
          ${product.potency ? `<p><strong>Potency Profile:</strong> ${escapeHtml(product.potency)}</p>` : ''}
          ${product.genetics ? `<p><strong>Genetic Lineage:</strong> ${escapeHtml(product.genetics)}</p>` : ''}
          ${product.aroma ? `<p><strong>Aroma &amp; Flavor Notes:</strong> ${escapeHtml(product.aroma)}</p>` : ''}
          ${product.effects ? `<p><strong>Reported Experience:</strong> ${escapeHtml(product.effects)}</p>` : ''}
          ${product.terpenes && product.terpenes.length ? `<p><strong>Dominant Terpenes:</strong> ${escapeHtml(product.terpenes.join(', '))}</p>` : ''}
          <h2>About ${escapeHtml(product.name)} &amp; Laboratory Verification</h2>
          <p>${escapeHtml(product.description || '')}</p>
          ${
            product.labResults
              ? `<section>
                  <h3>ISO-17025 Certificate of Analysis (COA) Summary</h3>
                  <ul>
                    <li><strong>Primary Potency (THCa):</strong> ${escapeHtml(product.labResults.thca)}</li>
                    <li><strong>Delta-9 THC (Dry Weight):</strong> ${escapeHtml(product.labResults.d9thc)}</li>
                    <li><strong>Total Cannabinoids:</strong> ${escapeHtml(product.labResults.totalCannabinoids)}</li>
                    <li><strong>Contaminant Screening:</strong> ${escapeHtml(product.labResults.status)}</li>
                  </ul>
                </section>`
              : ''
          }
          <p>Every batch of ${escapeHtml(product.name)} is third-party laboratory tested for potency and purity, double vacuum-sealed for 100% odor control, and shipped discreetly with tracking and full delivery insurance.</p>
          ${
            related.length
              ? `<section>
                  <h2>Related ${escapeHtml(product.category)} Products</h2>
                  <ul>${relatedHtml}</ul>
                </section>`
              : ''
          }
        </article>
      `),
    };
  }

  const categoryMatch = pathname.match(/^\/category\/([^/]+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const category = categories.find((item) => item.slug === slug);
    if (!category) return null;

    const isNonIndexable = NON_INDEXABLE_CATEGORY_SLUGS.has(slug);
    const seo = getCategorySeoData(slug);
    const catProducts = products.filter(
      (p) => p.categorySlug === slug && (isNonIndexable || !NON_INDEXABLE_PRODUCT_IDS.has(p.id))
    );

    const schemas: Record<string, unknown>[] = [];
    if (!isNonIndexable) {
      schemas.push(
        breadcrumbSchema([
          { name: 'Home', url: `${BASE_URL}/` },
          { name: category.name, url: canonical },
        ])
      );
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: seo?.h1Heading || `Buy ${category.name} Online | Global Herbs`,
        description:
          seo?.metaDescription ||
          `Shop top-quality ${category.name} at Global Herbs. Lab-tested products, best prices, fast delivery, and 100% discreet packaging guaranteed.`,
        url: canonical,
      });
      if (seo?.faqs && seo.faqs.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: seo.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        });
      }
    }

    const catProductsHtml = catProducts
      .map(
        (p) =>
          `<li>
            <a href="/products/${escapeHtml(p.slug || String(p.id))}"><strong>${escapeHtml(p.name)}</strong> — $${p.price.toFixed(2)}</a>
            <p>${escapeHtml(p.description || '')}</p>
          </li>`
      )
      .join('');

    const seoSectionsHtml = seo
      ? `<section>
          <h2>${escapeHtml(seo.geneticsAndTerpenes.title)}</h2>
          <p>${escapeHtml(seo.geneticsAndTerpenes.content)}</p>
          <p><strong>Key Terpenes:</strong> ${escapeHtml(seo.geneticsAndTerpenes.keyTerpenes.join(', '))} | <strong>Potency Range:</strong> ${escapeHtml(seo.geneticsAndTerpenes.potencyRange)}</p>
          <h2>${escapeHtml(seo.buyerGuide.title)}</h2>
          ${seo.buyerGuide.paragraphs.map((para) => `<p>${escapeHtml(para)}</p>`).join('')}
          <p><strong>Compliance &amp; Quality:</strong> ${escapeHtml(seo.complianceAndQuality)}</p>
          ${
            seo.faqs && seo.faqs.length > 0
              ? `<h2>Frequently Asked Questions</h2>
                ${seo.faqs
                  .map((f) => `<div><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`)
                  .join('')}`
              : ''
          }
        </section>`
      : '';

    return {
      title: seo?.metaTitle || `Buy ${category.name} Online - Premium ${category.name} | Global Herbs`,
      description:
        seo?.metaDescription ||
        `Shop top-quality ${category.name} at Global Herbs. Lab-tested products, best prices, fast delivery, and 100% discreet packaging guaranteed.`,
      canonical,
      robots: isNonIndexable ? 'noindex, nofollow' : DEFAULT_ROBOTS,
      kind: 'website',
      schema: schemas,
      bodyHtml: renderSharedShell(`
        <nav aria-label="Breadcrumb">
          <a href="/">Home</a> &rsaquo; <a href="/products">Shop</a> &rsaquo; <span>${escapeHtml(category.name)}</span>
        </nav>
        <h1>${escapeHtml(seo?.h1Heading || `${category.name} Catalog`)}</h1>
        <p>${escapeHtml(seo?.overview || `Browse ${catProducts.length} lab-tested ${category.name} products available for discreet delivery.`)}</p>
        <h2>Available ${escapeHtml(category.name)} Products (${catProducts.length})</h2>
        <ul>${catProductsHtml}</ul>
        ${seoSectionsHtml}
      `),
    };
  }

  const articleMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (articleMatch) {
    const slug = decodeURIComponent(articleMatch[1]);
    let dynamicArticle: any = null;
    try {
      const dynamicPath = path.resolve(process.cwd(), 'data/blog_articles.json');
      if (fs.existsSync(dynamicPath)) {
        const list = JSON.parse(fs.readFileSync(dynamicPath, 'utf-8'));
        if (Array.isArray(list)) {
          dynamicArticle = list.find((a: any) => a.slug === slug && a.status === 'published');
        }
      }
    } catch {
      // Fallback to static
    }
    const article = dynamicArticle || blogArticles.find((item) => item.slug === slug);
    if (!article) return null;

    const articleSchemas: Record<string, unknown>[] = [
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
        ...(article.reviewer
          ? {
              reviewedBy: {
                '@type': 'Person',
                name: article.reviewer.name,
                jobTitle: article.reviewer.credentials,
              },
            }
          : {}),
        publisher: {
          '@type': 'Organization',
          name: 'Global Herbs',
          logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      },
    ];

    if (article.faqs && article.faqs.length > 0) {
      articleSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    }

    const sectionsHtml = article.contentSections
      .map(
        (sec) =>
          `<section id="${escapeHtml(sec.id)}">
            <h2>${escapeHtml(sec.title)}</h2>
            ${sec.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
            ${
              sec.subsections
                ? sec.subsections
                    .map(
                      (sub) =>
                        `<h3>${escapeHtml(sub.subtitle)}</h3>
                        ${sub.paragraphs.map((sp) => `<p>${escapeHtml(sp)}</p>`).join('')}`
                    )
                    .join('')
                : ''
            }
          </section>`
      )
      .join('');

    const faqsHtml = article.faqs
      .map((f) => `<div><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`)
      .join('');

    return {
      title: article.metaTitle || `${article.title} | Global Herbs Guide`,
      description: article.metaDescription || article.excerpt,
      canonical,
      image: absoluteUrl(article.featuredImage),
      kind: 'article',
      schema: articleSchemas,
      bodyHtml: renderSharedShell(`
        <nav aria-label="Breadcrumb">
          <a href="/">Home</a> &rsaquo; <a href="/blog">Knowledge Hub</a> &rsaquo; <span>${escapeHtml(article.title)}</span>
        </nav>
        <article>
          <h1>${escapeHtml(article.title)}</h1>
          <p>By ${escapeHtml(article.author.name)} (${escapeHtml(article.author.role)}) | Reviewed by ${escapeHtml(article.reviewer.name)} | Published ${escapeHtml(article.publishedDate)}</p>
          <p>${escapeHtml(article.excerpt)}</p>
          <h2>Key Takeaways</h2>
          <ul>${article.keyTakeaways.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}</ul>
          ${sectionsHtml}
          <section>
            <h2>Frequently Asked Questions</h2>
            ${faqsHtml}
          </section>
          <p><a href="/category/${escapeHtml(article.recommendedCategorySlug)}">Explore Recommended ${escapeHtml(article.recommendedCategorySlug)} Products</a></p>
        </article>
      `),
    };
  }

  const pages: Record<string, { title: string; description: string; h1: string; content: string }> = {
    '/about': {
      title: 'About Us - Global Herbs | Premium Online Dispensary',
      description:
        'Learn about Global Herbs - your trusted source for premium lab-tested products, discreet shipping, and top customer satisfaction.',
      h1: 'About Our Shop — The Global Herbs Dispensary Legacy',
      content: `<section>
        <h2>The Global Herbs Dispensary Legacy of Excellence Since 2023</h2>
        <p>Founded in Cave Junction, Oregon in 2023, Global Herbs has grown from a local organic advocate collective into the premier online mail-order dispensary nationwide and globally. We strictly source from licensed craft cultivators who avoid chemical growth enhancers, heavy pesticides, or sub-par curing.</p>
        <h3>Our Pure Sourcing Philosophy</h3>
        <p>Every flower block, cartridge, wellness formulation, and concentrate package is hand-selected and undergoes dual-tier third-party laboratory verification. If our premium products do not meet your exact standards, we stand by our robust refunds and guarantee structure to ensure perfect client satisfaction.</p>
        <h3>Guaranteed Quality &amp; Delivery</h3>
        <p>All items undergo rigorous laboratory testing for potency, terpene retention, residual solvents, microbials, and heavy metals. We partner exclusively with certified analytical facilities to ensure clean, compliant botanicals.</p>
        <h2>Who We Serve</h2>
        <p>At Global Herbs Dispensary, we serve medical patients seeking consistent therapeutic dosing, wellness enthusiasts focusing on natural alternative healing modalities, and adult recreational connoisseurs seeking top-shelf quality. We offer convenient home delivery pathways for individuals living in areas without physical access to high-standard dispensaries.</p>
        <h2>Absolute Privacy &amp; Absolute Integrity</h2>
        <p>We know that privacy is paramount when shopping for alternative therapeutics. That's why every transaction on our platform is fully encrypted and all delivery parcels are vacuum-sealed in generic containers. We never maintain commercial tracking history beyond your immediate delivery window to ensure total peace of mind.</p>
        <h2>Corporate Standards &amp; Dispatch Operation</h2>
        <p>Our warehouse dispatch centers operate continuous shifts from Cave Junction, OR to make sure order routing remains constant and tracking information is issued within 24 business hours of successful validation. Our professional support and dispatch lines remain at your complete disposal for custom or bulk wholesale requests.</p>
        <h2>Official Dispensary Details</h2>
        <p><strong>Physical Address:</strong> 238 Cedar Brook Ln, Cave Junction, OR 97523 United States</p>
        <p><strong>Phone:</strong> <a href="tel:+12132801161">+1 (213) 280-1161</a> | <strong>Email:</strong> <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a></p>
      </section>`,
    },
    '/shipping': {
      title: 'Shipping Policy & Delivery - Global Herbs',
      description:
        'Global Herbs shipping policy: Fast, stealthy, and discreet delivery options. Free shipping on qualifying orders.',
      h1: 'Secure Shipping Policy — Double Vacuum Sealed Stealth Delivery',
      content: `<section>
        <h2>Industry-Leading Double Vacuum Sealed Odourless Stealth Shipping</h2>
        <p>Global Herbs sets the standard for secure, discreet mail-order dispensary fulfillment. Every order shipped from our Cave Junction, Oregon facility adheres to strict packaging protocols to protect your privacy and ensure product freshness upon arrival.</p>
        <div>
          <h3>Shipping Options &amp; Flat Rate Dispatch</h3>
          <ul>
            <li><strong>Standard Discreet Express Dispatch:</strong> $19.99 Flat Rate worldwide. Delivered within 2 to 4 business days with full end-to-end tracking.</li>
            <li><strong>Automatic Free Shipping Upgrade:</strong> Every order exceeding $249.99 automatically qualifies for 100% Free Express Stealth Shipping at checkout.</li>
            <li><strong>Fulfillment &amp; Handling Time:</strong> Orders are processed and packed within 0 to 1 business day (24 hours) Monday through Saturday.</li>
          </ul>
        </div>
        <h2>The Double Vacuum Seal Protocol</h2>
        <p>All flower products, hashes, extracts, and gummies are meticulously sealed inside clinical-grade, moisture-proof barrier bags using high-performance chamber vacuum sealers. Following validation, the primary bag is sanitized and passed into a secondary, thick medical-grade protective seal. This prevents any scent molecular emissions and safeguards your package against unexpected temperature shifts during dispatch.</p>
        <h2>Discreet Stealth Packaging</h2>
        <p>We use completely unmarked, generic cardboard boxes or heavy poly-mailers. Senders' coordinates refer to our generalized distribution corporations with no mention of "Global Herbs", "dispensary", "cannabis", or alternative botanicals. Your parcel will appear identical to everyday commerce shipments (e.g., electronic accessories or generic apparel).</p>
        <h2>Tracking &amp; Dispatch Validation</h2>
        <p>Once your package is accepted by the carrier (USPS, FedEx, Canada Post, or specialized discreet couriers), an automated email tracking key will be sent to the email provided during checkout. Tracking systems might require up to 12 hours after physical collection to reflect update coordinates.</p>
        <h2>Delays, Seizures &amp; Delivery Insurance</h2>
        <p>While 99.8% of our orders clear transit without friction, occasional delays can happen due to adverse weather or carrier logistics. We offer free, prompt reshipping or a full refund if a parcel becomes stuck in transit for over 14 business days.</p>
      </section>`,
    },
    '/returns': {
      title: 'Refund & Returns Policy - Global Herbs',
      description: 'Global Herbs refund and return policy. Customer satisfaction is our top priority.',
      h1: 'Refund & Returns Guarantee — 100% Delivery Insurance',
      content: `<section>
        <h2>100% Secure Delivery Insurance &amp; Money-Back Protection</h2>
        <p>We understand purchasing botanicals online requires absolute confidence. Global Herbs offers 100% protection guarantees. If your package does not arrive as confirmed by logistics, or if any product arrives damaged or defective, we refund or reship with no extra charges.</p>
        <h2>Package Lost or Stalled in Transit</h2>
        <p>If your tracking coordinates show no active scanning update for more than 14 business days, or if the package is flagged by logistics, please contact our dispatch lines immediately. We will initiate an inquiry and, if confirmed missing, issue a 100% free stealth reshipment or refund your full payment.</p>
        <h2>Defective, Damaged, or Incorrect Items</h2>
        <p>In the rare event that you receive a defective item (such as a leaky cartridge coil) or if we mistakenly packed the wrong product tier, please capture a clear photograph or video showing the defect or item label and submit it to <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a> within 48 hours of delivery. We will dispatch replacements immediately at our expense.</p>
        <h2>Address Errors &amp; Customer Responsibility</h2>
        <p>Please double-check your shipping coordinates when filling out checkout details. We cannot issue refunds or reshipments if a parcel is delivered to the wrong address because of an incorrect address input. If you realize an error has occurred, please contact us immediately so we can update the shipping label before dispatch.</p>
        <h2>How to Initiate a Claim</h2>
        <p>To initiate a claim, contact our Support Dispatch team through our integrated <a href="/contact">Inquiry Form</a> or directly via email at <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a>. Please specify your Order ID, name, email address, and a detailed description of the issue. Claims are processed within 1 to 2 hours during normal dispatch hours.</p>
      </section>`,
    },
    '/privacy': {
      title: 'Privacy Policy - Global Herbs',
      description:
        'How Global Herbs protects your data and privacy with secure checkout and encrypted customer information.',
      h1: 'Privacy Policy Terms — 256-Bit SSL Encryption & Zero-Log Security',
      content: `<section>
        <h2>Absolute Confidentiality, 256-Bit SSL Encryption, &amp; Purged Dispatch History</h2>
        <p>Global Herbs operates under a strict Zero-Permanent Log Policy. We believe your wellness choices and personal therapeutic decisions are your business alone. We treat customer information with extreme diligence and enterprise-grade confidentiality.</p>
        <h2>Zero-Permanent Log Policy</h2>
        <p>Global Herbs never logs details of what you order or your physical delivery coordinates permanently. All order histories, customer addresses, and transactional notes are completely and automatically purged from our databases 14 business days following confirmed carrier delivery.</p>
        <h2>256-Bit SSL Data Security Encryption</h2>
        <p>Our web infrastructure and checkout systems employ end-to-end 256-bit Secure Socket Layer (SSL) encryption protocols. All validation keys and transaction parameters are completely tokenized and never stored on public-facing servers.</p>
        <h2>Information We Collect &amp; Why</h2>
        <p>We only collect the minimum information strictly necessary to fulfill your orders and keep you updated on progress:</p>
        <ul>
          <li><strong>Email Address:</strong> Used for checkout receipts, courier tracking keys, and optional secret sales coupons.</li>
          <li><strong>Shipping Coordinates:</strong> Required solely for physical carrier routing. Permanently purged 14 business days after delivery confirmation.</li>
          <li><strong>Contact Phone:</strong> Used solely in case our dispatchers require urgent verification prior to shipping.</li>
        </ul>
        <h2>Third-Party Disclosures &amp; Non-Sharing Pledge</h2>
        <p>Global Herbs never shares, sells, rents, or discloses any personal customer data to third-party commercial databases, marketing agencies, data brokers, or advertising networks. Your privacy remains 100% confidential.</p>
        <h2>Transient Cookies</h2>
        <p>We employ small functional browser cookies to remember items in your cart, category selections, and currency preferences. These cookies are completely transient and expire when your browsing session terminates.</p>
      </section>`,
    },
    '/terms': {
      title: 'Terms & Discreet Shipping Conditions - Global Herbs',
      description:
        'Dispensary terms of service, legal age 21+ eligibility, stealth double-seal odourless packaging, and guaranteed delivery policies.',
      h1: 'Terms & Discreet Shipping Conditions',
      content: `<section>
        <h2>Official Dispensary Ordering Terms, Age Verification &amp; Delivery Conditions</h2>
        <p>Please review these binding Terms and Conditions before placing an order on Global Herbs Dispensary. By accessing our website, browsing products, or completing an order, you agree to comply with and be bound by the following operational conditions.</p>
        <h2>1. Agreement to Terms &amp; Legal Age Eligibility (21+)</h2>
        <p>By accessing Global Herbs Dispensary, placing an order, or checking the terms agreement box during checkout, you legally acknowledge, represent, and warrant that you are at least twenty-one (21) years of age (or the legal age of majority in your jurisdiction) and possess full legal capacity to enter into these binding terms. All botanical goods, lab-tested herbal formulations, therapeutic mushrooms, THCa flower, concentrates, and wellness tinctures offered on this platform are intended strictly for lawful adult personal use or therapeutic alternative medicine regimens. Global Herbs reserves the right to cancel any transaction suspected of underage solicitation.</p>
        <h2>2. Discreet Stealth Packaging &amp; Odourless Dispatch Conditions</h2>
        <p>We hold your discretion and peace of mind as our highest operational priority. All orders processed through Global Herbs are fulfilled under our strict Stealth Double-Seal Packaging Protocol:</p>
        <ul>
          <li><strong>Dual-Tier Clinical Vacuum Sealing:</strong> Products are first sealed inside an airtight, moisture-barrier mylar pouch, thoroughly sanitized, and then encased within a secondary heavy-gauge commercial vacuum seal. This blocks 100% of aromatic terpenes and volatile scents.</li>
          <li><strong>Completely Generic Outer Packaging:</strong> Orders are dispatched in standard, unmarked cardboard mailers or heavy poly-envelopes. There is zero external branding, logos, or botanical references.</li>
          <li><strong>Neutral Return Address:</strong> The shipping label features an authorized neutral corporate logistics identifier with no mention of "Global Herbs", "Dispensary", "Cannabis", or botanical terms.</li>
          <li><strong>Damage &amp; Tamper-Evident Enclosures:</strong> Inner boxes are reinforced with shock-absorbing fill to ensure fragile cartridges, tinctures, and glass jars remain pristine throughout carrier sorting.</li>
        </ul>
        <h2>3. Shipping Options, Tracking &amp; Delivery Windows</h2>
        <p>Global Herbs processes and ships orders Monday through Saturday from our secure fulfillment center in Cave Junction, Oregon. Standard Discreet Express Dispatch takes 2 to 4 business days ($19.99 flat rate). Orders exceeding $249.99 automatically qualify for Free Express Stealth Shipping. Live carrier tracking numbers are generated and emailed within 12 to 24 hours of payment validation.</p>
        <h2>4. Guaranteed Delivery Insurance &amp; Reshipment Policy</h2>
        <p>We maintain an industry-leading 99.8% successful delivery clearance rate. If a package shows no active scanning update for 14 consecutive business days, Global Herbs will provide a 100% free stealth reshipment or a full refund without hassle. In the case of damaged or missing items, notify our support desk at <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a> within 48 hours of confirmed delivery with photo documentation for immediate priority replacement.</p>
        <h2>5. Payment Gateways, Discrete Billing &amp; Privacy Protections</h2>
        <p>To maintain utmost client confidentiality, Global Herbs supports verified discrete payment methods including Cryptocurrency (Bitcoin, Ethereum, USDT with 5% checkout savings), P2P transfers (Zelle, Cash App, Venmo), Interac e-Transfer / Bank Wire, and Express Wallets (Apple Pay / Google Pay). Bank statements reflect generic neutral descriptors. Shipping addresses and customer data are purged from active systems 14 business days after delivery confirmation.</p>
      </section>`,
    },
    '/contact': {
      title: 'Contact Us - Global Herbs | Customer Support & Inquiries',
      description:
        'Contact Global Herbs for product inquiries, custom orders, or account assistance. Fast responses within 1-2 hours.',
      h1: 'Contact Us & Wholesale Support Desk',
      content: `<section>
        <h2>24/6 Direct Dispensary Dispatch Desk — Cave Junction, Oregon</h2>
        <p>Our customer service representatives and fulfillment dispatchers are on duty 6 days a week to assist with order tracking, custom orders, bulk wholesale pricing, and product guidance.</p>
        <h2>Contact Information</h2>
        <ul>
          <li><strong>Dispensary Headquarters:</strong> 238 Cedar Brook Ln, Cave Junction, OR 97523 United States</li>
          <li><strong>Direct Phone:</strong> <a href="tel:+12132801161">+1 (213) 280-1161</a></li>
          <li><strong>Support &amp; Order Email:</strong> <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a></li>
          <li><strong>Operating Hours:</strong> Monday – Saturday: 8:00 AM – 8:00 PM PST (Closed Sundays)</li>
          <li><strong>Typical Response Time:</strong> Within 1 to 2 business hours for email and form inquiries</li>
        </ul>
        <h2>Dispensary Inquiries &amp; Customer Support</h2>
        <p>Whether you need advice choosing the right THCa strain profile, have a question about our double-vacuum stealth shipping, or want to track an active shipment, our Cave Junction dispatch team is ready to help. You can also reach us directly through our online inquiry form or official social channels.</p>
      </section>`,
    },
    '/blog': {
      title: "Cannabis Education & Buyer's Guides | Global Herbs Knowledge Hub",
      description:
        'Comprehensive educational guides on THCa flower, solventless Live Hash Rosin, Full Spectrum CBD drops for sleep, terpene profiles, and precise dosing charts.',
      h1: 'Global Herbs Cannabis & Botanical Knowledge Hub',
      content: `<p>Explore peer-reviewed educational guides on THCa decarboxylation, solventless live hash rosin extraction, CBD sleep dosing protocols, and lab-tested hemp purchasing standards.</p>
      <ul>${blogArticles
        .map(
          (a) =>
            `<li><h2><a href="/blog/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a></h2><p>${escapeHtml(a.excerpt)}</p></li>`
        )
        .join('')}</ul>`,
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

  const staticSchemas: Record<string, unknown>[] = [
    breadcrumbSchema([
      { name: 'Home', url: `${BASE_URL}/` },
      { name: pageName[pathname], url: canonical },
    ]),
  ];

  if (pathname === '/about') {
    staticSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'Global Herbs Dispensary',
      url: `${BASE_URL}/`,
      logo: `${BASE_URL}/images/global-herbs-logo.jpg`,
      image: `${BASE_URL}/images/global-herbs-logo.jpg`,
      description: 'Global Herbs is a licensed craft botanical and legal cannabinoid dispensary founded in Cave Junction, Oregon in 2023.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '238 Cedar Brook Ln',
        addressLocality: 'Cave Junction',
        addressRegion: 'OR',
        postalCode: '97523',
        addressCountry: 'US',
      },
      telephone: '+1-213-280-1161',
      email: 'globalherbsinc@gmail.com',
      priceRange: '$$',
    });
  } else if (pathname === '/contact') {
    staticSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Global Herbs Dispensary',
      url: `${BASE_URL}/contact`,
      mainEntity: {
        '@type': 'Store',
        name: 'Global Herbs Dispensary',
        telephone: '+1-213-280-1161',
        email: 'globalherbsinc@gmail.com',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '238 Cedar Brook Ln',
          addressLocality: 'Cave Junction',
          addressRegion: 'OR',
          postalCode: '97523',
          addressCountry: 'US',
        },
      },
    });
  }

  return {
    title: staticPage.title,
    description: staticPage.description,
    canonical,
    kind: 'website',
    schema: staticSchemas,
    bodyHtml: renderSharedShell(`
      <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <span>${escapeHtml(pageName[pathname])}</span></nav>
      <article>
        <h1>${escapeHtml(staticPage.h1)}</h1>
        ${staticPage.content}
        <p><a href="/products">Return to Dispensary Catalog</a></p>
      </article>
    `),
  };
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

export function renderPageHtml(template: string, page: SeoPage): string {
  let html = setHeadTag(template, /<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'name', 'robots', page.robots || DEFAULT_ROBOTS);
  html = setHeadTag(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`
  );
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(
    html,
    'property',
    'og:type',
    page.kind === 'product' ? 'product' : page.kind === 'article' ? 'article' : 'website'
  );
  html = setMeta(html, 'property', 'og:url', page.canonical);
  html = setMeta(html, 'property', 'og:image', page.image || DEFAULT_IMAGE);
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  html = setMeta(html, 'name', 'twitter:image', page.image || DEFAULT_IMAGE);

  if (page.schema && page.schema.length > 0) {
    const schemaTag = `<script id="json-ld-schema" type="application/ld+json">${JSON.stringify(
      page.schema.length === 1 ? page.schema[0] : page.schema
    ).replace(/</g, '\\u003c')}</script>`;
    html = setHeadTag(html, /<script\s+id=["']json-ld-schema["'][^>]*>[\s\S]*?<\/script>/i, schemaTag);
    if (!html.includes('id="json-ld-schema"')) html = html.replace('</head>', `  ${schemaTag}\n  </head>`);
  }

  // Inject pre-rendered semantic HTML body inside <div id="root">...</div> for immediate crawlability
  html = html.replace('<div id="root"></div>', `<div id="root">${page.bodyHtml}</div>`);

  return html;
}

function writeRouteFiles(template: string, pathname: string, page: SeoPage) {
  const rendered = renderPageHtml(template, page);
  const relativeSegments = pathname.split('/').filter(Boolean);
  if (relativeSegments.length === 0) {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rendered, 'utf8');
    return;
  }

  const indexHtmlPath = path.join(DIST_DIR, ...relativeSegments, 'index.html');
  fs.mkdirSync(path.dirname(indexHtmlPath), { recursive: true });
  fs.writeFileSync(indexHtmlPath, rendered, 'utf8');
}

function prerenderSeoPages() {
  // 1. Synchronize sitemap.xml in public/ and dist/
  const sitemapXml = generateSitemapXML();
  if (fs.existsSync(PUBLIC_DIR)) {
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  }
  if (fs.existsSync(DIST_DIR)) {
    fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  }

  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) throw new Error(`Vite output not found: ${templatePath}`);
  const template = fs.readFileSync(templatePath, 'utf8');
  const seen = new Set<string>();
  let pagesWritten = 0;

  // 2. Pre-render all canonical indexable routes from sitemap
  for (const entry of generateSitemapEntries()) {
    const pathname = decodeURI(new URL(entry.loc).pathname);
    if (seen.has(pathname)) continue;
    seen.add(pathname);

    const page = getPage(pathname);
    if (!page) continue;

    writeRouteFiles(template, pathname, page);
    pagesWritten += 1;
  }

  // 3. Also pre-render non-indexable categories and products with explicit noindex, nofollow
  for (const cat of categories) {
    if (!NON_INDEXABLE_CATEGORY_SLUGS.has(cat.slug)) continue;
    const pathname = `/category/${cat.slug}`;
    if (seen.has(pathname)) continue;
    seen.add(pathname);
    const page = getPage(pathname);
    if (!page) continue;
    writeRouteFiles(template, pathname, page);
  }

  for (const prod of products) {
    if (!NON_INDEXABLE_PRODUCT_IDS.has(prod.id) && !NON_INDEXABLE_CATEGORY_SLUGS.has(prod.categorySlug)) continue;
    const slug = prod.slug || String(prod.id);
    const pathname = `/products/${slug}`;
    if (seen.has(pathname)) continue;
    seen.add(pathname);
    const page = getPage(pathname);
    if (!page) continue;
    writeRouteFiles(template, pathname, page);
  }

  // 4. Write noindex utility pages (/checkout, /order-tracking, /forms, /admin, /admin/blog) and 404.html
  const utilityNoIndexPages: Array<{ pathname: string; title: string; h1: string; desc: string }> = [
    {
      pathname: '/checkout',
      title: 'Secure Checkout | Global Herbs',
      h1: 'Secure Dispensary Checkout',
      desc: 'Complete your order securely at Global Herbs.',
    },
    {
      pathname: '/order-tracking',
      title: 'Track Your Order Status | Global Herbs',
      h1: 'Real-Time Order Tracking',
      desc: 'Look up the real-time shipping and fulfillment status of your Global Herbs order.',
    },
    {
      pathname: '/forms',
      title: 'Dispensary Customer Forms | Global Herbs',
      h1: 'Dispensary Inquiry & Custom Request Forms',
      desc: 'Submit inquiries and feedback to Global Herbs.',
    },
    {
      pathname: '/admin',
      title: 'Dispensary Admin Portal | Global Herbs',
      h1: 'Dispensary Administration',
      desc: 'Dispensary editorial and administration portal.',
    },
    {
      pathname: '/admin/blog',
      title: 'Content Administration | Global Herbs',
      h1: 'Content Administration Portal',
      desc: 'Dispensary editorial and content administration portal.',
    },
  ];

  for (const util of utilityNoIndexPages) {
    writeRouteFiles(template, util.pathname, {
      title: util.title,
      description: util.desc,
      canonical: `${BASE_URL}${util.pathname}`,
      robots: 'noindex, nofollow',
      kind: 'website',
      bodyHtml: renderSharedShell(`<h1>${escapeHtml(util.h1)}</h1><p>${escapeHtml(util.desc)}</p>`),
    });
  }

  const notFoundHtml = renderPageHtml(template, {
    title: '404 Page Not Found | Global Herbs',
    description: 'The requested page could not be found on Global Herbs.',
    canonical: `${BASE_URL}/404`,
    robots: 'noindex, nofollow',
    kind: 'website',
    bodyHtml: renderSharedShell(`
      <h1>404 — Page Not Found</h1>
      <p>The page or product you are looking for does not exist or has been moved.</p>
      <p><a href="/">Return to Homepage</a> | <a href="/products">Browse Full Dispensary Catalog</a></p>
    `),
  });
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf8');

  console.log(`[SEO Prerender] Wrote full HTML & metadata for ${pagesWritten} canonical indexable routes.`);
}

if (process.argv[1]?.endsWith('prerender-seo.ts')) {
  prerenderSeoPages();
}
