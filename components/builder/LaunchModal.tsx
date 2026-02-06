
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoreLayout } from '../../storeTypes';
import Spinner from '../Spinner';
import confetti from 'canvas-confetti';

interface LaunchModalProps {
  draft: StoreLayout;
  hasProducts: boolean;
  hasAddress: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const CheckIcon = ({ checked }: { checked: boolean }) => (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
    </div>
);

const LaunchModal: React.FC<LaunchModalProps> = ({ draft, hasProducts, hasAddress, onConfirm, onClose }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const hasSEO = draft.seo.metaDescription.length > 20;
    const canLaunch = hasProducts && hasAddress && hasSEO;

    const handleLaunch = async () => {
        setIsPublishing(true);
        try {
            await onConfirm();
            setIsSuccess(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0fb9b1', '#ffffff', '#22d3ee']
            });
        } catch (e) {
            alert("Failed to launch.");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-[#121212] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10"
            >
                {!isSuccess ? (
                    <div className="p-8">
                        <h2 className="text-2xl font-black font-display uppercase tracking-tight text-gray-900 dark:text-white mb-2">Launch Checklist</h2>
                        <p className="text-sm text-gray-500 mb-8">Ensure your store is ready for the world.</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <CheckIcon checked={hasProducts} />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Products Inventory</p>
                                    <p className="text-xs text-gray-500">{hasProducts ? 'Inventory synced' : 'Add at least 1 product'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <CheckIcon checked={hasAddress} />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Ship-From Address</p>
                                    <p className="text-xs text-gray-500">{hasAddress ? 'Address verified' : 'Set location in settings'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <CheckIcon checked={hasSEO} />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">SEO Meta Description</p>
                                    <p className="text-xs text-gray-500">{hasSEO ? 'Search ready' : 'Fill SEO details'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors">Cancel</button>
                            <button 
                                onClick={handleLaunch} 
                                disabled={!canLaunch || isPublishing}
                                className="flex-[2] py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isPublishing ? <Spinner size="sm" /> : 'Go Public'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h2 className="text-3xl font-black font-display text-gray-900 dark:text-white mb-4 uppercase">You're Live!</h2>
                        <p className="text-gray-500 mb-8">Your store is now globally accessible via your unique slug.</p>
                        <button onClick={onClose} className="px-12 py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest rounded-2xl">Return to Editor</button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default LaunchModal;
