import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ShoppingCart, ArrowLeft, Shield, Sparkles, CheckCircle2, Truck, HelpCircle, MessageSquare, AlertTriangle, Users, ShieldCheck, FileText, Download, Package, Flame, Zap, ThumbsUp, MapPin, Camera, UploadCloud, X, ChevronDown, Check, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Product, WeightVariant } from '../types';
import { handleImageError } from '../utils/imageUtils';
import { products as allProducts } from '../data/products';
import { getProductWeightVariants, calculateVariantPrice, findVariantByLabel } from '../utils/weightVariants';
import {
  getProductReviews,
  saveProductReview,
  fetchProductReviews,
  submitProductReview,
  voteReviewHelpful,
  ProductReview,
  ProductRatingSummary,
  getFallbackRatingSummary,
} from '../utils/productReviews';
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
  const { formatPrice, formatBaseUsd, isBaseCurrency, currency } = useCurrency();
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
  
  // Customer reviews & ratings
  const [localReviews, setLocalReviews] = useState<ProductReview[]>(() => getProductReviews(activeProduct));
  const [ratingSummary, setRatingSummary] = useState<ProductRatingSummary>(() =>
    getFallbackRatingSummary(activeProduct.id, getProductReviews(activeProduct))
  );
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  const [isWritingReview, setIsWritingReview] = useState<boolean>(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewEmail, setNewReviewEmail] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewImage, setNewReviewImage] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});
  const [visibleReviewCount, setVisibleReviewCount] = useState<number>(5);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Scroll to top when product changes & synchronize distinct reviews
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activeProduct) {
      const vars = getProductWeightVariants(activeProduct);
      setSelectedWeight(activeProduct.weight || vars[0]?.shortLabel || 'Default');
      setLocalReviews(getProductReviews(activeProduct));
      setRatingSummary(getFallbackRatingSummary(activeProduct.id, getProductReviews(activeProduct)));
      setReviewSubmitted(false);
      setReviewError(null);
      setIsWritingReview(false);
      setVisibleReviewCount(5);

      // Asynchronously fetch remote approved reviews and dynamic summary from backend
      setIsLoadingReviews(true);
      fetchProductReviews(activeProduct.id)
        .then((res) => {
          if (res) {
            setLocalReviews(res.reviews);
            setRatingSummary(res.summary);
          }
        })
        .finally(() => {
          setIsLoadingReviews(false);
        });

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

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const authorClean = newReviewAuthor.trim();
    const commentClean = newReviewComment.trim();
    const emailClean = newReviewEmail.trim();

    if (authorClean.length < 2) {
      setReviewError('Customer display name must be at least 2 characters.');
      return;
    }
    if (commentClean.length < 10) {
      setReviewError('Review comment must be at least 10 characters.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    const result = await submitProductReview({
      productId: activeProduct.id,
      productName: activeProduct.name,
      productSlug: activeProduct.slug,
      author: authorClean,
      email: emailClean || undefined,
      rating: newReviewRating,
      title: newReviewTitle.trim() || undefined,
      comment: commentClean,
      imageUrl: newReviewImage || undefined,
    });

    setIsSubmittingReview(false);

    if (result.success) {
      setNewReviewAuthor('');
      setNewReviewEmail('');
      setNewReviewRating(5);
      setNewReviewTitle('');
      setNewReviewComment('');
      setNewReviewImage(null);
      setReviewSubmitted(true);
      setIsWritingReview(false);
      setTimeout(() => setReviewSubmitted(false), 8000);
    } else {
      setReviewError(result.error || 'Failed to submit review.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size must be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewReviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVoteHelpful = async (revId: string) => {
    if (helpfulVoted[revId]) return;
    setHelpfulVoted((prev) => ({ ...prev, [revId]: true }));
    setLocalReviews((prev) =>
      prev.map((r) => (r.id === revId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r))
    );
    await voteReviewHelpful(revId);
  };

  const handleRequestB2BSample = async () => {
    if (sampleRequested) return;
    setSampleRequested(true);
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newReviewAuthor.trim() || 'B2B Wholesale Prospect',
          email: newReviewEmail.trim() || 'wholesale-inquiry@globalherbs.site',
          subject: `B2B Sample Request: ${activeProduct.name} (${selectedVariant.shortLabel})`,
          productReference: `${activeProduct.name} (ID: ${activeProduct.id}, SKU: ${activeProduct.sku || 'N/A'})`,
          message: `A customer/prospect requested a B2B wholesale sample evaluation for:\nProduct: ${activeProduct.name}\nSelected Weight/Option: ${selectedVariant.shortLabel}\nUnit Price: $${currentPrice.toFixed(2)}\nCategory: ${activeProduct.category}`,
          type: 'sample_request',
        }),
      });
    } catch (err: any) {
      console.warn('[B2B Sample Notification Notice]', err?.message);
    }
    setTimeout(() => setSampleRequested(false), 5000);
  };

  // Get related products using circular ring selection so all products in a category receive equal internal links
  const sameCategoryPool = allProducts.filter(
    (p) => p.categorySlug === activeProduct.categorySlug && p.categorySlug !== 'pharmaceuticals' && p.categorySlug !== 'psychedelics' && p.categorySlug !== 'research-chemicals'
  );
  const currentInCatIdx = sameCategoryPool.findIndex((p) => p.id === activeProduct.id);
  const relatedProducts: Product[] = [];
  if (sameCategoryPool.length > 1) {
    for (let offset = 1; offset <= Math.min(8, sameCategoryPool.length - 1); offset++) {
      const nextIdx = ((currentInCatIdx >= 0 ? currentInCatIdx : 0) + offset) % sameCategoryPool.length;
      const candidate = sameCategoryPool[nextIdx];
      if (candidate && candidate.id !== activeProduct.id) {
        relatedProducts.push(candidate);
      }
    }
  }

  // Available weight choices depending on product type
  const isFlowerOrPreRoll = activeProduct.categorySlug === 'flower' || activeProduct.categorySlug === 'pre-rolls';
  const weightOptions = isFlowerOrPreRoll
    ? ['3.5g', '7g', '14g', '28g']
    : activeProduct.weight 
      ? [activeProduct.weight] 
      : ['1 Unit'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-28 md:pb-8 text-left w-full">
      {/* Dynamic SEO Metadata & Product Schema with AggregateRating */}
      <SEOHead
        selectedProduct={activeProduct}
        ratingSummary={ratingSummary}
        approvedReviews={localReviews}
      />

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

            <h1 className="notranslate font-heading font-bold text-2xl sm:text-3xl text-gray-900 uppercase tracking-tight leading-tight" translate="no">
              {activeProduct.name}
            </h1>

            {/* Star Rating Overview near Title */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.round(ratingSummary.averageRating) ? 'currentColor' : 'none'}
                    className={i < Math.round(ratingSummary.averageRating) ? 'text-amber-400' : 'text-gray-200'}
                  />
                ))}
              </div>
              {ratingSummary.ratingCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reviews');
                    document.getElementById('product-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-gray-700 hover:text-emerald-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span className="font-extrabold text-gray-900">{ratingSummary.averageRating.toFixed(1)}</span>
                  <span className="text-gray-500 font-medium">
                    ({ratingSummary.ratingCount} {ratingSummary.ratingCount === 1 ? 'customer review' : 'customer reviews'})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reviews');
                    setIsWritingReview(true);
                    document.getElementById('product-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs text-emerald-800 hover:underline font-semibold cursor-pointer"
                >
                  No reviews yet • Be the first to review
                </button>
              )}
            </div>

            {activeProduct.potency && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-700 flex-shrink-0" />
                <span><strong className="uppercase text-[10px] text-emerald-800 tracking-wider">Potency Profile:</strong> {activeProduct.potency}</span>
              </div>
            )}

          </div>

          <hr className="border-gray-100" />

          {/* Product pricing tags */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
            <div translate="no">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Price (USD)
              </span>
              <div className="flex items-baseline gap-2.5">
                {activeProduct.onSale && currentOriginalPrice ? (
                  <>
                    <span className="notranslate text-3xl font-black text-rose-600 tabular-nums">
                      {formatPrice(currentPrice)}
                    </span>
                    <span className="notranslate text-sm text-gray-400 line-through font-bold tabular-nums">
                      {formatPrice(currentOriginalPrice)}
                    </span>
                  </>
                ) : (
                  <span className="notranslate text-3xl font-black text-gray-900 tabular-nums">
                    {formatPrice(currentPrice)}
                  </span>
                )}
                <span className="notranslate text-xs font-bold text-gray-500">
                  USD
                </span>
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
                  type="button"
                  onClick={handleRequestB2BSample}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-900 underline cursor-pointer"
                >
                  {sampleRequested ? '✓ Sample Request Dispatched' : 'Request B2B Sample'}
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
      <div id="product-tabs-section" className="border-b border-gray-200 mb-8">
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
            Reviews ({ratingSummary.ratingCount > 0 ? ratingSummary.ratingCount : localReviews.length})
          </button>
        </div>
      </div>

      {/* Tabs content render */}
      <div className="mb-16 min-h-[200px]">
        {activeTab === 'desc' && (
          <div className="space-y-6 text-gray-700 leading-relaxed max-w-4xl text-sm font-medium">
            <div className="space-y-4">
              <h2 className="font-heading font-bold text-gray-900 text-base uppercase tracking-wider">
                About {activeProduct.name}
              </h2>
              <p>{activeProduct.description}</p>
            </div>

            {(activeProduct.genetics || activeProduct.aroma || activeProduct.effects || (activeProduct.terpenes && activeProduct.terpenes.length > 0)) && (
              <div className="bg-emerald-50/40 rounded-xl p-5 border border-emerald-100 space-y-4">
                <h3 className="font-heading font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Botanical Lineage, Terpene Profile &amp; Lab Specifications
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  {activeProduct.genetics && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-0.5">Genetic Lineage</span>
                      <span className="text-gray-900 font-semibold">{activeProduct.genetics}</span>
                    </div>
                  )}
                  {activeProduct.aroma && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-0.5">Aroma &amp; Flavor Notes</span>
                      <span className="text-gray-900 font-semibold">{activeProduct.aroma}</span>
                    </div>
                  )}
                  {activeProduct.effects && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-0.5">Reported Experience</span>
                      <span className="text-gray-900 font-semibold">{activeProduct.effects}</span>
                    </div>
                  )}
                  {activeProduct.terpenes && activeProduct.terpenes.length > 0 && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-0.5">Dominant Terpenes</span>
                      <span className="text-gray-900 font-semibold">{activeProduct.terpenes.join(', ')}</span>
                    </div>
                  )}
                  {activeProduct.labResults && (
                    <div className="sm:col-span-2 pt-2 border-t border-emerald-100 flex flex-wrap gap-6">
                      <div>
                        <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">THCa / Primary Potency</span>
                        <span className="text-emerald-900 font-extrabold">{activeProduct.labResults.thca}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">Delta-9 THC (Dry Weight)</span>
                        <span className="text-emerald-900 font-extrabold">{activeProduct.labResults.d9thc}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">Total Cannabinoids</span>
                        <span className="text-emerald-900 font-extrabold">{activeProduct.labResults.totalCannabinoids}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">Full-Panel Screening</span>
                        <span className="text-emerald-800 font-bold">{activeProduct.labResults.status}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 pt-2">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wider">Usage &amp; Serving Guidance</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 font-semibold">
                  <li>Begin with a modest initial serving to evaluate cultivar response.</li>
                  <li>For edibles and tinctures, allow 45–90 minutes before taking an additional serving.</li>
                  <li>For concentrates and vapes, use low-temperature settings (2.2V–2.6V or 480°F–520°F) to preserve terpenes.</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wider">Terpene &amp; Freshness Preservation</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 font-semibold">
                  <li>Store sealed in an airtight UV-resistant glass jar or original barrier pouch.</li>
                  <li>Maintain ambient temperatures between 58°F and 68°F (15°C–20°C).</li>
                  <li>Avoid direct sunlight, heat sources, and excess humidity fluctuations.</li>
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
          <div className="space-y-8 text-left">
            {/* Rating Breakdown & Overview Header */}
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-gray-50 border border-emerald-100/80 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="grid md:grid-cols-12 gap-8 items-center">
                {/* Left: Overall Score */}
                <div className="md:col-span-4 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-emerald-100/70 pb-6 md:pb-0 md:pr-8">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Overall Customer Rating
                  </span>
                  <div className="flex items-baseline justify-center md:justify-start gap-2">
                    <span className="text-4xl sm:text-5xl font-black font-heading text-gray-900 tracking-tight">
                      {ratingSummary.ratingValue > 0 ? ratingSummary.ratingValue.toFixed(1) : '—'}
                    </span>
                    <span className="text-sm font-bold text-gray-400">/ 5.0</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        fill={i < Math.round(ratingSummary.ratingValue || 0) ? 'currentColor' : 'none'}
                        className={i < Math.round(ratingSummary.ratingValue || 0) ? 'text-amber-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 font-medium pt-1">
                    {ratingSummary.ratingCount > 0 ? (
                      <>
                        Based on{' '}
                        <span className="font-bold text-gray-800">{ratingSummary.ratingCount}</span> verified{' '}
                        {ratingSummary.ratingCount === 1 ? 'customer review' : 'customer reviews'}
                      </>
                    ) : (
                      'No published reviews yet. Be the first to share your experience!'
                    )}
                  </p>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setIsWritingReview((prev) => !prev)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition active:scale-98 shadow-sm cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>{isWritingReview ? 'Close Review Form' : 'Write a Review'}</span>
                    </button>
                  </div>
                </div>

                {/* Right: Rating Distribution Bars (5★ to 1★) */}
                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center justify-between pb-1 text-xs">
                    <span className="font-bold text-gray-700">Rating Breakdown</span>
                    <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                      <ShieldCheck size={13} className="text-emerald-700" />
                      100% Authentic Customer Feedback
                    </span>
                  </div>

                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingSummary.ratingDistribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
                    const percent =
                      ratingSummary.ratingCount > 0
                        ? Math.round((count / ratingSummary.ratingCount) * 100)
                        : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-12 text-gray-600 font-bold flex items-center gap-1">
                          <span>{stars}</span>
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                        </span>
                        <div className="flex-1 bg-gray-200/80 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] text-gray-500 font-semibold">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Expandable Review Submission Form */}
            {isWritingReview && (
              <div className="bg-white border-2 border-emerald-800/20 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-heading font-black text-gray-900 text-base uppercase tracking-tight flex items-center gap-2">
                      <MessageSquare className="text-emerald-700" size={18} />
                      Write a Customer Review
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Share your genuine feedback on {activeProduct.name}. Reviews are screened to ensure authentic dispensary experiences.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWritingReview(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
                    title="Close review form"
                  >
                    <X size={18} />
                  </button>
                </div>

                {reviewSubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-6 text-center space-y-2">
                    <CheckCircle2 className="text-emerald-700 mx-auto" size={32} />
                    <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-emerald-900">
                      Thank You! Review Received
                    </h4>
                    <p className="text-xs text-emerald-800 font-medium max-w-md mx-auto">
                      Thank you for sharing your experience with Global Herbs. Your review has been submitted for moderation and will appear after verification.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleAddReview} className="space-y-5">
                    {reviewError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0 text-red-600" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                          Your Display Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newReviewAuthor}
                          onChange={(e) => setNewReviewAuthor(e.target.value)}
                          placeholder="e.g. David T."
                          className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-emerald-800 focus:border-emerald-800 transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                          Order Email <span className="text-[10px] text-gray-400 font-normal lowercase">(for verified buyer badge)</span>
                        </label>
                        <input
                          type="email"
                          value={newReviewEmail}
                          onChange={(e) => setNewReviewEmail(e.target.value)}
                          placeholder="e.g. david@example.com"
                          className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-emerald-800 focus:border-emerald-800 transition"
                        />
                        <span className="text-[10px] text-gray-400 block">
                          Never published or displayed publicly. Used solely to match your order.
                        </span>
                      </div>
                    </div>

                    {/* Star Rating Picker */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                        Rating <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 text-gray-200">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReviewRating(star)}
                              className="p-1 hover:scale-115 transition cursor-pointer text-amber-400 focus:outline-none"
                              title={`${star} Star${star > 1 ? 's' : ''}`}
                            >
                              <Star
                                size={24}
                                fill={star <= newReviewRating ? 'currentColor' : 'none'}
                                className={star <= newReviewRating ? 'text-amber-400' : 'text-gray-300'}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                          {newReviewRating === 5 && '5 - Excellent, highly recommended'}
                          {newReviewRating === 4 && '4 - Very Good, satisfied'}
                          {newReviewRating === 3 && '3 - Good, average'}
                          {newReviewRating === 2 && '2 - Fair, could be improved'}
                          {newReviewRating === 1 && '1 - Poor, unsatisfied'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                        Review Title <span className="text-[10px] text-gray-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={newReviewTitle}
                        onChange={(e) => setNewReviewTitle(e.target.value)}
                        placeholder="e.g. Exceptional terpene profile and flawless packaging"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-emerald-800 focus:border-emerald-800 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                          Review Comments <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {newReviewComment.length} / 1000
                        </span>
                      </div>
                      <textarea
                        required
                        rows={4}
                        maxLength={1000}
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="Describe your experience with the aroma, potency, flavour, effects, and delivery..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-emerald-800 focus:border-emerald-800 transition"
                      />
                    </div>

                    {/* Optional Photo Upload */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block flex items-center gap-1.5">
                        <Camera size={13} className="text-gray-500" />
                        <span>Product Photograph (Optional)</span>
                      </label>

                      {newReviewImage ? (
                        <div className="relative inline-block border-2 border-emerald-600 rounded-xl overflow-hidden p-1 bg-white">
                          <img
                            src={newReviewImage}
                            alt="Uploaded preview"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setNewReviewImage(null)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-gray-300 hover:border-emerald-600 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-gray-50/60 hover:bg-emerald-50/30 transition text-center">
                          <UploadCloud size={20} className="text-gray-400" />
                          <span className="text-xs font-bold text-gray-700">Click or drag a photo here</span>
                          <span className="text-[10px] text-gray-400">JPEG, PNG or WEBP (Max 3MB)</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="flex-1 sm:flex-none sm:min-w-[200px] h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition active:scale-98 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingReview ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting Review...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Submit Review</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWritingReview(false)}
                        className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Approved Reviews List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-gray-900 text-sm uppercase tracking-wider">
                    Published Reviews
                  </h3>
                  <span className="bg-emerald-100 text-emerald-850 text-xs font-black px-2 py-0.5 rounded-full">
                    {localReviews.length}
                  </span>
                </div>
                {isLoadingReviews && (
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                    Syncing...
                  </span>
                )}
              </div>

              {localReviews.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                  <MessageSquare className="mx-auto text-gray-300" size={32} />
                  <p className="text-xs font-bold text-gray-700">No published reviews yet.</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Be the first customer to share your thoughts on {activeProduct.name}.
                  </p>
                  {!isWritingReview && (
                    <button
                      type="button"
                      onClick={() => setIsWritingReview(true)}
                      className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-900 transition"
                    >
                      Write First Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {localReviews.slice(0, visibleReviewCount).map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs hover:border-emerald-200 transition"
                    >
                      {/* Top Header: Author, Verified Badge, Rating, Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-heading font-bold text-sm text-gray-900">
                            {rev.author}
                          </span>
                          {rev.verified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-850 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                              <ShieldCheck size={11} className="text-emerald-700" />
                              Verified Buyer
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              Community Review
                            </span>
                          )}
                          {rev.location && (
                            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-0.5">
                              <MapPin size={11} />
                              {rev.location}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={i < rev.rating ? 'currentColor' : 'none'}
                                className={i < rev.rating ? 'text-amber-400' : 'text-gray-200'}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {rev.date}
                          </span>
                        </div>
                      </div>

                      {/* Title if present */}
                      {rev.title && (
                        <h4 className="font-heading font-bold text-xs sm:text-sm text-gray-900">
                          "{rev.title}"
                        </h4>
                      )}

                      {/* Comment body */}
                      <p className="text-xs text-gray-700 font-medium leading-relaxed">
                        {rev.comment}
                      </p>

                      {/* Customer uploaded photo thumbnail */}
                      {rev.imageUrl && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(rev.imageUrl || null)}
                            className="group relative inline-block rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-600 transition shadow-xs cursor-pointer"
                          >
                            <img
                              src={rev.imageUrl}
                              alt={`Customer photo from ${rev.author}`}
                              className="w-20 h-20 object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <ImageIcon size={16} />
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Official Admin Response Card */}
                      {rev.adminResponse && (
                        <div className="bg-emerald-50/70 border-l-4 border-emerald-800 rounded-r-xl p-4 mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <Shield size={12} className="text-emerald-700" />
                              Official Global Herbs Response ({rev.adminResponse.author || 'Dispensary Dispatch'})
                            </span>
                            <span className="text-gray-400 text-[10px]">{rev.adminResponse.date}</span>
                          </div>
                          <p className="text-xs text-emerald-950 font-medium leading-relaxed italic">
                            "{rev.adminResponse.message}"
                          </p>
                        </div>
                      )}

                      {/* Footer: Helpful voting */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="text-[10px]">
                          Was this review helpful to you?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleVoteHelpful(rev.id)}
                          disabled={helpfulVoted[rev.id]}
                          className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            helpfulVoted[rev.id]
                              ? 'bg-emerald-50 text-emerald-800 cursor-default'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <ThumbsUp size={12} />
                          <span>{helpfulVoted[rev.id] ? 'Helpful ✓' : 'Helpful'}</span>
                          <span className="font-mono text-gray-400">({rev.helpfulCount || 0})</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Load more reviews button */}
                  {localReviews.length > visibleReviewCount && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setVisibleReviewCount((prev) => prev + 5)}
                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                      >
                        Load More Reviews ({localReviews.length - visibleReviewCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Photo Lightbox Modal */}
            {previewPhoto && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setPreviewPhoto(null)}
              >
                <div
                  className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(null)}
                    className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/90 text-white rounded-full p-2 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                  <img
                    src={previewPhoto}
                    alt="Customer review photograph enlarged"
                    className="max-h-[80vh] w-auto object-contain rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related Products Catalog Section */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-100 pt-12">
          <h2 className="font-heading font-black text-gray-900 text-lg uppercase tracking-tight text-left mb-6">
            Recommended Related Products
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.slug || p.id}`}
                onClick={() => {
                  if (onSelectProduct) onSelectProduct(p);
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
                  <h3 className="font-heading font-bold text-xs text-gray-900 leading-snug line-clamp-2 h-8 mb-2 group-hover:text-emerald-800 transition">
                    {p.name}
                  </h3>
                  <div className="flex justify-between items-baseline mt-auto">
                    <span className="text-sm font-extrabold text-gray-900">{formatPrice(p.price)}</span>
                    {p.weight && (
                      <span className="text-[9px] font-bold text-gray-400">{p.weight}</span>
                    )}
                  </div>
                </div>
              </Link>
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
