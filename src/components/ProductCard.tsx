import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Info, Eye } from 'lucide-react';
import { Product } from '../types';
import { handleImageError } from '../utils/imageUtils';
import QuickViewModal from './QuickViewModal';
import { analytics } from '../utils/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface ProductCardProps {
  key?: number;
  product: Product;
  onAddToCart: (productId: number, selectedWeight?: string, quantity?: number, unitPrice?: number) => Promise<void>;
  onSelectProduct?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onSelectProduct }: ProductCardProps) {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const navigate = useNavigate();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    const defaultWeight = product.weight || product.weights?.[0] || 'Default';

    analytics.addToCart(
      {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
      },
      1,
      defaultWeight
    );

    await onAddToCart(product.id, defaultWeight, 1, product.price);
    setLoading(false);
  };

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    navigate(`/products/${product.slug}`);
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full cursor-pointer"
      >
        {/* Badges Overlay */}
        {product.onSale && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Save
            </span>
          </div>
        )}

        {/* Image Container with Hover Effects */}
        <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden">
          <Link
            to={`/products/${product.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="block w-full h-full"
          >
            <img
              src={product.image}
              alt={`${product.name} - ${product.category} | Global Herbs Online Dispensary`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, product.category, product.name)}
            />
          </Link>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickViewOpen(true);
              }}
              className="p-2.5 bg-white text-gray-900 rounded-full hover:bg-emerald-50 hover:text-emerald-800 transition shadow-md transform translate-y-2 group-hover:translate-y-0 duration-300 cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3.5"
              title="Quick View"
            >
              <Eye size={15} />
              <span>Quick View</span>
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-3 sm:p-4 flex flex-col flex-grow text-left">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
              {product.brand ? `${product.brand}` : product.category}
            </span>
            <div className="flex items-center gap-1">
              {product.strainType && (
                <span className="bg-amber-50 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-amber-100">
                  {product.strainType}
                </span>
              )}
              {product.weightVariants && product.weightVariants.length > 1 ? (
                <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                  {product.weightVariants[0].shortLabel} – {product.weightVariants[product.weightVariants.length - 1].shortLabel}
                </span>
              ) : product.weight ? (
                <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                  {product.weight}
                </span>
              ) : null}
            </div>
          </div>
          
          <h3 className="font-heading font-bold text-sm text-gray-900 leading-snug group-hover:text-emerald-850 transition line-clamp-2 mb-2 h-10">
            <Link
              to={`/products/${product.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-emerald-800 transition"
            >
              {product.name}
            </Link>
          </h3>

          {/* Prices & Action Button wrapper */}
          <div className="mt-auto space-y-3">
            <div className="flex items-baseline gap-2">
              {product.onSale && product.originalPrice ? (
                <>
                  <span className="text-base font-bold text-red-600">{formatPrice(product.price)}</span>
                  <span className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                </>
              ) : (
                <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={loading}
              className={`w-full py-2.5 px-3 sm:px-4 rounded-lg font-bold text-[11px] uppercase tracking-wider border flex items-center justify-center gap-1.5 transition active:scale-95 duration-100 cursor-pointer min-h-[44px] ${
                loading
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-transparent text-emerald-800 border-emerald-800 hover:bg-emerald-800 hover:text-white'
              }`}
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('btn.adding', 'Adding...')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={13} />
                  <span>{t('btn.addToCart', 'Add To Cart')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={product}
        onAddToCart={onAddToCart}
        onNavigateToDetail={(p) => {
          if (onSelectProduct) onSelectProduct(p);
          navigate(`/products/${p.slug}`);
        }}
      />
    </>
  );
}
