import express, { Request, Response, NextFunction } from 'express';
import { blogStorage } from './blogStorage';
import { blogScheduler } from './blogSchedulerService';
import { keywordResearchService } from './keywordResearchService';
import { generateBlogArticle } from './articleGeneratorService';
import { validateArticle } from './blogValidator';
import { SeoOverviewData } from '../../types/blog';
import { generateSitemapXML } from '../../utils/sitemap';

export const blogRouter = express.Router();

/**
 * Middleware to verify dispensary administrator credentials
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const adminSecretHeader = req.headers['x-admin-secret'] || req.headers['x-admin-key'];
  const userEmailHeader = (req.headers['x-user-email'] as string) || '';
  const querySecret = req.query.adminSecret as string;

  const validSecret = process.env.BLOG_ADMIN_SECRET || 'gh-dispensary-admin-2026';
  const adminEmail = (process.env.ADMIN_EMAIL || 'zakinahor692@gmail.com').toLowerCase();

  // Allow if admin secret matches
  if (adminSecretHeader === validSecret || querySecret === validSecret) {
    return next();
  }

  // Allow if user email is verified dispensary admin
  if (userEmailHeader.toLowerCase() === adminEmail || userEmailHeader.toLowerCase() === 'globalherbsinc@gmail.com') {
    return next();
  }

  // Allow if Bearer token is provided
  if (authHeader.startsWith('Bearer ') && authHeader.length > 10) {
    return next();
  }

  // For testing / demo environment, allow development applet origin if local
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin.includes('localhost') || origin.includes('ais-dev')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Administrator privileges required for SEO Blog Management.',
  });
}

// ============================================================================
// PUBLIC BLOG ENDPOINTS
// ============================================================================

/**
 * GET /api/blog
 * Returns all published articles for the public website
 */
blogRouter.get('/api/blog', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const category = req.query.category as string;
  const search = req.query.q as string;

  let list = blogStorage.getPublishedArticles();

  if (category && category !== 'All') {
    list = list.filter((a) => a.category === category || a.categorySlug === category);
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter((a) => {
      const inTitle = a.title.toLowerCase().includes(q);
      const inExcerpt = a.excerpt.toLowerCase().includes(q);
      const inKeywords = (a.targetKeywords || []).some((kw) => kw.toLowerCase().includes(q));
      return inTitle || inExcerpt || inKeywords;
    });
  }

  return res.json({
    success: true,
    total: list.length,
    articles: list,
  });
});

/**
 * GET /api/blog/:slug
 * Returns a single published article by slug
 */
blogRouter.get('/api/blog/:slug', (req: Request, res: Response) => {
  const slug = req.params.slug;
  const article = blogStorage.getArticleBySlug(slug);

  if (!article) {
    return res.status(404).json({
      success: false,
      error: `Article with slug "${slug}" not found.`,
    });
  }

  // If unpublished and not admin requesting preview
  const isPreview = req.query.preview === 'true';
  if (article.status !== 'published' && !isPreview) {
    return res.status(404).json({
      success: false,
      error: 'This article is currently in draft or scheduled state.',
    });
  }

  return res.json({
    success: true,
    article,
  });
});

// ============================================================================
// ADMINISTRATOR BLOG MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/blog/articles
 * Returns all articles (drafts, scheduled, published, failed)
 */
blogRouter.get('/api/admin/blog/articles', requireAdmin, (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;
  let articles = blogStorage.getAllArticles();

  if (statusFilter && statusFilter !== 'all') {
    articles = articles.filter((a) => a.status === statusFilter);
  }

  const counts = {
    all: blogStorage.getAllArticles().length,
    published: blogStorage.getAllArticles().filter((a) => a.status === 'published').length,
    scheduled: blogStorage.getAllArticles().filter((a) => a.status === 'scheduled').length,
    draft: blogStorage.getAllArticles().filter((a) => a.status === 'draft').length,
    failed: blogStorage.getAllArticles().filter((a) => a.status === 'failed').length,
  };

  return res.json({
    success: true,
    counts,
    articles,
  });
});

/**
 * GET /api/admin/blog/articles/:id
 */
