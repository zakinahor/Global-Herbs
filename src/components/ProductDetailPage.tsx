import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ShoppingCart, ArrowLeft, Shield, Sparkles, CheckCircle2, Truck, HelpCircle, MessageSquare, AlertTriangle, Users, ShieldCheck, FileText, Download, Package, Flame, Zap, ThumbsUp, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { Product, WeightVariant } from '../types';
import { handleImageError } from '../utils/imageUtils';
import { products as allProducts } from '../data/products';
import { getProductWeightVariants, calculateVariantPrice, findVariantByLabel } from '../utils/weightVariants';
import { getProductReviews, saveProductReview, ProductReview } from '../utils/productReviews';
import NotFoundPage from './NotFoundPage';
import COAModal from './COAModal';
import SEOHead from './SEOHead';
import { analytics } from '../utils/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface ProductDetailPageProps {
  product?: Product;
  onBack?: () => void;
  onAddToCart: (productId: number, selectedWeight?: string, quantity?: number, unitPrice?: number) => Promise<void>;
  onSelectProduct?: (product: Product) => void;
}

export default function ProductDetailPage({
  product,
  onBack,
  onAddToCart,
  onSelectProduct,
}: ProductDetailPageProps) {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const activeProduct = product || allProducts.find((p) => p.slug === slug || String(p.id) === slug);

  if (!activeProduct) {
    return <NotFoundPage />;
  }

  const weightVariants = getProductWeightVariants(activeProduct);
  const [selectedWeight, setSelectedWeight] = useState<string>(
    activeProduct.weight || weightVariants[0]?.shortLabel || 'Default'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [adding, setAdding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'shipping' | 'reviews'>('desc');
  const [isCoaOpen, setIsCoaOpen] = useState<boolean>(false);
  const [sampleRequested, setSampleRequested] = useState<boolean>(false);

  const selectedVariant = findVariantByLabel(weightVariants, selectedWeight);
  const currentPrice = calculateVariantPrice(activeProduct.price, selectedVariant);
  const currentOriginalPrice = activeProduct.originalPrice
    ? calculateVariantPrice(activeProduct.originalPrice, selectedVariant)
    : undefined;
  
  // Distinct reviews per product loaded from productReviews engine with local persistence
  const [localReviews, setLocalReviews] = useState<ProductReview[]>(() => getProductReviews(activeProduct));
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewEmail, setNewReviewEmail] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});

  // Scroll to top when product changes & synchronize distinct reviews
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activeProduct) {
      const vars = getProductWeightVariants(activeProduct);
      setSelectedWeight(activeProduct.weight || vars[0]?.shortLabel || 'Default');
      setLocalReviews(getProductReviews(activeProduct));
      setReviewSubmitted(false);
      analytics.viewItem({
        id: activeProduct.id,
        name: activeProduct.name,
        category: activeProduct.category,
        price: activeProduct.price,
        weight: activeProduct.weight,
        image: activeProduct.image,
      });
    }
  }, [slug, activeProduct]);

  const handleAddToCart = async () => {
    setAdding(true);
    // Track add to cart event
    analytics.addToCart(
      {
        id: activeProduct.id,
        name: activeProduct.name,
        category: activeProduct.category,
        price: currentPrice,
      },
      quantity,
      selectedVariant.shortLabel
    );

    // Add item with weight variant and calculated price
    await onAddToCart(activeProduct.id, selectedVariant.shortLabel, quantity, currentPrice);
    setAdding(false);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const authorClean = newReviewAuthor.trim();
    const commentClean = newReviewComment.trim();
    const emailClean = newReviewEmail.trim();

    const newRev: ProductReview = {
      id: `rev-${activeProduct.id}-${Date.now()}`,
      author: authorClean,
      rating: newReviewRating,
      date: 'Just now',
      title: `Verified Experience with ${activeProduct.name}`,
      comment: commentClean,
      verified: true,
      helpfulCount: 1,
    };

    const updated = saveProductReview(activeProduct.id, newRev);
    setLocalReviews(updated);

    // Non-blocking dispatch to server & admin notification
    fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: activeProduct.id,
        productName: activeProduct.name,
        author: authorClean,
        email: emailClean || undefined,
        rating: newReviewRating,
        comment: commentClean,
      }),
    }).catch((err) => console.warn('[Review Notification Notice]', err?.message));

    setNewReviewAuthor('');
    setNewReviewEmail('');
    setNewReviewRating(5);
    setNewReviewComment('');
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 4000);
  };

  const handleVoteHelpful = (revId: string) => {
    if (helpfulVoted[revId]) return;
    setHelpfulVoted((prev) => ({ ...prev, [revId]: true }));
    setLocalReviews((prev) =>
      prev.map((r) => (r.id === revId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
    );
  };

  // Get related products (same category but not current product)
  const relatedProducts = allProducts
    .filter((p) => p.categorySlug === activeProduct.categorySlug && p.id !== activeProduct.id)
    .slice(0, 4);

  // Available weight choices depending on product type
  const isFlowerOrPreRoll = activeProduct.categorySlug === 'flower' || activeProduct.categorySlug === 'pre-rolls';
  const weightOptions = isFlowerOrPreRoll
    ? ['3.5g', '7g', '14g', '28g']
    : activeProduct.weight 
      ? [activeProduct.weight] 
      : ['1 Unit'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-28 md:pb-8 text-left w-full">
      {/* Dynamic SEO Metadata & Product Schema */}
      <SEOHead selectedProduct={activeProduct} />

      {/* Breadcrumb navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <Link
          to="/products"
          className="group flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider hover:text-emerald-900 transition cursor-pointer"
        >
          <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
          <span>Back to catalog</span>
        </Link>

        <nav aria-label="Breadcrumb" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Link to="/" className="hover:text-emerald-700 cursor-pointer">Home</Link>
          <span>/</span>
          <Link to={`/category/${activeProduct.categorySlug}`} className="hover:text-emerald-700 cursor-pointer">{activeProduct.category}</Link>
          <span>/</span>
          <span className="text-gray-900 truncate max-w-[200px]">{activeProduct.name}</span>
        </nav>
      </div>

      <div className="grid lg:grid-cols-12 gap-12 items-start mb-16">
        {/* Left Column: Visual Showcase & Warnings */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative aspect-square bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm group">
            <img
              src={activeProduct.image}
              alt={`${activeProduct.name} - ${activeProduct.category} | Global Herbs Lab-Tested Dispensary`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, activeProduct.category, activeProduct.name)}
            />
            {activeProduct.onSale && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                Special Offer
              </span>
            )}
          </div>

          {/* Download COA Banner Button */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-800" size={20} />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-900">
                  Verified Lab Certificate of Analysis (COA)
                </span>
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                ISO 17025
              </span>
            </div>
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
              Official ISO 17025 accredited laboratory test results verifying potency, cannabinoid profile, terpenes, and total safety screening for heavy metals and pesticides.
            </p>
            <button
              onClick={() => setIsCoaOpen(true)}
              className="w-full mt-1 py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <FileText size={16} />
              <span>View &amp; Download Printable COA PDF</span>
            </button>
          </div>

          {/* Quick trust badges */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-3 text-center space-y-1">
              <Truck size={20} className="text-emerald-800 mx-auto" />
              <h5 className="font-bold text-[10px] uppercase text-gray-800">Discrete Delivery</h5>
              <p className="text-[9px] text-gray-500 font-medium leading-tight">Dual-sealed, odorless</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-3 text-center space-y-1">
              <Shield size={20} className="text-emerald-800 mx-auto" />
              <h5 className="font-bold text-[10px] uppercase text-gray-800">Lab Tested</h5>
              <p className="text-[9px] text-gray-500 font-medium leading-tight">100% certified organic</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-3 text-center space-y-1">
              <Sparkles size={20} className="text-emerald-800 mx-auto" />
              <h5 className="font-bold text-[10px] uppercase text-gray-800">Global stealth</h5>
              <p className="text-[9px] text-gray-500 font-medium leading-tight">Safe customs clearance</p>
            </div>
          </div>

          {/* Clinical Safety Disclaimer Box */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900">
            <AlertTriangle className="text-amber-700 flex-shrink-0 mt-0.5" size={18} />
            <div className="space-y-1 text-xs font-medium">
              <h6 className="font-bold uppercase tracking-wider text-[10px] text-amber-800">
                Safe Handling & Dosage Guidelines
              </h6>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Strictly for adults 21+ or clinical recommendation. Keep securely out of reach of children and domestic pets. Do not operate motorized machinery or drive under the active therapeutic effects. Store in a cool, airtight, dark compartment to preserve medicinal chemical profile and freshness.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata, Pricing, Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-md border border-emerald-100 uppercase tracking-widest inline-block">
                {activeProduct.category}
              </span>
              {activeProduct.brand && (
                <span className="bg-purple-50 text-purple-800 text-[10px] font-black px-3 py-1 rounded-md border border-purple-100 uppercase tracking-widest inline-block">
                  Brand: {activeProduct.brand}
                </span>
              )}
              {activeProduct.strainType && (
                <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-3 py-1 rounded-md border border-amber-100 uppercase tracking-widest inline-block">
                  {activeProduct.strainType}
                </span>
              )}
            </div>

            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-gray-900 uppercase tracking-tight leading-tight">
              {activeProduct.name}
            </h1>

            {activeProduct.potency && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-700 flex-shrink-0" />
                <span><strong className="uppercase text-[10px] text-emerald-800 tracking-wider">Potency Profile:</strong> {activeProduct.potency}</span>
              </div>
            )}

            {/* Stars & Reviews */}
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.floor(activeProduct.rating) ? "currentColor" : "none"}
                    className={i < Math.floor(activeProduct.rating) ? "text-amber-400" : "text-gray-200"}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 font-bold mt-0.5">
                {activeProduct.rating} / 5.0 Rating ({activeProduct.reviews} customer reviews)
              </span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Product pricing tags */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Selected Option Price
              </span>
              <div className="flex items-baseline gap-3">
                {activeProduct.onSale && currentOriginalPrice ? (
                  <>
                    <span className="text-3xl font-black text-rose-600">{formatPrice(currentPrice)}</span>
                    <span className="text-sm text-gray-400 line-through font-bold">{formatPrice(currentOriginalPrice)}</span>
                  </>
                ) : (
                  <span className="text-3xl font-black text-gray-900">{formatPrice(currentPrice)}</span>
                )}
              </div>
            </div>

            {activeProduct.inventory !== undefined && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Availability
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  activeProduct.inventory < 10 ? 'text-rose-600' : 'text-emerald-800'
                }`}>
                  {activeProduct.inventory > 0 ? `${activeProduct.inventory} Units In Stock` : 'Out of Stock'}
                </span>
              </div>
            )}
          </div>

          {/* Quantity and Weight Selectors */}
          <div className="space-y-4">
            {/* Weight/Size choices */}
            {weightVariants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                    Select Weight / Variant
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Selected: <span className="text-gray-900">{selectedVariant.label}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {weightVariants.map((variant) => {
                    const isSelected = selectedVariant.id === variant.id || selectedWeight === variant.shortLabel || selectedWeight === variant.id;
                    const variantPrice = calculateVariantPrice(activeProduct.price, variant);

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedWeight(variant.shortLabel)}
                        className={`relative p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-700/40'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/40'
                        }`}
                      >
                        {/* Savings or Popular Badge */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[11px] font-black uppercase tracking-tight ${
                            isSelected ? 'text-emerald-200' : 'text-emerald-800'
                          }`}>
                            {variant.shortLabel}
                          </span>
                          {variant.savings && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-amber-400 text-gray-950' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {variant.savings}
                            </span>
                          )}
                          {variant.isPopular && !variant.savings && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-emerald-700 text-white' : 'bg-amber-100 text-amber-900'
                            }`}>
                              Popular
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between pt-1 border-t border-current/10">
                          <span className="text-sm font-black">{formatPrice(variantPrice)}</span>
                          <span className={`text-[9px] truncate ml-1 opacity-80 ${
                            isSelected ? 'text-gray-200' : 'text-gray-500'
                          }`}>
                            {variant.weight}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Counter */}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Order Quantity
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 h-10 overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 hover:bg-gray-150 text-gray-500 font-bold text-sm h-full transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-xs font-bold text-gray-900 select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 hover:bg-gray-150 text-gray-500 font-bold text-sm h-full transition cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className={`flex-grow h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 duration-100 cursor-pointer ${
                    adding
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm'
                  }`}
                >
                  {adding ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Adding to cart...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={15} />
                      <span>Add To Cart – {formatPrice(currentPrice * quantity)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Wholesale B2B Volume Pricing & Sample Request Box */}
            <div className="bg-gradient-to-br from-emerald-50/60 to-gray-50 border border-emerald-100/80 rounded-xl p-3.5 space-y-2.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-emerald-700" />
                  <span>Wholesale B2B Volume Discount Tiers</span>
                </span>
                <button
                  onClick={() => {
                    setSampleRequested(true);
                    setTimeout(() => setSampleRequested(false), 4000);
                  }}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-900 underline cursor-pointer"
                >
                  {sampleRequested ? '✓ Sample Request Logged' : 'Request B2B Sample'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white border border-emerald-100 p-2 rounded-lg">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">10+ Units</span>
                  <span className="font-extrabold text-emerald-800 text-xs">10% OFF</span>
                  <span className="text-[9px] text-gray-500 block font-mono">${Math.round(currentPrice * 0.9)}/ea</span>
                </div>
                <div className="bg-white border border-emerald-100 p-2 rounded-lg">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">25+ Units</span>
                  <span className="font-extrabold text-emerald-800 text-xs">15% OFF</span>
                  <span className="text-[9px] text-gray-500 block font-mono">${Math.round(currentPrice * 0.85)}/ea</span>
                </div>
                <div className="bg-white border border-emerald-100 p-2 rounded-lg">
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">50+ Units</span>
                  <span className="font-extrabold text-emerald-800 text-xs">25% OFF</span>
                  <span className="text-[9px] text-gray-500 block font-mono">${Math.round(currentPrice * 0.75)}/ea</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-y-3 text-xs text-gray-600 font-medium">
            {activeProduct.sku && (
              <div>
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">SKU Number</span>
                <span className="font-mono text-gray-800">{activeProduct.sku}</span>
              </div>
            )}
            {activeProduct.brand && (
              <div>
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">Brand / Cultivator</span>
                <span className="text-gray-800 font-semibold">{activeProduct.brand}</span>
              </div>
            )}
            {activeProduct.subcategory && (
              <div>
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">Subcategory</span>
                <span className="text-gray-800 font-semibold">{activeProduct.subcategory}</span>
              </div>
            )}
            {activeProduct.strainType && (
              <div>
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">Strain Type</span>
                <span className="text-gray-800 font-semibold">{activeProduct.strainType}</span>
              </div>
            )}
            <div>
              <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">Shipping Method</span>
              <span className="text-gray-800">Discreet Airmail / Express Courier</span>
            </div>
            <div>
              <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">Lab Validation</span>
              <span className="text-emerald-800 font-bold">100% Certified Clean</span>
            </div>
          </div>

          {/* Secure details info */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-2.5">
            <h6 className="text-[10px] font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-700" />
              <span>Guaranteed Security & Stealth Delivery</span>
            </h6>
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
              We understand security demands. All dispensary parcels are vacuum sealed dual-layered inside heavy foil medical containers, fully odourproof, and shipped in standard generic cardboards with no mention of contents or dispensary name. Secure cryptocurrency or secure card options available.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation: Detailed info, Shipping, Reviews */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('desc')}
            className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'desc'
                ? 'border-emerald-800 text-emerald-800'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Product Description
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'shipping'
                ? 'border-emerald-800 text-emerald-800'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Stealth Shipping & Delivery
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-emerald-800 text-emerald-800'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Reviews ({localReviews.length})
          </button>
        </div>
      </div>

      {/* Tabs content render */}
      <div className="mb-16 min-h-[200px]">
        {activeTab === 'desc' && (
          <div className="space-y-6 text-gray-700 leading-relaxed max-w-4xl text-sm font-medium">
            <div className="space-y-4">
              <p>{activeProduct.description}</p>
              <p>
                Our laboratory verification certifies that this batch features clean therapeutic chemical bounds, curated and grown under organic climate-controlled environments by professional growers. Delivers quick, targeted action to soothe chronic conditions, muscle stress, inflammation, and anxiety.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wider">Suggested Dose Guidelines</h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 font-semibold">
                  <li>Begin with a microdose or light quantity to assess tolerance.</li>
                  <li>Allow 45-90 minutes before considering subsequent application.</li>
                  <li>Use specialized vaporization gear or clinical equipment if required.</li>
                  <li>In case of intense effects, drink citrus water and sit comfortably.</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wider">Storage Advice</h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 font-semibold">
                  <li>Maintain inside original airtight clinical bounds.</li>
                  <li>Keep stored between 15°C to 21°C.</li>
                  <li>Minimize exposure to ambient moisture or solar heat rays.</li>
                  <li>Airtight glass jars are highly recommended for flower preservation.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="space-y-4 text-gray-700 leading-relaxed max-w-4xl text-sm font-medium">
            <h3 className="font-heading font-bold text-gray-900 text-base uppercase tracking-wider">
              100% Guaranteed Discreet Shipping
            </h3>
            <p>
              We prioritize customer confidentiality above all else. Global Herbs Dispensary ships all packages with strict medical-grade protective protocols.
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs text-gray-600 font-semibold pl-2">
              <li>
                <span className="font-bold text-gray-900">Double Vacuum Sealing:</span> All products are heat-vacuum sealed in high-grade food-safe clinical plastic wraps, completely locking in scent and molecules.
              </li>
              <li>
                <span className="font-bold text-gray-900">Neutral Box Exterior:</span> The outside packaging consists of clean standard cardboard mailer boxes with generic address labels. Absolutely no mention of "Global Herbs Dispensary" or contents on the parcel exterior.
              </li>
              <li>
                <span className="font-bold text-gray-900">Customs Bypass Protocol:</span> We route worldwide delivery parcels through strategically designed sorting lanes to guarantee near-flawless customs pass rates.
              </li>
              <li>
                <span className="font-bold text-gray-900">Tracking Code:</span> A unique secure tracking code is sent via encrypted message as soon as dispatch completes.
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="grid md:grid-cols-12 gap-8 items-start">
            {/* Reviews list */}
            <div className="md:col-span-7 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-base text-gray-900">
                    Customer Verified Reviews
                  </span>
                  <span className="bg-emerald-100 text-emerald-850 text-xs font-black px-2 py-0.5 rounded-full">
                    {localReviews.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <Star size={14} className="text-amber-400" fill="currentColor" />
                  <span>{activeProduct.rating} out of 5</span>
                </div>
              </div>

              {localReviews.map((rev) => (
                <div key={rev.id} className="border-b border-gray-100 pb-6 last:border-0 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{rev.author}</span>
                        {rev.location && (
                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                            <MapPin size={10} />
                            {rev.location}
                          </span>
                        )}
                        {rev.verified && (
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{rev.date}</span>
                    </div>

                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          fill={i < rev.rating ? "currentColor" : "none"}
                          className={i < rev.rating ? "text-amber-400" : "text-gray-200"}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.title && (
                    <h5 className="font-bold text-xs text-gray-900">
                      "{rev.title}"
                    </h5>
                  )}

                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    {rev.comment}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="text-[10px]">Purchased directly from Global Herbs</span>
                    <button
                      onClick={() => handleVoteHelpful(rev.id)}
                      disabled={helpfulVoted[rev.id]}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                        helpfulVoted[rev.id]
                          ? 'bg-emerald-50 text-emerald-800 cursor-default'
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <ThumbsUp size={11} />
                      <span>{helpfulVoted[rev.id] ? 'Helpful ✓' : 'Helpful'} ({rev.helpfulCount})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Write a review form */}
            <div className="md:col-span-5 bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h4 className="font-heading font-bold text-gray-900 text-sm uppercase tracking-wider mb-4">
                Write a customer review
              </h4>

              {reviewSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-xl p-4 text-center space-y-1">
                  <CheckCircle2 className="text-emerald-700 mx-auto" size={24} />
                  <h5 className="font-bold text-xs uppercase">Review Submitted!</h5>
                  <p className="text-[10px] font-semibold text-gray-500">
                    Thank you! Your feedback helps other dispensary patients make safe informed choices.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddReview} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      placeholder="e.g. David Thompson"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-emerald-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Your Email (Optional, for admin follow-up)
                    </label>
                    <input
                      type="email"
                      value={newReviewEmail}
                      onChange={(e) => setNewReviewEmail(e.target.value)}
                      placeholder="e.g. david@example.com"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-emerald-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Product Rating
                    </label>
                    <div className="flex gap-1 text-gray-200">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewReviewRating(i + 1)}
                          className="hover:scale-110 transition cursor-pointer text-amber-400"
                        >
                          <Star
                            size={18}
                            fill={i < newReviewRating ? "currentColor" : "none"}
                            className={i < newReviewRating ? "text-amber-400" : "text-gray-200"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Detailed Feedback Comment
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="Describe your therapeutic or recreational experience with this product..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-emerald-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-10 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition active:scale-95 duration-100 cursor-pointer"
                  >
                    Submit Clinical Review
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Related Products Catalog Section */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-100 pt-12">
          <h3 className="font-heading font-black text-gray-900 text-lg uppercase tracking-tight text-left mb-6">
            Recommended Related Products
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  if (onSelectProduct) onSelectProduct(p);
                  navigate(`/products/${p.slug}`);
                }}
                className="group border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition duration-300 cursor-pointer flex flex-col h-full text-left"
              >
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImageError(e, p.category, p.name)}
                  />
                </div>
                <div className="p-3.5 flex flex-col flex-grow">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                    {p.category}
                  </span>
                  <h4 className="font-heading font-bold text-xs text-gray-900 leading-snug line-clamp-2 h-8 mb-2 group-hover:text-emerald-800 transition">
                    {p.name}
                  </h4>
                  <div className="flex justify-between items-baseline mt-auto">
                    <span className="text-sm font-extrabold text-gray-900">{formatPrice(p.price)}</span>
                    {p.weight && (
                      <span className="text-[9px] font-bold text-gray-400">{p.weight}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable COA Modal with Official Global Herbs Logo */}
      <COAModal
        isOpen={isCoaOpen}
        onClose={() => setIsCoaOpen(false)}
        product={activeProduct}
      />

      {/* Mobile Sticky Add-to-Cart Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-lg flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-gray-900 truncate max-w-[150px] sm:max-w-[200px]">
            {activeProduct.name}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold text-emerald-800">
              {formatPrice(currentPrice)}
            </span>
            {selectedWeight && (
              <span className="text-[10px] text-gray-500 font-medium">
                ({selectedWeight})
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="flex-1 max-w-[180px] py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <ShoppingCart size={15} />
          <span>{adding ? t('btn.adding', 'Adding...') : t('btn.addToCart', 'Add to Cart')}</span>
        </button>
      </div>
    </div>
  );
}
