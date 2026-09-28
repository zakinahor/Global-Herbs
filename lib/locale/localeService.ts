import type { Request } from 'express';

export interface ExchangeRatesPayload {
  base: 'USD';
  rates: Record<string, number>;
  source: 'live' | 'cached' | 'fallback';
  provider: string;
  updatedAt: string;
  isStale: boolean;
}

export interface VisitorLocalePayload {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  languageCode: string;
  detectionSource: 'cdn_header' | 'ip_lookup' | 'accept_language' | 'default';
  privacyNotice: string;
  exchangeRates: ExchangeRatesPayload;
}

/**
 * Maintained reference dataset of USD exchange rates used only when live exchange-rate
 * providers (ECB Frankfurter / Open ER API) are unreachable.
 */
export const MAINTAINED_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 153.5,
  CHF: 0.88,
  MXN: 19.8,
  BRL: 5.65,
  PLN: 3.98,
  BTC: 0.000015,
};

const EUROZONE_COUNTRIES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  PR: 'USD',
  GB: 'GBP',
  UK: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'AUD',
  JP: 'JPY',
  CH: 'CHF',
  LI: 'CHF',
  MX: 'MXN',
  BR: 'BRL',
  PL: 'PLN',
};

export const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  US: 'en',
  GB: 'en',
  CA: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  FR: 'fr',
  BE: 'fr',
  MC: 'fr',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  IT: 'it',
  SM: 'it',
  NL: 'nl',
  PT: 'pt',
  BR: 'pt',
  JP: 'ja',
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  PT: 'Portugal',
  BR: 'Brazil',
  MX: 'Mexico',
  JP: 'Japan',
  CH: 'Switzerland',
  PL: 'Poland',
  AT: 'Austria',
  BE: 'Belgium',
  IE: 'Ireland',
};

const SUPPORTED_LANG_SET = new Set(['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ja']);

// 6-hour server-side cache for live exchange rates
let cachedExchangeRates: {
  data: ExchangeRatesPayload;
  expiresAt: number;
} | null = null;

const EXCHANGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Coarse anonymized IP prefix -> country cache (never stores full IP or precise coordinates)
const coarseGeoCache = new Map<
  string,
  { countryCode: string; countryName: string; expiresAt: number }
>();

function anonymizeIpPrefix(ip: string): string {
  const clean = ip.trim();
  if (!clean || clean === '127.0.0.1' || clean === '::1' || clean.startsWith('10.') || clean.startsWith('192.168.') || clean.startsWith('172.')) {
    return 'local';
  }
  if (clean.includes('.')) {
    const parts = clean.split('.');
    return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : 'local';
  }
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return parts.slice(0, 3).join(':') + '::/48';
  }
  return 'local';
}

export function mapCountryToCurrency(countryCode: string): string {
  const upper = (countryCode || '').toUpperCase();
  if (COUNTRY_TO_CURRENCY[upper]) {
    return COUNTRY_TO_CURRENCY[upper];
  }
  if (EUROZONE_COUNTRIES.has(upper)) {
    return 'EUR';
  }
  return 'USD';
}

export function mapCountryToLanguage(countryCode: string): string {
  const upper = (countryCode || '').toUpperCase();
  return COUNTRY_TO_LANGUAGE[upper] || 'en';
}

export function parseAcceptLanguageHeader(headerVal?: string | null): string | null {
  if (!headerVal || typeof headerVal !== 'string') return null;
  const parts = headerVal.split(',');
  for (const part of parts) {
    const tag = part.split(';')[0]?.trim().toLowerCase();
    if (!tag) continue;
    const primary = tag.slice(0, 2);
    if (SUPPORTED_LANG_SET.has(primary)) {
      return primary;
    }
  }
  return null;
}

/**
 * Fetches live USD exchange rates from European Central Bank (Frankfurter) or Open Exchange Rates,
 * with a 6-hour server cache and graceful fallback to maintained reference rates.
 */
export async function getLiveExchangeRates(): Promise<ExchangeRatesPayload> {
  const now = Date.now();
  if (cachedExchangeRates && cachedExchangeRates.expiresAt > now) {
    return {
      ...cachedExchangeRates.data,
      source: 'cached',
    };
  }

  // Provider 1: Frankfurter API (European Central Bank reference rates)
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,CAD,AUD,JPY,CHF,MXN,BRL,PLN',
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4500),
      }
    );
    if (res.ok) {
      const json: any = await res.json();
      if (json && json.rates && typeof json.rates === 'object') {
        const mergedRates: Record<string, number> = {
          ...MAINTAINED_FALLBACK_RATES,
          ...json.rates,
          USD: 1.0,
        };
        const payload: ExchangeRatesPayload = {
          base: 'USD',
          rates: mergedRates,
          source: 'live',
          provider: 'Frankfurter (European Central Bank)',
          updatedAt: json.date ? new Date(json.date).toISOString() : new Date().toISOString(),
          isStale: false,
        };
        cachedExchangeRates = {
          data: payload,
          expiresAt: now + EXCHANGE_CACHE_TTL_MS,
        };
        return payload;
      }
    }
  } catch {
    // Fall through to secondary provider
  }

  // Provider 2: Open Exchange Rates (open.er-api.com)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const json: any = await res.json();
      if (json && json.rates && typeof json.rates === 'object') {
        const picked: Record<string, number> = { ...MAINTAINED_FALLBACK_RATES, USD: 1.0 };
        for (const code of Object.keys(MAINTAINED_FALLBACK_RATES)) {
          if (code !== 'USD' && code !== 'BTC' && typeof json.rates[code] === 'number') {
            picked[code] = Number(json.rates[code].toFixed(4));
          }
        }
        const payload: ExchangeRatesPayload = {
          base: 'USD',
          rates: picked,
          source: 'live',
          provider: 'Open Exchange Rates API',
          updatedAt: json.time_last_update_utc
            ? new Date(json.time_last_update_utc).toISOString()
            : new Date().toISOString(),
          isStale: false,
        };
        cachedExchangeRates = {
          data: payload,
          expiresAt: now + EXCHANGE_CACHE_TTL_MS,
        };
        return payload;
      }
    }
  } catch {
    // Fall through to maintained dataset
  }

  return {
    base: 'USD',
    rates: { ...MAINTAINED_FALLBACK_RATES },
    source: 'fallback',
    provider: 'Maintained Reference Dataset (Offline Fallback)',
    updatedAt: new Date().toISOString(),
    isStale: true,
  };
}

