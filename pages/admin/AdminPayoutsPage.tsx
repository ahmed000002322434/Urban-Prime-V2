
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import type { PayoutRequest } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from '../../hooks/useTranslation';

const PayoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;

const AdminPayoutsPage: React.FC = () => {
    const [requests, setRequests] = useState<(PayoutRequest & { userName: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
    const { currency } = useTranslation();
    const { showNotification } = useNotification();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getPayoutRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch payout requests", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (requestId: string, action: 'completed' | 'rejected') => {
        if (action === 'rejected' && !window.confirm("Reject this payout? Funds will be returned to the user's wallet.")) return;
        
        setIsProcessing(requestId);
        try {
            await adminService.updatePayoutStatus(requestId, action, action === 'rejected' ? 'Declined by admin' : undefined);
            showNotification(`Payout marked as ${action}.`);
            await fetchRequests();
        } catch (error) {
            console.error(error);
            showNotification(`Failed to update payout.`);
        } finally {
            setIsProcessing(null);
        }
    };

    const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-3">
                <PayoutIcon /> Payout Requests
            </h1>

            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex gap-4 overflow-x-auto">
                     <button onClick={() => setFilter('pending')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${filter === 'pending' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Pending</button>
                     <button onClick={() => setFilter('completed')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${filter === 'completed' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Completed</button>
                     <button onClick={() => setFilter('rejected')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${filter === 'rejected' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Rejected</button>
                     <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${filter === 'all' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>All</button>
                </div>

                {isLoading ? <div className="p-10 flex justify-center"><Spinner /></div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Seller</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Method</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.length > 0 ? filteredRequests.map(req => (
                                    <tr key={req.id} className="bg-white dark:bg-dark-surface border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{req.userName}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{currency.symbol}{req.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col">
                                                <span className="capitalize font-semibold">{req.method.type.replace('_', ' ')}</span>
                                                <span className="text-xs">{req.method.details}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                                                req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                req.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'completed')} 
                                                        disabled={isProcessing === req.id}
                                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs font-bold"
                                                    >
                                                        {isProcessing === req.id ? '...' : 'Mark Paid'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(req.id, 'rejected')} 
                                                        disabled={isProcessing === req.id}
                                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs font-bold"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No {filter} payout requests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPayoutsPage;
