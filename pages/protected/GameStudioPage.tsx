import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import digitalMarketplaceService from '../../services/digitalMarketplaceService';
import type { DigitalMarketplaceDashboard, DigitalMarketplaceSellerListing } from '../../types';
import Spinner from '../../components/Spinner';

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const filterListing = (
  listing: DigitalMarketplaceSellerListing,
  view: 'all' | 'games' | 'digital'
) => {
  if (view === 'all') return true;
  return view === 'games' ? listing.experienceType === 'game' : listing.experienceType === 'digital';
};

const shellClass =
  'rounded-[30px] border border-[#ecdabf]/12 bg-[linear-gradient(180deg,#0b1220_0%,#09101a_100%)] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:p-6';
const statCardClass =
  'rounded-[24px] border border-[#ecdabf]/10 bg-white/[0.04] p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]';

const GameStudioPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [dashboard, setDashboard] = useState<DigitalMarketplaceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'all' | 'games' | 'digital'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const payload = await digitalMarketplaceService.getSellerDashboard();
        if (!cancelled) setDashboard(payload);
      } catch (error) {
        console.error('Digital studio dashboard failed:', error);
        if (!cancelled) showNotification('Unable to load digital studio right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  const listings = useMemo(
    () => (dashboard?.listings || []).filter((listing) => filterListing(listing, view)),
    [dashboard?.listings, view]
  );

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[36px] border border-[#ecdabf]/12 bg-[linear-gradient(140deg,#070b12_0%,#101826_52%,#0b1018_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(216,163,109,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(143,84,46,0.18),_transparent_20%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e4d1b5]/54">Digital Studio</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#fff8ed] md:text-5xl">
              Manage game builds and premium digital drops
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 md:text-[15px]">
              Package scans, discovery readiness, secure buyer delivery, and listing iteration all run from one surface now.
              Start new uploads, fix draft issues, and track what is actually performing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/upload-game"
                className="rounded-full bg-[linear-gradient(135deg,#d89a61,#ffb572)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105"
              >
                Upload game
              </Link>
              <Link
                to="/profile/products/new-digital"
                className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-[#ecdabf]/24 hover:text-white"
              >
                New digital product
              </Link>
              <Link
                to="/profile/digital-library"
                className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-[#ecdabf]/24 hover:text-white"
              >
                Buyer library
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[28px] border border-[#ecdabf]/12 bg-[#0c1320]/82 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e4d1b5]/42">Publishing health</p>
              <p className="mt-2 text-xl font-black text-[#fff8ed]">
                {dashboard?.summary.published || 0} live / {dashboard?.summary.drafts || 0} draft
              </p>
              <p className="mt-2 text-xs leading-6 text-white/56">
                Warnings push listings back into draft until the ZIP package is safe enough for buyer delivery.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#ecdabf]/12 bg-[#0c1320]/82 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e4d1b5]/42">Revenue footprint</p>
              <p className="mt-2 text-xl font-black text-[#fff8ed]">{formatMoney(dashboard?.summary.revenue || 0)}</p>
              <p className="mt-2 text-xs leading-6 text-white/56">
                {dashboard?.summary.purchases || 0} purchases • {dashboard?.summary.downloads || 0} library downloads
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={statCardClass}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Listings</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#fff8ed]">{dashboard?.summary.totalListings || 0}</p>
        </div>
        <div className={statCardClass}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Game builds</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#fff8ed]">{dashboard?.summary.games || 0}</p>
        </div>
        <div className={statCardClass}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Purchases</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#fff8ed]">{dashboard?.summary.purchases || 0}</p>
        </div>
        <div className={statCardClass}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e4d1b5]/38">Scan warnings</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#fff8ed]">{dashboard?.summary.scanWarnings || 0}</p>
        </div>
      </section>

      <section className={shellClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e4d1b5]/40">Catalog</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">Marketplace listings</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'games', label: 'Games' },
              { id: 'digital', label: 'Digital products' }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id as typeof view)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                  view === option.id
                    ? 'border-[#d8a36d] bg-[#d8a36d] text-[#10131b]'
                    : 'border-[#ecdabf]/12 bg-white/[0.04] text-white/68 hover:border-[#ecdabf]/24 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-20">
            <Spinner size="lg" />
          </div>
        ) : listings.length ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {listings.map((listing) => {
              const editorRoute =
                listing.experienceType === 'game'
                  ? `/upload-game?edit=${encodeURIComponent(listing.id)}`
                  : `/profile/products/new-digital?edit=${encodeURIComponent(listing.id)}`;
              return (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-[28px] border border-[#ecdabf]/10 bg-[linear-gradient(180deg,#0f1724_0%,#0c121c_100%)]"
                >
                  <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                    <div className="aspect-[4/3] bg-[#151d2d]">
                      <img src={listing.coverImageUrl} alt={listing.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
                              {listing.experienceType === 'game' ? 'Game build' : 'Digital'}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                listing.status === 'published'
                                  ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-100'
                                  : 'border-amber-500/25 bg-amber-500/12 text-amber-100'
                              }`}
                            >
                              {listing.status}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                listing.scanStatus === 'clean'
                                  ? 'border-sky-500/25 bg-sky-500/12 text-sky-100'
                                  : 'border-amber-500/25 bg-amber-500/12 text-amber-100'
                              }`}
                            >
                              Scan {listing.scanStatus}
                            </span>
                          </div>
                          <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#fff8ed]">{listing.title}</h3>
                          <p className="mt-2 text-sm text-white/58">
                            {listing.version ? `v${listing.version}` : 'Version pending'} • {listing.creatorName}
                          </p>
                        </div>
                        <p className="text-lg font-black text-[#ffcf9e]">{formatMoney(listing.price)}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[20px] border border-[#ecdabf]/10 bg-white/[0.04] p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e4d1b5]/38">Revenue</p>
                          <p className="mt-2 text-lg font-black text-[#fff8ed]">{formatMoney(listing.grossRevenue)}</p>
                        </div>
                        <div className="rounded-[20px] border border-[#ecdabf]/10 bg-white/[0.04] p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e4d1b5]/38">Purchases</p>
                          <p className="mt-2 text-lg font-black text-[#fff8ed]">{listing.purchases}</p>
                        </div>
                        <div className="rounded-[20px] border border-[#ecdabf]/10 bg-white/[0.04] p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e4d1b5]/38">Downloads</p>
                          <p className="mt-2 text-lg font-black text-[#fff8ed]">{listing.downloads}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {listing.platforms.slice(0, 4).map((platform) => (
                          <span key={platform} className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                            {platform}
                          </span>
                        ))}
                        {listing.genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                            {genre}
                          </span>
                        ))}
                      </div>

                      {listing.scanSummary ? <p className="text-sm text-white/56">{listing.scanSummary}</p> : null}

                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={editorRoute}
                          className="rounded-full bg-[linear-gradient(135deg,#d89a61,#ffb572)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105"
                        >
                          Edit listing
                        </Link>
                        <Link
                          to={`/item/${listing.id}`}
                          className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-[#ecdabf]/24 hover:text-white"
                        >
                          View marketplace page
                        </Link>
                        <Link
                          to="/profile/sales"
                          className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-[#ecdabf]/24 hover:text-white"
                        >
                          Sales queue
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-[#ecdabf]/12 bg-white/[0.04] px-6 py-16 text-center">
            <p className="text-xl font-black text-[#fff8ed]">No listings in this view yet.</p>
            <p className="mt-2 text-sm text-white/55">Create a ZIP-backed game or digital product to populate the studio.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/upload-game"
                className="rounded-full bg-[linear-gradient(135deg,#d89a61,#ffb572)] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105"
              >
                Upload game
              </Link>
              <Link
                to="/profile/products/new-digital"
                className="rounded-full border border-[#ecdabf]/12 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/78 transition hover:border-[#ecdabf]/24 hover:text-white"
              >
                New digital product
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default GameStudioPage;