/**
 * Resolves visitor country & currency using coarse server-side headers or anonymized country-level IP lookup.
 * Never requests or stores precise GPS/device coordinates.
 */
export async function resolveVisitorLocale(req: Request | any): Promise<VisitorLocalePayload> {
  const exchangeRates = await getLiveExchangeRates();
  const headers = req?.headers || {};

  // 1. Check standard CDN / Reverse-Proxy coarse country headers first (0 external latency)
  const cdnCountryRaw =
    headers['cf-ipcountry'] ||
    headers['x-vercel-ip-country'] ||
    headers['x-appengine-country'] ||
    headers['x-country-code'];

  const acceptLang = parseAcceptLanguageHeader(headers['accept-language']);

  if (
    cdnCountryRaw &&
    typeof cdnCountryRaw === 'string' &&
    cdnCountryRaw.length === 2 &&
    cdnCountryRaw.toUpperCase() !== 'XX' &&
    cdnCountryRaw.toUpperCase() !== 'T1'
  ) {
    const countryCode = cdnCountryRaw.toUpperCase();
    const currencyCode = mapCountryToCurrency(countryCode);
    const languageCode = acceptLang || mapCountryToLanguage(countryCode);
    return {
      countryCode,
      countryName: COUNTRY_NAMES[countryCode] || countryCode,
      currencyCode,
      languageCode,
      detectionSource: 'cdn_header',
      privacyNotice:
        'Coarse country-level region inferred from edge network header; no precise location or IP is stored.',
      exchangeRates,
    };
  }

  // 2. Extract client IP if public, anonymize to /24 prefix for caching
  const forwardedFor = headers['x-forwarded-for'];
  const rawIp =
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : '') ||
    req?.socket?.remoteAddress ||
    '';
  const ipPrefix = anonymizeIpPrefix(rawIp);

  if (ipPrefix !== 'local') {
    const cachedGeo = coarseGeoCache.get(ipPrefix);
    if (cachedGeo && cachedGeo.expiresAt > Date.now()) {
      const currencyCode = mapCountryToCurrency(cachedGeo.countryCode);
      const languageCode = acceptLang || mapCountryToLanguage(cachedGeo.countryCode);
      return {
        countryCode: cachedGeo.countryCode,
        countryName: cachedGeo.countryName,
        currencyCode,
        languageCode,
        detectionSource: 'ip_lookup',
        privacyNotice:
          'Coarse country-level region resolved via country.is / ipwho.is; IP is truncated to /24 prefix in memory.',
        exchangeRates,
      };
    }

    // Query coarse country-only lookup (https://api.country.is/<ip>)
    try {
      const cleanIp = rawIp.replace(/^::ffff:/, '');
      const geoRes = await fetch(`https://api.country.is/${encodeURIComponent(cleanIp)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      });
      if (geoRes.ok) {
        const geoJson: any = await geoRes.json();
        if (geoJson && typeof geoJson.country === 'string' && geoJson.country.length === 2) {
          const countryCode = geoJson.country.toUpperCase();
          const countryName = COUNTRY_NAMES[countryCode] || countryCode;
          coarseGeoCache.set(ipPrefix, {
            countryCode,
            countryName,
            expiresAt: Date.now() + EXCHANGE_CACHE_TTL_MS,
          });
          return {
            countryCode,
            countryName,
            currencyCode: mapCountryToCurrency(countryCode),
            languageCode: acceptLang || mapCountryToLanguage(countryCode),
            detectionSource: 'ip_lookup',
            privacyNotice:
              'Coarse country-level region resolved via country.is; no precise coordinates requested or stored.',
            exchangeRates,
          };
        }
      }
    } catch {
      // Ignore and fall back to Accept-Language / default
    }
  }

  // 3. Fallback to Accept-Language or default US / USD
  if (acceptLang) {
    const langToDefaultCountry: Record<string, string> = {
      en: 'US',
      es: 'ES',
      fr: 'FR',
      de: 'DE',
      it: 'IT',
      nl: 'NL',
      pt: 'PT',
      ja: 'JP',
    };
    const inferredCountry = langToDefaultCountry[acceptLang] || 'US';
    return {
      countryCode: inferredCountry,
      countryName: COUNTRY_NAMES[inferredCountry] || 'United States',
      currencyCode: mapCountryToCurrency(inferredCountry),
      languageCode: acceptLang,
      detectionSource: 'accept_language',
      privacyNotice:
        'Locale inferred from browser Accept-Language preference; no geolocation lookup performed.',
      exchangeRates,
    };
  }

  return {
    countryCode: 'US',
    countryName: 'United States',
    currencyCode: 'USD',
    languageCode: 'en',
    detectionSource: 'default',
    privacyNotice: 'Defaulting to United States (en-US / USD).',
    exchangeRates,
  };
}
