
import React from 'react';
import type { Item } from '../../types';

interface ProductGridProps {
  title: string;
  items: Item[];
  columns: 2 | 3 | 4;
}

const ProductGrid: React.FC<ProductGridProps> = ({ title, items, columns }) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4'
  }[columns];

  return (
    <section className="py-16 px-6 container mx-auto">
      <h3 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white font-display">
        {title || "Featured Collection"}
      </h3>
      <div className={`grid gap-8 ${gridCols}`}>
        {items.length > 0 ? items.map((item, idx) => (
          <div key={item.id || idx} className="group cursor-pointer">
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 mb-4 border border-gray-200 dark:border-white/5">
              <img src={item.imageUrls?.[0] || 'https://via.placeholder.com/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title}/>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white truncate">{item.title}</h4>
            <p className="text-primary font-black mt-1">${item.price || item.salePrice || 0}</p>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
            <p className="text-gray-400">Add products to this collection</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
