



import React, { useState, useRef, useEffect } from 'react';
// Corrected import for react-router-dom
// FIX: Switched from namespace import to named import for 'react-router-dom' to resolve module resolution error.
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';

const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

const AIChatBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'concierge' | 'projectPlanner'>('concierge');
    const { messages, isLoading, sendMessage } = useChat(mode);
    const [input, setInput] = useState('');
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        // FIX: Changed sender to senderId to match ChatMessage type
        if (lastMessage?.senderId === 'ai' && lastMessage.text.startsWith('search:')) {
            try {
                const searchData = JSON.parse(lastMessage.text.substring(7));
                const { query = '', category = '' } = searchData;
                const searchParams = new URLSearchParams();
                if(query) searchParams.set('q', query);
                if(category) searchParams.set('category', category);

                setIsOpen(false);
                navigate(`/browse?${searchParams.toString()}`);
            } catch (e) {
                console.error("Failed to parse search command:", e);
            }
        }
    }, [messages, navigate]);

    const handleSend = () => {
        sendMessage(input);
        setInput('');
    };

    const modeTitles = { concierge: 'AI Rental Concierge', projectPlanner: 'AI Project Planner' };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-black text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg z-50 transform hover:scale-110 transition-transform"
                aria-label="Open AI Chat"
            >
                <ChatIcon />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-fade-in-up border border-gray-200">
                    <header className="p-4 bg-black text-white flex justify-between items-center rounded-t-xl">
                        <h3 className="font-bold">{modeTitles[mode]}</h3>
                        <button onClick={() => setIsOpen(false)} aria-label="Close Chat"><CloseIcon/></button>
                    </header>

                    <div className="p-2 border-b border-gray-200 flex justify-center bg-gray-50">
                        <div className="flex gap-1 p-1 rounded-md bg-gray-200">
                           <button onClick={() => setMode('concierge')} className={`px-3 py-1 text-sm rounded transition-colors ${mode === 'concierge' ? 'bg-white shadow-sm' : ''}`}>Concierge</button>
                           <button onClick={() => setMode('projectPlanner')} className={`px-3 py-1 text-sm rounded transition-colors ${mode === 'projectPlanner' ? 'bg-white shadow-sm' : ''}`}>Project Planner</button>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto chat-bg">
                        <div className="space-y-4">
                            {messages.map((msg, index) => {
                                if (msg.text.startsWith('search:')) return null; // Don't render search commands
                                return (
                                // FIX: Changed msg.sender to msg.senderId
                                <div key={index} className={`flex ${msg.senderId === 'user' ? 'justify-end' : 'justify-start'} animate-bubble-in`}>
                                    {/* FIX: Changed msg.sender to senderId */}
                                    <div className={`max-w-xs px-4 py-2 rounded-xl shadow-sm ${msg.senderId === 'user' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                                        <p className="whitespace-pre-wrap text-gray-800">{msg.text}</p>
                                    </div>
                                </div>
                            )})}
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
                                placeholder="Ask for an item..."
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

export default AIChatBot;