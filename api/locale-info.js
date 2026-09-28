// api/locale-info.js
// Self-contained Serverless Function for Vercel / Edge deployments:
// Resolves coarse country-level visitor locale & live ECB exchange rates (Base USD)

const MAINTAINED_FALLBACK_RATES = {
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

const COUNTRY_TO_CURRENCY = {
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

const COUNTRY_TO_LANGUAGE = {
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

const COUNTRY_NAMES = {
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

let cachedExchangeRates = null;
const EXCHANGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function mapCountryToCurrency(countryCode) {
  const upper = (countryCode || '').toUpperCase();
  if (COUNTRY_TO_CURRENCY[upper]) return COUNTRY_TO_CURRENCY[upper];
  if (EUROZONE_COUNTRIES.has(upper)) return 'EUR';
  return 'USD';
}

function mapCountryToLanguage(countryCode) {
  const upper = (countryCode || '').toUpperCase();
  return COUNTRY_TO_LANGUAGE[upper] || 'en';
}

function parseAcceptLanguageHeader(headerVal) {
  if (!headerVal || typeof headerVal !== 'string') return null;
  const parts = headerVal.split(',');
  for (const part of parts) {
    const tag = part.split(';')[0]?.trim().toLowerCase();
    if (!tag) continue;
    const primary = tag.slice(0, 2);
    if (SUPPORTED_LANG_SET.has(primary)) return primary;
  }
  return null;
}

async function getLiveExchangeRates() {
  const now = Date.now();
  if (cachedExchangeRates && cachedExchangeRates.expiresAt > now) {
    return { ...cachedExchangeRates.data, source: 'cached' };
  }

  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,CAD,AUD,JPY,CHF,MXN,BRL,PLN',
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4500) }
    );
    if (res.ok) {
      const json = await res.json();
      if (json && json.rates && typeof json.rates === 'object') {
        const payload = {
          base: 'USD',
          rates: { ...MAINTAINED_FALLBACK_RATES, ...json.rates, USD: 1.0 },
          source: 'live',
          provider: 'Frankfurter (European Central Bank)',
          updatedAt: json.date ? new Date(json.date).toISOString() : new Date().toISOString(),
          isStale: false,
        };
        cachedExchangeRates = { data: payload, expiresAt: now + EXCHANGE_CACHE_TTL_MS };
        return payload;
      }
    }
  } catch {
    // Fallback to secondary provider
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.rates && typeof json.rates === 'object') {
        const picked = { ...MAINTAINED_FALLBACK_RATES, USD: 1.0 };
        for (const code of Object.keys(MAINTAINED_FALLBACK_RATES)) {
          if (code !== 'USD' && code !== 'BTC' && typeof json.rates[code] === 'number') {
            picked[code] = Number(json.rates[code].toFixed(4));
          }
        }
        const payload = {
          base: 'USD',
          rates: picked,
          source: 'live',
          provider: 'Open Exchange Rates API',
          updatedAt: new Date().toISOString(),
          isStale: false,
        };
        cachedExchangeRates = { data: payload, expiresAt: now + EXCHANGE_CACHE_TTL_MS };
        return payload;
      }
    }
  } catch {
    // Fallback to maintained reference dataset
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, max-age=300');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const exchangeRates = await getLiveExchangeRates();
    const headers = req.headers || {};
    const cdnCountryRaw =
      headers['x-vercel-ip-country'] ||
      headers['cf-ipcountry'] ||
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
      return res.status(200).json({
        countryCode,
        countryName: COUNTRY_NAMES[countryCode] || countryCode,
        currencyCode: mapCountryToCurrency(countryCode),
        languageCode: acceptLang || mapCountryToLanguage(countryCode),
        detectionSource: 'cdn_header',
        privacyNotice: 'Coarse country-level region inferred from edge header; no precise location stored.',
        exchangeRates,
      });
    }

    if (acceptLang) {
      const langToDefaultCountry = {
        en: 'US', es: 'ES', fr: 'FR', de: 'DE', it: 'IT', nl: 'NL', pt: 'PT', ja: 'JP',
      };
      const inferredCountry = langToDefaultCountry[acceptLang] || 'US';
      return res.status(200).json({
        countryCode: inferredCountry,
        countryName: COUNTRY_NAMES[inferredCountry] || 'United States',
        currencyCode: mapCountryToCurrency(inferredCountry),
        languageCode: acceptLang,
        detectionSource: 'accept_language',
        privacyNotice: 'Locale inferred from browser Accept-Language preference.',
        exchangeRates,
      });
    }

    return res.status(200).json({
      countryCode: 'US',
      countryName: 'United States',
      currencyCode: 'USD',
      languageCode: 'en',
      detectionSource: 'default',
      privacyNotice: 'Defaulting to United States (en-US / USD).',
      exchangeRates,
    });
  } catch {
    return res.status(200).json({
      countryCode: 'US',
      countryName: 'United States',
      currencyCode: 'USD',
      languageCode: 'en',
      detectionSource: 'default',
      privacyNotice: 'Fallback to default US / USD.',
      exchangeRates: {
        base: 'USD',
        rates: { ...MAINTAINED_FALLBACK_RATES },
        source: 'fallback',
        provider: 'Maintained Reference Dataset',
        updatedAt: new Date().toISOString(),
        isStale: true,
      },
    });
  }
}
