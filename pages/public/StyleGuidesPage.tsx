import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import type { StyleGuide } from '../../types';

const guidesData: StyleGuide[] = [
  {
    id: 'how-to-layer',
    title: 'The Art of Layering: A Guide for All Seasons',
    author: 'Olivia Chen',
    date: 'October 28, 2023',
    excerpt: 'Master the skill of layering to create versatile and stylish outfits that can adapt to any weather. From lightweight jackets to cozy knits, we break down the essentials.',
    imageUrl: 'https://picsum.photos/seed/styleguide1/800/500',
    content: '...',
  },
  {
    id: 'accessorizing-101',
    title: 'Accessorizing 101: Elevate Your Look',
    author: 'Marcus Reid',
    date: 'October 25, 2023',
    excerpt: 'Discover how the right accessories can transform an outfit. We explore how to choose the perfect watch, necklace, and handbag to complement your style.',
    imageUrl: 'https://picsum.photos/seed/styleguide2/800/500',
    content: '...',
  },
  {
    id: 'diy-project-tools',
    title: 'Essential Tools for Your First DIY Project',
    author: 'Ben Carter',
    date: 'October 21, 2023',
    excerpt: 'Thinking about tackling a home improvement project? Here are the must-have tools you can rent to get started, from power drills to sanders.',
    imageUrl: 'https://picsum.photos/seed/styleguide3/800/500',
    content: '...',
  },
   {
    id: 'wedding-guest-attire',
    title: 'What to Wear: A Guide to Wedding Guest Attire',
    author: 'Sophie Dubois',
    date: 'October 19, 2023',
    excerpt: 'Decode the dress code for any wedding. We showcase rental options for black-tie, cocktail, and casual ceremonies to ensure you\'re perfectly dressed for the occasion.',
    imageUrl: 'https://picsum.photos/seed/styleguide4/800/500',
    content: '...',
  },
];

const StyleGuidesPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();

  return (
    <div className="bg-slate-50 dark:bg-dark-background min-h-screen animate-fade-in-up">
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
          Style Guides
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Expert advice, trend reports, and inspiration to help you look and feel your best.
        </p>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {guidesData.map((guide, index) => {
            const guideRef = useScrollReveal<HTMLDivElement>();
            return(
            <div ref={guideRef} key={guide.id} className="animate-reveal bg-white dark:bg-dark-surface rounded-lg shadow-lg overflow-hidden group" style={{ transitionDelay: `${index * 100}ms` }}>
              <Link to="#">
                <div className="overflow-hidden">
                    <img src={guide.imageUrl} alt={guide.title} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold font-display mb-3 dark:text-dark-text">{guide.title}</h2>
                  <p className="text-slate-600 dark:text-gray-400 mb-4">{guide.excerpt}</p>
                  <div className="flex justify-between items-center text-sm text-slate-500 dark:text-gray-400">
                    <span>By {guide.author} &bull; {guide.date}</span>
                    <span className="font-semibold text-primary">Read Guide &rarr;</span>
                  </div>
                </div>
              </Link>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};

export default StyleGuidesPage;
