
import React from 'react';
import { StoreTheme } from '../../../storeTypes';

interface EditableHeroProps {
  content: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    imageUrl?: string;
  };
  theme: StoreTheme;
}

const EditableHero: React.FC<EditableHeroProps> = ({ content, theme }) => {
  return (
    <section 
      className="relative h-[500px] flex items-center justify-center text-center px-6 overflow-hidden"
      style={{ borderRadius: theme.borderRadius }}
    >
      <div className="absolute inset-0 z-0">
        <img 
          src={content.imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop'} 
          className="w-full h-full object-cover"
          alt="Hero background"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      <div className="relative z-10 max-w-3xl">
        <h1 
          className="text-5xl md:text-7xl font-black text-white mb-6"
          style={{ fontFamily: theme.font }}
        >
          {content.title || 'Welcome to Our Store'}
        </h1>
        <p className="text-xl text-gray-200 mb-8 max-w-xl mx-auto">
          {content.subtitle || 'Discover curated collections designed for your lifestyle.'}
        </p>
        <button 
          className="px-8 py-4 font-bold text-white uppercase tracking-widest transition-transform active:scale-95"
          style={{ 
            backgroundColor: theme.primaryColor,
            borderRadius: theme.borderRadius
          }}
        >
          {content.ctaText || 'Shop Now'}
        </button>
      </div>
    </section>
  );
};

export default EditableHero;
