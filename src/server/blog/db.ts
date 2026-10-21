import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';
import { ManagedBlogArticle, PublishingScheduleConfig, BlogAuditLog } from '../../types/blog';
import { blogArticles as baselineArticles } from '../../data/blogArticles';

declare global {
  // eslint-disable-next-line no-var
  var _globalPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _globalDbInitPromise: Promise<void> | undefined;
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

/**
 * Returns connection configuration for PostgreSQL
 */
export function getDbConfig(): { config: PoolConfig | null; connectionString?: string; isConfigured: boolean } {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (connectionString) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    return {
      connectionString,
      isConfigured: true,
      config: {
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      },
    };
  }

  // Check individual environment variables
  if (process.env.PGHOST || process.env.SQL_HOST) {
    const host = process.env.PGHOST || process.env.SQL_HOST;
    const user = process.env.PGUSER || process.env.SQL_USER || 'postgres';
    const password = process.env.PGPASSWORD || process.env.SQL_PASSWORD;
    const database = process.env.PGDATABASE || process.env.SQL_DB_NAME || 'postgres';
    const port = Number(process.env.PGPORT || 5432);

    return {
      isConfigured: true,
      config: {
        host,
        user,
        password,
        database,
        port,
        ssl: host?.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 10000,
      },
    };
  }

  return { config: null, isConfigured: false };
}

/**
 * Lazily retrieves or creates connection pool
 */
export function getPool(): Pool | null {
  if (global._globalPgPool) {
    return global._globalPgPool;
  }

  const { config, isConfigured } = getDbConfig();
  if (!isConfigured || !config) {
    if (isProduction) {
      console.error(
        '[Database CRITICAL] No PostgreSQL database configured in production! Set POSTGRES_URL or DATABASE_URL in Vercel project environment variables.'
      );
    }
    return null;
  }

  const pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('[Database Pool Error] Unexpected error on idle Postgres client:', err);
  });

  global._globalPgPool = pool;
  return pool;
}

/**
 * Initializes database schema, indexes, and migrates baseline/JSON data if empty
 */
