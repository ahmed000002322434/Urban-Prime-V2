
import React, { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import SettingsSidebar from '../../components/SettingsSidebar';
import { useTheme } from '../../hooks/useTheme';

const SettingsPage: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(true);
  const themeOptions = useMemo(() => themes.filter((entry) => entry.name !== 'system'), [themes]);
  const groupedThemeOptions = useMemo(
    () => ({
      light: themeOptions.filter((entry) => !entry.isDark),
      dark: themeOptions.filter((entry) => entry.isDark)
    }),
    [themeOptions]
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start animate-fade-in-up">
      <SettingsSidebar />
      <main className="flex-1 w-full">
        <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
          <button
            type="button"
            onClick={() => setIsThemePanelOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Theme</p>
              <h2 className="text-lg font-black text-text-primary">App Appearance</h2>
            </div>
            <span className="text-xs font-semibold text-text-secondary">{isThemePanelOpen ? 'Collapse' : 'Expand'}</span>
          </button>
          {isThemePanelOpen ? (
            <div className="border-t border-border px-5 pb-5 pt-4">
              <p className="mb-3 text-xs text-text-secondary">
                Choose a full-app theme. Changes apply globally and sync to your account.
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
                            ? 'border-primary bg-primary/10 shadow-[0_8px_20px_rgba(59,130,246,0.15)]'
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
                            ? 'border-primary bg-primary/10 shadow-[0_8px_20px_rgba(59,130,246,0.15)]'
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
              </div>
            </div>
          ) : null}
        </section>
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsPage;
