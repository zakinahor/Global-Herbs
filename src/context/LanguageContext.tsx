import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleTranslateScript, triggerFullWebsiteTranslation } from '../utils/googleTranslate';
import { TRANSLATIONS, SupportedLanguageCode } from '../data/translations';

export interface Language {
  code: SupportedLanguageCode;
  localeTag: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    localeTag: 'en-US',
    name: 'English',
    nativeName: 'English (US)',
    flag: '🇺🇸',
    dir: 'ltr',
  },
  {
    code: 'es',
    localeTag: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
  },
  {
    code: 'fr',
    localeTag: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
  },
  {
    code: 'de',
    localeTag: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
  },
  {
    code: 'it',
    localeTag: 'it-IT',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    dir: 'ltr',
  },
  {
    code: 'nl',
    localeTag: 'nl-NL',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    dir: 'ltr',
  },
  {
    code: 'pt',
    localeTag: 'pt-PT',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    dir: 'ltr',
  },
  {
    code: 'ja',
    localeTag: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
  },
];

export const DICTIONARY: Record<string, Record<string, string>> = TRANSLATIONS;

const LANG_STORAGE_KEY = 'global_herbs_language';
const LANG_MANUAL_KEY = 'global_herbs_language_manual';
const LANG_COOKIE_NAME = 'gh_lang';

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

export function isSupportedLanguageCode(code: string | null | undefined): code is SupportedLanguageCode {
  if (!code) return false;
  return SUPPORTED_LANGUAGES.some((l) => l.code === code.toLowerCase());
}

export function extractLocaleFromPathname(pathname: string): {
  locale: SupportedLanguageCode | null;
  strippedPath: string;
} {
  const segments = (pathname || '/').split('/').filter(Boolean);
  if (segments.length > 0 && isSupportedLanguageCode(segments[0])) {
    const locale = segments[0].toLowerCase() as SupportedLanguageCode;
    const rest = '/' + segments.slice(1).join('/');
    return { locale, strippedPath: rest === '/' ? '/' : rest };
  }
  return { locale: null, strippedPath: pathname || '/' };
}

/**
 * Detects best matching supported language from browser's navigator.languages / navigator.language
 */
export function detectBrowserLanguage(): SupportedLanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || 'en'];

  for (const raw of candidates) {
    if (!raw) continue;
    const primary = raw.trim().toLowerCase().slice(0, 2);
    if (isSupportedLanguageCode(primary)) {
      return primary;
    }
  }
  return 'en';
}

