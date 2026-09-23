import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { ChevronRight, ChevronLeft, ListFilter, ArrowUpDown, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Data and Types
import { CartItem, Product } from './types';
import { products as initialProducts, categories } from './data/products';

// Components
import Header from './components/Header';
import HomePage from './components/HomePage';
import Hero from './components/Hero';
import Sidebar from './components/Sidebar';
import ProductCard from './components/ProductCard';
import ProductSkeletonCard from './components/ProductSkeletonCard';
import ContactForm from './components/ContactForm';
import CartDrawer from './components/CartDrawer';
import MobileMenu from './components/MobileMenu';
import Footer from './components/Footer';
import BackToTopButton from './components/BackToTopButton';
import { AboutPage, ShippingPage, RefundPage, PrivacyPage, ContactPage, TermsPage } from './components/Pages';
import ProductDetailPage from './components/ProductDetailPage';
import CheckoutPage from './components/CheckoutPage';
import NotFoundPage from './components/NotFoundPage';
import SEOHead from './components/SEOHead';
import CategorySeoSection from './components/CategorySeoSection';
import BlogHubPage from './components/BlogHubPage';
import ArticleDetailPage from './components/ArticleDetailPage';
import OrderTrackingPage from './components/OrderTrackingPage';
import AgeVerificationModal from './components/AgeVerificationModal';
import SupportWidget from './components/SupportWidget';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Helper component to scroll window to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
};

interface ShopPageProps {
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  minPrice: number;
  maxPrice: number;
  setMinPrice: (val: number) => void;
  setMaxPrice: (val: number) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (val: boolean) => void;
  handleAddToCart: (productId: number, selectedWeight?: string, quantity?: number, unitPrice?: number) => Promise<void>;
}

