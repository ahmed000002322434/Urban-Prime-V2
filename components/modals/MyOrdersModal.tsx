import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { RentalHistoryItem } from '../../types';
import Spinner from '../Spinner';

const MyOrdersModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useAuth();
    const [history, setHistory] = useState<RentalHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            listerService.getRentalHistory(user.id)
                .then(data => setHistory(data.slice(0, 5))) // Show recent 5
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Recent Orders</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : history.length > 0 ? (
                        <ul className="divide-y dark:divide-gray-700">
                            {history.map(item => (
                                <li key={item.id} className="py-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <img src={item.itemImageUrl} alt={item.itemTitle} className="w-12 h-12 rounded-md object-cover"/>
                                        <div>
                                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{item.itemTitle}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {item.type === 'rent' ? `Rented: ${new Date(item.startDate).toLocaleDateString()}` : `Purchased: ${new Date(item.startDate).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <Link to={`/profile/orders/${item.id}`} onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 font-semibold rounded-md">Details</Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-500 py-10">No recent orders found.</p>}
                </main>
                <footer className="p-4 bg-gray-50 dark:bg-dark-surface/50 border-t dark:border-gray-700 text-center">
                    <Link to="/profile/orders" onClick={onClose} className="text-sm font-semibold text-primary hover:underline">View All Orders</Link>
                </footer>
            </div>
        </div>
    );
};

export default MyOrdersModal;
