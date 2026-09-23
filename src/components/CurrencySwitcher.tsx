import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, ArrowRightLeft, Sparkles } from 'lucide-react';
import { useCurrency, SUPPORTED_CURRENCIES } from '../context/CurrencyContext';

interface CurrencySwitcherProps {
  compact?: boolean;
}

export default function CurrencySwitcher({ compact = false }: CurrencySwitcherProps) {
  const { currency, setCurrencyCode, toggleCurrency, detectedLocationCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alternativeCode = detectedLocationCurrency.code !== 'USD' ? detectedLocationCurrency.code : 'EUR';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCurrency}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition cursor-pointer"
          title={`Toggle between USD and ${detectedLocationCurrency.code}`}
        >
          <span className="text-sm">{currency.flag}</span>
          <span>{currency.code} ({currency.symbol.trim()})</span>
          <ArrowRightLeft size={12} className="text-emerald-700 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={dropdownRef}>
      {/* Quick Location Toggle Button */}
      <button
        type="button"
        onClick={toggleCurrency}
        className="flex items-center gap-1 text-gray-600 hover:text-emerald-800 transition text-[11px] font-bold px-2 py-1 rounded bg-white hover:bg-gray-100 border border-gray-200 shadow-2xs cursor-pointer"
        title={`Toggle USD / ${alternativeCode} (1 USD = ${currency.rate} ${currency.code})`}
      >
        <ArrowRightLeft size={11} className="text-emerald-700" />
        <span>{currency.code === 'USD' ? `Switch to ${alternativeCode}` : 'Switch to USD'}</span>
      </button>

      {/* Main Currency Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 text-gray-700 hover:text-emerald-800 transition font-bold text-xs px-2.5 py-1 rounded-md bg-gray-100/90 hover:bg-gray-200/80 border border-gray-200/80 cursor-pointer"
        aria-label="Currency Selector"
      >
        <span className="text-xs">{currency.flag}</span>
        <span>{currency.code}</span>
        <span className="text-gray-400 font-semibold text-[10px]">({currency.symbol.trim()})</span>
        <ChevronDown
          size={12}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-60 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            <span>Select Currency</span>
            {detectedLocationCurrency && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Sparkles size={10} /> Local: {detectedLocationCurrency.code}
              </span>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isSelected = curr.code === currency.code;
              const isLocal = curr.code === detectedLocationCurrency.code;

              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => {
                    setCurrencyCode(curr.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{curr.flag}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{curr.code}</span>
                        <span className="text-gray-400 font-normal">({curr.symbol.trim()})</span>
                        {isLocal && (
                          <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                            Local
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block font-normal">{curr.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono">
                      {curr.rate === 1.0 ? '1.00x' : `${curr.rate}x`}
                    </span>
                    {isSelected && <Check size={14} className="text-emerald-700 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/70 text-[9px] text-gray-500 font-medium leading-tight">
            Prices update dynamically across the store using real-time dispensary conversion multipliers.
          </div>
        </div>
      )}
    </div>
  );
}
