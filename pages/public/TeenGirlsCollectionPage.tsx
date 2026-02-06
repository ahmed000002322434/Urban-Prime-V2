import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type ShowcaseItem = { title: string; imageUrl: string; };

const ShowcaseCard: React.FC<{ item: ShowcaseItem, delay?: number }> = ({ item, delay = 0 }) => {
  const cardRef = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={cardRef} className="group animate-reveal" style={{ transitionDelay: `${delay}ms` }}>
      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-800">{item.title}</h3>
    </div>
  );
};

const TeenGirlsCollectionPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const topsRef = useScrollReveal<HTMLDivElement>();
  const dressesRef = useScrollReveal<HTMLDivElement>();
  const ctaRef = useScrollReveal<HTMLDivElement>();

  const topItems: ShowcaseItem[] = [
    { title: 'Trendy Crop Top', imageUrl: 'https://picsum.photos/seed/girlcrop/600/800' },
    { title: 'Oversized Graphic Hoodie', imageUrl: 'https://picsum.photos/seed/girlhoodie/600/800' },
    { title: 'Flowy Peasant Blouse', imageUrl: 'https://picsum.photos/seed/girlblouse/600/800' },
  ];
  const dressItems: ShowcaseItem[] = [
    { title: 'Skater Dress', imageUrl: 'https://picsum.photos/seed/girldress/600/800' },
    { title: 'Floral Sundress', imageUrl: 'https://picsum.photos/seed/girlsundress/600/800' },
    { title: 'Denim Jumpsuit', imageUrl: 'https://picsum.photos/seed/girljumpsuit/600/800' },
  ];

  return (
    <div className="bg-sky-50/50 animate-fade-in-up">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        .font-serif-display { font-family: 'Playfair Display', serif; }
      `}</style>
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900">Teen Girls' Fashion</h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">Express your style with the latest trends and must-have essentials.</p>
      </section>
      <section ref={topsRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-serif-display text-center mb-12">Tops & Hoodies</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {topItems.map((item, index) => <ShowcaseCard key={item.title} item={item} delay={index * 100} />)}
        </div>
      </section>
      <section ref={dressesRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-serif-display text-center mb-12">Dresses & Jumpsuits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {dressItems.map((item, index) => <ShowcaseCard key={item.title} item={item} delay={index * 100} />)}
        </div>
      </section>
      <section ref={ctaRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-white p-12 rounded-lg shadow-lg">
          <h2 className="text-3xl font-serif-display mb-4">Find Your Vibe</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">From casual cool to party perfect, discover looks you'll love.</p>
          <Link to="/browse?category=kids-fashion" className="inline-block bg-black text-white font-bold py-3 px-10 rounded-full hover:bg-gray-800 transition-colors text-lg">Shop All Teen's</Link>
        </div>
      </section>
    </div>
  );
};
export default TeenGirlsCollectionPage;
