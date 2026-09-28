import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from './LanguageContext';

export interface Currency {
  code: string;
  symbol: string;
  rate: number; // Multiplier: 1 USD = rate in target currency
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
  {
    code: 'EUR',
    symbol: '€',
    rate: 0.92,
    name: 'Euro',
    flag: '🇪🇺',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'GBP',
    symbol: '£',
    rate: 0.79,
    name: 'British Pound',
    flag: '🇬🇧',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    rate: 1.36,
    name: 'Canadian Dollar',
    flag: '🇨🇦',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'AUD',
    symbol: 'A$',
    rate: 1.53,
    name: 'Australian Dollar',
    flag: '🇦🇺',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'JPY',
    symbol: '¥',
    rate: 153.5,
    name: 'Japanese Yen',
    flag: '🇯🇵',
    symbolPosition: 'prefix',
    decimals: 0,
  },
  {
    code: 'CHF',
    symbol: 'CHF ',
    rate: 0.88,
    name: 'Swiss Franc',
    flag: '🇨🇭',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'MXN',
    symbol: 'MX$',
    rate: 19.8,
    name: 'Mexican Peso',
    flag: '🇲🇽',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'BRL',
    symbol: 'R$',
    rate: 5.65,
    name: 'Brazilian Real',
    flag: '🇧🇷',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'PLN',
    symbol: 'zł',
    rate: 3.98,
    name: 'Polish Złoty',
    flag: '🇵🇱',
    symbolPosition: 'suffix',
    decimals: 2,
  },
  {
    code: 'BTC',
    symbol: '₿',
    rate: 0.000015,
    name: 'Bitcoin',
    flag: '🪙',
    symbolPosition: 'prefix',
    decimals: 6,
  },
];

// Exported alias for backward compatibility across components
export const SUPPORTED_CURRENCIES = DEFAULT_CURRENCIES;

