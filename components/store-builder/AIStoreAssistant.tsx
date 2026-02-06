
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStoreDesign } from '../../services/geminiService';
import type { Store } from '../../types';
import Spinner from '../Spinner';

interface AIStoreAssistantProps {
  currentStore: Store;
  onPreview: (suggestedStore: Partial<Store>) => void;
}

const MagicWandIcon = () => (
  <motion.svg 
    animate={{ 
      rotate: [0, 10, -10, 0],
      filter: ["drop-shadow(0 0 2px #fff)", "drop-shadow(0 0 8px #0fb9b1)", "drop-shadow(0 0 2px #fff)"] 
    }}
    transition={{ duration: 2, repeat: Infinity }}
    xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"
  >
    <path d="M15 4V2m0 18v-2M8 5L6.6 3.6m10.8 13.8L16 16M5 15l-1.4 1.4m13.8-10.8L16 8M4 9H2m18 0h-2" />
    <path d="M19.8 17.8L4.5 2.5a2.1 2.1 0 1 0-3 3L16.8 20.8a2.1 2.1 0 1 0 3-3z" />
  </motion.svg>
);

const AIStoreAssistant: React.FC<AIStoreAssistantProps> = ({ currentStore, onPreview }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "I'm your AI Design Partner. Tell me how you want your store to look! Try: 'Make it minimalist with deep ocean blues'." }
  ]);

  const handleDesignRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userText = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setPrompt('');
    setIsGenerating(true);

    try {
      const suggestion = await generateStoreDesign(userText, currentStore);
      onPreview(suggestion);
      setMessages(prev => [...prev, { role: 'ai', text: "I've generated a new design preview based on your request. Check the live preview!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error while designing. Let's try again." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
              msg.role === 'user' 
              ? 'bg-primary text-white rounded-br-none' 
              : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-white/5'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isGenerating && (
          <div className="flex justify-center py-4">
            <div className="flex flex-col items-center gap-3">
              <MagicWandIcon />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Designing...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleDesignRequest} className="p-4 bg-white dark:bg-black/20 border-t dark:border-white/5">
        <div className="relative">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="Describe your style..."
            className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-xl py-3 pl-4 pr-12 text-xs focus:ring-1 focus:ring-primary dark:text-white"
          />
          <button 
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIStoreAssistant;
