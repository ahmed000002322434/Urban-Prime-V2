

import React, { useState, useRef, useEffect } from 'react';
import { editImageWithPrompt } from '../services/geminiService';
import Spinner from './Spinner';
import { useNotification } from '../context/NotificationContext';

interface AIImageEditorModalProps {
  imageUrl: string;
  onClose: () => void;
  onImageUpdate: (newImageUrl: string) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${active ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'}`}
    >
        {children}
    </button>
);

const AIImageEditorModal: React.FC<AIImageEditorModalProps> = ({ imageUrl, onClose, onImageUpdate }) => {
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'try-on' | 'background' | 'text'>('try-on');
    const [isLoading, setIsLoading] = useState(false);
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [textOverlay, setTextOverlay] = useState({ content: '', color: '#FFFFFF', size: 48 });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleAIGeneration = async (baseImage: string, fullPrompt: string) => {
        setIsLoading(true);
        try {
            const base64 = baseImage.split(',')[1];
            const mimeType = baseImage.match(/data:(.*?);/)![1];
            const newImage = await editImageWithPrompt(base64, mimeType, fullPrompt);
            setOutputImage(newImage);
            showNotification("AI edit successful!");
        } catch (error) {
            console.error(error);
            showNotification("AI edit failed. Please try a different prompt.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyTextOverlay = () => {
        const canvas = canvasRef.current;
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = outputImage || imageUrl;
        image.onload = () => {
            if (canvas) {
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(image, 0, 0);
                    ctx.font = `bold ${textOverlay.size}px sans-serif`;
                    ctx.fillStyle = textOverlay.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    // Add a subtle shadow for better readability
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 5;
                    ctx.fillText(textOverlay.content, canvas.width / 2, canvas.height / 2);
                    setOutputImage(canvas.toDataURL());
                }
            }
        };
    };

    const handleGenerate = () => {
        let fullPrompt = '';
        switch (activeTab) {
            case 'try-on':
                fullPrompt = `Place the main subject of this image onto a photorealistic model: ${prompt}. The final image should be a full shot of the model in a realistic setting.`;
                break;
            case 'background':
                fullPrompt = `Change the background of this image to: ${prompt}. The main subject should remain unchanged but blend naturally into the new background.`;
                break;
            case 'text':
                handleApplyTextOverlay();
                return; // Client-side operation, no AI call needed unless we want AI to regenerate with text
        }
        handleAIGeneration(imageUrl, fullPrompt);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[101] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">AI Image Editor</h3>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </header>
                <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                    <div className="bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                        {isLoading && <Spinner />}
                        <img src={outputImage || imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="p-1 bg-gray-100 rounded-lg flex gap-1">
                            <TabButton active={activeTab === 'try-on'} onClick={() => setActiveTab('try-on')}>Virtual Try-On</TabButton>
                            <TabButton active={activeTab === 'background'} onClick={() => setActiveTab('background')}>Background</TabButton>
                            <TabButton active={activeTab === 'text'} onClick={() => setActiveTab('text')}>Text</TabButton>
                        </div>
                        <div className="flex-grow space-y-4">
                            {activeTab === 'try-on' && (
                                <>
                                    <p className="text-sm text-gray-500">Describe a model to wear your item.</p>
                                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., 'a woman with blonde hair jogging on a beach at sunset'" rows={3} className="w-full p-2 border rounded" />
                                </>
                            )}
                            {activeTab === 'background' && (
                                <>
                                    <p className="text-sm text-gray-500">Describe a new background for your item.</p>
                                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., 'on a wooden table next to a plant'" rows={3} className="w-full p-2 border rounded" />
                                </>
                            )}
                            {activeTab === 'text' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-500">Add a text overlay to your image.</p>
                                    <input value={textOverlay.content} onChange={e => setTextOverlay({...textOverlay, content: e.target.value})} placeholder="Your Text Here" className="w-full p-2 border rounded" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="color" value={textOverlay.color} onChange={e => setTextOverlay({...textOverlay, color: e.target.value})} />
                                        <input type="number" value={textOverlay.size} onChange={e => setTextOverlay({...textOverlay, size: Number(e.target.value)})} className="w-full p-2 border rounded" placeholder="Font Size" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 bg-primary text-white font-bold rounded-lg flex items-center justify-center">
                            {isLoading ? <Spinner size="sm" /> : (activeTab === 'text' ? 'Apply Text' : 'Generate with AI')}
                        </button>
                    </div>
                </main>
                <footer className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-200 font-semibold rounded-lg">Cancel</button>
                    <button onClick={() => onImageUpdate(outputImage!)} disabled={!outputImage} className="px-5 py-2 bg-black text-white font-bold rounded-lg disabled:bg-gray-400">Apply Changes</button>
                </footer>
            </div>
        </div>
    );
};

export default AIImageEditorModal;
