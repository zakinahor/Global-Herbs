import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const COUNTRY_FLAGS: Record<string, { countryCode: string; label: string; fallbackEmoji: string }> = {
  en: { countryCode: 'us', label: 'USA Flag (English)', fallbackEmoji: '🇺🇸' },
  es: { countryCode: 'es', label: 'Spain Flag (Español)', fallbackEmoji: '🇪🇸' },
  fr: { countryCode: 'fr', label: 'France Flag (Français)', fallbackEmoji: '🇫🇷' },
  de: { countryCode: 'de', label: 'Germany Flag (Deutsch)', fallbackEmoji: '🇩🇪' },
  it: { countryCode: 'it', label: 'Italy Flag (Italiano)', fallbackEmoji: '🇮🇹' },
  nl: { countryCode: 'nl', label: 'Netherlands Flag (Nederlands)', fallbackEmoji: '🇳🇱' },
  pt: { countryCode: 'pt', label: 'Portugal Flag (Português)', fallbackEmoji: '🇵🇹' },
  ja: { countryCode: 'jp', label: 'Japan Flag (日本語)', fallbackEmoji: '🇯🇵' },
};

export function LanguageFlag({
  langCode,
  size = 'md',
  className = '',
}: {
  langCode: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const info = COUNTRY_FLAGS[langCode] || { countryCode: 'us', label: 'USA Flag', fallbackEmoji: '🇺🇸' };

  const dimensions =
    size === 'sm'
      ? 'w-4 h-2.5 text-xs'
      : size === 'lg'
      ? 'w-6 h-4 text-base'
      : 'w-5 h-3.5 text-sm';

  if (hasError) {
    return (
      <span
        role="img"
        aria-label={info.label}
        className={`inline-flex items-center justify-center select-none leading-none ${dimensions} ${className}`}
      >
        {info.fallbackEmoji}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-[2px] border border-gray-300/80 shadow-2xs flex-shrink-0 bg-gray-100 ${dimensions} ${className}`}
      title={info.label}
    >
      <img
        src={`https://flagcdn.com/w40/${info.countryCode}.png`}
        srcSet={`https://flagcdn.com/w80/${info.countryCode}.png 2x`}
        alt={info.label}
        className="w-full h-full object-cover rounded-[1px]"
        onError={() => setHasError(true)}
        loading="eager"
      />
    </span>
  );
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguageCode, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFlagInfo = COUNTRY_FLAGS[currentLanguage.code] || {
    countryCode: 'us',
    label: 'USA Flag',
    fallbackEmoji: '🇺🇸',
  };

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition cursor-pointer border border-gray-200"
          aria-label={`Select Language - Current: ${currentFlagInfo.label}`}
          title={currentFlagInfo.label}
        >
          <LanguageFlag langCode={currentLanguage.code} size="md" />
          <ChevronDown size={11} className={`text-gray-500 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 mb-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-left">
            {availableLanguages.map((lang) => {
              const isSelected = lang.code === currentLanguage.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguageCode(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LanguageFlag langCode={lang.code} size="sm" />
                    <span>{lang.nativeName}</span>
                  </div>
                  {isSelected && <Check size={13} className="text-emerald-700" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Dropdown Button with ONLY the country flag for the active language */}
      <button
        id="header-language-switcher-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 text-gray-700 hover:text-emerald-800 transition text-xs px-2 py-1 rounded-md bg-gray-100/90 hover:bg-gray-200/90 border border-gray-200/90 cursor-pointer shadow-2xs"
        title={`Language: ${currentLanguage.name} (${currentFlagInfo.label}) - Click to switch`}
        aria-label={`Select Language - Current: ${currentLanguage.name}`}
      >
        <LanguageFlag langCode={currentLanguage.code} size="md" />
        <ChevronDown
          size={11}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Language Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            <span>Select Language</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {availableLanguages.map((lang) => {
              const isSelected = lang.code === currentLanguage.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguageCode(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LanguageFlag langCode={lang.code} size="md" />
                    <div className="text-left">
                      <span className="font-bold text-gray-900 block leading-tight">{lang.nativeName}</span>
                      <span className="text-[10px] text-gray-400 font-normal">{lang.name}</span>
                    </div>
                  </div>

                  {isSelected && <Check size={14} className="text-emerald-700 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
