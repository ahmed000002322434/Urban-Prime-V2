


import { useState, useCallback, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendMessageToChat } from '../services/geminiService';

const initialMessages: Record<string, ChatMessage[]> = {
    // Corrected: Changed sender to senderId to match ChatMessage type
    concierge: [{ id: 'init-c', senderId: 'ai', text: 'Hi there! I am your AI Rental Concierge. What are you looking for today?', timestamp: new Date().toISOString() }],
    // Corrected: Changed sender to senderId to match ChatMessage type
    projectPlanner: [{ id: 'init-p', senderId: 'ai', text: 'Welcome to the Project Planner! Describe your project, and I\'ll help you build a checklist of rental items you might need.', timestamp: new Date().toISOString() }]
};

export const useChat = (mode: 'concierge' | 'projectPlanner') => {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages[mode]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMessages(initialMessages[mode]);
    }, [mode]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        // Corrected: Changed sender to senderId to match ChatMessage type
        const userMessage: ChatMessage = { id: `user-${Date.now()}`, senderId: 'user', text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const history = messages.map(msg => ({
                // Corrected: Changed msg.sender to msg.senderId
                role: msg.senderId === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            const aiResponseText = await sendMessageToChat(text, history, mode);

            if (mode === 'concierge' && aiResponseText) {
                 try {
                    const jsonMatch = aiResponseText.match(/\{.*\}/s);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.action === 'search') {
                             // Corrected: Changed sender to senderId to match ChatMessage type
                             const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, senderId: 'ai', text: `search:${JSON.stringify(parsed)}`, timestamp: new Date().toISOString() };
                             setMessages(prev => [...prev, aiMessage]);
                             setIsLoading(false);
                             return;
                        }
                    }
                } catch (e) { /* Not a JSON command */ }
            }
            
            // Corrected: Changed sender to senderId to match ChatMessage type
            const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, senderId: 'ai', text: aiResponseText || "I'm sorry, I couldn't generate a response. Please try again.", timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Chat error:", error);
            // Corrected: Changed sender to senderId to match ChatMessage type
            const errorMessage: ChatMessage = { id: `err-${Date.now()}`, senderId: 'ai', text: 'Sorry, I am having trouble connecting. Please try again later.', timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, mode]);

    return { messages, isLoading, sendMessage };
};