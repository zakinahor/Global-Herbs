import React from 'react';

interface CurrencySwitcherProps {
  compact?: boolean;
}

export default function CurrencySwitcher({ compact = false }: CurrencySwitcherProps) {
  if (compact) {
    return (
      <div
        className="notranslate inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-900/90 text-emerald-100 text-[10px] font-bold border border-emerald-700/80 shadow-2xs select-none"
        title="All product prices, catalog listings, and checkout transactions are displayed in US Dollars (USD)"
        translate="no"
      >
        <span>🇺🇸</span>
        <span>USD ($)</span>
      </div>
    );
  }

  return (
    <div
      className="notranslate inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-bold border border-gray-200 select-none"
      title="All product prices, catalog listings, and checkout transactions are displayed in US Dollars (USD)"
      translate="no"
    >
      <span className="text-xs">🇺🇸</span>
      <span>USD</span>
      <span className="text-gray-500 font-semibold text-[10px]">($)</span>
    </div>
  );
}
