import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { userService } from '../../services/itemService';
import type { WalletTransaction } from '../../types';
import Spinner from '../Spinner';

const WalletModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useAuth();
    const { currency } = useTranslation();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            userService.getWalletTransactions(user.id)
                .then(data => setTransactions(data.slice(0, 5)))
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">My Wallet</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-6">
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium text-primary">Current Balance</p>
                        <p className="text-4xl font-extrabold text-primary mt-1">{currency.symbol}{(user?.walletBalance || 0).toFixed(2)}</p>
                    </div>
                     <h4 className="font-semibold text-sm mt-6 mb-2 text-light-text dark:text-dark-text">Recent Transactions</h4>
                     {isLoading ? <Spinner /> : transactions.length > 0 ? (
                        <div className="space-y-2 text-sm">
                            {transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center bg-gray-50 dark:bg-dark-background p-2 rounded">
                                    <div>
                                        <p className="font-medium text-light-text dark:text-dark-text">{tx.description}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                                    </div>
                                    <p className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}{currency.symbol}{tx.amount.toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-sm text-gray-500">No transactions yet.</p>}
                </main>
            </div>
        </div>
    );
};

export default WalletModal;
