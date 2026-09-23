import React, { useState, useEffect } from 'react';
import { ChevronRight, Sliders, RefreshCw, Layers } from 'lucide-react';
import { Category } from '../types';

interface SidebarProps {
  categories: Category[];
  activeCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
  onPriceFilter: (min: number, max: number) => void;
  minPrice: number;
  maxPrice: number;
}

export default function Sidebar({
  categories,
  activeCategory,
  onSelectCategory,
  onPriceFilter,
  minPrice,
  maxPrice,
}: SidebarProps) {
  // Local state for pricing fields
  const [minInput, setMinInput] = useState(minPrice.toString());
  const [maxInput, setMaxInput] = useState(maxPrice.toString());

  // Expand state for subcategories
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMinInput(minPrice.toString());
    setMaxInput(maxPrice.toString());
  }, [minPrice, maxPrice]);

  const toggleExpand = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCats((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = parseFloat(minInput) || 0;
    const maxVal = parseFloat(maxInput) || 17400;
    onPriceFilter(minVal, maxVal);
  };

  const resetAllFilters = () => {
    setMinInput('0');
    setMaxInput('17400');
    onPriceFilter(0, 17400);
    onSelectCategory?.(null);
  };

  return (
    <aside className="w-full bg-white border border-gray-100 p-6 rounded-xl shadow-xs space-y-8" aria-label="Catalog Filters">
      {/* Reset Header */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-gray-900 flex items-center gap-2">
          <Sliders size={15} className="text-emerald-700" />
          <span>Filters</span>
        </h3>
        <button
          onClick={resetAllFilters}
          className="text-[10px] uppercase font-bold tracking-wider text-gray-500 hover:text-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw size={10} />
          <span>Reset All</span>
        </button>
      </div>

      {/* Categories Widget */}
      <div>
        <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-gray-800 mb-4 flex items-center gap-2">
          <Layers size={13} className="text-emerald-700" />
          <span>Browse Categories</span>
        </h4>
        <ul className="space-y-1.5 text-xs font-semibold">
          <li>
            <button
              onClick={() => onSelectCategory?.(null)}
              className={`w-full text-left py-2 px-3 rounded-lg flex justify-between items-center transition ${
                activeCategory === null
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>Shop All Products</span>
            </button>
          </li>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.slug;
            const hasSub = cat.subcategories && cat.subcategories.length > 0;
            const isExpanded = !!expandedCats[cat.slug];

            return (
              <li key={cat.slug} className="space-y-1">
                <div
                  onClick={() => onSelectCategory?.(cat.slug)}
                  className={`w-full text-left py-2 px-3 rounded-lg flex justify-between items-center transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-medium">({cat.count})</span>
                    {hasSub && (
                      <button
                        onClick={(e) => toggleExpand(cat.slug, e)}
                        className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition"
                        aria-label="Expand category"
                      >
                        <ChevronRight
                          size={12}
                          className={`transform transition duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories */}
                {hasSub && isExpanded && (
                  <ul className="pl-4 py-1.5 border-l-2 border-gray-100 space-y-1 bg-gray-50/50 rounded-r-lg">
                    {cat.subcategories!.map((sub, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => onSelectCategory(cat.slug)}
                          className="w-full text-left py-1.5 px-3 rounded-md text-gray-500 hover:text-emerald-700 hover:bg-white text-[11px] font-semibold transition"
                        >
                          {sub}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Price Slider Widget */}
      <div>
        <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-gray-800 mb-4">
          Filter by price
        </h4>
        <form onSubmit={handlePriceSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="min_price" className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Min ($)
              </label>
              <input
                type="number"
                id="min_price"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                min="0"
                max="17400"
                className="w-full border border-gray-200 p-2 text-xs rounded-lg bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="max_price" className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Max ($)
              </label>
              <input
                type="number"
                id="max_price"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                min="0"
                max="17400"
                className="w-full border border-gray-200 p-2 text-xs rounded-lg bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg shadow-xs cursor-pointer transition"
          >
            Apply Price Filter
          </button>
        </form>
      </div>
    </aside>
  );
}
