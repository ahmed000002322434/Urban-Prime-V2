

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { listerService, userService } from '../../services/itemService';
import type { Transaction, PayoutMethod } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <p className="text-3xl font-bold mt-1 text-primary">{value}</p>
    </div>
);

const BankIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <path d="M3 21h18"/><path d="M5 21V5l7-4 7 4v16"/><path d="M12 21v-7"/><path d="M12 5v-1"/><path d="M12 14V8"/></svg>
);

const AddPayoutModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [type, setType] = useState<'bank_account' | 'paypal'>('bank_account');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);
        try {
            await userService.addPayoutMethod(user.id, {
                type,
                bankName,
                last4: accountNumber.slice(-4),
                email: type === 'paypal' ? email : undefined
            });
            onSuccess();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-text-primary">Add Payout Method</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-text-secondary">Type</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded-md bg-surface text-text-primary">
                            <option value="bank_account">Bank Account</option>
                            <option value="paypal">PayPal</option>
                        </select>
                    </div>

                    {type === 'bank_account' ? (
                        <>
                            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank Name" required className="w-full p-2 border rounded-md bg-surface text-text-primary" />
                            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account Number" required className="w-full p-2 border rounded-md bg-surface text-text-primary" />
                        </>
                    ) : (
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="PayPal Email" required className="w-full p-2 border rounded-md bg-surface text-text-primary" />
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-primary rounded-md font-semibold">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-md font-bold hover:opacity-90 min-w-[80px]">
                            {isLoading ? <Spinner size="sm" /> : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FinancesPage: React.FC = () => {
    const { user } = useAuth();
    const { currency } = useTranslation();
    const { showNotification } = useNotification();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
             const [txs, methods] = await Promise.all([
                 listerService.getTransactionsForUser(user.id),
                 userService.getPayoutMethods(user.id)
             ]);
             setTransactions(txs);
             setPayoutMethods(methods);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const pendingPayout = totalRevenue - transactions.filter(t => t.type === 'payout').reduce((sum, t) => sum - t.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {showAddModal && <AddPayoutModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchData(); showNotification("Payout method added!"); }} />}
            
            <h1 className="text-3xl font-bold font-display text-text-primary">Finances</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Total Revenue" value={`${currency.symbol}${totalRevenue.toFixed(2)}`} />
                <StatCard title="Pending Payout" value={`${currency.symbol}${pendingPayout.toFixed(2)}`} />
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-text-primary">Payout Schedule</h3>
                    <p className="text-sm text-text-secondary">Next payout window: every Friday, 2–4 PM</p>
                </div>
                <button
                    onClick={() => showNotification("Payout request created.")}
                    className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg"
                >
                    Request Payout
                </button>
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                    <h2 className="text-xl font-bold font-display text-text-primary">Payout Methods</h2>
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black font-semibold rounded-md hover:opacity-90">
                        + Add Method
                    </button>
                </div>
                
                {payoutMethods.length > 0 ? (
                    <div className="space-y-3">
                        {payoutMethods.map(method => (
                            <div key={method.id} className="p-4 border border-border rounded-lg flex justify-between items-center bg-surface-soft">
                                <div>
                                    <p className="font-bold text-text-primary capitalize">{method.type.replace('_', ' ')}</p>
                                    <p className="text-sm text-text-secondary">{method.type === 'paypal' ? method.email : `${method.bankName} •••• ${method.last4}`}</p>
                                </div>
                                {method.isDefault && <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">Default</span>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <BankIcon />
                        <p className="font-semibold mt-4 text-text-primary">No payout method configured.</p>
                        <p className="text-sm text-text-secondary mt-1">Add your bank account to receive earnings.</p>
                    </div>
                )}
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                <h2 className="text-xl font-bold font-display mb-4 text-text-primary">Transaction History</h2>
                {isLoading ? <Spinner /> : transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-text-secondary">
                                <tr>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Type</th>
                                    <th className="p-2">Description</th>
                                    <th className="p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-border">
                                        <td className="p-2 text-text-primary">{new Date(tx.date).toLocaleDateString()}</td>
                                        <td className="p-2 capitalize font-medium text-text-primary">{tx.type}</td>
                                        <td className="p-2 text-text-secondary">{tx.description}</td>
                                        <td className={`p-2 text-right font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.amount > 0 ? '+' : ''}{currency.symbol}{tx.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                     <div className="text-center py-10">
                        <p className="text-text-secondary">No transactions yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancesPage;