export async function initDatabase(): Promise<void> {
  if (global._globalDbInitPromise) {
    return global._globalDbInitPromise;
  }

  global._globalDbInitPromise = (async () => {
    const pool = getPool();
    if (!pool) {
      if (isProduction) {
        throw new Error(
          'Database connection required in production. Missing POSTGRES_URL or DATABASE_URL.'
        );
      }
      console.warn('[Database] Running in development mode without PostgreSQL connection.');
      return;
    }

    const client = await pool.connect();
    try {
      console.log('[Database] Running schema migrations & index creation...');

      await client.query('BEGIN');

      // 1. Articles table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_articles (
          id VARCHAR(128) PRIMARY KEY,
          slug VARCHAR(255) UNIQUE NOT NULL,
          title TEXT NOT NULL,
          meta_title TEXT,
          meta_description TEXT,
          primary_keyword VARCHAR(255),
          target_keywords JSONB DEFAULT '[]'::jsonb,
          category VARCHAR(128),
          category_slug VARCHAR(128),
          status VARCHAR(32) NOT NULL DEFAULT 'draft',
          scheduled_for TIMESTAMPTZ,
          published_at TIMESTAMPTZ,
          published_date VARCHAR(64),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          seo_score INTEGER DEFAULT 0,
          word_count INTEGER DEFAULT 0,
          is_ai_generated BOOLEAN DEFAULT FALSE,
          failure_reason TEXT,
          publish_attempts INTEGER DEFAULT 0,
          last_attempt_at TIMESTAMPTZ,
          locked_at TIMESTAMPTZ,
          locked_by VARCHAR(128),
          author JSONB,
          reviewer JSONB,
          read_time VARCHAR(64),
          featured_image TEXT,
          image_alt TEXT,
          excerpt TEXT,
          key_takeaways JSONB DEFAULT '[]'::jsonb,
          table_of_contents JSONB DEFAULT '[]'::jsonb,
          content_sections JSONB DEFAULT '[]'::jsonb,
          faqs JSONB DEFAULT '[]'::jsonb,
          scientific_references JSONB DEFAULT '[]'::jsonb,
          botanical_disclaimer TEXT,
          recommended_category_slug VARCHAR(128),
          recommended_product_search VARCHAR(128)
        );
      `);

      // 2. Schedule configuration table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_schedule_config (
          id VARCHAR(64) PRIMARY KEY,
          enabled BOOLEAN DEFAULT TRUE,
          auto_publish_approved_drafts BOOLEAN DEFAULT FALSE,
          timezone VARCHAR(64) DEFAULT 'America/Los_Angeles',
          days_of_week JSONB DEFAULT '[1, 3, 5]'::jsonb,
          publish_hour INTEGER DEFAULT 10,
          publish_minute INTEGER DEFAULT 0,
          scheduler_secret TEXT,
          auto_generate_topic_weekly BOOLEAN DEFAULT FALSE,
          last_run_at TIMESTAMPTZ,
          next_scheduled_slot TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3. Audit logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_audit_logs (
          id VARCHAR(128) PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          action VARCHAR(64) NOT NULL,
          article_id VARCHAR(128),
          article_slug VARCHAR(255),
          article_title TEXT,
          status VARCHAR(32),
          user_identity VARCHAR(128),
          details TEXT
        );
      `);

      // 4. Critical Indexes for Performance & Concurrency
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
        CREATE INDEX IF NOT EXISTS idx_blog_articles_status_scheduled ON blog_articles(status, scheduled_for);
        CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category_slug);
        CREATE INDEX IF NOT EXISTS idx_blog_audit_logs_timestamp ON blog_audit_logs(timestamp DESC);
      `);

      await client.query('COMMIT');
      console.log('[Database] Schema migrations and indexes verified successfully.');

      // 5. Automatic Data Migration from existing JSON storage / baseline
      const articleCountRes = await client.query('SELECT COUNT(*) FROM blog_articles');
      const articleCount = parseInt(articleCountRes.rows[0].count, 10);

      if (articleCount === 0) {
        console.log('[Database Migration] blog_articles is empty. Migrating existing articles...');
        let sourceArticles: ManagedBlogArticle[] = [];
        const jsonPath = path.join(process.cwd(), 'data/blog_articles.json');

        if (fs.existsSync(jsonPath)) {
          try {
            sourceArticles = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            console.log(`[Database Migration] Read ${sourceArticles.length} articles from data/blog_articles.json`);
          } catch (e) {
            console.warn('[Database Migration] Could not parse data/blog_articles.json, using baseline:', e);
          }
        }

        if (sourceArticles.length === 0) {
          sourceArticles = baselineArticles.map((b, index) => ({
            ...b,
            status: 'published',
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

        for (const art of sourceArticles) {
          await client.query(
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
            ON CONFLICT (id) DO NOTHING
            `,
            [
              art.id,
              art.slug,
              art.title,
              art.metaTitle || art.title,
              art.metaDescription || '',
              art.primaryKeyword || art.targetKeywords?.[0] || '',
              JSON.stringify(art.targetKeywords || []),
              art.category || 'Guides',
              art.categorySlug || 'guides',
              art.status || 'draft',
              art.scheduledFor || null,
              art.publishedAt || null,
              art.publishedDate || '',
              art.createdAt || new Date().toISOString(),
              art.updatedAt || new Date().toISOString(),
              art.seoScore || 85,
              art.wordCount || 1000,
              !!art.isAiGenerated,
              art.failureReason || null,
              art.publishAttempts || 0,
              JSON.stringify(art.author || {}),
              JSON.stringify(art.reviewer || {}),
              art.readTime || '5 min read',
              art.featuredImage || '/images/buy_hemp_online_guide.jpg',
              art.imageAlt || art.title,
              art.excerpt || '',
              JSON.stringify(art.keyTakeaways || []),
              JSON.stringify(art.tableOfContents || []),
              JSON.stringify(art.contentSections || []),
              JSON.stringify(art.faqs || []),
              JSON.stringify(art.scientificReferences || []),
              art.botanicalDisclaimer || '',
              art.recommendedCategorySlug || 'concentrates-wax',
              art.recommendedProductSearch || 'Live Rosin',
            ]
          );
        }
        console.log(`[Database Migration] Migrated ${sourceArticles.length} articles into PostgreSQL.`);
      }

      // 6. Migrate schedule config if missing
      const configCountRes = await client.query('SELECT COUNT(*) FROM blog_schedule_config');
      if (parseInt(configCountRes.rows[0].count, 10) === 0) {
        let scheduleConfig: PublishingScheduleConfig = {
          enabled: true,
          autoPublishApprovedDrafts: false,
          timezone: 'America/Los_Angeles',
          daysOfWeek: [1, 3, 5],
          publishHour: 10,
          publishMinute: 0,
          schedulerSecret: process.env.CRON_SECRET || 'gh-scheduler-sec-2026',
          autoGenerateTopicWeekly: false,
        };

        const configJsonPath = path.join(process.cwd(), 'data/blog_schedule_config.json');
        if (fs.existsSync(configJsonPath)) {
          try {
            scheduleConfig = { ...scheduleConfig, ...JSON.parse(fs.readFileSync(configJsonPath, 'utf-8')) };
          } catch (e) {
            console.warn('[Database Migration] Could not parse schedule config JSON:', e);
          }
        }

        await client.query(
          `
          INSERT INTO blog_schedule_config (
            id, enabled, auto_publish_approved_drafts, timezone, days_of_week,
            publish_hour, publish_minute, scheduler_secret, auto_generate_topic_weekly,
            last_run_at, next_scheduled_slot
          ) VALUES ('singleton', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            scheduleConfig.enabled,
            scheduleConfig.autoPublishApprovedDrafts,
            scheduleConfig.timezone,
            JSON.stringify(scheduleConfig.daysOfWeek),
            scheduleConfig.publishHour,
            scheduleConfig.publishMinute,
            scheduleConfig.schedulerSecret,
            scheduleConfig.autoGenerateTopicWeekly,
            scheduleConfig.lastRunAt || null,
            scheduleConfig.nextScheduledSlot || null,
          ]
        );
        console.log('[Database Migration] Migrated schedule configuration into PostgreSQL.');
      }

      // 7. Migrate audit logs if missing
      const auditCountRes = await client.query('SELECT COUNT(*) FROM blog_audit_logs');
      if (parseInt(auditCountRes.rows[0].count, 10) === 0) {
        const auditJsonPath = path.join(process.cwd(), 'data/blog_audit_logs.json');
        if (fs.existsSync(auditJsonPath)) {
          try {
            const logs: BlogAuditLog[] = JSON.parse(fs.readFileSync(auditJsonPath, 'utf-8'));
            for (const log of logs.slice(0, 100)) {
              await client.query(
                `
                INSERT INTO blog_audit_logs (
                  id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
                `,
                [
                  log.id,
                  log.timestamp,
                  log.action,
                  log.articleId,
                  log.articleSlug,
                  log.articleTitle,
                  log.status,
                  log.user,
                  log.details,
                ]
              );
            }
            console.log(`[Database Migration] Migrated ${logs.length} audit logs into PostgreSQL.`);
          } catch (e) {
            console.warn('[Database Migration] Could not parse audit logs JSON:', e);
          }
        }
      }
    } finally {
      client.release();
    }
  })();

  return global._globalDbInitPromise;
}

/**
 * Maps PostgreSQL row to ManagedBlogArticle object
 */
export function mapRowToArticle(row: any): ManagedBlogArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title || row.title,
    metaDescription: row.meta_description || '',
    primaryKeyword: row.primary_keyword || '',
    targetKeywords: Array.isArray(row.target_keywords)
      ? row.target_keywords
      : typeof row.target_keywords === 'string'
      ? JSON.parse(row.target_keywords)
      : [],
    category: row.category || 'Guides',
    categorySlug: row.category_slug || 'guides',
    status: row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : undefined,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    publishedDate: row.published_date || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    seoScore: Number(row.seo_score) || 85,
    wordCount: Number(row.word_count) || 1000,
    isAiGenerated: !!row.is_ai_generated,
    failureReason: row.failure_reason || undefined,
    publishAttempts: Number(row.publish_attempts) || 0,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : undefined,
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : undefined,
    lockedBy: row.locked_by || undefined,
    author: typeof row.author === 'string' ? JSON.parse(row.author) : row.author || undefined,
    reviewer: typeof row.reviewer === 'string' ? JSON.parse(row.reviewer) : row.reviewer || undefined,
    readTime: row.read_time || '5 min read',
    featuredImage: row.featured_image || '/images/buy_hemp_online_guide.jpg',
    imageAlt: row.image_alt || row.title,
    excerpt: row.excerpt || '',
    keyTakeaways: Array.isArray(row.key_takeaways)
      ? row.key_takeaways
      : typeof row.key_takeaways === 'string'
      ? JSON.parse(row.key_takeaways)
      : [],
    tableOfContents: Array.isArray(row.table_of_contents)
      ? row.table_of_contents
      : typeof row.table_of_contents === 'string'
      ? JSON.parse(row.table_of_contents)
      : [],
    contentSections: Array.isArray(row.content_sections)
      ? row.content_sections
      : typeof row.content_sections === 'string'
      ? JSON.parse(row.content_sections)
      : [],
    faqs: Array.isArray(row.faqs)
      ? row.faqs
      : typeof row.faqs === 'string'
      ? JSON.parse(row.faqs)
      : [],
    scientificReferences: Array.isArray(row.scientific_references)
      ? row.scientific_references
      : typeof row.scientific_references === 'string'
      ? JSON.parse(row.scientific_references)
      : [],
    botanicalDisclaimer: row.botanical_disclaimer || '',
    recommendedCategorySlug: row.recommended_category_slug || 'concentrates-wax',
    recommendedProductSearch: row.recommended_product_search || 'Live Rosin',
  };
}
