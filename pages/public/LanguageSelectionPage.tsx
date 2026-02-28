import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LANGUAGES } from '../../data/languages';
import { useTranslation } from '../../hooks/useTranslation';
import { motion } from 'framer-motion';

const LanguageSelectionPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRtl, setIsRtl] = useState(false);
  const { setLanguage, language } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredLanguages = useMemo(() => {
    if (!searchTerm.trim()) return LANGUAGES;

    const term = searchTerm.toLowerCase();
    return LANGUAGES.filter(lang =>
      lang.name.toLowerCase().includes(term) ||
      lang.nativeName.toLowerCase().includes(term) ||
      lang.code.toLowerCase().includes(term)
    ).sort((a, b) => {
      // Prioritize exact matches
      const aNameMatch = a.name.toLowerCase() === term;
      const bNameMatch = b.name.toLowerCase() === term;
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return 0;
    });
  }, [searchTerm]);

  const handleSelectLanguage = async (langCode: string) => {
    await setLanguage(langCode);
    // Go back to previous page or home
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    setIsRtl(['ar', 'he', 'ur'].includes(language));
  }, [language]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-gray-900 dark:to-gray-800 -z-10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back
          </button>

          <h1 className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-display mb-4">
            Select Your Language
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Choose from {LANGUAGES.length}+ languages. Your preference will be saved and applied across the entire platform.
          </p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative max-w-md mx-auto"
          >
            <input
              type="search"
              placeholder="Search languages (e.g., Spanish, Español, es)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
            />
            <svg
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </motion.div>

          {/* Results counter */}
          {searchTerm && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Found {filteredLanguages.length} language{filteredLanguages.length !== 1 ? 's' : ''}
            </p>
          )}
        </motion.header>

        {/* Languages Grid */}
        {filteredLanguages.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filteredLanguages.map((lang, index) => (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`p-5 rounded-xl transition-all duration-300 border-2 group ${
                  language === lang.code
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/50'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-left flex-1">
                    <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {lang.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {lang.nativeName}
                    </p>
                  </div>
                  {language === lang.code && (
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {lang.code}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                    {lang.currency.symbol} {lang.currency.code}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <svg
              className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              No languages found matching "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Clear Search
            </button>
          </motion.div>
        )}

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          <p>
            🌍 All translations are processed locally on your device for complete privacy and offline functionality.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
