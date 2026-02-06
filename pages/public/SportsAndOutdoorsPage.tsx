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

const SportsAndOutdoorsPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const categoriesRef = useScrollReveal<HTMLDivElement>();

    const { categories: allCategories } = useCategories();
    const sportsCategory = allCategories.find(c => c.id === 'sports-outdoors');
    const subCategories = sportsCategory?.subcategories || [];

    return (
        <div className="bg-green-50/20 dark:bg-dark-background animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal bg-white dark:bg-dark-surface">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                        Your Next Adventure Awaits.
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        From the mountains to the sea, find the gear you need to explore the great outdoors.
                    </p>
                </div>
            </section>

            <section ref={categoriesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h2 className="text-4xl font-bold font-display text-center mb-12 text-gray-900 dark:text-dark-text">Explore by Activity</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
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
        </div>
    );
};

export default SportsAndOutdoorsPage;
