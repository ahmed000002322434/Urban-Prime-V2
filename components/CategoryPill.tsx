import React from 'react';
import { CATEGORY_COLORS } from '../constants';
import type { Category } from '../types';
import { useCategories } from '../context/CategoryContext';

interface CategoryPillProps {
  categoryId: string;
  className?: string;
}

const findCategoryAndParent = (id: string, categories: Category[]): { category: Category | null, parentId: string | null } => {
    for (const category of categories) {
        if (category.id === id) {
            return { category, parentId: category.id };
        }
        if (category.subcategories) {
            const found = category.subcategories.find(sub => sub.id === id);
            if (found) {
                return { category: found, parentId: category.id };
            }
        }
    }
    return { category: null, parentId: null };
};


const CategoryPill: React.FC<CategoryPillProps> = ({ categoryId, className = '' }) => {
  const { categories } = useCategories();
  const { category, parentId } = findCategoryAndParent(categoryId, categories);
  const colorClass = CATEGORY_COLORS[parentId || 'default'];

  if (!category) {
      return (
         <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS.default} ${className}`}>
            <span>General</span>
        </div>
      )
  }

  return (
    <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${colorClass} ${className}`}>
      <span>{category.name}</span>
    </div>
  );
};

export default CategoryPill;