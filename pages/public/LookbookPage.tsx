import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { LookbookEntry } from '../../types';

const lookbookData: LookbookEntry[] = [
  {
    id: 'autumn-vibes',
    title: 'Autumn City Vibes',
    description: 'Embrace the crisp air with layered styles, warm tones, and timeless leather accessories. This collection is all about comfort and sophistication for the modern urban explorer.',
    imageUrl: 'https://picsum.photos/seed/lookbook1/1200/800',
    featuredItemIds: ['item-4', 'item-men-jacket'],
  },
  {
    id: 'weekend-getaway',
    title: 'The Weekend Getaway',
    description: 'Pack your bags with versatile pieces perfect for a spontaneous trip. From durable outdoor gear to comfortable travel wear, be ready for any adventure.',
    imageUrl: 'https://picsum.photos/seed/lookbook2/1200/800',
    featuredItemIds: ['item-3', 'item-hiking-boots'],
  },
    {
    id: 'formal-elegance',
    title: 'Formal Elegance',
    description: 'Make a statement at your next event with our collection of stunning gowns, sharp suits, and exquisite jewelry. Timeless pieces for unforgettable moments.',
    imageUrl: 'https://picsum.photos/seed/lookbook3/1200/800',
    featuredItemIds: ['item-jewelry-1', 'item-suit'],
  },
];

const LookbookPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();

  return (
    <div className="bg-white dark:bg-dark-background animate-fade-in-up">
      <style>{`
        .font-serif-display { font-family: 'Playfair Display', serif; }
      `}</style>
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-serif-display text-gray-900 dark:text-dark-text">
          The Lookbook
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Inspiration for your next look. Shop curated collections and discover your signature style.
        </p>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-24 pb-24">
        {lookbookData.map((entry, index) => {
          const isReversed = index % 2 !== 0;
          const entryRef = useScrollReveal<HTMLDivElement>();
          return (
            <div
              ref={entryRef}
              key={entry.id}
              className={`animate-reveal grid grid-cols-1 md:grid-cols-2 gap-12 items-center`}
            >
              <div className={`relative aspect-[4/5] overflow-hidden rounded-lg ${isReversed ? 'md:order-last' : ''}`}>
                <img src={entry.imageUrl} alt={entry.title} className="w-full h-full object-cover" />
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-serif-display mb-4 dark:text-dark-text">{entry.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto md:mx-0">
                  {entry.description}
                </p>
                <Link
                  to="/browse" // In a real app, this would link to a filtered page for the collection
                  className="inline-block bg-black text-white font-bold py-3 px-10 rounded-full hover:bg-gray-800 transition-colors text-lg"
                >
                  Shop The Look
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LookbookPage;
