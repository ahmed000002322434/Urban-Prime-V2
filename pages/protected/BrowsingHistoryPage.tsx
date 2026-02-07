
import React, { useState, useEffect } from 'react';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import BackButton from '../../components/BackButton';

const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-700"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

const BrowsingHistoryPage: React.FC = () => {
    const [historyItems, setHistoryItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const historyString = localStorage.getItem('urbanprime_history');
            const historyIds: string[] = historyString ? JSON.parse(historyString) : [];
            
            if (historyIds.length > 0) {
                const itemPromises = historyIds.map(id => itemService.getItemById(id));
                const items = (await Promise.all(itemPromises)).filter(Boolean) as Item[];
                setHistoryItems(items);
            } else {
                setHistoryItems([]);
            }
        } catch (e) {
            console.error("Failed to load history", e);
            setHistoryItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear your browsing history?")) {
            localStorage.removeItem('urbanprime_history');
            setHistoryItems([]);
        }
    };

    return (
        <>
        {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-3xl font-bold font-display text-text-primary">Browsing History</h1>
                </div>
                {historyItems.length > 0 && (
                    <button onClick={clearHistory} className="px-4 py-2 text-sm bg-red-100 text-red-700 font-semibold rounded-md hover:bg-red-200">
                        Clear History
                    </button>
                )}
            </div>
            
            {isLoading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
                historyItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {historyItems.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-surface rounded-xl shadow-soft border border-border">
                        <ClockIcon />
                        <h2 className="font-bold text-xl mt-4 text-text-primary">Your Browsing History is Empty</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Items you view will appear here.
                        </p>
                    </div>
                )
            )}
        </div>
        </>
    );
};

export default BrowsingHistoryPage;

