
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import { interactWithUrbanGenie } from '../../services/geminiService';
import type { Item, GenieLook, GenieResponse, GenieDraftListing, Message, ChatSession } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { useCart } from '../../hooks/useCart';
import { useTheme } from '../../hooks/useTheme';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';

// --- Icons ---
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
    </svg>
);

const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const AttachmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const MapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

// --- Components ---
const GroundingSources: React.FC<{ sources: any[] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;
    return (
        <div className="mt-3 bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-black/10 dark:border-white/10">
            <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Verified Sources</h4>
            <div className="flex flex-wrap gap-2">
                {sources.map((source, index) => {
                    const web = source.web;
                    if (web) {
                        return (
                            <a href={web.uri} target="_blank" rel="noopener noreferrer" key={index} className="text-xs bg-white dark:bg-black/50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:underline truncate max-w-[150px]">
                                {web.title || new URL(web.uri).hostname}
                            </a>
                        );
                    }
                    const maps = source.maps;
                    if(maps) {
                        return (
                             <a href={maps.uri} target="_blank" rel="noopener noreferrer" key={index} className="text-xs bg-white dark:bg-black/50 text-green-600 dark:text-green-400 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:underline">
                                📍 {maps.title}
                            </a>
                        )
                    }
                    return null;
                })}
            </div>
        </div>
    )
};

// Animated Background Component
const DynamicBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50 dark:bg-[#050505] transition-colors duration-700">
            <div className="dark:hidden">
                <motion.div 
                    animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/60 rounded-full blur-[120px]"
                />
                 <motion.div 
                    animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-cyan-100/50 rounded-full blur-[120px]"
                />
            </div>
            <div className="hidden dark:block">
                <motion.div 
                     animate={{ opacity: [0.15, 0.25, 0.15] }}
                     transition={{ duration: 10, repeat: Infinity }}
                     className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#0f172a]/80 to-transparent blur-3xl"
                />
            </div>
        </div>
    );
};

const NavigationWidget: React.FC<{ path: string, onNavigate: (path: string) => void }> = ({ path, onNavigate }) => (
    <div className="mt-4 p-4 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-blue-200 dark:border-blue-900/30 rounded-2xl shadow-lg flex items-center justify-between group cursor-pointer hover:border-blue-400 transition-colors" onClick={() => onNavigate(path)}>
        <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                 <ArrowRightIcon />
             </div>
             <div>
                 <p className="text-sm font-bold text-gray-900 dark:text-white">Quick Navigation</p>
                 <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{path}</p>
             </div>
        </div>
        <button className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg group-hover:bg-blue-700">Go</button>
    </div>
);

const SearchResultsWidget: React.FC<{ itemIds: string[] }> = ({ itemIds }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if(itemIds.length > 0) {
             // Fetch items (Mocking batch fetch or individual)
             // In real app use a batch get
             Promise.all(itemIds.map(id => itemService.getItemById(id)))
                .then(results => setItems(results.filter(Boolean) as Item[]))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [itemIds]);

    if(loading) return <div className="p-4"><Spinner size="sm"/></div>;
    if(items.length === 0) return null;

    return (
        <div className="mt-4 -mx-4 md:mx-0">
             <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar snap-x">
                 {items.map(item => (
                     <Link to={`/item/${item.id}`} key={item.id} className="min-w-[160px] w-[160px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all snap-center block">
                         <div className="aspect-square bg-gray-100 dark:bg-black/20">
                             <img src={item.imageUrls?.[0] || item.images?.[0] || `https://picsum.photos/seed/${item.id}/300/300`} alt={item.title} className="w-full h-full object-cover" />
                         </div>
                         <div className="p-3">
                             <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">${item.salePrice || item.rentalPrice}</p>
                         </div>
                     </Link>
                 ))}
             </div>
        </div>
    )
}

