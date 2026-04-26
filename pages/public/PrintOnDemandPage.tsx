import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import podMarketplaceService from '../../services/podMarketplaceService';
import type { PodDiscoveryCard, PodDiscoveryPayload, PodDiscoveryShelf } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const DiscoveryShelf: React.FC<{ shelf: PodDiscoveryShelf | { title: string; items: PodDiscoveryCard[] } }> = ({ shelf }) => {
  if (!shelf.items.length) return null;
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.26em] text-white/38">Curated shelf</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{shelf.title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shelf.items.map((card) => (
          <Link key={card.id} to={`/item/${card.id}`} className="pod-discovery-card group">
            <div className="pod-discovery-media">
              <img src={card.coverImageUrl} alt={card.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="pod-badge">{card.templateName}</span>
                <span className="text-sm font-black text-[#ffcf9d]">{money(card.price)}</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-[-0.04em] text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{card.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {card.colors.slice(0, 3).map((color) => (
                  <span key={color} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/68">
                    {color}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-white/46">
                <span>{card.creatorName}</span>
                <span>{card.category}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const PrintOnDemandPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [payload, setPayload] = useState<PodDiscoveryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await podMarketplaceService.getDiscovery();
        if (!cancelled) setPayload(response);
      } catch (error) {
        console.error('POD discovery load failed:', error);
        if (!cancelled) showNotification('Unable to load print-on-demand discovery right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  const cards = useMemo(() => {
    if (!payload) return [];
    const map = new Map<string, PodDiscoveryCard>();
    [payload.hero, ...payload.featured, ...payload.collections.flatMap((entry) => entry.items), ...payload.byCategory.flatMap((entry) => entry.items)]
      .filter(Boolean)
      .forEach((card) => {
        if (card) map.set(card.id, card);
      });
    return Array.from(map.values());
  }, [payload]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>(['All']);
    cards.forEach((card) => values.add(card.category));
    return Array.from(values);
  }, [cards]);

  const visibleCards = useMemo(() => {
    if (activeCategory === 'All') return cards;
    return cards.filter((card) => card.category === activeCategory);
  }, [activeCategory, cards]);

  const hero = payload?.hero || null;

  return (
    <div className="min-h-screen bg-[#060b13] text-white">
      <section className="relative overflow-hidden border-b border-white/6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,36,0.22),_transparent_26%),radial-gradient(circle_at_85%_18%,rgba(255,255,255,0.1),_transparent_20%),linear-gradient(180deg,#08121d_0%,#060b13_76%,#060b13_100%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.34em] text-white/38">Urban Prime POD</p>
              <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] md:text-7xl">
                Editorial merch discovery wired into your marketplace.
              </h1>
              <p className="mt-6 text-base leading-7 text-white/66 md:text-lg">
                Discover print-on-demand apparel, posters, drinkware, and capsule drops from seller studios with fixed
                designs, clean variant selection, and manual fulfillment tracking.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/profile/pod-studio" className="rounded-full bg-[#f6e3c4] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10161f] transition hover:brightness-105">
                  Open POD studio
                </Link>
                <Link to="/browse" className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-white/22 hover:text-white">
                  Browse marketplace
                </Link>
              </div>
            </div>

            {hero ? (
              <Link to={`/item/${hero.id}`} className="pod-discovery-card group overflow-hidden">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={hero.coverImageUrl} alt={hero.title} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="pod-badge">Hero drop</span>
                    <span className="text-lg font-black text-[#ffcf9d]">{money(hero.price)}</span>
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-[-0.05em] text-white">{hero.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/64">{hero.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hero.colors.slice(0, 4).map((color) => (
                      <span key={color} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/68">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-white/8 bg-[#0b121e] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                  activeCategory === category
                    ? 'border-[#f6e3c4] bg-[#f6e3c4] text-[#10161f]'
                    : 'border-white/12 bg-white/5 text-white/68 hover:border-white/22 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-12 px-4 pb-20 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-20">
            <Spinner size="lg" />
          </div>
        ) : activeCategory !== 'All' ? (
          <DiscoveryShelf shelf={{ title: `${activeCategory} drops`, items: visibleCards }} />
        ) : (
          <>
            <DiscoveryShelf shelf={{ title: 'Featured drops', items: payload?.featured || [] }} />
            {(payload?.collections || []).map((shelf) => (
              <DiscoveryShelf key={shelf.slug} shelf={shelf} />
            ))}
            {(payload?.byCategory || []).map((shelf) => (
              <DiscoveryShelf key={shelf.slug} shelf={shelf} />
            ))}
          </>
        )}

        {!isLoading && !payload?.total ? (
          <div className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center">
            <p className="text-xl font-black text-white">No POD products are published yet.</p>
            <p className="mt-2 text-sm text-white/55">Launch the first studio product and this discovery surface will light up automatically.</p>
            <div className="mt-6 flex justify-center">
              <Link to="/profile/pod-studio/new" className="rounded-full bg-[#f6e3c4] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10161f] transition hover:brightness-105">
                Create POD product
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default PrintOnDemandPage;
