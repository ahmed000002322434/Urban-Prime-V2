
import React from 'react';
import type { AIStorePage, BrandingKit } from '../../types';

interface StoreHeaderProps {
  brandingKit: BrandingKit;
  pages: AIStorePage[];
  activePageSlug: string;
  onNavClick: (slug: string) => void;
  hoveredAnnotation?: string | null;
  baseAnnotationPath?: string;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ brandingKit, pages, activePageSlug, onNavClick, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    
    return (
        <header className="bg-white border-b" style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }}>
            <div className="container mx-auto flex items-center justify-between p-4 flex-wrap">
                 <div className={`transition-all duration-200 ${isAnnotated('brandingKit.logo') ? 'is-annotated' : ''}`}>
                    {brandingKit?.logoUrl ? (
                        <img src={brandingKit.logoUrl} alt="Store Logo" className="h-12 w-auto object-contain" />
                    ) : (
                        <span className="text-2xl font-bold">{brandingKit?.logoDescription}</span>
                    )}
                 </div>
                <nav className="flex items-center justify-center gap-6">
                    {pages.map(page => (
                        <button 
                            key={page.slug} 
                            onClick={() => onNavClick(page.slug)}
                            className={`py-3 px-2 font-semibold border-b-2 capitalize transition-colors ${activePageSlug === page.slug ? 'border-[var(--theme-primary)] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                            style={{ color: activePageSlug === page.slug ? 'var(--theme-primary)' : ''}}
                        >
                            {page.slug.split('/').pop()?.replace(/-/g, ' ')}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default StoreHeader;