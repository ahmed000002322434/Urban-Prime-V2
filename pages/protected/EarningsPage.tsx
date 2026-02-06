import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const BankIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <path d="M3 21h18"/><path d="M5 21V5l7-4 7 4v16"/><path d="M12 21v-7"/><path d="M12 5v-1"/><path d="M12 14V8"/></svg>
);

const EarningsPage: React.FC = () => {
    const { currency } = useTranslation();
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                    <p className="text-4xl font-extrabold mt-1 text-primary">{currency.symbol}320.00</p>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Pending Payout</h3>
                    <p className="text-4xl font-extrabold mt-1 text-primary">{currency.symbol}90.00</p>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Last Payout</h3>
                    <p className="text-4xl font-extrabold mt-1 text-primary">{currency.symbol}150.00</p>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h2 className="text-xl font-bold font-display">Payout Methods</h2>
                    <button className="px-4 py-2 text-sm bg-black text-white font-semibold rounded-md hover:bg-gray-800">
                        Add Payout Method
                    </button>
                </div>
                 <div className="text-center py-10">
                    <BankIcon />
                    <p className="font-semibold mt-4">No payout method configured.</p>
                    <p className="text-sm text-gray-500 mt-1">Add your bank account to receive earnings.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                 <h2 className="text-xl font-bold font-display mb-4">Transaction History</h2>
                 <p className="text-center text-sm text-gray-500 py-10">No transactions yet.</p>
            </div>
        </div>
    );
};

export default EarningsPage;
