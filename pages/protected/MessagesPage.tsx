
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { itemService, userService } from '../../services/itemService';
import { isBackendConfigured } from '../../services/backendClient';
import type { ChatThread, User, Item, ChatMessage, CustomOffer } from '../../types';
import Spinner from '../../components/Spinner';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- ICONS ---
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const AttachmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>;
const OfferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

interface ThreadWithDetails extends ChatThread {
    otherUser: User;
    item: Item;
}

const OfferCard: React.FC<{ offer: CustomOffer; isSender: boolean; onAccept: () => void }> = ({ offer, isSender, onAccept }) => (
    <div className={`p-4 rounded-xl border-l-4 shadow-sm w-full max-w-sm ${isSender ? 'bg-blue-50 border-blue-500' : 'bg-white border-green-500'}`}>
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-900">{offer.title}</h4>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : offer.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{offer.status}</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{offer.description}</p>
        <div className="flex justify-between items-center border-t pt-3 border-gray-200">
            <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-lg font-bold text-gray-900">${offer.price}</p>
            </div>
            {!isSender && offer.status === 'pending' && (
                <button onClick={onAccept} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-md">
                    Accept Offer
                </button>
            )}
        </div>
    </div>
);

const CreateOfferModal: React.FC<{ onClose: () => void; onSend: (offer: Omit<CustomOffer, 'id' | 'status'>) => void }> = ({ onClose, onSend }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend({
            title,
            description,
            price: Number(price),
            duration: Number(duration)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><OfferIcon /> Create Custom Offer</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Offer Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Full House Deep Clean" className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Describe what's included..." rows={3} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Total Price ($)</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Duration (Days)</label>
                            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 mt-4">Send Offer</button>
                </form>
            </div>
        </div>
    );
};

const MessagesPage: React.FC = () => {
    const { user } = useAuth();
    const { threadId } = useParams<{ threadId?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
    const [activeThread, setActiveThread] = useState<ThreadWithDetails | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [imageToSend, setImageToSend] = useState<string | null>(null);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        const initNewChat = async () => {
            if (!user) return;
            const itemId = searchParams.get('itemId');
            const sellerId = searchParams.get('sellerId');

            if (itemId && sellerId) {
                const thread_id = await itemService.findOrCreateChatThread(itemId, user.id, sellerId);
                navigate(`/profile/messages/${thread_id}`, { replace: true });
            }
        };
        initNewChat();
    }, [searchParams, user, navigate]);


    useEffect(() => {
        const fetchThreads = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const userThreads = await itemService.getChatThreadsForUser(user.id);
                const threadsWithDetails: ThreadWithDetails[] = await Promise.all(
                    userThreads.map(async (thread) => {
                        const otherUserId = thread.sellerId === user.id ? thread.buyerId : thread.sellerId;
                        const [otherUser, item] = await Promise.all([
                            userService.getUserById(otherUserId),
                            itemService.getItemById(thread.itemId)
                        ]);

                        const fallbackUser: User = otherUser || {
                            id: otherUserId,
                            name: 'User',
                            email: '',
                            avatar: '/icons/urbanprime.svg',
                            following: [],
                            followers: [],
                            wishlist: [],
                            cart: [],
                            badges: [],
                            memberSince: new Date().toISOString(),
                            status: 'active'
                        };

                        const fallbackItem: Item = item || ({
                            id: thread.itemId,
                            title: 'Listing',
                            description: '',
                            category: 'general',
                            price: 0,
                            listingType: 'sale',
                            imageUrls: [],
                            images: [],
                            owner: {
                                id: otherUserId,
                                name: fallbackUser.name,
                                avatar: fallbackUser.avatar || '/icons/urbanprime.svg'
                            },
                            avgRating: 0,
                            reviews: [],
                            stock: 0,
                            createdAt: new Date().toISOString()
                        } as Item);

                        return { ...thread, otherUser: fallbackUser, item: fallbackItem };
                    })
                );
                
                threadsWithDetails.sort((a, b) => {
                    const lastMsgA = a.messages[a.messages.length - 1]?.timestamp || '0';
                    const lastMsgB = b.messages[b.messages.length - 1]?.timestamp || '0';
                    return new Date(lastMsgB).getTime() - new Date(lastMsgA).getTime();
                });
                
                setThreads(threadsWithDetails);
                
                if (threadId) {
                    setActiveThread(threadsWithDetails.find(t => t.id === threadId) || null);
                } else if (threadsWithDetails.length > 0) {
                    navigate(`/profile/messages/${threadsWithDetails[0].id}`, { replace: true });
                    setActiveThread(threadsWithDetails[0]);
                }
            } catch (error) {
                console.error("Failed to fetch threads:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!searchParams.get('itemId')) {
          fetchThreads();
        }
    }, [user, threadId, searchParams, navigate]);

    // REAL-TIME MESSAGE LISTENER
    useEffect(() => {
        if (!threadId) return;

        if (isBackendConfigured()) {
            const fallbackThread = threads.find(t => t.id === threadId);
            setMessages(fallbackThread?.messages || []);
            return;
        }

        const q = query(collection(db, "chatThreads", threadId, "messages"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const msgs: ChatMessage[] = [];
                querySnapshot.forEach((doc) => {
                    msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
                });
                setMessages(msgs);
            },
            (error) => {
                console.warn('Realtime message listener failed:', error);
            }
        );

        return () => unsubscribe();
    }, [threadId, threads]);
    
    const handleSelectThread = (thread: ThreadWithDetails) => {
        navigate(`/profile/messages/${thread.id}`);
        setActiveThread(thread);
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageToSend) || !activeThread || !user) return;

        try {
            await itemService.sendMessageToThread(activeThread.id, user.id, newMessage, imageToSend || undefined);
            setNewMessage('');
            setImageToSend(null);
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };
    
    const handleSendOffer = async (offerData: Omit<CustomOffer, 'id' | 'status'>) => {
        if (!activeThread || !user) return;
        try {
            await itemService.sendOfferToThread(activeThread.id, user.id, offerData);
        } catch (error) {
            console.error("Failed to send offer:", error);
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToSend(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAcceptOffer = (offerId: string) => {
        // In a real app, this would update the offer status in DB and redirect to checkout
        navigate('/checkout');
    }
    
     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (isLoading) return <Spinner size="lg" className="mt-20" />;

    return (
        <>
            {isOfferModalOpen && <CreateOfferModal onClose={() => setIsOfferModalOpen(false)} onSend={handleSendOffer} />}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 animate-fade-in-up">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-text-primary">Messages</h1>
                <div className="h-[70vh] md:h-[75vh] flex flex-col md:flex-row bg-surface rounded-xl shadow-soft border border-border overflow-hidden">
                    {/* Conversation List */}
                    <aside className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border h-auto md:h-full flex flex-col">
                        <div className="p-4 border-b border-border"><input type="text" placeholder="Search messages..." className="w-full text-sm p-3 bg-surface-soft text-text-primary rounded-lg border-none focus:ring-2 focus:ring-primary" /></div>
                        {threads.length > 0 ? (
                            <ul className="overflow-y-auto flex-1 max-h-[30vh] md:max-h-none">
                                {threads.map(thread => {
                                    const lastMessage = thread.messages[thread.messages.length - 1];
                                    return (
                                        <li key={thread.id} onClick={() => handleSelectThread(thread)} className={`p-4 cursor-pointer border-l-4 flex gap-3 transition-colors ${activeThread?.id === thread.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-surface-soft'}`}>
                                            <img src={thread.otherUser.avatar} alt={thread.otherUser.name} className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-bold truncate text-text-primary">{thread.otherUser.name}</p>
                                                    <span className="text-xs text-text-secondary">{lastMessage ? new Date(lastMessage.timestamp).toLocaleDateString() : ''}</span>
                                                </div>
                                                <p className="text-sm text-text-secondary truncate">{lastMessage?.type === 'offer' ? 'Sent an offer' : lastMessage?.text || 'No messages yet'}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                             <div className="p-10 text-center text-sm text-text-secondary">No messages yet.</div>
                        )}
                    </aside>
                    {/* Chat Window */}
                    <main className="w-full md:w-2/3 flex flex-col h-full bg-surface">
                        {activeThread ? (
                            <>
                                <header className="p-4 border-b border-border flex items-center justify-between bg-surface-soft flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <img src={activeThread.otherUser.avatar} alt={activeThread.otherUser.name} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <p className="font-bold text-text-primary">{activeThread.otherUser.name}</p>
                                            <p className="text-xs text-text-secondary flex items-center gap-1">
                                                Inquiring about <span className="font-semibold text-primary">{activeThread.item.title}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <Link to={`/item/${activeThread.item.id}`} className="text-xs font-bold border border-border px-3 py-1.5 rounded-lg hover:bg-white transition-colors">View Item</Link>
                                </header>
                                <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-background">
                                    <div className="space-y-6">
                                         {messages.map(msg => (
                                             <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                                                 {msg.senderId !== user?.id && <img src={activeThread.otherUser.avatar} className="w-8 h-8 rounded-full mb-1" />}
                                                 <div className={`max-w-[85%] ${msg.type === 'offer' ? 'w-full max-w-sm' : ''}`}>
                                                     {msg.type === 'offer' && msg.offer ? (
                                                         <OfferCard offer={msg.offer} isSender={msg.senderId === user?.id} onAccept={() => handleAcceptOffer(msg.offer!.id)} />
                                                     ) : (msg.type === 'contract' || msg.type === 'milestone') ? (
                                                         <div className="px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-900 text-sm shadow-sm">
                                                             <p className="font-bold mb-1">
                                                                 {msg.type === 'contract' ? 'Contract Update' : 'Milestone Update'}
                                                             </p>
                                                             <p className="leading-relaxed whitespace-pre-wrap">
                                                                 {typeof msg.content === 'string'
                                                                     ? msg.content
                                                                     : msg.content?.summary || msg.text || 'New workflow update shared in this conversation.'}
                                                             </p>
                                                         </div>
                                                     ) : (
                                                         <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${msg.senderId === user?.id ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                                                             {msg.imageUrl && <img src={msg.imageUrl} alt="attached" className="rounded-lg mb-2 max-w-xs w-full" />}
                                                             {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                                                         </div>
                                                     )}
                                                     <p className={`text-[10px] text-gray-400 mt-1 ${msg.senderId === user?.id ? 'text-right' : 'text-left'}`}>
                                                         {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                     </p>
                                                 </div>
                                             </div>
                                         ))}
                                         <div ref={messagesEndRef} />
                                    </div>
                                </div>
                                <footer className="p-4 bg-surface border-t border-border">
                                    {imageToSend && <div className="mb-2 p-2 bg-surface-soft rounded-lg flex items-center justify-between border border-border w-max"><img src={imageToSend} alt="preview" className="w-16 h-16 rounded-md object-cover" /><button onClick={() => setImageToSend(null)} className="ml-4 text-red-500 text-xs font-bold hover:underline">Remove</button></div>}
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <button type="button" onClick={() => setIsOfferModalOpen(true)} className="p-2.5 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Create Offer">
                                            <OfferIcon />
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-soft rounded-full transition-colors" title="Attach Image">
                                            <AttachmentIcon />
                                        </button>
                                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-surface-soft text-text-primary border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                        <button type="submit" disabled={!newMessage.trim() && !imageToSend} className="p-3 bg-primary text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-md">
                                            <SendIcon />
                                        </button>
                                    </form>
                                </footer>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8 text-center">
                                <div className="w-20 h-20 bg-surface-soft rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-text-primary">Your Messages</h3>
                                <p className="mt-2 max-w-sm">Select a conversation from the list to start chatting or view your history.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default MessagesPage;
