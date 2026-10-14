import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, LayoutGrid, BookOpen, Search, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  cartCount: number;
}

export default function MobileBottomNav({
  onOpenMobileMenu,
  onOpenCart,
  onOpenSearch,
  cartCount,
}: MobileBottomNavProps) {
  const location = useLocation();
  const { t } = useLanguage();

  // Hide bottom navigation on Checkout and Product Detail pages (where a dedicated sticky bar or focused flow exists)
  const isDetailPage = location.pathname.startsWith('/products/') && location.pathname !== '/products';
  const isCheckoutPage = location.pathname === '/checkout';

  if (isDetailPage || isCheckoutPage) {
    return null;
  }

  const isHomeOrShop = location.pathname === '/' || location.pathname === '/products' || location.pathname.startsWith('/category/');
  const isBlog = location.pathname.startsWith('/blog');

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-5 items-center gap-1 max-w-md mx-auto">
        {/* 1. Shop / Products Tab */}
        <Link
          to="/products"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[46px] ${
            isHomeOrShop
              ? 'text-emerald-800 font-bold bg-emerald-50/70'
              : 'text-gray-500 hover:text-gray-900 active:scale-95'
          }`}
          aria-label="Shop catalog"
        >
          <Store size={19} className={isHomeOrShop ? 'text-emerald-800' : 'text-gray-500'} />
          <span className="text-[10px] font-semibold leading-tight mt-0.5 tracking-tight truncate max-w-full">
            {t('nav.shop', 'Shop')}
          </span>
        </Link>

        {/* 2. Categories / Menu Drawer Tab */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-500 hover:text-gray-900 active:scale-95 transition-all duration-150 min-h-[46px] cursor-pointer"
          aria-label="Open menu and categories"
        >
          <LayoutGrid size={19} className="text-gray-500" />
          <span className="text-[10px] font-semibold leading-tight mt-0.5 tracking-tight truncate max-w-full">
            {t('nav.menu', 'Categories')}
          </span>
        </button>

        {/* 3. Knowledge Hub Tab - Highlighted with indicator */}
        <Link
          to="/blog"
          className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[46px] ${
            isBlog
              ? 'text-amber-950 font-bold bg-amber-100/90 ring-1 ring-amber-300'
              : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50/50 active:scale-95'
          }`}
          aria-label="Knowledge Hub educational guides"
        >
          <div className="relative">
            <BookOpen
              size={19}
              className={isBlog ? 'text-amber-800' : 'text-emerald-700'}
            />
            {/* Pulsing indicator to draw attention on mobile */}
            <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <span className="text-[10px] font-bold leading-tight mt-0.5 tracking-tight truncate max-w-full text-emerald-900">
            {t('nav.blog', 'Guides')}
          </span>
        </Link>

        {/* 4. Global Search Tab */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-500 hover:text-gray-900 active:scale-95 transition-all duration-150 min-h-[46px] cursor-pointer"
          aria-label="Search catalog and guides"
        >
          <Search size={19} className="text-gray-500" />
          <span className="text-[10px] font-semibold leading-tight mt-0.5 tracking-tight truncate max-w-full">
            {t('nav.search', 'Search')}
          </span>
        </button>

        {/* 5. Cart Tab with Badge */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-500 hover:text-gray-900 active:scale-95 transition-all duration-150 min-h-[46px] cursor-pointer"
          aria-label={`View Cart, ${cartCount} items`}
        >
          <div className="relative">
            <ShoppingBag size={19} className="text-gray-500" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold leading-tight mt-0.5 tracking-tight truncate max-w-full">
            {t('nav.cart', 'Cart')}
          </span>
        </button>
      </div>
    </nav>
  );
}
