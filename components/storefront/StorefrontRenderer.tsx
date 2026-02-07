
import React, { useState, useEffect } from 'react';
import { itemService } from '../../services/itemService';
import type { PageComponent, BrandingKit, HeroComponent, FeatureListComponent, ImageWithTextComponent, TestimonialsComponent, CallToActionComponent, ItemListComponent, Item, GalleryComponent, StatsComponent, ProcessComponent, AIStorePage } from '../../types';
import Spinner from '../Spinner';
import ItemCard from '../ItemCard';
import QuickViewModal from '../QuickViewModal';
import { motion, Variants } from 'framer-motion';

interface StorefrontRendererProps {
    page: AIStorePage;
    brandingKit: BrandingKit;
    ownerId: string;
    hoveredAnnotation?: string | null;
    baseAnnotationPath?: string;
}

interface ComponentProps {
    brandingKit: BrandingKit;
    hoveredAnnotation?: string | null;
    baseAnnotationPath?: string;
}

const Hero: React.FC<ComponentProps & HeroComponent['props']> = ({ title, subtitle, ctaText, ctaLink, imageUrl, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    const placeholderUrl = `https://picsum.photos/seed/${encodeURIComponent(imageUrl || title)}/1200/600`;
    
    const CtaButton = () => (
        <button style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }} className={`mt-8 px-8 py-3 font-bold shadow-lg hover:opacity-90 transition-opacity ${isAnnotated('ctaText') ? 'is-annotated' : ''} rounded-lg`}>
            {ctaText}
        </button>
    );

    return (
        <div className="text-center py-20 md:py-32">
            <div className="container mx-auto px-4">
                <h1 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-4xl md:text-6xl font-extrabold tracking-tight ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h1>
                <p style={{ fontFamily: `'${brandingKit?.fontPairing?.body || 'Inter'}', sans-serif` }} className={`mt-4 text-lg md:text-xl max-w-2xl mx-auto text-gray-700 ${isAnnotated('subtitle') ? 'is-annotated' : ''}`}>{subtitle}</p>
                {ctaText && (ctaLink ? <a href={ctaLink}><CtaButton /></a> : <CtaButton />)}
                {imageUrl && <img src={placeholderUrl} alt={title} className={`mt-12 shadow-2xl mx-auto ${isAnnotated('imageUrl') ? 'is-annotated' : ''} rounded-lg`} />}
            </div>
        </div>
    );
};