interface LanguageContextType {
  currentLanguage: Language;
  setLanguageCode: (code: string, isManual?: boolean) => void;
  resetLanguageToAuto: () => void;
  isManualOverride: boolean;
  detectedBrowserLanguage: Language;
  availableLanguages: Language[];
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
  getLocalizedPath: (path: string, targetLangCode?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [detectedBrowserCode] = useState<SupportedLanguageCode>(() => detectBrowserLanguage());

  const [isManualOverride, setIsManualOverride] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LANG_MANUAL_KEY) === 'true' || Boolean(getCookieValue(LANG_COOKIE_NAME));
    } catch {
      return false;
    }
  });

  const [currentCode, setCurrentCode] = useState<SupportedLanguageCode>(() => {
    try {
      if (typeof window !== 'undefined') {
        // 1. Explicit URL path prefix (/es/products) or ?lang= query param
        const { locale: pathLocale } = extractLocaleFromPathname(window.location.pathname);
        if (pathLocale) {
          return pathLocale;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const queryLang = urlParams.get('lang')?.toLowerCase().slice(0, 2);
        if (isSupportedLanguageCode(queryLang)) {
          return queryLang;
        }
      }

      // 2. Saved manual choice in localStorage or cookie
      const saved = localStorage.getItem(LANG_STORAGE_KEY) || getCookieValue(LANG_COOKIE_NAME);
      if (isSupportedLanguageCode(saved)) {
        return saved;
      }

      // 3. Browser navigator.languages / navigator.language
      return detectBrowserLanguage();
    } catch (e) {
      console.debug('Error reading language preference', e);
      return 'en';
    }
  });

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentCode) || SUPPORTED_LANGUAGES[0];

  const detectedBrowserLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === detectedBrowserCode) || SUPPORTED_LANGUAGES[0];

  const applyLanguageCode = useCallback((code: string, isManual: boolean = true) => {
    const normalized = (code || '').toLowerCase().slice(0, 2);
    const target = SUPPORTED_LANGUAGES.find((l) => l.code === normalized) || SUPPORTED_LANGUAGES[0];

    setCurrentCode(target.code);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, target.code);
      if (isManual) {
        localStorage.setItem(LANG_MANUAL_KEY, 'true');
        setCookieValue(LANG_COOKIE_NAME, target.code, 365);
        setIsManualOverride(true);
      }
      document.documentElement.lang = target.code;
      document.documentElement.dir = target.dir || 'ltr';
    } catch (e) {
      console.debug('Error saving language preference', e);
    }

    // If visitor is currently on a locale-prefixed URL (/es/...), update the URL prefix cleanly
    if (typeof window !== 'undefined') {
      const { locale: pathLocale, strippedPath } = extractLocaleFromPathname(window.location.pathname);
      if (pathLocale && pathLocale !== target.code) {
        const nextPath =
          target.code === 'en'
            ? strippedPath
            : `/${target.code}${strippedPath === '/' ? '' : strippedPath}`;
        window.history.replaceState(null, '', `${nextPath}${window.location.search}${window.location.hash}`);
      }
    }

    triggerFullWebsiteTranslation(target.code);
  }, []);

  const resetLanguageToAuto = useCallback(() => {
    const autoLang = detectBrowserLanguage();
    try {
      localStorage.removeItem(LANG_MANUAL_KEY);
      localStorage.setItem(LANG_STORAGE_KEY, autoLang);
      setCookieValue(LANG_COOKIE_NAME, '', -1);
    } catch {
      // ignore
    }
    setIsManualOverride(false);
    setCurrentCode(autoLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = autoLang;
      document.documentElement.dir = 'ltr';
    }
    triggerFullWebsiteTranslation(autoLang);
  }, []);

  // Sync URL locale prefix on initial load or popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLocationSync = () => {
      const { locale: pathLocale } = extractLocaleFromPathname(window.location.pathname);
      if (pathLocale && pathLocale !== currentCode) {
        setCurrentCode(pathLocale);
      }
    };
    window.addEventListener('popstate', handleLocationSync);
    return () => window.removeEventListener('popstate', handleLocationSync);
  }, [currentCode]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage.code;
      document.documentElement.dir = currentLanguage.dir || 'ltr';
    }

    if (currentLanguage.code !== 'en') {
      initGoogleTranslateScript();
      triggerFullWebsiteTranslation(currentLanguage.code);
    }
  }, [currentLanguage]);

  const t = useCallback(
    (key: string, fallback?: string, vars?: Record<string, string | number>): string => {
      const langDict = DICTIONARY[currentCode] || DICTIONARY.en;
      let template = (langDict && langDict[key]) || (DICTIONARY.en && DICTIONARY.en[key]) || fallback || key;

      if (vars) {
        for (const [varKey, varVal] of Object.entries(vars)) {
          template = template.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(varVal));
        }
      }
      return template;
    },
    [currentCode]
  );

  const getLocalizedPath = useCallback(
    (path: string, targetLangCode?: string): string => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const { strippedPath } = extractLocaleFromPathname(cleanPath);
      const langToUse = targetLangCode || currentCode;

      if (typeof window !== 'undefined') {
        const { locale: activeUrlLocale } = extractLocaleFromPathname(window.location.pathname);
        if (!targetLangCode && !activeUrlLocale) {
          return strippedPath;
        }
      }

      if (!langToUse || langToUse === 'en') {
        return strippedPath;
      }
      return `/${langToUse}${strippedPath === '/' ? '' : strippedPath}`;
    },
    [currentCode]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguageCode: applyLanguageCode,
        resetLanguageToAuto,
        isManualOverride,
        detectedBrowserLanguage,
        availableLanguages: SUPPORTED_LANGUAGES,
        t,
        getLocalizedPath,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
