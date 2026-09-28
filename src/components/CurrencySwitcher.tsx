import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, ArrowRightLeft, RotateCcw, Globe } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface CurrencySwitcherProps {
  compact?: boolean;
}

export default function CurrencySwitcher({ compact = false }: CurrencySwitcherProps) {
  const {
    currency,
    setCurrencyCode,
    resetCurrencyToAuto,
    isManualOverride,
    toggleCurrency,
    detectedLocationCurrency,
    visitorCountry,
    availableCurrencies,
    rateSource,
    isStaleRates,
  } = useCurrency();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const alternativeCode =
    detectedLocationCurrency.code !== 'USD' ? detectedLocationCurrency.code : 'EUR';

  if (compact) {
    return (
      <div className="relative inline-flex items-center" ref={dropdownRef} translate="no">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`${t('currency.select', 'Select Display Currency')}: ${currency.code}`}
          className="notranslate flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-800/80 hover:bg-emerald-700 text-emerald-50 text-[10px] font-bold transition cursor-pointer border border-emerald-700"
        >
          <span>{currency.flag}</span>
          <span>{currency.code}</span>
          <ChevronDown
            size={10}
            className={`text-emerald-200 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label={t('currency.select', 'Select Display Currency')}
            className="notranslate absolute top-full right-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 text-left text-gray-800"
          >
            <div className="px-3 py-1 border-b border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500">
              <span>{t('currency.select', 'Select Display Currency')}</span>
              <span className="text-emerald-700">
                {visitorCountry.code}: {detectedLocationCurrency.code}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {availableCurrencies.map((curr) => {
                const isSelected = curr.code === currency.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setCurrencyCode(curr.code, true);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{curr.flag}</span>
                      <span>{curr.code}</span>
                      <span className="text-gray-400 text-[10px]">({curr.symbol.trim()})</span>
                    </div>
                    {isSelected && <Check size={13} className="text-emerald-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={dropdownRef} translate="no">
      {/* Quick USD <-> Local Currency Toggle */}
      <button
        type="button"
        onClick={toggleCurrency}
        className="notranslate hidden xl:flex items-center gap-1 text-gray-600 hover:text-emerald-800 transition text-[11px] font-bold px-2 py-1 rounded bg-white hover:bg-gray-100 border border-gray-200 shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
        title={`1 USD = ${currency.rate} ${currency.code}`}
      >
        <ArrowRightLeft size={11} className="text-emerald-700" />
        <span>
          {currency.code === 'USD'
            ? `${t('currency.switchTo', 'Switch to')} ${alternativeCode}`
            : `${t('currency.switchTo', 'Switch to')} USD`}
        </span>
      </button>

      {/* Main Currency Dropdown Trigger */}
      <button
        id="header-currency-switcher-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${t('currency.select', 'Select Display Currency')} - ${currency.code} (${currency.name})`}
        className="notranslate flex items-center gap-1.5 text-gray-700 hover:text-emerald-800 transition font-bold text-xs px-2.5 py-1 rounded-md bg-gray-100/90 hover:bg-gray-200/80 border border-gray-200/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
      >
        <span className="text-xs">{currency.flag}</span>
        <span>{currency.code}</span>
        <span className="text-gray-500 font-semibold text-[10px]">({currency.symbol.trim()})</span>
        <ChevronDown
          size={12}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('currency.select', 'Select Display Currency')}
          className="notranslate absolute top-full right-0 mt-1.5 w-68 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left"
        >
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-600">
            <span>{t('currency.select', 'Select Display Currency')}</span>
            <span className="text-emerald-700 flex items-center gap-1 text-[10px]">
              <Globe size={11} />
              {visitorCountry.code}: {detectedLocationCurrency.code}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {availableCurrencies.map((curr) => {
              const isSelected = curr.code === currency.code;
              const isLocal = curr.code === detectedLocationCurrency.code;
              const isBase = curr.code === 'USD';

              return (
                <button
                  key={curr.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setCurrencyCode(curr.code, true);
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
                        {isBase && (
                          <span className="text-[9px] text-gray-500 font-medium">
                            · {t('currency.baseBadge', 'Base (Checkout)')}
                          </span>
                        )}
                        {!isBase && isLocal && (
                          <span className="text-[9px] text-emerald-700 font-semibold">
                            · {t('currency.localBadge', 'Local')}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block font-normal">{curr.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                      {curr.code === 'USD'
                        ? '1.00'
                        : curr.code === 'BTC'
                        ? curr.rate.toFixed(6)
                        : curr.rate.toFixed(2)}
                    </span>
                    {isSelected && <Check size={14} className="text-emerald-700 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {isManualOverride && (
            <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between bg-emerald-50/40">
              <span className="text-[10px] text-gray-600">{t('language.manualOverride', 'Saved preference')}</span>
              <button
                type="button"
                onClick={() => {
                  resetCurrencyToAuto();
                  setIsOpen(false);
                }}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={10} />
                {t('language.resetAuto', 'Reset to automatic')}
              </button>
            </div>
          )}

          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/80 text-[10px] text-gray-500 leading-snug space-y-1">
            <p>{t('currency.rateDisclaimer', 'Display prices are converted from USD using live reference exchange rates. Orders are settled in USD.')}</p>
            {isStaleRates && rateSource === 'fallback' && (
              <p className="text-amber-700 font-medium">
                {t('currency.staleWarning', 'Using reference fallback rates.')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