const FeatureList: React.FC<ComponentProps & FeatureListComponent['props']> = ({ title, features, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    const icons: Record<string, React.ReactNode> = {
        check: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
        star: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
        zap: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2z" /></svg>,
    };
    return (
        <div className="py-20">
            <div className="container mx-auto px-4">
                <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold text-center mb-12 ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
                <div className="grid md:grid-cols-3 gap-10">
                    {features.map((feature, index) => (
                        <div key={index} className="text-center p-4">
                            <div className="flex justify-center items-center mb-4 w-12 h-12 rounded-full mx-auto" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>{icons[feature.icon]}</div>
                            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }}>{feature.title}</h3>
                            <p className="text-gray-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ImageWithText: React.FC<ComponentProps & ImageWithTextComponent['props']> = ({ title, text, imageUrl, imagePosition, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    const placeholderUrl = `https://picsum.photos/seed/${encodeURIComponent(imageUrl)}/800/600`;
    return (
        <div className="py-20">
            <div className="container mx-auto px-4">
                <div className={`flex flex-col md:flex-row items-center gap-12 ${imagePosition === 'right' ? 'md:flex-row-reverse' : ''}`}>
                    <div className={`md:w-1/2 ${isAnnotated('imageUrl') ? 'is-annotated' : ''}`}><img src={placeholderUrl} alt={title} className="rounded-lg shadow-xl" /></div>
                    <div className="md:w-1/2">
                        <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold mb-4 ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
                        <p className={`text-gray-700 leading-relaxed ${isAnnotated('text') ? 'is-annotated' : ''}`}>{text}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Testimonials: React.FC<ComponentProps & TestimonialsComponent['props']> = ({ title, testimonials, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    return (
        <div className="py-20">
            <div className="container mx-auto px-4">
                <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold text-center mb-12 ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-white p-6 rounded-lg shadow-lg border-l-4" style={{ borderColor: 'var(--theme-primary)'}}>
                            <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
                            <p className="font-bold text-right">- {testimonial.author}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CallToAction: React.FC<ComponentProps & CallToActionComponent['props']> = ({ title, text, ctaText, ctaLink, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    const CtaButton = () => (
        <button style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }} className="mt-6 px-8 py-3 font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity">
            {ctaText}
        </button>
    );

    return (
        <div className="py-20">
            <div className="container mx-auto px-4 text-center">
                <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
                <p className={`mt-3 text-lg text-gray-600 max-w-xl mx-auto ${isAnnotated('text') ? 'is-annotated' : ''}`}>{text}</p>
                {ctaLink ? <a href={ctaLink}><CtaButton /></a> : <CtaButton />}
            </div>
        </div>
    );
};

const ItemList: React.FC<{brandingKit: BrandingKit; ownerId: string; onQuickView: (item: Item) => void} & ComponentProps & ItemListComponent['props']> = ({ title, ownerId, brandingKit, onQuickView, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        itemService.getItemsByOwner(ownerId).then(data => {
            setItems(data);
            setIsLoading(false);
        });
    }, [ownerId]);
    
    if (items.length === 0 && !isLoading) {
        return (
             <div className="py-20 text-center text-gray-500">
                <h3 className="text-xl font-semibold text-gray-700">Coming Soon!</h3>
                <p>This store is new. Products are coming soon.</p>
            </div>
        )
    };

    return (
        <div id="items" className="py-20">
            <div className="container mx-auto px-4">
                <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold text-center mb-12 ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
                {isLoading ? <Spinner /> : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map(item => <ItemCard key={item.id} item={item} onQuickView={onQuickView} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

const Gallery: React.FC<ComponentProps & GalleryComponent['props']> = ({ title, images, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    return (
    <div className="py-20">
        <div className="container mx-auto px-4">
            <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold text-center mb-12 ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                    <div key={index} className="group relative overflow-hidden rounded-lg">
                        <img src={`https://picsum.photos/seed/${encodeURIComponent(image.imageUrl)}/600/400`} alt={image.caption} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <p className="text-white font-semibold text-sm">{image.caption}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
    );
};

const Stats: React.FC<ComponentProps & StatsComponent['props']> = ({ stats, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    return (
        <div className="py-16">
            <div className="container mx-auto px-4">
                <div className={`flex justify-around text-center ${isAnnotated('stats') ? 'is-annotated' : ''}`}>
                    {stats.map((stat, index) => (
                        <div key={index}>
                            <p style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif`, color: 'var(--theme-primary)' }} className="text-4xl font-bold">{stat.value}</p>
                            <p className="text-gray-500 font-semibold uppercase text-sm mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ProcessDisplay: React.FC<ComponentProps & ProcessComponent['props']> = ({ title, steps, brandingKit, hoveredAnnotation, baseAnnotationPath }) => {
    const isAnnotated = (key: string) => hoveredAnnotation === `${baseAnnotationPath}.${key}`;
    const icons: Record<string, React.ReactNode> = {
        list: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
        book: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
        earn: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
     };
    return (
        <div className="py-20">
            <div className="container mx-auto px-4">
                <h2 style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }} className={`text-3xl font-bold text-center mb-12 ${isAnnotated('title') ? 'is-annotated' : ''}`}>{title}</h2>
                <div className="grid md:grid-cols-3 gap-10 text-center">
                    {steps.map((step, index) => (
                        <div key={index} className="p-4">
                             <div className="flex justify-center items-center mb-4 w-16 h-16 rounded-full mx-auto" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>{icons[step.icon]}</div>
                            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: `'${brandingKit?.fontPairing?.heading || 'Lexend'}', sans-serif` }}>{step.title}</h3>
                            <p className="text-gray-600">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const componentMap: { [key: string]: React.ComponentType<any> } = {
    Hero,
    FeatureList,
    ImageWithText,
    Testimonials,
    CallToAction,
    ItemList,
    Gallery,
    Stats,
    Process: ProcessDisplay,
};

export const StorefrontRenderer: React.FC<StorefrontRendererProps> = ({ page, brandingKit, ownerId, hoveredAnnotation, baseAnnotationPath }) => {
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    const sectionVariants: Variants = {
        hidden: { opacity: 0, y: 75, rotateX: -20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            transition: { duration: 0.8, ease: [0.6, 0.05, -0.01, 0.9] },
        },
    };

    return (
        <div style={{ perspective: '1200px' }}>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            {page.content.map((componentData, index) => {
                const Component = componentMap[componentData.component];
                if (!Component) {
                    return <div key={index} className="text-red-500">Unknown component: {componentData.component}</div>;
                }
                
                const currentBaseAnnotationPath = `${baseAnnotationPath || ''}.pages.${page.slug}.content.${index}.props`;
                const isSectionAnnotated = hoveredAnnotation === `${currentBaseAnnotationPath}.backgroundColor` || hoveredAnnotation === `${currentBaseAnnotationPath}.textColor`;

                const sectionStyle = {
                    backgroundColor: componentData.props.backgroundColor,
                    color: componentData.props.textColor
                };

                return (
                    <motion.div
                        key={index}
                        variants={sectionVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        <section style={sectionStyle} className={`transition-all duration-200 ${isSectionAnnotated ? 'is-annotated' : ''}`}>
                            <Component 
                                {...componentData.props} 
                                brandingKit={brandingKit} 
                                ownerId={ownerId} 
                                onQuickView={setQuickViewItem}
                                hoveredAnnotation={hoveredAnnotation}
                                baseAnnotationPath={currentBaseAnnotationPath}
                            />
                        </section>
                    </motion.div>
                );
            })}
        </div>
    );
};

