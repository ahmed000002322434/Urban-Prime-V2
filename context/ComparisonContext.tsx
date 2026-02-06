import React, { createContext, useState, useMemo, useCallback } from 'react';
import type { Item } from '../types';

interface ComparisonContextType {
  itemsToCompare: Item[];
  isComparing: (itemId: string) => boolean;
  toggleCompare: (item: Item) => void;
  clearCompare: () => void;
}

export const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [itemsToCompare, setItemsToCompare] = useState<Item[]>([]);

  const isComparing = useCallback((itemId: string) => {
    return itemsToCompare.some(item => item.id === itemId);
  }, [itemsToCompare]);

  const toggleCompare = useCallback((item: Item) => {
    setItemsToCompare(prev => {
      if (isComparing(item.id)) {
        return prev.filter(i => i.id !== item.id);
      }
      if (prev.length < 3) {
        return [...prev, item];
      }
      // Optional: show a notification that max 3 items can be compared
      return prev;
    });
  }, [isComparing]);
  
  const clearCompare = useCallback(() => {
    setItemsToCompare([]);
  }, []);

  const value = useMemo(() => ({
    itemsToCompare,
    isComparing,
    toggleCompare,
    clearCompare,
  }), [itemsToCompare, isComparing, toggleCompare, clearCompare]);

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
};