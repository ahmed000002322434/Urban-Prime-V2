import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import commerceService from '../../services/commerceService';
import { itemService } from '../../services/itemService';
import type { AuctionSnapshot, Item } from '../../types';

const formatMoney = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0);

const countdownLabel = (endTime?: string) => {
  if (!endTime) return 'Ends soon';
  const diff = new Date(endTime).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return 'Auction ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(minutes, 1)}m left`;
};

type AuctionFilter = 'all' | 'buy_now' | 'reserve' | 'ending_soon';

const chipClass = (active: boolean) =>
  `rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition ${
    active
      ? 'border-white bg-white text-slate-950'
      : 'border-white/20 bg-transparent text-white/80 hover:border-white/50 hover:text-white'
  }`;

const AuctionsPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, AuctionSnapshot>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [auctionFilter, setAuctionFilter] = useState<AuctionFilter>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await itemService.getItems(
          { listingType: 'auction', status: 'published' },
          { page: 1, limit: 18 }
        );
        if (cancelled) return;
        setItems(result.items);

        if (commerceService.enabled()) {
          const entries = await Promise.all(
            result.items.map(async (item) => {
              try {
                const snapshot = await commerceService.getAuctionSnapshot(item.id);
                return [item.id, snapshot] as const;
              } catch {
                return [item.id, null] as const;
              }
            })
          );

          if (!cancelled) {
            setSnapshots(
              entries.reduce<Record<string, AuctionSnapshot>>((acc, [itemId, snapshot]) => {
                if (snapshot) acc[itemId] = snapshot;
                return acc;
              }, {})
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const snapshot = snapshots[item.id];
      const buyNow = snapshot?.buyNowPrice || item.buyNowPrice || 0;
      const reserve = snapshot?.reservePrice || item.reservePrice || 0;
      const endTime = snapshot?.endTime || item.auctionDetails?.endTime || '';
      const endsSoon = Boolean(endTime) && new Date(endTime).getTime() - Date.now() <= 12 * 60 * 60 * 1000;

      if (query) {
        const matchesQuery = [item.title, item.brand, item.category, item.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      if (auctionFilter === 'buy_now' && buyNow <= 0) return false;
      if (auctionFilter === 'reserve' && reserve <= 0) return false;
      if (auctionFilter === 'ending_soon' && !endsSoon) return false;

      return true;
    });
  }, [items, search, snapshots, auctionFilter]);

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const snapshot = snapshots[item.id];
        const buyNow = snapshot?.buyNowPrice || item.buyNowPrice || 0;
        const reserve = snapshot?.reservePrice || item.reservePrice || 0;
        const endTime = snapshot?.endTime || item.auctionDetails?.endTime || '';
        const endsSoon = Boolean(endTime) && new Date(endTime).getTime() - Date.now() <= 12 * 60 * 60 * 1000;
        if (buyNow > 0) acc.buyNow += 1;
        if (reserve > 0) acc.reserve += 1;
        if (endsSoon) acc.endingSoon += 1;
        return acc;
      },
      { buyNow: 0, reserve: 0, endingSoon: 0 }
    );
  }, [items, snapshots]);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#121f36_58%,#172033_100%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-20 sm:px-6 lg:px-10 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-slate-300">Auction floor</p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-7xl">
                Structured bids, reserve-aware closes, and fast winner checkout.
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Auctions now run inside the commerce layer with public bid history, buy-now support, and seller or
                admin controls when a winner times out.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  ['all', 'All lots'],
                  ['buy_now', 'Buy now'],
                  ['reserve', 'Reserve set'],
                  ['ending_soon', 'Ending soon']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAuctionFilter(value as AuctionFilter)}
                    className={chipClass(auctionFilter === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Buy-now ready', `${summary.buyNow} auctions can close instantly without another round.`],
                ['Reserve protected', `${summary.reserve} auctions require a reserve-aware close.`],
                ['Ending soon', `${summary.endingSoon} lots are within the next 12 hours.`]
              ].map(([title, description]) => (
                <div key={title} className="border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">{title}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-100">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-10">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
                Search auctions
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search watches, art, collector drops, luxury gear..."
                className="h-14 w-full border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Live lots</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{items.length}</p>
              </div>
              <div className="border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Showing</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{filtered.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-slate-200 bg-white p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Auction rules</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>Bids stay public on the listing and stale or underbids are blocked server-side.</li>
                <li>Highest valid bids become winner-pending-payment when reserve is met at close.</li>
                <li>Sellers and admins can promote the next bidder if the payment window expires.</li>
              </ul>
            </div>

            <div className="border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Discovery tip</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Use these pages for focused rent and auction discovery, then continue deeper on the item page where
                quoting, bidding, and buy-now actions now live.
              </p>
            </div>
          </aside>

          <div>
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="border border-slate-200 bg-white">
                    <div className="h-72 animate-pulse bg-[linear-gradient(90deg,#e5e7eb_0%,#d1d5db_45%,#e5e7eb_100%)]" />
                    <div className="space-y-4 p-5">
                      <div className="h-3 w-24 animate-pulse bg-slate-200" />
                      <div className="h-8 w-3/4 animate-pulse bg-slate-300" />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-20 animate-pulse bg-slate-100" />
                        <div className="h-20 animate-pulse bg-slate-100" />
                        <div className="h-20 animate-pulse bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">No matches</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  No live auctions match the current search.
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  Try another keyword or move into the broader browse experience.
                </p>
                <Link
                  to="/browse?listingType=auction"
                  className="mt-6 inline-flex border border-slate-950 bg-slate-950 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Browse auctions
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item, index) => {
                  const heroImage = item.imageUrls[0] || item.images[0] || '/icons/urbanprime.svg';
                  const snapshot = snapshots[item.id];
                  const currentBid =
                    snapshot?.currentBid ||
                    item.auctionDetails?.currentBid ||
                    item.auctionDetails?.startingBid ||
                    item.price ||
                    0;
                  const bidCount = snapshot?.bidCount || item.auctionDetails?.bidCount || 0;
                  const buyNow = snapshot?.buyNowPrice || item.buyNowPrice || 0;
                  const reserve = snapshot?.reservePrice || item.reservePrice || 0;
                  const endTime = snapshot?.endTime || item.auctionDetails?.endTime || '';

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-400"
                    >
                      <div className="relative overflow-hidden border-b border-slate-200">
                        <img
                          src={heroImage}
                          alt={item.title}
                          className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <span className="bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                            Auction
                          </span>
                          {buyNow > 0 ? (
                            <span className="border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-800">
                              Buy now
                            </span>
                          ) : null}
                        </div>
                        <div className="absolute bottom-4 left-4 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-950">
                          {countdownLabel(endTime)}
                        </div>
                      </div>

                      <div className="p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                          {item.brand || item.category}
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
                          {item.title}
                        </h2>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Current</p>
                            <p className="mt-2 text-base font-black text-slate-950">{formatMoney(currentBid)}</p>
                          </div>
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Reserve</p>
                            <p className="mt-2 text-base font-black text-slate-950">
                              {reserve > 0 ? formatMoney(reserve) : 'None'}
                            </p>
                          </div>
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Bids</p>
                            <p className="mt-2 text-base font-black text-slate-950">{bidCount}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                            {snapshot?.reserveMet ? 'Reserve met' : reserve > 0 ? 'Reserve active' : 'Highest bid wins'}
                          </div>
                          <Link
                            to={`/auctions/${item.id}`}
                            className="inline-flex border border-slate-950 bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white"
                          >
                            View auction
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuctionsPage;
