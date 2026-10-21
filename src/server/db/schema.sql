-- Global Herbs Persistent SEO Blog & Automated Publishing Schema
-- PostgreSQL Schema with Migrations, Constraints, and Optimized Indexes

-- 1. Blog Articles Table
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
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'publishing', 'published', 'failed'
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
  -- Hardening & Idempotency tracking fields
  publish_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_eligible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for Query Performance & Atomic Claiming
CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_articles_scheduled_for ON blog_articles(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_blog_articles_status_scheduled ON blog_articles(status, scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category_slug);

-- 3. Schedule Settings Table (Singleton)
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

-- 4. Audit Logs Table
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