function ShopPage({
  isLoading,
  setIsLoading,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  handleAddToCart,
}: ShopPageProps) {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const normalizedCategory =
    categorySlug === 'flower' || categorySlug === 'weed'
      ? 'flowers'
      : categorySlug === 'concentrate' ||
        categorySlug === 'concentrates' ||
        categorySlug === 'rosin' ||
        categorySlug === 'hash' ||
        categorySlug === 'extracts'
      ? 'concentrates'
      : categorySlug === 'edible' || categorySlug === 'gummies'
      ? 'edibles'
      : categorySlug === 'vape' || categorySlug === 'carts'
      ? 'vapes'
      : categorySlug === 'preroll' || categorySlug === 'joints'
      ? 'prerolls'
      : categorySlug || null;

  const activeCategory = normalizedCategory;

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 18;

  // Handle URL query params & legacy query redirects
  useEffect(() => {
    const qParam = searchParams.get('q') || searchParams.get('search');
    if (qParam !== null && qParam !== searchQuery) {
      setSearchQuery(qParam);
    }
    const legacyProd = searchParams.get('product');
    if (legacyProd) {
      navigate(`/products/${legacyProd}`, { replace: true });
    }
    const legacyCat = searchParams.get('category');
    if (legacyCat) {
      navigate(`/category/${legacyCat}`, { replace: true });
    }
  }, [searchParams]);

  // Reset to page 1 whenever search, filters, category, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, minPrice, maxPrice, searchQuery, sortOrder]);

  const activeCategoryObject = activeCategory
    ? categories.find((c) => c.slug === activeCategory)
    : null;

  const currentDepartmentName = activeCategoryObject
    ? activeCategoryObject.name
    : 'All Products';

  const handleSelectCategory = (slug: string | null) => {
    setMobileFiltersOpen(false);
    if (slug) {
      navigate(`/category/${slug}`);
    } else {
      navigate('/products');
    }
  };

  const handlePriceFilter = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  const filteredProducts = initialProducts.filter((p) => {
    if (activeCategory && p.categorySlug !== activeCategory) {
      return false;
    }
    if (p.price < minPrice || p.price > maxPrice) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(query);
      const matchCat = p.category.toLowerCase().includes(query);
      const matchDesc = p.description.toLowerCase().includes(query);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOrder) {
      case 'popularity':
        return b.reviews - a.reviews;
      case 'rating':
        return b.rating - a.rating;
      case 'latest':
        return b.id - a.id;
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      default:
        return 0;
    }
  });

  const totalProducts = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / ITEMS_PER_PAGE));

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalProducts);
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    const shopMain = document.getElementById('shop-main');
    if (shopMain) {
      shopMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full flex flex-col flex-grow"
    >
      <SEOHead
        activePage="shop"
        activeCategory={activeCategory}
        categoryName={currentDepartmentName}
        searchQuery={searchQuery}
      />

      {/* Hero Banner */}
      <Hero />

      {/* Main Catalog View */}
      <main id="shop-main" className="max-w-7xl mx-auto px-4 py-12 flex-grow w-full">
        {/* Breadcrumbs & Heading */}
        <section className="border-b border-gray-100 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div>
            <nav aria-label="Breadcrumb" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Link to="/" className="hover:text-emerald-700 cursor-pointer">
                Home
              </Link>
              <ChevronRight size={10} />
              <Link to="/products" className="hover:text-emerald-700 cursor-pointer">
                Shop
              </Link>
              {activeCategory && (
                <>
                  <ChevronRight size={10} />
                  <span className="text-gray-900">{currentDepartmentName}</span>
                </>
              )}
            </nav>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-gray-900 uppercase tracking-tight">
              {currentDepartmentName}
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer"
            >
              <ListFilter size={14} />
              <span>{mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}</span>
            </button>

            <div className="flex-grow sm:flex-grow-0 relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 h-10 select-none">
              <ArrowUpDown size={13} className="text-gray-400 mr-2" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-transparent outline-none pr-6 cursor-pointer text-xs font-semibold"
                aria-label="Sort product catalog"
              >
                <option value="popularity">Sort by Popularity</option>
                <option value="rating">Sort by Average Rating</option>
                <option value="latest">Sort by Latest Additions</option>
                <option value="price-asc">Sort by Price: Low to High</option>
                <option value="price-desc">Sort by Price: High to Low</option>
              </select>
            </div>
          </div>
        </section>

        {/* Layout Grid */}
        <div className="grid md:grid-cols-12 gap-8 items-start">
          <div className={`md:col-span-3 ${mobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
            <Sidebar
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={handleSelectCategory}
              onPriceFilter={handlePriceFilter}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </div>

          <div className={`${mobileFiltersOpen ? 'md:col-span-9' : 'col-span-12 md:col-span-9'}`}>
            {isLoading ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-left flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    Loading product catalog...
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <ProductSkeletonCard key={idx} />
                  ))}
                </div>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-24 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center space-y-4">
                <ShieldAlert size={48} className="text-emerald-800 opacity-40 animate-pulse" />
                <div>
                  <h4 className="font-heading font-bold text-sm text-gray-800 uppercase tracking-wider">
                    No Products Found
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed font-semibold">
                    We couldn't find any products in our catalog matching your price limits or search query.
                    Please adjust filters or search terms.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(17400);
                    setSearchQuery('');
                    handleSelectCategory(null);
                  }}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-left">
                    Showing <span className="text-gray-700 font-bold">{paginatedProducts.length}</span> of{' '}
                    <span className="text-gray-700 font-bold">{totalProducts}</span> results
                  </p>
                  {totalPages > 1 && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                      Page {currentPage} of {totalPages}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {paginatedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500 font-medium text-center sm:text-left">
                      Showing <span className="font-bold text-gray-900">{paginatedProducts.length}</span> of{' '}
                      <span className="font-bold text-gray-900">{totalProducts}</span> items
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      {getPageNumbers().map((p, idx) => {
                        if (typeof p === 'string') {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400 font-bold select-none">
                              ...
                            </span>
                          );
                        }
                        const isCurrent = p === currentPage;
                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`w-8 h-8 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center ${
                              isCurrent
                                ? 'bg-emerald-800 text-white shadow-xs'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                            aria-current={isCurrent ? 'page' : undefined}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                        aria-label="Next page"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SEO Category & Buyer's Guide Content (300+ Words) */}
        <CategorySeoSection categorySlug={activeCategory} />
      </main>

      <ContactForm />
    </motion.div>
  );
}

function ExternalRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-700 font-semibold text-base mb-1">Redirecting to official channel...</p>
      <p className="text-gray-500 text-xs mb-4">You will be redirected in just a moment.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors shadow-xs"
      >
        <span>Click here if not redirected automatically</span>
      </a>
    </div>
  );
}

