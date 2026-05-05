import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { itemService, listerService } from '../../services/itemService';
import commerceService from '../../services/commerceService';
import type { AuctionSnapshot, Booking, Item } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../utils/financeUtils';

type SalesTab = 'orders' | 'queue' | 'auctions';

type SellerAuctionRow = {
    item: Item;
    snapshot: AuctionSnapshot | null;
};

type ShippingModalState = {
    bookingId: string;
    itemTitle: string;
    type: 'sale' | 'rent';
};

type CounterOfferState = {
    itemId: string;
    bidId: string;
    bidderName: string;
    currentAmount: number;
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-slate-100 text-slate-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-purple-100 text-purple-800',
    returned: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    live: 'bg-emerald-100 text-emerald-800',
    winner_pending_payment: 'bg-amber-100 text-amber-800',
    countered: 'bg-slate-900 text-white',
    counter_accepted: 'bg-emerald-100 text-emerald-800',
    counter_declined: 'bg-rose-100 text-rose-800',
    payment_expired: 'bg-rose-100 text-rose-800',
    closed: 'bg-slate-100 text-slate-800'
};

const getTone = (status: string) => statusColors[status] || 'bg-slate-100 text-slate-800';

const bookingStatusLabel = (booking: Booking) => {
    if (booking.type === 'rent') {
        if (booking.status === 'shipped') return 'In Transit';
        if (booking.status === 'delivered') return 'Active';
        if (booking.status === 'returned') return 'Returned';
    }
    return booking.status.replace(/_/g, ' ');
};

const bookingNextStep = (booking: Booking) => {
    if (booking.type === 'rent') {
        if (booking.status === 'pending') return 'Confirm the rental request';
        if (booking.status === 'confirmed' && booking.deliveryMode === 'pickup') return 'Mark ready for pickup';
        if (booking.status === 'confirmed') return 'Dispatch the rental';
        if (booking.status === 'shipped') return 'Buyer confirms handoff';
        if (booking.status === 'delivered') return 'Awaiting item return';
        if (booking.status === 'returned' && booking.depositStatus === 'held') return 'Review and settle deposit';
        if (booking.status === 'returned') return 'Return logged';
    }

    if (booking.status === 'processing' || booking.status === 'confirmed') return 'Ship the order';
    if (booking.status === 'shipped') return 'Mark delivered when complete';
    if (booking.status === 'delivered') return 'Buyer can confirm receipt';
    return 'No immediate action';
};

const formatBookingWindow = (booking: Booking) => {
    const start = new Date(booking.startDate).toLocaleDateString();
    const end = new Date(booking.endDate).toLocaleDateString();
    return booking.type === 'rent' ? `${start} - ${end}` : start;
};

const buildFallbackSnapshot = (item: Item): AuctionSnapshot | null => {
    if (item.listingType !== 'auction' || !item.auctionDetails) return null;

    return {
        itemId: item.id,
        status: 'live',
        reserveMet: Number(item.reservePrice || 0) <= Number(item.auctionDetails.currentBid || 0),
        currentBid: Number(item.auctionDetails.currentBid || 0),
        startingBid: Number(item.auctionDetails.startingBid || 0),
        reservePrice: Number(item.reservePrice || 0),
        buyNowPrice: Number(item.buyNowPrice || 0),
        endTime: item.auctionDetails.endTime || '',
        bidCount: Number(item.auctionDetails.bidCount || 0),
        canBid: false,
        canBuyNow: false,
        canCheckout: false,
        history: Array.isArray(item.auctionDetails.bids) ? item.auctionDetails.bids : []
    };
};

const SalesManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<SalesTab>('orders');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [auctions, setAuctions] = useState<SellerAuctionRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [shippingContext, setShippingContext] = useState<ShippingModalState | null>(null);
    const [shippingData, setShippingData] = useState({ carrier: '', trackingNumber: '' });
    const [counterContext, setCounterContext] = useState<CounterOfferState | null>(null);
    const [counterAmount, setCounterAmount] = useState('');

    const fetchOperations = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const [bookingsData, ownerItems] = await Promise.all([
                listerService.getBookings(user.id),
                itemService.getItemsByOwner(user.id, { visibility: 'owner', strictOwnerMatch: true })
            ]);

            setBookings(
                bookingsData
                    .slice()
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
            );

            const auctionItems = ownerItems.filter((item) => item.listingType === 'auction');
            const auctionRows = await Promise.all(
                auctionItems.map(async (item) => {
                    try {
                        const snapshot = await commerceService.getAuctionSnapshot(item.id);
                        return { item, snapshot };
                    } catch (error) {
                        console.warn('Auction snapshot fallback for seller view:', error);
                        return { item, snapshot: buildFallbackSnapshot(item) };
                    }
                })
            );

            setAuctions(
                auctionRows.sort((a, b) => {
                    const aTime = new Date(a.snapshot?.endTime || a.item.auctionDetails?.endTime || 0).getTime();
                    const bTime = new Date(b.snapshot?.endTime || b.item.auctionDetails?.endTime || 0).getTime();
                    return bTime - aTime;
                })
            );
        } catch (error) {
            console.error('Failed to fetch seller operations:', error);
            showNotification('Failed to load seller operations.');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification, user]);

    useEffect(() => {
        void fetchOperations();
    }, [fetchOperations]);

    const withBusy = async (key: string, task: () => Promise<void>) => {
        setBusyKey(key);
        try {
            await task();
        } finally {
            setBusyKey(null);
        }
    };

    const openShippingModal = (booking: Booking) => {
        setShippingContext({
            bookingId: booking.id,
            itemTitle: booking.itemTitle,
            type: booking.type === 'rent' ? 'rent' : 'sale'
        });
        setShippingData({ carrier: '', trackingNumber: '' });
        setIsShippingModalOpen(true);
    };

    const handleConfirmShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shippingContext) return;
        if (!shippingData.carrier || !shippingData.trackingNumber) {
            showNotification('Please fill in all shipping fields.');
            return;
        }

        await withBusy(`ship:${shippingContext.bookingId}`, async () => {
            await listerService.updateBooking(shippingContext.bookingId, {
                status: 'shipped',
                trackingNumber: `${shippingData.carrier}: ${shippingData.trackingNumber}`
            });
            setIsShippingModalOpen(false);
            showNotification(
                shippingContext.type === 'rent' ? 'Rental marked in transit.' : 'Order marked as shipped.'
            );
            await fetchOperations();
        });
    };

    const handleConfirmRental = async (booking: Booking) => {
        await withBusy(`confirm:${booking.id}`, async () => {
            await listerService.updateBooking(booking.id, { status: 'confirmed' });
            showNotification('Rental confirmed.');
            await fetchOperations();
        });
    };

    const handleMarkReady = async (booking: Booking) => {
        if (!booking.canonicalRentalBookingId) {
            showNotification('Pickup-ready status is only available for canonical rental bookings.');
            return;
        }

        await withBusy(`ready:${booking.id}`, async () => {
            await commerceService.handoffRental(booking.canonicalRentalBookingId as string, {
                pickupInstructions: booking.pickupInstructions || undefined,
                pickupCode: booking.pickupCode || undefined,
                pickupWindowStart: booking.pickupWindowStart || undefined,
                pickupWindowEnd: booking.pickupWindowEnd || undefined
            });
            showNotification('Rental marked ready for handoff.');
            await fetchOperations();
        });
    };

    const handleMarkReturned = async (booking: Booking) => {
        await withBusy(`return:${booking.id}`, async () => {
            await listerService.updateBooking(booking.id, { status: 'returned' });
            showNotification('Rental return received.');
            await fetchOperations();
        });
    };

    const handleMarkDelivered = async (booking: Booking) => {
        await withBusy(`deliver:${booking.id}`, async () => {
            await listerService.updateBooking(booking.id, { status: 'delivered' });
            showNotification('Delivery status updated.');
            await fetchOperations();
        });
    };

    const handleAuctionResponse = async (
        itemId: string,
        bidId: string,
        action: 'accept' | 'decline' | 'counter',
        manualCounterAmount?: number
    ) => {
        const parsedCounterAmount = action === 'counter' ? Number(manualCounterAmount) : undefined;
        if (action === 'counter' && (!Number.isFinite(parsedCounterAmount) || Number(parsedCounterAmount) <= 0)) {
            showNotification('Counter amount must be a valid number.');
            return;
        }

        await withBusy(`auction:${itemId}:${bidId}:${action}`, async () => {
            await commerceService.respondToAuction(itemId, {
                action,
                bidId,
                counterAmount: parsedCounterAmount
            });
            showNotification(
                action === 'accept'
                    ? 'Bid accepted. Winner checkout window started.'
                    : action === 'decline'
                        ? 'Bid declined.'
                        : 'Counter offer sent.'
            );
            await fetchOperations();
        });
    };

    const openCounterComposer = (itemId: string, bidId: string, bidderName: string, currentAmount: number) => {
        setCounterContext({
            itemId,
            bidId,
            bidderName,
            currentAmount
        });
        setCounterAmount(String(Math.ceil(currentAmount + 1)));
    };

    const handleSubmitCounter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!counterContext) return;
        const nextAmount = Number(counterAmount);
        if (!Number.isFinite(nextAmount) || nextAmount <= counterContext.currentAmount) {
            showNotification('Counter amount must be greater than the current bid.');
            return;
        }

        await handleAuctionResponse(counterContext.itemId, counterContext.bidId, 'counter', nextAmount);
        setCounterContext(null);
        setCounterAmount('');
    };

    const handleCloseAuction = async (itemId: string) => {
        if (!window.confirm('Close this auction now?')) return;

        await withBusy(`close:${itemId}`, async () => {
            await commerceService.closeAuction(itemId);
            showNotification('Auction closed.');
            await fetchOperations();
        });
    };

    const handlePromoteNextBidder = async (itemId: string) => {
        if (!window.confirm('Promote the next highest valid bidder and restart the payment window?')) return;

        await withBusy(`promote:${itemId}`, async () => {
            await commerceService.closeAuction(itemId, { promoteNext: true });
            showNotification('Next bidder promoted.');
            await fetchOperations();
        });
    };

    const actionQueue = useMemo(
        () =>
            bookings.filter((booking) => {
                if (booking.type === 'rent') {
                    return ['pending', 'confirmed', 'delivered', 'returned'].includes(booking.status);
                }
                return ['processing', 'confirmed', 'shipped'].includes(booking.status);
            }),
        [bookings]
    );

    const liveAuctions = useMemo(
        () => auctions.filter((row) => ['live', 'winner_pending_payment'].includes(String(row.snapshot?.status || ''))),
        [auctions]
    );

    const visibleBookings = activeTab === 'queue' ? actionQueue : bookings;

    const renderBookingActions = (booking: Booking) => {
        const isBusy = busyKey?.startsWith(`${booking.id}`) || busyKey?.includes(`:${booking.id}`);

        return (
            <div className="flex flex-wrap justify-end gap-2">
                {booking.type === 'rent' && booking.status === 'pending' ? (
                    <button
                        type="button"
                        onClick={() => void handleConfirmRental(booking)}
                        disabled={Boolean(isBusy)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        Confirm
                    </button>
                ) : null}

                {booking.type === 'rent' && booking.status === 'confirmed' && booking.deliveryMode === 'pickup' ? (
                    <button
                        type="button"
                        onClick={() => void handleMarkReady(booking)}
                        disabled={Boolean(isBusy)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                    >
                        Ready for pickup
                    </button>
                ) : null}

                {['processing', 'confirmed'].includes(booking.status) && (booking.type !== 'rent' || booking.deliveryMode !== 'pickup') ? (
                    <button
                        type="button"
                        onClick={() => openShippingModal(booking)}
                        disabled={Boolean(isBusy)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {booking.type === 'rent' ? 'Dispatch rental' : 'Confirm shipment'}
                    </button>
                ) : null}

                {booking.type !== 'rent' && booking.status === 'shipped' ? (
                    <button
                        type="button"
                        onClick={() => void handleMarkDelivered(booking)}
                        disabled={Boolean(isBusy)}
                        className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
                    >
                        Mark delivered
                    </button>
                ) : null}

                {booking.type === 'rent' && booking.status === 'delivered' ? (
                    <button
                        type="button"
                        onClick={() => void handleMarkReturned(booking)}
                        disabled={Boolean(isBusy)}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
                    >
                        Return received
                    </button>
                ) : null}

                <Link
                    to={`/profile/orders/${booking.id}`}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200"
                >
                    {booking.type === 'rent' && booking.status === 'returned' && booking.depositStatus === 'held'
                        ? 'Deposit actions'
                        : 'Details'}
                </Link>
            </div>
        );
    };

    const StatCard: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
        <div className="rounded-3xl border border-border bg-white/80 p-5 shadow-soft backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-text-secondary">{label}</p>
            <p className="mt-3 text-3xl font-black text-text-primary">{value}</p>
            <p className="mt-2 text-sm text-text-secondary">{detail}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_50%),linear-gradient(135deg,_#ffffff,_#f1f5f9)] p-6 shadow-soft">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Seller Operations</p>
                    <h1 className="mt-3 text-3xl font-black text-slate-950">Rentals, fulfillment, and auction responses in one workflow.</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Canonical commerce actions run from here. Sale flows keep working, rentals now include handoff and return states, and auction decisions no longer rely on chat.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/profile/products/new" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black">
                            Create listing
                        </Link>
                        <Link to="/profile/pod-studio/orders" className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:border-slate-400">
                            POD queue
                        </Link>
                        <Link to="/profile/disputes" className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:border-slate-400">
                            Review disputes
                        </Link>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    <StatCard
                        label="Orders"
                        value={String(bookings.length)}
                        detail={`${actionQueue.length} seller actions waiting`}
                    />
                    <StatCard
                        label="Auctions"
                        value={String(liveAuctions.length)}
                        detail={`${auctions.length} total auction listings tracked`}
                    />
                    <StatCard
                        label="Rentals"
                        value={String(bookings.filter((booking) => booking.type === 'rent').length)}
                        detail={`${bookings.filter((booking) => booking.type === 'rent' && booking.depositStatus === 'held').length} deposits still held`}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-3 border-b border-border pb-3">
                {[
                    { id: 'orders', label: 'All Orders' },
                    { id: 'queue', label: `Action Queue (${actionQueue.length})` },
                    { id: 'auctions', label: `Auctions (${auctions.length})` }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as SalesTab)}
                        className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                            activeTab === tab.id
                                ? 'bg-slate-950 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="grid gap-4">
                    {[0, 1, 2].map((row) => (
                        <div key={row} className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm">
                            <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                            <div className="mt-4 h-8 w-72 animate-pulse rounded-full bg-slate-200" />
                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                {[0, 1, 2].map((cell) => (
                                    <div key={cell} className="h-24 animate-pulse rounded-2xl bg-slate-200/80" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'auctions' ? (
                <div className="grid gap-5 xl:grid-cols-2">
                    {auctions.length > 0 ? (
                        auctions.map(({ item, snapshot }) => {
                            const currentBid = Number(snapshot?.currentBid || item.auctionDetails?.currentBid || 0);
                            const endTime = snapshot?.endTime || item.auctionDetails?.endTime || '';
                            const latestBid = snapshot?.history?.[0];
                            const auctionBusy = Boolean(
                                busyKey?.startsWith(`auction:${item.id}`) || busyKey === `close:${item.id}` || busyKey === `promote:${item.id}`
                            );
                            const winnerWindow = snapshot?.winnerCheckoutExpiresAt
                                ? new Date(snapshot.winnerCheckoutExpiresAt).toLocaleString()
                                : '';
                            const canPromote = String(snapshot?.status || '') === 'winner_pending_payment';
                            const canRespondToBid = String(snapshot?.status || '') === 'live' && Boolean(latestBid);

                            return (
                                <div key={item.id} className="rounded-[28px] border border-border bg-white p-6 shadow-soft">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{item.status || 'published'}</p>
                                            <h2 className="mt-2 text-xl font-black text-slate-950">{item.title}</h2>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getTone(String(snapshot?.status || 'live'))}`}>
                                                    {String(snapshot?.status || 'live').replace(/_/g, ' ')}
                                                </span>
                                                {snapshot?.reserveMet ? (
                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">Reserve met</span>
                                                ) : null}
                                            </div>
                                        </div>
                                        <Link
                                            to={`/auctions/${item.id}`}
                                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400"
                                        >
                                            Open public page
                                        </Link>
                                    </div>

                                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Current bid</p>
                                            <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(currentBid)}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Bid count</p>
                                            <p className="mt-2 text-2xl font-black text-slate-950">{snapshot?.bidCount || 0}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Ends</p>
                                            <p className="mt-2 text-sm font-bold text-slate-950">{endTime ? new Date(endTime).toLocaleString() : 'Not scheduled'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Top live decision</p>
                                                <p className="text-xs text-slate-500">
                                                    {canPromote
                                                        ? `Winner payment window closes ${winnerWindow || 'soon'}. Promote the next bidder if that payment window expires.`
                                                        : 'Accept, counter, or decline the latest valid bid before close.'}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {canPromote ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => void handlePromoteNextBidder(item.id)}
                                                        disabled={auctionBusy}
                                                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                                                    >
                                                        Promote next bidder
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCloseAuction(item.id)}
                                                    disabled={auctionBusy}
                                                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
                                                >
                                                    Close auction
                                                </button>
                                            </div>
                                        </div>

                                        {latestBid ? (
                                            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{latestBid.bidderDisplayName || 'Bidder'}</p>
                                                        <p className="text-xs text-slate-500">{new Date(latestBid.placedAt).toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-slate-950">{formatCurrency(latestBid.amount)}</p>
                                                        <p className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${getTone(latestBid.status)}`}>
                                                            {latestBid.status}
                                                        </p>
                                                        {Number(latestBid.counterAmount || 0) > 0 ? (
                                                            <p className="mt-2 text-[11px] font-semibold text-slate-500">
                                                                Counter: {formatCurrency(Number(latestBid.counterAmount || 0))}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {canRespondToBid ? (
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAuctionResponse(item.id, latestBid.id, 'accept')}
                                                            disabled={auctionBusy}
                                                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openCounterComposer(item.id, latestBid.id, latestBid.bidderDisplayName || 'Bidder', Number(latestBid.amount || 0))}
                                                            disabled={auctionBusy}
                                                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                                                        >
                                                            Counter
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAuctionResponse(item.id, latestBid.id, 'decline')}
                                                            disabled={auctionBusy}
                                                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-600">
                                                        {canPromote
                                                            ? 'Winner payment is pending. Promote the next bidder if this checkout window expires or needs an override.'
                                                            : 'This auction is no longer accepting seller bid responses.'}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-500">
                                                No bids yet. The auction will still auto-close based on the session end state.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-[28px] border border-dashed border-border bg-surface p-10 text-center text-text-secondary xl:col-span-2">
                            No auction listings yet.
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-[28px] border border-border bg-white p-4 shadow-soft">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className="border-b border-border text-left text-[11px] font-black uppercase tracking-[0.22em] text-text-secondary">
                                <tr>
                                    <th className="px-4 py-3">Reference</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Buyer</th>
                                    <th className="px-4 py-3">Schedule</th>
                                    <th className="px-4 py-3">Mode</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Next Step</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleBookings.length > 0 ? (
                                    visibleBookings.map((booking) => (
                                        <tr key={booking.id} className="border-b border-border/70 align-top">
                                            <td className="px-4 py-4 font-mono text-xs text-text-secondary">
                                                {booking.orderId || booking.id.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-text-primary">{booking.itemTitle}</p>
                                                <p className="mt-1 text-xs text-text-secondary">
                                                    {booking.type === 'rent' ? 'Rental workflow' : 'Sale workflow'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-text-primary">{booking.renterName}</p>
                                                {booking.shippingAddress?.city ? (
                                                    <p className="mt-1 text-xs text-text-secondary">{booking.shippingAddress.city}</p>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-4 text-text-primary">{formatBookingWindow(booking)}</td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">
                                                        {booking.deliveryMode || (booking.type === 'rent' ? 'pickup' : 'shipping')}
                                                    </span>
                                                    {booking.trackingNumber ? (
                                                        <p className="max-w-[180px] truncate text-xs text-text-secondary">{booking.trackingNumber}</p>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getTone(booking.status)}`}>
                                                    {bookingStatusLabel(booking)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-text-secondary">{bookingNextStep(booking)}</td>
                                            <td className="px-4 py-4 text-right">{renderBookingActions(booking)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-14 text-center text-text-secondary">
                                            No records in this view.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isShippingModalOpen && shippingContext ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsShippingModalOpen(false)}>
                    <div
                        className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                            {shippingContext.type === 'rent' ? 'Rental dispatch' : 'Order shipment'}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">{shippingContext.itemTitle}</h2>
                        <form onSubmit={handleConfirmShipment} className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">Carrier</label>
                                <input
                                    type="text"
                                    value={shippingData.carrier}
                                    onChange={(event) => setShippingData((prev) => ({ ...prev, carrier: event.target.value }))}
                                    placeholder="Leopards, TCS, Rider, self managed"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">Tracking Number</label>
                                <input
                                    type="text"
                                    value={shippingData.trackingNumber}
                                    onChange={(event) => setShippingData((prev) => ({ ...prev, trackingNumber: event.target.value }))}
                                    placeholder="Tracking reference"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsShippingModalOpen(false)}
                                    className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={busyKey === `ship:${shippingContext.bookingId}`}
                                    className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                                >
                                    {busyKey === `ship:${shippingContext.bookingId}` ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {counterContext ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCounterContext(null)}>
                    <div
                        className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Counter offer</p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">Reply to {counterContext.bidderName}</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Their current bid is {formatCurrency(counterContext.currentAmount)}. Set the amount you want them to accept.
                        </p>
                        <form onSubmit={(event) => void handleSubmitCounter(event)} className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">Counter Amount</label>
                                <input
                                    type="number"
                                    min={Math.ceil(counterContext.currentAmount + 1)}
                                    step="0.01"
                                    value={counterAmount}
                                    onChange={(event) => setCounterAmount(event.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCounterContext(null)}
                                    className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={busyKey === `auction:${counterContext.itemId}:${counterContext.bidId}:counter`}
                                    className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                                >
                                    {busyKey === `auction:${counterContext.itemId}:${counterContext.bidId}:counter` ? 'Sending...' : 'Send counter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default SalesManagementPage;
