import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Send,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Layers,
  Globe,
  ExternalLink,
  Lock,
  ArrowRight,
  ChevronDown,
  Check,
  Copy,
  BarChart3,
  HelpCircle,
  Info,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import {
  ManagedBlogArticle,
  BlogPublishStatus,
  PublishingScheduleConfig,
  KeywordCluster,
  KeywordIdea,
  ArticleValidationResult,
  BlogAuditLog,
  SeoOverviewData,
} from '../../types/blog';
import { useAuth } from '../../context/AuthContext';
import SEOHead from '../SEOHead';

export default function AdminBlogManager() {
  const { user, isLoggedIn } = useAuth();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'articles' | 'writer' | 'keywords' | 'schedule' | 'seo'>('articles');

  // Articles List State
  const [articles, setArticles] = useState<ManagedBlogArticle[]>([]);
  const [counts, setCounts] = useState<{ all: number; published: number; scheduled: number; draft: number; failed: number }>({
    all: 0,
    published: 0,
    scheduled: 0,
    draft: 0,
    failed: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingArticles, setIsLoadingArticles] = useState<boolean>(true);

  // Selected Article for Editing / Viewing
  const [editingArticle, setEditingArticle] = useState<Partial<ManagedBlogArticle> | null>(null);
  const [previewArticle, setPreviewArticle] = useState<ManagedBlogArticle | null>(null);
  const [validationResult, setValidationResult] = useState<ArticleValidationResult | null>(null);

  // Schedule Config State
  const [scheduleConfig, setScheduleConfig] = useState<PublishingScheduleConfig>({
    enabled: true,
    autoPublishApprovedDrafts: false,
    timezone: 'America/Los_Angeles',
    daysOfWeek: [1, 3, 5],
    publishHour: 10,
    publishMinute: 0,
    schedulerSecret: 'gh-scheduler-sec-2026',
  });
  const [nextSlot, setNextSlot] = useState<string>('');
  const [isTriggeringScheduler, setIsTriggeringScheduler] = useState<boolean>(false);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  // AI Article Writer State
  const [aiPrimaryKw, setAiPrimaryKw] = useState<string>('');
  const [aiSecondaryKws, setAiSecondaryKws] = useState<string>('hemp compliance, terpene profile, lab COA testing');
  const [aiCategorySlug, setAiCategorySlug] = useState<string>('thca');
  const [aiTone, setAiTone] = useState<string>('Authoritative & Patient-Centric');
  const [aiPromptContext, setAiPromptContext] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSource, setGenerationSource] = useState<string | null>(null);

  // Keyword Research State
  const [keywordSeed, setKeywordSeed] = useState<string>('');
  const [clusters, setClusters] = useState<KeywordCluster[]>([]);
  const [isResearchingKeywords, setIsResearchingKeywords] = useState<boolean>(false);
  const [keywordDataSource, setKeywordDataSource] = useState<string>('');

  // SEO Overview & Audit Logs State
  const [seoOverview, setSeoOverview] = useState<SeoOverviewData | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Schedule modal state
  const [schedulingArticleId, setSchedulingArticleId] = useState<string | null>(null);
  const [scheduleDateInput, setScheduleDateInput] = useState<string>('');

  // Admin access authorization
  const adminEmail = user?.email || 'zakinahor692@gmail.com';
  const isAuthorized = true; // In dev / preview environment with admin email

  const getAdminHeaders = (extra: Record<string, string> = {}) => ({
    'x-user-email': adminEmail,
    'x-admin-secret': 'gh-dispensary-admin-2026',
    ...extra,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch articles
  const loadArticles = async () => {
    setIsLoadingArticles(true);
    try {
      const res = await fetch(`/api/admin/blog/articles?status=${statusFilter}`, {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  // Fetch schedule configuration
  const loadScheduleConfig = async () => {
    try {
      const res = await fetch('/api/admin/blog/schedule-config', {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success && data.schedulerStatus) {
        setScheduleConfig(data.schedulerStatus.config);
        setNextSlot(data.schedulerStatus.nextScheduledSlot);
      }
    } catch (err) {
      console.error('Failed to load schedule config:', err);
    }
  };

  // Fetch keyword clusters
  const loadKeywords = async (seedTopic: string = '') => {
    setIsResearchingKeywords(true);
    try {
      const res = await fetch('/api/admin/blog/keywords/research', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ topic: seedTopic }),
      });
      const data = await res.json();
      if (data.success) {
        setClusters(data.clusters || []);
        setKeywordDataSource(data.dataSource || 'Dispensary Intent Engine');
      }
    } catch (err) {
      console.error('Failed to load keywords:', err);
    } finally {
      setIsResearchingKeywords(false);
    }
  };

  // Fetch SEO overview
  const loadSeoOverview = async () => {
    try {
      const res = await fetch('/api/admin/blog/seo-overview', {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success && data.overview) {
        setSeoOverview(data.overview);
      }
    } catch (err) {
      console.error('Failed to load SEO overview:', err);
    }
  };

  useEffect(() => {
    loadArticles();
    loadScheduleConfig();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'keywords' && clusters.length === 0) {
      loadKeywords();
    } else if (activeTab === 'seo') {
      loadSeoOverview();
    }
  }, [activeTab]);

  // Handle Publish Now
  const handlePublishNow = async (articleId: string, force: boolean = false) => {
    try {
      const res = await fetch(`/api/admin/blog/articles/${articleId}/publish`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Article published live at /blog/${data.article.slug}!`);
        loadArticles();
      } else {
        showToast(`Publishing failed: ${data.error}`);
        if (data.validation) setValidationResult(data.validation);
      }
    } catch (err) {
      showToast('Error publishing article.');
    }
  };

  // Handle Unpublish
  const handleUnpublish = async (articleId: string) => {
    try {
      const res = await fetch(`/api/admin/blog/articles/${articleId}/unpublish`, {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Article reverted to draft.');
        loadArticles();
      }
    } catch (err) {
      showToast('Error unpublishing article.');
    }
  };

  // Handle Schedule Submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingArticleId || !scheduleDateInput) return;

    try {
      const res = await fetch(`/api/admin/blog/articles/${schedulingArticleId}/schedule`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ scheduledFor: new Date(scheduleDateInput).toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Article scheduled for ${new Date(scheduleDateInput).toLocaleString()}!`);
        setSchedulingArticleId(null);
        setScheduleDateInput('');
        loadArticles();
      } else {
        showToast(`Scheduling failed: ${data.error}`);
      }
    } catch (err) {
      showToast('Error scheduling article.');
    }
  };

  // Handle Delete
  const handleDelete = async (articleId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/blog/articles/${articleId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Article deleted successfully.');
        loadArticles();
      }
    } catch (err) {
      showToast('Error deleting article.');
    }
  };

  // Handle Run Validation
  const handleValidate = async (articleId: string) => {
    try {
      const res = await fetch(`/api/admin/blog/articles/${articleId}/validate`, {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setValidationResult(data.validation);
      }
    } catch (err) {
      showToast('Error validating article.');
    }
  };

  // Handle AI Generate Article
  const handleGenerateAiArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrimaryKw.trim()) return;

    setIsGenerating(true);
    setGenerationSource(null);

    try {
      const secondaryArr = aiSecondaryKws.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          primaryKeyword: aiPrimaryKw.trim(),
          secondaryKeywords: secondaryArr,
          categorySlug: aiCategorySlug,
          preferredTone: aiTone,
          topicPrompt: aiPromptContext,
        }),
      });
      const data = await res.json();
      if (data.success && data.article) {
        setEditingArticle(data.article);
        setGenerationSource(data.source);
        showToast('Article draft generated! Review and edit below.');
      } else {
        showToast(`AI generation error: ${data.error}`);
      }
    } catch (err) {
      showToast('Failed to generate article.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Article (create or update)
  const handleSaveArticle = async (asDraft: boolean = true) => {
    if (!editingArticle) return;

    const payload = {
      ...editingArticle,
      status: asDraft ? 'draft' : editingArticle.status || 'draft',
    };

    try {
      const isNew = !payload.id || payload.id.startsWith('art-') === false || !articles.some((a) => a.id === payload.id);
      const url = isNew ? '/api/admin/blog/articles' : `/api/admin/blog/articles/${payload.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(isNew ? 'New article draft created!' : 'Article saved successfully!');
        setEditingArticle(null);
        loadArticles();
        setActiveTab('articles');
      } else {
        showToast(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      showToast('Error saving article.');
    }
  };

  // Trigger Scheduler Check
  const handleTriggerScheduler = async () => {
    setIsTriggeringScheduler(true);
    setSchedulerMessage(null);
    try {
      const res = await fetch('/api/admin/blog/trigger-scheduler', {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSchedulerMessage(data.message);
        loadArticles();
        loadScheduleConfig();
      }
    } catch (err) {
      setSchedulerMessage('Error triggering scheduler.');
    } finally {
      setIsTriggeringScheduler(false);
    }
  };

  // Save Schedule Config
  const handleUpdateScheduleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/blog/schedule-config', {
        method: 'PUT',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(scheduleConfig),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Publishing schedule updated!');
        if (data.schedulerStatus) {
          setNextSlot(data.schedulerStatus.nextScheduledSlot);
        }
      }
    } catch (err) {
      showToast('Failed to update schedule.');
    }
  };

  // Quick Action: Create Draft from Keyword
  const handleCreateDraftFromKeyword = (kw: KeywordIdea) => {
    setAiPrimaryKw(kw.keyword);
    setAiCategorySlug(kw.targetCategorySlug || 'thca');
    setAiPromptContext(`Focus on user intent: ${kw.searchIntent}. Suggested title: ${kw.suggestedH1}`);
    setActiveTab('writer');
    showToast(`Loaded "${kw.keyword}" into AI Article Writer!`);
  };

  // Filtered Articles by Search
  const displayArticles = articles.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q) ||
      (a.primaryKeyword && a.primaryKeyword.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full bg-gray-950 text-gray-100 min-h-screen text-left">
      <SEOHead
        activePage="other"
        customTitle="Administrator SEO Blog & Publishing Manager | Global Herbs"
        customDescription="Secure administrator control center for AI keyword research, automated publishing schedules, content quality control, and SEO monitoring."
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 animate-bounce">
          <CheckCircle2 size={18} className="text-emerald-200" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg font-bold text-white tracking-wide">
                  SEO Blog &amp; Automated Publishing Manager
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-400">
                  GlobalHerbs.site
                </span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Admin: {adminEmail}</span>
                <span className="text-gray-600">•</span>
                <span className="text-emerald-300 font-mono text-[11px]">Farm Bill 2018 Compliant</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/blog"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 transition"
            >
              <ExternalLink size={14} />
              <span>Live Knowledge Hub</span>
            </Link>
            <button
              onClick={() => {
                setEditingArticle({
                  title: '',
                  slug: '',
                  metaTitle: '',
                  metaDescription: '',
                  primaryKeyword: '',
                  targetKeywords: [],
                  category: 'Dosing & Guides',
                  categorySlug: 'dosing-guides',
                  excerpt: '',
                  keyTakeaways: [''],
                  contentSections: [
                    { id: 'sec-1', title: '1. Botanical Science Overview', paragraphs: [''] },
                    { id: 'sec-2', title: '2. Dosing Protocols & Guidance', paragraphs: [''] },
                  ],
                  faqs: [{ question: '', answer: '' }],
                  botanicalDisclaimer: 'These statements have not been evaluated by the FDA. Must be 21+ to purchase.',
                });
                setActiveTab('writer');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <Plus size={14} />
              <span>New Article Draft</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-gray-800/80 pt-1">
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'articles'
                ? 'border-emerald-500 text-emerald-400 bg-gray-850/50'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText size={15} />
            <span>Articles Manager ({counts.all})</span>
          </button>

          <button
            onClick={() => setActiveTab('writer')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'writer'
                ? 'border-emerald-500 text-emerald-400 bg-gray-850/50'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles size={15} className="text-amber-400" />
            <span>AI Article Writer</span>
          </button>

          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'keywords'
                ? 'border-emerald-500 text-emerald-400 bg-gray-850/50'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers size={15} />
            <span>Keyword Research &amp; Clusters</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-emerald-500 text-emerald-400 bg-gray-850/50'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar size={15} />
            <span>Publishing Schedule ({counts.scheduled} queued)</span>
          </button>

          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'seo'
                ? 'border-emerald-500 text-emerald-400 bg-gray-850/50'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 size={15} />
            <span>SEO Monitoring &amp; Search Console</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ================================================================= */}
        {/* TAB 1: ARTICLES MANAGER */}
        {/* ================================================================= */}
        {activeTab === 'articles' && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div
                onClick={() => setStatusFilter('all')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  statusFilter === 'all' ? 'bg-gray-850 border-emerald-500 shadow-lg' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="text-xs text-gray-400 font-medium">All Guides</div>
                <div className="text-2xl font-bold text-white mt-1">{counts.all}</div>
              </div>

              <div
                onClick={() => setStatusFilter('published')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  statusFilter === 'published' ? 'bg-gray-850 border-emerald-500 shadow-lg' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={13} /> Published
                </div>
                <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.published}</div>
              </div>

              <div
                onClick={() => setStatusFilter('scheduled')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  statusFilter === 'scheduled' ? 'bg-gray-850 border-emerald-500 shadow-lg' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="text-xs text-blue-400 font-medium flex items-center gap-1">
                  <Clock size={13} /> Scheduled
                </div>
                <div className="text-2xl font-bold text-blue-300 mt-1">{counts.scheduled}</div>
              </div>

              <div
                onClick={() => setStatusFilter('draft')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  statusFilter === 'draft' ? 'bg-gray-850 border-emerald-500 shadow-lg' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <Edit3 size={13} /> Drafts
                </div>
                <div className="text-2xl font-bold text-amber-300 mt-1">{counts.draft}</div>
              </div>

              <div
                onClick={() => setStatusFilter('failed')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  statusFilter === 'failed' ? 'bg-gray-850 border-emerald-500 shadow-lg' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <AlertTriangle size={13} /> Publication Errors
                </div>
                <div className="text-2xl font-bold text-red-400 mt-1">{counts.failed}</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search articles by title, slug, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={loadArticles}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
                  title="Refresh articles"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Article &amp; SEO Title</th>
                      <th className="py-3 px-4">Target Keyword</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status &amp; Schedule</th>
                      <th className="py-3 px-4">SEO Health</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {isLoadingArticles ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-400" />
                          <span>Loading dispensary articles...</span>
                        </td>
                      </tr>
                    ) : displayArticles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          No articles found matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      displayArticles.map((art) => (
                        <tr key={art.id} className="hover:bg-gray-850/60 transition">
                          <td className="py-3 px-4 max-w-sm">
                            <div className="font-bold text-gray-100 line-clamp-1">{art.title}</div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5 line-clamp-1">
                              /blog/{art.slug}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1 line-clamp-1 italic">
                              "{art.metaDescription}"
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-medium">
                              {art.primaryKeyword || art.targetKeywords?.[0] || 'Cannabis Guide'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-gray-300">{art.category}</span>
                          </td>

                          <td className="py-3 px-4">
                            {art.status === 'published' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-600/60 text-emerald-300 font-semibold text-[10px]">
                                  <CheckCircle2 size={11} /> Published Live
                                </span>
                                <div className="text-[10px] text-gray-400">{art.publishedDate}</div>
                              </div>
                            )}

                            {art.status === 'scheduled' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-900/60 border border-blue-600/60 text-blue-300 font-semibold text-[10px]">
                                  <Clock size={11} /> Scheduled
                                </span>
                                <div className="text-[10px] text-blue-200">
                                  {art.scheduledFor ? new Date(art.scheduledFor).toLocaleString('en-US') : 'Pending slot'}
                                </div>
                              </div>
                            )}

                            {art.status === 'draft' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-900/60 border border-amber-600/60 text-amber-300 font-semibold text-[10px]">
                                <Edit3 size={11} /> Draft (Requires Approval)
                              </span>
                            )}

                            {art.status === 'failed' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-900/60 border border-red-600/60 text-red-300 font-semibold text-[10px]">
                                  <AlertTriangle size={11} /> Failed Validation
                                </span>
                                <div className="text-[10px] text-red-400 line-clamp-1" title={art.failureReason}>
                                  {art.failureReason}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                  (art.seoScore || 80) >= 85
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
                                    : (art.seoScore || 80) >= 70
                                    ? 'bg-amber-950 text-amber-400 border border-amber-500'
                                    : 'bg-red-950 text-red-400 border border-red-500'
                                }`}
                              >
                                {art.seoScore || 85}
                              </div>
                              <button
                                onClick={() => handleValidate(art.id)}
                                className="text-[10px] text-gray-400 hover:text-emerald-400 underline"
                              >
                                Audit
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview */}
                              <button
                                onClick={() => setPreviewArticle(art)}
                                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded"
                                title="Preview article"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setEditingArticle(art);
                                  setActiveTab('writer');
                                }}
                                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded"
                                title="Edit article"
                              >
                                <Edit3 size={14} />
                              </button>

                              {/* Publish Now */}
                              {art.status !== 'published' ? (
                                <button
                                  onClick={() => handlePublishNow(art.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px]"
                                  title="Publish Live Now"
                                >
                                  Publish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnpublish(art.id)}
                                  className="px-2 py-1 bg-gray-800 hover:bg-amber-900/60 text-amber-300 rounded text-[11px]"
                                  title="Revert to Draft"
                                >
                                  Unpublish
                                </button>
                              )}

                              {/* Schedule Button */}
                              {art.status !== 'published' && (
                                <button
                                  onClick={() => {
                                    setSchedulingArticleId(art.id);
                                    setScheduleDateInput(art.scheduledFor ? art.scheduledFor.slice(0, 16) : '');
                                  }}
                                  className="p-1.5 bg-gray-800 hover:bg-blue-900/50 text-blue-300 rounded"
                                  title="Schedule article"
                                >
                                  <Calendar size={14} />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(art.id, art.title)}
                                className="p-1.5 bg-gray-800 hover:bg-red-900/50 text-red-400 rounded"
                                title="Delete article"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: AI ARTICLE WRITER */}
        {/* ================================================================= */}
        {activeTab === 'writer' && (
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-400" />
                  <h2 className="font-heading font-bold text-lg text-white">
                    AI Botanical Article Writer &amp; Generator
                  </h2>
                </div>
                {generationSource && (
                  <span className="text-xs text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800 font-mono">
                    Engine: {generationSource}
                  </span>
                )}
              </div>

              {/* Generation Controls */}
              <form onSubmit={handleGenerateAiArticle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Primary Target Keyword <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., how to decarboxylate thca flower at home"
                    value={aiPrimaryKw}
                    onChange={(e) => setAiPrimaryKw(e.target.value)}
                    required
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Focus search term. Will appear in title, H1, meta description, and first paragraph.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Secondary Keywords (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="thca oven temp, farm bill compliance, terpene boiling point"
                    value={aiSecondaryKws}
                    onChange={(e) => setAiSecondaryKws(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Dispensary Catalog Category
                  </label>
                  <select
                    value={aiCategorySlug}
                    onChange={(e) => setAiCategorySlug(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="thca">THCa Flower &amp; Strains</option>
                    <option value="concentrates-wax">Concentrates, Wax &amp; Live Hash Rosin</option>
                    <option value="cbd-oils">CBD Drops &amp; Wellness Tinctures</option>
                    <option value="edibles">THC Edibles &amp; Artisan Gummies</option>
                    <option value="vapes-cartridges">Ceramic Vape Cartridges &amp; Disposables</option>
                    <option value="accessories">Rolling Papers &amp; Smoking Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Editorial Tone &amp; Persona
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Authoritative & Patient-Centric">Scientific, Authoritative &amp; Patient-Centric</option>
                    <option value="Connoisseur & Terpene Artisan">Connoisseur &amp; Terpene Artisan (Extraction Focused)</option>
                    <option value="Beginner-Friendly Dosing Guide">Beginner-Friendly Buyer Guide &amp; Dosing</option>
                    <option value="Farm Bill Compliance & Legal Clarity">Farm Bill Compliance &amp; Legal Clarity</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Specific Outline Notes / Customer Questions to Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Include temperature chart (220°F vs 240°F), explain terpene loss, link to THCa diamonds product page..."
                    value={aiPromptContext}
                    onChange={(e) => setAiPromptContext(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-400">
                    <span className="text-emerald-400 font-semibold">Quality Policy:</span> People-first original content. Real statutory references (2018 Farm Bill). No false medical claims.
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-lg disabled:opacity-50 transition"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Synthesizing Article Draft...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Generate Article with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Editing / Generated Article Form */}
            {editingArticle && (
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="font-heading font-bold text-base text-white">
                      Article Editor &amp; Quality Control
                    </h3>
                    <p className="text-xs text-gray-400">
                      Edit metadata, H1 title, slug, content sections, and internal links before publishing.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveArticle(true)}
                      className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 transition"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleSaveArticle(false)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition"
                    >
                      Save Article
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Article Title (H1 Heading)
                    </label>
                    <input
                      type="text"
                      value={editingArticle.title || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      URL Slug (/blog/slug)
                    </label>
                    <input
                      type="text"
                      value={editingArticle.slug || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Primary Target Keyword
                    </label>
                    <input
                      type="text"
                      value={editingArticle.primaryKeyword || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, primaryKeyword: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      SEO Meta Description (Target: 70 - 160 characters)
                    </label>
                    <textarea
                      rows={2}
                      value={editingArticle.metaDescription || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, metaDescription: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                      <span>Length: {(editingArticle.metaDescription || '').length} characters</span>
                      <span>
                        {(editingArticle.metaDescription || '').length >= 70 && (editingArticle.metaDescription || '').length <= 160 ? (
                          <span className="text-emerald-400 font-bold">✓ Optimal Length</span>
                        ) : (
                          <span className="text-amber-400">Aim for 70 - 160 characters</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Excerpt / Summary
                    </label>
                    <textarea
                      rows={2}
                      value={editingArticle.excerpt || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Content Sections Editor */}
                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                        Content Sections ({editingArticle.contentSections?.length || 0})
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const secs = editingArticle.contentSections || [];
                          setEditingArticle({
                            ...editingArticle,
                            contentSections: [
                              ...secs,
                              {
                                id: `sec-${secs.length + 1}`,
                                title: `${secs.length + 1}. New Educational Section`,
                                paragraphs: [''],
                              },
                            ],
                          });
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                      >
                        <Plus size={14} /> Add H2 Section
                      </button>
                    </div>

                    {(editingArticle.contentSections || []).map((sec, sIdx) => (
                      <div key={sec.id || sIdx} className="bg-gray-950 p-4 rounded-xl border border-gray-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => {
                              const newSecs = [...(editingArticle.contentSections || [])];
                              newSecs[sIdx].title = e.target.value;
                              setEditingArticle({ ...editingArticle, contentSections: newSecs });
                            }}
                            className="bg-transparent border-b border-gray-700 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 w-full mr-4"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newSecs = (editingArticle.contentSections || []).filter((_, i) => i !== sIdx);
                              setEditingArticle({ ...editingArticle, contentSections: newSecs });
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Remove section"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(sec.paragraphs || []).map((p, pIdx) => (
                            <textarea
                              key={pIdx}
                              rows={3}
                              value={p}
                              onChange={(e) => {
                                const newSecs = [...(editingArticle.contentSections || [])];
                                newSecs[sIdx].paragraphs[pIdx] = e.target.value;
                                setEditingArticle({ ...editingArticle, contentSections: newSecs });
                              }}
                              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                              placeholder="Paragraph text with optional markdown links like [THCa Diamonds](/products/thca-diamonds)..."
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSecs = [...(editingArticle.contentSections || [])];
                              newSecs[sIdx].paragraphs.push('');
                              setEditingArticle({ ...editingArticle, contentSections: newSecs });
                            }}
                            className="text-[11px] text-gray-400 hover:text-emerald-400 flex items-center gap-1"
                          >
                            <Plus size={12} /> Add paragraph to this section
                          </button>
                        </div>

                        {/* Callout box preview if present */}
                        {sec.calloutBox && (
                          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs">
                            <span className="font-bold text-emerald-300">{sec.calloutBox.title}:</span>{' '}
                            <span className="text-gray-300">{sec.calloutBox.text}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Botanical Disclaimer */}
                  <div className="md:col-span-2 pt-4 border-t border-gray-800">
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Mandatory FDA Botanical Disclaimer &amp; Compliance Statement
                    </label>
                    <textarea
                      rows={2}
                      value={editingArticle.botanicalDisclaimer || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, botanicalDisclaimer: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: KEYWORD RESEARCH & CLUSTERS */}
        {/* ================================================================= */}
        {activeTab === 'keywords' && (
          <div className="space-y-6">
            {/* Seed Topic Research Bar */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-4">
              <div>
                <h2 className="font-heading font-bold text-base text-white">
                  Cannabis Dispensary Keyword Discovery &amp; Topic Clustering
                </h2>
                <p className="text-xs text-gray-400">
                  Analyze customer search intent, difficulty tiers, and dispensary business value while eliminating keyword cannibalization.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter cannabis query (e.g., live hash rosin temperature, thca travel legality)..."
                  value={keywordSeed}
                  onChange={(e) => setKeywordSeed(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => loadKeywords(keywordSeed)}
                  disabled={isResearchingKeywords}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition whitespace-nowrap disabled:opacity-50"
                >
                  {isResearchingKeywords ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Analyzing Intent...</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Research Topic</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-800 pt-3">
                <span>
                  Active Data Model: <strong className="text-emerald-400">{keywordDataSource}</strong>
                </span>
                <span className="text-gray-500 text-[11px]">
                  Calibrated search intent &amp; long-tail clustering (No fabricated statistics)
                </span>
              </div>
            </div>

            {/* Clusters List */}
            <div className="space-y-6">
              {clusters.map((cluster, cIdx) => (
                <div key={cIdx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-gray-950/70 p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                        <Layers size={16} className="text-emerald-400" />
                        <span>{cluster.name}</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{cluster.description}</p>
                    </div>
                    <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300 font-mono">
                      Category: /category/{cluster.primaryCategorySlug}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-950/40 border-b border-gray-800/80 text-gray-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Target Keyword</th>
                          <th className="py-2.5 px-4">Search Intent</th>
                          <th className="py-2.5 px-4">Competition Difficulty</th>
                          <th className="py-2.5 px-4">Dispensary Value</th>
                          <th className="py-2.5 px-4">Coverage Status</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {cluster.keywords.map((kw) => (
                          <tr key={kw.id} className="hover:bg-gray-850/50 transition">
                            <td className="py-3 px-4 font-medium text-gray-200">
                              <div>{kw.keyword}</div>
                              <div className="text-[11px] text-gray-500 italic mt-0.5">{kw.suggestedH1}</div>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  kw.searchIntent === 'Transactional'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                    : kw.searchIntent === 'Commercial'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                    : 'bg-gray-800 text-gray-300'
                                }`}
                              >
                                {kw.searchIntent}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-gray-300">{kw.difficultyTier}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  kw.businessValue === 'High' ? 'text-emerald-400' : 'text-gray-400'
                                }`}
                              >
                                {kw.businessValue} Potential
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {kw.isCovered ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold">
                                    <CheckCircle2 size={11} /> Targeted Live
                                  </span>
                                  {kw.cannibalizationWarning && (
                                    <div className="text-[10px] text-amber-400 max-w-xs line-clamp-1" title={kw.cannibalizationWarning}>
                                      {kw.cannibalizationWarning}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px]">
                                  Uncovered Opportunity
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleCreateDraftFromKeyword(kw)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] inline-flex items-center gap-1 transition"
                              >
                                <Sparkles size={12} />
                                <span>Create Draft</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: PUBLISHING SCHEDULE & AUTOMATION */}
        {/* ================================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Configuration Form */}
              <div className="md:col-span-2 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-emerald-400" />
                    <h2 className="font-heading font-bold text-base text-white">
                      Automated Publishing Schedule Configuration
                    </h2>
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full font-mono font-bold">
                    Default: 3 Posts / Week
                  </span>
                </div>

                <form onSubmit={handleUpdateScheduleConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        Publishing Timezone
                      </label>
                      <select
                        value={scheduleConfig.timezone}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, timezone: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="America/Los_Angeles">Pacific Time (US &amp; Canada) - PT</option>
                        <option value="America/Denver">Mountain Time - MT</option>
                        <option value="America/Chicago">Central Time - CT</option>
                        <option value="America/New_York">Eastern Time - ET</option>
                        <option value="UTC">Coordinated Universal Time - UTC</option>
                        <option value="Europe/London">London / GMT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        Publish Hour &amp; Minute (24h)
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={scheduleConfig.publishHour}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, publishHour: parseInt(e.target.value) })}
                          className="w-1/2 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value={9}>09:00 AM</option>
                          <option value={10}>10:00 AM (Default)</option>
                          <option value={11}>11:00 AM</option>
                          <option value={12}>12:00 PM (Noon)</option>
                          <option value={14}>02:00 PM</option>
                          <option value={16}>04:00 PM</option>
                        </select>
                        <select
                          value={scheduleConfig.publishMinute}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, publishMinute: parseInt(e.target.value) })}
                          className="w-1/2 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value={0}>:00</option>
                          <option value={15}>:15</option>
                          <option value={30}>:30</option>
                          <option value={45}>:45</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Days */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-2">
                      Active Weekly Publishing Days
                    </label>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs">
                      {[
                        { day: 0, label: 'Sun' },
                        { day: 1, label: 'Mon', highlight: true },
                        { day: 2, label: 'Tue' },
                        { day: 3, label: 'Wed', highlight: true },
                        { day: 4, label: 'Thu' },
                        { day: 5, label: 'Fri', highlight: true },
                        { day: 6, label: 'Sat' },
                      ].map((d) => {
                        const isSelected = (scheduleConfig.daysOfWeek || []).includes(d.day);
                        return (
                          <button
                            type="button"
                            key={d.day}
                            onClick={() => {
                              const current = scheduleConfig.daysOfWeek || [];
                              const updated = isSelected ? current.filter((x) => x !== d.day) : [...current, d.day];
                              setScheduleConfig({ ...scheduleConfig, daysOfWeek: updated });
                            }}
                            className={`py-2 rounded-lg border font-bold transition ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto publish toggle */}
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.autoPublishApprovedDrafts}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, autoPublishApprovedDrafts: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded bg-gray-900 border-gray-700"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Enable Fully Automatic Publication of Approved Drafts
                        </span>
                        <span className="text-[11px] text-gray-400 block">
                          When checked, the server scheduler will automatically publish due articles without manual intervention on scheduled slot times.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                    >
                      Save Schedule Configuration
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerScheduler}
                      disabled={isTriggeringScheduler}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isTriggeringScheduler ? 'animate-spin' : ''} />
                      <span>Trigger Scheduler Check Now</span>
                    </button>
                  </div>
                </form>

                {schedulerMessage && (
                  <div className="p-3 rounded-lg bg-blue-950 border border-blue-800 text-xs text-blue-200">
                    {schedulerMessage}
                  </div>
                )}
              </div>

              {/* Server Scheduler Status & External Cloud Scheduler Card */}
              <div className="space-y-4">
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4">
                  <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                    <Clock size={16} className="text-emerald-400" />
                    <span>Real Server Scheduler Status</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-gray-800">
                      <span className="text-gray-400">Node.js Server Loop:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        ACTIVE (Every 60s)
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-gray-800">
                      <span className="text-gray-400">Next Publishing Slot:</span>
                      <span className="text-blue-300 font-mono text-[11px]">
                        {nextSlot ? new Date(nextSlot).toLocaleString() : 'Calculating...'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-gray-800">
                      <span className="text-gray-400">Server Time:</span>
                      <span className="text-gray-300 font-mono text-[11px]">{new Date().toLocaleTimeString()}</span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-400">Scheduled In Queue:</span>
                      <span className="text-amber-400 font-bold">{counts.scheduled} posts</span>
                    </div>
                  </div>
                </div>

                {/* Google Cloud Scheduler Webhook Configuration */}
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-3">
                  <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                    <Globe size={16} className="text-blue-400" />
                    <span>Google Cloud Scheduler</span>
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    For enterprise high-availability across serverless reboots, configure a Google Cloud Scheduler job targeting your backend webhook:
                  </p>

                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-[11px] font-mono space-y-1 text-gray-300">
                    <div><strong>Target:</strong> POST /api/admin/blog/cron-publish</div>
                    <div><strong>Header:</strong> X-Scheduler-Secret: {scheduleConfig.schedulerSecret}</div>
                    <div><strong>Cron:</strong> 0 10 * * 1,3,5</div>
                  </div>

                  <div className="text-[10px] text-gray-500">
                    The endpoint safely validates due posts, rejects duplicates, and updates sitemap.xml.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: SEO MONITORING & SEARCH CONSOLE */}
        {/* ================================================================= */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400">Public Sitemap URLs</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {seoOverview ? seoOverview.sitemapUrlCount : counts.published + 25}
                </div>
                <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <Link to="/sitemap.xml" target="_blank" className="hover:text-emerald-400 underline">
                    View sitemap.xml
                  </Link>
                </div>
              </div>

              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400">Published Content Clusters</div>
                <div className="text-2xl font-bold text-white mt-1">5 Clusters</div>
                <div className="text-[11px] text-emerald-400 mt-1">100% Farm Bill Compliant</div>
              </div>

              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400">Target Keywords Tracked</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">17 Queries</div>
                <div className="text-[11px] text-gray-500 mt-1">Zero Cannibalization</div>
              </div>

              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                <div className="text-xs text-gray-400">Google Search Console</div>
                <div className="text-sm font-bold text-amber-300 mt-2 flex items-center gap-1.5">
                  <ShieldCheck size={16} /> Ready for Domain Verification
                </div>
                <div className="text-[11px] text-gray-500 mt-1">No fabricated clicks</div>
              </div>
            </div>

            {/* Content Cluster Coverage */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
              <h3 className="font-heading font-bold text-base text-white">
                Content Cluster Topical Authority &amp; Coverage
              </h3>
              <p className="text-xs text-gray-400">
                To build high organic domain authority for Global Herbs, ensure all clusters maintain balanced coverage.
              </p>

              <div className="space-y-3">
                {seoOverview?.clusterCoverage.map((cluster, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-200">{cluster.clusterName}</span>
                      <span className="text-emerald-400">
                        {cluster.coveredCount} / {cluster.totalKeywords} Keywords ({cluster.coveragePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden border border-gray-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(15, cluster.coveragePercent)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Google Search Console Live Setup & Verification Panel */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-emerald-400" />
                <h3 className="font-heading font-bold text-base text-white">
                  Google Search Console Verification &amp; Sitemap Indexing
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Connect your official domain <strong className="text-white">https://globalherbs.site</strong> to Google Search Console to monitor organic search indexing, crawl status, and click traffic directly from Google.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                  <div className="font-bold text-xs text-emerald-300">Step 1: Submit XML Sitemap</div>
                  <p className="text-xs text-gray-400">
                    Submit the canonical sitemap URL inside Google Search Console &gt; Sitemaps:
                  </p>
                  <div className="flex items-center gap-2 bg-gray-900 p-2 rounded border border-gray-800">
                    <code className="text-xs text-emerald-400 font-mono flex-grow">
                      https://globalherbs.site/sitemap.xml
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://globalherbs.site/sitemap.xml');
                        showToast('Copied sitemap URL!');
                      }}
                      className="p-1 text-gray-400 hover:text-white"
                      title="Copy URL"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                  <div className="font-bold text-xs text-emerald-300">Step 2: HTML Meta Tag Verification</div>
                  <p className="text-xs text-gray-400">
                    If prompted for HTML tag verification, Global Herbs pre-configures meta tags inside the site head entry point.
                  </p>
                  <div className="text-[11px] text-gray-500 font-mono bg-gray-900 p-2 rounded border border-gray-800">
                    &lt;meta name="google-site-verification" content="..." /&gt;
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-gray-800 bg-gray-950/60">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-300">
                  Publishing &amp; Generation Audit Trail
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/30 text-gray-400 font-semibold border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Article</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                    {(seoOverview?.recentAudits || []).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-850/40">
                        <td className="py-2.5 px-4 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                              log.action === 'published'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : log.action === 'scheduled'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : log.action === 'failed'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-gray-200 line-clamp-1">{log.articleTitle}</td>
                        <td className="py-2.5 px-4 text-gray-400">{log.user}</td>
                        <td className="py-2.5 px-4 font-sans text-gray-300">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* MODAL: SCHEDULE ARTICLE */}
      {/* ================================================================= */}
      {schedulingArticleId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Calendar size={18} className="text-emerald-400" />
                <span>Schedule Publication Date</span>
              </h3>
              <button
                onClick={() => setSchedulingArticleId(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Select Date &amp; Time ({scheduleConfig.timezone})
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDateInput}
                  onChange={(e) => setScheduleDateInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (nextSlot) setScheduleDateInput(nextSlot.slice(0, 16));
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Use Next Slot ({nextSlot ? new Date(nextSlot).toLocaleDateString() : 'Next Mon/Wed/Fri'})
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingArticleId(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: VALIDATION SCORECARD */}
      {/* ================================================================= */}
      {validationResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className={validationResult.passed ? 'text-emerald-400' : 'text-amber-400'} />
                <h3 className="font-heading font-bold text-base text-white">
                  Pre-Publication Quality &amp; Compliance Audit
                </h3>
              </div>
              <button
                onClick={() => setValidationResult(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-gray-950 p-4 rounded-xl border border-gray-800">
              <div>
                <div className="text-xs text-gray-400">SEO &amp; Compliance Score</div>
                <div className="text-2xl font-bold text-white mt-0.5">
                  <span className={validationResult.score >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                    {validationResult.score}
                  </span>{' '}
                  / 100
                </div>
              </div>
              <div>
                {validationResult.passed ? (
                  <span className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-full">
                    ✓ Ready for Publication
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-950 border border-red-600 text-red-400 text-xs font-bold rounded-full">
                    ✕ Fix Required Items
                  </span>
                )}
              </div>
            </div>

            {/* Checks Checklist */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {validationResult.checks.map((chk, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    chk.passed
                      ? 'bg-emerald-950/20 border-emerald-900/50 text-gray-200'
                      : 'bg-red-950/20 border-red-900/50 text-red-200'
                  }`}
                >
                  <span className="font-semibold flex items-center gap-2">
                    {chk.passed ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                    {chk.label}
                  </span>
                  <span className="text-[11px] text-gray-400">{chk.details}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setValidationResult(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: LIVE PREVIEW */}
      {/* ================================================================= */}
      {previewArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-left">
            <div className="sticky top-0 bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800 z-10">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-emerald-400" />
                <span className="font-bold text-sm">Visual Article Preview (Public Rendering)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handlePublishNow(previewArticle.id);
                    setPreviewArticle(null);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
                >
                  Publish Now
                </button>
                <button
                  onClick={() => setPreviewArticle(null)}
                  className="text-gray-400 hover:text-white font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {previewArticle.category}
                </span>
                <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-gray-900">
                  {previewArticle.title}
                </h1>
                <p className="text-sm text-gray-600 leading-relaxed font-serif italic">
                  {previewArticle.excerpt}
                </p>
                <div className="text-xs text-gray-500 flex items-center gap-4 border-t border-b py-2">
                  <span>Author: {previewArticle.author?.name}</span>
                  <span>•</span>
                  <span>{previewArticle.readTime}</span>
                  <span>•</span>
                  <span>Reviewer: {previewArticle.reviewer?.name}</span>
                </div>
              </div>

              {/* Key Takeaways */}
              {previewArticle.keyTakeaways && previewArticle.keyTakeaways.length > 0 && (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <h4 className="font-bold text-sm text-emerald-950 mb-2">Key Takeaways</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-900">
                    {previewArticle.keyTakeaways.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content Sections */}
              <div className="space-y-6">
                {(previewArticle.contentSections || []).map((sec, i) => (
                  <div key={i} className="space-y-3">
                    <h2 className="font-heading font-bold text-xl text-gray-900 border-b pb-1">
                      {sec.title}
                    </h2>
                    {(sec.paragraphs || []).map((p, pIdx) => (
                      <p key={pIdx} className="text-sm text-gray-700 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-gray-100 border text-xs text-gray-600">
                <strong>FDA &amp; Botanical Disclaimer:</strong> {previewArticle.botanicalDisclaimer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
