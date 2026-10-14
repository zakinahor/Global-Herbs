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

const DATA_DIR = path.join(process.cwd(), 'data');
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
  schedulerSecret: process.env.BLOG_SCHEDULER_SECRET || 'gh-scheduler-sec-2026',
  autoGenerateTopicWeekly: false,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Initializes baseline articles into storage if empty
 */
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

  constructor() {
    this.init();
  }

  private init() {
    ensureDataDir();
    this.loadArticles();
    this.loadScheduleConfig();
    this.loadAuditLogs();
  }

  private loadArticles() {
    try {
      if (fs.existsSync(ARTICLES_FILE)) {
        const raw = fs.readFileSync(ARTICLES_FILE, 'utf-8');
        const list: ManagedBlogArticle[] = JSON.parse(raw);
        this.articles.clear();
        list.forEach((art) => this.articles.set(art.id, art));
      } else {
        const seeded = seedInitialArticles();
        this.articles.clear();
        seeded.forEach((art) => this.articles.set(art.id, art));
        this.saveArticles();
      }
    } catch (err) {
      console.error('[BlogStorage] Error loading articles:', err);
      const seeded = seedInitialArticles();
      seeded.forEach((art) => this.articles.set(art.id, art));
    }
  }

  private saveArticles() {
    try {
      ensureDataDir();
      const list = Array.from(this.articles.values());
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BlogStorage] Error saving articles:', err);
    }
  }

  private loadScheduleConfig() {
    try {
      if (fs.existsSync(SCHEDULE_CONFIG_FILE)) {
        const raw = fs.readFileSync(SCHEDULE_CONFIG_FILE, 'utf-8');
        this.scheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG, ...JSON.parse(raw) };
      } else {
        this.saveScheduleConfig();
      }
    } catch (err) {
      console.error('[BlogStorage] Error loading schedule config:', err);
    }
  }

  public saveScheduleConfig(config?: Partial<PublishingScheduleConfig>): PublishingScheduleConfig {
    try {
      ensureDataDir();
      if (config) {
        this.scheduleConfig = { ...this.scheduleConfig, ...config };
      }
      fs.writeFileSync(SCHEDULE_CONFIG_FILE, JSON.stringify(this.scheduleConfig, null, 2), 'utf-8');
      return this.scheduleConfig;
    } catch (err) {
      console.error('[BlogStorage] Error saving schedule config:', err);
      return this.scheduleConfig;
    }
  }

  private loadAuditLogs() {
    try {
      if (fs.existsSync(AUDIT_LOGS_FILE)) {
        const raw = fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8');
        this.auditLogs = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[BlogStorage] Error loading audit logs:', err);
      this.auditLogs = [];
    }
  }

  public logAction(
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
    try {
      ensureDataDir();
      fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(this.auditLogs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BlogStorage] Failed to write audit log:', err);
    }
  }

  public getAuditLogs(): BlogAuditLog[] {
    return this.auditLogs;
  }

  public getScheduleConfig(): PublishingScheduleConfig {
    return { ...this.scheduleConfig };
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

  public createArticle(
    payload: Partial<ManagedBlogArticle>,
    user: string = 'Dispensary Admin'
  ): { success: boolean; article?: ManagedBlogArticle; error?: string } {
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

    // Calculate validation score
    const validation = validateArticle(newArticle, this.getAllArticles());
    newArticle.seoScore = validation.score;

    this.articles.set(id, newArticle);
    this.saveArticles();

    this.logAction(
      'edited',
      newArticle,
      user,
      `Created new article "${newArticle.title}" (Status: ${newArticle.status})`
    );

    return { success: true, article: newArticle };
  }

  public updateArticle(
    id: string,
    updates: Partial<ManagedBlogArticle>,
    user: string = 'Dispensary Admin'
  ): { success: boolean; article?: ManagedBlogArticle; error?: string } {
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
      id: existing.id, // preserve primary ID
      updatedAt: new Date().toISOString(),
    };

    // Run validator
    const validation = validateArticle(updated, this.getAllArticles());
    updated.seoScore = validation.score;

    this.articles.set(id, updated);
    this.saveArticles();

    this.logAction('edited', updated, user, `Updated article fields (${Object.keys(updates).join(', ')})`);

    return { success: true, article: updated };
  }

  public deleteArticle(id: string, user: string = 'Dispensary Admin'): { success: boolean; error?: string } {
    const existing = this.articles.get(id);
    if (!existing) {
      return { success: false, error: 'Article not found.' };
    }

    this.articles.delete(id);
    this.saveArticles();

    this.logAction('deleted', existing, user, `Permanently deleted article "${existing.title}"`);

    return { success: true };
  }

  public publishArticle(
    id: string,
    user: string = 'Dispensary Admin',
    force: boolean = false
  ): { success: boolean; article?: ManagedBlogArticle; error?: string; validation?: any } {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: 'Article not found.' };
    }

    const validation = validateArticle(article, this.getAllArticles());
    if (!validation.passed && !force) {
      article.status = 'failed';
      article.failureReason = `Validation failed: ${validation.errors.join('; ')}`;
      this.articles.set(id, article);
      this.saveArticles();
      this.logAction('failed', article, user, `Publish rejected: ${validation.errors.join(', ')}`);
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
    this.saveArticles();

    this.logAction('published', article, user, `Published article live at /blog/${article.slug}`);

    return { success: true, article, validation };
  }

  public unpublishArticle(id: string, user: string = 'Dispensary Admin'): { success: boolean; article?: ManagedBlogArticle; error?: string } {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: 'Article not found.' };
    }

    article.status = 'draft';
    article.updatedAt = new Date().toISOString();
    this.articles.set(id, article);
    this.saveArticles();

    this.logAction('unpublished', article, user, `Reverted article from live publication to draft state`);

    return { success: true, article };
  }

  public scheduleArticle(
    id: string,
    scheduledForIso: string,
    user: string = 'Dispensary Admin'
  ): { success: boolean; article?: ManagedBlogArticle; error?: string } {
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
    this.saveArticles();

    this.logAction(
      'scheduled',
      article,
      user,
      `Scheduled article publication for ${scheduleDate.toLocaleString('en-US')}`
    );

    return { success: true, article };
  }
}

export const blogStorage = new BlogStorageService();
