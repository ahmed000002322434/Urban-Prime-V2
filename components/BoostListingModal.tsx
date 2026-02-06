
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { itemService } from '../services/itemService';
import type { Item } from '../types';
import Spinner from './Spinner';
import { useNotification } from '../context/NotificationContext';

interface BoostListingModalProps {
    item: Item;
    onClose: () => void;
}

const BoostListingModal: React.FC<BoostListingModalProps> = ({ item, onClose }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [selectedPlan, setSelectedPlan] = useState<'silver' | 'gold' | 'platinum'>('silver');
    const [isLoading, setIsLoading] = useState(false);

    const plans = [
        { id: 'silver', name: 'Silver Boost', price: 5, duration: 3, perks: ['Higher Search Ranking', 'Standard Badge'] },
        { id: 'gold', name: 'Gold Boost', price: 15, duration: 7, perks: ['Top of Search', 'Gold Badge', 'Featured in Email'] },
        { id: 'platinum', name: 'Platinum Boost', price: 30, duration: 30, perks: ['Homepage Feature', 'Platinum Badge', 'Social Media Shoutout'] },
    ];

    const handleBoost = async () => {
        if (!user) return;
        setIsLoading(true);
        const plan = plans.find(p => p.id === selectedPlan)!;
        try {
            // Mock payment processing here
            await itemService.boostItem(item.id, selectedPlan, plan.duration);
            showNotification(`Successfully boosted ${item.title}!`);
            onClose();
        } catch (error) {
            console.error("Boost failed", error);
            showNotification("Failed to boost item. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-700 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <h3 className="text-xl font-bold font-display">Boost Your Listing</h3>
                    <p className="text-purple-100 text-sm mt-1">Get more views and sell faster.</p>
                </div>
                
                <div className="p-6 space-y-4">
                    {plans.map((plan) => (
                        <div 
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id as any)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-600' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-lg dark:text-white">{plan.name}</h4>
                                <span className="font-bold text-xl text-purple-600">${plan.price}</span>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-2">
                                {plan.perks.map((perk, i) => <li key={i}>• {perk}</li>)}
                            </ul>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{plan.duration} Days Duration</p>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-black/20">
                    <button onClick={onClose} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleBoost} disabled={isLoading} className="px-8 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 flex items-center gap-2">
                        {isLoading ? <Spinner size="sm" /> : 'Pay & Boost'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoostListingModal;
