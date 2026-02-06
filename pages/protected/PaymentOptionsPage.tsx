import React from 'react';
import AccountSidebar from '../../components/AccountSidebar';

const CardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-slate-300">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 21z" />
    </svg>
);


const PaymentOptionsPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
                <AccountSidebar />
                <main className="flex-1 bg-white p-6 rounded-lg shadow-md border border-rentify-border">
                    <h1 className="text-xl font-bold border-b pb-3 mb-6">My Payment Options</h1>
                     <div className="text-center py-16">
                        <CardIcon />
                        <h2 className="font-bold text-xl mt-4">No Cards Saved</h2>
                        <p className="text-sm text-slate-500 mt-1">Your saved payment methods will appear here</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PaymentOptionsPage;