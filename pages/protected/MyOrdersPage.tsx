
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listerService, itemService } from '../../services/itemService';
import type { RentalHistoryItem } from '../../types';
import { CommerceListPanelSkeleton } from '../../components/commerce/CommerceSkeleton';
import { useCart } from '../../hooks/useCart';
import { useNotification } from '../../context/NotificationContext';

const noOrdersArtwork = new URL('../../dashboard images/no orders .png', import.meta.url).href;

const OrdersEmptyState: React.FC<{ title: string; message: string; ctaLabel: string; ctaTo: string }> = ({
    title,
    message,
    ctaLabel,
    ctaTo,
}) => (
    <div className="relative overflow-hidden rounded-[28px] border border-[#ebdfe9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),rgba(255,255,255,0.82)_48%,rgba(241,255,242,0.72)_100%),linear-gradient(180deg,rgba(255,253,252,0.98),rgba(247,251,245,0.94))] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_28px_52px_rgba(170,214,175,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),rgba(255,255,255,0.03)_48%,rgba(143,218,152,0.04)_100%),linear-gradient(180deg,rgba(30,35,35,0.98),rgba(24,29,29,0.96))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_28px_52px_rgba(0,0,0,0.22)]">
        <div className="pointer-events-none absolute inset-x-16 bottom-4 h-20 rounded-full bg-gradient-to-r from-[#dff3cf]/45 via-[#caf0d0]/35 to-[#eff8e5]/45 blur-3xl dark:from-[#34503b]/18 dark:via-[#2b4634]/16 dark:to-[#32443b]/18" />
        <img src={noOrdersArtwork} alt="UrbanPrime orders illustration" className="relative z-10 mx-auto h-44 w-auto max-w-full object-contain sm:h-48" />
        <h2 className="relative z-10 mt-5 text-xl font-black tracking-tight text-text-primary">{title}</h2>
        <p className="relative z-10 mt-2 text-sm leading-6 text-text-secondary">{message}</p>
        <Link
            to={ctaTo}
            className="relative z-10 mt-6 inline-flex items-center rounded-full bg-[linear-gradient(90deg,#92cf79,#6bc4a3)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_30px_rgba(110,195,143,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(110,195,143,0.3)] dark:bg-[linear-gradient(90deg,#426645,#2f6f58)] dark:shadow-[0_16px_30px_rgba(0,0,0,0.22)]"
        >
            {ctaLabel}
        </Link>
    </div>
);

const statusColors: Record<string, string> = {
    pending: 'text-amber-800 bg-amber-100',
    confirmed: 'text-green-800 bg-green-100',
    shipped: 'text-indigo-800 bg-indigo-100',
    delivered: 'text-sky-800 bg-sky-100',
    returned: 'text-orange-800 bg-orange-100',
    completed: 'text-gray-800 bg-gray-100',
    cancelled: 'text-red-800 bg-red-100',
    processing: 'text-slate-800 bg-slate-100',
};

const getStatusTone = (status: string) => statusColors[status] || 'text-slate-800 bg-slate-100';

const formatStatusLabel = (status: string, type: RentalHistoryItem['type']) => {
    const normalized = String(status || '').toLowerCase();
    if (type === 'rent') {
        if (normalized === 'confirmed') return 'Confirmed';
        if (normalized === 'shipped') return 'In Transit';
        if (normalized === 'delivered') return 'Active';
        if (normalized === 'returned') return 'Returned';
    }
    return normalized.replace(/_/g, ' ');
};

const MyOrdersPage: React.FC = () => {
    const { user } = useAuth();
    const { addItemToCart } = useCart();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'rentals' | 'purchases'>('rentals');
    const [history, setHistory] = useState<RentalHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const nextHistory = await listerService.getRentalHistory(user.id);
            nextHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setHistory(nextHistory);
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
            if (item.productType === 'pod' || item.fulfillmentType === 'pod' || item.podProfile) {
                navigate(`/item/${item.id}`);
                showNotification('Choose your POD variant again before reordering.');
                return;
            }
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
                    {isLoading ? <CommerceListPanelSkeleton rows={4} /> : rentals.length > 0 ? (
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
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${getStatusTone(item.status)}`}>{formatStatusLabel(item.status, item.type)}</span>
                                        {item.source !== 'commerce' && item.status === 'pending' ? (
                                            <button onClick={() => handleCancelBooking(item.id)} className="clay-button clay-button-primary clay-size-sm clay-tone-danger is-interactive">Cancel</button>
                                        ) : null}
                                        <Link to={`/profile/orders/${item.id}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">Details</Link>
                                        <Link to={`/item/${item.itemId}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">
                                            View item
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <OrdersEmptyState
                            title="You have no rentals yet."
                            message="When you rent an item, your booking details and active handoff updates will appear here."
                            ctaLabel="Browse Items"
                            ctaTo="/browse"
                        />
                    )}
                </div>
            )}

            {activeTab === 'purchases' && (
                <div>
                     <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-xl font-bold font-display text-text-primary">My Purchases</h1>
                        <Link to="/profile/digital-library" className="clay-button clay-button-secondary clay-size-sm is-interactive inline-flex">
                            Open digital library
                        </Link>
                     </div>
                     {isLoading ? <CommerceListPanelSkeleton rows={4} /> : purchases.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {purchases.map(item => (
                                <li key={item.id} className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-grow">
                                        <img src={item.itemImageUrl} alt={item.itemTitle} className="w-20 h-20 rounded-lg object-cover border border-border"/>
                                        <div>
                                            <Link to={`/item/${item.itemId}`} className="font-bold text-text-primary hover:underline">{item.itemTitle}</Link>
                                            <p className="text-sm text-text-secondary">Purchased on {new Date(item.startDate).toLocaleDateString()}</p>
                                            {item.podVariantLabel ? <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">POD variant: {item.podVariantLabel}</p> : null}
                                            {item.podJobStatus ? <p className="text-xs text-text-secondary">Production: {item.podJobStatus.replace(/_/g, ' ')}</p> : null}
                                            <p className="text-sm font-semibold text-text-primary">${item.totalPrice.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        {item.source !== 'commerce' && item.itemType === 'digital' ? (
                                            <a href={item.digitalFileUrl} download className="clay-button clay-button-secondary clay-size-sm is-interactive">
                                                Download
                                            </a>
                                        ) : item.source !== 'commerce' ? (
                                            <button onClick={() => handleBuyAgain(item.itemId)} className="clay-button clay-button-secondary clay-size-sm is-interactive">Buy Again</button>
                                        ) : (
                                            <button onClick={() => handleBuyAgain(item.itemId)} className="clay-button clay-button-secondary clay-size-sm is-interactive">Buy again</button>
                                        )}
                                        <Link to={`/profile/orders/${item.id}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">Details</Link>
                                        <Link to={`/item/${item.itemId}`} className="clay-button clay-button-secondary clay-size-sm is-interactive">View item</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <OrdersEmptyState
                            title="You have no purchases yet."
                            message="When you buy an item, its fulfillment status and order details will appear here."
                            ctaLabel="Browse Items"
                            ctaTo="/browse"
                        />
                    )}
                </div>
            )}
        </main>
    );
};

export default MyOrdersPage;
