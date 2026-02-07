


import React, { useState, useRef, useEffect } from 'react';
import { generateImageFromPrompt, generateListingDetailsFromImage, suggestPrice } from '../services/geminiService';
import Spinner from './Spinner';
// FIX: Replaced useAuth with useTranslation for currency information.
import { useTranslation } from '../hooks/useTranslation';

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;

type GeneratorData = {
  imageUrl: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceJustification: string;
};

interface AIPostGeneratorProps {
  onClose: () => void;
  onApply: (data: GeneratorData) => void;
}

const AIPostGenerator: React.FC<AIPostGeneratorProps> = ({ onClose, onApply }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<Partial<GeneratorData>>({});
    const [loadingStates, setLoadingStates] = useState({ image: false, details: false, price: false });
    const [error, setError] = useState<string | null>(null);
    const [imagePrompt, setImagePrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    // FIX: Replaced currencySymbol from useAuth with currency object from useTranslation.
    const { currency } = useTranslation();

    const resetFlow = () => {
        setStep(1);
        setData({});
        setError(null);
        setImagePrompt('');
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
            setError(null); // Clear errors when going back
        }
    };
    
    useEffect(() => {
        const generateDetails = async () => {
            if (step === 2 && data.imageUrl && !data.title) {
                setLoadingStates(prev => ({ ...prev, details: true }));
                setError(null);
                try {
                    const base64 = data.imageUrl!.split(',')[1];
                    const mimeType = data.imageUrl!.match(/data:(.*?);/)![1];
                    const result = await generateListingDetailsFromImage(base64, mimeType);
                    setData(prev => ({ ...prev, ...result }));
                    setStep(3);
                } catch (e) {
                    setError("Could not generate details from the image. Please try another image or start over.");
                } finally {
                    setLoadingStates(prev => ({ ...prev, details: false }));
                }
            }
        };
        generateDetails();
    }, [step, data.imageUrl, data.title]);

    useEffect(() => {
        const generatePrice = async () => {
            if (step === 3 && data.title && data.category && !data.price) {
                setLoadingStates(prev => ({ ...prev, price: true }));
                setError(null);
                try {
                    const result = await suggestPrice(data.title, data.category);
                    setData(prev => ({ ...prev, price: result.price, priceJustification: result.justification }));
                    setStep(4);
                } catch (e) {
                    setError("Could not suggest a price for this item. You can set one manually after applying.");
                    setStep(4); // Move on even if price fails
                } finally {
                    setLoadingStates(prev => ({ ...prev, price: false }));
                }
            }
        };
        generatePrice();
    }, [step, data.title, data.category, data.price]);

    const handleImageGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imagePrompt) return;
        setLoadingStates(prev => ({ ...prev, image: true }));
        setError(null);
        try {
            const imageUrl = await generateImageFromPrompt(imagePrompt);
            setData({ imageUrl });
            setStep(2);
        } catch (e) {
            setError("Image generation failed. Your prompt might have been blocked. Please try a different prompt.");
        } finally {
            setLoadingStates(prev => ({ ...prev, image: false }));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setData({ imageUrl: reader.result });
                setStep(2);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleApply = () => {
        if (step === 4 && data.imageUrl && data.title && data.description && data.category && data.price) {
            onApply(data as GeneratorData);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="text-center">
                        <h3 className="text-xl font-bold mb-2">1. Create an Image</h3>
                        <p className="text-sm text-gray-500 mb-4">Describe the item or upload your own photo.</p>
                        <form onSubmit={handleImageGenerate}>
                            <input type="text" value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="e.g., A professional drone, studio lighting" className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
                            <button type="submit" disabled={loadingStates.image} className="w-full py-2 bg-black text-white font-semibold rounded-lg disabled:bg-gray-400">
                                {loadingStates.image ? <Spinner size="sm" /> : "Generate with AI"}
                            </button>
                        </form>
                        <div className="my-4 text-sm text-gray-400">OR</div>
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-100 border border-gray-300 font-semibold rounded-lg flex items-center justify-center gap-2">
                            <UploadIcon /> Upload Your Photo
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    </div>
                );
            case 2:
            case 3:
            case 4:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {data.imageUrl ? <img src={data.imageUrl} alt="Generated item" className="w-full h-full object-cover"/> : <Spinner />}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 mb-1">TITLE</h4>
                                {loadingStates.details ? <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div> : <p className="font-semibold">{data.title || '...'}</p>}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 mb-1">DESCRIPTION</h4>
                                {loadingStates.details ? (
                                    <div className="space-y-1.5">
                                        <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                                        <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                                    </div>
                                ) : <p className="text-sm text-gray-600">{data.description || '...'}</p>}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-500 mb-1">SUGGESTED PRICE</h4>
                                {loadingStates.price ? (
                                     <div className="h-5 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                ) : data.price ? (
                                    <div>
                                        <p className="font-semibold text-lg text-green-600">{currency.symbol}{data.price} / day</p>
                                        <p className="text-xs text-gray-500 italic">Justification: {data.priceJustification}</p>
                                    </div>
                                ) : <p>...</p>}
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    const ProgressBar = () => {
        const steps = ["Image", "Details", "Price", "Confirm"];
        return (
            <div className="flex justify-between items-center px-8">
                {steps.map((name, index) => {
                    const stepIndex = index + 1;
                    const isCompleted = step > stepIndex;
                    const isActive = step === stepIndex;
                    return (
                        <React.Fragment key={name}>
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-black text-white border-black' : isActive ? 'border-black' : 'border-gray-300 text-gray-400'}`}>
                                    {isCompleted ? '✓' : stepIndex}
                                </div>
                                <p className={`mt-1 text-xs font-semibold ${isActive || isCompleted ? 'text-black' : 'text-gray-400'}`}>{name}</p>
                            </div>
                            {index < steps.length - 1 && <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${isCompleted ? 'bg-black' : 'bg-gray-300'}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold">AI Post Generator</h2>
                    <button onClick={onClose}><CloseIcon /></button>
                </header>
                <div className="p-6">
                   <ProgressBar />
                </div>

                <main className="flex-1 p-6 overflow-y-auto">
                    {renderStepContent()}
                    {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                </main>
                <footer className="p-4 border-t bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={resetFlow} className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Start Over</button>
                        {step > 1 && (
                            <button onClick={handleBack} className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
                                &larr; Back
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={handleApply}
                        disabled={step !== 4 || !data.price}
                        className="px-6 py-2 bg-black text-white font-bold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Apply to Form
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AIPostGenerator;
