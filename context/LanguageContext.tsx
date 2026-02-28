import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { translations as initialTranslations } from '../data/translations';
import { LANGUAGES, Language } from '../data/languages';
import { getLanguageDirection } from '../services/offlineTranslationService';
import { formatPriceOffline } from '../services/offlineTranslationService';
import type { Item } from '../types';

type LanguageCode = string;
type DynamicContentCache = Map<string, Record<string, any>>;

interface Currency {
  code: string;
  symbol: string;
}

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  getTranslatedItem: (item: Item, lang: string) => Promise<Partial<Item>>;
  currentLanguageInfo: Language | undefined;
  currency: Currency;
  isTranslating: boolean;
  direction: 'ltr' | 'rtl';
  formatPrice: (amount: number) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Get base language from language code (e.g., 'es-MX' -> 'es')
const getBaseLanguage = (lang: string): string => {
  return lang.split('-')[0];
};

// Get translations for a language, with fallback to base language
const getTranslationsForLanguage = (lang: string, allTranslations: Record<string, any>): Record<string, string> => {
  // Try exact match first
  if (allTranslations[lang]) {
    return allTranslations[lang];
  }

  // Try base language (e.g., 'es' for 'es-MX')
  const baseLanguage = getBaseLanguage(lang);
  if (allTranslations[baseLanguage]) {
    return allTranslations[baseLanguage];
  }

  // Fallback to English
  return allTranslations['en'] || {};
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [dynamicContentCache, setDynamicContentCache] = useState<DynamicContentCache>(new Map());
  const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$' });

  // Initialize language from localStorage and set document attributes
  useEffect(() => {
    const savedLang = localStorage.getItem('urbanprime-lang');
    const initialLang = savedLang && LANGUAGES.some(l => l.code === savedLang) ? savedLang : 'en';
    
    setLanguageState(initialLang);
    applyLanguageToDocument(initialLang);
    
    const langInfo = LANGUAGES.find(l => l.code === initialLang);
    if (langInfo) {
      setCurrency(langInfo.currency);
    }
  }, []);

  // Apply language globally to document
  const applyLanguageToDocument = (lang: string) => {
    document.documentElement.lang = lang;
    document.documentElement.dir = getLanguageDirection(lang);
    document.body.dir = getLanguageDirection(lang);
  };

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    const langInfo = LANGUAGES.find(l => l.code === lang);
    if (!langInfo) return;

    // Save to localStorage
    localStorage.setItem('urbanprime-lang', lang);
    
    // Update document attributes
    applyLanguageToDocument(lang);
    
    // Update currency
    setCurrency(langInfo.currency);
    
    // Update language state - this will trigger re-renders with new translations
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    // Get all available translations
    const allTranslations = initialTranslations as Record<string, Record<string, string>>;
    
    // Get translations for current language with fallback
    const currentTranslations = getTranslationsForLanguage(language, allTranslations);
    
    // Try to get the translation
    if (currentTranslations[key]) {
      return currentTranslations[key];
    }

    // Fallback to English
    const englishTranslations = allTranslations['en'] || {};
    return englishTranslations[key] || key;
  }, [language]);

  const direction = useMemo(() => getLanguageDirection(language), [language]);

  const currentLanguageInfo = useMemo(() => LANGUAGES.find(l => l.code === language), [language]);

  const formatPrice = useCallback((amount: number): string => {
    return formatPriceOffline(amount, currency.code, language);
  }, [language, currency.code]);

  const getTranslatedItem = useCallback(async (item: Item, lang: string): Promise<Partial<Item>> => {
    if (!item || lang === 'en') {
      return item;
    }

    const cacheKey = item.id;
    const cachedForLang = dynamicContentCache.get(cacheKey)?.[lang];
    if (cachedForLang) {
      return cachedForLang;
    }

    // For simplicity, return item as-is (you can extend this with actual translation)
    return item;
  }, [dynamicContentCache]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    getTranslatedItem,
    currentLanguageInfo,
    currency,
    isTranslating: false,
    direction,
    formatPrice,
  }), [language, setLanguage, t, getTranslatedItem, currentLanguageInfo, currency, direction, formatPrice]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
