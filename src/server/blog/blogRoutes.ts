import express, { Request, Response, NextFunction } from 'express';
import { blogStorage } from './blogStorage';
import { blogScheduler } from './blogSchedulerService';
import { keywordResearchService } from './keywordResearchService';
import { generateBlogArticle } from './articleGeneratorService';
import { validateArticle } from './blogValidator';
import { SeoOverviewData } from '../../types/blog';
import { generateSitemapXML } from '../../utils/sitemap';
import { claimAndPublishDueArticles } from './blogPublisher';
import { verifyCronAuthorization, verifyAdminSession } from './cronAuth';

export const blogRouter = express.Router();

/**
 * Middleware to verify dispensary administrator credentials
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (verifyAdminSession(req)) {
    return next();
  }

  // Allow localhost / local testing origin if explicitly non-production
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const origin = req.headers.origin || req.headers.referer || '';
  if (!isProd && (origin.includes('localhost') || origin.includes('ais-dev'))) {
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

  // Draft/scheduled articles require admin access or explicit preview query
  if (article.status !== 'published') {
    const isPreview = req.query.preview === 'true';
    if (!isPreview && !verifyAdminSession(req)) {
      return res.status(404).json({
        success: false,
        error: `Article with slug "${slug}" is not currently published.`,
      });
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
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
 * Lists all articles (draft, scheduled, published, failed)
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
blogRouter.post('/api/admin/blog/articles', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = await blogStorage.createArticle(req.body, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

/**
 * PUT /api/admin/blog/articles/:id
 * Updates an existing article
 */
blogRouter.put('/api/admin/blog/articles/:id', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = await blogStorage.updateArticle(req.params.id, req.body, user);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

/**
 * DELETE /api/admin/blog/articles/:id
 */
blogRouter.delete('/api/admin/blog/articles/:id', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = await blogStorage.deleteArticle(req.params.id, user);
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
blogRouter.post('/api/admin/blog/articles/:id/publish', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const force = req.body?.force === true;
  const result = await blogStorage.publishArticle(req.params.id, user, force);

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
blogRouter.post('/api/admin/blog/articles/:id/unpublish', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const result = await blogStorage.unpublishArticle(req.params.id, user);
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
blogRouter.post('/api/admin/blog/articles/:id/schedule', requireAdmin, async (req: Request, res: Response) => {
  const user = (req.headers['x-user-email'] as string) || 'Dispensary Admin';
  const { scheduledFor } = req.body;
  if (!scheduledFor) {
    return res.status(400).json({ success: false, error: 'scheduledFor ISO date is required.' });
  }

  const result = await blogStorage.scheduleArticle(req.params.id, scheduledFor, user);
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

  const target = req.body && Object.keys(req.body).length > 0 ? { ...article, ...req.body } : article;
  const validation = validateArticle(target, blogStorage.getAllArticles());

  return res.json({
    success: true,
    validation,
  });
});

/**
 * POST /api/admin/blog/generate
 * Invokes Gemini AI to draft a full, structured botanical article
 */
blogRouter.post('/api/admin/blog/generate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { primaryKeyword, targetAudience, desiredLength, preferredCategory, secondaryKeywords } = req.body;

    if (!primaryKeyword || typeof primaryKeyword !== 'string' || !primaryKeyword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'primaryKeyword is required to generate an article.',
      });
    }

    const generated = await generateBlogArticle({
      primaryKeyword: primaryKeyword.trim(),
      secondaryKeywords,
      topicPrompt: targetAudience || desiredLength,
      categorySlug: preferredCategory,
    });

    return res.json({
      success: true,
      article: generated,
    });
  } catch (err: any) {
    console.error('[BlogRoutes] Generation error:', err);
    return res.status(500).json({
      success: false,
      error: `Article generation failed: ${err.message || 'Internal AI service error'}`,
    });
  }
});

/**
 * POST /api/admin/blog/keywords/research
 * AI-assisted keyword discovery and cluster mapping
 */
blogRouter.post('/api/admin/blog/keywords/research', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { seedTopic } = req.body;
    const result = await keywordResearchService.researchTopic(seedTopic || 'cannabis');
    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[BlogRoutes] Keyword research error:', err);
    return res.status(500).json({
      success: false,
      error: `Keyword research failed: ${err.message}`,
    });
  }
});

/**
 * GET /api/admin/blog/schedule-config
 */
blogRouter.get('/api/admin/blog/schedule-config', requireAdmin, (req: Request, res: Response) => {
  return res.json({
    success: true,
    config: blogStorage.getScheduleConfig(),
    status: blogScheduler.getStatus(),
  });
});

/**
 * PUT /api/admin/blog/schedule-config
 */
blogRouter.put('/api/admin/blog/schedule-config', requireAdmin, async (req: Request, res: Response) => {
  const updated = await blogStorage.saveScheduleConfig(req.body);
  return res.json({
    success: true,
    config: updated,
  });
});

/**
 * POST /api/admin/blog/trigger-scheduler
 * On-demand manual test run by administrator from dashboard
 */
blogRouter.post('/api/admin/blog/trigger-scheduler', requireAdmin, async (req: Request, res: Response) => {
  console.log('[BlogRoutes] Administrator triggered manual publishing run.');
  const result = await claimAndPublishDueArticles('Administrator Manual Run', 5);
  blogScheduler.updateSitemap();

  return res.json({
    success: true,
    triggeredAt: new Date().toISOString(),
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
 * GET /api/admin/blog/backup
 * Downloads complete JSON snapshot of all database records for disaster recovery
 */
blogRouter.get('/api/admin/blog/backup', requireAdmin, async (req: Request, res: Response) => {
  const snapshot = await blogStorage.exportBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="globalherbs_blog_backup_${Date.now()}.json"`);
  return res.send(JSON.stringify(snapshot, null, 2));
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
    sitemapUrlCount: allArticles.filter((a) => a.status === 'published').length + 25,
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
// VERCEL CRON & EXTERNAL SCHEDULER ENDPOINT
// ============================================================================

/**
 * Shared handler for Vercel Cron and external scheduler webhooks
 * Supports:
 * - Authorization: Bearer <CRON_SECRET> (timing-safe comparison)
 * - Administrator credentials
 * - Both POST and GET methods (Vercel Cron invokes with GET or POST)
 */
async function handleCronPublish(req: Request, res: Response) {
  // 1. Check CRON_SECRET authorization
  const cronAuth = verifyCronAuthorization(req);
  const isAdmin = verifyAdminSession(req);

  if (!cronAuth.authorized && !isAdmin) {
    console.warn('[CronPublish] Unauthorized cron invocation attempt:', cronAuth.reason);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid CRON_SECRET Bearer token or administrator authentication required.',
    });
  }

  const triggerSource = cronAuth.authorized ? 'Vercel Cron Worker' : 'Dispensary Admin Invocation';
  console.log(`[CronPublish] Verified ${triggerSource} trigger received.`);

  const result = await claimAndPublishDueArticles(triggerSource, 5);

  return res.status(200).json({
    success: true,
    source: triggerSource,
    timestamp: new Date().toISOString(),
    ...result,
  });
}

// Support both standard Vercel Cron path (/api/cron/publish) and legacy path (/api/admin/blog/cron-publish)
blogRouter.get('/api/cron/publish', handleCronPublish);
blogRouter.post('/api/cron/publish', handleCronPublish);
blogRouter.get('/api/admin/blog/cron-publish', handleCronPublish);
blogRouter.post('/api/admin/blog/cron-publish', handleCronPublish);