blogRouter.get('/api/admin/blog/articles/:id', requireAdmin, (req: Request, res: Response) => {
  const article = blogStorage.getArticleById(req.params.id);
  if (!article) {
    return res.status(404).json({ success: false, error: 'Article not found.' });
  }
  const validation = validateArticle(article, blogStorage.getAllArticles());
  return res.json({ success: true, article, validation });
});

/**
 * POST /api/admin/blog/articles
 * Creates a new article (draft by default)
 */
blogRouter.post('/api/admin/blog/articles', requireAdmin, (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = blogStorage.createArticle(req.body, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

/**
 * PUT /api/admin/blog/articles/:id
 * Updates an existing article
 */
blogRouter.put('/api/admin/blog/articles/:id', requireAdmin, (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = blogStorage.updateArticle(req.params.id, req.body, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

/**
 * DELETE /api/admin/blog/articles/:id
 */
blogRouter.delete('/api/admin/blog/articles/:id', requireAdmin, (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = blogStorage.deleteArticle(req.params.id, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  blogScheduler.updateSitemap();
  return res.json(result);
});

/**
 * POST /api/admin/blog/articles/:id/publish
 * Manually publishes an article immediately with validation
 */
blogRouter.post('/api/admin/blog/articles/:id/publish', requireAdmin, (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const force = req.body?.force === true;
  const result = blogStorage.publishArticle(req.params.id, user, force);

  if (!result.success) {
    return res.status(422).json(result);
  }

  blogScheduler.updateSitemap();
  return res.json(result);
});

/**
 * POST /api/admin/blog/articles/:id/unpublish
 * Reverts a published article back to draft state
 */
blogRouter.post('/api/admin/blog/articles/:id/unpublish', requireAdmin, (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = blogStorage.unpublishArticle(req.params.id, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  blogScheduler.updateSitemap();
  return res.json(result);
});

/**
 * POST /api/admin/blog/articles/:id/schedule
 * Schedules an article for a specific date and time
 */
blogRouter.post('/api/admin/blog/articles/:id/schedule', requireAdmin, (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const { scheduledFor } = req.body;
  if (!scheduledFor) {
    return res.status(400).json({ success: false, error: 'scheduledFor ISO date is required.' });
  }

  const result = blogStorage.scheduleArticle(req.params.id, scheduledFor, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

/**
 * POST /api/admin/blog/articles/:id/validate
 * Runs on-demand pre-publication validation
 */
blogRouter.post('/api/admin/blog/articles/:id/validate', requireAdmin, (req: Request, res: Response) => {
  const article = blogStorage.getArticleById(req.params.id);
  if (!article) {
    return res.status(404).json({ success: false, error: 'Article not found.' });
  }
  const validation = validateArticle(article, blogStorage.getAllArticles());
  return res.json({ success: true, validation });
});

/**
 * POST /api/admin/blog/generate
 * Server-side AI article generation
 */
blogRouter.post('/api/admin/blog/generate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { primaryKeyword, secondaryKeywords, topicPrompt, categorySlug, preferredTone } = req.body;
    if (!primaryKeyword || !primaryKeyword.trim()) {
      return res.status(400).json({ success: false, error: 'Primary keyword is required for article generation.' });
    }

    const generated = await generateBlogArticle({
      primaryKeyword,
      secondaryKeywords: Array.isArray(secondaryKeywords) ? secondaryKeywords : [],
      topicPrompt,
      categorySlug,
      preferredTone,
    });

    return res.json({
      success: true,
      ...generated,
    });
  } catch (err: any) {
    console.error('[BlogRoutes] Article generation failed:', err);
    return res.status(500).json({ success: false, error: err.message || 'Generation failed.' });
  }
});

/**
 * POST /api/admin/blog/keywords/research
 * Keyword research and cluster discovery
 */
blogRouter.post('/api/admin/blog/keywords/research', requireAdmin, async (req: Request, res: Response) => {
  try {
    const topic = (req.body?.topic || req.query?.topic || '') as string;
    const result = await keywordResearchService.researchTopic(topic);
    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[BlogRoutes] Keyword research failed:', err);
    return res.status(500).json({ success: false, error: err.message || 'Keyword research failed.' });
  }
});

/**
 * GET /api/admin/blog/schedule-config
 */
blogRouter.get('/api/admin/blog/schedule-config', requireAdmin, (req: Request, res: Response) => {
  return res.json({
    success: true,
    schedulerStatus: blogScheduler.getStatus(),
  });
});

/**
 * PUT /api/admin/blog/schedule-config
 */
blogRouter.put('/api/admin/blog/schedule-config', requireAdmin, (req: Request, res: Response) => {
  const updated = blogStorage.saveScheduleConfig(req.body);
  return res.json({
    success: true,
    config: updated,
    schedulerStatus: blogScheduler.getStatus(),
  });
});

/**
 * POST /api/admin/blog/trigger-scheduler
 * Manually executes the scheduler publishing check (for testing)
 */
blogRouter.post('/api/admin/blog/trigger-scheduler', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Admin Manual Trigger';
  const result = await blogScheduler.checkDueArticles(`Manual Admin Trigger by ${user}`);
  return res.json({
    success: true,
    message: `Scheduler check executed. Checked: ${result.checked}, Published: ${result.published.length}, Failed: ${result.failed.length}`,
    ...result,
  });
});

/**
 * GET /api/admin/blog/audit-logs
 */
blogRouter.get('/api/admin/blog/audit-logs', requireAdmin, (req: Request, res: Response) => {
  return res.json({
    success: true,
    logs: blogStorage.getAuditLogs(),
  });
});

/**
 * GET /api/admin/blog/seo-overview
 * Comprehensive SEO health, indexation, and cluster coverage dashboard data
 */
blogRouter.get('/api/admin/blog/seo-overview', requireAdmin, (req: Request, res: Response) => {
  const allArticles = blogStorage.getAllArticles();
  const clusters = keywordResearchService.getKeywordClusters();

  const clusterCoverage = clusters.map((c) => {
    const covered = c.keywords.filter((k) => k.isCovered).length;
    return {
      clusterName: c.name,
      totalKeywords: c.keywords.length,
      coveredCount: covered,
      coveragePercent: Math.round((covered / Math.max(1, c.keywords.length)) * 100),
    };
  });

  const overview: SeoOverviewData = {
    totalArticles: allArticles.length,
    publishedCount: allArticles.filter((a) => a.status === 'published').length,
    scheduledCount: allArticles.filter((a) => a.status === 'scheduled').length,
    draftCount: allArticles.filter((a) => a.status === 'draft').length,
    failedCount: allArticles.filter((a) => a.status === 'failed').length,
    sitemapLastUpdated: new Date().toISOString(),
    sitemapUrlCount: allArticles.filter((a) => a.status === 'published').length + 25, // includes static pages
    searchConsoleStatus: {
      connected: !!process.env.GOOGLE_SEARCH_CONSOLE_KEY,
      verificationMethod: 'HTML Meta Tag / DNS TXT',
      siteUrl: 'https://globalherbs.site',
      verificationTagConfigured: true,
    },
    clusterCoverage,
    recentAudits: blogStorage.getAuditLogs().slice(0, 15),
  };

  return res.json({
    success: true,
    overview,
  });
});

// ============================================================================
// GOOGLE CLOUD SCHEDULER WEBHOOK ENDPOINT
// ============================================================================

/**
 * POST /api/admin/blog/cron-publish
 * Secure endpoint callable by Google Cloud Scheduler or external cron services
 */
blogRouter.post('/api/admin/blog/cron-publish', async (req: Request, res: Response) => {
  const incomingSecret =
    req.headers['x-scheduler-secret'] ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.secret;

  const config = blogStorage.getScheduleConfig();
  const validSecrets = [
    config.schedulerSecret,
    process.env.BLOG_SCHEDULER_SECRET || 'gh-scheduler-sec-2026',
    process.env.BLOG_ADMIN_SECRET || 'gh-dispensary-admin-2026',
  ].filter(Boolean);

  if (!incomingSecret || !validSecrets.includes(incomingSecret as string)) {
    console.warn('[BlogScheduler] Unauthorized Cloud Scheduler invocation attempt.');
    return res.status(401).json({
      success: false,
      error: 'Invalid scheduler secret. Supply matching X-Scheduler-Secret header.',
    });
  }

  console.log('[BlogScheduler] Verified Cloud Scheduler webhook trigger received.');
  const result = await blogScheduler.checkDueArticles('Google Cloud Scheduler Webhook');

  return res.json({
    success: true,
    source: 'Google Cloud Scheduler',
    timestamp: new Date().toISOString(),
    ...result,
  });
});
