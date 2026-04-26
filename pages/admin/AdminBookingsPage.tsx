import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/adminService';
import commerceService from '../../services/commerceService';
import type { Booking, CommerceAdminOverview, CommerceDispute } from '../../types';
import { CommerceDashboardSkeleton } from '../../components/commerce/CommerceSkeleton';
import { useTranslation } from '../../hooks/useTranslation';
import { useNotification } from '../../context/NotificationContext';

const statusColors: Record<string, string> = {
    pending: 'text-amber-800 bg-amber-100',
    pending_confirmation: 'text-amber-800 bg-amber-100',
    confirmed: 'text-blue-800 bg-blue-100',
    ready_for_handoff: 'text-sky-800 bg-sky-100',
    shipped: 'text-indigo-800 bg-indigo-100',
    in_transit: 'text-indigo-800 bg-indigo-100',
    delivered: 'text-purple-800 bg-purple-100',
    active: 'text-emerald-800 bg-emerald-100',
    return_in_transit: 'text-orange-800 bg-orange-100',
    returned: 'text-orange-800 bg-orange-100',
    completed: 'text-green-800 bg-green-100',
    cancelled: 'text-red-800 bg-red-100',
    live: 'text-emerald-800 bg-emerald-100',
    open: 'text-emerald-800 bg-emerald-100',
    closed: 'text-slate-800 bg-slate-100',
    closed_no_sale: 'text-slate-800 bg-slate-100',
    winner_pending_payment: 'text-amber-800 bg-amber-100',
    resolved: 'text-green-800 bg-green-100',
    reviewing: 'text-amber-800 bg-amber-100',
    held: 'text-amber-800 bg-amber-100',
    released: 'text-green-800 bg-green-100',
    claimed: 'text-rose-800 bg-rose-100'
};

const getTone = (status: string) => statusColors[status] || 'text-slate-800 bg-slate-100';

const MetricCard: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-3 text-3xl font-black text-gray-950 dark:text-white">{value}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
);

type DisputeDraft = {
    status: string;
    resolution: string;
    adminNotes: string;
};

type ClaimDraft = {
    amount: string;
    reason: string;
    evidenceUrl: string;
    open: boolean;
};

