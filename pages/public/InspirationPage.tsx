
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { inspirationService } from '../../services/inspirationService';
import { userService } from '../../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import type { InspirationContent } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import BackButton from '../../components/BackButton';
import { useNavigate, useLocation } from 'react-router-dom';


// --- ICONS ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-white/80 drop-shadow-lg"><path d="M8 5v14l11-7z"></path></svg>;
// FIX: Updated the PlusIcon component to accept a className prop.
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}><path d="M12 5v14M5 12h14"/></svg>;
const ImageUploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>;
const AspectRatioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 13h4M16 7h4M4 21V3M4 7h4M4 13h4m-4 5h4"/></svg>;
const StyleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></svg>;
const DurationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const SearchSimilarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;

// Sidebar Icons
const AllIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const MyMediaIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const FavoritesIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            const mimeType = result.match(/data:(.*?);/)![1];
            resolve({ base64, mimeType });
        };
        reader.onerror = error => reject(error);
    });
};

const DAILY_VIDEO_LIMIT = 2;
const DAILY_IMAGE_LIMIT = 10;

const InspirationPage: React.FC = () => {
    const { user, updateUser, isAuthenticated, openAuthModal } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const [content, setContent] = useState<InspirationContent[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [pollingMessage, setPollingMessage] = useState('');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [error, setError] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos' | 'my-media' | 'favorites'>('all');
    const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
    const [generationMode, setGenerationMode] = useState<'video' | 'image'>('video');
    const [isPromptBarExpanded, setIsPromptBarExpanded] = useState(false);

    // Form state
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '3:4'>('16:9');
    const [initialImage, setInitialImage] = useState<{ base64: string; mimeType: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasAutoGenerated = useRef(false);

    // Veo API Key state
    const [hasApiKey, setHasApiKey] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                setHasApiKey(await window.aistudio.hasSelectedApiKey());
            }
        };
        checkKey();
        inspirationService.getInspirationContent().then(setContent);
    }, []);

    const today = new Date().toISOString().split('T')[0];
    const usage = useMemo(() => {
        const defaultUsage = { date: today, videos: 0, images: 0 };
        if (!user || !user.dailyUsage) return defaultUsage;
        if (user.dailyUsage.date !== today) return defaultUsage;
        return user.dailyUsage;
    }, [user, today]);

    const videosLeft = DAILY_VIDEO_LIMIT - usage.videos;
    const imagesLeft = DAILY_IMAGE_LIMIT - usage.images;

    const isGenerationDisabled = (generationMode === 'video' && videosLeft <= 0) || (generationMode === 'image' && imagesLeft <= 0);
    
    const handleApiKeySelect = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
        } else {
            showNotification("API Key selection is not available in this environment.");
        }
    };
    
    const handleInitialImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const { base64, mimeType } = await fileToBase64(file);
            setInitialImage({ base64, mimeType });
            showNotification("Image selected as starting point.");
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!isAuthenticated) {
            const promptData = { prompt, aspectRatio, initialImage, generationMode };
            navigate('/auth', { state: { from: location, action: 'generate-inspiration', promptData } });
            return;
        }

        if (!user) { openAuthModal('login'); return; }

        if (!prompt.trim() && !initialImage) {
            showNotification("Please enter a prompt or upload an image.");
            return;
        }
        
        if (!hasApiKey && generationMode === 'video') { handleApiKeySelect(); return; }
        if (isGenerationDisabled) return;

        setIsGenerating(true);
        setError('');
        
        const onPollCallback = (update: { message: string, progress: number }) => {
            setPollingMessage(update.message);
            setGenerationProgress(update.progress);
        };

        try {
            let newContentItem: InspirationContent;
            if (generationMode === 'video') {
                const videoUrl = await inspirationService.generateVideo(prompt, 5, aspectRatio as '16:9' | '9:16', 'cinematic', '', onPollCallback, initialImage);
                newContentItem = { id: `user-vid-${Date.now()}`, type: 'video', url: videoUrl, prompt, generatedBy: 'user', likes: 0 };
            } else {
                const imageUrl = await inspirationService.generateImage(prompt, aspectRatio, onPollCallback);
                newContentItem = { id: `user-img-${Date.now()}`, type: 'image', url: imageUrl, prompt, generatedBy: 'user', likes: 0 };
            }
            
            const newUsage = {
                date: today,
                videos: usage.videos + (generationMode === 'video' ? 1 : 0),
                images: usage.images + (generationMode === 'image' ? 1 : 0)
            };
            const updatedUser = await userService.updateUserProfile(user.id, { dailyUsage: newUsage });
            updateUser(updatedUser);

            setContent(prev => [newContentItem, ...prev]);
            showNotification(`Your ${generationMode} has been generated!`);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMsg.includes('Requested entity was not found')) {
                setError("Your API Key is invalid. Please select a valid key.");
                setHasApiKey(false);
            } else {
                setError(`Generation failed: ${errorMsg}`);
            }
        } finally {
            setIsGenerating(false);
            setGenerationProgress(0);
        }
    }, [isAuthenticated, user, prompt, aspectRatio, initialImage, generationMode, hasApiKey, isGenerationDisabled, navigate, location, openAuthModal, showNotification, today, usage, updateUser]);

    useEffect(() => {
        const autoGenerate = () => {
            if (location.state?.autoGenerate && !hasAutoGenerated.current && isAuthenticated) {
                hasAutoGenerated.current = true;
                const { promptData } = location.state;
                
                setPrompt(promptData.prompt);
                setAspectRatio(promptData.aspectRatio);
                setInitialImage(promptData.initialImage);
                setGenerationMode(promptData.generationMode);
                setIsPromptBarExpanded(true);

                navigate(location.pathname, { replace: true, state: {} });
                
                setTimeout(() => {
                    handleGenerate();
                }, 100);
            }
        };
        autoGenerate();
    }, [location.state, isAuthenticated, handleGenerate, navigate]);

    
    const handleToggleFavorite = (itemId: string) => {
        setFavorites(prev => 
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };
    
    const filteredContent = content.filter(c => {
        if (activeTab === 'all') return true;
        if (activeTab === 'images') return c.type === 'image';
        if (activeTab === 'videos') return c.type === 'video';
        if (activeTab === 'my-media') return c.generatedBy === 'user';
        if (activeTab === 'favorites') return favorites.includes(c.id);
        return false;
    });

    const videoAspectRatios = ['16:9', '9:16'];
    const imageAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    const availableAspectRatios = generationMode === 'video' ? videoAspectRatios : imageAspectRatios;

    useEffect(() => {
        if (!availableAspectRatios.includes(aspectRatio)) {
            setAspectRatio('16:9');
        }
    }, [generationMode, aspectRatio, availableAspectRatios]);

    const sidebarTabs = [
        { id: 'all', icon: <AllIcon />, label: 'All' },
        { id: 'images', icon: <ImageUploadIcon />, label: 'Images' },
        { id: 'videos', icon: <VideoIcon />, label: 'Videos' },
        { id: 'my-media', icon: <MyMediaIcon />, label: 'My Media' },
        { id: 'favorites', icon: <FavoritesIcon />, label: 'Favorites' }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-dark-background text-light-text dark:text-dark-text md:pl-60 pb-32">
            {isGenerating && (
                <div className="fixed inset-0 bg-black/80 z-[101] flex flex-col items-center justify-center gap-4 text-white">
                    <Spinner size="lg"/>
                    <p className="text-xl font-semibold">{pollingMessage}</p>
                    <div className="w-full max-w-md bg-gray-600 rounded-full h-2.5 mt-2">
                        <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${generationProgress}%` }}></div>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{generationProgress}% complete</p>
                </div>
            )}

            <aside className="fixed top-0 left-0 bottom-0 z-50 flex flex-col p-4 bg-gray-50 dark:bg-dark-surface border-r border-gray-200 dark:border-gray-700 w-60">
                <div className="h-16 mb-6 flex flex-col justify-center">
                    <BackButton to="/" alwaysShowText />
                    <h1 className="text-2xl font-extrabold font-display tracking-tight mt-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400">
                        INSPIRATION HUB
                    </h1>
                </div>
                 <nav className="flex flex-col gap-2 flex-grow">
                    {sidebarTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full text-left p-3 text-sm font-semibold rounded-lg flex items-center gap-3 transition-colors ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
                           {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
                {user && (
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-auto space-y-2">
                        <p>Daily Quota:</p>
                        <p>Videos Left: {videosLeft}/{DAILY_VIDEO_LIMIT}</p>
                        <p>Images Left: {imagesLeft}/{DAILY_IMAGE_LIMIT}</p>
                    </div>
                )}
            </aside>
            
            <main className="p-4 md:p-8">
                <div className="inspiration-grid">
                    {filteredContent.map(item => (
                        <div key={item.id} className="break-inside-avoid mb-4 relative cursor-pointer group">
                            {item.type === 'video' ? (
                                <video src={item.url} loop autoPlay muted playsInline className="w-full h-auto block rounded-lg" />
                            ) : (
                                <img src={item.url} alt={item.prompt} className="w-full h-auto block rounded-lg" />
                            )}
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                               <div className="flex justify-between items-center gap-2 pointer-events-auto">
                                    <span className="text-xs font-semibold text-gray-200">@{item.generatedBy === 'user' ? user?.name || 'You' : 'UrbanPrimeAI'}</span>
                                    <div className="flex items-center gap-2">
                                        <button title="Search for similar" className="bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-full w-8 h-8 flex items-center justify-center"><SearchSimilarIcon/></button>
                                        <button onClick={() => handleToggleFavorite(item.id)} title="Like" className={`backdrop-blur-sm text-white border border-white/30 rounded-full w-8 h-8 flex items-center justify-center ${favorites.includes(item.id) ? 'bg-red-500 border-red-500' : 'bg-white/20'}`}>
                                            <HeartIcon/>
                                        </button>
                                        <span className="text-xs font-bold text-white">{item.likes}</span>
                                    </div>
                               </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className={`fixed bottom-6 left-0 right-0 mx-auto z-40 md:left-60 transition-all duration-500 ease-in-out ${isPromptBarExpanded ? 'w-full max-w-5xl' : 'w-auto'}`}>
                <div className={`bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-700 flex items-center gap-2 transition-all duration-500 ease-in-out ${isPromptBarExpanded ? 'rounded-2xl p-3' : 'rounded-full p-2'}`}>
                    <div className="flex items-center gap-2 flex-grow">
                        <PlusIcon className="text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2" />
                        <input 
                            value={prompt} 
                            onChange={e => {
                                setPrompt(e.target.value);
                                if (e.target.value) setIsPromptBarExpanded(true);
                            }}
                            onFocus={() => setIsPromptBarExpanded(true)}
                            onBlur={() => { if (!prompt && !initialImage) setIsPromptBarExpanded(false); }}
                            placeholder={isPromptBarExpanded ? "A cinematic shot of a panda on a skateboard..." : "Generate..."} 
                            className={`bg-transparent border-none text-light-text dark:text-dark-text placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 transition-all duration-300 ${isPromptBarExpanded ? 'w-full' : 'w-24'}`} 
                        />
                    </div>
                    <div className={`flex items-center gap-2 flex-shrink-0 transition-opacity duration-300 ${isPromptBarExpanded ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden'}`}>
                         <div className="p-1 bg-gray-200 dark:bg-gray-900 rounded-lg flex gap-1">
                            <button onClick={() => setGenerationMode('video')} title="Generate Video" className={`p-1.5 rounded-md ${generationMode === 'video' ? 'bg-white dark:bg-dark-surface shadow-sm' : ''}`}><VideoIcon /></button>
                            <button onClick={() => setGenerationMode('image')} title="Generate Image" className={`p-1.5 rounded-md ${generationMode === 'image' ? 'bg-white dark:bg-dark-surface shadow-sm' : ''}`}><ImageUploadIcon /></button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleInitialImageUpload} accept="image/*" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} title="Upload starting image" className={`p-2 rounded-lg border transition-colors ${initialImage ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}><ImageUploadIcon /></button>
                        <div className="relative">
                            <button onClick={() => setIsAspectRatioOpen(p => !p)} title="Aspect Ratio" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"><AspectRatioIcon /></button>
                             {isAspectRatioOpen && (
                                <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-dark-surface rounded-lg p-3 shadow-lg border dark:border-gray-700 w-40" onMouseLeave={() => setIsAspectRatioOpen(false)}>
                                    <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Aspect Ratio</h4>
                                    <div className="space-y-1">
                                        {availableAspectRatios.map(r => (
                                            <label key={r} className="flex items-center p-1.5 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <input type="radio" name="aspect-ratio" value={r} checked={aspectRatio === r} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-4 h-4 mr-2 accent-primary"/>
                                                <span className="text-sm">{r}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                             )}
                        </div>
                        <button title="Style (coming soon)" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"><StyleIcon /></button>
                        <button title="Help" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"><HelpIcon /></button>
                    </div>
                     <button onClick={handleGenerate} disabled={isGenerationDisabled} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg text-sm disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isGenerationDisabled ? "Limit Reached" : "Generate"}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default InspirationPage;
