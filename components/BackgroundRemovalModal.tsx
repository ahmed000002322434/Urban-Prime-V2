import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackgroundWithAI } from '../services/geminiService';
import Spinner from './Spinner';
import { useNotification } from '../context/NotificationContext';

interface BackgroundRemovalModalProps {
  imageUrl: string;
  onClose: () => void;
  onImageUpdate: (newImageUrl: string) => void;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

const BackgroundRemovalModal: React.FC<BackgroundRemovalModalProps> = ({ imageUrl, onClose, onImageUpdate }) => {
    const [activeTab, setActiveTab] = useState<'simple' | 'ai'>('ai');
    const [isLoading, setIsLoading] = useState(false);
    const [outputImage, setOutputImage] = useState<string | null>(imageUrl);
    const [selectedColor, setSelectedColor] = useState('#ffffff');
    const [tolerance, setTolerance] = useState(20);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { showNotification } = useNotification();

    const handleSimpleRemove = useCallback(() => {
        setIsLoading(true);
        const canvas = canvasRef.current;
        if (!canvas) {
            setIsLoading(false);
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            setIsLoading(false);
            return;
        }

        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = imageUrl;
        image.onload = () => {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.drawImage(image, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const targetRgb = hexToRgb(selectedColor);

                if (targetRgb) {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        const distance = Math.sqrt(
                            Math.pow(r - targetRgb.r, 2) +
                            Math.pow(g - targetRgb.g, 2) +
                            Math.pow(b - targetRgb.b, 2)
                        );

                        if (distance < tolerance) {
                            data[i + 3] = 0; // Make transparent
                        }
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                setOutputImage(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error("Canvas error:", e);
                showNotification("Could not process image due to browser security policy. Try a different image.");
            } finally {
                setIsLoading(false);
            }
        };
        image.onerror = () => {
            setIsLoading(false);
            showNotification("Failed to load image for editing.");
        };
    }, [selectedColor, tolerance, imageUrl, showNotification]);

    const handleAiRemove = async () => {
        setIsLoading(true);
        try {
            const base64 = imageUrl.split(',')[1];
            const mimeType = imageUrl.match(/data:(.*?);/)![1];
            const newImage = await removeBackgroundWithAI(base64, mimeType);
            setOutputImage(newImage);
        } catch (error) {
            console.error(error);
            showNotification("AI background removal failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (outputImage) {
            onImageUpdate(outputImage);
        }
    };
    
    const TabButton: React.FC<{tab: 'simple' | 'ai', children: React.ReactNode}> = ({ tab, children }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === tab ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
            {children}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-[101] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">Edit Image Background</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                
                <main className="p-6 flex-1 overflow-y-auto">
                    <div className="w-full h-80 bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative">
                        {isLoading && <Spinner />}
                        <img src={outputImage || imageUrl} alt="Image preview" className="max-w-full max-h-full object-contain" />
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>

                    <div className="p-1 bg-gray-200 rounded-lg flex gap-1 mb-4">
                        <TabButton tab="ai">✨ AI Remover</TabButton>
                        <TabButton tab="simple">Simple Remover</TabButton>
                    </div>

                    {activeTab === 'ai' && (
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-3">Uses AI to automatically detect the subject and remove the background. Best for complex images.</p>
                            <button onClick={handleAiRemove} disabled={isLoading} className="px-5 py-2 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:bg-gray-400">
                                {isLoading ? <Spinner size="sm"/> : "Remove Background with AI"}
                            </button>
                        </div>
                    )}
                    {activeTab === 'simple' && (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                            <p className="text-sm text-gray-600">Click a color to remove. Best for images with solid backgrounds.</p>
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium">Color:</label>
                                <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="w-10 h-10" />
                                <span className="p-2 bg-white border rounded-md font-mono text-sm">{selectedColor}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium">Tolerance:</label>
                                <input type="range" min="1" max="100" value={tolerance} onChange={e => setTolerance(Number(e.target.value))} className="w-full" />
                                <span className="p-2 bg-white border rounded-md text-sm w-16 text-center">{tolerance}</span>
                            </div>
                             <button onClick={handleSimpleRemove} disabled={isLoading} className="w-full px-5 py-2 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:bg-gray-400">
                                {isLoading ? <Spinner size="sm"/> : "Apply Color Removal"}
                            </button>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-200 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleApply} disabled={!outputImage || outputImage === imageUrl} className="px-5 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:bg-gray-400">Apply Changes</button>
                </footer>
            </div>
        </div>
    );
};

export default BackgroundRemovalModal;