const CURRENCY_STORAGE_KEY = 'global_herbs_currency';
const CURRENCY_MANUAL_KEY = 'global_herbs_currency_manual';
const CURRENCY_COOKIE_NAME = 'gh_currency';
const RATES_CACHE_STORAGE_KEY = 'gh_exchange_rates_cache_v1';
const LOCALE_SESSION_CACHE_KEY = 'gh_visitor_locale_session_v1';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookieValue(name: string, value: string, maxAgeDays = 365) {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Synchronous heuristic fallback using browser timezone and navigator.languages
 * so initial render has zero flash before /api/locale-info resolves.
 */
function detectBrowserHeuristicCurrency(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const langs =
      Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages.map((l) => l.toLowerCase())
        : [(navigator.language || '').toLowerCase()];
    const primaryLang = langs[0] || '';

    if (tz.includes('London') || primaryLang === 'en-gb') return 'GBP';
    if (
      tz.includes('Toronto') ||
      tz.includes('Vancouver') ||
      tz.includes('Montreal') ||
      tz.includes('Edmonton') ||
      tz.includes('Winnipeg') ||
      tz.includes('Halifax') ||
      primaryLang.endsWith('-ca')
    ) {
      return 'CAD';
    }
    if (
      tz.includes('Australia') ||
      tz.includes('Sydney') ||
      tz.includes('Melbourne') ||
      primaryLang === 'en-au'
    ) {
      return 'AUD';
    }
    if (tz.includes('Tokyo') || primaryLang.startsWith('ja')) return 'JPY';
    if (tz.includes('Zurich') || tz.includes('Geneva') || primaryLang.endsWith('-ch')) return 'CHF';
    if (tz.includes('Mexico') || primaryLang === 'es-mx') return 'MXN';
    if (tz.includes('Sao_Paulo') || primaryLang === 'pt-br') return 'BRL';
    if (tz.includes('Warsaw') || primaryLang.startsWith('pl')) return 'PLN';
    if (
      tz.startsWith('Europe/') ||
      primaryLang.startsWith('de') ||
      primaryLang.startsWith('fr') ||
      primaryLang === 'es-es' ||
      primaryLang.startsWith('it') ||
      primaryLang.startsWith('nl') ||
      primaryLang === 'pt-pt'
    ) {
      return 'EUR';
    }
  } catch (e) {
    console.debug('Heuristic currency detection fallback to USD', e);
  }
  return 'USD';
}

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
  const { currentLanguage } = useLanguage();

  // Dynamic exchange rates map initialized from cached live rates or maintained fallback
  const [ratesMap, setRatesMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const c of DEFAULT_CURRENCIES) {
      initial[c.code] = c.rate;
    }
    try {
      const cachedRaw = localStorage.getItem(RATES_CACHE_STORAGE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (parsed && parsed.rates && typeof parsed.rates === 'object') {
          return { ...initial, ...parsed.rates, USD: 1.0 };
        }
      }
    } catch {
      // ignore
    }
    return initial;
  });

  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [rateSource, setRateSource] = useState<'live' | 'cached' | 'fallback'>('fallback');
  const [rateProvider, setRateProvider] = useState<string>('Frankfurter (European Central Bank)');
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [isStaleRates, setIsStaleRates] = useState<boolean>(false);

  const [visitorCountry, setVisitorCountry] = useState<{ code: string; name: string }>({
    code: 'US',
    name: 'United States',
  });

  const [detectedLocationCode, setDetectedLocationCode] = useState<string>(() =>
    detectBrowserHeuristicCurrency()
  );

  const [isManualOverride, setIsManualOverride] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(CURRENCY_MANUAL_KEY) === 'true' ||
        Boolean(getCookieValue(CURRENCY_COOKIE_NAME))
      );
    } catch {
      return false;
    }
  });

  const [currentCode, setCurrentCode] = useState<string>(() => {
    try {
      const manualFlag =
        localStorage.getItem(CURRENCY_MANUAL_KEY) === 'true' ||
        Boolean(getCookieValue(CURRENCY_COOKIE_NAME));
      const saved =
        localStorage.getItem(CURRENCY_STORAGE_KEY) || getCookieValue(CURRENCY_COOKIE_NAME);
      if (saved && DEFAULT_CURRENCIES.some((c) => c.code === saved)) {
        if (manualFlag) return saved;
      }

      // Check session cache from /api/locale-info to prevent any flash on navigation
      const sessionGeo = sessionStorage.getItem(LOCALE_SESSION_CACHE_KEY);
      if (sessionGeo) {
        const parsedGeo = JSON.parse(sessionGeo);
        if (
          parsedGeo?.currencyCode &&
          DEFAULT_CURRENCIES.some((c) => c.code === parsedGeo.currencyCode)
        ) {
          return parsedGeo.currencyCode;
        }
      }

      if (saved && DEFAULT_CURRENCIES.some((c) => c.code === saved)) {
        return saved;
      }

      return detectBrowserHeuristicCurrency();
    } catch {
      return 'USD';
    }
  });

  // Build live currencies list with current rates
  const availableCurrencies: Currency[] = useMemo(() => {
    return DEFAULT_CURRENCIES.map((c) => {
      const liveRate = ratesMap[c.code];
      const validRate =
        c.code === 'USD'
          ? 1.0
          : typeof liveRate === 'number' && Number.isFinite(liveRate) && liveRate > 0
          ? liveRate
          : c.rate;
      return {
        ...c,
        rate: validRate,
      };
    });
  }, [ratesMap]);

  const baseCurrency = availableCurrencies[0];

  const currency = useMemo(() => {
    return availableCurrencies.find((c) => c.code === currentCode) || baseCurrency;
  }, [availableCurrencies, currentCode, baseCurrency]);

  const detectedLocationCurrency = useMemo(() => {
    return availableCurrencies.find((c) => c.code === detectedLocationCode) || baseCurrency;
  }, [availableCurrencies, detectedLocationCode, baseCurrency]);

  // Fetch coarse IP country & live exchange rates once on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchVisitorLocaleAndRates() {
      setIsLoadingRates(true);
      try {
        const res = await fetch('/api/locale-info', {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted || !data) return;

        // 1. Update live exchange rates
        if (data.exchangeRates && data.exchangeRates.rates) {
          setRatesMap((prev) => ({
            ...prev,
            ...data.exchangeRates.rates,
            USD: 1.0,
          }));
          setRateSource(data.exchangeRates.source || 'live');
          setRateProvider(data.exchangeRates.provider || 'Frankfurter (ECB)');
          setRatesUpdatedAt(data.exchangeRates.updatedAt || new Date().toISOString());
          setIsStaleRates(Boolean(data.exchangeRates.isStale));

          try {
            localStorage.setItem(
              RATES_CACHE_STORAGE_KEY,
              JSON.stringify({
                rates: data.exchangeRates.rates,
                updatedAt: data.exchangeRates.updatedAt,
              })
            );
          } catch {
            // ignore storage quota errors
          }
        }

        // 2. Update coarse visitor country & detected local currency
        if (data.countryCode) {
          setVisitorCountry({
            code: data.countryCode,
            name: data.countryName || data.countryCode,
          });
        }

        const serverCurrency = data.currencyCode;
        const resolvedLocalCode =
          serverCurrency && DEFAULT_CURRENCIES.some((c) => c.code === serverCurrency)
            ? serverCurrency
            : detectBrowserHeuristicCurrency();

        setDetectedLocationCode(resolvedLocalCode);

        try {
          sessionStorage.setItem(
            LOCALE_SESSION_CACHE_KEY,
            JSON.stringify({
              countryCode: data.countryCode || 'US',
              countryName: data.countryName || 'United States',
              currencyCode: resolvedLocalCode,
            })
          );
        } catch {
          // ignore
        }

        // 3. Apply automatic currency ONLY if visitor has not set a manual preference
        const hasManualChoice =
          localStorage.getItem(CURRENCY_MANUAL_KEY) === 'true' ||
          Boolean(getCookieValue(CURRENCY_COOKIE_NAME));

        if (!hasManualChoice) {
          setCurrentCode(resolvedLocalCode);
          try {
            localStorage.setItem(CURRENCY_STORAGE_KEY, resolvedLocalCode);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.debug('Locale/exchange rate fetch fallback to local defaults:', err);
        if (isMounted) {
          setRateSource('fallback');
          setIsStaleRates(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRates(false);
        }
      }
    }

    fetchVisitorLocaleAndRates();
    return () => {
      isMounted = false;
    };
  }, []);

  const setCurrencyCode = useCallback((code: string, isManual: boolean = true) => {
    const normalized = (code || '').toUpperCase();
    const target = DEFAULT_CURRENCIES.find((c) => c.code === normalized);
    if (target) {
      setCurrentCode(target.code);
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, target.code);
        if (isManual) {
          localStorage.setItem(CURRENCY_MANUAL_KEY, 'true');
          setCookieValue(CURRENCY_COOKIE_NAME, target.code, 365);
          setIsManualOverride(true);
        }
      } catch (e) {
        console.debug('Error saving currency to storage', e);
      }
    }
  }, []);

  const resetCurrencyToAuto = useCallback(() => {
    const autoCode = detectedLocationCode || detectBrowserHeuristicCurrency();
    try {
      localStorage.removeItem(CURRENCY_MANUAL_KEY);
      localStorage.setItem(CURRENCY_STORAGE_KEY, autoCode);
      setCookieValue(CURRENCY_COOKIE_NAME, '', -1);
    } catch {
      // ignore
    }
    setIsManualOverride(false);
    setCurrentCode(autoCode);
  }, [detectedLocationCode]);

  const toggleCurrency = useCallback(() => {
    const alternative = detectedLocationCurrency.code !== 'USD' ? detectedLocationCurrency.code : 'EUR';
    if (currentCode === 'USD') {
      setCurrencyCode(alternative, true);
    } else {
      setCurrencyCode('USD', true);
    }
  }, [currentCode, detectedLocationCurrency.code, setCurrencyCode]);

  const convertPrice = useCallback(
    (usdAmount: number): number => {
      if (typeof usdAmount !== 'number' || isNaN(usdAmount)) return 0;
      const validRate =
        typeof currency.rate === 'number' && Number.isFinite(currency.rate) && currency.rate > 0
          ? currency.rate
          : 1.0;
      return Number((usdAmount * validRate).toFixed(currency.decimals));
    },
    [currency]
  );

  const formatBaseUsd = useCallback(
    (usdAmount: number): string => {
      const safeAmount = typeof usdAmount === 'number' && !isNaN(usdAmount) ? usdAmount : 0;
      try {
        return new Intl.NumberFormat(currentLanguage.localeTag || 'en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(safeAmount);
      } catch {
        return `$${safeAmount.toFixed(2)}`;
      }
    },
    [currentLanguage.localeTag]
  );

  const formatPrice = useCallback(
    (
      usdAmount: number,
      options?: { showCode?: boolean; decimals?: number; hideSymbol?: boolean }
    ): string => {
      if (typeof usdAmount !== 'number' || isNaN(usdAmount)) return '$0.00';

      // Safe fallback to USD if rate is missing or invalid
      const hasValidRate =
        typeof currency.rate === 'number' && Number.isFinite(currency.rate) && currency.rate > 0;
      const activeCurrency = hasValidRate ? currency : baseCurrency;
      const converted = usdAmount * activeCurrency.rate;
      const decimalPlaces =
        options?.decimals !== undefined ? options.decimals : activeCurrency.decimals;
      const localeTag = currentLanguage.localeTag || 'en-US';

      if (activeCurrency.code === 'BTC') {
        const num = converted.toFixed(decimalPlaces);
        const base = options?.hideSymbol ? num : `${activeCurrency.symbol}${num}`;
        return options?.showCode ? `${base} BTC` : base;
      }

      try {
        if (options?.hideSymbol) {
          const formattedNum = new Intl.NumberFormat(localeTag, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(converted);
          return options?.showCode ? `${formattedNum} ${activeCurrency.code}` : formattedNum;
        }

        const formattedCurrency = new Intl.NumberFormat(localeTag, {
          style: 'currency',
          currency: activeCurrency.code,
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(converted);

        if (options?.showCode && !formattedCurrency.includes(activeCurrency.code)) {
          return `${formattedCurrency} ${activeCurrency.code}`;
        }
        return formattedCurrency;
      } catch {
        const fallbackNum = converted.toFixed(decimalPlaces);
        const withSymbol = options?.hideSymbol
          ? fallbackNum
          : activeCurrency.symbolPosition === 'prefix'
          ? `${activeCurrency.symbol}${fallbackNum}`
          : `${fallbackNum} ${activeCurrency.symbol}`;
        return options?.showCode ? `${withSymbol} ${activeCurrency.code}` : withSymbol;
      }
    },
    [currency, baseCurrency, currentLanguage.localeTag]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        baseCurrency,
        isBaseCurrency: currency.code === 'USD',
        setCurrencyCode,
        resetCurrencyToAuto,
        isManualOverride,
        toggleCurrency,
        convertPrice,
        formatPrice,
        formatBaseUsd,
        detectedLocationCurrency,
        visitorCountry,
        availableCurrencies,
        isLoadingRates,
        rateSource,
        rateProvider,
        ratesUpdatedAt,
        isStaleRates,
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
