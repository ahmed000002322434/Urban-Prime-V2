import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import commerceService from '../../services/commerceService';
import { itemService } from '../../services/itemService';
import { useCart } from '../../hooks/useCart';
import { useNotification } from '../../context/NotificationContext';
import type { CommerceBidProfileRow, Item } from '../../types';

const formatMoney = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0);

const statusTone = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'winner') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200';
  if (normalized === 'declined') return 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200';
  if (normalized === 'outbid') return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200';
  if (normalized === 'countered') return 'bg-slate-900 text-white dark:bg-white dark:text-slate-950';
  if (normalized === 'counter_declined' || normalized === 'payment_expired') return 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200';
  return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
};

const MyBidsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { showNotification } = useNotification();
  const [rows, setRows] = useState<CommerceBidProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutBidId, setCheckoutBidId] = useState('');
  const [actionBidId, setActionBidId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await commerceService.getProfileBids();
      setRows(data);
    } catch (error) {
      console.error('Failed to load bids:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCheckout = async (row: CommerceBidProfileRow) => {
    setCheckoutBidId(row.id);
    try {
      const item = await itemService.getItemById(row.itemId);
      if (!item) {
        showNotification('Auction item could not be loaded.');
        return;
      }

      const checkoutItem: Item = {
        ...item,
        price: row.amount,
        salePrice: row.amount,
        buyNowPrice: row.buyNowPrice || item.buyNowPrice
      };

      addItemToCart(
        {
          ...checkoutItem,
          auctionWinnerCheckout: true,
          auctionBidId: row.id
        } as any,
        1
      );
      navigate('/checkout');
    } catch (error) {
      console.error(error);
      showNotification('Unable to prepare winner checkout.');
    } finally {
      setCheckoutBidId('');
    }
  };

  const handleCounterResponse = async (
    row: CommerceBidProfileRow,
    action: 'accept_counter' | 'decline_counter'
  ) => {
    setActionBidId(`${row.id}:${action}`);
    try {
      await commerceService.respondToAuction(row.itemId, {
        action,
        bidId: row.id
      });
      showNotification(action === 'accept_counter' ? 'Counter accepted. Winner checkout window started.' : 'Counter declined.');
      await load();
    } catch (error) {
      console.error(error);
      showNotification('Unable to update counter offer.');
    } finally {
      setActionBidId('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-[32px] border border-slate-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(241,245,249,0.88))] p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(148,163,184,0.04))]">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Auction center</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">My bids</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Track open offers, winner payment windows, and outbid activity from the canonical auction ledger.
        </p>
      </div>

      <div className="rounded-[32px] border border-slate-300/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
        {loading ? (
          <div className="grid gap-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="rounded-[28px] border border-slate-300/70 bg-slate-50/80 p-5">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 h-8 w-64 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr]">
                  {[0, 1, 2, 3].map((cell) => (
                    <div key={cell} className="h-24 animate-pulse rounded-[20px] bg-slate-200/80" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">No bids yet</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">Your auction activity will appear here.</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Browse live auctions and place your first structured bid.</p>
            <Link
              to="/auctions"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-slate-950"
            >
              Explore auctions
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid gap-4 rounded-[28px] border border-slate-300/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-slate-950/40 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr]"
              >
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Auction item</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{row.itemTitle}</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Bid placed on {new Date(row.placedAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusTone(row.status)}`}>
                      {row.status}
                    </span>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {row.auctionStatus}
                    </span>
                  </div>
                </div>

                <div className="rounded-[20px] bg-white/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Your bid</p>
                  <p className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{formatMoney(row.amount)}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {row.counterAmount && row.counterAmount > row.amount
                      ? `Seller countered at ${formatMoney(row.counterAmount)}`
                      : `Current live bid ${formatMoney(row.currentBid)}`}
                  </p>
                </div>

                <div className="rounded-[20px] bg-white/80 p-4 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Buy now</p>
                  <p className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                    {row.buyNowPrice > 0 ? formatMoney(row.buyNowPrice) : 'Disabled'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {row.winnerCheckoutExpiresAt
                      ? `Window closes ${new Date(row.winnerCheckoutExpiresAt).toLocaleString()}`
                      : 'Waiting for winner selection'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 lg:justify-between">
                  {row.canAcceptCounter ? (
                    <button
                      onClick={() => void handleCounterResponse(row, 'accept_counter')}
                      disabled={actionBidId === `${row.id}:accept_counter`}
                      className="rounded-full bg-emerald-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-50"
                    >
                      {actionBidId === `${row.id}:accept_counter` ? 'Working...' : 'Accept counter'}
                    </button>
                  ) : null}
                  {row.canDeclineCounter ? (
                    <button
                      onClick={() => void handleCounterResponse(row, 'decline_counter')}
                      disabled={actionBidId === `${row.id}:decline_counter`}
                      className="rounded-full border border-slate-300 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200"
                    >
                      {actionBidId === `${row.id}:decline_counter` ? 'Working...' : 'Decline counter'}
                    </button>
                  ) : null}
                  {row.canCheckout ? (
                    <button
                      onClick={() => void handleCheckout(row)}
                      disabled={checkoutBidId === row.id}
                      className="rounded-full bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                    >
                      {checkoutBidId === row.id ? 'Preparing...' : 'Pay now'}
                    </button>
                  ) : null}
                  <Link
                    to={`/auctions/${row.itemId}`}
                    className="rounded-full border border-slate-300 px-5 py-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:border-white/10 dark:text-slate-200"
                  >
                    View auction
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBidsPage;
