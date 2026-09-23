import React, { createContext, useContext, useState, useEffect } from 'react';
import { initGoogleTranslateScript, triggerFullWebsiteTranslation } from '../utils/googleTranslate';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English (US)',
    flag: '🇺🇸',
    dir: 'ltr',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    dir: 'ltr',
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    dir: 'ltr',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    dir: 'ltr',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
  },
];

export const DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    'nav.shopAll': 'Shop All',
    'nav.flowers': 'Flowers',
    'nav.vapes': 'Vapes',
    'nav.concentrates': 'Concentrates',
    'nav.edibles': 'Edibles',
    'nav.prerolls': 'Pre-Rolls',
    'nav.cbd': 'CBD & Wellness',
    'nav.accessories': 'Accessories',
    'nav.blog': 'Knowledge Hub',
    'nav.about': 'About Us',
    'nav.shipping': 'Shipping Policy',
    'nav.contact': 'Contact',
    'nav.refunds': 'Refunds',
    'nav.terms': 'Terms & Conditions',
    'nav.account': 'Account / Login',
    'nav.cart': 'Cart',
    'nav.searchPlaceholder': 'Search premium products...',
    'nav.allCategories': 'All Categories',
    'nav.freeShipping': 'Free Shipping on all Orders above',
    'nav.dispensingHours': 'Dispensing 24/7 Mon - Sat',
    'btn.addToCart': 'Add To Cart',
    'btn.adding': 'Adding...',
    'btn.quickView': 'Quick View',
    'btn.proceedCheckout': 'Proceed to Checkout',
    'btn.clearCart': 'Clear Cart',
    'btn.apply': 'Apply',
    'btn.completeOrder': 'Complete Order',
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your Cart is Empty',
    'cart.subtotal': 'Subtotal',
    'cart.deliveryFee': 'Delivery Fee',
    'cart.total': 'Order Total',
    'trust.discrete': 'Discreet Worldwide Delivery',
    'trust.labTested': '100% Certified Organic & Lab Tested',
    'trust.stealth': 'Double Vacuum Sealed Packaging',
    'currency.toggleTooltip': 'Switch Currency',
    'language.select': 'Select Language',
  },
  es: {
    'nav.shopAll': 'Ver Todo',
    'nav.flowers': 'Flores',
    'nav.vapes': 'Vaporizadores',
    'nav.concentrates': 'Concentrados',
    'nav.edibles': 'Comestibles',
    'nav.prerolls': 'Pre-Rolados',
    'nav.cbd': 'CBD y Bienestar',
    'nav.accessories': 'Accesorios',
    'nav.blog': 'Guías y Blog',
    'nav.about': 'Sobre Nosotros',
    'nav.shipping': 'Envíos Discretos',
    'nav.contact': 'Contacto',
    'nav.refunds': 'Reembolsos',
    'nav.terms': 'Términos y Condiciones',
    'nav.account': 'Cuenta / Acceder',
    'nav.cart': 'Carrito',
    'nav.searchPlaceholder': 'Buscar productos premium...',
    'nav.allCategories': 'Todas las Categorías',
    'nav.freeShipping': 'Envío Gratis en pedidos superiores a',
    'nav.dispensingHours': 'Despacho 24/7 Lun - Sáb',
    'btn.addToCart': 'Añadir al Carrito',
    'btn.adding': 'Añadiendo...',
    'btn.quickView': 'Vista Rápida',
    'btn.proceedCheckout': 'Ir a Finalizar Compra',
    'btn.clearCart': 'Vaciar Carrito',
    'btn.apply': 'Aplicar',
    'btn.completeOrder': 'Completar Pedido',
    'cart.title': 'Carrito de Compras',
    'cart.empty': 'Tu carrito está vacío',
    'cart.subtotal': 'Subtotal',
    'cart.deliveryFee': 'Costo de Envío',
    'cart.total': 'Total del Pedido',
    'trust.discrete': 'Envío Discreto a Todo el Mundo',
    'trust.labTested': '100% Orgánico y Probado en Laboratorio',
    'trust.stealth': 'Empaque con Doble Sellado al Vacío',
    'currency.toggleTooltip': 'Cambiar Moneda',
    'language.select': 'Seleccionar Idioma',
  },
  fr: {
    'nav.shopAll': 'Tout Voir',
    'nav.flowers': 'Fleurs',
    'nav.vapes': 'Vaporisateurs',
    'nav.concentrates': 'Concentrés',
    'nav.edibles': 'Comestibles',
    'nav.prerolls': 'Pré-Roulés',
    'nav.cbd': 'CBD & Bien-être',
    'nav.accessories': 'Accessoires',
    'nav.blog': 'Guides & Blog',
    'nav.about': 'À Propos',
    'nav.shipping': 'Livraison Discrète',
    'nav.contact': 'Contact',
    'nav.refunds': 'Remboursements',
    'nav.terms': 'Conditions Générales',
    'nav.account': 'Compte / Connexion',
    'nav.cart': 'Panier',
    'nav.searchPlaceholder': 'Rechercher des produits...',
    'nav.allCategories': 'Toutes les Catégories',
    'nav.freeShipping': 'Livraison gratuite pour les commandes supérieures à',
    'nav.dispensingHours': 'Expédition 24/7 Lun - Sam',
    'btn.addToCart': 'Ajouter au Panier',
    'btn.adding': 'Ajout en cours...',
    'btn.quickView': 'Aperçu Rapide',
    'btn.proceedCheckout': 'Passer à la Caisse',
    'btn.clearCart': 'Vider le Panier',
    'btn.apply': 'Appliquer',
    'btn.completeOrder': 'Finaliser la Commande',
    'cart.title': 'Panier d\'Achat',
    'cart.empty': 'Votre panier est vide',
    'cart.subtotal': 'Sous-total',
    'cart.deliveryFee': 'Frais de Livraison',
    'cart.total': 'Total de la Commande',
    'trust.discrete': 'Livraison Mondiale Discrète',
    'trust.labTested': '100% Biologique et Testé en Laboratoire',
    'trust.stealth': 'Emballage Double Scellé sous Vide',
    'currency.toggleTooltip': 'Changer de Devise',
    'language.select': 'Choisir la Langue',
  },
  de: {
    'nav.shopAll': 'Alle Produkte',
    'nav.flowers': 'Blüten',
    'nav.vapes': 'Vaporizer',
    'nav.concentrates': 'Konzentrate',
    'nav.edibles': 'Edibles',
    'nav.prerolls': 'Pre-Rolls',
    'nav.cbd': 'CBD & Wellness',
    'nav.accessories': 'Zubehör',
    'nav.blog': 'Ratgeber & Blog',
    'nav.about': 'Über Uns',
    'nav.shipping': 'Diskreter Versand',
    'nav.contact': 'Kontakt',
    'nav.refunds': 'Rückerstattung',
    'nav.terms': 'AGB',
    'nav.account': 'Konto / Anmelden',
    'nav.cart': 'Warenkorb',
    'nav.searchPlaceholder': 'Premium-Produkte suchen...',
    'nav.allCategories': 'Alle Kategorien',
    'nav.freeShipping': 'Kostenloser Versand ab',
    'nav.dispensingHours': 'Versand 24/7 Mo - Sa',
    'btn.addToCart': 'In den Warenkorb',
    'btn.adding': 'Wird hinzugefügt...',
    'btn.quickView': 'Schnellansicht',
    'btn.proceedCheckout': 'Zur Kasse gehen',
    'btn.clearCart': 'Warenkorb leeren',
    'btn.apply': 'Anwenden',
    'btn.completeOrder': 'Bestellung abschließen',
    'cart.title': 'Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer',
    'cart.subtotal': 'Zwischensumme',
    'cart.deliveryFee': 'Versandkosten',
    'cart.total': 'Gesamtsumme',
    'trust.discrete': 'Diskreter weltweiter Versand',
    'trust.labTested': '100% Bio & Laborgeprüft',
    'trust.stealth': 'Doppelt vakuumversiegelte Verpackung',
    'currency.toggleTooltip': 'Währung wechseln',
    'language.select': 'Sprache auswählen',
  },
  it: {
    'nav.shopAll': 'Tutti i Prodotti',
    'nav.flowers': 'Fiori',
    'nav.vapes': 'Vaporizzatori',
    'nav.concentrates': 'Concentrati',
    'nav.edibles': 'Edibili',
    'nav.prerolls': 'Pre-Roll',
    'nav.cbd': 'CBD & Benessere',
    'nav.accessories': 'Accessori',
    'nav.blog': 'Guide & Blog',
    'nav.about': 'Chi Siamo',
    'nav.shipping': 'Spedizione Discreta',
    'nav.contact': 'Contatti',
    'nav.refunds': 'Rimborsi',
    'nav.terms': 'Termini e Condizioni',
    'nav.account': 'Account / Accedi',
    'nav.cart': 'Carrello',
    'nav.searchPlaceholder': 'Cerca prodotti premium...',
    'nav.allCategories': 'Tutte le Categorie',
    'nav.freeShipping': 'Spedizione gratuita per ordini superiori a',
    'nav.dispensingHours': 'Spedizioni 24/7 Lun - Sab',
    'btn.addToCart': 'Aggiungi al Carrello',
    'btn.adding': 'Aggiunta in corso...',
    'btn.quickView': 'Visualizzazione Rapida',
    'btn.proceedCheckout': 'Procedi al Checkout',
    'btn.clearCart': 'Svuota Carrello',
    'btn.apply': 'Applica',
    'btn.completeOrder': 'Completa Ordine',
    'cart.title': 'Carrello della Spesa',
    'cart.empty': 'Il tuo carrello è vuoto',
    'cart.subtotal': 'Subtotale',
    'cart.deliveryFee': 'Spese di Spedizione',
    'cart.total': 'Totale Ordine',
    'trust.discrete': 'Spedizione Mondiale Discreta',
    'trust.labTested': '100% Biologico e Certificato da Laboratorio',
    'trust.stealth': 'Imballaggio a Doppio Vuoto Inodore',
    'currency.toggleTooltip': 'Cambia Valuta',
    'language.select': 'Seleziona Lingua',
  },
  nl: {
    'nav.shopAll': 'Alles Bekijken',
    'nav.flowers': 'Wiet Toppen',
    'nav.vapes': 'Vapes',
    'nav.concentrates': 'Concentraten',
    'nav.edibles': 'Edibles',
    'nav.prerolls': 'Pre-Rolls',
    'nav.cbd': 'CBD & Welzijn',
    'nav.accessories': 'Accessoires',
    'nav.blog': 'Gidsen & Blog',
    'nav.about': 'Over Ons',
    'nav.shipping': 'Discrete Verzending',
    'nav.contact': 'Contact',
    'nav.refunds': 'Terugbetalingen',
    'nav.terms': 'Algemene Voorwaarden',
    'nav.account': 'Account / Inloggen',
    'nav.cart': 'Winkelmand',
    'nav.searchPlaceholder': 'Zoek premium producten...',
    'nav.allCategories': 'Alle Categorieën',
    'nav.freeShipping': 'Gratis verzending voor bestellingen boven',
    'nav.dispensingHours': 'Verzending 24/7 Ma - Za',
    'btn.addToCart': 'In Winkelmand',
    'btn.adding': 'Toevoegen...',
    'btn.quickView': 'Snelle Weergave',
    'btn.proceedCheckout': 'Afrekenen',
    'btn.clearCart': 'Winkelmand Legen',
    'btn.apply': 'Toepassen',
    'btn.completeOrder': 'Bestelling Afronden',
    'cart.title': 'Winkelwagen',
    'cart.empty': 'Je winkelwagen is leeg',
    'cart.subtotal': 'Subtotaal',
    'cart.deliveryFee': 'Verzendkosten',
    'cart.total': 'Totaal',
    'trust.discrete': 'Discrete Wereldwijde Verzending',
    'trust.labTested': '100% Biologisch & Laboratorium Getest',
    'trust.stealth': 'Dubbel Vacuüm Verzegeld',
    'currency.toggleTooltip': 'Wissel Valuta',
    'language.select': 'Kies Taal',
  },
  pt: {
    'nav.shopAll': 'Ver Todos',
    'nav.flowers': 'Flores',
    'nav.vapes': 'Vapes',
    'nav.concentrates': 'Concentrados',
    'nav.edibles': 'Comestíveis',
    'nav.prerolls': 'Pré-Enrolados',
    'nav.cbd': 'CBD e Bem-Estar',
    'nav.accessories': 'Acessórios',
    'nav.blog': 'Guias e Blog',
    'nav.about': 'Sobre Nós',
    'nav.shipping': 'Envio Discreto',
    'nav.contact': 'Contato',
    'nav.refunds': 'Reembolsos',
    'nav.terms': 'Termos e Condições',
    'nav.account': 'Conta / Entrar',
    'nav.cart': 'Carrinho',
    'nav.searchPlaceholder': 'Pesquisar produtos premium...',
    'nav.allCategories': 'Todas as Categorias',
    'nav.freeShipping': 'Frete Grátis para pedidos acima de',
    'nav.dispensingHours': 'Despacho 24/7 Seg - Sáb',
    'btn.addToCart': 'Adicionar ao Carrinho',
    'btn.adding': 'Adicionando...',
    'btn.quickView': 'Visualização Rápida',
    'btn.proceedCheckout': 'Finalizar Compra',
    'btn.clearCart': 'Limpar Carrinho',
    'btn.apply': 'Aplicar',
    'btn.completeOrder': 'Concluir Pedido',
    'cart.title': 'Carrinho de Compras',
    'cart.empty': 'Seu carrinho está vazio',
    'cart.subtotal': 'Subtotal',
    'cart.deliveryFee': 'Taxa de Entrega',
    'cart.total': 'Total do Pedido',
    'trust.discrete': 'Envio Discreto Mundial',
    'trust.labTested': '100% Orgânico e Testado em Laboratório',
    'trust.stealth': 'Embalagem com Duplo Selamento a Vácuo',
    'currency.toggleTooltip': 'Trocar Moeda',
    'language.select': 'Selecionar Idioma',
  },
  ja: {
    'nav.shopAll': '全商品を見る',
    'nav.flowers': 'フラワー',
    'nav.vapes': 'ベイプ',
    'nav.concentrates': 'コンセントレート',
    'nav.edibles': 'エディブル',
    'nav.prerolls': 'プレロール',
    'nav.cbd': 'CBD＆ウェルネス',
    'nav.accessories': 'アクセサリー',
    'nav.blog': 'ガイド＆ブログ',
    'nav.about': '当店について',
    'nav.shipping': '配送ポリシー',
    'nav.contact': 'お問い合わせ',
    'nav.refunds': '返品・返金',
    'nav.terms': '利用規約',
    'nav.account': 'マイページ / ログイン',
    'nav.cart': 'カート',
    'nav.searchPlaceholder': 'プレミアム商品を検索...',
    'nav.allCategories': 'すべてのカテゴリー',
    'nav.freeShipping': '送料無料ライン（対象金額以上）',
    'nav.dispensingHours': '年中無休 24/7 発送対応',
    'btn.addToCart': 'カートに追加',
    'btn.adding': '追加中...',
    'btn.quickView': 'クイックビュー',
    'btn.proceedCheckout': 'レジに進む',
    'btn.clearCart': 'カートを空にする',
    'btn.apply': '適用',
    'btn.completeOrder': '注文を確定する',
    'cart.title': 'ショッピングカート',
    'cart.empty': 'カートに商品がありません',
    'cart.subtotal': '小計',
    'cart.deliveryFee': '送料',
    'cart.total': '合計金額',
    'trust.discrete': '世界中へ安心の完全ステルス配送',
    'trust.labTested': '100% オーガニック＆第三者機関ラボ検査済み',
    'trust.stealth': '二重真空パック無臭包装',
    'currency.toggleTooltip': '通貨を切り替える',
    'language.select': '言語を選択',
  },
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguageCode: (code: string) => void;
  availableLanguages: Language[];
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentCode, setCurrentCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('global_herbs_language');
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
      // Check browser language
      const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGUAGES.some((l) => l.code === browserLang)) {
        return browserLang;
      }
    } catch (e) {
      console.debug('Error reading language from storage', e);
    }
    return 'en';
  });

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentCode) || SUPPORTED_LANGUAGES[0];

  const setLanguageCode = (code: string) => {
    const target = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (target) {
      setCurrentCode(target.code);
      try {
        localStorage.setItem('global_herbs_language', target.code);
        document.documentElement.lang = target.code;
        document.documentElement.dir = target.dir || 'ltr';
      } catch (e) {
        console.debug('Error saving language', e);
      }

      // Trigger full website translation via Google Translate
      triggerFullWebsiteTranslation(target.code);
    }
  };

  useEffect(() => {
    document.documentElement.lang = currentLanguage.code;
    document.documentElement.dir = currentLanguage.dir || 'ltr';

    // Initialize full website translation script
    initGoogleTranslateScript();
    if (currentLanguage.code !== 'en') {
      triggerFullWebsiteTranslation(currentLanguage.code);
    }
  }, [currentLanguage]);

  const t = (key: string, fallback?: string): string => {
    const langDict = DICTIONARY[currentCode] || DICTIONARY.en;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    if (DICTIONARY.en && DICTIONARY.en[key]) {
      return DICTIONARY.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguageCode,
        availableLanguages: SUPPORTED_LANGUAGES,
        t,
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
