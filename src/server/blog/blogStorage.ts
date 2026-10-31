import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ManagedBlogArticle,
  BlogPublishStatus,
  PublishingScheduleConfig,
  BlogAuditLog,
} from '../../types/blog';
import { blogArticles as baselineArticles } from '../../data/blogArticles';
import { validateArticle } from './blogValidator';
import { getPool, initDatabase, mapRowToArticle } from './db';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'blog_articles.json');
const SCHEDULE_CONFIG_FILE = path.join(DATA_DIR, 'blog_schedule_config.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'blog_audit_logs.json');

const DEFAULT_SCHEDULE_CONFIG: PublishingScheduleConfig = {
  enabled: true,
  autoPublishApprovedDrafts: false,
  timezone: 'America/Los_Angeles',
  daysOfWeek: [1, 3, 5], // Monday (1), Wednesday (3), Friday (5)
  publishHour: 10,       // 10:00 AM
  publishMinute: 0,
  schedulerSecret: process.env.CRON_SECRET || 'gh-scheduler-sec-2026',
  autoGenerateTopicWeekly: false,
};

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem in Vercel serverless environment
  }
}

function seedInitialArticles(): ManagedBlogArticle[] {
  return baselineArticles.map((b, index) => ({
    ...b,
    status: 'published' as BlogPublishStatus,
    primaryKeyword: b.targetKeywords?.[0] || 'cannabis education',
    createdAt: new Date(Date.now() - (6 - index) * 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date(Date.now() - (6 - index) * 7 * 86400000).toISOString(),
    seoScore: 94,
    wordCount: b.contentSections.reduce((acc, sec) => {
      const pWords = (sec.paragraphs || []).join(' ').split(/\s+/).length;
      return acc + pWords;
    }, 0),
    isAiGenerated: false,
  }));
}

class BlogStorageService {
  private articles: Map<string, ManagedBlogArticle> = new Map();
  private auditLogs: BlogAuditLog[] = [];
  private scheduleConfig: PublishingScheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG };
  private initializedFromDb: boolean = false;

  constructor() {
    try {
      this.initLocal();
    } catch (e) {
      console.warn('[BlogStorage] Initial local storage warning:', e);
      const seeded = seedInitialArticles();
      this.articles.clear();
      seeded.forEach((art) => this.articles.set(art.id, art));
    }
    // Fire background DB hydration safely
    try {
      this.refreshFromDatabase().catch((err) => {
        if (isProduction) {
          console.warn('[BlogStorage] Initial database hydration warning:', err?.message || err);
        }
      });
    } catch {}
  }

  private initLocal() {
    ensureDataDir();
    this.loadLocalArticles();
    this.loadLocalScheduleConfig();
    this.loadLocalAuditLogs();
  }

  private loadLocalArticles() {
    try {
      const targetFile = fs.existsSync(ARTICLES_FILE)
        ? ARTICLES_FILE
        : path.join(process.cwd(), 'data', 'blog_articles.json');
      if (fs.existsSync(targetFile)) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const list: ManagedBlogArticle[] = JSON.parse(raw);
        this.articles.clear();
        list.forEach((art) => this.articles.set(art.id, art));
      } else {
        const seeded = seedInitialArticles();
        this.articles.clear();
        seeded.forEach((art) => this.articles.set(art.id, art));
        if (!isProduction) this.saveLocalArticles();
      }
    } catch (err) {
      console.error('[BlogStorage] Error loading local articles:', err);
      const seeded = seedInitialArticles();
      seeded.forEach((art) => this.articles.set(art.id, art));
    }
  }

  private saveLocalArticles() {
    if (isProduction) return; // Do not write ephemeral files in production
    try {
      ensureDataDir();
      const list = Array.from(this.articles.values());
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BlogStorage] Error saving local articles:', err);
    }
  }

  private loadLocalScheduleConfig() {
    try {
      if (fs.existsSync(SCHEDULE_CONFIG_FILE)) {
        const raw = fs.readFileSync(SCHEDULE_CONFIG_FILE, 'utf-8');
        this.scheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG, ...JSON.parse(raw) };
      } else if (!isProduction) {
        this.saveLocalScheduleConfig();
      }
    } catch (err) {
      console.error('[BlogStorage] Error loading local schedule config:', err);
    }
  }

  private saveLocalScheduleConfig() {
    if (isProduction) return;
    try {
      ensureDataDir();
      fs.writeFileSync(SCHEDULE_CONFIG_FILE, JSON.stringify(this.scheduleConfig, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BlogStorage] Error saving local schedule config:', err);
    }
  }

  private loadLocalAuditLogs() {
    try {
      if (fs.existsSync(AUDIT_LOGS_FILE)) {
        const raw = fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8');
        this.auditLogs = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[BlogStorage] Error loading local audit logs:', err);
      this.auditLogs = [];
    }
  }

  /**
   * Hydrates memory cache from PostgreSQL
   */
  public async refreshFromDatabase(): Promise<void> {
    const pool = getPool();
    if (!pool) return;

    try {
      await initDatabase();
      const client = await pool.connect();
      try {
        const articlesRes = await client.query('SELECT * FROM blog_articles ORDER BY created_at DESC');
        if (articlesRes.rows.length > 0) {
          this.articles.clear();
          for (const row of articlesRes.rows) {
            const art = mapRowToArticle(row);
            this.articles.set(art.id, art);
          }
        }

        const configRes = await client.query("SELECT * FROM blog_schedule_config WHERE id = 'singleton'");
        if (configRes.rows.length > 0) {
          const cfg = configRes.rows[0];
          this.scheduleConfig = {
            enabled: cfg.enabled,
            autoPublishApprovedDrafts: cfg.auto_publish_approved_drafts,
            timezone: cfg.timezone,
            daysOfWeek: Array.isArray(cfg.days_of_week) ? cfg.days_of_week : JSON.parse(cfg.days_of_week || '[1,3,5]'),
            publishHour: cfg.publish_hour,
            publishMinute: cfg.publish_minute,
            schedulerSecret: cfg.scheduler_secret,
            autoGenerateTopicWeekly: cfg.auto_generate_topic_weekly,
            lastRunAt: cfg.last_run_at ? new Date(cfg.last_run_at).toISOString() : undefined,
            nextScheduledSlot: cfg.next_scheduled_slot ? new Date(cfg.next_scheduled_slot).toISOString() : undefined,
          };
        }

        const auditRes = await client.query('SELECT * FROM blog_audit_logs ORDER BY timestamp DESC LIMIT 200');
        this.auditLogs = auditRes.rows.map((row) => ({
          id: row.id,
          timestamp: new Date(row.timestamp).toISOString(),
          action: row.action,
          articleId: row.article_id,
          articleSlug: row.article_slug,
          articleTitle: row.article_title,
          status: row.status,
          user: row.user_identity,
          details: row.details,
        }));

        this.initializedFromDb = true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[BlogStorage] refreshFromDatabase error:', err);
    }
  }

  public async logAction(
    action: BlogAuditLog['action'],
    article: { id: string; slug: string; title: string; status: BlogPublishStatus },
    user: string,
    details: string
  ) {
    const entry: BlogAuditLog = {
      id: `LOG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      action,
      articleId: article.id,
      articleSlug: article.slug,
      articleTitle: article.title,
      status: article.status,
      user,
      details,
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          INSERT INTO blog_audit_logs (
            id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [entry.id, entry.timestamp, entry.action, entry.articleId, entry.articleSlug, entry.articleTitle, entry.status, entry.user, entry.details]
        );
      } catch (e) {
        console.error('[BlogStorage] Error logging action to PostgreSQL:', e);
      }
    } else if (!isProduction) {
      try {
        ensureDataDir();
        fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(this.auditLogs, null, 2), 'utf-8');
      } catch (err) {
        console.error('[BlogStorage] Failed to write local audit log:', err);
      }
    }
  }

  public getAuditLogs(): BlogAuditLog[] {
    return this.auditLogs;
  }

  public getScheduleConfig(): PublishingScheduleConfig {
    return { ...this.scheduleConfig };
  }

  public async saveScheduleConfig(config?: Partial<PublishingScheduleConfig>): Promise<PublishingScheduleConfig> {
    if (config) {
      this.scheduleConfig = { ...this.scheduleConfig, ...config };
    }

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          INSERT INTO blog_schedule_config (
            id, enabled, auto_publish_approved_drafts, timezone, days_of_week,
            publish_hour, publish_minute, scheduler_secret, auto_generate_topic_weekly,
            last_run_at, next_scheduled_slot, updated_at
          ) VALUES ('singleton', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            auto_publish_approved_drafts = EXCLUDED.auto_publish_approved_drafts,
            timezone = EXCLUDED.timezone,
            days_of_week = EXCLUDED.days_of_week,
            publish_hour = EXCLUDED.publish_hour,
            publish_minute = EXCLUDED.publish_minute,
            scheduler_secret = EXCLUDED.scheduler_secret,
            auto_generate_topic_weekly = EXCLUDED.auto_generate_topic_weekly,
            last_run_at = COALESCE(EXCLUDED.last_run_at, blog_schedule_config.last_run_at),
            next_scheduled_slot = COALESCE(EXCLUDED.next_scheduled_slot, blog_schedule_config.next_scheduled_slot),
            updated_at = NOW()
          `,
          [
            this.scheduleConfig.enabled,
            this.scheduleConfig.autoPublishApprovedDrafts,
            this.scheduleConfig.timezone,
            JSON.stringify(this.scheduleConfig.daysOfWeek),
            this.scheduleConfig.publishHour,
            this.scheduleConfig.publishMinute,
            this.scheduleConfig.schedulerSecret,
            this.scheduleConfig.autoGenerateTopicWeekly,
            this.scheduleConfig.lastRunAt || null,
            this.scheduleConfig.nextScheduledSlot || null,
          ]
        );
      } catch (e) {
        console.error('[BlogStorage] Error saving schedule config to PostgreSQL:', e);
      }
    } else if (!isProduction) {
      this.saveLocalScheduleConfig();
    }

    return this.scheduleConfig;
  }

  public getAllArticles(): ManagedBlogArticle[] {
    return Array.from(this.articles.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getPublishedArticles(): ManagedBlogArticle[] {
    return Array.from(this.articles.values())
      .filter((a) => a.status === 'published')
      .sort((a, b) => {
        const timeB = new Date(b.publishedAt || b.publishedDate || b.createdAt).getTime();
        const timeA = new Date(a.publishedAt || a.publishedDate || a.createdAt).getTime();
        return timeB - timeA;
      });
  }

  public getArticleById(id: string): ManagedBlogArticle | undefined {
    return this.articles.get(id);
  }

  public getArticleBySlug(slug: string): ManagedBlogArticle | undefined {
    return Array.from(this.articles.values()).find(
      (a) => a.slug === slug || a.id === slug
    );
  }

  public async createArticle(
    payload: Partial<ManagedBlogArticle>,
    user: string = 'Dispensary Admin'
  ): Promise<{ success: boolean; article?: ManagedBlogArticle; error?: string }> {
    const slug = (payload.slug || '').trim().toLowerCase();
    if (!slug) {
      return { success: false, error: 'Article slug is required.' };
    }

    const existing = this.getArticleBySlug(slug);
    if (existing) {
      return { success: false, error: `An article with slug "${slug}" already exists.` };
    }

    const id = payload.id || `art-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const newArticle: ManagedBlogArticle = {
      id,
      slug,
      title: payload.title || 'Untitled Dispensary Guide',
      metaTitle: payload.metaTitle || payload.title || 'Global Herbs Guide',
      metaDescription: payload.metaDescription || '',
      targetKeywords: payload.targetKeywords || [],
      primaryKeyword: payload.primaryKeyword || payload.targetKeywords?.[0] || '',
      category: payload.category || 'Dosing & Guides',
      categorySlug: payload.categorySlug || 'dosing-guides',
      status: payload.status || 'draft',
      scheduledFor: payload.scheduledFor,
      publishedAt: payload.status === 'published' ? nowIso : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      author: payload.author || {
        name: 'Zaki Nahor',
        role: 'Founder & Chief Herbalist, Global Herbs',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      },
      reviewer: payload.reviewer || {
        name: 'Dr. Marcus Vance, Ph.D.',
        credentials: 'Botanical Pharmacognosy & Cannabis Analytical Chemist',
      },
      publishedDate: payload.publishedDate || new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      }),
      readTime: payload.readTime || '6 min read',
      featuredImage: payload.featuredImage || '/images/buy_hemp_online_guide.jpg',
      imageAlt: payload.imageAlt || payload.title,
      excerpt: payload.excerpt || '',
      keyTakeaways: payload.keyTakeaways || [],
      tableOfContents: payload.tableOfContents || [],
      contentSections: payload.contentSections || [],
      recommendedCategorySlug: payload.recommendedCategorySlug || 'concentrates-wax',
      recommendedProductSearch: payload.recommendedProductSearch || 'Live Rosin',
      faqs: payload.faqs || [],
      scientificReferences: payload.scientificReferences || [],
      botanicalDisclaimer: payload.botanicalDisclaimer || 'These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease. Must be 21+ to purchase. All hemp-derived products contain <= 0.3% Delta-9 THC in accordance with the 2018 Farm Bill.',
      isAiGenerated: !!payload.isAiGenerated,
    };

    const validation = validateArticle(newArticle, this.getAllArticles());
    newArticle.seoScore = validation.score;

    this.articles.set(id, newArticle);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          INSERT INTO blog_articles (
            id, slug, title, meta_title, meta_description, primary_keyword, target_keywords,
            category, category_slug, status, scheduled_for, published_at, published_date,
            created_at, updated_at, seo_score, word_count, is_ai_generated, failure_reason,
            publish_attempts, author, reviewer, read_time, featured_image, image_alt, excerpt,
            key_takeaways, table_of_contents, content_sections, faqs, scientific_references,
            botanical_disclaimer, recommended_category_slug, recommended_product_search
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
          )
          `,
          [
            newArticle.id,
            newArticle.slug,
            newArticle.title,
            newArticle.metaTitle,
            newArticle.metaDescription,
            newArticle.primaryKeyword,
            JSON.stringify(newArticle.targetKeywords),
            newArticle.category,
            newArticle.categorySlug,
            newArticle.status,
            newArticle.scheduledFor || null,
            newArticle.publishedAt || null,
            newArticle.publishedDate,
            newArticle.createdAt,
            newArticle.updatedAt,
            newArticle.seoScore,
            newArticle.wordCount,
            newArticle.isAiGenerated,
            newArticle.failureReason || null,
            newArticle.publishAttempts || 0,
            JSON.stringify(newArticle.author),
            JSON.stringify(newArticle.reviewer),
            newArticle.readTime,
            newArticle.featuredImage,
            newArticle.imageAlt,
            newArticle.excerpt,
            JSON.stringify(newArticle.keyTakeaways),
            JSON.stringify(newArticle.tableOfContents),
            JSON.stringify(newArticle.contentSections),
            JSON.stringify(newArticle.faqs),
            JSON.stringify(newArticle.scientificReferences),
            newArticle.botanicalDisclaimer,
            newArticle.recommendedCategorySlug,
            newArticle.recommendedProductSearch,
          ]
        );
      } catch (e: any) {
        console.error('[BlogStorage] Error writing article to PostgreSQL:', e);
        if (isProduction) {
          return { success: false, error: `Database write failed: ${e.message}` };
        }
      }
    } else if (isProduction) {
      return { success: false, error: 'Database connection required in production.' };
    } else {
      this.saveLocalArticles();
    }

    await this.logAction(
      'edited',
      newArticle,
      user,
      `Created new article "${newArticle.title}" (Status: ${newArticle.status})`
    );

    return { success: true, article: newArticle };
  }

  public async updateArticle(
    id: string,
    updates: Partial<ManagedBlogArticle>,
    user: string = 'Dispensary Admin'
  ): Promise<{ success: boolean; article?: ManagedBlogArticle; error?: string }> {
    const existing = this.articles.get(id);
    if (!existing) {
      return { success: false, error: `Article with ID "${id}" not found.` };
    }

    if (updates.slug && updates.slug !== existing.slug) {
      const slugConflict = this.getArticleBySlug(updates.slug);
      if (slugConflict && slugConflict.id !== id) {
        return { success: false, error: `Slug "${updates.slug}" is already used by another article.` };
      }
    }

    const updated: ManagedBlogArticle = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    const validation = validateArticle(updated, this.getAllArticles());
    updated.seoScore = validation.score;

    this.articles.set(id, updated);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          UPDATE blog_articles SET
            slug = $1, title = $2, meta_title = $3, meta_description = $4,
            primary_keyword = $5, target_keywords = $6, category = $7, category_slug = $8,
            status = $9, scheduled_for = $10, published_at = $11, published_date = $12,
            updated_at = NOW(), seo_score = $13, word_count = $14, failure_reason = $15,
            author = $16, reviewer = $17, read_time = $18, featured_image = $19, image_alt = $20,
            excerpt = $21, key_takeaways = $22, table_of_contents = $23, content_sections = $24,
            faqs = $25, scientific_references = $26, botanical_disclaimer = $27,
            recommended_category_slug = $28, recommended_product_search = $29
          WHERE id = $30
          `,
          [
            updated.slug,
            updated.title,
            updated.metaTitle,
            updated.metaDescription,
            updated.primaryKeyword,
            JSON.stringify(updated.targetKeywords),
            updated.category,
            updated.categorySlug,
            updated.status,
            updated.scheduledFor || null,
            updated.publishedAt || null,
            updated.publishedDate,
            updated.seoScore,
            updated.wordCount,
            updated.failureReason || null,
            JSON.stringify(updated.author),
            JSON.stringify(updated.reviewer),
            updated.readTime,
            updated.featuredImage,
            updated.imageAlt,
            updated.excerpt,
            JSON.stringify(updated.keyTakeaways),
            JSON.stringify(updated.tableOfContents),
            JSON.stringify(updated.contentSections),
            JSON.stringify(updated.faqs),
            JSON.stringify(updated.scientificReferences),
            updated.botanicalDisclaimer,
            updated.recommendedCategorySlug,
            updated.recommendedProductSearch,
            id,
          ]
        );
      } catch (e: any) {
        console.error('[BlogStorage] Error updating article in PostgreSQL:', e);
        if (isProduction) {
          return { success: false, error: `Database update failed: ${e.message}` };
        }
      }
    } else if (isProduction) {
      return { success: false, error: 'Database connection required in production.' };
    } else {
      this.saveLocalArticles();
    }

    await this.logAction('edited', updated, user, `Updated article fields (${Object.keys(updates).join(', ')})`);

    return { success: true, article: updated };
  }

  public async deleteArticle(id: string, user: string = 'Dispensary Admin'): Promise<{ success: boolean; error?: string }> {
    const existing = this.articles.get(id);
    if (!existing) {
      return { success: false, error: 'Article not found.' };
    }

    this.articles.delete(id);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query('DELETE FROM blog_articles WHERE id = $1', [id]);
      } catch (e: any) {
        console.error('[BlogStorage] Error deleting article from PostgreSQL:', e);
        if (isProduction) {
          return { success: false, error: `Database delete failed: ${e.message}` };
        }
      }
    } else if (isProduction) {
      return { success: false, error: 'Database connection required in production.' };
    } else {
      this.saveLocalArticles();
    }

    await this.logAction('deleted', existing, user, `Permanently deleted article "${existing.title}"`);

    return { success: true };
  }

  public async publishArticle(
    id: string,
    user: string = 'Dispensary Admin',
    force: boolean = false
  ): Promise<{ success: boolean; article?: ManagedBlogArticle; error?: string; validation?: any }> {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: 'Article not found.' };
    }

    const validation = validateArticle(article, this.getAllArticles());
    if (!validation.passed && !force) {
      article.status = 'failed';
      article.failureReason = `Validation failed: ${validation.errors.join('; ')}`;
      this.articles.set(id, article);

      const pool = getPool();
      if (pool) {
        await pool.query(
          "UPDATE blog_articles SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE id = $2",
          [article.failureReason, id]
        );
      } else if (!isProduction) {
        this.saveLocalArticles();
      }

      await this.logAction('failed', article, user, `Publish rejected: ${validation.errors.join(', ')}`);
      return {
        success: false,
        error: `Cannot publish article. Validation failed: ${validation.errors.join('; ')}`,
        validation,
      };
    }

    const nowIso = new Date().toISOString();
    article.status = 'published';
    article.publishedAt = nowIso;
    article.failureReason = undefined;
    article.publishedDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
    article.seoScore = validation.score;

    this.articles.set(id, article);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          UPDATE blog_articles SET
            status = 'published', published_at = NOW(), published_date = $1,
            seo_score = $2, failure_reason = NULL, locked_at = NULL, locked_by = NULL,
            updated_at = NOW()
          WHERE id = $3
          `,
          [article.publishedDate, article.seoScore, id]
        );
      } catch (e: any) {
        console.error('[BlogStorage] Error publishing article in PostgreSQL:', e);
        if (isProduction) {
          return { success: false, error: `Database publish failed: ${e.message}` };
        }
      }
    } else if (isProduction) {
      return { success: false, error: 'Database connection required in production.' };
    } else {
      this.saveLocalArticles();
    }

    await this.logAction('published', article, user, `Published article live at /blog/${article.slug}`);

    return { success: true, article, validation };
  }

  public async unpublishArticle(id: string, user: string = 'Dispensary Admin'): Promise<{ success: boolean; article?: ManagedBlogArticle; error?: string }> {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: 'Article not found.' };
    }

    article.status = 'draft';
    article.updatedAt = new Date().toISOString();
    this.articles.set(id, article);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          "UPDATE blog_articles SET status = 'draft', updated_at = NOW() WHERE id = $1",
          [id]
        );
      } catch (e: any) {
        console.error('[BlogStorage] Error unpublishing article in PostgreSQL:', e);
      }
    } else if (!isProduction) {
      this.saveLocalArticles();
    }

    await this.logAction('unpublished', article, user, `Reverted article from live publication to draft state`);

    return { success: true, article };
  }

  public async scheduleArticle(
    id: string,
    scheduledForIso: string,
    user: string = 'Dispensary Admin'
  ): Promise<{ success: boolean; article?: ManagedBlogArticle; error?: string }> {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: 'Article not found.' };
    }

    const scheduleDate = new Date(scheduledForIso);
    if (isNaN(scheduleDate.getTime())) {
      return { success: false, error: 'Invalid scheduled date/time.' };
    }

    article.status = 'scheduled';
    article.scheduledFor = scheduledForIso;
    article.failureReason = undefined;
    article.updatedAt = new Date().toISOString();

    this.articles.set(id, article);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          "UPDATE blog_articles SET status = 'scheduled', scheduled_for = $1, failure_reason = NULL, updated_at = NOW() WHERE id = $2",
          [scheduledForIso, id]
        );
      } catch (e: any) {
        console.error('[BlogStorage] Error scheduling article in PostgreSQL:', e);
      }
    } else if (!isProduction) {
      this.saveLocalArticles();
    }

    await this.logAction(
      'scheduled',
      article,
      user,
      `Scheduled article publication for ${scheduleDate.toLocaleString('en-US')}`
    );

    return { success: true, article };
  }

  /**
   * Generates a complete backup snapshot of the database
   */
  public async exportBackup() {
    await this.refreshFromDatabase();
    return {
      exportedAt: new Date().toISOString(),
      articles: this.getAllArticles(),
      scheduleConfig: this.getScheduleConfig(),
      auditLogs: this.getAuditLogs(),
    };
  }
}

export const blogStorage = new BlogStorageService();
