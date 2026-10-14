import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Cookie, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    try {
      const consent = localStorage.getItem('global_herbs_cookie_consent');
      if (!consent) {
        // Delay slightly for smooth page entry
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleConsent = (choice: 'all' | 'essential') => {
    try {
      localStorage.setItem('global_herbs_cookie_consent', choice);
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-zinc-950/95 text-white backdrop-blur-md border-t border-emerald-900/60 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center flex-shrink-0 text-emerald-400 mt-0.5">
            <Cookie size={17} />
          </div>
          <div className="space-y-1 text-xs leading-relaxed text-gray-300">
            <p className="font-semibold text-white">
              We respect your privacy &amp; secure browsing preferences.
            </p>
            <p className="text-[11px] text-gray-400 max-w-3xl">
              We use essential cookies to maintain your shopping cart, verify 21+ age eligibility, and remember your language &amp; currency preferences. We do not sell personal data. Review our{' '}
              <Link
                to="/privacy"
                className="text-emerald-400 underline hover:text-emerald-300 font-medium inline-block"
              >
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link
                to="/terms"
                className="text-emerald-400 underline hover:text-emerald-300 font-medium inline-block"
              >
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleConsent('essential')}
            className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleConsent('all')}
            className="flex-1 md:flex-none px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Check size={14} />
            <span>Accept All</span>
          </button>
          <button
            type="button"
            onClick={() => handleConsent('essential')}
            className="text-gray-400 hover:text-gray-200 p-1.5 transition ml-1"
            aria-label="Dismiss cookie notice"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
