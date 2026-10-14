export type BlogPublishStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface BlogAuthor {
  name: string;
  role: string;
  avatar: string;
}

export interface BlogReviewer {
  name: string;
  credentials: string;
}

export interface ContentSubSection {
  subtitle: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ContentTable {
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface CalloutBox {
  type: 'tip' | 'warning' | 'info';
  title: string;
  text: string;
}

export interface BlogContentSection {
  id: string;
  title: string;
  paragraphs: string[];
  subsections?: ContentSubSection[];
  table?: ContentTable;
  calloutBox?: CalloutBox;
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface ScientificReference {
  citation: string;
  doiUrl?: string;
  source: string;
}

export interface ManagedBlogArticle {
  id: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeywords: string[];
  primaryKeyword: string;
  category: 'THCa & Legality' | 'Concentrates & Rosin' | 'CBD & Wellness' | 'Dosing & Guides' | 'Terpenes & Genetics' | 'Announcements & Updates';
  categorySlug: string;
  status: BlogPublishStatus;
  scheduledFor?: string; // ISO 8601 date string
  publishedAt?: string;  // ISO 8601 date string
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
  author: BlogAuthor;
  reviewer: BlogReviewer;
  publishedDate: string; // Formatted display date (e.g., "October 14, 2026")
  readTime: string;      // E.g., "7 min read"
  featuredImage: string;
  imageAlt?: string;
  excerpt: string;
  keyTakeaways: string[];
  tableOfContents: {
    id: string;
    title: string;
  }[];
  contentSections: BlogContentSection[];
  recommendedCategorySlug: string;
  recommendedProductSearch: string;
  faqs: BlogFaq[];
  scientificReferences?: ScientificReference[];
  botanicalDisclaimer?: string;
  // SEO & Quality Control
  seoScore?: number;
  wordCount?: number;
  isAiGenerated?: boolean;
}

export interface PublishingScheduleConfig {
  enabled: boolean;
  autoPublishApprovedDrafts: boolean;
  timezone: string; // E.g., "America/Los_Angeles"
  daysOfWeek: number[]; // 1 = Monday, 3 = Wednesday, 5 = Friday
  publishHour: number; // 10 (10:00 AM)
  publishMinute: number; // 0
  schedulerSecret: string;
  lastRunAt?: string;
  nextScheduledSlot?: string;
  autoGenerateTopicWeekly?: boolean;
}

export interface KeywordIdea {
  id: string;
  keyword: string;
  cluster: string;
  searchIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  difficultyTier: 'Low (Long-Tail)' | 'Medium (Targeted)' | 'High (Head Term)';
  relativeVolume: 'High' | 'Medium' | 'Emerging Long-Tail';
  businessValue: 'High' | 'Medium' | 'Low';
  relevantProducts: string[];
  targetCategorySlug: string;
  suggestedH1: string;
  isCovered: boolean;
  existingArticleSlug?: string;
  cannibalizationWarning?: string;
}

export interface KeywordCluster {
  name: string;
  description: string;
  primaryCategorySlug: string;
  keywords: KeywordIdea[];
}

export interface ArticleValidationResult {
  passed: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  checks: {
    label: string;
    passed: boolean;
    details?: string;
  }[];
}

export interface BlogAuditLog {
  id: string;
  timestamp: string;
  action: 'generated' | 'scheduled' | 'published' | 'unpublished' | 'rescheduled' | 'failed' | 'edited' | 'deleted' | 'validated';
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  status: BlogPublishStatus;
  user: string;
  details: string;
}

export interface SeoOverviewData {
  totalArticles: number;
  publishedCount: number;
  scheduledCount: number;
  draftCount: number;
  failedCount: number;
  sitemapLastUpdated: string;
  sitemapUrlCount: number;
  searchConsoleStatus: {
    connected: boolean;
    verificationMethod: string;
    siteUrl: string;
    verificationTagConfigured: boolean;
  };
  clusterCoverage: {
    clusterName: string;
    totalKeywords: number;
    coveredCount: number;
    coveragePercent: number;
  }[];
  recentAudits: BlogAuditLog[];
}