function AnimatedRoutes({
  cartItems,
  handleAddToCart,
  handleClearCart,
  isLoading,
  setIsLoading,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  mobileFiltersOpen,
  setMobileFiltersOpen,
}: {
  cartItems: CartItem[];
  handleAddToCart: (productId: number, selectedWeight?: string, quantity?: number, unitPrice?: number) => Promise<void>;
  handleClearCart: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  minPrice: number;
  maxPrice: number;
  setMinPrice: (val: number) => void;
  setMaxPrice: (val: number) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (val: boolean) => void;
}) {
  const location = useLocation();

  const shopProps = {
    isLoading,
    setIsLoading,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    handleAddToCart,
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route
          path="/"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <HomePage onAddToCart={handleAddToCart} />
            </motion.div>
          }
        />
        <Route path="/shop" element={<ShopPage {...shopProps} />} />
        <Route path="/products" element={<ShopPage {...shopProps} />} />
        <Route path="/category/:categorySlug" element={<ShopPage {...shopProps} />} />

        <Route
          path="/products/:slug"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <ProductDetailPage onAddToCart={handleAddToCart} />
            </motion.div>
          }
        />

        <Route
          path="/about"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="about" />
              <AboutPage />
            </motion.div>
          }
        />

        <Route
          path="/shipping"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="shipping" />
              <ShippingPage />
            </motion.div>
          }
        />

        <Route
          path="/returns"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="returns" />
              <RefundPage />
            </motion.div>
          }
        />

        <Route
          path="/privacy"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="privacy" />
              <PrivacyPage />
            </motion.div>
          }
        />

        <Route
          path="/terms"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="terms" />
              <TermsPage />
            </motion.div>
          }
        />

        <Route
          path="/terms-conditions"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="terms" />
              <TermsPage />
            </motion.div>
          }
        />

        <Route
          path="/contact"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="contact" />
              <ContactPage />
            </motion.div>
          }
        />

        <Route
          path="/checkout"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <SEOHead activePage="checkout" />
              <CheckoutPage cartItems={cartItems} onClearCart={handleClearCart} />
            </motion.div>
          }
        />

        <Route
          path="/order-tracking"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <OrderTrackingPage />
            </motion.div>
          }
        />

        <Route
          path="/blog"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <BlogHubPage />
            </motion.div>
          }
        />

        <Route
          path="/blog/:slug"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <ArticleDetailPage onAddToCart={handleAddToCart} />
            </motion.div>
          }
        />

        {/* Official Social Media Direct Redirection Routes */}
        <Route
          path="/youtube"
          element={<ExternalRedirect url="https://www.youtube.com/@GlobalMarijuanaDispensary" />}
        />
        <Route
          path="/yt"
          element={<ExternalRedirect url="https://www.youtube.com/@GlobalMarijuanaDispensary" />}
        />
        <Route
          path="/tiktok"
          element={<ExternalRedirect url="https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ" />}
        />
        <Route
          path="/tik-tok"
          element={<ExternalRedirect url="https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ" />}
        />
        <Route
          path="/reddit"
          element={<ExternalRedirect url="https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM" />}
        />
        <Route
          path="/official-reddit"
          element={<ExternalRedirect url="https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM" />}
        />
        <Route
          path="/u/globalherbsinc"
          element={<ExternalRedirect url="https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM" />}
        />

        <Route
          path="*"
          element={
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full flex-grow"
            >
              <NotFoundPage />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(17400);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('popularity');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('global_herbs_cart');
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading cart from storage', e);
    }
  }, []);

  const saveCartToStorage = (items: CartItem[]) => {
    try {
      localStorage.setItem('global_herbs_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to storage', e);
    }
  };

  const handleAddToCart = async (
    productId: number,
    selectedWeight?: string,
    quantity: number = 1,
    unitPrice?: number
  ): Promise<void> => {
    const productToAdd = initialProducts.find((p) => p.id === productId);
    if (!productToAdd) return;

    const chosenWeight = selectedWeight || productToAdd.weight || productToAdd.weights?.[0] || 'Default';
    const chosenPrice = unitPrice !== undefined ? unitPrice : productToAdd.price;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product.id === productId && (item.selectedWeight || item.product.weight || '') === chosenWeight
      );
      let updated: CartItem[];

      if (existingIndex > -1) {
        updated = prevItems.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        updated = [
          ...prevItems,
          {
            product: productToAdd,
            quantity: quantity,
            selectedWeight: chosenWeight,
            unitPrice: chosenPrice,
          },
        ];
      }

      saveCartToStorage(updated);
      return updated;
    });

    setCartOpen(true);
  };

  const handleUpdateQuantity = (productId: number, quantity: number, selectedWeight?: string) => {
    setCartItems((prevItems) => {
      const updated = prevItems
        .map((item) => {
          const matches =
            item.product.id === productId &&
            (selectedWeight === undefined || (item.selectedWeight || item.product.weight || '') === selectedWeight);
          if (matches) {
            return { ...item, quantity: Math.max(1, quantity) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);

      saveCartToStorage(updated);
      return updated;
    });
  };

  const handleRemoveItem = (productId: number, selectedWeight?: string) => {
    setCartItems((prevItems) => {
      const updated = prevItems.filter(
        (item) =>
          !(
            item.product.id === productId &&
            (selectedWeight === undefined || (item.selectedWeight || item.product.weight || '') === selectedWeight)
          )
      );
      saveCartToStorage(updated);
      return updated;
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem('global_herbs_cart');
    } catch (e) {
      console.error(e);
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <BrowserRouter>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <ScrollToTop />

          <div className="min-h-screen bg-white flex flex-col justify-between text-left">
            <AgeVerificationModal />
            <Header
              categories={categories}
              cartCount={cartCount}
              onOpenCart={() => setCartOpen(true)}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <AnimatedRoutes
              cartItems={cartItems}
              handleAddToCart={handleAddToCart}
              handleClearCart={handleClearCart}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              minPrice={minPrice}
              maxPrice={maxPrice}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              mobileFiltersOpen={mobileFiltersOpen}
              setMobileFiltersOpen={setMobileFiltersOpen}
            />

            <Footer />

            <BackToTopButton />
            <SupportWidget />

            <AnimatePresence>
              {cartOpen && (
                <CartDrawer
                  isOpen={cartOpen}
                  onClose={() => setCartOpen(false)}
                  cartItems={cartItems}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  onGoToCheckout={() => {
                    setCartOpen(false);
                  }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {mobileMenuOpen && (
                <MobileMenu
                  isOpen={mobileMenuOpen}
                  onClose={() => setMobileMenuOpen(false)}
                  categories={categories}
                />
              )}
            </AnimatePresence>
          </div>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
