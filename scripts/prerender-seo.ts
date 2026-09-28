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
    const article = blogArticles.find((item) => item.slug === slug);
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
      content: `<p>Founded in Cave Junction, Oregon in 2023, Global Herbs has grown from a local organic collective into a premier online mail-order dispensary. We source strictly from licensed craft cultivators and verify every batch via third-party ISO-accredited laboratory analysis.</p>
      <h2>Our Pure Sourcing &amp; Discreet Fulfillment</h2>
      <p>Every flower block, concentrate jar, vape cartridge, and edible package undergoes dual-tier laboratory testing and double medical-grade vacuum sealing for 100% odor-proof transit.</p>`,
    },
    '/shipping': {
      title: 'Shipping Policy & Delivery - Global Herbs',
      description:
        'Global Herbs shipping policy: Fast, stealthy, and discreet delivery options. Free shipping on qualifying orders.',
      h1: 'Secure Shipping Policy — Double Vacuum Sealed Stealth Delivery',
      content: `<p>All orders are processed within 24 hours from Cave Junction, Oregon using our Double Vacuum Seal Protocol inside unmarked generic parcels. Standard express transit takes 2 to 4 business days ($19.99 flat rate, or free on orders over $249.99).</p>`,
    },
    '/returns': {
      title: 'Refund & Returns Policy - Global Herbs',
      description: 'Global Herbs refund and return policy. Customer satisfaction is our top priority.',
      h1: 'Refund & Returns Guarantee — 100% Delivery Insurance',
      content: `<p>Global Herbs provides 100% delivery protection. If your package shows no tracking update for more than 14 business days or arrives damaged, contact globalherbsinc@gmail.com for an immediate 100% free reshipment or full refund.</p>`,
    },
    '/privacy': {
      title: 'Privacy Policy - Global Herbs',
      description:
        'How Global Herbs protects your data and privacy with secure checkout and encrypted customer information.',
      h1: 'Privacy Policy Terms — 256-Bit SSL Encryption & Zero-Log Security',
      content: `<p>Global Herbs employs end-to-end 256-bit SSL encryption, neutral billing descriptors, and a strict Zero-Permanent Log Policy that automatically purges delivery coordinates 14 business days after delivery confirmation.</p>`,
    },
    '/terms': {
      title: 'Terms & Discreet Shipping Conditions - Global Herbs',
      description:
        'Dispensary terms of service, legal age 21+ eligibility, stealth double-seal odourless packaging, and guaranteed delivery policies.',
      h1: 'Terms & Discreet Shipping Conditions',
      content: `<p>By accessing Global Herbs Dispensary, you confirm you are at least 21 years of age. All hemp-derived cannabinoid products comply with the 2018 US Farm Bill (&lt;0.3% Delta-9 THC by dry weight) and ship under our Stealth Double-Seal Packaging Protocol.</p>`,
    },
    '/contact': {
      title: 'Contact Us - Global Herbs | Customer Support & Inquiries',
      description:
        'Contact Global Herbs for product inquiries, custom orders, or account assistance. Fast responses within 1-2 hours.',
      h1: 'Contact Us & Wholesale Support Desk',
      content: `<p>Reach our 24/6 Cave Junction, Oregon dispatch desk by phone at <a href="tel:+12132801161">+1 (213) 280-1161</a> or email <a href="mailto:globalherbsinc@gmail.com">globalherbsinc@gmail.com</a> for product inquiries, order support, and wholesale pricing.</p>`,
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
  return {
    title: staticPage.title,
    description: staticPage.description,
    canonical,
    kind: 'website',
    schema: [
      breadcrumbSchema([
        { name: 'Home', url: `${BASE_URL}/` },
        { name: pageName[pathname], url: canonical },
      ]),
    ],
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

  // 4. Write noindex utility pages (/checkout, /order-tracking) and 404.html
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
