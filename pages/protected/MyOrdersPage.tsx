
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listerService, itemService } from '../../services/itemService';
import type { RentalHistoryItem } from '../../types';
import Spinner from '../../components/Spinner';
import { useCart } from '../../hooks/useCart';
import { useNotification } from '../../context/NotificationContext';
import { auth } from '../../firebase';
import { backendFetch, isBackendConfigured } from '../../services/backendClient';

const OrderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-slate-300">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

const statusColors: Record<string, string> = {
    pending: 'text-amber-800 bg-amber-100',
    confirmed: 'text-green-800 bg-green-100',
    completed: 'text-gray-800 bg-gray-100',
    cancelled: 'text-red-800 bg-red-100',
};

const MyOrdersPage: React.FC = () => {
    const { user } = useAuth();
    const { addItemToCart } = useCart();
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'rentals' | 'purchases'>('rentals');
    const [history, setHistory] = useState<RentalHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const base = await listerService.getRentalHistory(user.id);
            let merged: RentalHistoryItem[] = [...base];
            if (isBackendConfigured() && auth.currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const res = await backendFetch('/commerce/orders/history?limit=80', {}, token);
                    const lines = Array.isArray(res?.lines) ? res.lines : [];
                    const PLACEHOLDER_IMG = '/icons/urbanprime.svg';
                    const canon: RentalHistoryItem[] = lines.map((line: Record<string, unknown>) => {
                        const orderId = String(line.orderId || '');
                        const itemId = String(line.itemId || '');
                        const rowId = String(line.id || `${orderId}-${itemId}`);
                        const typ = String(line.type || 'sale').toLowerCase() === 'rent' ? 'rent' : 'sale';
                        return {
                            id: rowId,
                            itemId,
                            itemTitle: String(line.itemTitle || 'Item'),
                            itemImageUrl: PLACEHOLDER_IMG,
                            startDate: String(line.startDate || new Date().toISOString()),
                            endDate: String(line.endDate || line.startDate || new Date().toISOString()),
                            totalPrice: Number(line.totalPrice || 0),
                            status: String(line.status || 'processing').toLowerCase(),
                            type: typ,
                            source: 'commerce',
                            orderId
                        };
                    });
                    const keyOf = (h: RentalHistoryItem) =>
                        `${h.source || 'firestore'}|${h.type}|${h.itemId}|${h.startDate}|${h.totalPrice}`;
                    const seen = new Set(merged.map(keyOf));
                    for (const row of canon) {
                        const k = keyOf(row);
                        if (!seen.has(k)) {
                            seen.add(k);
                            merged.push(row);
                        }
                    }
                } catch (e) {
                    console.warn('Commerce order history merge skipped:', e);
                }
            }
            merged.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setHistory(merged);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

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
            className={`px-3 sm:px-4 py-2 font-semibold text-xs sm:text-sm whitespace-nowrap rounded-t-lg border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'}`}
        >
            {children}
        </button>
    );

    const rentals = history.filter(item => item.type === 'rent');
    const purchases = history.filter(item => item.type === 'sale');

    return (
        <main className="clay-card clay-size-lg flex-1 bg-surface p-4 sm:p-6 rounded-xl shadow-soft border border-border">
            <div className="border-b border-border mb-6 flex gap-2 overflow-x-auto no-scrollbar">
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
                                        {item.source === 'commerce' ? (
                                            <Link to={`/item/${item.itemId}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">View item</Link>
                                        ) : item.status === 'pending' ? (
                                            <button onClick={() => handleCancelBooking(item.id)} className="clay-button clay-button-primary clay-size-sm clay-tone-danger is-interactive">Cancel</button>
                                        ) : (
                                            <Link to={`/profile/orders/${item.id}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">Details</Link>
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
                            <Link to="/browse" className="clay-button clay-button-primary clay-size-lg is-interactive mt-6 inline-flex">
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
                                        {item.source !== 'commerce' && item.itemType === 'digital' ? (
                                            <a href={item.digitalFileUrl} download className="clay-button clay-button-secondary clay-size-sm is-interactive">
                                                Download
                                            </a>
                                        ) : item.source !== 'commerce' ? (
                                            <button onClick={() => handleBuyAgain(item.itemId)} className="clay-button clay-button-secondary clay-size-sm is-interactive">Buy Again</button>
                                        ) : (
                                            <button onClick={() => handleBuyAgain(item.itemId)} className="clay-button clay-button-secondary clay-size-sm is-interactive">Buy again</button>
                                        )}
                                        {item.source === 'commerce' ? (
                                            <Link to={`/item/${item.itemId}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">View item</Link>
                                        ) : (
                                            <Link to={`/profile/orders/${item.id}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">Details</Link>
                                        )}
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
                            <Link to="/browse" className="clay-button clay-button-primary clay-size-lg is-interactive mt-6 inline-flex">
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
