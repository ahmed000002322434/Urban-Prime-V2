
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LiveStream, Item } from '../../types';
import { itemService, livestreamService } from '../../services/itemService';
import { useCart } from '../../hooks/useCart';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

const LiveIcon = () => (
  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md animate-pulse uppercase tracking-wider">
    Live
  </span>
);

const ViewerCountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" className="text-white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

const LiveShoppingPage: React.FC = () => {
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
    const [featuredItem, setFeaturedItem] = useState<Item | null>(null);
    const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { addItemToCart } = useCart();

    useEffect(() => {
        setIsLoading(true);
        livestreamService.getLiveStreams()
            .then(setStreams)
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (activeStream && activeStream.featuredItemIds.length > 0) {
            itemService.getItemById(activeStream.featuredItemIds[0]).then(item => {
                setFeaturedItem(item || null);
            });
        } else {
            setFeaturedItem(null);
        }
        setMessages([
            { user: 'System', text: 'Welcome to the stream! Say hi to the host.' },
            { user: 'Sarah', text: 'So excited for this!' },
            { user: 'Mike', text: 'Does it come in blue?' }
        ]);
    }, [activeStream]);

    useEffect(() => {
        if (!activeStream) return;
        const interval = setInterval(() => {
            const randomMessages = ["Love this!", "Shipping time?", "Ordering now!", "Hi from London!", "Can you show the back?"];
            const randomUsers = ["User123", "Guest_A", "Shopaholic", "Dave"];
            const msg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
            const usr = randomUsers[Math.floor(Math.random() * randomUsers.length)];
            setMessages(prev => [...prev, { user: usr, text: msg }]);
        }, 3000);
        return () => clearInterval(interval);
    }, [activeStream]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setMessages(prev => [...prev, { user: 'You', text: chatInput }]);
        setChatInput('');
    };

    const handleAddToCart = () => {
        if (featuredItem) {
            addItemToCart(featuredItem, 1);
        }
    };

    if (isLoading) return <Spinner size="lg" className="mt-20" />;

    return (
        <div className="bg-gray-900 min-h-screen text-white animate-fade-in-up pb-20 md:pb-0">
            {!activeStream ? (
                <div className="container mx-auto px-4 py-8">
                     <div className="mb-6">
                        <BackButton className="text-white hover:text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold font-display mb-6">Urban Live 🔴</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {streams.map(stream => (
                            <div 
                                key={stream.id} 
                                onClick={() => setActiveStream(stream)}
                                className="group cursor-pointer relative aspect-[9/16] rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                            >
                                <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <LiveIcon />
                                        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                            <ViewerCountIcon /> {stream.viewers}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight mb-1">{stream.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <img src={stream.hostAvatar} className="w-6 h-6 rounded-full border border-white" alt={stream.hostName}/>
                                            <span className="text-sm text-gray-300">{stream.hostName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row">
                    <div className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden">
                        <video src={activeStream.videoUrl} autoPlay loop playsInline className="w-full h-full object-cover opacity-80" />
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                            <div className="flex items-center gap-3 bg-black/40 p-2 rounded-full backdrop-blur-md pr-4">
                                <img src={activeStream.hostAvatar} className="w-10 h-10 rounded-full border-2 border-primary" alt="Host" />
                                <div>
                                    <p className="font-bold text-sm">{activeStream.hostName}</p>
                                    <div className="flex items-center gap-1 text-xs text-red-500 font-bold">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveStream(null)} className="p-2 bg-black/40 rounded-full hover:bg-white/20 backdrop-blur-md">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        {featuredItem && (
                             <div className="absolute bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white text-black p-3 rounded-xl shadow-2xl animate-slide-in-right">
                                <div className="flex gap-3">
                                    <img src={featuredItem.imageUrls[0]} className="w-16 h-16 rounded-lg object-cover bg-gray-100" alt={featuredItem.title}/>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{featuredItem.title}</p>
                                        <p className="text-primary font-extrabold">${featuredItem.salePrice || featuredItem.rentalPrice}</p>
                                        <button onClick={handleAddToCart} className="mt-1 w-full py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-96 bg-black/90 backdrop-blur-xl flex flex-col border-l border-white/10 h-1/3 md:h-full absolute bottom-0 md:relative">
                        <div className="p-4 border-b border-white/10 font-bold hidden md:block">Live Chat</div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={chatContainerRef}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/90 to-transparent md:hidden"></div>
                             {messages.map((msg, i) => (
                                <div key={i} className="text-sm animate-fade-in-up">
                                    <span className="font-bold text-gray-400">{msg.user}:</span> <span className="text-white">{msg.text}</span>
                                </div>
                             ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black flex gap-2">
                            <input 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder="Say something..." 
                                className="flex-1 bg-gray-800 border-none rounded-full px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary"
                            />
                            <button type="submit" className="p-2 bg-primary rounded-full text-white hover:bg-primary/80">
                                <SendIcon />
                            </button>
                            <button type="button" className="p-2 bg-gray-800 rounded-full text-pink-500 hover:bg-gray-700 animate-pulse">
                                <HeartIcon />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveShoppingPage;