const DraftListingWidget: React.FC<{ draft: GenieDraftListing; onPublish: (draft: GenieDraftListing) => void }> = ({ draft, onPublish }) => {
    const [editedDraft, setEditedDraft] = useState(draft);
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="mt-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border border-green-200 dark:border-green-900/30 rounded-2xl p-5 shadow-lg max-w-sm">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Draft Listing
                </h3>
                <button onClick={() => setIsEditing(!isEditing)} className="text-xs text-gray-500 hover:text-primary underline">
                    {isEditing ? 'Done' : 'Edit'}
                </button>
            </div>
            
            <div className="space-y-3 text-sm">
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase">Title</p>
                    {isEditing ? <input className="w-full p-1 border rounded" value={editedDraft.title} onChange={e => setEditedDraft({...editedDraft, title: e.target.value})} /> : <p className="font-medium text-gray-800 dark:text-gray-200">{editedDraft.title}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                         <p className="text-xs font-semibold text-gray-400 uppercase">Price</p>
                         {isEditing ? <input type="number" className="w-full p-1 border rounded" value={editedDraft.price} onChange={e => setEditedDraft({...editedDraft, price: Number(e.target.value)})} /> : <p className="font-bold text-green-600">${editedDraft.price}</p>}
                    </div>
                     <div>
                         <p className="text-xs font-semibold text-gray-400 uppercase">Type</p>
                         <p className="capitalize text-gray-600 dark:text-gray-400">{editedDraft.listingType}</p>
                    </div>
                </div>
                 <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase">Description</p>
                    {isEditing ? <textarea className="w-full p-1 border rounded text-xs" rows={3} value={editedDraft.description} onChange={e => setEditedDraft({...editedDraft, description: e.target.value})} /> : <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{editedDraft.description}</p>}
                </div>
                <button onClick={() => onPublish(editedDraft)} className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-xs hover:opacity-90 shadow-md">
                    Publish Now
                </button>
            </div>
        </div>
    );
}

const UrbanGeniePage: React.FC = () => {
    const { user, openAuthModal } = useAuth();
    const { showNotification } = useNotification();
    const { addItemToCart } = useCart();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // --- Session Management ---
    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        const saved = localStorage.getItem('genie_sessions_v2');
        return saved ? JSON.parse(saved, (key, value) => key === 'timestamp' || key === 'updatedAt' ? new Date(value) : value) : [];
    });
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeMedia, setActiveMedia] = useState<{ url: string; mimeType: string, type: 'image' | 'video' } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Persist sessions
    useEffect(() => {
        localStorage.setItem('genie_sessions_v2', JSON.stringify(sessions));
    }, [sessions]);

    // Initialize
    useEffect(() => {
        if (sessions.length === 0) {
            createNewSession();
        } else if (!currentSessionId) {
            setCurrentSessionId(sessions[0].id);
        }
    }, []);

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isProcessing]);

    const createNewSession = useCallback(() => {
        const newId = `session-${Date.now()}`;
        const initialMessage: Message = { 
            id: 'init-1', 
            sender: 'genie', 
            type: 'text', 
            content: "Hello! I am Urban Genie, your marketplace operating system. I can help you find products, list items for sale, navigate the app, or answer support questions. How can I assist you today?", 
            timestamp: new Date() 
        };
        const newSession: ChatSession = {
            id: newId,
            title: 'New Chat',
            lastMessage: 'Started new chat',
            updatedAt: new Date(),
            messages: [initialMessage]
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setActiveMedia(null);
        setIsSidebarOpen(false);
    }, []);

    const updateCurrentSession = (newMessages: Message[], titleUpdate?: string) => {
        if (!currentSessionId) return;
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: newMessages,
                    updatedAt: new Date(),
                    lastMessage: newMessages[newMessages.length - 1].type === 'text' ? (newMessages[newMessages.length - 1].content as string).slice(0, 30) : 'Attachment',
                    title: titleUpdate || s.title
                };
            }
            return s;
        }));
    };

    const deleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(newSessions);
        if (currentSessionId === sessionId) {
            if (newSessions.length > 0) {
                setCurrentSessionId(newSessions[0].id);
            } else {
                createNewSession();
            }
        }
    };

    const handleSendMessage = () => {
        if (!inputValue.trim() && !activeMedia) return;
        
        // Removed Auth Check: Guest users can send messages.
        // if (!user) { openAuthModal('login'); return; }

        const userMsg: Message = {
            id: `msg-${Date.now()}`,
            sender: 'user',
            type: activeMedia ? activeMedia.type : 'text',
            content: activeMedia ? activeMedia.url : inputValue,
            timestamp: new Date()
        };
        
        // If text AND media, push text first then media logic handled by processor
        // Simplified: Just push one user message representing the interaction
        if (activeMedia && inputValue) {
             userMsg.type = 'text'; // Render as text but processor knows about media
             userMsg.content = inputValue; 
        }

        const newMessages = [...messages, userMsg];
        const titleUpdate = currentSession?.title === 'New Chat' ? (inputValue ? inputValue.slice(0, 20) : 'Media Upload') : undefined;
        updateCurrentSession(newMessages, titleUpdate);
        
        const text = inputValue;
        setInputValue('');
        
        const mediaContext = activeMedia ? { url: activeMedia.url, mimeType: activeMedia.mimeType } : undefined;
        setActiveMedia(null); // Clear pending media

        processGenieRequest(text, mediaContext);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isVideo = file.type.startsWith('video/');
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                const mimeType = base64.match(/data:(.*?);/)![1];
                setActiveMedia({ url: base64, mimeType, type: isVideo ? 'video' : 'image' });
            };
            reader.readAsDataURL(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processGenieRequest = async (prompt: string, media?: { url: string, mimeType: string }) => {
        setIsProcessing(true);
        try {
            const { items: allItems } = await itemService.getItems({}, { page: 1, limit: 100 });
            
            // Build Context (User ID might be undefined for guests)
            const userContext = {
                currentPage: window.location.hash, // Simple location tracking
                userId: user?.id
            };

            const fullResponse: any = await interactWithUrbanGenie(
                media ? media.url.split(',')[1] : '', 
                media ? media.mimeType : 'text/plain', 
                prompt, 
                allItems, 
                userContext
            );

            const sources = fullResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const genieResult: GenieResponse = JSON.parse(fullResponse.text.replace(/```json/g, '').replace(/```/g, '').trim());

            const aiMessages: Message[] = [];

            // 1. Add Text Response
            if (genieResult.responseText) {
                 aiMessages.push({
                    id: `ai-text-${Date.now()}`,
                    sender: 'genie',
                    type: 'text',
                    content: genieResult.responseText,
                    timestamp: new Date(),
                    sources: sources 
                });
            }

            // 2. Add Widgets based on Action Type
            // Consolidate response into one rich message object for simplicity in this demo architecture
            
            if (genieResult.actionType === 'NAVIGATE' && genieResult.navigationPath) {
                 aiMessages.push({
                    id: `ai-nav-${Date.now()}`,
                    sender: 'genie',
                    type: 'text', 
                    content: { widget: 'navigation', path: genieResult.navigationPath }, 
                    timestamp: new Date()
                } as any);
            }

            if ((genieResult.actionType === 'SEARCH' || genieResult.actionType === 'STYLING') && genieResult.searchResults) {
                 aiMessages.push({
                    id: `ai-search-${Date.now()}`,
                    sender: 'genie',
                    type: 'text',
                    content: { widget: 'search_results', itemIds: genieResult.searchResults },
                    timestamp: new Date()
                } as any);
            }

            if (genieResult.actionType === 'DRAFT_LISTING' && genieResult.draftListing) {
                 aiMessages.push({
                    id: `ai-draft-${Date.now()}`,
                    sender: 'genie',
                    type: 'listing-draft', // Matches existing type
                    content: genieResult.draftListing,
                    timestamp: new Date()
                });
            }

            setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    return { ...s, messages: [...s.messages, ...aiMessages], updatedAt: new Date() };
                }
                return s;
            }));

        } catch (error) {
            console.error("Genie processing error", error);
             const errorMsg: Message = {
                id: `err-${Date.now()}`,
                sender: 'genie',
                type: 'text',
                content: "I'm having trouble connecting to the mainframe. Please try again.",
                timestamp: new Date()
            };
             setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    return { ...s, messages: [...s.messages, errorMsg], updatedAt: new Date() };
                }
                return s;
            }));
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePublishDraft = async (draft: GenieDraftListing) => {
        // AUTH CHECK: Specific action requires login
        if (!user) {
             showNotification("Please log in to publish a listing.");
             openAuthModal('login');
             return;
        }
        try {
            const newItemData: Partial<Item> = {
                title: draft.title,
                description: draft.description,
                category: draft.category, 
                salePrice: draft.price,
                condition: draft.condition as any,
                features: draft.features,
                listingType: draft.listingType,
                status: 'published',
                imageUrls: ['https://picsum.photos/seed/draft/400/400'] // Mock image if none provided in chat context
            };
            const newItem = await itemService.addItem(newItemData, user);
            showNotification("Listing published successfully!");
            navigate(`/item/${newItem.id}`);
        } catch (e) {
            showNotification("Failed to publish listing.");
        }
    };

    const quickActions = [
        { label: "Find a Gift", icon: <SearchIcon />, action: () => setInputValue("Find a gift for...") },
        { label: "Track Order", icon: <MapIcon />, action: () => processGenieRequest("Track my recent order") }, // AI will interpret; if no user, it prompts generic info or asks to login
        { label: "Sell Item", icon: <TagIcon />, action: () => { setInputValue("I want to sell this..."); fileInputRef.current?.click(); } },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#050505] pt-[72px] overflow-hidden font-sans relative">
            <DynamicBackground />
            
            <div className="absolute top-4 left-16 z-20 hidden lg:block">
                 <BackButton to="/" alwaysShowText />
            </div>

            {/* Sidebar */}
            <AnimatePresence>
                {(isSidebarOpen || window.innerWidth >= 1024) && (
                    <motion.aside
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        className={`
                            fixed lg:relative z-30 w-80 h-[calc(100vh-72px)] 
                            bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-r border-gray-200 dark:border-white/5
                            flex flex-col shadow-2xl lg:shadow-none
                            ${isSidebarOpen ? 'left-0' : '-left-full lg:left-0'}
                        `}
                    >
                        <div className="p-6">
                            <button 
                                onClick={createNewSession}
                                className="w-full py-4 px-6 bg-black dark:bg-white text-white dark:text-black rounded-xl shadow-lg font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
                            >
                                <PlusIcon /> New Chat
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-4 space-y-2 py-2">
                             <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">History</p>
                            {sessions.map(session => (
                                <div 
                                    key={session.id}
                                    onClick={() => { setCurrentSessionId(session.id); setIsSidebarOpen(false); }}
                                    className={`group relative p-4 rounded-xl cursor-pointer transition-all border ${
                                        currentSessionId === session.id 
                                        ? 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10' 
                                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <h4 className="text-sm font-semibold truncate dark:text-gray-200">{session.title}</h4>
                                    <p className="text-xs text-gray-400 truncate mt-1">{session.lastMessage}</p>
                                    <button 
                                        onClick={(e) => deleteSession(e, session.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative w-full h-full bg-transparent z-10">
                {/* Mobile Toggle */}
                <div className="lg:hidden absolute top-4 left-4 z-20">
                    <button onClick={() => setIsSidebarOpen(p => !p)} className="p-3 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full shadow-lg border dark:border-white/10 text-black dark:text-white">
                        {isSidebarOpen ? <XIcon /> : <MenuIcon />}
                    </button>
                </div>

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-6 pointer-events-none">
                    <div className="flex items-center gap-3 pointer-events-auto bg-white/60 dark:bg-white/5 backdrop-blur-3xl border border-white/40 dark:border-white/10 px-7 py-3 rounded-full shadow-lg">
                        <span className="text-amber-400 drop-shadow-md animate-pulse"><SparklesIcon /></span>
                        <span className="text-sm font-black text-gray-900 dark:text-white font-serif-display tracking-[0.35em] uppercase">Urban Genie Studio</span>
                        {!user && <span className="ml-2 text-[10px] bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">Guest Mode</span>}
                    </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-20 pt-28 pb-40 space-y-6 scroll-smooth">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-70">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Meet your private marketplace concierge</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">Ask for listings, pricing advice, dropshipping insights, or instant navigation across the platform.</p>
                        </div>
                    )}
                    
                    {messages.map((msg) => (
                        <motion.div 
                            key={msg.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] md:max-w-[70%] ${msg.type === 'listing-draft' ? 'w-full' : ''}`}>
                                {msg.sender === 'genie' && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-500 flex items-center justify-center text-white shadow-lg flex-shrink-0 mt-1">
                                            <SparklesIcon />
                                        </div>
                                        <div className="space-y-4 w-full">
                                             {/* Text Content */}
                                            {(msg.type === 'text' && typeof msg.content === 'string') && (
                                                <div className="bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/10 px-5 py-3.5 rounded-2xl rounded-tl-sm text-sm md:text-base leading-relaxed text-gray-800 dark:text-gray-100 shadow-sm">
                                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
                                                    {msg.sources && <GroundingSources sources={msg.sources} />}
                                                </div>
                                            )}
                                            
                                            {/* Widget: Navigation */}
                                            {(msg.type === 'text' && typeof msg.content === 'object' && msg.content.widget === 'navigation') && (
                                                <NavigationWidget path={msg.content.path} onNavigate={(path) => navigate(path)} />
                                            )}

                                            {/* Widget: Search Results */}
                                            {(msg.type === 'text' && typeof msg.content === 'object' && msg.content.widget === 'search_results') && (
                                                <SearchResultsWidget itemIds={msg.content.itemIds} />
                                            )}
                                            
                                            {/* Widget: Draft Listing */}
                                            {msg.type === 'listing-draft' && (
                                                <DraftListingWidget draft={msg.content} onPublish={handlePublishDraft} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {msg.sender === 'user' && (
                                    <div className="bg-black dark:bg-white text-white dark:text-black px-5 py-3.5 rounded-2xl rounded-br-sm shadow-md text-sm md:text-base">
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    
                    {isProcessing && (
                         <div className="flex items-center gap-3 ml-2">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-500 flex items-center justify-center text-white shadow-lg animate-pulse"><SparklesIcon /></div>
                             <div className="flex gap-1.5 p-3 bg-white/50 dark:bg-white/10 rounded-xl">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                         </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="fixed bottom-0 left-0 right-0 z-20 p-4 lg:pl-80 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent dark:from-[#050505] dark:via-[#050505] pb-8">
                     {/* Quick Actions */}
                     {messages.length < 3 && (
                        <div className="flex justify-center gap-3 mb-4 overflow-x-auto no-scrollbar">
                            {quickActions.map((qa, i) => (
                                <button key={i} onClick={qa.action} className="flex items-center gap-3 px-5 py-3 bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:shadow-lg transition-all shadow-sm whitespace-nowrap">
                                    <span className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">{qa.icon}</span>
                                    <span>{qa.label}</span>
                                </button>
                            ))}
                        </div>
                     )}

                    <div className="max-w-4xl mx-auto bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[24px] shadow-xl p-2 flex gap-2 items-end">
                        {activeMedia && (
                             <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 ml-2 mb-1">
                                {activeMedia.type === 'image' ? <img src={activeMedia.url} className="w-full h-full object-cover"/> : <div className="bg-black w-full h-full flex items-center justify-center text-white"><VideoIcon/></div>}
                                <button onClick={() => setActiveMedia(null)} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5"><XIcon/></button>
                            </div>
                        )}
                        
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><AttachmentIcon/></button>
                        
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-gray-900 dark:text-white placeholder-gray-400 resize-none max-h-32"
                            rows={1}
                        />
                        
                         <button onClick={() => showNotification('Voice input is coming soon.')} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><MicIcon/></button>

                        <button 
                            onClick={handleSendMessage} 
                            disabled={!inputValue.trim() && !activeMedia}
                            className={`p-3 rounded-xl transition-all ${inputValue.trim() || activeMedia ? 'bg-black dark:bg-white text-white dark:text-black hover:scale-105' : 'bg-gray-100 dark:bg-white/10 text-gray-400 cursor-not-allowed'}`}
                        >
                            <SendIcon />
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default UrbanGeniePage;

