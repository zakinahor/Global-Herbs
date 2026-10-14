import { ManagedBlogArticle, ArticleValidationResult } from '../../types/blog';
import { products, categories } from '../../data/products';

const PROHIBITED_MEDICAL_CLAIMS = [
  /cure[s]?\s+cancer/i,
  /cure[s]?\s+alzheimer/i,
  /cure[s]?\s+dementia/i,
  /cure[s]?\s+tumor/i,
  /cures\s+diabetes/i,
  /cure[s]?\s+epilepsy/i,
  /miracle\s+cure/i,
  /replaces\s+chemotherapy/i,
  /guaranteed\s+to\s+cure/i,
  /proven\s+to\s+heal\s+all/i,
];

/**
 * Validates a blog article before publication or scheduling.
 * Rejects broken internal links, duplicate slugs, missing metadata, and unsupported medical claims.
 */
export function validateArticle(
  article: Partial<ManagedBlogArticle>,
  existingArticles: ManagedBlogArticle[] = []
): ArticleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: { label: string; passed: boolean; details?: string }[] = [];

  let score = 100;

  // 1. Slug check
  const slug = (article.slug || '').trim().toLowerCase();
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slug) {
    errors.push('URL slug is required.');
    checks.push({ label: 'Slug Presence', passed: false, details: 'Missing slug' });
    score -= 15;
  } else if (!slugRegex.test(slug)) {
    errors.push('Slug must contain only lowercase alphanumeric characters and hyphens.');
    checks.push({ label: 'Slug Format', passed: false, details: 'Invalid characters in slug' });
    score -= 10;
  } else {
    // Check duplicate slug
    const duplicate = existingArticles.find((a) => a.slug === slug && a.id !== article.id);
    if (duplicate) {
      errors.push(`Duplicate slug detected: "${slug}" is already in use by article "${duplicate.title}".`);
      checks.push({ label: 'Slug Uniqueness', passed: false, details: `Conflicts with "${duplicate.title}"` });
      score -= 25;
    } else {
      checks.push({ label: 'Slug Uniqueness & Format', passed: true, details: `Clean canonical /blog/${slug}` });
    }
  }

  // 2. SEO Title & H1
  const title = (article.title || '').trim();
  const metaTitle = (article.metaTitle || title).trim();
  if (!title) {
    errors.push('Article title (H1) is required.');
    checks.push({ label: 'Title (H1)', passed: false, details: 'Missing title' });
    score -= 15;
  } else if (title.length < 15 || title.length > 120) {
    warnings.push(`Title length is ${title.length} characters (recommended: 30-75 characters).`);
    checks.push({ label: 'Title Length', passed: false, details: `${title.length} chars (optimum: 30-75)` });
    score -= 5;
  } else {
    checks.push({ label: 'Title (H1) & Length', passed: true, details: `${title.length} characters` });
  }

  // 3. Meta Description
  const metaDescription = (article.metaDescription || '').trim();
  if (!metaDescription) {
    errors.push('SEO meta description is required.');
    checks.push({ label: 'Meta Description', passed: false, details: 'Missing meta description' });
    score -= 15;
  } else if (metaDescription.length < 50 || metaDescription.length > 180) {
    warnings.push(`Meta description is ${metaDescription.length} characters (recommended: 70-160 characters).`);
    checks.push({ label: 'Meta Description Length', passed: false, details: `${metaDescription.length} chars (optimum: 70-160)` });
    score -= 5;
  } else {
    checks.push({ label: 'Meta Description Length', passed: true, details: `${metaDescription.length} characters` });
  }

  // 4. Primary Keyword & Density
  const primaryKw = (article.primaryKeyword || (article.targetKeywords && article.targetKeywords[0]) || '').trim().toLowerCase();
  if (!primaryKw) {
    warnings.push('No primary target keyword specified.');
    checks.push({ label: 'Target Keyword', passed: false, details: 'Missing primary keyword' });
    score -= 10;
  } else {
    const titleHasKw = title.toLowerCase().includes(primaryKw);
    const metaHasKw = metaDescription.toLowerCase().includes(primaryKw);
    if (!titleHasKw) {
      warnings.push(`Primary keyword "${primaryKw}" not found in title.`);
      score -= 5;
    }
    if (!metaHasKw) {
      warnings.push(`Primary keyword "${primaryKw}" not found in meta description.`);
      score -= 5;
    }
    checks.push({
      label: 'Keyword Optimization',
      passed: titleHasKw && metaHasKw,
      details: `Target: "${primaryKw}" (${titleHasKw ? 'In Title' : 'Missing in Title'}, ${metaHasKw ? 'In Meta' : 'Missing in Meta'})`,
    });
  }

  // 5. Content Structure & Word Count
  const sections = article.contentSections || [];
  let totalWords = 0;
  sections.forEach((sec) => {
    (sec.paragraphs || []).forEach((p) => {
      totalWords += p.split(/\s+/).filter(Boolean).length;
    });
    (sec.subsections || []).forEach((sub) => {
      (sub.paragraphs || []).forEach((p) => {
        totalWords += p.split(/\s+/).filter(Boolean).length;
      });
      (sub.bullets || []).forEach((b) => {
        totalWords += b.split(/\s+/).filter(Boolean).length;
      });
    });
  });

  if (sections.length < 2) {
    errors.push('Article must contain at least 2 distinct H2 content sections.');
    checks.push({ label: 'Content Depth (H2 Sections)', passed: false, details: `Only ${sections.length} section(s)` });
    score -= 20;
  } else {
    checks.push({ label: 'Content Depth (H2 Sections)', passed: true, details: `${sections.length} structured sections` });
  }

  if (totalWords < 350) {
    errors.push(`Article content is too thin (${totalWords} words). Minimum required is 350 words.`);
    checks.push({ label: 'Word Count Minimum', passed: false, details: `${totalWords} words (min 350)` });
    score -= 15;
  } else {
    checks.push({ label: 'Word Count', passed: true, details: `${totalWords} words` });
  }

  // 6. Key Takeaways & FAQs
  const takeaways = article.keyTakeaways || [];
  if (takeaways.length === 0) {
    warnings.push('Key takeaways list is recommended for search snippets and reader engagement.');
    checks.push({ label: 'Key Takeaways', passed: false, details: '0 takeaways' });
    score -= 5;
  } else {
    checks.push({ label: 'Key Takeaways', passed: true, details: `${takeaways.length} takeaways` });
  }

  const faqs = article.faqs || [];
  if (faqs.length === 0) {
    warnings.push('FAQ section is recommended for rich search snippet eligibility.');
    checks.push({ label: 'FAQ Rich Snippet Schema', passed: false, details: '0 FAQs' });
    score -= 5;
  } else {
    checks.push({ label: 'FAQ Rich Snippet Schema', passed: true, details: `${faqs.length} FAQs ready for Schema.org` });
  }

  // 7. Internal Links Verification
  const validCategorySlugs = new Set(categories.map((c) => c.slug));
  const validProductSlugs = new Set(products.map((p) => p.slug || String(p.id)));

  let detectedInternalLinks = 0;
  let brokenLinks: string[] = [];

  // Inspect recommendedCategorySlug
  if (article.recommendedCategorySlug) {
    detectedInternalLinks++;
    if (!validCategorySlugs.has(article.recommendedCategorySlug)) {
      brokenLinks.push(`Recommended category slug "/category/${article.recommendedCategorySlug}" does not exist in store.`);
    }
  }

  // Scan all paragraph text for markdown links [text](/url) or href="/url"
  const linkRegex = /(?:\[[^\]]+\]\((\/[^\s\)]+)\)|href=["'](\/[^"']+)["'])/g;
  sections.forEach((sec) => {
    (sec.paragraphs || []).forEach((text) => {
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        const url = match[1] || match[2];
        detectedInternalLinks++;
        if (url.startsWith('/category/')) {
          const cat = url.replace('/category/', '').split('?')[0].split('#')[0];
          if (!validCategorySlugs.has(cat)) {
            brokenLinks.push(`Broken category link: ${url}`);
          }
        } else if (url.startsWith('/products/')) {
          const prod = url.replace('/products/', '').split('?')[0].split('#')[0];
          if (!validProductSlugs.has(prod)) {
            brokenLinks.push(`Broken product link: ${url}`);
          }
        }
      }
    });
  });

  if (brokenLinks.length > 0) {
    errors.push(`Broken internal links detected: ${brokenLinks.join(', ')}`);
    checks.push({ label: 'Internal Links Integrity', passed: false, details: `${brokenLinks.length} broken links` });
    score -= 15;
  } else {
    checks.push({
      label: 'Internal Links Integrity',
      passed: true,
      details: `${detectedInternalLinks} valid store/catalog link(s)`,
    });
  }

  // 8. Cannabis Health & Legal Compliance Filter
  const fullText = [
    title,
    metaDescription,
    ...sections.flatMap((s) => s.paragraphs || []),
    ...faqs.map((f) => `${f.question} ${f.answer}`),
  ].join(' ');

  let medicalClaimViolation = false;
  for (const pattern of PROHIBITED_MEDICAL_CLAIMS) {
    if (pattern.test(fullText)) {
      medicalClaimViolation = true;
      errors.push(`Prohibited medical claim detected matching pattern ${pattern}. Cannabis products cannot claim to cure or diagnose medical conditions.`);
      break;
    }
  }

  if (medicalClaimViolation) {
    checks.push({ label: 'FDA / Health Claims Compliance', passed: false, details: 'Prohibited medical claim detected' });
    score -= 30;
  } else {
    checks.push({ label: 'FDA / Health Claims Compliance', passed: true, details: 'No prohibited disease treatment claims' });
  }

  // 9. Botanical Disclaimer & Age Verification
  const disclaimer = (article.botanicalDisclaimer || '').trim();
  const hasDisclaimer = disclaimer.length > 20 || fullText.toLowerCase().includes('food and drug administration') || fullText.toLowerCase().includes('fda');
  if (!hasDisclaimer) {
    warnings.push('Mandatory FDA botanical disclaimer is missing or incomplete.');
    checks.push({ label: 'FDA Botanical Disclaimer', passed: false, details: 'Disclaimer missing' });
    score -= 10;
  } else {
    checks.push({ label: 'FDA Botanical Disclaimer', passed: true, details: 'Compliant dispensary disclosure attached' });
  }

  // Clamp score
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const passed = errors.length === 0;

  return {
    passed,
    score: finalScore,
    errors,
    warnings,
    checks,
  };
}
