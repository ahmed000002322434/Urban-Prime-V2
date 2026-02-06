
import React from 'react';
import type { StoreSection, Item } from '../../types';
import HeroSection from './HeroSection';
import ProductGrid from './ProductGrid';
import BrandingBar from './BrandingBar';

interface StorefrontPreviewProps {
  sections: StoreSection[];
  primaryColor: string;
  logoText: string;
  mockItems: Item[];
}

const StorefrontPreview: React.FC<StorefrontPreviewProps> = ({ sections, primaryColor, logoText, mockItems }) => {
  return (
    <div className="w-full min-h-full bg-white dark:bg-[#050505] overflow-y-auto">
      {sections.map((section) => {
        if (!section.isVisible) return null;

        switch (section.type) {
          case 'BrandingBar':
            return (
              <BrandingBar 
                key={section.id}
                logoText={logoText}
                primaryColor={primaryColor}
                navItems={section.props.navItems || ['Shop', 'About', 'Contact']}
              />
            );
          case 'Hero':
            return (
              <HeroSection 
                key={section.id}
                {...section.props}
                primaryColor={primaryColor}
              />
            );
          case 'FeaturedCollection':
            return (
              <ProductGrid 
                key={section.id}
                title={section.props.title}
                items={mockItems}
                columns={section.props.columns || 4}
              />
            );
          case 'AnnouncementBar':
            return (
              <div 
                key={section.id} 
                className="text-center py-2 px-4 text-xs font-bold uppercase tracking-widest text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {section.props.text || "Free shipping on orders over $100"}
              </div>
            );
          case 'AboutUs':
            return (
              <section key={section.id} className="py-16 px-6 container mx-auto grid md:grid-cols-2 gap-12 items-center">
                <div>
                   <h3 className="text-3xl font-black mb-6 font-display">{section.props.title || "Our Story"}</h3>
                   <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{section.props.content || "Passionate about providing the best urban gear for modern explorers."}</p>
                </div>
                <div className="aspect-video bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden shadow-xl">
                  <img src={section.props.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop'} className="w-full h-full object-cover" />
                </div>
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};

export default StorefrontPreview;
