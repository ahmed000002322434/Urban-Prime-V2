
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { RentalHistoryItem } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import { Link } from 'react-router-dom';

const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-700"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;

const RentalHistoryPage: React.FC = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState<RentalHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            listerService.getRentalHistory(user.id)
                .then(data => {
                    // Filter for completed or cancelled (archived state)
                    const archived = data.filter(d => d.status === 'completed' || d.status === 'cancelled');
                    setHistory(archived);
                })
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold font-display text-text-primary">Rental Archives</h1>
            </div>
            
            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                {isLoading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                             <thead className="text-xs text-text-secondary uppercase bg-surface-soft">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(item => (
                                    <tr key={item.id} className="border-b border-border hover:bg-surface-soft">
                                        <td className="px-4 py-3 font-semibold text-text-primary">
                                            <Link to={`/profile/orders/${item.id}`} className="hover:underline">{item.itemTitle}</Link>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">{new Date(item.startDate).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 capitalize text-text-secondary">{item.type}</td>
                                        <td className="px-4 py-3">
                                             <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${item.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-text-primary">${item.totalPrice.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <ArchiveIcon />
                        <h2 className="font-bold text-xl mt-4 text-text-primary">No Archived Rentals</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Past completed rentals will appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RentalHistoryPage;
