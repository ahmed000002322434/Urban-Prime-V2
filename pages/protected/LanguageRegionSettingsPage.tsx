import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { LANGUAGES } from '../../data/languages';

const LanguageRegionSettingsPage: React.FC = () => {
  const { language, setLanguage, currentLanguageInfo } = useTranslation();
  const [isLanguagePanelOpen, setIsLanguagePanelOpen] = useState(true);

  return (
    <section id="language" className="overflow-hidden rounded-[30px] border border-border bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setIsLanguagePanelOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Language</p>
          <h2 className="text-lg font-black text-text-primary">Language & Region</h2>
        </div>
        <span className="text-xs font-semibold text-text-secondary">{isLanguagePanelOpen ? 'Collapse' : 'Expand'}</span>
      </button>
      {isLanguagePanelOpen ? (
        <div className="border-t border-border px-5 pb-4 pt-4">
          <p className="mb-3 text-xs text-text-secondary">
            Marketplace language controls now live here. Current language: {currentLanguageInfo?.name || 'English'}.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LANGUAGES.map((entry) => (
              <button
                key={entry.code}
                type="button"
                onClick={() => void setLanguage(entry.code)}
                className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition-all ${
                  language === entry.code
                    ? 'border-primary bg-primary/10 shadow-[0_8px_20px_rgba(171,143,94,0.12)]'
                    : 'border-border bg-surface-soft hover:border-primary/40'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{entry.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">{entry.currency.code}</p>
                </div>
                {language === entry.code ? (
                  <span className="text-xs font-black text-primary">Active</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default LanguageRegionSettingsPage;
