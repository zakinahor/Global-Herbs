import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  rate: number; // Multiplier: 1 USD = rate in target currency
  name: string;
  flag: string;
  symbolPosition: 'prefix' | 'suffix';
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
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
    rate: 0.78,
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
    rate: 1.52,
    name: 'Australian Dollar',
    flag: '🇦🇺',
    symbolPosition: 'prefix',
    decimals: 2,
  },
  {
    code: 'JPY',
    symbol: '¥',
    rate: 154.0,
    name: 'Japanese Yen',
    flag: '🇯🇵',
    symbolPosition: 'prefix',
    decimals: 0,
  },
  {
    code: 'CHF',
    symbol: 'CHF ',
    rate: 0.89,
    name: 'Swiss Franc',
    flag: '🇨🇭',
    symbolPosition: 'prefix',
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

interface CurrencyContextType {
  currency: Currency;
  setCurrencyCode: (code: string) => void;
  toggleCurrency: () => void; // Quick toggle between USD and detected location currency
  convertPrice: (usdAmount: number) => number;
  formatPrice: (usdAmount: number, options?: { showCode?: boolean; decimals?: number; hideSymbol?: boolean }) => string;
  detectedLocationCurrency: Currency;
  availableCurrencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * Detect user's natural local currency based on browser timezone and locale
 */
function detectLocalCurrency(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();

    if (tz.includes('London') || lang.startsWith('en-gb')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'GBP') || SUPPORTED_CURRENCIES[0];
    }
    if (
      tz.includes('Toronto') ||
      tz.includes('Vancouver') ||
      tz.includes('Montreal') ||
      tz.includes('Edmonton') ||
      tz.includes('Winnipeg') ||
      tz.includes('Halifax') ||
      lang.includes('ca')
    ) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'CAD') || SUPPORTED_CURRENCIES[0];
    }
    if (tz.includes('Australia') || tz.includes('Sydney') || tz.includes('Melbourne') || lang.startsWith('en-au')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'AUD') || SUPPORTED_CURRENCIES[0];
    }
    if (tz.includes('Tokyo') || lang.startsWith('ja')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'JPY') || SUPPORTED_CURRENCIES[0];
    }
    if (tz.includes('Zurich') || tz.includes('Geneva')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'CHF') || SUPPORTED_CURRENCIES[0];
    }
    if (
      tz.startsWith('Europe/') ||
      lang.startsWith('de') ||
      lang.startsWith('fr') ||
      lang.startsWith('es') ||
      lang.startsWith('it') ||
      lang.startsWith('nl')
    ) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'EUR') || SUPPORTED_CURRENCIES[0];
    }
  } catch (e) {
    console.debug('Could not auto-detect location currency', e);
  }

  return SUPPORTED_CURRENCIES[0]; // Default USD
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [detectedLocationCurrency] = useState<Currency>(() => detectLocalCurrency());
  const [currentCode, setCurrentCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('global_herbs_currency');
      if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
        return saved;
      }
    } catch (e) {
      console.debug('Error reading currency from storage', e);
    }
    // Default to USD
    return 'USD';
  });

  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currentCode) || SUPPORTED_CURRENCIES[0];

  const setCurrencyCode = (code: string) => {
    const target = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (target) {
      setCurrentCode(target.code);
      try {
        localStorage.setItem('global_herbs_currency', target.code);
      } catch (e) {
        console.debug('Error saving currency to storage', e);
      }
    }
  };

  const toggleCurrency = () => {
    // Quick toggle between USD and the user's detected location currency (or EUR if location is USD)
    const alternative = detectedLocationCurrency.code !== 'USD' ? detectedLocationCurrency.code : 'EUR';
    if (currentCode === 'USD') {
      setCurrencyCode(alternative);
    } else {
      setCurrencyCode('USD');
    }
  };

  const convertPrice = (usdAmount: number): number => {
    if (isNaN(usdAmount)) return 0;
    return Number((usdAmount * currency.rate).toFixed(currency.decimals));
  };

  const formatPrice = (
    usdAmount: number,
    options?: { showCode?: boolean; decimals?: number; hideSymbol?: boolean }
  ): string => {
    if (isNaN(usdAmount)) return '$0.00';
    const converted = usdAmount * currency.rate;
    const decimalPlaces = options?.decimals !== undefined ? options.decimals : currency.decimals;

    let formattedNumber: string;
    if (currency.code === 'BTC') {
      formattedNumber = converted.toFixed(6);
    } else if (decimalPlaces === 0) {
      formattedNumber = Math.round(converted).toLocaleString();
    } else {
      formattedNumber = converted.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    }

    let result = '';
    if (!options?.hideSymbol) {
      if (currency.symbolPosition === 'prefix') {
        result = `${currency.symbol}${formattedNumber}`;
      } else {
        result = `${formattedNumber} ${currency.symbol}`;
      }
    } else {
      result = formattedNumber;
    }

    if (options?.showCode) {
      result = `${result} ${currency.code}`;
    }

    return result;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrencyCode,
        toggleCurrency,
        convertPrice,
        formatPrice,
        detectedLocationCurrency,
        availableCurrencies: SUPPORTED_CURRENCIES,
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