const emptyClaimDraft: ClaimDraft = {
    amount: '',
    reason: '',
    evidenceUrl: '',
    open: false
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Action failed.');

const AdminBookingsPage: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [overview, setOverview] = useState<CommerceAdminOverview | null>(null);
    const [disputes, setDisputes] = useState<CommerceDispute[]>([]);
    const [disputeDrafts, setDisputeDrafts] = useState<Record<string, DisputeDraft>>({});
    const [claimDrafts, setClaimDrafts] = useState<Record<string, ClaimDraft>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const { currency } = useTranslation();
    const { showNotification } = useNotification();

    const syncDisputeDrafts = useCallback((rows: CommerceDispute[]) => {
        setDisputeDrafts((current) => {
            const next = { ...current };
            rows.forEach((row) => {
                next[row.id] = next[row.id] || {
                    status: row.status || 'open',
                    resolution: row.resolution || '',
                    adminNotes: row.adminNotes || ''
                };
            });
            return next;
        });
    }, []);

    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const [bookingsData, commerceOverview, disputeRows] = await Promise.all([
                adminService.getAllBookings(),
                adminService.getCommerceOverview(),
                commerceService.getDisputes().catch(() => [])
            ]);
            setBookings(bookingsData);
            setOverview(commerceOverview);
            setDisputes(disputeRows);
            syncDisputeDrafts(disputeRows);
        } catch (error) {
            console.error('Failed to fetch admin bookings overview:', error);
        } finally {
            setIsLoading(false);
        }
    }, [syncDisputeDrafts]);

    useEffect(() => {
        void fetchBookings();
    }, [fetchBookings]);

    const runAdminAction = useCallback(
        async (key: string, action: () => Promise<unknown>, successMessage: string) => {
            setPendingAction(key);
            try {
                await action();
                showNotification(successMessage);
                await fetchBookings();
            } catch (error) {
                console.error(error);
                showNotification(getErrorMessage(error));
            } finally {
                setPendingAction(null);
            }
        },
        [fetchBookings, showNotification]
    );

    const updateDisputeDraft = useCallback((id: string, patch: Partial<DisputeDraft>) => {
        setDisputeDrafts((current) => ({
            ...current,
            [id]: {
                status: current[id]?.status || 'open',
                resolution: current[id]?.resolution || '',
                adminNotes: current[id]?.adminNotes || '',
                ...patch
            }
        }));
    }, []);

    const updateClaimDraft = useCallback((id: string, patch: Partial<ClaimDraft>) => {
        setClaimDrafts((current) => ({
            ...current,
            [id]: {
                ...(current[id] || emptyClaimDraft),
                ...patch
            }
        }));
    }, []);

    const totals = useMemo(
        () => ({
            heldDeposits: overview?.rentals.filter((row) => row.securityDepositStatus === 'held').length || 0,
            waitingReview: disputes.filter((row) => row.status === 'open' || row.status === 'reviewing').length,
            awaitingWinner: overview?.auctions.filter((row) => row.status === 'winner_pending_payment').length || 0
        }),
        [disputes, overview]
    );

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="rounded-[32px] border border-gray-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_45%),linear-gradient(135deg,_#ffffff,_#f8fafc)] p-6 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Admin Operations</p>
                <h1 className="mt-3 text-3xl font-black text-gray-950 dark:text-white">Bookings, rentals, auctions, and disputes in one view.</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                    Legacy booking data stays visible for compatibility, while canonical commerce actions now let ops teams confirm rentals, move auctions, and resolve disputes from the same console.
                </p>
            </div>

            {isLoading ? (
                <CommerceDashboardSkeleton />
            ) : (
                <>
                    {overview ? (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <MetricCard
                                    label="Rentals"
                                    value={String(overview.summary.totalRentals)}
                                    detail={`${totals.heldDeposits} deposits still held`}
                                />
                                <MetricCard
                                    label="Disputes"
                                    value={String(overview.summary.openDisputes)}
                                    detail={`${totals.waitingReview} cases still need review`}
                                />
                                <MetricCard
                                    label="Auctions"
                                    value={String(overview.summary.activeAuctions)}
                                    detail={`${totals.awaitingWinner} winner windows are still open`}
                                />
                                <MetricCard
                                    label="Orders"
                                    value={String(overview.summary.totalOrders)}
                                    detail={`${overview.orders.length} recent canonical orders in cache`}
                                />
                            </div>

                            <div className="grid gap-6 xl:grid-cols-3">
                                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-black text-gray-950 dark:text-white">Rental Bookings</h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Confirm, hand off, return, or settle deposits.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {overview.rentals.length > 0 ? (
                                            overview.rentals.map((rental) => {
                                                const claimDraft = claimDrafts[rental.id] || emptyClaimDraft;
                                                const actionBusy = (suffix: string) => pendingAction === `rental:${rental.id}:${suffix}`;
                                                return (
                                                    <div key={rental.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-dark-background/60">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-gray-950 dark:text-white">{rental.itemTitle}</p>
                                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rental.rentalStart} to {rental.rentalEnd}</p>
                                                            </div>
                                                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${getTone(rental.status)}`}>
                                                                {rental.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-gray-700 dark:bg-dark-surface dark:text-gray-200">
                                                                {rental.deliveryMode}
                                                            </span>
                                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getTone(rental.securityDepositStatus)}`}>
                                                                Deposit {rental.securityDepositStatus}
                                                            </span>
                                                        </div>
                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            {rental.status === 'pending_confirmation' ? (
                                                                <button
                                                                    onClick={() => void runAdminAction(`rental:${rental.id}:confirm`, () => commerceService.confirmRental(rental.id), 'Rental confirmed.')}
                                                                    disabled={actionBusy('confirm')}
                                                                    className="rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                                                                >
                                                                    {actionBusy('confirm') ? 'Working...' : 'Confirm'}
                                                                </button>
                                                            ) : null}
                                                            {rental.status === 'confirmed' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `rental:${rental.id}:handoff`,
                                                                            () =>
                                                                                commerceService.handoffRental(
                                                                                    rental.id,
                                                                                    rental.deliveryMode === 'shipping' ? { action: 'ship' } : {}
                                                                                ),
                                                                            rental.deliveryMode === 'shipping' ? 'Rental moved to transit.' : 'Rental marked ready for handoff.'
                                                                        )
                                                                    }
                                                                    disabled={actionBusy('handoff')}
                                                                    className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                                                                >
                                                                    {actionBusy('handoff') ? 'Working...' : rental.deliveryMode === 'shipping' ? 'Start transit' : 'Ready for pickup'}
                                                                </button>
                                                            ) : null}
                                                            {rental.status === 'ready_for_handoff' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `rental:${rental.id}:activate`,
                                                                            () => commerceService.handoffRental(rental.id, { action: 'activate' }),
                                                                            'Rental is now active.'
                                                                        )
                                                                    }
                                                                    disabled={actionBusy('activate')}
                                                                    className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                                                                >
                                                                    {actionBusy('activate') ? 'Working...' : 'Mark active'}
                                                                </button>
                                                            ) : null}
                                                            {rental.status === 'active' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `rental:${rental.id}:return`,
                                                                            () =>
                                                                                commerceService.returnRental(
                                                                                    rental.id,
                                                                                    rental.deliveryMode === 'shipping' ? { action: 'start' } : {}
                                                                                ),
                                                                            rental.deliveryMode === 'shipping' ? 'Return transit started.' : 'Return received.'
                                                                        )
                                                                    }
                                                                    disabled={actionBusy('return')}
                                                                    className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                                                                >
                                                                    {actionBusy('return') ? 'Working...' : rental.deliveryMode === 'shipping' ? 'Start return' : 'Receive return'}
                                                                </button>
                                                            ) : null}
                                                            {rental.status === 'return_in_transit' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `rental:${rental.id}:receive`,
                                                                            () => commerceService.returnRental(rental.id, {}),
                                                                            'Return received.'
                                                                        )
                                                                    }
                                                                    disabled={actionBusy('receive')}
                                                                    className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                                                                >
                                                                    {actionBusy('receive') ? 'Working...' : 'Receive return'}
                                                                </button>
                                                            ) : null}
                                                            {rental.status === 'returned' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `rental:${rental.id}:complete`,
                                                                            () => commerceService.returnRental(rental.id, { action: 'complete' }),
                                                                            'Rental completed.'
                                                                        )
                                                                    }
                                                                    disabled={actionBusy('complete')}
                                                                    className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                                                                >
                                                                    {actionBusy('complete') ? 'Working...' : 'Complete rental'}
                                                                </button>
                                                            ) : null}
                                                            {rental.securityDepositStatus === 'held' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `rental:${rental.id}:release`,
                                                                            () => commerceService.releaseRentalDeposit(rental.id),
                                                                            'Deposit released.'
                                                                        )
                                                                    }
                                                                    disabled={actionBusy('release')}
                                                                    className="rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 ring-1 ring-gray-200 disabled:opacity-50 dark:bg-dark-surface dark:text-gray-100 dark:ring-gray-700"
                                                                >
                                                                    {actionBusy('release') ? 'Working...' : 'Release deposit'}
                                                                </button>
                                                            ) : null}
                                                            {rental.securityDepositStatus === 'held' ? (
                                                                <button
                                                                    onClick={() => updateClaimDraft(rental.id, { open: !claimDraft.open })}
                                                                    className="rounded-full border border-rose-200 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700 dark:border-rose-500/40 dark:text-rose-300"
                                                                >
                                                                    {claimDraft.open ? 'Hide claim' : 'Claim deposit'}
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                        {claimDraft.open ? (
                                                            <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-500/30 dark:bg-dark-surface">
                                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600 dark:text-rose-300">Deposit decision</p>
                                                                <div className="mt-3 grid gap-3">
                                                                    <input
                                                                        value={claimDraft.amount}
                                                                        onChange={(event) => updateClaimDraft(rental.id, { amount: event.target.value })}
                                                                        placeholder="Claim amount"
                                                                        type="number"
                                                                        className="h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm font-semibold outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-dark-background dark:text-white"
                                                                    />
                                                                    <textarea
                                                                        rows={3}
                                                                        value={claimDraft.reason}
                                                                        onChange={(event) => updateClaimDraft(rental.id, { reason: event.target.value })}
                                                                        placeholder="Why is part or all of the deposit being claimed?"
                                                                        className="rounded-2xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm font-semibold outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-dark-background dark:text-white"
                                                                    />
                                                                    <input
                                                                        value={claimDraft.evidenceUrl}
                                                                        onChange={(event) => updateClaimDraft(rental.id, { evidenceUrl: event.target.value })}
                                                                        placeholder="Evidence URL (optional)"
                                                                        className="h-11 rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm font-semibold outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-dark-background dark:text-white"
                                                                    />
                                                                </div>
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            void runAdminAction(
                                                                                `rental:${rental.id}:claim`,
                                                                                async () => {
                                                                                    if (!claimDraft.amount || Number(claimDraft.amount) <= 0) {
                                                                                        throw new Error('Enter a valid claim amount.');
                                                                                    }
                                                                                    if (!claimDraft.reason.trim()) {
                                                                                        throw new Error('A claim reason is required.');
                                                                                    }
                                                                                    await commerceService.claimRentalDeposit(rental.id, {
                                                                                        claimAmount: Number(claimDraft.amount),
                                                                                        claimReason: claimDraft.reason.trim(),
                                                                                        claimEvidenceUrl: claimDraft.evidenceUrl.trim() || undefined
                                                                                    });
                                                                                    updateClaimDraft(rental.id, emptyClaimDraft);
                                                                                },
                                                                                'Deposit claim recorded.'
                                                                            )
                                                                        }
                                                                        disabled={actionBusy('claim')}
                                                                        className="rounded-full bg-rose-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-50"
                                                                    >
                                                                        {actionBusy('claim') ? 'Working...' : 'Submit claim'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateClaimDraft(rental.id, emptyClaimDraft)}
                                                                        className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 dark:border-gray-600 dark:text-gray-200"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                No canonical rental bookings loaded.
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                                    <div className="mb-4">
                                        <h2 className="text-lg font-black text-gray-950 dark:text-white">Auction Sessions</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Close ended auctions or promote the next valid bidder.</p>
                                    </div>
                                    <div className="space-y-3">
                                        {overview.auctions.length > 0 ? (
                                            overview.auctions.map((auction) => {
                                                const busyClose = pendingAction === `auction:${auction.itemId}:close`;
                                                const busyPromote = pendingAction === `auction:${auction.itemId}:promote`;
                                                return (
                                                    <div key={auction.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-dark-background/60">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-gray-950 dark:text-white">{auction.itemTitle}</p>
                                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                    {auction.closedAt ? `Closed ${new Date(auction.closedAt).toLocaleString()}` : 'Still active'}
                                                                </p>
                                                            </div>
                                                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${getTone(auction.status)}`}>
                                                                {auction.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {auction.reserveMet ? (
                                                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">Reserve met</span>
                                                            ) : (
                                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">Reserve open</span>
                                                            )}
                                                            {auction.winnerCheckoutExpiresAt ? (
                                                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-gray-700 dark:bg-dark-surface dark:text-gray-200">
                                                                    Checkout by {new Date(auction.winnerCheckoutExpiresAt).toLocaleString()}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    void runAdminAction(
                                                                        `auction:${auction.itemId}:close`,
                                                                        () => commerceService.closeAuction(auction.itemId),
                                                                        'Auction closed.'
                                                                    )
                                                                }
                                                                disabled={busyClose}
                                                                className="rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                                                            >
                                                                {busyClose ? 'Working...' : auction.closedAt ? 'Re-run close' : 'Close now'}
                                                            </button>
                                                            {auction.status === 'winner_pending_payment' ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void runAdminAction(
                                                                            `auction:${auction.itemId}:promote`,
                                                                            () => commerceService.closeAuction(auction.itemId, { promoteNext: true }),
                                                                            'Winner window moved to the next valid bidder.'
                                                                        )
                                                                    }
                                                                    disabled={busyPromote}
                                                                    className="rounded-full border border-gray-300 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                                                                >
                                                                    {busyPromote ? 'Working...' : 'Promote next bidder'}
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                No auction sessions loaded.
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                                    <div className="mb-4">
                                        <h2 className="text-lg font-black text-gray-950 dark:text-white">Disputes</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Review, resolve, or add admin notes to commerce cases.</p>
                                    </div>
                                    <div className="space-y-3">
                                        {disputes.length > 0 ? (
                                            disputes.map((dispute) => {
                                                const draft = disputeDrafts[dispute.id] || {
                                                    status: dispute.status || 'open',
                                                    resolution: dispute.resolution || '',
                                                    adminNotes: dispute.adminNotes || ''
                                                };
                                                const busyKey = `dispute:${dispute.id}:save`;
                                                return (
                                                    <div key={dispute.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-dark-background/60">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-gray-950 dark:text-white">{dispute.reasonCode || 'dispute'}</p>
                                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Opened by {dispute.openedBy.name}</p>
                                                            </div>
                                                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${getTone(dispute.status)}`}>
                                                                {dispute.status}
                                                            </span>
                                                        </div>
                                                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{dispute.details}</p>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                                            {dispute.orderId ? <span className="rounded-full bg-white px-3 py-1 dark:bg-dark-surface">Order {dispute.orderId.slice(0, 8)}</span> : null}
                                                            {dispute.orderItemId ? <span className="rounded-full bg-white px-3 py-1 dark:bg-dark-surface">Line {dispute.orderItemId.slice(0, 8)}</span> : null}
                                                            {dispute.rentalBookingId ? <span className="rounded-full bg-white px-3 py-1 dark:bg-dark-surface">Rental {dispute.rentalBookingId.slice(0, 8)}</span> : null}
                                                        </div>
                                                        <div className="mt-4 space-y-3">
                                                            <select
                                                                value={draft.status}
                                                                onChange={(event) => updateDisputeDraft(dispute.id, { status: event.target.value })}
                                                                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-dark-surface dark:text-white"
                                                            >
                                                                <option value="open">Open</option>
                                                                <option value="reviewing">Reviewing</option>
                                                                <option value="resolved">Resolved</option>
                                                                <option value="closed">Closed</option>
                                                            </select>
                                                            <textarea
                                                                rows={3}
                                                                value={draft.resolution}
                                                                onChange={(event) => updateDisputeDraft(dispute.id, { resolution: event.target.value })}
                                                                placeholder="Resolution"
                                                                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-dark-surface dark:text-white"
                                                            />
                                                            <textarea
                                                                rows={3}
                                                                value={draft.adminNotes}
                                                                onChange={(event) => updateDisputeDraft(dispute.id, { adminNotes: event.target.value })}
                                                                placeholder="Internal admin notes"
                                                                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-dark-surface dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    void runAdminAction(
                                                                        busyKey,
                                                                        () =>
                                                                            commerceService.updateDispute(dispute.id, {
                                                                                status: draft.status,
                                                                                resolution: draft.resolution,
                                                                                adminNotes: draft.adminNotes
                                                                            }),
                                                                        'Dispute updated.'
                                                                    )
                                                                }
                                                                disabled={pendingAction === busyKey}
                                                                className="rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                                                            >
                                                                {pendingAction === busyKey ? 'Saving...' : 'Save decision'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                No disputes loaded.
                                            </p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </>
                    ) : null}

                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-dark-surface">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-gray-950 dark:text-white">Legacy Compatibility Bookings</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">These remain visible so older dashboards and mirrors continue working during the rollout.</p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                {bookings.length} records
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    <tr>
                                        <th className="px-6 py-3">Item</th>
                                        <th className="px-6 py-3">Renter</th>
                                        <th className="px-6 py-3">Dates</th>
                                        <th className="px-6 py-3">Total Price</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((booking) => (
                                        <tr key={booking.id} className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-surface dark:hover:bg-gray-800">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{booking.itemTitle}</td>
                                            <td className="px-6 py-4">{booking.renterName}</td>
                                            <td className="px-6 py-4">{booking.startDate} to {booking.endDate}</td>
                                            <td className="px-6 py-4">{currency.symbol}{booking.totalPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getTone(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminBookingsPage;
