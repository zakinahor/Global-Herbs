/**
 * Utility to manage full-website Google Translate integration.
 * Enables the custom language switcher to translate the entire website DOM seamlessly.
 */

declare global {
  interface Window {
    google?: {
      translate: {
        TranslateElement: any;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

// Ensure the Google Translate script is loaded
export function initGoogleTranslateScript() {
  if (typeof window === 'undefined') return;

  // Set up global init callback
  window.googleTranslateElementInit = () => {
    try {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,es,fr,de,it,nl,pt,ja',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE || 0,
          },
          'google_translate_element'
        );
      }
    } catch (err) {
      console.warn('Google translate init error:', err);
    }
  };

  // Check if container div exists
  let elem = document.getElementById('google_translate_element');
  if (!elem) {
    elem = document.createElement('div');
    elem.id = 'google_translate_element';
    elem.style.display = 'none';
    document.body.appendChild(elem);
  }

  // Check if script already exists
  const existingScript = document.getElementById('google-translate-script');
  if (!existingScript) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => {
      console.warn('Google Translate element script failed to load.');
    };
    document.head.appendChild(script);
  }
}

/**
 * Set the Google Translate cookie to target language
 */
function setGoogleTranslateCookie(langCode: string) {
  if (typeof document === 'undefined') return;

  const hostname = window.location.hostname;
  const cookieValue = langCode === 'en' ? '' : `/en/${langCode}`;
  const expires = langCode === 'en' ? 'expires=Thu, 01 Jan 1970 00:00:00 UTC;' : 'max-age=31536000;';

  // Set across all domain scopes and paths
  document.cookie = `googtrans=${cookieValue}; path=/; ${expires}`;
  document.cookie = `googtrans=${cookieValue}; path=/; domain=${hostname}; ${expires}`;
  document.cookie = `googtrans=${cookieValue}; path=/; domain=.${hostname}; ${expires}`;
}

/**
 * Trigger full-website translation into target language
 */
export function triggerFullWebsiteTranslation(langCode: string) {
  if (typeof window === 'undefined') return;

  // Make sure script is initialized
  initGoogleTranslateScript();

  // Set Google Translate cookie
  setGoogleTranslateCookie(langCode);

  let attempts = 0;
  const maxAttempts = 30; // Try for ~3 seconds

  const interval = setInterval(() => {
    attempts++;
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;

    if (select) {
      clearInterval(interval);
      if (select.value !== langCode) {
        select.value = langCode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      // If element didn't load (e.g. offline/blocked), cookie is still saved for next visit
    }
  }, 100);
}
