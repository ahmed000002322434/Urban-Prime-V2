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

// Main page component
const BeautyPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const categoriesRef = useScrollReveal<HTMLDivElement>();

  const { categories: allCategories } = useCategories();
  const beautyCategory = allCategories.find(c => c.id === 'beauty-personal-care');
  
  const subCategoryLinks: { [key: string]: string } = {
    'Skincare': '/skincare',
    'Makeup': '/makeup',
    'Hair Care': '/hair-care',
    'Fragrances': '/fragrances',
    'Bath & Body': '/bath-body',
    'Nail Care': '/nail-care',
    'Men’s Grooming': '/mens-grooming',
    'Health & Wellness': '/health-wellness',
    'Beauty Tools': '/beauty-tools',
    'Personal Hygiene': '/personal-hygiene',
  };

  const subCategories = beautyCategory?.subcategories?.map(sub => ({
    ...sub,
    link: subCategoryLinks[sub.name] || `/browse?category=${sub.id}`
  })) || [];

  return (
    <div className="bg-rose-50/50 dark:bg-dark-background animate-fade-in-up">
      <style>{`
        .font-serif-display { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* Hero Section */}
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900 dark:text-dark-text">
          Beauty & Personal Care
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Explore our curated collection of premium products, designed to enhance your natural beauty and well-being.
        </p>
      </section>

      {/* Subcategories Section */}
      <section ref={categoriesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-4xl font-serif-display text-center mb-12 dark:text-dark-text">Explore Our Departments</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {subCategories.map((item) => (
            <SubCategoryCard 
              key={item.id} 
              title={item.name} 
              link={item.link} 
              imageUrl={`https://picsum.photos/seed/${item.id}/500/500`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default BeautyPage;
