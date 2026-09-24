import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, ShieldCheck, FileText, CheckCircle2, Truck, Sparkles, AlertCircle, Phone } from 'lucide-react';
import { Product } from '../types';
import { handleImageError } from '../utils/imageUtils';
import { getProductWeightVariants, calculateVariantPrice, findVariantByLabel } from '../utils/weightVariants';
import COAModal from './COAModal';
import { analytics } from '../utils/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (productId: number, selectedWeight?: string, quantity?: number, unitPrice?: number) => Promise<void>;
  onNavigateToDetail?: (product: Product) => void;
}

export default function QuickViewModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  onNavigateToDetail,
}: QuickViewModalProps) {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  if (!isOpen || !product) return null;

  const weightVariants = getProductWeightVariants(product);
  const [selectedWeight, setSelectedWeight] = useState<string>(
    product.weight || weightVariants[0]?.shortLabel || 'Default'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [adding, setAdding] = useState<boolean>(false);
  const [isCoaOpen, setIsCoaOpen] = useState<boolean>(false);
  const [sampleRequested, setSampleRequested] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      const vars = getProductWeightVariants(product);
      setSelectedWeight(product.weight || vars[0]?.shortLabel || 'Default');
    }
  }, [product]);

  const selectedVariant = findVariantByLabel(weightVariants, selectedWeight);
  const currentPrice = calculateVariantPrice(product.price, selectedVariant);

  const handleAdd = async () => {
    setAdding(true);
    analytics.addToCart(
      {
        id: product.id,
        name: product.name,
        category: product.category,
        price: currentPrice,
      },
      quantity,
      selectedVariant.shortLabel
    );

    await onAddToCart(product.id, selectedVariant.shortLabel, quantity, currentPrice);
    setAdding(false);
  };

  const handleRequestSample = () => {
    setSampleRequested(true);
    setTimeout(() => setSampleRequested(false), 4000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 my-auto text-left">
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-900 bg-white/80 hover:bg-white rounded-full transition shadow-xs cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          <div className="grid md:grid-cols-12 gap-6 p-6 sm:p-8">
            {/* Image Column */}
            <div className="md:col-span-5 space-y-4">
              <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, product.category, product.name)}
                />
                {product.onSale && (
                  <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Sale Offer
                  </span>
                )}
              </div>

              {/* COA Download Trigger Button */}
              <button
                onClick={() => setIsCoaOpen(true)}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ShieldCheck size={16} className="text-emerald-700" />
                <span>View / Download Lab COA PDF</span>
              </button>
            </div>

            {/* Details Column */}
            <div className="md:col-span-7 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">
                    {product.category}
                  </span>
                  {product.strainType && (
                    <span className="bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                      {product.strainType}
                    </span>
                  )}
                </div>

                <h2 className="font-heading font-bold text-xl text-gray-900 leading-tight mb-2">
                  {product.name}
                </h2>

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-2xl font-black text-gray-900">{formatPrice(currentPrice)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-400 line-through font-bold">
                      {formatPrice(calculateVariantPrice(product.originalPrice, selectedVariant))}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded uppercase">
                    In Stock
                  </span>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">
                  {product.description}
                </p>

                {/* Weight selector */}
                {weightVariants.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Select Variant / Weight
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800">
                        {selectedVariant.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {weightVariants.map((variant) => {
                        const isSelected = selectedVariant.id === variant.id || selectedWeight === variant.shortLabel;
                        const vPrice = calculateVariantPrice(product.price, variant);

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedWeight(variant.shortLabel)}
                            className={`p-2 text-left rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-[10px] font-bold leading-tight block truncate">
                              {variant.shortLabel}
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[11px] font-black">{formatPrice(vPrice)}</span>
                              {variant.savings && (
                                <span className={`text-[8px] font-bold px-1 rounded ${
                                  isSelected ? 'bg-amber-400 text-gray-900' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {variant.savings}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 h-10 overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 hover:bg-gray-150 text-gray-500 font-bold text-sm h-full cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-gray-900 select-none">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 hover:bg-gray-150 text-gray-500 font-bold text-sm h-full cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex-1 h-10 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    {adding ? (
                      <span>{t('btn.adding', 'Adding to cart...')}</span>
                    ) : (
                      <>
                        <ShoppingCart size={15} />
                        <span>{t('btn.addToCart', 'Add To Cart')} ({formatPrice(currentPrice * quantity)})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Secondary buttons */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={handleRequestSample}
                    className="text-emerald-800 hover:text-emerald-900 font-bold text-[11px] underline cursor-pointer"
                  >
                    {sampleRequested ? '✓ Sample Request Received!' : 'Request B2B Sample Unit'}
                  </button>

                  {onNavigateToDetail && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToDetail(product);
                      }}
                      className="text-gray-500 hover:text-gray-800 font-semibold text-[11px] cursor-pointer"
                    >
                      Full Details Page →
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* COA Printable Modal */}
      <COAModal
        isOpen={isCoaOpen}
        onClose={() => setIsCoaOpen(false)}
        product={product}
      />
    </>
  );
}
