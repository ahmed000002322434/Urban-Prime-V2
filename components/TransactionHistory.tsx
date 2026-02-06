
import React from 'react';
import type { WalletTransaction } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { formatCurrency } from '../utils/financeUtils';

interface TransactionHistoryProps {
    transactions: WalletTransaction[];
    isLoading: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, isLoading }) => {
    const { currency } = useTranslation();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-text-secondary">No transactions yet.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-left text-text-secondary bg-surface-soft border-b border-border">
                    <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Description</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 text-right font-semibold">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(tx => {
                        const isPending = tx.status === 'pending';
                        const isCredit = tx.type === 'credit';
                        const isFee = tx.type === 'fee';

                        let amountClass = 'text-text-primary';
                        if (isCredit) amountClass = 'text-green-600';
                        else if (isFee) amountClass = 'text-gray-500';
                        else amountClass = 'text-red-600';

                        return (
                            <tr key={tx.id} className="border-b border-border hover:bg-surface-soft/50 transition-colors">
                                <td className="p-3 text-text-primary">{new Date(tx.date).toLocaleDateString()}</td>
                                <td className="p-3 text-text-secondary">{tx.description}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize 
                                        ${isCredit ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                                          isFee ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : 
                                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="p-3">
                                    {isPending ? (
                                         <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full dark:bg-yellow-900/30 dark:text-yellow-300">Processing</span>
                                    ) : (
                                         <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full dark:bg-gray-800 dark:text-gray-300">Completed</span>
                                    )}
                                </td>
                                <td className={`p-3 text-right font-bold ${amountClass}`}>
                                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount, currency.code)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionHistory;
