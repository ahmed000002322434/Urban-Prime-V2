

import React from 'react';
import { Link } from 'react-router-dom';
import { HIERARCHICAL_CATEGORIES } from '../constants';
import CategoryIcon from './CategoryIcon';

interface MegaMenuProps {
  onClose: () => void;
}

const MegaMenu: React.FC<MegaMenuProps> = ({ onClose }) => {
  const mainCategories = HIERARCHICAL_CATEGORIES;

  return (
    <div className="absolute top-full left-0 w-full bg-white dark:bg-dark-surface shadow-lg border-t dark:border-gray-700 animate-fade-in-up" onMouseLeave={onClose}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {mainCategories.map(category => (
          <div key={category.id}>
            <Link to={`/browse?category=${category.id}`} onClick={onClose} className="flex items-center gap-2 font-bold text-sm text-light-text dark:text-dark-text mb-3 hover:text-primary">
              <CategoryIcon iconName={category.id} className="w-5 h-5" />
              <span>{category.name}</span>
            </Link>
            <ul className="space-y-2">
              {category.subcategories?.slice(0, 6).map(sub => (
                <li key={sub.id}>
                  <Link to={`/browse?category=${sub.id}`} onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                    {sub.name}
                  </Link>
                </li>
              ))}
              {category.subcategories && category.subcategories.length > 6 && (
                <li>
                  <Link to={`/browse?category=${category.id}`} onClick={onClose} className="text-sm font-semibold text-primary hover:underline">
                    View all &rarr;
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MegaMenu;
