
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listerService, itemService } from '../../services/itemService';
import type { RentalHistoryItem, Item } from '../../types';
import Spinner from '../../components/Spinner';
import { useCart } from '../../hooks/useCart';
import { useNotification } from '../../context/NotificationContext';

const OrderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-slate-300">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

const statusColors: Record<string, string> = {
    pending: 'text-amber-800 bg-amber-100 dark:bg-amber-900 dark:text-amber-200',
    confirmed: 'text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-200',
    completed: 'text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-300',
    cancelled: 'text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-200',
};

const MyOrdersPage: React.FC = () => {
    const { user } = useAuth();
    const { addItemToCart } = useCart();
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'rentals' | 'purchases'>('rentals');
    const [history, setHistory] = useState<RentalHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchHistory = () => {
        if (user) {
            setIsLoading(true);
            listerService.getRentalHistory(user.id)
                .then(setHistory)
                .finally(() => setIsLoading(false));
        }
    }

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const handleCancelBooking = async (bookingId: string) => {
        if (window.confirm("Are you sure you want to cancel this booking request?")) {
            await listerService.updateBookingStatus(bookingId, 'cancelled');
            fetchHistory();
        }
    };
    
    const handleBuyAgain = async (itemId: string) => {
        const item = await itemService.getItemById(itemId);
        if (item) {
            addItemToCart(item, 1);
            showNotification(`${item.title} added to cart!`);
        }
    };


    const TabButton: React.FC<{tab: 'rentals' | 'purchases', children: React.ReactNode}> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'}`}
        >
            {children}
        </button>
    );

    const rentals = history.filter(item => item.type === 'rent');
    const purchases = history.filter(item => item.type === 'sale');

    return (
        <main className="flex-1 bg-surface p-6 rounded-xl shadow-soft border border-border">
            <div className="border-b border-border mb-6">
                <TabButton tab="rentals">My Rentals</TabButton>
                <TabButton tab="purchases">My Purchases</TabButton>
            </div>

            {activeTab === 'rentals' && (
                <div>
                    <h1 className="text-xl font-bold mb-4 font-display text-text-primary">My Rentals</h1>
                    {isLoading ? <Spinner /> : rentals.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {rentals.map(item => (
                                <li key={item.id} className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-grow">
                                        <img src={item.itemImageUrl} alt={item.itemTitle} className="w-20 h-20 rounded-lg object-cover border border-border"/>
                                        <div>
                                            <Link to={`/item/${item.itemId}`} className="font-bold text-text-primary hover:underline">{item.itemTitle}</Link>
                                            <p className="text-sm text-text-secondary">
                                                {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm font-semibold text-text-primary">${item.totalPrice.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[item.status]}`}>{item.status.toUpperCase()}</span>
                                        {item.status === 'pending' ? (
                                            <button onClick={() => handleCancelBooking(item.id)} className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">Cancel</button>
                                        ) : (
                                            <Link to={`/profile/orders/${item.id}`} className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black font-semibold rounded-md hover:opacity-80">Details</Link>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-16">
                            <OrderIcon />
                            <h2 className="font-bold text-xl mt-4 text-text-primary">You have no rentals yet.</h2>
                            <p className="text-sm text-text-secondary mt-1">
                                When you rent an item, your booking details will appear here.
                            </p>
                            <Link to="/browse" className="mt-6 inline-block bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-full hover:opacity-90 transition-opacity">
                                Browse Items
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'purchases' && (
                <div>
                     <h1 className="text-xl font-bold mb-4 font-display text-text-primary">My Purchases</h1>
                     {isLoading ? <Spinner /> : purchases.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {purchases.map(item => (
                                <li key={item.id} className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-grow">
                                        <img src={item.itemImageUrl} alt={item.itemTitle} className="w-20 h-20 rounded-lg object-cover border border-border"/>
                                        <div>
                                            <Link to={`/item/${item.itemId}`} className="font-bold text-text-primary hover:underline">{item.itemTitle}</Link>
                                            <p className="text-sm text-text-secondary">Purchased on {new Date(item.startDate).toLocaleDateString()}</p>
                                            <p className="text-sm font-semibold text-text-primary">${item.totalPrice.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {item.itemType === 'digital' ? (
                                            <a href={item.digitalFileUrl} download className="px-4 py-2 text-sm bg-primary/20 text-primary font-semibold rounded-md hover:bg-primary/30">
                                                Download
                                            </a>
                                        ) : (
                                            <button onClick={() => handleBuyAgain(item.itemId)} className="px-4 py-2 text-sm bg-primary/20 text-primary font-semibold rounded-md hover:bg-primary/30">Buy Again</button>
                                        )}
                                        <Link to={`/profile/orders/${item.id}`} className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black font-semibold rounded-md hover:opacity-80">Details</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-16">
                            <OrderIcon />
                            <h2 className="font-bold text-xl mt-4 text-text-primary">You have no purchases yet.</h2>
                            <p className="text-sm text-text-secondary mt-1">
                                When you buy an item, your order details will appear here.
                            </p>
                            <Link to="/browse" className="mt-6 inline-block bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-full hover:opacity-90 transition-opacity">
                                Browse Items
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
};

export default MyOrdersPage;
