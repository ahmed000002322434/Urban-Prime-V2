import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { itemService, serviceService } from '../../services/itemService';

interface ExploreCardItem {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  badge: string;
  accent: string;
}

const contentRows: Array<{ title: string; description: string; cards: ExploreCardItem[] }> = [
  {
    title: 'Marketplace Core',
    description: 'Everything needed to buy, sell, and discover listings.',
    cards: [
      { id: 'browse-products', title: 'Browse Products', subtitle: 'Search products with filters and categories.', to: '/browse', badge: 'Shop', accent: 'from-cyan-500/25 to-sky-500/5' },
      { id: 'browse-services', title: 'Browse Services', subtitle: 'Find service providers and offers.', to: '/browse/services', badge: 'Service', accent: 'from-emerald-500/25 to-teal-500/5' },
      { id: 'deals', title: 'Deals & Promotions', subtitle: 'Discover active campaigns and discounts.', to: '/deals', badge: 'Deals', accent: 'from-amber-500/25 to-orange-500/5' },
      { id: 'new-arrivals', title: 'New Arrivals', subtitle: 'Fresh listings from your marketplace.', to: '/new-arrivals', badge: 'Fresh', accent: 'from-fuchsia-500/25 to-purple-500/5' }
    ]
  },
  {
    title: 'People & Networks',
    description: 'Navigate directories and connect directly.',
    cards: [
      { id: 'sellers', title: 'Seller Directory', subtitle: 'Find active storefront owners.', to: '/sellers', badge: 'Directory', accent: 'from-sky-500/25 to-blue-500/5' },
      { id: 'buyers', title: 'Buyer Directory', subtitle: 'See active shopper profiles.', to: '/buyers', badge: 'Directory', accent: 'from-violet-500/25 to-indigo-500/5' },
      { id: 'renters', title: 'Renter Directory', subtitle: 'People who actively rent items.', to: '/renters', badge: 'Directory', accent: 'from-teal-500/25 to-cyan-500/5' },
      { id: 'stores', title: 'Stores Directory', subtitle: 'Explore every public store.', to: '/stores', badge: 'Stores', accent: 'from-rose-500/25 to-pink-500/5' }
    ]
  },
  {
    title: 'Creator & Pixe',
    description: 'Short content, live streams, and creator workflows.',
    cards: [
      { id: 'pixe', title: 'Pixe Feed', subtitle: 'Watch short-form creator content.', to: '/pixe', badge: 'Pixe', accent: 'from-pink-500/25 to-rose-500/5' },
      { id: 'reels', title: 'Reels', subtitle: 'Swipe vertical media and engage.', to: '/reels', badge: 'Media', accent: 'from-fuchsia-500/25 to-violet-500/5' },
      { id: 'live', title: 'Live Shopping', subtitle: 'Join real-time selling sessions.', to: '/live', badge: 'Live', accent: 'from-red-500/25 to-orange-500/5' },
      { id: 'studio', title: 'Pixe Studio', subtitle: 'Publish and manage creator posts.', to: '/pixe-studio', badge: 'Studio', accent: 'from-indigo-500/25 to-blue-500/5' }
    ]
  }
];

interface ExploreStat {
  label: string;
  value: string;
}

const ExploreHubPage: React.FC = () => {
  const [stats, setStats] = useState<ExploreStat[]>([
    { label: 'Live listings', value: '--' },
    { label: 'Service offers', value: '--' },
    { label: 'Active creators', value: '--' }
  ]);
  const [collapsedRows, setCollapsedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const [itemsPayload, services] = await Promise.all([
          itemService.getItems({}, { page: 1, limit: 2000 }).catch(() => ({ items: [], total: 0 })),
          serviceService.getServices().catch(() => [])
        ]);

        const itemRows = itemsPayload.items || [];
        const serviceRows = services || [];
        const creatorIds = new Set<string>();

        itemRows.forEach((item) => {
          const ownerId = item.owner?.id || '';
          if (ownerId) creatorIds.add(ownerId);
        });

        serviceRows.forEach((service) => {
          const providerId = service.provider?.id || '';
          if (providerId) creatorIds.add(providerId);
        });

        const formatCount = (value: number) => new Intl.NumberFormat().format(Math.max(0, value));

        if (!cancelled) {
          setStats([
            { label: 'Live listings', value: formatCount(itemsPayload.total || itemRows.length) },
            { label: 'Service offers', value: formatCount(serviceRows.length) },
            { label: 'Active creators', value: formatCount(creatorIds.size) }
          ]);
        }
      } catch (error) {
        console.warn('Explore stats fetch failed:', error);
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasLoadedStats = useMemo(() => stats.some((entry) => entry.value !== '--'), [stats]);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-soft sm:p-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-52 w-52 rounded-full bg-sky-500/15 blur-3xl" />

          <p className="inline-flex rounded-full border border-border bg-surface-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
            Explore Urban Prime
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            One place for every workflow
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-text-secondary sm:text-base">
            Jump into products, services, creators, directories, and growth tools from a single discovery screen.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/browse" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110 sm:text-sm">
              Start shopping
            </Link>
            <Link to="/profile/messages" className="rounded-full border border-border bg-surface-soft px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface sm:text-sm">
              Open messages
            </Link>
            <Link to="/profile/activity" className="rounded-full border border-border bg-surface-soft px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface sm:text-sm">
              Dashboard activity
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md">
            {stats.map((entry) => (
              <div key={entry.label} className="rounded-2xl border border-border bg-surface-soft px-3 py-2 text-center">
                <p className={`text-lg font-black ${!hasLoadedStats ? 'animate-pulse text-text-secondary' : ''}`}>{entry.value}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">{entry.label}</p>
              </div>
            ))}
          </div>
        </motion.header>

        <div className="mt-7 space-y-7">
          {contentRows.map((row, rowIndex) => (
            <section key={row.title}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.28, delay: rowIndex * 0.04 }}
                className="mb-3 flex items-start justify-between gap-3"
              >
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{row.title}</h2>
                  <p className="text-sm text-text-secondary">{row.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsedRows((prev) => ({ ...prev, [row.title]: !prev[row.title] }))}
                  className="rounded-full border border-border bg-surface-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary hover:bg-surface"
                >
                  {collapsedRows[row.title] ? 'Expand' : 'Collapse'}
                </button>
              </motion.div>
              <AnimatePresence initial={false}>
                {!collapsedRows[row.title] ? (
                  <motion.div
                    key={`${row.title}-content`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {row.cards.map((card, idx) => (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.2 }}
                          transition={{ duration: 0.25, delay: idx * 0.03 }}
                        >
                          <Link
                            to={card.to}
                            className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/50"
                          >
                            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-80`} />
                            <div className="relative">
                              <span className="inline-flex rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                                {card.badge}
                              </span>
                              <h3 className="mt-3 text-base font-bold text-text-primary">{card.title}</h3>
                              <p className="mt-1 text-sm text-text-secondary">{card.subtitle}</p>
                              <p className="mt-4 text-xs font-semibold text-primary transition group-hover:translate-x-1">Open section &gt;</p>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExploreHubPage;
