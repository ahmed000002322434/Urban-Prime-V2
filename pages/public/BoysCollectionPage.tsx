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

const BoysCollectionPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const topsRef = useScrollReveal<HTMLDivElement>();
  const bottomsRef = useScrollReveal<HTMLDivElement>();
  const ctaRef = useScrollReveal<HTMLDivElement>();

  const topItems: ShowcaseItem[] = [
    { title: 'Cool Graphic Tee', imageUrl: 'https://picsum.photos/seed/boystee/600/800' },
    { title: 'Cozy Hoodie', imageUrl: 'https://picsum.photos/seed/boyshoodie/600/800' },
    { title: 'Smart Polo Shirt', imageUrl: 'https://picsum.photos/seed/boyspolo/600/800' },
  ];
  const bottomItems: ShowcaseItem[] = [
    { title: 'Durable Cargo Shorts', imageUrl: 'https://picsum.photos/seed/boysshorts/600/800' },
    { title: 'Comfortable Joggers', imageUrl: 'https://picsum.photos/seed/boysjoggers/600/800' },
    { title: 'Classic Jeans', imageUrl: 'https://picsum.photos/seed/boysjeans/600/800' },
  ];

  return (
    <div className="bg-sky-50/50 animate-fade-in-up">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        .font-serif-display { font-family: 'Playfair Display', serif; }
      `}</style>
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900">Boys' Collection</h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">Cool, comfy, and built to last. For every adventure that awaits.</p>
      </section>
      <section ref={topsRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-serif-display text-center mb-12">Tops & Sweatshirts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {topItems.map((item, index) => <ShowcaseCard key={item.title} item={item} delay={index * 100} />)}
        </div>
      </section>
      <section ref={bottomsRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-serif-display text-center mb-12">Pants & Shorts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {bottomItems.map((item, index) => <ShowcaseCard key={item.title} item={item} delay={index * 100} />)}
        </div>
      </section>
      <section ref={ctaRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-white p-12 rounded-lg shadow-lg">
          <h2 className="text-3xl font-serif-display mb-4">Gear Up for Fun</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">Find the perfect outfits for your little adventurer. Shop the full collection now.</p>
          <Link to="/browse?category=kids-fashion" className="inline-block bg-black text-white font-bold py-3 px-10 rounded-full hover:bg-gray-800 transition-colors text-lg">Shop All Boys'</Link>
        </div>
      </section>
    </div>
  );
};
export default BoysCollectionPage;
