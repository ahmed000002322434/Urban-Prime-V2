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


const WatchesPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const { categories: allCategories } = useCategories();
  
  const watchesCategory = allCategories.find(c => c.id === 'watches');
  const subCategories = watchesCategory?.subcategories || [];

  return (
    <div className="bg-zinc-50/50 dark:bg-dark-background animate-fade-in-up">
        <style>{`.font-serif-display { font-family: 'Playfair Display', serif; }`}</style>
        <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
            <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900 dark:text-dark-text">Timeless Elegance</h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover our collection of exquisite timepieces, where classic design meets modern craftsmanship.
            </p>
        </section>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <h2 className="text-4xl font-serif-display text-center mb-12">Explore by Style</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {subCategories.map((cat) => (
                    <SubCategoryCard 
                        key={cat.id} 
                        title={cat.name} 
                        link={`/browse?category=${cat.id}`} 
                        imageUrl={`https://picsum.photos/seed/${cat.id}/500/500`}
                    />
                ))}
            </div>
        </main>
    </div>
  );
};

export default WatchesPage;