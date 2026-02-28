// hooks/useCurrencyFormatter.ts
import { useTranslation } from './useTranslation';

export const useCurrencyFormatter = () => {
  const { formatPrice, currency, language } = useTranslation();

  return {
    /**
     * Format a price with current language and currency
     */
    formatPrice,
    
    /**
     * Format a price with a specific currency code
     */
    formatPriceWithCurrency: (amount: number, currencyCode: string): string => {
      try {
        const localeMap: Record<string, string> = {
          en: 'en-US',
          es: 'es-ES',
          fr: 'fr-FR',
          de: 'de-DE',
          it: 'it-IT',
          pt: 'pt-BR',
          'pt-br': 'pt-BR',
          ru: 'ru-RU',
          ja: 'ja-JP',
          ko: 'ko-KR',
          zh: 'zh-CN',
          'zh-tw': 'zh-TW',
          ar: 'ar-SA',
          hi: 'hi-IN',
          bn: 'bn-BD',
          pa: 'pa-IN',
          vi: 'vi-VN',
          tr: 'tr-TR',
          id: 'id-ID',
          ms: 'ms-MY',
          th: 'th-TH',
        };

        const locale = localeMap[language] || `${language.split('-')[0]}-${language.toUpperCase()}`;

        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch (error) {
        const currencySymbols: Record<string, string> = {
          USD: '$',
          EUR: '€',
          GBP: '£',
          JPY: '¥',
          INR: '₹',
          CNY: '¥',
          KRW: '₩',
          BRL: 'R$',
          RUB: '₽',
          TRY: '₺',
          ILS: '₪',
          IDR: 'Rp',
          MYR: 'RM',
          THB: '฿',
          ZAR: 'R',
          PKR: 'Rs',
          BDT: '৳',
          VND: '₫',
        };

        const symbol = currencySymbols[currencyCode] || currencyCode;
        return `${symbol}${amount.toFixed(2)}`;
      }
    },

    /**
     * Get currency information
     */
    getCurrency: () => currency,

    /**
     * Get current language
     */
    getLanguage: () => language,
  };
};
