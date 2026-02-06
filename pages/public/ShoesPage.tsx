import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useCategories } from '../../context/CategoryContext';

const SubCategoryCard: React.FC<{ title: string; imageUrl: string; link: string; }> = ({ title, imageUrl, link }) => {
  const cardRef = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={cardRef} className="animate-reveal">
        <Link to={link} className="group block relative aspect-square rounded-lg overflow-hidden shadow-md">
            <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <h3 className="p-4 text-white font-bold text-lg">{title}</h3>
            </div>
        </Link>
    </div>
  );
};


const ShoesPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const categoriesRef = useScrollReveal<HTMLDivElement>();
  const { categories: allCategories } = useCategories();

  const shoesCategory = allCategories.find(c => c.id === 'shoes');
  const subCategories = shoesCategory?.subcategories || [];

  return (
    <div className="bg-purple-50/20 dark:bg-dark-background animate-fade-in-up">
      <style>{`.font-serif-display { font-family: 'Playfair Display', serif; }`}</style>
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900 dark:text-dark-text">Step Into Style</h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Find the perfect pair for any occasion, from casual comfort to formal elegance.</p>
      </section>

      <section ref={categoriesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-4xl font-serif-display text-center mb-12 dark:text-dark-text">Our Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <SubCategoryCard title="Women's Shoes" imageUrl="https://picsum.photos/seed/womenshoes/500/500" link="/shoes/women" />
            <SubCategoryCard title="Men's Shoes" imageUrl="https://picsum.photos/seed/menshoes/500/500" link="/shoes/men" />
        </div>
      </section>
    </div>
  );
};
export default ShoesPage;