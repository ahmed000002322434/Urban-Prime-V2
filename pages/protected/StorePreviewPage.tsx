




import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { storefrontService } from '../../services/storefrontService';
import { userService } from '../../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import type { Store, AIStorePage } from '../../types';
import Spinner from '../../components/Spinner';
import StoreAIChat from '../../components/StoreAIChat';
import StoreHeader from '../../components/storefront/StoreHeader';
// FIX: Changed import to a named import.
import { StorefrontRenderer } from '../../components/storefront/StorefrontRenderer';
import BackButton from '../../components/BackButton';

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-border">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4">
                <span className="font-bold text-text-primary">{title}</span>
                <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && <div className="p-4 pt-0 space-y-4">{children}</div>}
        </div>
    );
};

const EditorSidebar: React.FC<{ storefront: Store; onUpdate: (path: string, value: any) => void; onHover: (key: string | null) => void; }> = ({ storefront, onUpdate, onHover }) => {
    const { brandingKit } = storefront;
    const fonts = ['Inter', 'Poppins', 'Playfair Display', 'Roboto', 'Lato', 'Montserrat', 'Oswald', 'Raleway'];
    const fontSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };
    const cornerRadii = { none: 'rounded-none', sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' };
    
    return (
        <aside className="w-80 bg-surface text-text-primary flex-shrink-0 flex flex-col border-r border-border h-screen">
            <header className="p-4 border-b border-border">
                <h2 className="text-xl font-bold">Store Editor</h2>
            </header>
            <div className="flex-1 overflow-y-auto">
                <AccordionItem title="Branding" defaultOpen>
                    <div onMouseEnter={() => onHover('brandingKit.palette.primary')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Primary Color</label>
                        <input type="color" value={brandingKit.palette.primary} onChange={e => onUpdate('brandingKit.palette.primary', e.target.value)} className="w-full h-8 mt-1 border border-border" />
                    </div>
                     <div onMouseEnter={() => onHover('brandingKit.palette.secondary')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Background Color</label>
                        <input type="color" value={brandingKit.palette.secondary} onChange={e => onUpdate('brandingKit.palette.secondary', e.target.value)} className="w-full h-8 mt-1 border border-border" />
                    </div>
                     <div onMouseEnter={() => onHover('brandingKit.palette.accent')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Accent Color</label>
                        <input type="color" value={brandingKit.palette.accent} onChange={e => onUpdate('brandingKit.palette.accent', e.target.value)} className="w-full h-8 mt-1 border border-border" />
                    </div>
                </AccordionItem>
                <AccordionItem title="Typography">
                     <div onMouseEnter={() => onHover('brandingKit.fontPairing.heading')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Heading Font</label>
                        <select value={brandingKit.fontPairing.heading} onChange={e => onUpdate('brandingKit.fontPairing.heading', e.target.value)} className="w-full p-2 mt-1 border rounded-md text-sm bg-surface-soft border-border">
                            {fonts.map(f => <option key={f}>{f}</option>)}
                        </select>
                    </div>
                     <div onMouseEnter={() => onHover('brandingKit.fontPairing.body')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Body Font</label>
                        <select value={brandingKit.fontPairing.body} onChange={e => onUpdate('brandingKit.fontPairing.body', e.target.value)} className="w-full p-2 mt-1 border rounded-md text-sm bg-surface-soft border-border">
                            {fonts.map(f => <option key={f}>{f}</option>)}
                        </select>
                    </div>
                    <div onMouseEnter={() => onHover('brandingKit.fontSize')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Font Size</label>
                        <div className="flex bg-surface-soft rounded-md p-1 mt-1 border border-border">
                           {Object.keys(fontSizes).map(size => (
                                <button key={size} onClick={() => onUpdate('brandingKit.fontSize', size)} className={`flex-1 text-xs py-1 rounded ${brandingKit.fontSize === size ? 'bg-background shadow-sm' : ''}`}>{size.toUpperCase()}</button>
                           ))}
                        </div>
                    </div>
                </AccordionItem>
                 <AccordionItem title="Layout">
                     <div onMouseEnter={() => onHover('brandingKit.cornerRadius')} onMouseLeave={() => onHover(null)}>
                        <label className="text-sm font-semibold">Corner Style</label>
                        <div className="flex bg-surface-soft rounded-md p-1 mt-1 border border-border">
                           {Object.keys(cornerRadii).map(size => (
                                <button key={size} onClick={() => onUpdate('brandingKit.cornerRadius', size)} className={`flex-1 text-xs py-1 rounded ${brandingKit.cornerRadius === size ? 'bg-background shadow-sm' : ''}`}>{size.toUpperCase()}</button>
                           ))}
                        </div>
                    </div>
                </AccordionItem>
            </div>
        </aside>
    );
};

const StoreEditorPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const generatedStorefront = location.state?.storefront as Store | undefined;

  const [storefront, setStorefront] = useState<Store | null>(generatedStorefront || null);
  const [activePage, setActivePage] = useState<AIStorePage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  
  useEffect(() => {
    if (!storefront) { navigate('/create-store'); return; }
    if (storefront.pages && storefront.pages.length > 0) {
      setActivePage(storefront.pages.find(p => p.slug === 'home') || storefront.pages[0]);
    }
  }, [storefront, navigate]);

  const handleUpdate = (path: string, value: any) => {
    setStorefront(prev => {
        if (!prev) return null;
        const keys = path.split('.');
        const newStore = JSON.parse(JSON.stringify(prev));
        let current = newStore;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newStore;
    });
  };

  const handleSave = async () => {
    if (!user || !storefront) return;
    setIsSaving(true);
    try {
        const savedStore = await storefrontService.saveStorefront(user.id, storefront);
        // Fixed: Removed update to storeId as it does not exist on User type
        navigate('/profile/store');
    } catch (err) {
        console.error("Failed to save storefront", err);
        alert("Could not save your store. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAIUpdate = (newStorefront: Store) => {
      setStorefront(newStorefront);
      const activePageStillExists = newStorefront.pages.find(p => p.slug === activePage?.slug);
      setActivePage(activePageStillExists || newStorefront.pages.find(p => p.slug === 'home') || newStorefront.pages[0]);
  }
  
  if (!storefront) {
    return <div className="h-screen w-full flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  const { brandingKit } = storefront;
  const customStyles = {
    '--theme-primary': brandingKit?.palette?.primary || '#3a77ff',
    '--theme-secondary': brandingKit?.palette?.secondary || '#f8f9fa',
    '--theme-accent': brandingKit?.palette?.accent || '#ffce32',
  } as React.CSSProperties;

  const handleNavClick = (slug: string) => {
    const newPage = storefront?.pages.find(p => p.slug === slug);
    if (newPage) setActivePage(newPage);
  }

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
        <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${brandingKit?.fontPairing?.heading?.replace(' ', '+') || 'Lexend'}:wght@700;900&family=${brandingKit?.fontPairing?.body?.replace(' ', '+') || 'Inter'}:wght@400;600&display=swap`}/>
        
        <EditorSidebar storefront={storefront} onUpdate={handleUpdate} onHover={setHoveredAnnotation} />

        <div className="flex-1 flex flex-col">
            <header className="p-3 bg-surface border-b border-border flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <BackButton to="/create-store" />
                    <p className="text-sm font-semibold hidden md:block">Live Editor</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/store/${storefront.slug}`)} className="px-4 py-2 text-sm bg-surface-soft font-semibold rounded-md hover:bg-border">
                        Exit
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-primary text-primary-text font-semibold rounded-md text-sm disabled:bg-gray-400 flex items-center justify-center">
                        {isSaving ? <Spinner size="sm" /> : 'Save & Publish'}
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto" style={customStyles}>
                <div style={{fontFamily: `'${brandingKit?.fontPairing?.body || 'Inter'}', sans-serif`}}>
                    {storefront.banner && (
                        <div className={`bg-[var(--theme-accent)] text-center p-2 font-semibold text-sm ${hoveredAnnotation === 'banner.text' ? 'is-annotated' : ''}`} >
                            {storefront.banner.text}
                        </div>
                    )}

                    <StoreHeader 
                        brandingKit={brandingKit}
                        pages={storefront.pages}
                        activePageSlug={activePage?.slug || ''}
                        onNavClick={handleNavClick}
                        hoveredAnnotation={hoveredAnnotation}
                        baseAnnotationPath="store"
                    />
                    
                    {activePage && user && (
                        <StorefrontRenderer 
                            page={activePage}
                            brandingKit={storefront.brandingKit}
                            ownerId={user.id}
                            hoveredAnnotation={hoveredAnnotation}
                            baseAnnotationPath="store"
                        />
                    )}
                </div>
            </main>
        </div>
        <StoreAIChat currentStorefront={storefront} onUpdate={handleAIUpdate} />
    </div>
  );
};

export default StoreEditorPage;