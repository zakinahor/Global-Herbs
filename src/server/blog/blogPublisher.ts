import crypto from 'crypto';
import { getPool, initDatabase, mapRowToArticle } from './db';
import { ManagedBlogArticle } from '../../types/blog';
import { validateArticle } from './blogValidator';
import { blogStorage } from './blogStorage';

export interface PublishExecutionResult {
  checked: number;
  claimed: number;
  published: string[];
  failed: string[];
  errors: string[];
}

/**
 * Atomically claims and publishes due articles.
 * - Uses Postgres FOR UPDATE SKIP LOCKED to prevent duplicate execution across concurrent workers
 * - Bounded batch limit per invocation
 * - Only marks as published after full validation and DB write succeed
 * - Safe retry cap: max 3 attempts with 15 min cooldown
 * - Self-healing: unlocks stuck/crashed runs older than 10 minutes
 */
export async function claimAndPublishDueArticles(
  triggeredBy: string = 'Vercel Cron Publisher',
  batchLimit: number = 3
): Promise<PublishExecutionResult> {
  const published: string[] = [];
  const failed: string[] = [];
  const errors: string[] = [];

  const pool = getPool();

  // If running in development without PostgreSQL, run in-memory fallback
  if (!pool) {
    console.warn('[BlogPublisher] Running in fallback mode (no PostgreSQL pool).');
    const all = blogStorage.getAllArticles();
    const now = Date.now();
    const due = all.filter((a) => {
      if (a.status !== 'scheduled' || !a.scheduledFor) return false;
      const t = new Date(a.scheduledFor).getTime();
      return !isNaN(t) && t <= now;
    });

    for (const art of due.slice(0, batchLimit)) {
      const res = await blogStorage.publishArticle(art.id, triggeredBy);
      if (res.success && res.article) {
        published.push(res.article.slug);
      } else {
        failed.push(art.slug);
        errors.push(res.error || 'Validation error');
      }
    }

    return {
      checked: due.length,
      claimed: published.length + failed.length,
      published,
      failed,
      errors,
    };
  }

  // Ensure DB initialized
  await initDatabase();

  const workerId = `worker-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
  const client = await pool.connect();

  try {
    // ATOMIC CLAIM:
    // 1. Scheduled articles due now
    // 2. Or stuck articles locked > 10m ago
    // 3. Or failed articles with < 3 attempts and last attempt > 15m ago (safe retry)
    const claimQuery = `
      WITH candidates AS (
        SELECT id
        FROM blog_articles
        WHERE
          (status = 'scheduled' AND scheduled_for <= NOW())
          OR (status = 'publishing' AND locked_at < NOW() - INTERVAL '10 minutes')
          OR (status = 'failed' AND publish_attempts < 3 AND last_attempt_at < NOW() - INTERVAL '15 minutes')
        ORDER BY scheduled_for ASC NULLS LAST, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE blog_articles
      SET
        status = 'publishing',
        locked_at = NOW(),
        locked_by = $2,
        publish_attempts = COALESCE(publish_attempts, 0) + 1,
        last_attempt_at = NOW(),
        updated_at = NOW()
      WHERE id IN (SELECT id FROM candidates)
      RETURNING *;
    `;

    const claimRes = await client.query(claimQuery, [batchLimit, workerId]);
    const claimedRows = claimRes.rows;

    console.log(`[BlogPublisher] Claimed ${claimedRows.length} articles for processing (Worker: ${workerId})`);

    if (claimedRows.length === 0) {
      return {
        checked: 0,
        claimed: 0,
        published,
        failed,
        errors,
      };
    }

    // Load all current articles for cross-validation (duplicate slugs, keyword cannibalization)
    const allArticlesRes = await client.query('SELECT * FROM blog_articles');
    const allArticles = allArticlesRes.rows.map(mapRowToArticle);

    for (const row of claimedRows) {
      const article: ManagedBlogArticle = mapRowToArticle(row);

      console.log(`[BlogPublisher] Validating claimed article "${article.title}" (Attempt ${article.publishAttempts}/3)...`);

      // Run botanical, legal, and SEO validator
      const validation = validateArticle(article, allArticles);

      if (!validation.passed) {
        const errorMsg = `Validation failed: ${validation.errors.join('; ')}`;
        console.warn(`[BlogPublisher] Article "${article.slug}" failed validation:`, errorMsg);

        // Update database as failed
        await client.query(
          `
          UPDATE blog_articles
          SET
            status = 'failed',
            failure_reason = $1,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
          WHERE id = $2
          `,
          [errorMsg, article.id]
        );

        // Audit log entry
        await client.query(
          `
          INSERT INTO blog_audit_logs (
            id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
          ) VALUES ($1, NOW(), 'failed', $2, $3, $4, 'failed', $5, $6)
          `,
          [
            `LOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            article.id,
            article.slug,
            article.title,
            triggeredBy,
            article.publishAttempts >= 3
              ? `[ALERT] Reached maximum publish attempts (3). Validation errors: ${validation.errors.join(', ')}`
              : `Publish attempt #${article.publishAttempts} rejected: ${validation.errors.join(', ')}`,
          ]
        );

        failed.push(article.slug);
        errors.push(`${article.slug}: ${errorMsg}`);
        continue;
      }

      // Validation passed: Atomically publish
      const nowIso = new Date().toISOString();
      const publishedDateFormatted = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      });

      await client.query(
        `
        UPDATE blog_articles
        SET
          status = 'published',
          published_at = NOW(),
          published_date = $1,
          seo_score = $2,
          failure_reason = NULL,
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
        WHERE id = $3
        `,
        [publishedDateFormatted, validation.score, article.id]
      );

      // Audit log entry
      await client.query(
        `
        INSERT INTO blog_audit_logs (
          id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
        ) VALUES ($1, NOW(), 'published', $2, $3, $4, 'published', $5, $6)
        `,
        [
          `LOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          article.id,
          article.slug,
          article.title,
          triggeredBy,
          `Automated publication succeeded live at /blog/${article.slug} (SEO Score: ${validation.score})`,
        ]
      );

      published.push(article.slug);
      console.log(`[BlogPublisher] Successfully published article live at /blog/${article.slug}`);
    }

    // Update schedule config last_run_at
    await client.query(
      `
      UPDATE blog_schedule_config
      SET last_run_at = NOW(), updated_at = NOW()
      WHERE id = 'singleton'
      `
    );

    // Refresh memory cache in blogStorage if loaded
    await blogStorage.refreshFromDatabase();
  } catch (err: any) {
    console.error('[BlogPublisher] Critical error during execution:', err);
    errors.push(err.message || 'Unknown publisher failure');
  } finally {
    client.release();
  }

  return {
    checked: published.length + failed.length,
    claimed: published.length + failed.length,
    published,
    failed,
    errors,
  };
}
