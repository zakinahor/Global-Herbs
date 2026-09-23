import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Package, BookOpen, Layers, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { products } from '../data/products';
import { blogArticles } from '../data/blogArticles';
import { useCurrency } from '../context/CurrencyContext';
import { DEFAULT_FALLBACK_IMAGE } from '../utils/imageUtils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const POPULAR_SEARCHES = [
  'THCa Flower',
  'Live Hash Rosin',
  'Disposable Vapes',
  'Edibles',
  'Stealth Shipping',
  'Lab Tested',
];

export default function SearchModal({ isOpen, onClose, initialQuery = '' }: SearchModalProps) {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanQuery = query.trim().toLowerCase();

  // Search products
  const matchedProducts = cleanQuery
    ? products
        .filter((p) => {
          return (
            p.name.toLowerCase().includes(cleanQuery) ||
            p.category.toLowerCase().includes(cleanQuery) ||
            (p.strainType && p.strainType.toLowerCase().includes(cleanQuery)) ||
            (p.description && p.description.toLowerCase().includes(cleanQuery))
          );
        })
        .slice(0, 6)
    : [];

  // Search blog articles
  const matchedArticles = cleanQuery
    ? blogArticles
        .filter((a) => {
          return (
            a.title.toLowerCase().includes(cleanQuery) ||
            a.excerpt.toLowerCase().includes(cleanQuery) ||
            a.category.toLowerCase().includes(cleanQuery) ||
            a.targetKeywords.some((k) => k.toLowerCase().includes(cleanQuery))
          );
        })
        .slice(0, 3)
    : [];

  // Matched categories
  const categoriesList = Array.from(new Set(products.map((p) => p.category)));
  const matchedCategories = cleanQuery
    ? categoriesList
        .filter((c) => c.toLowerCase().includes(cleanQuery))
        .slice(0, 3)
    : [];

  const totalResults = matchedProducts.length + matchedArticles.length + matchedCategories.length;

  const handleSelectPopular = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanQuery) return;
    onClose();
    navigate(`/products?q=${encodeURIComponent(query)}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-20 px-2 sm:px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-10 flex flex-col max-h-[92vh] text-left"
        >
          {/* Search Input Bar */}
          <form onSubmit={handleSubmit} className="relative flex items-center px-4 py-3.5 border-b border-gray-100 bg-gray-50/70">
            <Search className="text-emerald-700 w-5 h-5 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search botanical strains, live rosin, edibles, articles..."
              className="flex-grow bg-transparent text-gray-900 text-sm sm:text-base outline-none placeholder:text-gray-400 font-medium"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition mr-1"
                aria-label="Clear search input"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 bg-gray-200/60 hover:bg-gray-200 rounded-md transition"
            >
              Esc
            </button>
          </form>

          {/* Body Content */}
          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {!cleanQuery ? (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Popular Dispensary Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSelectPopular(term)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Search size={11} className="text-emerald-600" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Dispensary Catalog Shortcuts
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium">
                    <Link
                      to="/category/flowers"
                      onClick={onClose}
                      className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-between transition"
                    >
                      <span>THCa Flower</span>
                      <ArrowRight size={12} className="text-gray-400" />
                    </Link>
                    <Link
                      to="/category/concentrates"
                      onClick={onClose}
                      className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-between transition"
                    >
                      <span>Solventless Rosin</span>
                      <ArrowRight size={12} className="text-gray-400" />
                    </Link>
                    <Link
                      to="/category/edibles"
                      onClick={onClose}
                      className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-between transition"
                    >
                      <span>Full Spectrum Edibles</span>
                      <ArrowRight size={12} className="text-gray-400" />
                    </Link>
                    <Link
                      to="/category/disposable-vapes"
                      onClick={onClose}
                      className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-between transition"
                    >
                      <span>Pure Vape Carts</span>
                      <ArrowRight size={12} className="text-gray-400" />
                    </Link>
                    <Link
                      to="/blog"
                      onClick={onClose}
                      className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-between transition"
                    >
                      <span>Knowledge Hub</span>
                      <ArrowRight size={12} className="text-gray-400" />
                    </Link>
                    <Link
                      to="/order-tracking"
                      onClick={onClose}
                      className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-between transition"
                    >
                      <span>Order Tracking</span>
                      <ArrowRight size={12} className="text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : totalResults === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <h4 className="font-heading font-bold text-gray-800 text-sm">
                  No matches for &ldquo;{query}&rdquo;
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Try searching with general botanical terms like flower, rosin, gummies, or browse our complete catalog below.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link
                    to="/products"
                    onClick={onClose}
                    className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition"
                  >
                    View All Products
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Matched Products */}
                {matchedProducts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Package size={13} className="text-emerald-700" />
                        Products ({matchedProducts.length})
                      </span>
                      <Link
                        to={`/products?q=${encodeURIComponent(cleanQuery)}`}
                        onClick={onClose}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-0.5"
                      >
                        View all <ArrowRight size={11} />
                      </Link>
                    </div>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {matchedProducts.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/products/${prod.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 transition group"
                        >
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                            }}
                          />
                          <div className="flex-grow min-w-0">
                            <h5 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-emerald-800 transition truncate">
                              {prod.name}
                            </h5>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold text-[10px]">
                                {prod.category}
                              </span>
                              {prod.strainType && <span>• {prod.strainType}</span>}
                              {prod.inStock ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-0.5 text-[10px]">
                                  <CheckCircle size={10} /> In Stock
                                </span>
                              ) : (
                                <span className="text-red-500 text-[10px]">Out of stock</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-heading font-bold text-xs sm:text-sm text-gray-900">
                              {formatPrice(prod.price)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Categories */}
                {matchedCategories.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <Layers size={13} className="text-emerald-700" />
                      Categories ({matchedCategories.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {matchedCategories.map((catName) => {
                        const slug = catName.toLowerCase().replace(/\s+/g, '-');
                        return (
                          <Link
                            key={catName}
                            to={`/category/${slug}`}
                            onClick={onClose}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-emerald-50 text-gray-800 hover:text-emerald-900 rounded-lg text-xs font-semibold transition border border-gray-200/60"
                          >
                            Browse {catName} &rarr;
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Matched Blog Articles */}
                {matchedArticles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen size={13} className="text-emerald-700" />
                        Knowledge Hub Articles ({matchedArticles.length})
                      </span>
                      <Link
                        to="/blog"
                        onClick={onClose}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-0.5"
                      >
                        All Guides &rarr;
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {matchedArticles.map((article) => (
                        <Link
                          key={article.id}
                          to={`/blog/${article.slug}`}
                          onClick={onClose}
                          className="block p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition group"
                        >
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                            <span className="text-emerald-700">{article.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {article.readTime}
                            </span>
                          </div>
                          <h5 className="font-heading font-bold text-xs sm:text-sm text-gray-900 group-hover:text-emerald-800 transition leading-snug">
                            {article.title}
                          </h5>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-normal">
                            {article.excerpt}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">Esc</kbd> to close
            </span>
            <Link
              to={`/products?q=${encodeURIComponent(query || '')}`}
              onClick={onClose}
              className="text-emerald-800 font-bold hover:underline flex items-center gap-1 ml-auto"
            >
              <span>See full catalog search results</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
