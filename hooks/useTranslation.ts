import { useContext, useState, useEffect, useMemo } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import type { Item } from '../types';

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

// New hook for dynamic content
export const useTranslatedItem = (item: Item) => {
    const { language, getTranslatedItem } = useTranslation();
    const [translatedData, setTranslatedData] = useState<Partial<Item> | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (language === 'en') {
            setTranslatedData(null); // Clear translations if language is English
            return;
        }

        const translate = async () => {
            setIsLoading(true);
            const result = await getTranslatedItem(item, language);
            if (isMounted) {
                setTranslatedData(result);
                setIsLoading(false);
            }
        };

        if(item?.id) {
           translate();
        }

        return () => { isMounted = false; };
    }, [item, language, getTranslatedItem]);

    const translatedItem = useMemo(() => {
        // Return original item if no translation is available or needed
        if (language === 'en' || !translatedData) {
            return item;
        }
        return { ...item, ...translatedData };
    }, [item, translatedData, language]);

    return { translatedItem, isLoadingTranslation: isLoading };
}
