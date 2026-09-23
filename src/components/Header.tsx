import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Search, Phone, Menu, X, ChevronDown, HelpCircle, FileText, Command } from 'lucide-react';
import { Category } from '../types';
import logoUrl from '../assets/images/global_herbs_logo_1784328365704.jpg';
import { DEFAULT_FALLBACK_IMAGE } from '../utils/imageUtils';
import { NON_INDEXABLE_CATEGORY_SLUGS } from '../utils/sitemap';
import AccountModal from './AccountModal';
import LanguageSwitcher from './LanguageSwitcher';
import SearchModal from './SearchModal';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  categories: Category[];
  activeCategory?: string | null;
  onSelectCategory?: (slug: string | null) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectPage?: (page: string) => void;
}

export default function Header({
  categories,
  activeCategory,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onSelectPage,
}: HeaderProps) {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const { user, isLoggedIn, isModalOpen, openAccountModal, closeAccountModal } = useAuth();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [searchCat, setSearchCat] = useState('');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut Cmd+K or Ctrl+K to open predictive search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput);
    if (searchCat) {
      handleCategorySelect(searchCat);
      navigate(`/category/${searchCat}?q=${encodeURIComponent(searchInput)}`);
    } else {
      navigate(`/products?q=${encodeURIComponent(searchInput)}`);
    }
  };

  return (
    <header className={`w-full bg-white border-b border-gray-100 sticky top-0 z-40 transition-all duration-300 ${
      isScrolled ? 'shadow-md py-0' : 'shadow-2xs'
    }`}>
      {/* Top Banner Alert & Quick Links */}
      <div className="bg-gray-50 border-b border-gray-200 py-1.5 text-xs text-gray-600 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center font-medium">
          <div className="flex items-center gap-2">
            <span>
              {t('nav.freeShipping', 'Free Shipping on all Orders above')}{' '}
              <span className="text-emerald-700 font-bold">{formatPrice(249.99)}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 text-[11px] hidden lg:inline">{t('nav.dispensingHours', 'Dispensing 24/7 Mon - Sat')}</span>
          </div>
          <div className="flex gap-4 lg:gap-5 items-center">
            <Link to="/blog" className="text-emerald-800 font-bold hover:text-emerald-900 cursor-pointer flex items-center gap-1 text-[11px]">
              <FileText size={12} /> {t('nav.blog', 'Knowledge Hub')}
            </Link>
            <Link to="/about" className="hover:text-brand-blue cursor-pointer text-[11px]">{t('nav.about', 'About Us')}</Link>
            <Link to="/shipping" className="hover:text-brand-blue cursor-pointer text-[11px]">{t('nav.shipping', 'Shipping')}</Link>
            <Link to="/contact" className="hover:text-brand-blue cursor-pointer text-[11px]">{t('nav.contact', 'Contact')}</Link>
            <Link to="/returns" className="hover:text-brand-blue cursor-pointer flex items-center gap-0.5 text-[11px]">
              {t('nav.refunds', 'Refunds')} <HelpCircle size={11} />
            </Link>

            {/* Language Switcher - Icon at top right corner */}
            <div className="border-l border-gray-200 pl-3 py-0.5 flex items-center">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Top Alert */}
      <div className="bg-emerald-900 text-emerald-100 py-1.5 px-4 text-[10px] font-semibold flex md:hidden justify-between items-center">
        <span className="truncate">Free Shipping above {formatPrice(249.99)}</span>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Link to="/blog" className="text-amber-300 font-bold hover:underline">Hub</Link>
          <span className="text-emerald-700">|</span>
          <LanguageSwitcher compact />
        </div>
      </div>

      {/* Main Bar (Logo, Search, Cart) */}
      <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          aria-label="Open mobile navigation menu"
        >
          <Menu size={24} />
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleCategorySelect(null)}>
          <img
            src={logoUrl}
            alt="Global Herbs Logo"
            className="w-11 h-11 rounded-full object-cover border border-emerald-800 shadow-md transform hover:scale-105 transition duration-200"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.src = DEFAULT_FALLBACK_IMAGE; }}
          />
          <div>
            <h1 className="font-heading font-bold text-xl tracking-tight text-gray-900 leading-none">
              Global Herbs
            </h1>
            <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-widest block mt-0.5">
              Dispensary &amp; Co.
            </span>
          </div>
        </Link>

        {/* Desktop Interactive Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-lg items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-blue/20 focus-within:border-brand-blue transition h-11"
        >
          <select
            value={searchCat}
            onChange={(e) => setSearchCat(e.target.value)}
            className="h-full px-3 text-xs bg-white text-gray-600 font-semibold border-r border-gray-200 outline-none cursor-pointer"
            aria-label="Select search category"
          >
            <option value="">{t('nav.allCategories', 'All Categories')}</option>
            {indexableCategories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('nav.searchPlaceholder', 'Search premium products...')}
            className="flex-grow px-4 py-2 text-sm bg-transparent outline-none text-gray-800"
          />
          <button
            type="submit"
            className="bg-brand-green hover:bg-brand-green-hover text-white px-5 h-full flex items-center justify-center transition cursor-pointer"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
        </form>

        {/* Support Call, Currency/Lang & Account/Cart Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <a
            href="tel:+12132801161"
            className="hidden lg:flex items-center gap-2 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg transition"
          >
            <Phone size={14} className="text-emerald-700" />
            <span>+1 (213) 280-1161</span>
          </a>

          {/* User Account */}
          <button
            id="header-member-account-btn"
            onClick={() => openAccountModal(isLoggedIn ? 'profile' : 'login')}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 ${
              isLoggedIn
                ? 'bg-emerald-800 hover:bg-emerald-900 border-emerald-700 text-white'
                : 'bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-700/25 text-emerald-950'
            }`}
            aria-label={isLoggedIn ? `Dispensary account profile for ${user?.name}` : 'Dispensary member sign in and registration'}
          >
            {isLoggedIn ? (
              <>
                <div className="relative w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-emerald-800 animate-pulse" />
                </div>
                <span className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                  {user?.name ? user.name.split(' ')[0] : 'My Account'}
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
                  <User size={14} />
                </div>
                <span className="text-xs font-bold text-emerald-950 leading-tight tracking-tight">
                  {t('nav.account', 'Sign In / Join')}
                </span>
              </>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="hidden sm:flex md:hidden items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            aria-label="Open search dialog"
          >
            <Search size={18} />
          </button>

          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 sm:px-4 py-2 rounded-lg font-semibold text-sm transition relative cursor-pointer"
            aria-label="View shopping cart"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">{t('nav.cart', 'Cart')}</span>
            {cartCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-xs ml-0.5 animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search & Quick Department Navigation */}
      <div className="md:hidden px-4 pb-2.5 pt-1 border-t border-gray-100 bg-white space-y-2">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-700/20 focus-within:border-emerald-700 transition h-10 w-full"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('nav.searchPlaceholder', 'Search strains, edibles, vapes...')}
            className="flex-grow px-3 py-1 text-xs bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="bg-brand-green hover:bg-brand-green-hover text-white px-3.5 h-full flex items-center justify-center transition cursor-pointer"
            aria-label="Search"
          >
            <Search size={14} />
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth -mx-1 px-1">
          <Link
            to="/products"
            onClick={() => handleCategorySelect(null)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
              currentCategory === null
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </Link>
          {indexableCategories.map((cat) => {
            const isSelected = currentCategory === cat.slug;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                onClick={() => handleCategorySelect(cat.slug)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Responsive Header Bottom Menu Bar */}
      <nav className="bg-emerald-800 text-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
          <ul className="flex items-center">
            <li>
              <Link
                to="/products"
                onClick={() => handleCategorySelect(null)}
                className={`px-4 py-4 hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer block ${
                  currentCategory === null ? 'bg-emerald-900' : ''
                }`}
              >
                Shop All
              </Link>
            </li>
            <li className="relative group">
              <Link
                to="/category/flowers"
                onClick={() => handleCategorySelect('flowers')}
                className={`px-4 py-4 hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer block ${
                  currentCategory === 'flowers' ? 'bg-emerald-900' : ''
                }`}
              >
                Flowers <ChevronDown size={12} />
              </Link>
              {/* Dropdown menu */}
              <ul className="absolute top-full left-0 bg-white text-gray-800 shadow-xl rounded-b-lg py-2 min-w-[200px] pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 transition duration-150 transform translate-y-2 group-hover:translate-y-0 z-50 text-xs font-semibold">
                <li>
                  <Link to="/category/flowers" onClick={() => handleCategorySelect('flowers')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    THCa Flower
                  </Link>
                </li>
                <li>
                  <Link to="/category/flowers" onClick={() => handleCategorySelect('flowers')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    Sativa Strains
                  </Link>
                </li>
                <li>
                  <Link to="/category/flowers" onClick={() => handleCategorySelect('flowers')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    Indica Strains
                  </Link>
                </li>
                <li>
                  <Link to="/category/flowers" onClick={() => handleCategorySelect('flowers')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    Hybrid Specials
                  </Link>
                </li>
              </ul>
            </li>
            <li className="relative group">
              <Link
                to="/category/vapes"
                onClick={() => handleCategorySelect('vapes')}
                className={`px-4 py-4 hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer block ${
                  currentCategory === 'vapes' ? 'bg-emerald-900' : ''
                }`}
              >
                Vapes <ChevronDown size={12} />
              </Link>
              <ul className="absolute top-full left-0 bg-white text-gray-800 shadow-xl rounded-b-lg py-2 min-w-[200px] pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 transition duration-150 transform translate-y-2 group-hover:translate-y-0 z-50 text-xs font-semibold">
                <li>
                  <Link to="/category/vapes" onClick={() => handleCategorySelect('vapes')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    Disposable Vape Pens
                  </Link>
                </li>
                <li>
                  <Link to="/category/vapes" onClick={() => handleCategorySelect('vapes')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    Live Resin Cartridges
                  </Link>
                </li>
                <li>
                  <Link to="/category/vapes" onClick={() => handleCategorySelect('vapes')} className="block w-full text-left px-4 py-2.5 hover:bg-gray-100 hover:text-emerald-700">
                    THCa &amp; CBD Pods
                  </Link>
                </li>
              </ul>
            </li>
            <li>
              <Link
                to="/category/concentrates"
                onClick={() => handleCategorySelect('concentrates')}
                className={`px-4 py-4 hover:bg-emerald-900 transition cursor-pointer block ${
                  currentCategory === 'concentrates' ? 'bg-emerald-900' : ''
                }`}
              >
                Concentrates
              </Link>
            </li>
            <li>
              <Link
                to="/category/edibles"
                onClick={() => handleCategorySelect('edibles')}
                className={`px-4 py-4 hover:bg-emerald-900 transition cursor-pointer block ${
                  currentCategory === 'edibles' ? 'bg-emerald-900' : ''
                }`}
              >
                Edibles
              </Link>
            </li>
            <li>
              <Link
                to="/category/prerolls"
                onClick={() => handleCategorySelect('prerolls')}
                className={`px-4 py-4 hover:bg-emerald-900 transition cursor-pointer block ${
                  currentCategory === 'prerolls' ? 'bg-emerald-900' : ''
                }`}
              >
                Pre-Rolls
              </Link>
            </li>
            <li>
              <Link
                to="/category/cbd"
                onClick={() => handleCategorySelect('cbd')}
                className={`px-4 py-4 hover:bg-emerald-900 transition cursor-pointer block ${
                  currentCategory === 'cbd' ? 'bg-emerald-900' : ''
                }`}
              >
                CBD &amp; Wellness
              </Link>
            </li>
            <li>
              <Link
                to="/category/accessories"
                onClick={() => handleCategorySelect('accessories')}
                className={`px-4 py-4 hover:bg-emerald-900 transition cursor-pointer block ${
                  currentCategory === 'accessories' ? 'bg-emerald-900' : ''
                }`}
              >
                Accessories
              </Link>
            </li>
            <li>
              <Link
                to="/blog"
                className="px-4 py-4 hover:bg-emerald-900 transition cursor-pointer flex items-center gap-1 bg-emerald-900/50 font-bold text-amber-300"
              >
                <FileText size={13} />
                <span>{t('nav.blog', 'Knowledge Hub')}</span>
              </Link>
            </li>
          </ul>

          <div className="flex gap-2 items-center text-emerald-100 text-[11px] py-4">
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
            <span>Dispensing 24/7 Mon - Sat</span>
          </div>
        </div>
      </nav>

      {/* Member Portal & Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen || isModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          closeAccountModal();
        }}
      />

      {/* Global Predictive Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={searchInput}
      />
    </header>
  );
}
