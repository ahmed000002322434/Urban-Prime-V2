
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { userService, listerService } from '../../services/itemService';
import type { WalletTransaction, PayoutMethod } from '../../types';
import Spinner from '../../components/Spinner';
import { formatCurrency } from '../../utils/financeUtils';
import { useNotification } from '../../context/NotificationContext';
import TransactionHistory from '../../components/TransactionHistory';
import { Link } from 'react-router-dom';
import { ClayButton, ClayCard, ClayInput, ClaySectionHeader } from '../../components/dashboard/clay';

const WithdrawIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

const WalletPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { currency } = useTranslation();
    const { showNotification } = useNotification();
    
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    
    // Withdrawal State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [autoPayout, setAutoPayout] = useState(true);

    // Initial Data Fetch
    useEffect(() => {
        if (user) {
            setIsLoading(true);
            Promise.all([
                userService.getWalletTransactions(user.id),
                userService.getPayoutMethods(user.id)
            ]).then(([txs, methods]) => {
                setTransactions(txs);
                setPayoutMethods(methods);
                if (methods.length > 0) {
                    setSelectedMethodId(methods.find(m => m.isDefault)?.id || methods[0].id);
                }
            }).finally(() => setIsLoading(false));
        }
    }, [user]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        const amount = parseFloat(withdrawAmount);
        const availableBalance = user.walletBalance || 0;

        if (isNaN(amount) || amount <= 0) {
            showNotification("Please enter a valid amount.");
            return;
        }
        if (amount > availableBalance) {
            showNotification("Insufficient funds.");
            return;
        }
        if (!selectedMethodId) {
            showNotification("Please select a payout method.");
            return;
        }

        const selectedMethod = payoutMethods.find(m => m.id === selectedMethodId);
        if (!selectedMethod) return;

        setIsWithdrawing(true);
        try {
            const methodDetails = {
                type: selectedMethod.type as 'bank_account' | 'paypal',
                details: selectedMethod.type === 'paypal' ? selectedMethod.email! : `${selectedMethod.bankName} - ${selectedMethod.last4}`
            };

            await listerService.requestPayout(user.id, amount, methodDetails);
            
            // Optimistically update local user state
            updateUser({
                walletBalance: (user.walletBalance || 0) - amount,
                processingBalance: (user.processingBalance || 0) + amount
            });
            
            // Refresh transactions
            const newTxs = await userService.getWalletTransactions(user.id);
            setTransactions(newTxs);
            
            showNotification("Withdrawal request submitted.");
            setIsWithdrawModalOpen(false);
            setWithdrawAmount('');
        } catch (error) {
            console.error("Withdrawal failed", error);
            showNotification(typeof error === 'string' ? error : "Withdrawal failed. Please try again.");
        } finally {
            setIsWithdrawing(false);
        }
    };

    const availableBalance = user?.walletBalance || 0;
    const processingBalance = user?.processingBalance || 0;
    const heldDeposits = user?.heldDeposits || 0;
    
    // Calculate lifetime earnings from transactions for accuracy, or use a stored field if available
    const totalEarned = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* WITHDRAWAL MODAL */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsWithdrawModalOpen(false)}>
                    <div className="clay-card clay-size-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold font-display text-text-primary mb-4">Withdraw Funds</h2>
                        
                        <div className="bg-surface-soft p-4 rounded-xl mb-6 text-center border border-border">
                            <p className="text-sm text-text-secondary">Available to Withdraw</p>
                            <p className="text-3xl font-extrabold text-green-600 mt-1">{formatCurrency(availableBalance, currency.code)}</p>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-bold">$</span>
                                    <ClayInput
                                        type="number" 
                                        value={withdrawAmount} 
                                        onChange={e => setWithdrawAmount(e.target.value)} 
                                        className="pl-8 font-semibold"
                                        placeholder="0.00"
                                        min="1"
                                        max={availableBalance}
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-1">Payout Method</label>
                                {payoutMethods.length > 0 ? (
                                    <ClayInput
                                        as="select"
                                        value={selectedMethodId} 
                                        onChange={e => setSelectedMethodId(e.target.value)}
                                    >
                                        {payoutMethods.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.type === 'paypal' ? `PayPal (${m.email})` : `${m.bankName} (...${m.last4})`}
                                            </option>
                                        ))}
                                    </ClayInput>
                                ) : (
                                        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                        No payout methods found. Please add one in <Link to="/profile/finances" className="underline font-bold">Finances</Link>.
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <ClayButton type="button" onClick={() => setIsWithdrawModalOpen(false)} variant="ghost" className="flex-1">Cancel</ClayButton>
                                <ClayButton 
                                    type="submit" 
                                    disabled={isWithdrawing || payoutMethods.length === 0 || parseFloat(withdrawAmount) > availableBalance || parseFloat(withdrawAmount) <= 0}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    {isWithdrawing ? <Spinner size="sm" className="text-current"/> : 'Confirm Withdraw'}
                                </ClayButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <ClaySectionHeader title="My Wallet" subtitle="Track payouts, escrow, and transaction flow." />
                 <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                        <input type="checkbox" checked={autoPayout} onChange={e => setAutoPayout(e.target.checked)} />
                        Auto Payouts
                    </label>
                    <ClayButton onClick={() => setIsWithdrawModalOpen(true)} variant="primary" icon={<WithdrawIcon />}>
                        Withdraw Funds
                    </ClayButton>
                 </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="clay-card clay-size-lg">
                    <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Available Balance</h2>
                    <p className="text-3xl font-extrabold text-green-600 mt-2">{formatCurrency(availableBalance, currency.code)}</p>
                    <p className="text-xs text-text-secondary mt-1">Ready to withdraw</p>
                </div>
                
                 <div className="clay-card clay-size-lg">
                    <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Processing</h2>
                    <p className="text-3xl font-extrabold text-gray-500 mt-2">{formatCurrency(processingBalance, currency.code)}</p>
                    <p className="text-xs text-text-secondary mt-1">Pending withdrawals</p>
                </div>

                {/* Held Deposits Card */}
                <div className="clay-card clay-size-lg border border-blue-200 bg-blue-50/60">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="text-blue-500"><LockIcon /></div>
                        <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wider">Deposits in Escrow</h2>
                    </div>
                    <p className="text-3xl font-extrabold text-blue-800">{formatCurrency(heldDeposits, currency.code)}</p>
                    <p className="text-xs text-blue-600 mt-1">Temporarily held funds</p>
                </div>

                 <div className="clay-card clay-size-lg bg-gradient-to-br from-primary/5 to-transparent">
                    <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Total Earned</h2>
                    <p className="text-3xl font-extrabold text-primary mt-2">{formatCurrency(totalEarned, currency.code)}</p>
                    <p className="text-xs text-text-secondary mt-1">Lifetime earnings</p>
                </div>
            </div>
            
            <div className="clay-card clay-size-lg">
                <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                    <h2 className="text-xl font-bold font-display text-text-primary">Transaction History</h2>
                    <button className="text-sm font-bold text-primary hover:underline">Export CSV</button>
                </div>
                <TransactionHistory transactions={transactions} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default WalletPage;
