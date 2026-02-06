import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LANGUAGES } from '../../data/languages';
import { useTranslation } from '../../hooks/useTranslation';

const LanguageSelectionPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { setLanguage } = useTranslation();
  const navigate = useNavigate();

  const filteredLanguages = LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectLanguage = async (langCode: string) => {
    await setLanguage(langCode);
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="bg-white dark:bg-dark-background min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-dark-text font-display">Select a Language</h1>
          <div className="max-w-md mx-auto mt-6">
            <input
              type="search"
              placeholder="Search for a language..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-dark-surface border-2 border-gray-200 dark:border-gray-700 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </header>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg text-center hover:bg-primary/10 dark:hover:bg-primary/20 hover:shadow-md transition-all border dark:border-gray-700"
            >
              <p className="font-semibold text-gray-800 dark:text-dark-text">{lang.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{lang.nativeName}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
