import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const GiftCardsPage: React.FC = () => {
    const { currency } = useTranslation();
    const amounts = [25, 50, 100, 250];

    return (
        <div className="bg-white min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-primary dark:text-white">Urban Prime Gift Cards</h1>
                    <p className="mt-4 text-xl text-slate-600">Give the gift of access. Perfect for any occasion.</p>
                </header>

                <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-xl">
                    <h2 className="text-2xl font-bold text-center mb-6">Choose an Amount</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {amounts.map(amount => (
                            <button key={amount} className="p-4 border-2 border-slate-200 rounded-lg text-2xl font-bold hover:border-primary dark:hover:border-white focus:border-primary dark:focus:border-white focus:ring-2 focus:ring-primary/50 dark:focus:ring-white/50">
                                {currency.symbol}{amount}
                            </button>
                        ))}
                    </div>
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="recipientEmail" className="block text-sm font-medium">Recipient's Email</label>
                            <input type="email" id="recipientEmail" className="mt-1 w-full p-2 bg-transparent border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="yourName" className="block text-sm font-medium">Your Name</label>
                            <input type="text" id="yourName" className="mt-1 w-full p-2 bg-transparent border border-slate-300 rounded-md" />
                        </div>
                         <div>
                            <label htmlFor="message" className="block text-sm font-medium">Personal Message (Optional)</label>
                            <textarea id="message" rows={3} className="mt-1 w-full p-2 bg-transparent border border-slate-300 rounded-md"></textarea>
                        </div>
                    </div>
                    <button className="mt-6 w-full py-3 bg-primary dark:bg-black text-white font-bold rounded-lg hover:bg-primary-700">
                        Purchase Gift Card
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GiftCardsPage;
