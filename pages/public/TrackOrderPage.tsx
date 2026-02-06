import React, { useState } from 'react';

const TrackOrderPage: React.FC = () => {
    const [orderId, setOrderId] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock tracking logic
        if (orderId && email) {
            setStatus(`Your order #${orderId} is currently in transit and is expected to arrive within 2-3 business days.`);
        }
    };

    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-dark-text font-display">Track Your Order</h1>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Enter your order details to see its current status.</p>
                </header>

                <div className="max-w-lg mx-auto bg-white dark:bg-dark-surface p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order ID</label>
                            <input
                                type="text"
                                id="orderId"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Billing Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Track
                            </button>
                        </div>
                    </form>

                    {status && (
                        <div className="mt-8 p-4 bg-primary/10 text-primary-800 border-l-4 border-primary rounded-r-lg">
                            <h3 className="font-bold">Order Status</h3>
                            <p>{status}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrackOrderPage;
