import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  rate: number;
  name: string;
  flag: string;
  symbolPosition: 'prefix' | 'suffix';
  decimals: number;
}

export const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    symbol: '$',
    rate: 1.0,
    name: 'US Dollar',
    flag: '🇺🇸',
    symbolPosition: 'prefix',
    decimals: 2,
  },
];

// Exported alias for backward compatibility across components
export const SUPPORTED_CURRENCIES = DEFAULT_CURRENCIES;

const CURRENCY_STORAGE_KEY = 'global_herbs_currency';
const CURRENCY_MANUAL_KEY = 'global_herbs_currency_manual';
const CURRENCY_COOKIE_NAME = 'gh_currency';
const RATES_CACHE_STORAGE_KEY = 'gh_exchange_rates_cache_v1';
const LOCALE_SESSION_CACHE_KEY = 'gh_visitor_locale_session_v1';

export interface CurrencyContextType {
  currency: Currency;
  baseCurrency: Currency;
  isBaseCurrency: boolean;
  setCurrencyCode: (code: string, isManual?: boolean) => void;
  resetCurrencyToAuto: () => void;
  isManualOverride: boolean;
  toggleCurrency: () => void;
  convertPrice: (usdAmount: number) => number;
  formatPrice: (
    usdAmount: number,
    options?: { showCode?: boolean; decimals?: number; hideSymbol?: boolean }
  ) => string;
  formatBaseUsd: (usdAmount: number) => string;
  detectedLocationCurrency: Currency;
  visitorCountry: { code: string; name: string };
  availableCurrencies: Currency[];
  isLoadingRates: boolean;
  rateSource: 'live' | 'cached' | 'fallback';
  rateProvider: string;
  ratesUpdatedAt: string | null;
  isStaleRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const usdCurrency = useMemo(() => DEFAULT_CURRENCIES[0], []);

  // Guarantee that any previously cached foreign currency preferences in localStorage/cookies are cleared to USD
  useEffect(() => {
    try {
      localStorage.removeItem(CURRENCY_STORAGE_KEY);
      localStorage.removeItem(CURRENCY_MANUAL_KEY);
      localStorage.removeItem(RATES_CACHE_STORAGE_KEY);
      sessionStorage.removeItem(LOCALE_SESSION_CACHE_KEY);
      document.cookie = `${CURRENCY_COOKIE_NAME}=USD; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
  }, []);

  const convertPrice = useCallback((usdAmount: number): number => {
    const safeAmount = typeof usdAmount === 'number' && !isNaN(usdAmount) ? usdAmount : 0;
    return Number(safeAmount.toFixed(2));
  }, []);

  const formatBaseUsd = useCallback((usdAmount: number): string => {
    const safeAmount = typeof usdAmount === 'number' && !isNaN(usdAmount) ? usdAmount : 0;
    return `$${safeAmount.toFixed(2)}`;
  }, []);

  const formatPrice = useCallback(
    (
      usdAmount: number,
      options?: { showCode?: boolean; decimals?: number; hideSymbol?: boolean }
    ): string => {
      const safeAmount = typeof usdAmount === 'number' && !isNaN(usdAmount) ? usdAmount : 0;
      const decimals = options?.decimals !== undefined ? options.decimals : 2;
      const formattedNum = safeAmount.toFixed(decimals);

      if (options?.hideSymbol) {
        return options?.showCode ? `${formattedNum} USD` : formattedNum;
      }

      const formatted = `$${formattedNum}`;
      return options?.showCode ? `${formatted} USD` : formatted;
    },
    []
  );

  const setCurrencyCode = useCallback((_code: string, _isManual: boolean = true) => {
    // Store is strictly USD only; enforce USD
  }, []);

  const resetCurrencyToAuto = useCallback(() => {
    // Store is strictly USD only
  }, []);

  const toggleCurrency = useCallback(() => {
    // Store is strictly USD only
  }, []);

  return (
    <CurrencyContext.Provider
      value={{
        currency: usdCurrency,
        baseCurrency: usdCurrency,
        isBaseCurrency: true,
        setCurrencyCode,
        resetCurrencyToAuto,
        isManualOverride: false,
        toggleCurrency,
        convertPrice,
        formatPrice,
        formatBaseUsd,
        detectedLocationCurrency: usdCurrency,
        visitorCountry: { code: 'US', name: 'United States' },
        availableCurrencies: DEFAULT_CURRENCIES,
        isLoadingRates: false,
        rateSource: 'live',
        rateProvider: 'US Dollar (USD)',
        ratesUpdatedAt: null,
        isStaleRates: false,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
