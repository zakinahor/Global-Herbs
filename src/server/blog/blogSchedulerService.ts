import { blogStorage } from './blogStorage';
import { PublishingScheduleConfig } from '../../types/blog';
import { generateSitemapXML } from '../../utils/sitemap';
import fs from 'fs';
import path from 'path';

class BlogSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  private schedulerStartTime: string = new Date().toISOString();

  /**
   * Starts persistent server-side loop running every 60 seconds
   */
  public start() {
    if (this.timer) return;

    console.log('[BlogScheduler] Starting persistent server-side scheduler (60s tick)...');
    this.schedulerStartTime = new Date().toISOString();

    // Run immediate check on start
    this.checkDueArticles().catch((err) => {
      console.error('[BlogScheduler] Initial check error:', err);
    });

    this.timer = setInterval(() => {
      this.checkDueArticles().catch((err) => {
        console.error('[BlogScheduler] Periodic check error:', err);
      });
    }, 60000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[BlogScheduler] Stopped server-side scheduler.');
    }
  }

  public isRunning(): boolean {
    return this.timer !== null;
  }

  public getStatus() {
    const config = blogStorage.getScheduleConfig();
    return {
      active: this.isRunning(),
      runningSince: this.schedulerStartTime,
      pollingIntervalSeconds: 60,
      config,
      nextScheduledSlot: this.calculateNextSlot(config),
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Calculates the next upcoming scheduled slot (e.g., Mon, Wed, Fri at 10:00 AM)
   */
  public calculateNextSlot(config: PublishingScheduleConfig): string {
    const now = new Date();
    // Default days: Monday (1), Wednesday (3), Friday (5)
    const targetDays = config.daysOfWeek || [1, 3, 5];
    const targetHour = config.publishHour ?? 10;
    const targetMin = config.publishMinute ?? 0;

    let testDate = new Date(now.getTime());

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const candidate = new Date(testDate.getTime() + dayOffset * 86400000);
      const dayOfWeek = candidate.getDay();

      if (targetDays.includes(dayOfWeek)) {
        candidate.setHours(targetHour, targetMin, 0, 0);
        if (candidate.getTime() > now.getTime()) {
          return candidate.toISOString();
        }
      }
    }

    return new Date(now.getTime() + 86400000).toISOString();
  }

  /**
   * Main server-side scheduler execution logic
   */
  public async checkDueArticles(triggeredBy: string = 'Automated Server Scheduler'): Promise<{
    checked: number;
    published: string[];
    failed: string[];
    errors: string[];
  }> {
    if (this.isChecking) {
      return { checked: 0, published: [], failed: [], errors: ['Check already in progress'] };
    }

    this.isChecking = true;
    const published: string[] = [];
    const failed: string[] = [];
    const errors: string[] = [];

    try {
      const allArticles = blogStorage.getAllArticles();
      const now = Date.now();

      // Find due scheduled articles
      const dueArticles = allArticles.filter((art) => {
        if (art.status !== 'scheduled' || !art.scheduledFor) return false;
        const scheduledTime = new Date(art.scheduledFor).getTime();
        return !isNaN(scheduledTime) && scheduledTime <= now;
      });

      for (const article of dueArticles) {
        console.log(`[BlogScheduler] Publishing due article "${article.title}" (ID: ${article.id})`);
        const result = blogStorage.publishArticle(article.id, triggeredBy);

        if (result.success && result.article) {
          published.push(result.article.slug);
          console.log(`[BlogScheduler] Successfully published: /blog/${result.article.slug}`);
        } else {
          failed.push(article.slug);
          errors.push(result.error || 'Validation error');
          console.error(`[BlogScheduler] Failed to publish ${article.slug}:`, result.error);
        }
      }

      // If articles changed, refresh sitemap
      if (published.length > 0) {
        this.updateSitemap();
      }

      // Update schedule config lastRunAt
      blogStorage.saveScheduleConfig({
        lastRunAt: new Date().toISOString(),
        nextScheduledSlot: this.calculateNextSlot(blogStorage.getScheduleConfig()),
      });
    } catch (err: any) {
      console.error('[BlogScheduler] Critical execution error:', err);
      errors.push(err.message || 'Execution error');
    } finally {
      this.isChecking = false;
    }

    return {
      checked: published.length + failed.length,
      published,
      failed,
      errors,
    };
  }

  /**
   * Regenerates public sitemap.xml to index newly published articles
   */
  public updateSitemap() {
    try {
      const published = blogStorage.getPublishedArticles();
      const xml = generateSitemapXML(published);
      const publicPath = path.join(process.cwd(), 'public/sitemap.xml');
      const distPath = path.join(process.cwd(), 'dist/sitemap.xml');

      fs.writeFileSync(publicPath, xml, 'utf-8');
      if (fs.existsSync(path.dirname(distPath))) {
        fs.writeFileSync(distPath, xml, 'utf-8');
      }
      console.log(`[BlogScheduler] Synchronized sitemap.xml with ${published.length} live blog articles.`);
    } catch (err) {
      console.error('[BlogScheduler] Error updating sitemap:', err);
    }
  }
}

export const blogScheduler = new BlogSchedulerService();
