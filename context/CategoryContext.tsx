import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import type { Category } from '../types';

type ItemServiceModule = typeof import('../services/itemService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;

const loadItemServiceModule = () => {
    if (!itemServiceModulePromise) {
        itemServiceModulePromise = import('../services/itemService');
    }
    return itemServiceModulePromise;
};

interface CategoryContextType {
    categories: Category[]; // Hierarchical
    flatCategories: Category[];
    isLoading: boolean;
    addCategory: (newCategoryName: string, parentCategoryId: string) => Promise<Category>;
}

export const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategories = useCallback(() => {
        setIsLoading(true);
        loadItemServiceModule()
            .then(({ itemService }) => itemService.getHierarchicalCategories())
            .then(setCategories)
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = async (newCategoryName: string, parentCategoryId: string) => {
        const { itemService } = await loadItemServiceModule();
        const newCat = await itemService.addCategory(newCategoryName, parentCategoryId);
        fetchCategories(); // refetch to update state
        return newCat;
    };

    const flatCategories = React.useMemo(() => {
        return categories.flatMap(cat => {
            const parent = { id: cat.id, name: cat.name };
            const children = cat.subcategories ? cat.subcategories.map(sub => ({ id: sub.id, name: sub.name })) : [];
            return [parent, ...children];
        });
    }, [categories]);


    const value = { categories, flatCategories, isLoading, addCategory };

    return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};

export const useCategories = () => {
    const context = useContext(CategoryContext);
    if (!context) throw new Error('useCategories must be used inside a CategoryProvider');
    return context;
}
