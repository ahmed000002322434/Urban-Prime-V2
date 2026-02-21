import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { itemService, ItemEvent } from '../../services/itemService';
import Spinner from '../../components/Spinner';

const ActivityPage: React.FC = () => {
    const { user, activePersona } = useAuth();
    const [events, setEvents] = useState<ItemEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'cart_add' | 'purchase' | 'rent' | 'auction_win' | 'item_view'>('all');

    useEffect(() => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        let isActive = true;
        setIsLoading(true);
        itemService
            .getOwnerActivity(user.id, 200, activePersona?.id)
            .then((data) => {
                if (isActive) setEvents(data);
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [user?.id, activePersona?.id]);

    const stats = useMemo(() => {
        const viewEvents = events.filter((event) => event.action === 'item_view');
        const cartAdds = events.filter((event) => event.action === 'cart_add');
        const purchases = events.filter((event) => event.action === 'purchase');
        const rentals = events.filter((event) => event.action === 'rent');
        const auctions = events.filter((event) => event.action === 'auction_win');

        const totalViewMs = viewEvents.reduce((sum, event) => sum + (event.durationMs || 0), 0);
        const averageViewSeconds = viewEvents.length ? Math.round(totalViewMs / viewEvents.length / 1000) : 0;

        return {
            views: viewEvents.length,
            cartAdds: cartAdds.length,
            purchases: purchases.length,
            rentals: rentals.length,
            auctions: auctions.length,
            averageViewSeconds
        };
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (filter === 'all') return events;
        return events.filter((event) => event.action === filter);
    }, [events, filter]);

    const formatAction = (action: ItemEvent['action']) => {
        switch (action) {
            case 'cart_add':
                return 'Added to cart';
            case 'purchase':
                return 'Purchased';
            case 'rent':
                return 'Rented';
            case 'auction_win':
                return 'Auction won';
            case 'item_view':
                return 'Viewed';
            default:
                return 'Activity';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Store Activity</h1>
                    <p className="text-sm text-text-secondary">Track cart adds, orders, and view time for your listings.</p>
                </div>
                <button
                    onClick={() => user?.id && itemService.getOwnerActivity(user.id, 200, activePersona?.id).then(setEvents)}
                    className="px-4 py-2 rounded-full border border-border/60 bg-surface text-sm font-semibold text-text-primary hover:bg-surface-soft"
                >
                    Refresh
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Views</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.views}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Avg stay</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.averageViewSeconds}s</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Cart adds</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.cartAdds}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Purchases</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.purchases}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Rentals</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.rentals}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-text-secondary">Auctions</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.auctions}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {([
                    { value: 'all', label: 'All' },
                    { value: 'item_view', label: 'Views' },
                    { value: 'cart_add', label: 'Cart adds' },
                    { value: 'purchase', label: 'Purchases' },
                    { value: 'rent', label: 'Rentals' },
                    { value: 'auction_win', label: 'Auctions' }
                ] as const).map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                            filter === option.value
                                ? 'bg-primary text-white border-primary'
                                : 'bg-surface text-text-secondary border-border/60 hover:text-text-primary'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface shadow-soft">
                <div className="px-4 py-3 border-b border-border/60">
                    <h2 className="text-sm font-semibold text-text-primary">Recent activity</h2>
                </div>
                <div className="divide-y divide-border/50">
                    {isLoading && (
                        <div className="p-6 flex justify-center">
                            <Spinner />
                        </div>
                    )}
                    {!isLoading && filteredEvents.length === 0 && (
                        <div className="p-6 text-sm text-text-secondary">No activity yet.</div>
                    )}
                    {!isLoading && filteredEvents.map((event) => (
                        <div key={event.id || `${event.itemId}-${event.createdAt}`} className="p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">{formatAction(event.action)}</p>
                                <p className="text-sm text-text-secondary">
                                    {event.actorName || 'Visitor'} on <span className="font-medium text-text-primary">{event.itemTitle}</span>
                                    {event.quantity ? ` x${event.quantity}` : ''}
                                </p>
                            </div>
                            <div className="text-xs text-text-secondary">
                                {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;

