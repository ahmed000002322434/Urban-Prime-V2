import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import digitalMarketplaceService from '../../services/digitalMarketplaceService';
import type { DigitalLibraryEntry } from '../../types';
import Spinner from '../../components/Spinner';

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;
const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DigitalLibraryPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<DigitalLibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'games' | 'digital'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const payload = await digitalMarketplaceService.getLibrary();
        if (!cancelled) setEntries(payload);
      } catch (error) {
        console.error('Digital library load failed:', error);
        if (!cancelled) showNotification('Unable to load your digital library right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  const filtered = useMemo(() => {
    if (view === 'all') return entries;
    return entries.filter((entry) => (view === 'games' ? entry.experienceType === 'game' : entry.experienceType === 'digital'));
  }, [entries, view]);

  const handleDownload = async (entry: DigitalLibraryEntry) => {
    setDownloadingId(entry.id);
    try {
      await digitalMarketplaceService.downloadLibraryItem(entry.id, entry.packageFileName || 'download.zip');
      showNotification('Your download has started.');
    } catch (error) {
      console.error('Digital download failed:', error);
      showNotification(error instanceof Error ? error.message : 'Unable to download this package.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(255,107,44,0.25),_transparent_30%),linear-gradient(135deg,#09111f_0%,#11192d_46%,#0b1020_100%)] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.3)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/45">Digital Library</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">Your purchased builds and premium downloads</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 md:text-base">
              Every ZIP package delivered through the marketplace lands here after purchase. Downloads are streamed from private storage and keep the public catalog clean.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/games" className="rounded-full bg-[#ff6b2c] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105">
                Discover more games
              </Link>
              <Link to="/profile/orders" className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/80 transition hover:border-white/25 hover:text-white">
                View orders
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Items</p>
              <p className="mt-2 text-3xl font-black">{entries.length}</p>
              <p className="mt-2 text-xs text-white/56">Ready for secure ZIP delivery from the marketplace backend.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Game builds</p>
              <p className="mt-2 text-3xl font-black">{entries.filter((entry) => entry.experienceType === 'game').length}</p>
              <p className="mt-2 text-xs text-white/56">Browsable installs and playable builds purchased from discovery.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/8 bg-[#0b1220] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.24)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Filter</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Downloads</h2>
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
                    ? 'border-[#ff6b2c] bg-[#ff6b2c] text-[#10131b]'
                    : 'border-white/12 bg-white/5 text-white/68 hover:border-white/25 hover:text-white'
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
        ) : filtered.length ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filtered.map((entry) => (
              <article key={entry.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101726]">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div className="aspect-[4/3] bg-[#151d2d]">
                    <img src={entry.coverImageUrl} alt={entry.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
                            {entry.experienceType === 'game' ? 'Game build' : 'Digital'}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                            entry.scanStatus === 'clean'
                              ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-100'
                              : 'border-amber-500/25 bg-amber-500/12 text-amber-100'
                          }`}>
                            Scan {entry.scanStatus}
                          </span>
                        </div>
                        <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">{entry.title}</h3>
                        <p className="mt-2 text-sm text-white/58">
                          Purchased {new Date(entry.purchasedAt).toLocaleDateString()} • {entry.creatorName}
                        </p>
                      </div>
                      <p className="text-lg font-black text-[#ffb37d]">{formatMoney(entry.pricePaid)}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/38">Package</p>
                        <p className="mt-2 text-sm font-bold">{entry.packageFileName}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/38">Size</p>
                        <p className="mt-2 text-sm font-bold">{formatBytes(entry.packageSizeBytes)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/38">Version</p>
                        <p className="mt-2 text-sm font-bold">{entry.version || 'Current release'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {entry.platforms.slice(0, 4).map((platform) => (
                        <span key={platform} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/65">
                          {platform}
                        </span>
                      ))}
                      {entry.genres.slice(0, 3).map((genre) => (
                        <span key={genre} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/65">
                          {genre}
                        </span>
                      ))}
                    </div>

                    <p className="text-sm text-white/56">{entry.scanSummary || entry.licenseDescription || 'Secure ZIP delivery is ready from your private library.'}</p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleDownload(entry)}
                        disabled={downloadingId === entry.id}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff6b2c] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingId === entry.id ? <Spinner size="sm" /> : null}
                        Download ZIP
                      </button>
                      <Link to={`/profile/orders/${entry.id}`} className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80 transition hover:border-white/25 hover:text-white">
                        Order details
                      </Link>
                      <Link to={`/item/${entry.itemId}`} className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80 transition hover:border-white/25 hover:text-white">
                        Listing page
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center">
            <p className="text-xl font-black text-white">Your digital library is empty.</p>
            <p className="mt-2 text-sm text-white/55">Buy a game build or digital product from the marketplace and it will appear here with private ZIP delivery.</p>
            <div className="mt-6 flex justify-center">
              <Link to="/games" className="rounded-full bg-[#ff6b2c] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105">
                Browse discovery
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default DigitalLibraryPage;
