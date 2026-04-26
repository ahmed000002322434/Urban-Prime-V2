import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';

const formatMoney = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0);

type FulfillmentFilter = 'all' | 'pickup' | 'shipping' | 'hybrid';

const filterChipClass = (active: boolean) =>
  `rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition ${
    active
      ? 'border-slate-950 bg-slate-950 text-white'
      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500 hover:text-slate-950'
  }`;

const RentalsPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('all');
  const [instantOnly, setInstantOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await itemService.getItems(
          { listingType: 'rent', status: 'published' },
          { page: 1, limit: 24 }
        );
        if (!cancelled) setItems(result.items);
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
      if (query) {
        const matchesQuery = [item.title, item.brand, item.category, item.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      const fulfillment = item.rentalFulfillment || {};
      const pickup = Boolean(fulfillment.pickup);
      const shipping = Boolean(fulfillment.shipping);

      if (fulfillmentFilter === 'pickup' && !(pickup && !shipping)) return false;
      if (fulfillmentFilter === 'shipping' && !shipping) return false;
      if (fulfillmentFilter === 'hybrid' && !(pickup && shipping)) return false;
      if (instantOnly && !item.isInstantBook) return false;

      return true;
    });
  }, [items, search, fulfillmentFilter, instantOnly]);

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const fulfillment = item.rentalFulfillment || {};
        const pickup = Boolean(fulfillment.pickup);
        const shipping = Boolean(fulfillment.shipping);
        if (pickup && shipping) acc.hybrid += 1;
        else if (pickup) acc.pickup += 1;
        else if (shipping) acc.shipping += 1;
        if (item.isInstantBook) acc.instant += 1;
        return acc;
      },
      { pickup: 0, shipping: 0, hybrid: 0, instant: 0 }
    );
  }, [items]);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#f5f7fa_0%,#eef2f7_58%,#ffffff_100%)]">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.28),transparent_58%)]" />
        <div className="absolute right-0 top-16 hidden h-56 w-56 rounded-full bg-slate-200/60 blur-3xl lg:block" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-20 sm:px-6 lg:px-10 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-slate-500">
                Rentals Marketplace
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-7xl">
                Pickup and shipping rentals without broken availability or fuzzy deposit rules.
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                This launch path is built around canonical availability checks, handoff clarity, and a Pakistan-first
                operating model. Rentals stay inside the commerce workflow from quote through return.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Instant book ready', `${summary.instant} listings can confirm immediately when enabled.`],
                ['Pickup + shipping', `${summary.hybrid} listings support both handoff modes.`],
                ['Manual blackouts', 'Calendar holds and maintenance windows are enforced server-side.'],
                ['Deposit visibility', 'Each card shows the held amount before checkout.']
              ].map(([title, description]) => (
                <div key={title} className="border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{title}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-10">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
                Search rentals
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cameras, decor, fashion, event gear..."
                className="h-14 w-full border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <div className="border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Live listings</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{items.length}</p>
              </div>
              <div className="border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Showing</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{filtered.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Handoff type</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ['all', 'All'],
                  ['pickup', 'Pickup'],
                  ['shipping', 'Shipping'],
                  ['hybrid', 'Hybrid']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFulfillmentFilter(value as FulfillmentFilter)}
                    className={filterChipClass(fulfillmentFilter === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="mt-6 flex cursor-pointer items-center justify-between border-t border-slate-200 pt-5">
                <span>
                  <span className="block text-sm font-black text-slate-950">Instant book only</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    Limit the page to rentals that can skip seller confirmation.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={instantOnly}
                  onChange={(event) => setInstantOnly(event.target.checked)}
                  className="h-5 w-5 accent-slate-950"
                />
              </label>
            </div>

            <div className="border border-slate-200 bg-white p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Launch rules</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>Server-side overlap checks run again when the rental is booked.</li>
                <li>Pickup and shipping are chosen before quote and reflected in the booking record.</li>
                <li>Deposits remain visible through return, release, or claim actions.</li>
              </ul>
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 animate-pulse bg-slate-100" />
                        <div className="h-20 animate-pulse bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="border border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">No matches</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  No rentals match the current filters.
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  Clear the filters or open the broader marketplace to keep exploring.
                </p>
                <Link
                  to="/browse?listingType=rent"
                  className="mt-6 inline-flex border border-slate-950 bg-slate-950 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Open browse view
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item, index) => {
                  const heroImage = item.imageUrls[0] || item.images[0] || '/icons/urbanprime.svg';
                  const dailyRate = item.rentalRates?.daily || item.rentalPrice || item.price || 0;
                  const deposit = item.securityDeposit || 0;
                  const fulfillment = item.rentalFulfillment || {};
                  const fulfillmentLabel =
                    fulfillment.pickup && fulfillment.shipping
                      ? 'Pickup + Shipping'
                      : fulfillment.pickup
                        ? 'Pickup'
                        : 'Shipping';

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
                            Rent
                          </span>
                          {item.isInstantBook ? (
                            <span className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800">
                              Instant book
                            </span>
                          ) : null}
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

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">From</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(dailyRate)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Per day</p>
                          </div>
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Deposit</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(deposit)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{fulfillmentLabel}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                            {item.stock > 0 ? `${item.stock} listed` : 'On request'}
                          </div>
                          <Link
                            to={`/item/${item.id}`}
                            className="inline-flex border border-slate-950 bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white"
                          >
                            Check availability
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

export default RentalsPage;
