import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight, Phone, MessageSquare, ShieldCheck, User, Youtube, Music2, ExternalLink } from 'lucide-react';
import RedditIcon from './icons/RedditIcon';
import { Category } from '../types';
import { NON_INDEXABLE_CATEGORY_SLUGS } from '../utils/sitemap';
import { useAuth } from '../context/AuthContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  activeCategory?: string | null;
  onSelectCategory?: (slug: string | null) => void;
  onSelectPage?: (page: string) => void;
}

export default function MobileMenu({
  isOpen,
  onClose,
  categories,
  activeCategory,
  onSelectCategory,
  onSelectPage,
}: MobileMenuProps) {
  const { user, isLoggedIn, openAccountModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const pathCategory = location.pathname.startsWith('/category/')
    ? location.pathname.split('/category/')[1]
    : location.pathname === '/products' || location.pathname === '/'
    ? null
    : undefined;
  const currentCategory = activeCategory !== undefined ? activeCategory : pathCategory;

  const indexableCategories = categories.filter((cat) => !NON_INDEXABLE_CATEGORY_SLUGS.has(cat.slug));

  const handleCategorySelect = (slug: string | null) => {
    if (onSelectCategory) {
      onSelectCategory(slug);
    } else {
      if (slug) {
        navigate(`/category/${slug}`);
      } else {
        navigate('/products');
      }
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Slide-out Menu Panel */}
      <div className="fixed left-0 top-0 bottom-0 w-full max-w-xs bg-white shadow-2xl z-50 flex flex-col h-full animate-slide-in-left text-left">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="font-heading font-bold text-sm text-gray-900 uppercase tracking-widest">
              Navigation Menu
            </h3>
            <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-widest mt-0.5 block">
              Global Herbs
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable menu content */}
        <div className="flex-grow overflow-y-auto p-5 space-y-5">
          {/* Member Sign In / Dashboard Card */}
          <button
            onClick={() => {
              onClose();
              openAccountModal(isLoggedIn ? 'profile' : 'login');
            }}
            className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition cursor-pointer shadow-xs ${
              isLoggedIn
                ? 'bg-emerald-800 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isLoggedIn ? 'bg-emerald-700 text-white' : 'bg-emerald-800 text-white'
                }`}
              >
                {isLoggedIn ? user?.name?.charAt(0).toUpperCase() || 'M' : <User size={16} />}
              </div>
              <div>
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                    isLoggedIn ? 'text-emerald-200' : 'text-emerald-700'
                  }`}
                >
                  {isLoggedIn ? 'VIP Member' : 'Dispensary Access'}
                </span>
                <span className="text-xs font-bold block leading-tight truncate max-w-[170px]">
                  {isLoggedIn ? user?.name : 'Sign In / Register Account'}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className={isLoggedIn ? 'text-emerald-200' : 'text-emerald-700'} />
          </button>

          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              Departments
            </h4>
            
            <Link
              to="/products"
              onClick={() => handleCategorySelect(null)}
              className={`w-full text-left py-2.5 px-3 rounded-lg flex justify-between items-center text-xs font-bold uppercase tracking-wider transition ${
                currentCategory === null
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Shop All Products</span>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>

            {indexableCategories.map((cat) => {
              const isSelected = currentCategory === cat.slug;
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`w-full text-left py-2.5 px-3 rounded-lg flex justify-between items-center text-xs font-bold uppercase tracking-wider transition ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span className="text-[10px] font-semibold">({cat.count})</span>
                    <ChevronRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick links & support info */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Need Help Ordering?
            </h4>
            <div className="space-y-3">
              <a
                href="tel:+12132801161"
                className="flex items-center gap-2 text-xs font-bold text-gray-800 hover:text-emerald-700 bg-gray-50 border border-gray-100 p-2.5 rounded-lg transition"
              >
                <Phone size={14} className="text-emerald-700" />
                <span>+1 (213) 280-1161</span>
              </a>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <ShieldCheck size={14} className="text-emerald-700 flex-shrink-0" />
                <span>Odourless, dual vacuum sealed, discreet shipping.</span>
              </div>
            </div>

            {/* Official Video & Social Channels */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                Official Channels
              </h4>
              <div className="flex flex-col gap-2">
                <a
                  href="https://www.youtube.com/@GlobalMarijuanaDispensary"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 hover:bg-red-100/70 border border-red-200/60 text-red-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-red-600 flex items-center justify-center text-white shadow-xs">
                      <Youtube size={15} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold leading-tight">YouTube Channel</span>
                      <span className="text-[10px] text-red-700">@GlobalMarijuanaDispensary</span>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-red-600" />
                </a>

                <a
                  href="https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 text-white hover:bg-black transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-xs">
                      <Music2 size={14} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold leading-tight">TikTok Profile</span>
                      <span className="text-[10px] text-gray-300">@global.herbs6</span>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-gray-400" />
                </a>

                <a
                  href="https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 hover:bg-orange-100/70 border border-orange-200/60 text-orange-950 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#FF4500] flex items-center justify-center text-white shadow-xs">
                      <RedditIcon size={14} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold leading-tight">Reddit Profile</span>
                      <span className="text-[10px] text-orange-700">u/globalherbsinc</span>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-orange-600" />
                </a>
              </div>
            </div>

            {/* Useful Links in Mobile Menu */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                Useful Links
              </h4>
              <div className="flex flex-col gap-2.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Link
                  to="/contact"
                  onClick={onClose}
                  className="text-left text-emerald-800 font-extrabold flex items-center justify-between bg-emerald-50 p-2 rounded-lg"
                >
                  <span>Customer Support</span>
                  <ChevronRight size={14} />
                </Link>
                <Link
                  to="/blog"
                  onClick={onClose}
                  className="text-left hover:text-emerald-800"
                >
                  Knowledge Hub
                </Link>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="text-left hover:text-emerald-800"
                >
                  Checkout
                </Link>
                <Link
                  to="/about"
                  onClick={onClose}
                  className="text-left hover:text-emerald-800"
                >
                  About Our Shop
                </Link>
                <Link
                  to="/shipping"
                  onClick={onClose}
                  className="text-left hover:text-emerald-800"
                >
                  Shipping Policy
                </Link>
                <Link
                  to="/returns"
                  onClick={onClose}
                  className="text-left hover:text-emerald-800"
                >
                  Refund &amp; Returns
                </Link>
                <Link
                  to="/privacy"
                  onClick={onClose}
                  className="text-left hover:text-emerald-800"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Copyright 2023 &copy; Global Herbs
        </div>
      </div>
    </>
  );
}
