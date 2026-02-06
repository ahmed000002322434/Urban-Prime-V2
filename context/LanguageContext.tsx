import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { translations as initialTranslations } from '../data/translations';
import { LANGUAGES, Language } from '../data/languages';
import { translateObject } from '../services/geminiService';
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
  isTranslating: boolean; // For static text
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [loadedTranslations, setLoadedTranslations] = useState<Record<string, any>>(initialTranslations);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dynamicContentCache, setDynamicContentCache] = useState<DynamicContentCache>(new Map());
  const [currency, setCurrency] = useState<Currency>({ code: 'USD', symbol: '$' });

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    const langInfo = LANGUAGES.find(l => l.code === lang);
    if (langInfo) {
      localStorage.setItem('urbanprime-lang', lang);
      setCurrency(langInfo.currency);

      // If translations for the selected language are not already loaded
      if (!loadedTranslations[lang]) {
        setIsTranslating(true);
        setError(null);
        try {
          // Fetch translations from AI service
          const newTranslations = await translateObject(initialTranslations.en, lang);
          setLoadedTranslations(prev => ({ ...prev, [lang]: newTranslations }));
        } catch (e) {
          console.error("Translation failed:", e);
          setError("Could not load translations for this language.");
          // Still set the language; it will fall back to English
        } finally {
          setIsTranslating(false);
        }
      }
      
      setLanguageState(lang);
    }
  }, [loadedTranslations]);
  
  useEffect(() => {
    const savedLang = localStorage.getItem('urbanprime-lang');
    if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
      setLanguage(savedLang);
    }
  }, [setLanguage]);

  const t = useCallback((key: string): string => {
    const currentTranslations = loadedTranslations[language];
    if (currentTranslations) {
        const translatedString = currentTranslations[key];
        if (translatedString) {
            return translatedString;
        }
    }
    // Fallback to English if the language or key is not found.
    return initialTranslations.en[key as keyof typeof initialTranslations['en']] || key;
  }, [language, loadedTranslations]);
  
  const currentLanguageInfo = useMemo(() => LANGUAGES.find(l => l.code === language), [language]);

  const getTranslatedItem = useCallback(async (item: Item, lang: string): Promise<Partial<Item>> => {
      if (!item || lang === 'en') {
          return item;
      }

      const cacheKey = item.id;
      const cachedForLang = dynamicContentCache.get(cacheKey)?.[lang];
      if (cachedForLang) {
          return cachedForLang;
      }

      const toTranslate: Record<string, string> = {};
      if (item.title) toTranslate.title = item.title;
      if (item.description) toTranslate.description = item.description;

      if (Object.keys(toTranslate).length === 0) {
          return item;
      }

      try {
          const result = await translateObject(toTranslate, lang);
          setDynamicContentCache(prevCache => {
              const newCache = new Map(prevCache);
              const existingEntry = newCache.get(cacheKey) || {};
              existingEntry[lang] = result;
              newCache.set(cacheKey, existingEntry);
              return newCache;
          });
          return result;
      } catch (error) {
          console.error(`Failed to translate item ${item.id}`, error);
          return {}; // Return empty on error to avoid breaking UI but prevent re-fetching
      }
  }, [dynamicContentCache]);

  const value = useMemo(() => ({ language, setLanguage, t, getTranslatedItem, currentLanguageInfo, currency, isTranslating }), [language, setLanguage, t, getTranslatedItem, currentLanguageInfo, currency, isTranslating]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
