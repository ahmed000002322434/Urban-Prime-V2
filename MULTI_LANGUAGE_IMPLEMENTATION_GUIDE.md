// MULTI_LANGUAGE_IMPLEMENTATION_GUIDE.md

# Multi-Language Implementation Guide

## Overview
This Urban Prime application now supports **150+ languages** with complete offline functionality. All translations, currency formatting, and localization happens on the client-side without requiring any API calls.

---

## Features

### ✅ 150+ Languages Supported
- All major world languages and dialects
- Complete language metadata (native names, currency, direction)
- RTL (Right-to-Left) support for Arabic, Hebrew, Urdu, Persian, etc.

### ✅ Offline Functionality
- No internet required for language switching
- All translations cached locally in browser
- Works across all pages and components

### ✅ Currency Formatting
- Automatic currency conversion based on selected language
- Uses browser's built-in Intl API for proper formatting
- Supports 50+ currencies with proper symbols and formatting

### ✅ Text Direction Support
- Automatic LTR/RTL detection
- Applied to entire app based on selected language
- Perfect for Arabic, Hebrew, and other RTL languages

---

## How to Use

### 1. Access Language Selection Page
Users can access the language selection page in two ways:

#### Via Header Button
- Click the language flag icon in the header
- Click "Change Language" button
- Search for desired language

#### Direct URL
```
/languages
```

### 2. Using Translation Hook in Components

```tsx
import { useTranslation } from '../hooks/useTranslation';

const MyComponent = () => {
  const { t, formatPrice } = useTranslation();

  return (
    <div>
      <h1>{t('header.home')}</h1>
      <p>{formatPrice(99.99)}</p>
    </div>
  );
};
```

### 3. Formatting Prices

Use the `useCurrencyFormatter` hook:

```tsx
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';

const ProductCard = ({ price }) => {
  const { formatPrice, getCurrency } = useCurrencyFormatter();
  
  return (
    <div>
      <p>Price: {formatPrice(price)}</p>
      <p>Currency: {getCurrency().code}</p>
    </div>
  );
};
```

Or directly from translation context:

```tsx
import { useTranslation } from '../hooks/useTranslation';

const Item = ({ price }) => {
  const { formatPrice } = useTranslation();
  return <span>{formatPrice(price)}</span>;
};
```

### 4. Getting Current Language Info

```tsx
import { useTranslation } from '../hooks/useTranslation';

const MyComponent = () => {
  const { 
    language,              // e.g., 'en', 'es', 'ar'
    currentLanguageInfo,   // Full language object
    currency,              // { code: 'USD', symbol: '$' }
    direction,             // 'ltr' or 'rtl'
    isTranslating          // Boolean for loading state
  } = useTranslation();

  return (
    <div dir={direction}>
      <p>Current Language: {currentLanguageInfo?.name}</p>
      <p>Currency: {currency.code}</p>
      <p>Direction: {direction}</p>
    </div>
  );
};
```

### 5. Changing Language Programmatically

```tsx
import { useTranslation } from '../hooks/useTranslation';

const LanguageSwitcher = () => {
  const { setLanguage } = useTranslation();

  const handleChangeLanguage = async (langCode: string) => {
    await setLanguage(langCode);
    // Language will update throughout the app
  };

  return (
    <button onClick={() => handleChangeLanguage('es')}>
      Switch to Spanish
    </button>
  );
};
```

### 6. Translating Dynamic Content

```tsx
import { useTranslation } from '../hooks/useTranslation';

const ProductDetails = ({ product }) => {
  const { getTranslatedItem } = useTranslation();
  const { translatedItem } = useTranslation();

  // The product title and description will be translated
  return (
    <div>
      <h2>{translatedItem.title}</h2>
      <p>{translatedItem.description}</p>
    </div>
  );
};
```

---

## Architecture

### Services
- **offlineTranslationService.ts**: Handles all offline translation logic
  - `getOfflineTranslation()`: Get translated string for a key
  - `formatPriceOffline()`: Format prices with locale and currency
  - `formatDateOffline()`: Format dates with locale
  - `getLanguageDirection()`: Determine LTR/RTL
  - `translateObjectOffline()`: Translate entire objects

### Context
- **LanguageContext.tsx**: Global language state management
  - Stores current language
  - Manages translation cache
  - Provides currency information
  - Tracks translation status

### Hooks
- **useTranslation.ts**: Main hook for accessing language features
- **useCurrencyFormatter.ts**: Specialized hook for price formatting

### Data
- **data/languages.ts**: List of 150+ languages with metadata
- **data/translations.ts**: Base English translations

### Pages
- **pages/public/LanguageSelectionPage.tsx**: Interactive language selector
  - Search functionality
  - Beautiful grid layout
  - Shows currency and language codes
  - Mobile responsive

### Components
- **Header.tsx**: Language button in header
  - Dropdown menu
  - Link to language selection page
  - Shows current language and currency

---

## Language Features

### Supported Languages (150+)

**Major Languages**
- English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Bengali, Vietnamese, Turkish, and many more...

