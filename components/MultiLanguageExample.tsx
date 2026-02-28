// components/MultiLanguageExample.tsx
// Example component showing how to use the multi-language features

import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { LANGUAGES } from '../data/languages';
import { useNavigate } from 'react-router-dom';

/**
 * Example component demonstrating multi-language functionality
 * Shows how to:
 * 1. Use translation hook
 * 2. Format prices with currency
 * 3. Get language information
 * 4. Navigate to language selection page
 */
const MultiLanguageExample: React.FC = () => {
  const { 
    t,                      // Translation function
    language,               // Current language code
    currentLanguageInfo,    // Full language info
    currency,               // Currency info
    direction,              // Text direction (ltr/rtl)
    formatPrice,            // Price formatter
    setLanguage,            // Change language function
  } = useTranslation();

  const { formatPriceWithCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

  // Example price for demonstration
  const examplePrice = 99.99;
  const examplePrices = {
    USD: 99.99,
    EUR: 89.99,
    GBP: 79.99,
    JPY: 11000,
    INR: 8499,
  };

  return (
    <div dir={direction} className={direction === 'rtl' ? 'text-right' : 'text-left'}>
      <div className="max-w-4xl mx-auto p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl">
        
        {/* Header */}
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Multi-Language Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          This component demonstrates the multi-language features of Urban Prime
        </p>

        {/* Current Language Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Language Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 text-text-primary">Current Language</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Language Name</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currentLanguageInfo?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Native Name</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currentLanguageInfo?.nativeName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Language Code</p>
                <p className="font-mono text-lg text-primary">{language}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Text Direction</p>
                <p className="text-lg font-semibold text-text-primary uppercase">
                  {direction}
                </p>
              </div>
            </div>
          </div>

          {/* Currency Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 text-text-primary">Current Currency</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Currency Code</p>
                <p className="text-lg font-semibold text-text-primary">
                  {currency.code}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Symbol</p>
                <p className="text-3xl font-bold text-primary mb-3">{currency.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Example Price</p>
                <p className="text-2xl font-bold text-text-primary">
                  {formatPrice(examplePrice)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Translation Examples */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-text-primary">Translation Examples</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Key: 'header.home'</p>
              <p className="text-lg font-semibold text-text-primary">{t('header.home')}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Key: 'header.products'</p>
              <p className="text-lg font-semibold text-text-primary">{t('header.explore')}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Key: 'add_to_cart'</p>
              <p className="text-lg font-semibold text-text-primary">{t('add_to_cart')}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Key: 'language'</p>
              <p className="text-lg font-semibold text-text-primary">{t('language')}</p>
            </div>
          </div>
        </div>

        {/* Price Formatting Examples */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-text-primary">Price Formatting Examples</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-text-primary">Currency</th>
                  <th className="px-4 py-2 text-left font-bold text-text-primary">Amount</th>
                  <th className="px-4 py-2 text-left font-bold text-text-primary">Formatted</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(examplePrices).map(([curr, price]) => (
                  <tr key={curr} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 font-mono text-primary">{curr}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{price}</td>
                    <td className="px-4 py-2 font-bold text-text-primary">
                      {formatPriceWithCurrency(price, curr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Languages */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-text-primary">
            Available Languages ({LANGUAGES.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`p-2 rounded-lg text-sm font-semibold transition-all ${
                  language === lang.code
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-text-primary hover:bg-primary/10'
                }`}
                title={`${lang.name} - ${lang.currency.code}`}
              >
                {lang.code.toUpperCase()} {language === lang.code ? '✓' : ''}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/languages')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-shadow"
          >
            Open Full Language Selector
          </button>
        </div>

        {/* Features List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4 text-text-primary">Key Features</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <span className="text-text-primary">150+ languages with offline support</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <span className="text-text-primary">Automatic currency formatting based on language</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <span className="text-text-primary">LTR/RTL text direction support</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <span className="text-text-primary">Instant language switching with no page reload</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <span className="text-text-primary">Full-site translation including dynamic content</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <span className="text-text-primary">Zero API calls - everything works offline</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MultiLanguageExample;
