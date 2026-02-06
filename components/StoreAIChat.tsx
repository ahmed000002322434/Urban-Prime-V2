
import React, { useState, useRef, useEffect } from 'react';
import { editStorefrontWithAI } from '../services/geminiService';
import type { Store, ChatMessage } from '../types';
import Spinner from './Spinner';

const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.573L16.5 21.75l-.398-1.177a3.375 3.375 0 00-2.495-2.495L12 17.25l1.177-.398a3.375 3.375 0 002.495-2.495L16.5 13.5l.398 1.177a3.375 3.375 0 002.495 2.495L20.25 18l-1.177.398a3.375 3.375 0 00-2.495 2.495z" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

interface StoreAIChatProps {
    currentStorefront: Store;
    onUpdate: (newStorefront: Store) => void;
}

const StoreAIChat: React.FC<StoreAIChatProps> = ({ currentStorefront, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Omit<ChatMessage, 'id' | 'timestamp' | 'imageUrl' | 'isRead'>[]>([
        { senderId: 'ai', text: 'Hi! I\'m your Store AI. Tell me what you\'d like to change. For example, "Change the hero title to \'Weekend Adventures Await\'" or "Add a new blog post about the importance of cleaning gear."' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Omit<ChatMessage, 'id' | 'timestamp' | 'imageUrl' | 'isRead'> = { senderId: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await editStorefrontWithAI(currentStorefront, input);
            onUpdate(result.updatedStorefront);
            const aiMessage: Omit<ChatMessage, 'id' | 'timestamp' | 'imageUrl' | 'isRead'> = { senderId: 'ai', text: result.aiResponse };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Store AI error:", error);
            const errorMessage: Omit<ChatMessage, 'id' | 'timestamp' | 'imageUrl' | 'isRead'> = { senderId: 'ai', text: 'Sorry, I had trouble making that change. Please try rephrasing your request.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-black text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg z-50 transform hover:scale-110 transition-transform"
                aria-label="Open Store AI Chat"
            >
                <BotIcon />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-fade-in-up border border-gray-200">
                    <header className="p-4 bg-black text-white flex justify-between items-center rounded-t-xl">
                        <h3 className="font-bold">Store AI Editor</h3>
                        <button onClick={() => setIsOpen(false)} aria-label="Close Chat"><CloseIcon/></button>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto chat-bg">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.senderId === 'user' ? 'justify-end' : 'justify-start'} animate-bubble-in`}>
                                    <div className={`max-w-xs px-4 py-2 rounded-xl shadow-sm ${msg.senderId === 'user' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                                        <p className="whitespace-pre-wrap text-gray-800">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start animate-bubble-in">
                                    <div className="max-w-xs px-4 py-2 rounded-xl bg-white shadow-sm flex items-center">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            )}
                             <div ref={messagesEndRef} />
                        </div>
                    </div>
                    <footer className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                placeholder="e.g. Change the main color..."
                                className="w-full px-3 py-2 bg-transparent border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                            />
                            <button onClick={handleSend} disabled={isLoading} className="p-2 bg-black text-white rounded-md disabled:bg-gray-400">
                                <SendIcon />
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};

export default StoreAIChat;
