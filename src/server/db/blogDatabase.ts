import { Pool, PoolClient } from 'pg';
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

let pool: Pool | null = null;
let isInitialized = false;

function getConnectionString(): string | null {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getConnectionString());
}

export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV === 'production'
  );
}

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = getConnectionString();
  if (!connectionString) {
    if (isProductionEnvironment()) {
      throw new Error(
        '[FATAL DATABASE ERROR] Production storage configuration missing: POSTGRES_URL or DATABASE_URL must be configured on Vercel. Ephemeral local storage is prohibited in production.'
      );
    }
    throw new Error('Database connection string is not configured.');
  }

  const isLocalhost =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Unexpected Error]', err);
  });

  return pool;
}

/**
 * Initializes database tables, indexes, and seeds baseline articles if empty
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  if (!isDatabaseConfigured()) {
    if (isProductionEnvironment()) {
      throw new Error(
        'POSTGRES_URL or DATABASE_URL is required in production on Vercel for persistent storage.'
      );
    }
    return;
  }

  const client = await getPool().connect();
  try {
    // 1. Create Tables & Indexes
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_articles (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        meta_title TEXT,
        meta_description TEXT,
        primary_keyword VARCHAR(255),
        target_keywords JSONB DEFAULT '[]'::jsonb,
        category VARCHAR(100) NOT NULL DEFAULT 'Dosing & Guides',
        category_slug VARCHAR(100) NOT NULL DEFAULT 'concentrates',
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        scheduled_for TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        published_date VARCHAR(100),
        read_time VARCHAR(50) DEFAULT '6 min read',
        featured_image TEXT DEFAULT '/images/buy_hemp_online_guide.jpg',
        image_alt TEXT,
        excerpt TEXT,
        key_takeaways JSONB DEFAULT '[]'::jsonb,
        table_of_contents JSONB DEFAULT '[]'::jsonb,
        content_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
        recommended_category_slug VARCHAR(100) DEFAULT 'concentrates',
        recommended_product_search VARCHAR(100) DEFAULT 'Live Rosin',
        faqs JSONB DEFAULT '[]'::jsonb,
        scientific_references JSONB DEFAULT '[]'::jsonb,
        author JSONB DEFAULT '{"name": "Zaki Nahor", "role": "Founder & Chief Herbalist", "avatar": "/images/global-herbs-logo.jpg"}'::jsonb,
        reviewer JSONB DEFAULT '{"name": "Dr. Marcus Vance, Ph.D.", "credentials": "Botanical Pharmacognosy & Cannabis Analytical Chemist"}'::jsonb,
        botanical_disclaimer TEXT DEFAULT 'These statements have not been evaluated by the FDA. Must be 21+ to purchase. <= 0.3% Delta-9 THC.',
        seo_score INTEGER DEFAULT 85,
        word_count INTEGER DEFAULT 0,
        is_ai_generated BOOLEAN DEFAULT false,
        publish_attempts INTEGER DEFAULT 0,
        last_attempt_at TIMESTAMPTZ,
        failure_reason TEXT,
        retry_eligible BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON blog_articles(status);
      CREATE INDEX IF NOT EXISTS idx_blog_articles_scheduled_for ON blog_articles(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_blog_articles_status_scheduled ON blog_articles(status, scheduled_for) WHERE status = 'scheduled';
      CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
      CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category_slug);

      CREATE TABLE IF NOT EXISTS blog_schedule_config (
        key VARCHAR(50) PRIMARY KEY DEFAULT 'global',
        enabled BOOLEAN DEFAULT true,
        auto_publish_approved_drafts BOOLEAN DEFAULT false,
        timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
        days_of_week JSONB DEFAULT '[1, 3, 5]'::jsonb,
        publish_hour INTEGER DEFAULT 10,
        publish_minute INTEGER DEFAULT 0,
        scheduler_secret VARCHAR(255),
        last_run_at TIMESTAMPTZ,
        next_scheduled_slot TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS blog_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        action VARCHAR(50) NOT NULL,
        article_id VARCHAR(100),
        article_slug VARCHAR(255),
        article_title TEXT,
        status VARCHAR(50),
        actor VARCHAR(255) DEFAULT 'System',
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_blog_audit_logs_timestamp ON blog_audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_blog_audit_logs_article ON blog_audit_logs(article_id);
    `);

    // 2. Check if articles exist; if empty, seed from existing JSON storage or baseline
    const countRes = await client.query('SELECT COUNT(*) as count FROM blog_articles');
    const existingCount = parseInt(countRes.rows[0].count, 10);

    if (existingCount === 0) {
      console.log('[PostgreSQL Migration] Seeding initial blog articles into database...');
      let seedList: ManagedBlogArticle[] = [];

      // Try reading local JSON storage first if exists
      const jsonFile = path.join(process.cwd(), 'data/blog_articles.json');
      if (fs.existsSync(jsonFile)) {
        try {
          const raw = fs.readFileSync(jsonFile, 'utf-8');
          seedList = JSON.parse(raw);
        } catch {
          seedList = [];
        }
      }

      // If empty, seed baseline articles
      if (seedList.length === 0) {
        seedList = baselineArticles.map((b, i) => ({
          ...b,
          status: 'published' as BlogPublishStatus,
          primaryKeyword: b.targetKeywords?.[0] || 'cannabis education',
          createdAt: new Date(Date.now() - (6 - i) * 7 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date(Date.now() - (6 - i) * 7 * 86400000).toISOString(),
          seoScore: 94,
          wordCount: b.contentSections.reduce((acc, sec) => acc + (sec.paragraphs || []).join(' ').split(/\s+/).length, 0),
          isAiGenerated: false,
        }));
      }

      for (const art of seedList) {
        await client.query(
          `
          INSERT INTO blog_articles (
            id, slug, title, meta_title, meta_description, primary_keyword,
            target_keywords, category, category_slug, status, scheduled_for,
            published_at, published_date, read_time, featured_image, image_alt,
            excerpt, key_takeaways, table_of_contents, content_sections,
            recommended_category_slug, recommended_product_search, faqs,
            scientific_references, author, reviewer, botanical_disclaimer,
            seo_score, word_count, is_ai_generated, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
            $27, $28, $29, $30, $31, $32
          ) ON CONFLICT (slug) DO NOTHING;
          `,
          [
            art.id,
            art.slug,
            art.title,
            art.metaTitle || art.title,
            art.metaDescription || '',
            art.primaryKeyword || '',
            JSON.stringify(art.targetKeywords || []),
            art.category,
            art.categorySlug,
            art.status,
            art.scheduledFor || null,
            art.publishedAt || null,
            art.publishedDate || 'October 2026',
            art.readTime || '6 min read',
            art.featuredImage,
            art.imageAlt || art.title,
            art.excerpt,
            JSON.stringify(art.keyTakeaways || []),
            JSON.stringify(art.tableOfContents || []),
            JSON.stringify(art.contentSections || []),
            art.recommendedCategorySlug || 'concentrates',
            art.recommendedProductSearch || 'Live Rosin',
            JSON.stringify(art.faqs || []),
            JSON.stringify(art.scientificReferences || []),
            JSON.stringify(art.author),
            JSON.stringify(art.reviewer),
            art.botanicalDisclaimer || '',
            art.seoScore || 85,
            art.wordCount || 0,
            art.isAiGenerated || false,
            art.createdAt || new Date().toISOString(),
            art.updatedAt || new Date().toISOString(),
          ]
        );
      }
      console.log(`[PostgreSQL Migration] Successfully migrated ${seedList.length} articles to database.`);
    }

    // 3. Ensure Schedule Config row exists
    await client.query(`
      INSERT INTO blog_schedule_config (key, enabled, auto_publish_approved_drafts, timezone, days_of_week, publish_hour, publish_minute, updated_at)
      VALUES ('global', true, false, 'America/Los_Angeles', '[1, 3, 5]'::jsonb, 10, 0, NOW())
      ON CONFLICT (key) DO NOTHING;
    `);

    isInitialized = true;
  } finally {
    client.release();
  }
}

function mapRowToArticle(row: any): ManagedBlogArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    primaryKeyword: row.primary_keyword,
    targetKeywords: row.target_keywords || [],
    category: row.category,
    categorySlug: row.category_slug,
    status: row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : undefined,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    publishedDate: row.published_date,
    readTime: row.read_time,
    featuredImage: row.featured_image,
    imageAlt: row.image_alt,
    excerpt: row.excerpt,
    keyTakeaways: row.key_takeaways || [],
    tableOfContents: row.table_of_contents || [],
    contentSections: row.content_sections || [],
    recommendedCategorySlug: row.recommended_category_slug,
    recommendedProductSearch: row.recommended_product_search,
    faqs: row.faqs || [],
    scientificReferences: row.scientific_references || [],
    author: row.author,
    reviewer: row.reviewer,
    botanicalDisclaimer: row.botanical_disclaimer,
    seoScore: row.seo_score,
    wordCount: row.word_count,
    isAiGenerated: row.is_ai_generated,
    failureReason: row.failure_reason,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Atomically claims due scheduled articles for publishing using PostgreSQL row locks.
 * Prevents concurrent scheduler workers from claiming or publishing the same article twice.
 */
