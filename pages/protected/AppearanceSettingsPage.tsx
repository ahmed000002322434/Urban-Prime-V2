import React, { useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useHeroStyle } from '../../context/HeroStyleContext';

const AppearanceSettingsPage: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();
  const { heroStyle, setHeroStyle } = useHeroStyle();
  const [isAppearancePanelOpen, setIsAppearancePanelOpen] = useState(false);
  const themeOptions = useMemo(() => themes.filter((entry) => entry.name !== 'system'), [themes]);
  const groupedThemeOptions = useMemo(
    () => ({
      light: themeOptions.filter((entry) => !entry.isDark),
      dark: themeOptions.filter((entry) => entry.isDark)
    }),
    [themeOptions]
  );

  return (
    <section id="appearance" className="overflow-hidden rounded-[30px] border border-border bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setIsAppearancePanelOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Appearance</p>
          <h2 className="text-lg font-black text-text-primary">Appearance</h2>
        </div>
        <span className="text-xs font-semibold text-text-secondary">{isAppearancePanelOpen ? 'Collapse' : 'Expand'}</span>
      </button>
      {isAppearancePanelOpen ? (
        <div className="border-t border-border px-5 pb-4 pt-4">
          <p className="mb-3 text-xs text-text-secondary">
            Choose your global theme and homepage presentation. This panel stays collapsed by default.
          </p>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Light Themes</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groupedThemeOptions.light.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setTheme(entry.name)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all ${
                      theme === entry.name
                        ? 'border-primary bg-primary/10 shadow-[0_8px_20px_rgba(171,143,94,0.12)]'
                        : 'border-border bg-surface-soft hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-8 w-8 rounded-xl border border-black/10"
                        style={{
                          background: `linear-gradient(145deg, ${entry.colors.surface}, ${entry.colors.background})`
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{entry.label}</p>
                        <p className="text-[11px] text-text-secondary">Light</p>
                      </div>
                    </div>
                    {theme === entry.name ? (
                      <span className="text-xs font-black text-primary">Active</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Dark Themes</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groupedThemeOptions.dark.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setTheme(entry.name)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all ${
                      theme === entry.name
                        ? 'border-primary bg-primary/10 shadow-[0_8px_20px_rgba(171,143,94,0.12)]'
                        : 'border-border bg-surface-soft hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-8 w-8 rounded-xl border border-white/20"
                        style={{
                          background: `linear-gradient(145deg, ${entry.colors.surface}, ${entry.colors.background})`
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{entry.label}</p>
                        <p className="text-[11px] text-text-secondary">Dark</p>
                      </div>
                    </div>
                    {theme === entry.name ? (
                      <span className="text-xs font-black text-primary">Active</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Homepage Hero</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setHeroStyle('card')}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    heroStyle === 'card'
                      ? 'border-primary bg-primary/10 shadow-[0_10px_24px_rgba(171,143,94,0.14)]'
                      : 'border-border bg-surface-soft hover:border-primary/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">Card Style (Old)</p>
                  <p className="text-[11px] text-text-secondary">Classic glass hero with featured CTAs.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setHeroStyle('banner')}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    heroStyle === 'banner'
                      ? 'border-primary bg-primary/10 shadow-[0_10px_24px_rgba(171,143,94,0.14)]'
                      : 'border-border bg-surface-soft hover:border-primary/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">Cinematic Banner (New)</p>
                  <p className="text-[11px] text-text-secondary">Fullscreen banner carousel styled from the mobile homepage visuals.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default AppearanceSettingsPage;
