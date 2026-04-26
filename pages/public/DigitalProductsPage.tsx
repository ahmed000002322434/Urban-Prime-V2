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

const DigitalProductsPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const categoriesRef = useScrollReveal<HTMLDivElement>();
    const { categories: allCategories } = useCategories();

    const digitalCategory = allCategories.find(c => c.id === 'digital-products');
    const subCategories = digitalCategory?.subcategories || [];
  
    return (
        <div className="bg-purple-50/20 dark:bg-dark-background animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal bg-white dark:bg-dark-surface">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                        The Digital Marketplace
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Instant access to software, games, creative assets, and more. Your next digital tool is just a download away.
                    </p>
                </div>
            </section>

            <section ref={categoriesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h2 className="text-4xl font-bold font-display text-center mb-12 text-gray-900 dark:text-dark-text">Explore Digital Goods</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {subCategories.map((cat) => (
                        <SubCategoryCard 
                          key={cat.id} 
                          title={cat.name} 
                          link={`/browse?category=${cat.id}`}
                          imageUrl={`https://picsum.photos/seed/${cat.id}/500/500`}
                        />
                    ))}
                </div>
            </section>

            <section className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="bg-white dark:bg-dark-surface p-12 rounded-lg shadow-lg text-center flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-left">
                        <h2 className="text-3xl font-display font-bold mb-2 text-gray-900 dark:text-dark-text">Have a Digital Product to Sell?</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-xl">
                           Publish ZIP-backed digital products with private post-purchase delivery, or launch game builds into the new discovery shelves.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                        <Link
                            to="/profile/products/new-digital"
                            className="inline-block bg-primary text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-colors text-lg"
                        >
                            Sell Digital Goods
                        </Link>
                        <Link
                            to="/games"
                            className="inline-block border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-dark-text font-bold py-3 px-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
                        >
                            Explore Games
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DigitalProductsPage;
