import React, { useState, useEffect } from 'react';
import type { Category } from '../types';
import { HIERARCHICAL_CATEGORIES } from '../constants';

interface CategorySelectorProps {
  onCategorySelect: (category: Category) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onCategorySelect }) => {
  const [level1, setLevel1] = useState<Category[]>([]);
  const [level2, setLevel2] = useState<Category[]>([]);

  const [selectedL1, setSelectedL1] = useState<Category | null>(null);
  const [selectedL2, setSelectedL2] = useState<Category | null>(null);

  useEffect(() => {
    setLevel1(HIERARCHICAL_CATEGORIES);
  }, []);

  const handleL1Select = (cat: Category) => {
    setSelectedL1(cat);
    setSelectedL2(null);
    if (cat.subcategories && cat.subcategories.length > 0) {
      setLevel2(cat.subcategories);
    } else {
      setLevel2([]);
      onCategorySelect(cat);
    }
  };

  const handleL2Select = (cat: Category) => {
    setSelectedL2(cat);
    onCategorySelect(cat);
  };

  const Column: React.FC<{ items: Category[]; selectedItem: Category | null; onSelect: (item: Category) => void; }> = ({ items, selectedItem, onSelect }) => (
    <div className="flex-1 border-r h-full overflow-y-auto">
      <ul>
        {items.map(item => (
          <li
            key={item.id}
            onClick={() => onSelect(item)}
            className={`p-3 cursor-pointer text-sm hover:bg-slate-100 flex justify-between items-center ${selectedItem?.id === item.id ? 'bg-primary/10 text-primary dark:bg-gray-700 dark:text-white font-semibold' : ''}`}
          >
            <span>{item.name}</span>
            {item.subcategories && <span className="text-slate-400">&rsaquo;</span>}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Choose a Category</h2>
      <div className="flex h-96 border rounded-lg overflow-hidden">
        <Column items={level1} selectedItem={selectedL1} onSelect={handleL1Select} />
        {level2.length > 0 && (
          <Column items={level2} selectedItem={selectedL2} onSelect={handleL2Select} />
        )}
      </div>
    </div>
  );
};

export default CategorySelector;