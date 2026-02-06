import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

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

const ClothingPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const gridRef = useScrollReveal<HTMLDivElement>();

  const fashionCategories = [
      { title: "Women's Fashion", imageUrl: "https://picsum.photos/seed/fashion-women/500/500", link: "/womens-clothing" },
      { title: "Men's Fashion", imageUrl: "https://picsum.photos/seed/fashion-men/500/500", link: "/mens-clothing" },
      { title: "Kids & Baby", imageUrl: "https://picsum.photos/seed/fashion-kids/500/500", link: "/clothing/kids" },
      { title: "Sportswear", imageUrl: "https://picsum.photos/seed/fashion-sport/500/500", link: "/sportswear" },
      { title: "Men's Accessories", imageUrl: "https://picsum.photos/seed/fashion-m-acc/500/500", link: "/mens-accessories" },
      { title: "Women's Bags", imageUrl: "https://picsum.photos/seed/fashion-w-bags/500/500", link: "/womens-bags" },
      { title: "Women's Accessories", imageUrl: "https://picsum.photos/seed/fashion-w-acc/500/500", link: "/womens-accessories" },
      { title: "Shoes", imageUrl: "https://picsum.photos/seed/fashion-shoes/500/500", link: "/shoes" },
      { title: "Watches", imageUrl: "https://picsum.photos/seed/fashion-watches/500/500", link: "/watches" },
      { title: "Seasonal Styles", imageUrl: "https://picsum.photos/seed/fashion-seasonal/500/500", link: "/seasonal-fashion" },
  ];

  return (
    <div className="bg-white dark:bg-dark-background animate-fade-in-up">
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
          Style for Every Story
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          From timeless classics to the latest trends, discover your perfect look in our curated fashion collections for everyone.
        </p>
      </section>

      <section ref={gridRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {fashionCategories.map((cat) => (
                <SubCategoryCard 
                    key={cat.title}
                    title={cat.title}
                    imageUrl={cat.imageUrl}
                    link={cat.link}
                />
            ))}
        </div>
      </section>
    </div>
  );
};

export default ClothingPage;