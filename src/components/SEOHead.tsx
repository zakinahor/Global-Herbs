import React, { useEffect } from 'react';
import { Product } from '../types';
import { BlogArticle } from '../data/blogArticles';
import { categorySeoMap } from '../data/categorySeoData';
import { NON_INDEXABLE_CATEGORY_SLUGS, NON_INDEXABLE_PRODUCT_IDS } from '../utils/sitemap';
import { useLanguage } from '../context/LanguageContext';

export interface SEOHeadProps {
  activePage?: string;
  activeCategory?: string | null;
  categoryName?: string | null;
  selectedProduct?: Product | null;
  selectedArticle?: BlogArticle | null;
  searchQuery?: string;
  customTitle?: string;
  customDescription?: string;
}

export default function SEOHead({
  activePage = 'shop',
  activeCategory,
  categoryName,
  selectedProduct,
  selectedArticle,
  searchQuery,
  customTitle,
  customDescription,
}: SEOHeadProps) {
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    let title = 'Global Herbs - Premium Online Dispensary';
    let description =
      'Shop high quality flowers, edibles, vapes, concentrates and accessories at Global Herbs. Free shipping on orders over $249.99.';

    const BASE_DOMAIN = 'https://globalherbs.site';
    let canonicalUrl = `${BASE_DOMAIN}/`;
    let breadcrumbItems: Array<{ name: string; url: string }> = [
      { name: 'Home', url: `${BASE_DOMAIN}/` },
    ];

    let isNonIndexableItem = false;

    if (customTitle) {
      title = customTitle;
    }

    if (selectedProduct) {
      if (
        NON_INDEXABLE_PRODUCT_IDS.has(selectedProduct.id) ||
        NON_INDEXABLE_CATEGORY_SLUGS.has(selectedProduct.categorySlug)
      ) {
        isNonIndexableItem = true;
      }
      title =
        selectedProduct.seoTitle ||
        `${selectedProduct.name} - Buy ${selectedProduct.category} Online | Global Herbs`;
      description =
        selectedProduct.seoDescription ||
        `${selectedProduct.description || ''} Order ${selectedProduct.name} ($${selectedProduct.price.toFixed(
          2
        )}) online with fast, discreet shipping.`.trim();
      canonicalUrl = `${BASE_DOMAIN}/products/${selectedProduct.slug || selectedProduct.id}`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: selectedProduct.category, url: `${BASE_DOMAIN}/category/${selectedProduct.categorySlug || selectedProduct.category.toLowerCase().replace(/\s+/g, '-')}` },
        { name: selectedProduct.name, url: canonicalUrl },
      ];
    } else if (selectedArticle) {
      title = selectedArticle.metaTitle || `${selectedArticle.title} | Global Herbs Guide`;
      description = selectedArticle.metaDescription || selectedArticle.excerpt;
      canonicalUrl = `${BASE_DOMAIN}/blog/${selectedArticle.slug}`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Knowledge Hub', url: `${BASE_DOMAIN}/blog` },
        { name: selectedArticle.title, url: canonicalUrl },
      ];
    } else if (activeCategory && categoryName) {
      const categorySlug = activeCategory.toLowerCase();
      if (NON_INDEXABLE_CATEGORY_SLUGS.has(categorySlug)) {
        isNonIndexableItem = true;
      }
      const seoGuide = categorySeoMap[categorySlug];
      title = seoGuide?.metaTitle || `Buy ${categoryName} Online - Premium ${categoryName} | Global Herbs`;
      description = seoGuide?.metaDescription || `Shop top-quality ${categoryName} at Global Herbs. Lab-tested products, best prices, fast delivery, and 100% discreet packaging guaranteed.`;
      canonicalUrl = `${BASE_DOMAIN}/category/${encodeURIComponent(categorySlug)}`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: categoryName, url: canonicalUrl },
      ];
    } else if (activePage === 'shop') {
      title = 'Shop THCa, CBD & Botanical Products | Global Herbs';
      description = 'Browse Global Herbs products, including flowers, edibles, vapes, concentrates, and botanical wellness products.';
      canonicalUrl = `${BASE_DOMAIN}/products`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Products', url: canonicalUrl },
      ];
    }

    let robotsDirectives = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    if (isNonIndexableItem) {
      robotsDirectives = 'noindex, follow';
    } else if (searchQuery && searchQuery.trim().length > 0) {
      title = `Search results for "${searchQuery}" | Global Herbs`;
      description = `Browse product search results for "${searchQuery}" at Global Herbs.`;
      canonicalUrl = `${BASE_DOMAIN}/products`;
      robotsDirectives = 'noindex, follow';
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Products', url: `${BASE_DOMAIN}/products` },
        { name: `Search: ${searchQuery}`, url: `${BASE_DOMAIN}/products` },
      ];
    } else if (activePage === 'checkout') {
      title = 'Secure Checkout | Global Herbs';
      description = 'Complete your order securely at Global Herbs.';
      canonicalUrl = `${BASE_DOMAIN}/checkout`;
      robotsDirectives = 'noindex, follow';
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Checkout', url: canonicalUrl },
      ];
    } else if (activePage === 'about') {
      title = 'About Us - Global Herbs | Premium Online Dispensary';
      description = 'Learn about Global Herbs - your trusted source for premium lab-tested products, discreet shipping, and top customer satisfaction.';
      canonicalUrl = `${BASE_DOMAIN}/about`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'About Us', url: canonicalUrl },
      ];
    } else if (activePage === 'shipping') {
      title = 'Shipping Policy & Delivery - Global Herbs';
      description = 'Global Herbs shipping policy: Fast, stealthy, and discreet delivery options. Free shipping on qualifying orders.';
      canonicalUrl = `${BASE_DOMAIN}/shipping`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Shipping Policy', url: canonicalUrl },
      ];
    } else if (activePage === 'returns') {
      title = 'Refund & Returns Policy - Global Herbs';
      description = 'Global Herbs refund and return policy. Customer satisfaction is our top priority.';
      canonicalUrl = `${BASE_DOMAIN}/returns`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Refunds & Returns', url: canonicalUrl },
      ];
    } else if (activePage === 'blog') {
      title = customTitle || 'Cannabis Education & Guides | Global Herbs Knowledge Hub';
      description = customDescription || 'Explore expert educational guides on THCa flower, Live Hash Rosin, Full Spectrum CBD drops for sleep, terpene profiles, and dosing charts.';
      canonicalUrl = `${BASE_DOMAIN}/blog`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Knowledge Hub', url: canonicalUrl },
      ];
    } else if (activePage === 'privacy') {
      title = 'Privacy Policy - Global Herbs';
      description = 'How Global Herbs protects your data and privacy with secure checkout and encrypted customer information.';
      canonicalUrl = `${BASE_DOMAIN}/privacy`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Privacy Policy', url: canonicalUrl },
      ];
    } else if (activePage === 'terms') {
      title = 'Terms & Discreet Shipping Conditions - Global Herbs';
      description = 'Dispensary terms of service, legal age 21+ eligibility, stealth double-seal odourless packaging, and guaranteed delivery policies.';
      canonicalUrl = `${BASE_DOMAIN}/terms`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Terms & Discreet Shipping Conditions', url: canonicalUrl },
      ];
    } else if (activePage === 'contact') {
      title = 'Contact Us - Global Herbs | Customer Support & Inquiries';
      description = 'Contact Global Herbs for product inquiries, custom orders, or account assistance. Fast responses within 1-2 hours.';
      canonicalUrl = `${BASE_DOMAIN}/contact`;
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Contact Us', url: canonicalUrl },
      ];
    } else if (activePage === 'order-tracking') {
      title = 'Track Your Order Status | Global Herbs';
      description = 'Look up the real-time shipping and fulfillment status of your Global Herbs order.';
      canonicalUrl = `${BASE_DOMAIN}/order-tracking`;
      robotsDirectives = 'noindex, follow';
      breadcrumbItems = [
        { name: 'Home', url: `${BASE_DOMAIN}/` },
        { name: 'Order Tracking', url: canonicalUrl },
      ];
    } else if (activePage === 'not-found') {
      title = 'Page Not Found | Global Herbs';
      description = 'The page you requested could not be found.';
      canonicalUrl = `${BASE_DOMAIN}${window.location.pathname}`;
      robotsDirectives = 'noindex, follow';
      breadcrumbItems = [{ name: 'Home', url: `${BASE_DOMAIN}/` }];
    }

    if (customDescription) {
      description = customDescription;
    }

    // 1. Update document title and international attributes
    document.title = title;
    if (document.documentElement) {
      document.documentElement.lang = currentLanguage.code;
      document.documentElement.dir = currentLanguage.dir || 'ltr';
    }

    // 2. Helper to set meta tag
    const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Helper to set link tag
    const setLinkTag = (rel: string, href: string, extraAttrs?: Record<string, string>) => {
      let selector = `link[rel="${rel}"]`;
      if (extraAttrs) {
        for (const [k, v] of Object.entries(extraAttrs)) {
          selector += `[${k}="${v}"]`;
        }
      }
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        if (extraAttrs) {
          for (const [k, v] of Object.entries(extraAttrs)) {
            element.setAttribute(k, v);
          }
        }
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Image for Open Graph & Twitter
    const ogImage = selectedProduct?.image
      ? selectedProduct.image
      : selectedArticle?.featuredImage
      ? selectedArticle.featuredImage
      : `${BASE_DOMAIN}/images/global-herbs-logo.jpg`;

    // 4. Update Canonical URL
    setLinkTag('canonical', canonicalUrl);

    // 5. Update International hreflang alternate links
    const supportedLocales = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ja'];
    setLinkTag('alternate', canonicalUrl, { hreflang: 'x-default' });
    supportedLocales.forEach((code) => {
      const altUrl = code === 'en' ? canonicalUrl : `${canonicalUrl}${canonicalUrl.includes('?') ? '&' : '?'}lang=${code}`;
      setLinkTag('alternate', altUrl, { hreflang: code });
    });

    // 6. Update meta description and robots directives
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robotsDirectives);

    // 7. Update Open Graph tags with localized og:locale
    const localeMap: Record<string, string> = {
      en: 'en_US',
      es: 'es_ES',
      fr: 'fr_FR',
      de: 'de_DE',
      it: 'it_IT',
      nl: 'nl_NL',
      pt: 'pt_PT',
      ja: 'ja_JP',
    };
    const ogLocale = localeMap[currentLanguage.code] || 'en_US';

    setMetaTag('property', 'og:site_name', 'Global Herbs');
    setMetaTag('property', 'og:locale', ogLocale);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', selectedProduct ? 'product' : selectedArticle ? 'article' : 'website');
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', ogImage);

    if (selectedProduct) {
      setMetaTag('property', 'product:price:amount', selectedProduct.price.toFixed(2));
      setMetaTag('property', 'product:price:currency', 'USD');
      setMetaTag('property', 'product:availability', selectedProduct.inStock ? 'instock' : 'outofstock');
    }

    // 8. Update Twitter tags
    setMetaTag('name', 'twitter:card', selectedProduct || selectedArticle ? 'summary_large_image' : 'summary');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 9. Construct Comprehensive Structured Data Schemas
    const existingSchemaScript = document.getElementById('json-ld-schema');
    if (existingSchemaScript) {
      existingSchemaScript.remove();
    }

    const schemas: any[] = [];

    // A. BreadcrumbList Schema
    if (!isNonIndexableItem && breadcrumbItems.length > 1) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      });
    }

    // B. Product Schema (Only for legitimate indexable cannabis/hemp/CBD/herbal products)
    if (selectedProduct && !isNonIndexableItem) {
      schemas.push({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: selectedProduct.name,
        image: selectedProduct.image ? [selectedProduct.image] : [],
        description: selectedProduct.description,
        category: selectedProduct.category,
        ...(selectedProduct.sku ? { sku: selectedProduct.sku } : {}),
        ...(selectedProduct.brand ? {
          brand: {
            '@type': 'Brand',
            name: selectedProduct.brand,
          },
        } : {}),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: selectedProduct.price.toFixed(2),
          itemCondition: 'https://schema.org/NewCondition',
          availability: selectedProduct.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: canonicalUrl,
          seller: {
            '@type': 'Organization',
            name: 'Global Herbs',
          },
        },
      });
    }

    // C. BlogPosting / Article Schema
    if (selectedArticle) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: selectedArticle.title,
        description: selectedArticle.metaDescription,
        image: [selectedArticle.featuredImage],
        datePublished: selectedArticle.publishedDate,
        author: {
          '@type': 'Person',
          name: selectedArticle.author.name,
          jobTitle: selectedArticle.author.role,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Global Herbs',
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_DOMAIN}/images/global-herbs-logo.jpg`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
      });

      // FAQ Schema for genuine article FAQs
      if (selectedArticle.faqs && selectedArticle.faqs.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: selectedArticle.faqs.map((faq) => ({
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

    // D. Category FAQ Schema (if browsing a category with genuine FAQs)
    if (activeCategory && !selectedProduct && !selectedArticle) {
      const seoGuide = categorySeoMap[activeCategory.toLowerCase()];
      if (seoGuide && seoGuide.faqs && seoGuide.faqs.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: seoGuide.faqs.map((faq) => ({
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

    if (schemas.length > 0) {
      const script = document.createElement('script');
      script.id = 'json-ld-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
      document.head.appendChild(script);
    }
  }, [
    activePage,
    activeCategory,
    categoryName,
    selectedProduct,
    selectedArticle,
    searchQuery,
    customTitle,
    customDescription,
    currentLanguage.code,
  ]);

  return null;
}
