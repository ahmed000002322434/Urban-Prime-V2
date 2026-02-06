import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const ShowcaseCard: React.FC<{ title: string; imageUrl: string; link: string; delay?: number }> = ({ title, imageUrl, link, delay = 0 }) => {
  const cardRef = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={cardRef} className="group animate-reveal" style={{ transitionDelay: `${delay}ms` }}>
      <Link to={link}>
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800">{title}</h3>
      </Link>
    </div>
  );
};

const RingsPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const categoriesRef = useScrollReveal<HTMLDivElement>();
  const ctaRef = useScrollReveal<HTMLDivElement>();

  const categories = [
      { title: 'Engagement Rings', imageUrl: 'https://picsum.photos/seed/r-engagement/500/500', link: '/browse?category=rings' },
      { title: 'Wedding Bands', imageUrl: 'https://picsum.photos/seed/r-wedding/500/500', link: '/browse?category=rings' },
      { title: 'Fashion Rings', imageUrl: 'https://picsum.photos/seed/r-fashion/500/500', link: '/browse?category=rings' },
      { title: 'Vintage Rings', imageUrl: 'https://picsum.photos/seed/r-vintage/500/500', link: '/browse?category=rings' },
  ];
  
  return (
    <div className="bg-blue-50/20 animate-fade-in-up">
       <style>{`.font-serif-display { font-family: 'Playfair Display', serif; }`}</style>
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900">The Ring Collection</h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">From "I do" to everyday elegance, find a ring for every milestone and style.</p>
      </section>

      <section ref={categoriesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-serif-display text-center mb-12">Explore by Style</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {categories.map((cat, index) => <ShowcaseCard key={cat.title} {...cat} delay={index * 100} />)}
        </div>
      </section>

      <section ref={ctaRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-white p-12 rounded-lg shadow-lg">
          <h2 className="text-3xl font-serif-display mb-4">Find The One</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">Discover a breathtaking collection of rings to symbolize your most cherished moments.</p>
          <Link to="/browse?category=rings" className="inline-block bg-black text-white font-bold py-3 px-10 rounded-full hover:bg-gray-800 transition-colors text-lg">Shop All Rings</Link>
        </div>
      </section>
    </div>
  );
};

export default RingsPage;
