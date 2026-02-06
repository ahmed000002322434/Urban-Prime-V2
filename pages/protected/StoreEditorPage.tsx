
import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useUserData } from '../../hooks/useUserData';
import { storefrontService } from '../../services/storefrontService';
import { generateStoreLayout, refineTextWithAI, generateStoreSEO } from '../../services/geminiService';
import type { StoreLayout, StoreSection, SectionType } from '../../storeTypes';
import EditableHero from '../../components/builder/sections/EditableHero';
import EditableProductGrid from '../../components/builder/sections/EditableProductGrid';
import EditableTextSection from '../../components/builder/sections/EditableTextSection';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import AIShimmer from '../../components/builder/AIShimmer';
import LaunchModal from '../../components/builder/LaunchModal';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="currentColor" className="text-purple-600"><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 18 1.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" /></svg>;

const DEFAULT_LAYOUT: StoreLayout = {
  slug: '',
  isLive: false,
  theme: { primaryColor: '#0fb9b1', font: 'Inter', borderRadius: '12px', backgroundColor: '#ffffff' },
  sections: [{ id: 'sec_1', type: 'hero', order: 0, content: { title: 'New Store' } }],
  seo: { metaTitle: '', metaDescription: '', socialImage: '' }
};

const StoreEditorPage: React.FC = () => {
  const { user } = useAuth();
  const { storefront, isLoading: dataLoading } = useUserData();
  const [draft, setDraft] = useState<StoreLayout>(DEFAULT_LAYOUT);
  const [history, setHistory] = useState<StoreLayout[]>([]);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [sidebarTab, setSidebarTab] = useState<'layout' | 'ai' | 'seo'>('layout');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isRefiningSEO, setIsRefiningSEO] = useState(false);

  useEffect(() => {
    if (storefront && storefront.layout) {
        try { setDraft(JSON.parse(storefront.layout)); } catch(e) {}
    }
  }, [storefront]);

  const updateDraft = (updates: Partial<StoreLayout>) => {
    setHistory(prev => [...prev, draft].slice(-10));
    setDraft({ ...draft, ...updates });
  };

  const handleAISEO = async () => {
    setIsRefiningSEO(true);
    try {
        const result = await generateStoreSEO(storefront?.name || 'My Store', draft.sections[0]?.content.title || '', ['luxury', 'gear']);
        setDraft(prev => ({ ...prev, seo: result }));
    } catch(e) {} finally { setIsRefiningSEO(false); }
  };

  const handleFinalPublish = async () => {
    if (!user) return;
    await storefrontService.saveStorefront(user.id, { ...storefront, layout: JSON.stringify({ ...draft, isLive: true }) } as any);
  };

  if (dataLoading) return <div className="h-screen flex items-center justify-center bg-black"><Spinner size="lg" /></div>;

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-[#050505] flex overflow-hidden font-sans">
      <AnimatePresence>
        {isLaunchModalOpen && (
            <LaunchModal 
                draft={draft}
                hasProducts={true} // Logic should check actual inventory
                hasAddress={!!storefront?.shippingSettings}
                onConfirm={handleFinalPublish}
                onClose={() => setIsLaunchModalOpen(false)}
            />
        )}
      </AnimatePresence>

      <aside className="w-[350px] bg-white/70 dark:bg-[#121212]/80 backdrop-blur-3xl border-r border-gray-200 dark:border-white/10 flex flex-col z-20 shadow-2xl">
        <header className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <BackButton to="/profile" text="Exit" />
          <button 
            onClick={() => setIsLaunchModalOpen(true)}
            className="px-5 py-1.5 bg-primary text-white font-black uppercase tracking-widest rounded-xl text-[10px]"
          >
            Launch
          </button>
        </header>

        <div className="flex border-b border-gray-100 dark:border-white/5">
            <button onClick={() => setSidebarTab('layout')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest ${sidebarTab === 'layout' ? 'text-primary' : 'text-gray-400'}`}>Design</button>
            <button onClick={() => setSidebarTab('ai')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest ${sidebarTab === 'ai' ? 'text-primary' : 'text-gray-400'}`}>AI Magic</button>
            <button onClick={() => setSidebarTab('seo')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest ${sidebarTab === 'seo' ? 'text-primary' : 'text-gray-400'}`}>SEO</button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            {sidebarTab === 'seo' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SEO Settings</h3>
                         <button onClick={handleAISEO} disabled={isRefiningSEO} className="text-primary text-[10px] font-bold flex items-center gap-1">
                            {isRefiningSEO ? <Spinner size="sm" /> : <><SparklesIcon /> AI Gen</>}
                         </button>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Slug (URL)</label>
                        <input 
                            value={draft.slug} 
                            onChange={e => updateDraft({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            className="w-full mt-1 p-3 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-sm font-mono" 
                            placeholder="my-cool-store"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Meta Title</label>
                        <input 
                            value={draft.seo.metaTitle} 
                            onChange={e => updateDraft({ seo: { ...draft.seo, metaTitle: e.target.value } })}
                            className="w-full mt-1 p-3 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-sm" 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Meta Description</label>
                        <textarea 
                            value={draft.seo.metaDescription} 
                            onChange={e => updateDraft({ seo: { ...draft.seo, metaDescription: e.target.value } })}
                            rows={4}
                            className="w-full mt-1 p-3 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-sm" 
                        />
                    </div>
                </div>
            )}
            
            {sidebarTab === 'layout' && (
                <div className="space-y-8">
                     <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sections</h3>
                     <Reorder.Group axis="y" values={draft.sections} onReorder={(newOrder) => setDraft({...draft, sections: newOrder})} className="space-y-3">
                        {draft.sections.map((section) => (
                            <Reorder.Item key={section.id} value={section} className="p-4 rounded-2xl bg-white dark:bg-white/5 border dark:border-white/5 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="text-gray-400"><MenuIcon /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{section.type}</span>
                                    </div>
                                    <button onClick={() => setDraft({ ...draft, sections: draft.sections.filter(s => s.id !== section.id) })} className="text-red-500"><TrashIcon /></button>
                                </div>
                            </Reorder.Item>
                        ))}
                     </Reorder.Group>
                </div>
            )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center bg-gray-200 dark:bg-black relative overflow-hidden transition-all duration-500">
        <div className="h-16 flex items-center justify-center gap-4 w-full bg-white dark:bg-[#121212] border-b dark:border-white/10 z-10">
          <button onClick={() => setViewport('desktop')} className={`px-6 py-1.5 text-[10px] font-black uppercase rounded-full ${viewport === 'desktop' ? 'bg-primary text-white' : 'text-gray-500'}`}>Desktop</button>
          <button onClick={() => setViewport('mobile')} className={`px-6 py-1.5 text-[10px] font-black uppercase rounded-full ${viewport === 'mobile' ? 'bg-primary text-white' : 'text-gray-500'}`}>Mobile</button>
        </div>

        <div className="flex-1 w-full p-10 flex justify-center items-center overflow-y-auto no-scrollbar scroll-smooth">
          <motion.div
            animate={{ width: viewport === 'mobile' ? 375 : '100%', height: viewport === 'mobile' ? 812 : '100%', borderRadius: viewport === 'mobile' ? '48px' : '0px' }}
            className="bg-white dark:bg-[#0a0a0a] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden border-8 border-transparent dark:border-[#111] relative"
          >
            {isGenerating && <AIShimmer />}
            <div className="w-full h-full overflow-y-auto no-scrollbar">
               {draft.sections.map(section => (
                 <div key={section.id}>
                   {section.type === 'hero' && <EditableHero content={section.content} theme={draft.theme} />}
                   {section.type === 'products' && <EditableProductGrid content={section.content} theme={draft.theme} />}
                   {section.type === 'info' && <EditableTextSection content={section.content} theme={draft.theme} />}
                 </div>
               ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default StoreEditorPage;
