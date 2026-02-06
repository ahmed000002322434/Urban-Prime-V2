import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const ShowcaseCard: React.FC<{ title: string; imageUrl: string; link: string; delay?: number }> = ({ title, imageUrl, link, delay = 0 }) => {
  const cardRef = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={cardRef} className="group animate-reveal" style={{ transitionDelay: `${delay}ms` }}>
      <Link to={link}>
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800">{title}</h3>
      </Link>
    </div>
  );
};

const GamingConsolesPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const categoriesRef = useScrollReveal<HTMLDivElement>();
  const ctaRef = useScrollReveal<HTMLDivElement>();

  const categories = [
      { title: 'PlayStation', imageUrl: 'https://picsum.photos/seed/gc-ps/800/450', link: '/browse?category=gaming-consoles' },
      { title: 'Xbox', imageUrl: 'https://picsum.photos/seed/gc-xbox/800/450', link: '/browse?category=gaming-consoles' },
      { title: 'Nintendo', imageUrl: 'https://picsum.photos/seed/gc-nintendo/800/450', link: '/browse?category=gaming-consoles' },
      { title: 'Handheld & Retro', imageUrl: 'https://picsum.photos/seed/gc-retro/800/450', link: '/browse?category=gaming-consoles' },
  ];
  
  return (
    <div className="bg-red-50/50 animate-fade-in-up">
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900">Gaming Consoles</h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">Dive into new worlds and experience the next generation of gaming with the latest consoles.</p>
      </section>

      <section ref={categoriesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-bold font-display text-center mb-12">Choose Your Platform</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {categories.map((cat, index) => <ShowcaseCard key={cat.title} {...cat} delay={index * 100} />)}
        </div>
      </section>

      <section ref={ctaRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-white p-12 rounded-lg shadow-lg">
          <h2 className="text-3xl font-display font-bold mb-4">Game On</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">Find the perfect console to rent for a weekend or buy for endless entertainment.</p>
          <Link to="/browse?category=gaming-consoles" className="inline-block bg-black text-white font-bold py-3 px-10 rounded-full hover:bg-gray-800 transition-colors text-lg">Shop All Consoles</Link>
        </div>
      </section>
    </div>
  );
};

export default GamingConsolesPage;
