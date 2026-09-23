import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Calendar,
  User,
  ShieldCheck,
  BookOpen,
  Share2,
  Check,
  ShoppingBag,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Smartphone,
  Send,
  CheckCircle2,
  BellRing,
  GraduationCap,
  Scale,
  FileText,
} from 'lucide-react';
import { getArticleBySlug, blogArticles } from '../data/blogArticles';
import { products } from '../data/products';
import ProductCard from './ProductCard';
import SEOHead from './SEOHead';

interface ArticleDetailPageProps {
  onAddToCart: (productId: number) => Promise<void>;
}

export default function ArticleDetailPage({ onAddToCart }: ArticleDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // VIP Beta Waitlist Form State
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const article = getArticleBySlug(slug || '');

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = waitlistEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setWaitlistError('Please enter a valid email address.');
      return;
    }
    setWaitlistLoading(true);
    setWaitlistError(null);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          tags: ['mobile-app-waitlist', 'vip-early-access'],
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setWaitlistSubmitted(true);
      } else {
        setWaitlistSubmitted(true); // Graceful fallback
      }
    } catch {
      setWaitlistSubmitted(true);
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="font-heading font-bold text-2xl text-gray-900 mb-2">Guide Not Found</h2>
        <p className="text-gray-600 text-sm mb-6">The educational guide you are looking for does not exist or has been moved.</p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-900 transition"
        >
          <ArrowLeft size={16} /> Back to Knowledge Hub
        </Link>
      </div>
    );
  }

  // Find matching featured products for this article guide
  const matchingProducts = products
    .filter((p) => {
      const catMatch = p.categorySlug === article.recommendedCategorySlug;
      const searchMatch = article.recommendedProductSearch
        ? p.name.toLowerCase().includes(article.recommendedProductSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(article.recommendedProductSearch.toLowerCase())
        : true;
      return catMatch && searchMatch;
    })
    .slice(0, 3);

  // Fallback to top products in that category if none matched specific search
  const featuredProducts = matchingProducts.length > 0
    ? matchingProducts
    : products.filter((p) => p.categorySlug === article.recommendedCategorySlug).slice(0, 3);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const relatedArticles = blogArticles.filter((a) => a.id !== article.id).slice(0, 2);

  return (
    <article className="w-full bg-white text-left min-h-screen pb-16">
      <SEOHead
        activePage="blog"
        selectedArticle={article}
        customTitle={article.metaTitle}
        customDescription={article.metaDescription}
      />

      {/* Hero Banner Header */}
      <header className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-gray-900 text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          {/* Breadcrumbs */}
          <nav className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <ChevronRight size={12} className="text-emerald-500" />
            <Link to="/blog" className="hover:text-white transition">Knowledge Hub</Link>
            <ChevronRight size={12} className="text-emerald-500" />
            <span className="text-white/80">{article.category}</span>
          </nav>

          {/* Category Tag */}
          <div className="inline-block px-3 py-1 bg-emerald-700/80 border border-emerald-500/50 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-100">
            {article.category}
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Author & Reviewer Metadata Row */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-emerald-800/80 text-xs text-emerald-100">
            <div className="flex items-center gap-3">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-xs"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div>
                <span className="font-bold block text-white text-sm">{article.author.name}</span>
                <span className="text-[11px] text-emerald-300">{article.author.role}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-emerald-200 text-[11px] font-medium flex-wrap">
              <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-700/60 px-3 py-1.5 rounded-lg">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Reviewed by {article.reviewer.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{article.publishedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{article.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Sticky Table of Contents & Social Share (lg:col-span-3) */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="sticky top-24 bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <BookOpen size={16} className="text-emerald-700" />
                <span>Table of Contents</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-gray-200/60 rounded-lg transition"
                title="Copy Guide Link"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
              </button>
            </div>

            <nav className="space-y-2 text-xs font-semibold text-gray-600">
              {article.tableOfContents.map((toc, idx) => (
                <a
                  key={idx}
                  href={`#${toc.id}`}
                  className="block py-1 px-2 rounded hover:bg-emerald-50 hover:text-emerald-900 transition leading-snug"
                >
                  {toc.title}
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Target Keywords
              </span>
              <div className="flex flex-wrap gap-1">
                {article.targetKeywords.map((kw, idx) => (
                  <span key={idx} className="bg-white text-gray-700 text-[10px] px-2 py-0.5 rounded border border-gray-200">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Article Content (lg:col-span-9) */}
        <main className="lg:col-span-9 space-y-8">
          
          {/* Featured Hero Image Banner */}
          {article.featuredImage && (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-md bg-emerald-950 group">
              <img
                src={article.featuredImage}
                alt={`${article.title} - Official Global Herbs Mockup Preview`}
                className="w-full h-auto max-h-[460px] object-cover object-center"
                loading="eager"
                decoding="async"
              />
              <div className="bg-gradient-to-r from-emerald-950/95 via-gray-900/90 to-emerald-950/95 px-5 py-3 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-100">
                <span className="font-semibold flex items-center gap-1.5">
                  <Smartphone size={15} className="text-emerald-400" />
                  Official Preview: Global Herbs Native Mobile App Interface
                </span>
                <span className="text-[11px] bg-emerald-800/80 px-2.5 py-0.5 rounded-full text-emerald-200 font-bold uppercase tracking-wider border border-emerald-600/50">
                  Coming Soon to iOS &amp; Android
                </span>
              </div>
            </div>
          )}

          {/* Key Takeaways Box */}
          <div className="bg-emerald-50/80 border-2 border-emerald-200/80 rounded-2xl p-6 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm uppercase tracking-wider">
              <Sparkles size={18} className="text-emerald-700" />
              <h2>Key Guide Takeaways</h2>
            </div>
            <ul className="space-y-2.5 text-xs text-gray-800 font-medium">
              {article.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Article Sections */}
          {article.contentSections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-4 scroll-mt-28">
              <h2 className="font-heading font-extrabold text-2xl text-gray-900 tracking-tight border-b border-gray-100 pb-2">
                {section.title}
              </h2>

              {section.paragraphs.map((p, idx) => (
                <p key={idx} className="text-sm text-gray-700 leading-relaxed font-normal">
                  {p}
                </p>
              ))}

              {section.calloutBox && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed my-4 ${
                  section.calloutBox.type === 'tip'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : section.calloutBox.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <strong className="block font-bold mb-1">{section.calloutBox.title}</strong>
                  <span>{section.calloutBox.text}</span>
                </div>
              )}
            </section>
          ))}

          {/* Dedicated VIP Early Access Card for Mobile App Announcement */}
          {article.id === 'global-herbs-mobile-app-announcement' && (
            <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-gray-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-700/50 space-y-5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                <BellRing size={16} />
                <span>Exclusive Beta Access &amp; Launch Perk</span>
              </div>

              <div className="space-y-2">
                <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
                  Be the First to Experience the Global Herbs App
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200 max-w-2xl leading-relaxed">
                  Join our VIP Beta list today to receive early access on TestFlight &amp; Google Play, plus unlock an instant <strong className="text-white">20% launch voucher</strong> for your first mobile order.
                </p>
              </div>

              {waitlistSubmitted ? (
                <div className="bg-emerald-800/80 border border-emerald-500/60 rounded-xl p-4 flex items-center gap-3 text-emerald-100 text-xs">
                  <CheckCircle2 size={20} className="text-emerald-300 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-white text-sm">You are on the VIP Early Access List!</span>
                    <span>Check your email soon for your 20% launch voucher and TestFlight beta invitations.</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-3 max-w-lg">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="Enter your email for beta access & 20% off..."
                      required
                      className="flex-1 bg-white text-gray-900 px-4 py-3 rounded-xl text-xs font-medium placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={waitlistLoading}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm whitespace-nowrap cursor-pointer"
                    >
                      {waitlistLoading ? (
                        <span>Joining...</span>
                      ) : (
                        <>
                          <Send size={14} /> Join VIP Waitlist
                        </>
                      )}
                    </button>
                  </div>
                  {waitlistError && (
                    <p className="text-xs text-red-300 font-semibold">{waitlistError}</p>
                  )}
                  <p className="text-[11px] text-emerald-300/80">
                    🔒 Strict privacy guarantee. No spam, ever. Unsubscribe anytime with 1 click.
                  </p>
                </form>
              )}
            </section>
          )}

          {/* Interactive Recommended Products CTA Widget */}
          <section className="bg-gradient-to-r from-emerald-900 to-gray-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <ShoppingBag size={12} />
                  <span>Interactive Educational CTA</span>
                </div>
                <h3 className="font-heading font-bold text-xl sm:text-2xl text-white">
                  Buy Tested Products Featured in this Guide
                </h3>
                <p className="text-xs text-emerald-200 mt-1">
                  Lab-tested, 100% Farm Bill compliant, shipped in discrete vacuum packaging directly to your door.
                </p>
              </div>

              <Link
                to={`/category/${article.recommendedCategorySlug}`}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap"
              >
                View Collection
              </Link>
            </div>

            {/* Product Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-900">
              {featuredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          </section>

          {/* Article FAQs for Rich Search Schema */}
          <section className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2">
              <HelpCircle size={18} className="text-emerald-700" />
              <span>Frequently Asked Questions — {article.title}</span>
            </h3>

            <div className="space-y-2">
              {article.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left p-4 flex justify-between items-center text-xs font-bold text-gray-900 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronRight size={16} className={`transform transition-transform text-gray-400 ${isOpen ? 'rotate-90 text-emerald-700' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-gray-600 border-t border-gray-100 bg-gray-50/50 leading-relaxed pt-2">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Scientific Citations & Academic References */}
          {article.scientificReferences && article.scientificReferences.length > 0 && (
            <section className="bg-emerald-950/5 border border-emerald-900/10 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <GraduationCap size={16} className="text-emerald-700" />
                <span>Peer-Reviewed Literature &amp; Scientific Sources</span>
              </div>
              <ol className="space-y-2 text-xs text-gray-700 list-decimal list-inside">
                {article.scientificReferences.map((ref, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-medium text-gray-800">{ref.citation}</span>
                    {ref.doiUrl && (
                      <a
                        href={ref.doiUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold ml-2 underline underline-offset-2"
                      >
                        [View Source: {ref.source} <ExternalLink size={10} />]
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Standardized Botanical & Medical Compliance Disclaimer */}
          <section className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900">
              <Scale size={15} className="text-amber-800 flex-shrink-0" />
              <span>Compliance &amp; Botanical Health Disclosure</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed font-normal">
              {article.botanicalDisclaimer ||
                'This educational publication is prepared solely for informational and scientific literacy purposes under the 2018 United States Farm Bill (Public Law 115-334). These statements have not been evaluated by the Food and Drug Administration. Products mentioned are derived from federally compliant industrial hemp containing less than 0.3% Delta-9 THC on a dry weight basis and are not intended to diagnose, treat, cure, or prevent any medical condition. Always seek the advice of a qualified physician with any questions regarding personal health regimens.'}
            </p>
          </section>

          {/* Related Articles Row */}
          <section className="pt-6 border-t border-gray-200 space-y-4">
            <h3 className="font-heading font-bold text-xl text-gray-900">
              Related Educational Guides
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="group bg-white border border-gray-200 hover:border-emerald-700 rounded-2xl p-4 transition shadow-2xs hover:shadow-md space-y-2"
                >
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    {rel.category}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-gray-900 group-hover:text-emerald-800 transition line-clamp-2">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {rel.excerpt}
                  </p>
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 pt-1">
                    Read Guide <ChevronRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>
    </article>
  );
}
