import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import digitalMarketplaceService from '../../services/digitalMarketplaceService';
import type { GameDiscoveryCard, GameDiscoveryPayload, GameDiscoveryShelf } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';

const currency = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const cardShell =
  'group overflow-hidden rounded-[28px] border border-white/10 bg-[#121a2d] text-white shadow-[0_18px_48px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-white/20';

const compactCard = (game: GameDiscoveryCard) => (
  <Link key={game.id} to={`/item/${game.id}`} className={cardShell}>
    <div className="aspect-[16/10] overflow-hidden bg-[#151d30]">
      <img src={game.coverImageUrl} alt={game.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
    </div>
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
          {game.genres[0] || 'Featured'}
        </span>
        <span className="text-sm font-black text-[#ffb37d]">{currency(game.price)}</span>
      </div>
      <div>
        <h3 className="text-xl font-black tracking-[-0.03em]">{game.title}</h3>
        <p className="mt-2 text-sm text-white/58">{game.tagline || game.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {game.platforms.slice(0, 3).map((platform) => (
          <span key={platform} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/65">
            {platform}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-white/46">
        <span>{game.creatorName}</span>
        <span>{game.purchases} purchases</span>
      </div>
    </div>
  </Link>
);

const Shelf: React.FC<{ shelf: GameDiscoveryShelf | { title: string; items: GameDiscoveryCard[] } }> = ({ shelf }) => {
  if (!shelf.items.length) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/38">Curated shelf</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-white">{shelf.title}</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shelf.items.map((game) => compactCard(game))}
      </div>
    </section>
  );
};

const GamesHubPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [payload, setPayload] = useState<GameDiscoveryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await digitalMarketplaceService.getGameDiscovery();
        if (!cancelled) setPayload(response);
      } catch (error) {
        console.error('Games discovery load failed:', error);
        if (!cancelled) showNotification('Unable to load game discovery right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  const allGames = useMemo(() => {
    if (!payload) return [];
    const map = new Map<string, GameDiscoveryCard>();
    [payload.hero, ...payload.featured, ...payload.newReleases, ...payload.topSellers, ...payload.genreShelves.flatMap((shelf) => shelf.items)]
      .filter(Boolean)
      .forEach((game) => {
        if (game) map.set(game.id, game);
      });
    return Array.from(map.values());
  }, [payload]);

  const genreOptions = useMemo(() => {
    const collected = new Set<string>(['All']);
    allGames.forEach((game) => game.genres.forEach((genre) => collected.add(genre)));
    return Array.from(collected).slice(0, 10);
  }, [allGames]);

  const filteredGames = useMemo(() => {
    return allGames.filter((game) => {
      const matchesSearch =
        !search.trim() ||
        game.title.toLowerCase().includes(search.toLowerCase()) ||
        game.description.toLowerCase().includes(search.toLowerCase()) ||
        game.creatorName.toLowerCase().includes(search.toLowerCase());
      const matchesGenre = activeGenre === 'All' || game.genres.includes(activeGenre);
      return matchesSearch && matchesGenre;
    });
  }, [activeGenre, allGames, search]);

  const hero = payload?.hero || null;

  return (
    <div className="min-h-screen bg-[#070d18] text-white">
      <section className="relative overflow-hidden border-b border-white/6">
        <div className="absolute inset-0">
          {hero?.heroImageUrl ? (
            <img src={hero.heroImageUrl} alt={hero.title} className="h-full w-full object-cover opacity-35" />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,107,44,0.24),_transparent_30%),linear-gradient(180deg,rgba(5,9,18,0.2),rgba(7,13,24,0.95)_72%,#070d18_100%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-white/40">Urban Prime Games</p>
              <h1 className="mt-4 text-5xl font-black tracking-[-0.05em] md:text-7xl">
                Discovery built for premium digital releases.
              </h1>
              <p className="mt-6 text-base leading-7 text-white/68 md:text-lg">
                Explore curated game shelves, creator-led launches, and secure ZIP delivery wired directly into the Urban Prime marketplace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/upload-game" className="rounded-full bg-[#ff6b2c] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105">
                  Ship a game build
                </Link>
                <Link to="/profile/game-studio" className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/82 transition hover:border-white/25 hover:text-white">
                  Open studio
                </Link>
              </div>
            </div>

            {hero ? (
              <Link to={`/item/${hero.id}`} className={`${cardShell} overflow-hidden`}>
                <div className="aspect-[16/10] overflow-hidden bg-[#121826]">
                  <img src={hero.coverImageUrl} alt={hero.title} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
                      Featured release
                    </span>
                    <span className="text-sm font-black text-[#ffb37d]">{currency(hero.price)}</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-[-0.04em]">{hero.title}</h2>
                  <p className="text-sm leading-6 text-white/58">{hero.tagline || hero.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {hero.platforms.slice(0, 4).map((platform) => (
                      <span key={platform} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/65">
                        {platform}
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
        <div className="rounded-[28px] border border-white/8 bg-[#0c1322] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles, creators, and launch copy"
                className="w-full rounded-full border border-white/10 bg-[#11192d] px-5 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#ff6b2c] focus:ring-2 focus:ring-[#ff6b2c]/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setActiveGenre(genre)}
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                    activeGenre === genre
                      ? 'border-[#ff6b2c] bg-[#ff6b2c] text-[#10131b]'
                      : 'border-white/12 bg-white/5 text-white/68 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-12 px-4 pb-20 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-20">
            <Spinner size="lg" />
          </div>
        ) : search.trim() || activeGenre !== 'All' ? (
          filteredGames.length ? (
            <Shelf
              shelf={{
                title: `Search results${activeGenre !== 'All' ? ` • ${activeGenre}` : ''}`,
                items: filteredGames
              }}
            />
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center">
              <p className="text-xl font-black text-white">No titles match this search.</p>
              <p className="mt-2 text-sm text-white/55">Try a broader keyword or switch back to another genre shelf.</p>
            </div>
          )
        ) : (
          <>
            <Shelf shelf={{ title: 'Featured launches', items: payload?.featured || [] }} />
            <Shelf shelf={{ title: 'New and notable', items: payload?.newReleases || [] }} />
            <Shelf shelf={{ title: 'Top sellers', items: payload?.topSellers || [] }} />
            {(payload?.genreShelves || []).map((shelf) => (
              <Shelf key={shelf.slug} shelf={shelf} />
            ))}
          </>
        )}

        {!isLoading && !(search.trim() || activeGenre !== 'All') && !payload?.total ? (
          <div className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center">
            <p className="text-xl font-black text-white">No published game builds yet.</p>
            <p className="mt-2 text-sm text-white/55">Upload the first ZIP-backed release to seed discovery.</p>
            <div className="mt-6 flex justify-center">
              <Link to="/upload-game" className="rounded-full bg-[#ff6b2c] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10131b] transition hover:brightness-105">
                Publish a game
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default GamesHubPage;
