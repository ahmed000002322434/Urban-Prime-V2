import React, { createContext, useContext, useMemo, useState } from 'react';

const HERO_STYLE_STORAGE_KEY = 'urbanprime:hero-style';

const HeroStyleContext = createContext({
  heroStyle: 'card',
  setHeroStyle: (_value) => {}
});

const readStoredHeroStyle = () => {
  if (typeof window === 'undefined') return 'card';
  const stored = window.localStorage.getItem(HERO_STYLE_STORAGE_KEY);
  return stored === 'banner' ? 'banner' : 'card';
};

export const HeroStyleProvider = ({ children }) => {
  const [heroStyle, setHeroStyleState] = useState(readStoredHeroStyle);

  const setHeroStyle = (value) => {
    const nextValue = value === 'banner' ? 'banner' : 'card';
    setHeroStyleState(nextValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HERO_STYLE_STORAGE_KEY, nextValue);
    }
  };

  const value = useMemo(() => ({ heroStyle, setHeroStyle }), [heroStyle]);

  return (
    <HeroStyleContext.Provider value={value}>
      {children}
    </HeroStyleContext.Provider>
  );
};

export const useHeroStyle = () => {
  const context = useContext(HeroStyleContext);
  if (!context) {
    throw new Error('useHeroStyle must be used within a HeroStyleProvider.');
  }
  return context;
};