export async function claimDueArticles(limit: number = 5): Promise<ManagedBlogArticle[]> {
  await initializeDatabase();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // 1. Select with FOR UPDATE SKIP LOCKED
    const selectRes = await client.query(
      `
      SELECT *
      FROM blog_articles
      WHERE status = 'scheduled'
        AND scheduled_for <= NOW()
        AND retry_eligible = true
      ORDER BY scheduled_for ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED;
      `,
      [limit]
    );

    if (selectRes.rows.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    const claimedIds = selectRes.rows.map((r) => r.id);

    // 2. Mark claimed rows as 'publishing'
    await client.query(
      `
      UPDATE blog_articles
      SET status = 'publishing',
          publish_attempts = publish_attempts + 1,
          last_attempt_at = NOW(),
          updated_at = NOW()
      WHERE id = ANY($1);
      `,
      [claimedIds]
    );

    await client.query('COMMIT');

    return selectRes.rows.map(mapRowToArticle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Database claimDueArticles Error]', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Marks an article as successfully published
 */
export async function markArticlePublished(
  id: string,
  publishedDateStr: string
): Promise<ManagedBlogArticle> {
  const pool = getPool();
  const res = await pool.query(
    `
    UPDATE blog_articles
    SET status = 'published',
        published_at = NOW(),
        published_date = $2,
        failure_reason = NULL,
        retry_eligible = false,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id, publishedDateStr]
  );

  if (res.rows.length === 0) {
    throw new Error(`Article ${id} not found.`);
  }

  return mapRowToArticle(res.rows[0]);
}

/**
 * Marks an article as failed with reason and updates retry eligibility
 */
export async function markArticleFailed(
  id: string,
  failureReason: string,
  canRetry: boolean
): Promise<ManagedBlogArticle> {
  const pool = getPool();
  const res = await pool.query(
    `
    UPDATE blog_articles
    SET status = 'failed',
        failure_reason = $2,
        retry_eligible = $3,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id, failureReason, canRetry]
  );

  if (res.rows.length === 0) {
    throw new Error(`Article ${id} not found.`);
  }

  return mapRowToArticle(res.rows[0]);
}

/**
 * Retrieves all articles (ordered by createdAt DESC)
 */
export async function dbGetAllArticles(status?: string): Promise<ManagedBlogArticle[]> {
  await initializeDatabase();
  const pool = getPool();

  let query = 'SELECT * FROM blog_articles';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC;';

  const res = await pool.query(query, params);
  return res.rows.map(mapRowToArticle);
}

/**
 * Retrieves all published articles
 */
export async function dbGetPublishedArticles(category?: string, search?: string): Promise<ManagedBlogArticle[]> {
  await initializeDatabase();
  const pool = getPool();

  let query = "SELECT * FROM blog_articles WHERE status = 'published'";
  const params: any[] = [];
  let paramIdx = 1;

  if (category && category !== 'All') {
    query += ` AND (category = $${paramIdx} OR category_slug = $${paramIdx})`;
    params.push(category);
    paramIdx++;
  }

  if (search && search.trim()) {
    query += ` AND (title ILIKE $${paramIdx} OR excerpt ILIKE $${paramIdx} OR primary_keyword ILIKE $${paramIdx})`;
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  query += ' ORDER BY COALESCE(published_at, created_at) DESC;';

  const res = await pool.query(query, params);
  return res.rows.map(mapRowToArticle);
}

/**
 * Retrieves a single published article by slug
 */
export async function dbGetArticleBySlug(slug: string, includeUnpublished = false): Promise<ManagedBlogArticle | null> {
  await initializeDatabase();
  const pool = getPool();

  let query = 'SELECT * FROM blog_articles WHERE slug = $1';
  if (!includeUnpublished) {
    query += " AND status = 'published'";
  }
  query += ' LIMIT 1;';

  const res = await pool.query(query, [slug]);
  if (res.rows.length === 0) return null;
  return mapRowToArticle(res.rows[0]);
}

/**
 * Retrieves a single article by ID
 */
export async function dbGetArticleById(id: string): Promise<ManagedBlogArticle | null> {
  await initializeDatabase();
  const pool = getPool();
  const res = await pool.query('SELECT * FROM blog_articles WHERE id = $1 LIMIT 1;', [id]);
  if (res.rows.length === 0) return null;
  return mapRowToArticle(res.rows[0]);
}

/**
 * Creates a new article in the database
 */
export async function dbCreateArticle(payload: Partial<ManagedBlogArticle>): Promise<ManagedBlogArticle> {
  await initializeDatabase();
  const pool = getPool();
  const id = payload.id || `art-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const res = await pool.query(
    `
    INSERT INTO blog_articles (
      id, slug, title, meta_title, meta_description, primary_keyword,
      target_keywords, category, category_slug, status, scheduled_for,
      published_at, published_date, read_time, featured_image, image_alt,
      excerpt, key_takeaways, table_of_contents, content_sections,
      recommended_category_slug, recommended_product_search, faqs,
      scientific_references, author, reviewer, botanical_disclaimer,
      seo_score, word_count, is_ai_generated, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
      $27, $28, $29, $30, $31, $32
    ) RETURNING *;
    `,
    [
      id,
      payload.slug,
      payload.title || 'Untitled Dispensary Guide',
      payload.metaTitle || payload.title,
      payload.metaDescription || '',
      payload.primaryKeyword || '',
      JSON.stringify(payload.targetKeywords || []),
      payload.category || 'Dosing & Guides',
      payload.categorySlug || 'concentrates',
      payload.status || 'draft',
      payload.scheduledFor || null,
      payload.status === 'published' ? now : null,
      payload.publishedDate || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
      payload.readTime || '6 min read',
      payload.featuredImage || '/images/buy_hemp_online_guide.jpg',
      payload.imageAlt || payload.title,
      payload.excerpt || '',
      JSON.stringify(payload.keyTakeaways || []),
      JSON.stringify(payload.tableOfContents || []),
      JSON.stringify(payload.contentSections || []),
      payload.recommendedCategorySlug || 'concentrates',
      payload.recommendedProductSearch || 'Live Rosin',
      JSON.stringify(payload.faqs || []),
      JSON.stringify(payload.scientificReferences || []),
      JSON.stringify(payload.author || { name: 'Zaki Nahor', role: 'Founder & Chief Herbalist', avatar: '/images/global-herbs-logo.jpg' }),
      JSON.stringify(payload.reviewer || { name: 'Dr. Marcus Vance, Ph.D.', credentials: 'Botanical Pharmacognosy & Cannabis Analytical Chemist' }),
      payload.botanicalDisclaimer || 'These statements have not been evaluated by the FDA. Must be 21+ to purchase. <= 0.3% Delta-9 THC.',
      payload.seoScore || 85,
      payload.wordCount || 0,
      payload.isAiGenerated || false,
      now,
      now,
    ]
  );

  return mapRowToArticle(res.rows[0]);
}

/**
 * Updates an article in the database
 */
export async function dbUpdateArticle(id: string, updates: Partial<ManagedBlogArticle>): Promise<ManagedBlogArticle> {
  await initializeDatabase();
  const pool = getPool();

  const existing = await dbGetArticleById(id);
  if (!existing) {
    throw new Error(`Article ${id} not found.`);
  }

  const merged = { ...existing, ...updates };

  const res = await pool.query(
    `
    UPDATE blog_articles
    SET slug = $2,
        title = $3,
        meta_title = $4,
        meta_description = $5,
        primary_keyword = $6,
        target_keywords = $7,
        category = $8,
        category_slug = $9,
        status = $10,
        scheduled_for = $11,
        published_at = $12,
        published_date = $13,
        read_time = $14,
        featured_image = $15,
        image_alt = $16,
        excerpt = $17,
        key_takeaways = $18,
        table_of_contents = $19,
        content_sections = $20,
        recommended_category_slug = $21,
        recommended_product_search = $22,
        faqs = $23,
        scientific_references = $24,
        author = $25,
        reviewer = $26,
        botanical_disclaimer = $27,
        seo_score = $28,
        word_count = $29,
        is_ai_generated = $30,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [
      id,
      merged.slug,
      merged.title,
      merged.metaTitle,
      merged.metaDescription,
      merged.primaryKeyword,
      JSON.stringify(merged.targetKeywords || []),
      merged.category,
      merged.categorySlug,
      merged.status,
      merged.scheduledFor || null,
      merged.publishedAt || null,
      merged.publishedDate,
      merged.readTime,
      merged.featuredImage,
      merged.imageAlt,
      merged.excerpt,
      JSON.stringify(merged.keyTakeaways || []),
      JSON.stringify(merged.tableOfContents || []),
      JSON.stringify(merged.contentSections || []),
      merged.recommendedCategorySlug,
      merged.recommendedProductSearch,
      JSON.stringify(merged.faqs || []),
      JSON.stringify(merged.scientificReferences || []),
      JSON.stringify(merged.author),
      JSON.stringify(merged.reviewer),
      merged.botanicalDisclaimer,
      merged.seoScore,
      merged.wordCount,
      merged.isAiGenerated,
    ]
  );

  return mapRowToArticle(res.rows[0]);
}

/**
 * Deletes an article from the database
 */
export async function dbDeleteArticle(id: string): Promise<boolean> {
  await initializeDatabase();
  const pool = getPool();
  const res = await pool.query('DELETE FROM blog_articles WHERE id = $1;', [id]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Records an audit log entry in the database
 */
export async function dbLogAudit(
  action: BlogAuditLog['action'],
  article: { id: string; slug: string; title: string; status: BlogPublishStatus },
  actor: string,
  details: string
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const pool = getPool();
    const id = `LOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    await pool.query(
      `
      INSERT INTO blog_audit_logs (id, timestamp, action, article_id, article_slug, article_title, status, actor, details)
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8);
      `,
      [id, action, article.id, article.slug, article.title, article.status, actor, details]
    );
  } catch (err) {
    console.error('[dbLogAudit Error]', err);
  }
}

/**
 * Retrieves audit logs from the database
 */
export async function dbGetAuditLogs(limit = 100): Promise<BlogAuditLog[]> {
  await initializeDatabase();
  const pool = getPool();
  const res = await pool.query(
    'SELECT * FROM blog_audit_logs ORDER BY timestamp DESC LIMIT $1;',
    [limit]
  );
  return res.rows.map((r) => ({
    id: r.id,
    timestamp: new Date(r.timestamp).toISOString(),
    action: r.action,
    articleId: r.article_id,
    articleSlug: r.article_slug,
    articleTitle: r.article_title,
    status: r.status,
    user: r.actor,
    details: r.details,
  }));
}

/**
 * Gets schedule configuration from the database
 */
export async function dbGetScheduleConfig(): Promise<PublishingScheduleConfig> {
  await initializeDatabase();
  const pool = getPool();
  const res = await pool.query("SELECT * FROM blog_schedule_config WHERE key = 'global' LIMIT 1;");
  if (res.rows.length === 0) {
    return {
      enabled: true,
      autoPublishApprovedDrafts: false,
      timezone: 'America/Los_Angeles',
      daysOfWeek: [1, 3, 5],
      publishHour: 10,
      publishMinute: 0,
      schedulerSecret: '',
    };
  }

  const row = res.rows[0];
  return {
    enabled: row.enabled,
    autoPublishApprovedDrafts: row.auto_publish_approved_drafts,
    timezone: row.timezone,
    daysOfWeek: row.days_of_week || [1, 3, 5],
    publishHour: row.publish_hour,
    publishMinute: row.publish_minute,
    schedulerSecret: '', // never expose in queries
    lastRunAt: row.last_run_at ? new Date(row.last_run_at).toISOString() : undefined,
    nextScheduledSlot: row.next_scheduled_slot ? new Date(row.next_scheduled_slot).toISOString() : undefined,
  };
}

/**
 * Updates schedule configuration in the database
 */
export async function dbUpdateScheduleConfig(
  updates: Partial<PublishingScheduleConfig>
): Promise<PublishingScheduleConfig> {
  await initializeDatabase();
  const pool = getPool();
  const current = await dbGetScheduleConfig();
  const merged = { ...current, ...updates };

  const res = await pool.query(
    `
    UPDATE blog_schedule_config
    SET enabled = $2,
        auto_publish_approved_drafts = $3,
        timezone = $4,
        days_of_week = $5,
        publish_hour = $6,
        publish_minute = $7,
        updated_at = NOW()
    WHERE key = 'global'
    RETURNING *;
    `,
    [
      'global',
      merged.enabled,
      merged.autoPublishApprovedDrafts,
      merged.timezone,
      JSON.stringify(merged.daysOfWeek),
      merged.publishHour,
      merged.publishMinute,
    ]
  );

  return {
    ...merged,
    updatedAt: new Date(res.rows[0].updated_at).toISOString(),
  } as any;
}
