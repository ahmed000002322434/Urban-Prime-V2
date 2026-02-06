
import React from 'react';
import { StoreTheme } from '../../../storeTypes';

interface EditableProductGridProps {
  content: {
    title?: string;
    limit?: number;
  };
  theme: StoreTheme;
}

const EditableProductGrid: React.FC<EditableProductGridProps> = ({ content, theme }) => {
  const mockItems = Array.from({ length: content.limit || 4 }).map((_, i) => ({
    id: i,
    title: `Sample Product ${i + 1}`,
    price: 99.00
  }));

  return (
    <section className="py-16 px-6">
      <h2 
        className="text-3xl font-bold mb-10 text-center"
        style={{ fontFamily: theme.font }}
      >
        {content.title || 'Featured Products'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 container mx-auto">
        {mockItems.map(item => (
          <div key={item.id} className="group">
            <div 
              className="aspect-square bg-gray-100 dark:bg-white/5 mb-4 overflow-hidden border border-gray-200 dark:border-white/10"
              style={{ borderRadius: theme.borderRadius }}
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/5 dark:to-white/10 animate-pulse" />
            </div>
            <h3 className="font-bold text-sm truncate">{item.title}</h3>
            <p className="font-black mt-1" style={{ color: theme.primaryColor }}>$99.00</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EditableProductGrid;
