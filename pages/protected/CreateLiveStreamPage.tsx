import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { itemService, reelService } from '../../services/itemService';
import { useNotification } from '../../context/NotificationContext';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

const BroadcastIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12z" /></svg>;
const ShoppingBagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const ChatBubbleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const CreateLiveStreamPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<'selling' | 'chatting'>('selling');
  const [title, setTitle] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [userItems, setUserItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoadingItems(true);
      itemService.getItemsByOwner(user.id)
        .then(items => setUserItems(items))
        .finally(() => setIsLoadingItems(false));
    }
  }, [user]);

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      showNotification("Please enter a stream title.");
      return;
    }
    if (mode === 'selling' && !selectedProduct) {
      showNotification("Please select a product to sell.");
      return;
    }

    setIsStarting(true);
    try {
      const featuredItemIds = mode === 'selling' && selectedProduct ? [selectedProduct] : [];
      await reelService.startLiveStream({ title, featuredItemIds }, user);
      showNotification("You are now LIVE!");
      navigate('/live'); // Redirect to the live page where the stream will appear
    } catch (error) {
      console.error("Failed to start stream:", error);
      showNotification("Failed to start stream. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-background py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <BackButton />
        </div>
        
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
          <div className="p-8 border-b dark:border-gray-700 bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <h1 className="text-3xl font-bold font-display flex items-center gap-3">
              <BroadcastIcon /> Go Live
            </h1>
            <p className="mt-2 text-white/90">Setup your stream details and connect with your audience.</p>
          </div>

          <form onSubmit={handleStartStream} className="p-8 space-y-8">
            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">What kind of stream is this?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('selling')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'selling' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}
                >
                  <ShoppingBagIcon />
                  <span className="font-bold">Selling</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('chatting')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'chatting' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}
                >
                  <ChatBubbleIcon />
                  <span className="font-bold">Just Chatting</span>
                </button>
              </div>
            </div>

            {/* Stream Details */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Stream Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={mode === 'selling' ? "e.g. Flash Sale: 50% Off Everything!" : "e.g. Q&A + Chill Vibes"}
                className="w-full p-3 bg-gray-50 dark:bg-dark-background border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>

            {/* Product Selection (Selling Mode Only) */}
            {mode === 'selling' && (
              <div className="animate-fade-in-up">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Feature a Product</label>
                {isLoadingItems ? (
                  <div className="p-4 text-center"><Spinner size="sm" /></div>
                ) : userItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                    {userItems.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedProduct(item.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg bordercursor-pointer transition-all cursor-pointer border ${selectedProduct === item.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                      >
                        <img src={item.imageUrls[0]} alt={item.title} className="w-12 h-12 rounded-md object-cover bg-gray-100" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate dark:text-gray-200">{item.title}</p>
                          <p className="text-xs text-gray-500">${item.salePrice || item.rentalPrice}</p>
                        </div>
                        {selectedProduct === item.id && <div className="text-primary">✓</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                    You don't have any items to sell. <a href="/profile/products/new" className="underline font-bold">List an item first</a>.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isStarting}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isStarting ? <Spinner size="sm" className="text-white" /> : <><BroadcastIcon /> Start Broadcasting</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateLiveStreamPage;