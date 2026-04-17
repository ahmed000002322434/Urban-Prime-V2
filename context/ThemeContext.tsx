


import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

type ItemServiceModule = typeof import('../services/itemService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;

const loadItemServiceModule = () => {
  if (!itemServiceModulePromise) {
    itemServiceModulePromise = import('../services/itemService');
  }
  return itemServiceModulePromise;
};

export type Theme = 'light' | 'navy' | 'earth' | 'emerald' | 'obsidian' | 'noir' | 'sandstone' | 'icy' | 'hydra' | 'parchment' | 'grassy' | 'system';
type ResolvedTheme = Exclude<Theme, 'system'>;

export interface ThemeDefinition {
  name: Theme;
  label: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
  };
  isDark: boolean;
}

// This list is for the UI selector
export const THEMES: ThemeDefinition[] = [
  { name: 'system', label: 'System', colors: { primary: '#9ca763', background: '#f7f3e5', surface: '#fffaf2' }, isDark: false }, // Placeholder colors
  { name: 'light', label: 'Matcha Cream', colors: { primary: '#9ca763', background: '#f7f3e5', surface: '#fffaf2' }, isDark: false },
  { name: 'navy', label: 'Navy', colors: { primary: '#3b82f6', background: '#f8fafc', surface: '#ffffff' }, isDark: false },
  { name: 'obsidian', label: 'Obsidian', colors: { primary: '#ffffff', background: '#000000', surface: '#111111' }, isDark: true },
  { name: 'noir', label: 'Noir', colors: { primary: '#e7e1d6', background: '#0b0b0c', surface: 'rgba(18, 18, 20, 0.7)' }, isDark: true },
  { name: 'sandstone', label: 'Liquid Sandstone', colors: { primary: '#4E342E', background: '#dcbfa6', surface: 'rgba(230, 220, 200, 0.25)' }, isDark: false },
  { name: 'icy', label: 'Arctic Ice', colors: { primary: '#0077B6', background: '#CAF0F8', surface: 'rgba(225, 245, 255, 0.4)' }, isDark: false },
  { name: 'hydra', label: 'Hydra', colors: { primary: '#00E5FF', background: '#001020', surface: 'rgba(0, 20, 40, 0.6)' }, isDark: true },
  { name: 'parchment', label: 'Parchment', colors: { primary: '#2C3E50', background: '#f3f3f3', surface: 'rgba(255, 255, 255, 0.8)' }, isDark: false },
  { name: 'grassy', label: 'Grassy', colors: { primary: '#059669', background: '#ECFCCB', surface: 'rgba(240, 245, 240, 0.65)' }, isDark: false },
  { name: 'earth', label: 'Earth', colors: { primary: '#A98C76', background: '#FDFBF7', surface: '#ffffff' }, isDark: false },
  { name: 'emerald', label: 'Emerald', colors: { primary: '#054740', background: '#F7F5F2', surface: '#ffffff' }, isDark: false },
];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (themeName: Theme) => void;
  themes: ThemeDefinition[];
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  const LEGACY_THEMES = ['mono-dark', 'elite', 'best'] as const;
  const THEME_CLASSNAMES = [
    'system',
    'light',
    'navy',
    'earth',
    'emerald',
    'obsidian',
    'noir',
    'best',
    'sandstone',
    'icy',
    'hydra',
    'parchment',
    'grassy',
    ...LEGACY_THEMES
  ];

  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'obsidian' : 'light';
  };

  const normalizeTheme = (value?: string | null): Theme => {
    if (!value) return 'system';
    if (value === 'best') return 'noir';
    if (LEGACY_THEMES.includes(value as any)) return 'obsidian';
    if (THEMES.some(t => t.name === value)) return value as Theme;
    return 'system';
  };

  const applyTheme = useCallback((themeName: Theme) => {
    const root = window.document.documentElement;
    let actualTheme = themeName === 'system' ? getSystemTheme() : themeName;
    
    const themeDef = THEMES.find(t => t.name === actualTheme);
    
    // Remove all old theme classes
    THEME_CLASSNAMES.forEach(t => root.classList.remove(`theme-${t}`));
    
    // Add new theme class
    root.classList.add(`theme-${actualTheme}`);
    
    // Toggle Tailwind 'dark' class
    if (themeDef?.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    setThemeState(themeName);
    setResolvedTheme(actualTheme as ResolvedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        if (theme === 'system') {
            applyTheme('system');
        }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  useEffect(() => {
    if (isAuthLoading) return;

    let initialTheme: Theme = 'system'; // Default to automatic
    const savedTheme = normalizeTheme(localStorage.getItem('urbanprime-theme'));
    const userTheme = normalizeTheme(user?.themePreference);

    if (savedTheme && savedTheme !== 'system') {
      initialTheme = savedTheme;
    } else if (userTheme && userTheme !== 'system') {
      initialTheme = userTheme;
    }
    
    applyTheme(initialTheme);
  }, [user, isAuthLoading, applyTheme]);
  
  const setTheme = useCallback(async (themeName: Theme) => {
    applyTheme(themeName);
    localStorage.setItem('urbanprime-theme', themeName);
    if (user) {
      try {
        // FIX: The 'system' theme is a local preference and should not be saved to the user's profile,
        // as the 'ThemePreference' type does not include it.
        if (themeName !== 'system') {
          const { userService } = await loadItemServiceModule();
          await userService.updateUserProfile(user.id, { themePreference: themeName });
        }
      } catch (error) {
        console.error("Failed to save theme preference", error);
      }
    }
  }, [user, applyTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, themes: THEMES }), [theme, resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
