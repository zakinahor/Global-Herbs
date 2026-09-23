import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Clock, Calendar, ChevronRight, ShieldCheck, Sparkles, Filter } from 'lucide-react';
import { blogArticles, BlogArticle } from '../data/blogArticles';
import SEOHead from './SEOHead';

export default function BlogHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'Announcements & Updates', 'THCa & Legality', 'Concentrates & Rosin', 'CBD & Wellness', 'Dosing & Guides'];

  const filteredArticles = blogArticles.filter((article) => {
    if (selectedCategory !== 'All' && article.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = article.title.toLowerCase().includes(q);
      const matchExcerpt = article.excerpt.toLowerCase().includes(q);
      const matchKw = article.targetKeywords.some((kw) => kw.toLowerCase().includes(q));
      if (!matchTitle && !matchExcerpt && !matchKw) return false;
    }
    return true;
  });

  const featuredArticle = blogArticles[0];

  return (
    <div className="w-full bg-gray-50/50 min-h-screen text-left pb-16">
      <SEOHead
        activePage="blog"
        customTitle="Cannabis Education & Buyer's Guides | Global Herbs Knowledge Hub"
        customDescription="Comprehensive educational guides on THCa flower, solventless Live Hash Rosin, Full Spectrum CBD drops for sleep, terpene profiles, and precise dosing charts."
      />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-gray-900 text-white py-14 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-800/80 border border-emerald-600/50 rounded-full text-emerald-200 text-[11px] font-bold uppercase tracking-widest">
            <BookOpen size={14} className="text-emerald-400" />
            <span>Cannabis Science &amp; Consumer Education</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight max-w-3xl">
            Educational Guides &amp; Buyer Knowledge Hub
          </h1>

          <p className="text-sm text-emerald-100 max-w-2xl leading-relaxed">
            Empowering consumers with lab-backed botanical science, Farm Bill compliance guides, terpene analysis, and dosing charts to help you select the exact product for your needs.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-md">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search guides (e.g., THCa, CBD sleep drops, Live Rosin)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-gray-900 pl-10 pr-4 py-3 rounded-xl text-xs font-medium placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        
        {/* Featured Article Hero Card */}
        {selectedCategory === 'All' && !searchQuery && (
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-7 relative h-64 lg:h-auto overflow-hidden">
                <img
                  src={featuredArticle.featuredImage}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover transform hover:scale-105 transition duration-500"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = '/images/indoor_flower_buds.jpg'; }}
                />
                <div className="absolute top-4 left-4 bg-emerald-800 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
                  Featured Educational Guide
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    <span>{featuredArticle.category}</span>
                    <span>•</span>
                    <span className="text-gray-500 font-normal">{featuredArticle.readTime}</span>
                  </div>

                  <h2 className="font-heading font-extrabold text-2xl text-gray-900 hover:text-emerald-800 transition leading-snug">
                    <Link to={`/blog/${featuredArticle.slug}`}>
                      {featuredArticle.title}
                    </Link>
                  </h2>

                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                    {featuredArticle.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>Medically Reviewed</span>
                  </div>

                  <Link
                    to={`/blog/${featuredArticle.slug}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                  >
                    <span>Read Full Guide</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Category Filters Pill Navigation */}
        <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mr-2 flex-shrink-0">
            <Filter size={14} /> Categories:
          </span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </section>

        {/* Articles Grid */}
        <section className="space-y-6">
          <h2 className="font-heading font-bold text-xl text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-700" />
            <span>All Educational Guides ({filteredArticles.length})</span>
          </h2>

          {filteredArticles.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3">
              <h3 className="font-heading font-bold text-lg text-gray-900">No Guides Found</h3>
              <p className="text-xs text-gray-500">Try adjusting your search keywords or filter category.</p>
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  className="bg-white border border-gray-200 hover:border-emerald-700 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.src = '/images/indoor_flower_buds.jpg'; }}
                      />
                      <span className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                        {article.category}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {article.publishedDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {article.readTime}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-base text-gray-900 group-hover:text-emerald-800 transition leading-snug line-clamp-2">
                        <Link to={`/blog/${article.slug}`}>
                          {article.title}
                        </Link>
                      </h3>

                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                        {article.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-gray-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Lab Audited</span>
                    </div>

                    <Link
                      to={`/blog/${article.slug}`}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 transition"
                    >
                      Read Guide <ChevronRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* E-E-A-T Editorial Standard & Botanical Disclaimer */}
        <section className="border-t border-gray-200 pt-8 mt-12 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <ShieldCheck size={24} className="text-emerald-700 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-gray-900 block">ISO-17025 Third-Party Lab Audited</span>
                <span className="text-[11px] text-gray-500">Every batch tested for cannabinoid purity &amp; potency.</span>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <Sparkles size={24} className="text-emerald-700 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-gray-900 block">Peer-Reviewed Botanical Sourcing</span>
                <span className="text-[11px] text-gray-500">Guides reference NCBI, PubMed &amp; academic journals.</span>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <BookOpen size={24} className="text-emerald-700 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-gray-900 block">2018 Farm Bill Compliant</span>
                <span className="text-[11px] text-gray-500">Federally compliant hemp containing &lt;0.3% Delta-9 THC.</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-100/80 border border-gray-200 rounded-xl p-4 text-[11px] text-gray-500 leading-relaxed">
            <strong className="text-gray-700 block mb-1">Educational Botanical &amp; Medical Disclaimer:</strong>
            The educational articles and guides published in the Global Herbs Knowledge Hub are intended strictly for educational and informational purposes under the 2018 United States Farm Bill. These statements have not been evaluated by the Food and Drug Administration. Products mentioned are not intended to diagnose, treat, cure, or prevent any illness or disease. Always seek the advice of a physician or other qualified healthcare provider regarding any health condition or dietary changes.
          </div>
        </section>
      </main>
    </div>
  );
}