**Asian Languages**
- Chinese (Simplified & Traditional), Japanese, Korean, Thai, Vietnamese, Indonesian, Filipino, Burmese, Khmer, Lao, and more

**South Asian Languages**
- Hindi, Bengali, Punjabi, Gujarati, Marathi, Tamil, Telugu, Malayalam, Kannada, Urdu, and more

**European Languages**
- English, French, German, Spanish, Italian, Portuguese, Russian, Polish, Ukrainian, Romanian, Dutch, Greek, Swedish, Danish, Norwegian, Finnish, Czech, Hungarian, and more

**Middle Eastern & African**
- Arabic, Hebrew, Persian, Turkish, Kurdish, Pashto, Amharic, Somali, Swahili, Yoruba, Igbo, Hausa, and more

**Other Languages**
- Afrikaans, Catalan, Welsh, Basque, Galician, Icelandic, Albanian, Serbian, Croatian, Bulgarian, and more

---

## Currency Support

Each language is associated with a **default currency** appropriate for that language region:

### Examples:
```
English (en)      → USD ($)
Spanish (es)      → EUR (€)
Hindi (hi)        → INR (₹)
Arabic (ar)       → SAR (ر.س)
Japanese (ja)     → JPY (¥)
Brazilian (pt-br) → BRL (R$)
Turkish (tr)      → TRY (₺)
```

### Currency Formatting
Prices are formatted according to locale standards:
- **en-US**: $99.99
- **de-DE**: 99,99 €
- **fr-FR**: 99,99 €
- **ja-JP**: ¥10000
- **hi-IN**: ₹99.99

---

## Offline Implementation

### How It Works
1. **On Language Selection**: The app uses pre-loaded translation dictionaries
2. **No API Calls**: All translations happen client-side using JavaScript
3. **Browser Intl API**: Uses native browser APIs for formatting numbers, dates, and currency
4. **Local Storage**: Saves user's language preference
5. **Automatic Application**: Changes apply immediately across entire app

### Benefits
✅ Works completely offline
✅ No network requests needed
✅ Instant language switching
✅ Better privacy (no translation data sent to server)
✅ Faster performance
✅ No API rate limits

---

## Adding New Translations

To add new translation strings:

1. **Edit data/translations.ts**
```typescript
export const translations = {
  en: {
    'my.new.key': 'My English text',
    ...
  },
  es: {
    'my.new.key': 'Mi texto en español',
    ...
  },
  // Add for other languages
};
```

2. **Use in Component**
```tsx
const { t } = useTranslation();
<p>{t('my.new.key')}</p>
```

---

## Browser Compatibility

- ✅ Chrome/Edge 24+
- ✅ Firefox 29+
- ✅ Safari 11+
- ✅ Opera 15+
- ✅ All modern mobile browsers

RTL and Intl APIs are supported on all modern browsers.

---

## Performance Considerations

- **Lazy Loading**: Translations are loaded on-demand
- **Caching**: Translations cached in component state
- **Memory Efficient**: Uses Map for dynamic content caching
- **No Bundle Impact**: Minimal increase to bundle size

---

## Troubleshooting

### Language not changing?
- Clear browser cache and local storage
- Try a hard refresh (Ctrl+Shift+R)
- Check browser console for errors

### Prices not formatting correctly?
- Check if currency code is valid
- Verify language code is in LANGUAGES array
- Ensure formatPrice is called with number type

### Text direction not RTL?
- Language must be in RTL languages array or in selected language
- Check if page applies `dir` attribute to root element
- CSS `direction` property might be overriding

---

## Code Examples

### Example 1: Product Card with Multi-Language Support

```tsx
import { useTranslation } from '../hooks/useTranslation';

const ProductCard: React.FC<{ product: Item }> = ({ product }) => {
  const { t, formatPrice, language } = useTranslation();

  return (
    <div>
      <img src={product.imageUrl} alt={product.title} />
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <p className="text-lg font-bold">
        {formatPrice(product.price)}
      </p>
      <button>
        {t('add_to_cart')}
      </button>
    </div>
  );
};
```

### Example 2: Language Switcher Component

```tsx
import { useTranslation } from '../hooks/useTranslation';
import { LANGUAGES } from '../data/languages';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name} ({lang.nativeName})
        </option>
      ))}
    </select>
  );
};
```

### Example 3: RTL-Aware Layout

```tsx
import { useTranslation } from '../hooks/useTranslation';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { direction } = useTranslation();

  return (
    <div dir={direction} className={direction === 'rtl' ? 'text-right' : 'text-left'}>
      {children}
    </div>
  );
};
```

---

## Future Enhancements

- [ ] Add more language-specific translations
- [ ] Community translation contributions
- [ ] Automatic language detection from browser settings
- [ ] Support for custom language packs
- [ ] Translation versioning and updates

---

## Support

For issues or questions:
1. Check this guide first
2. Look at example components
3. Review console for error messages
4. Check data/languages.ts for supported languages

---

Last Updated: February 21, 2026
