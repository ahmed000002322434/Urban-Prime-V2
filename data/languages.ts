// data/languages.ts
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  currency: {
    code: string;
    symbol: string;
  };
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', currency: { code: 'USD', symbol: '$' } },
  { code: 'es', name: 'Spanish', nativeName: 'Español', currency: { code: 'EUR', symbol: '€' } },
  { code: 'fr', name: 'French', nativeName: 'Français', currency: { code: 'EUR', symbol: '€' } },
  { code: 'de', name: 'German', nativeName: 'Deutsch', currency: { code: 'EUR', symbol: '€' } },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', currency: { code: 'EUR', symbol: '€' } },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', currency: { code: 'BRL', symbol: 'R$' } },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', currency: { code: 'RUB', symbol: '₽' } },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', currency: { code: 'JPY', symbol: '¥' } },
  { code: 'ko', name: 'Korean', nativeName: '한국어', currency: { code: 'KRW', symbol: '₩' } },
  { code: 'zh', name: 'Chinese', nativeName: '中文', currency: { code: 'CNY', symbol: '¥' } },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', currency: { code: 'SAR', symbol: 'ر.س' } },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', currency: { code: 'INR', symbol: '₹' } },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', currency: { code: 'BDT', symbol: '৳' } },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', currency: { code: 'INR', symbol: '₹' } },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', currency: { code: 'IDR', symbol: 'Rp' } },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', currency: { code: 'VND', symbol: '₫' } },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', currency: { code: 'INR', symbol: '₹' } },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', currency: { code: 'INR', symbol: '₹' } },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', currency: { code: 'INR', symbol: '₹' } },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', currency: { code: 'TRY', symbol: '₺' } },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', currency: { code: 'PKR', symbol: 'Rs' } },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', currency: { code: 'INR', symbol: '₹' } },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', currency: { code: 'PLN', symbol: 'zł' } },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', currency: { code: 'UAH', symbol: '₴' } },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', currency: { code: 'RON', symbol: 'lei' } },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', currency: { code: 'EUR', symbol: '€' } },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', currency: { code: 'EUR', symbol: '€' } },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', currency: { code: 'HUF', symbol: 'Ft' } },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', currency: { code: 'SEK', symbol: 'kr' } },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', currency: { code: 'CZK', symbol: 'Kč' } },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', currency: { code: 'EUR', symbol: '€' } },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', currency: { code: 'DKK', symbol: 'kr' } },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', currency: { code: 'NOK', symbol: 'kr' } },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', currency: { code: 'ILS', symbol: '₪' } },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', currency: { code: 'IDR', symbol: 'Rp' } },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', currency: { code: 'MYR', symbol: 'RM' } },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', currency: { code: 'THB', symbol: '฿' } },
];
