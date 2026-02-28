import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useTheme } from '../hooks/useTheme';
import { itemService, userService } from '../services/itemService';
import type { Item, PersonaType, User } from '../types';
import Spinner from './Spinner';

type MobileTabId = 'home' | 'explore' | 'search' | 'pixe';

interface MobileQuickLink {
  id: string;
  label: string;
  to?: string;
  onClick?: () => void;
}

interface MobileCreateAction {
  id: string;
  label: string;
  description: string;
  to: string;
}

interface MobileSearchEntry {
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

const MOBILE_SEARCH_LINKS: MobileSearchEntry[] = [
  { id: 'search-browse', title: 'Browse products', subtitle: 'Marketplace item discovery', to: '/browse' },
  { id: 'search-services', title: 'Browse services', subtitle: 'Provider and freelance services', to: '/browse/services' },
  { id: 'search-explore', title: 'Explore hub', subtitle: 'Full Urban Prime discovery map', to: '/explore' },
  { id: 'search-pixe', title: 'Pixe feed', subtitle: 'Short content and creator feed', to: '/pixe' },
  { id: 'search-reels', title: 'Reels', subtitle: 'Vertical media discovery', to: '/reels' },
  { id: 'search-messages', title: 'Messages', subtitle: 'Open your inbox', to: '/profile/messages' },
  { id: 'search-stores', title: 'Stores', subtitle: 'Find public stores and brands', to: '/stores' },
  { id: 'search-features', title: 'Features', subtitle: 'Platform feature catalog', to: '/features' }
];

const HomeGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <img
    src={active ? '/images/mobile-nav/home-active.png' : '/images/mobile-nav/home-inactive.png'}
    alt="Home"
    className="h-[22px] w-[22px] object-contain"
    draggable={false}
  />
);

const ExploreGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-5 w-5 ${active ? 'text-primary' : 'text-text-secondary'}`}
  >
    <circle cx="12" cy="12" r="8.5" />
    <path d="m14.7 9.3-2.7 5.4-2.7 1.2 1.2-2.7 5.4-2.7Z" />
  </svg>
);

const SearchGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-5 w-5 ${active ? 'text-primary' : 'text-text-secondary'}`}
  >
    <circle cx="11" cy="11" r="7.5" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

const PixeGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <img
    src="/icons/pixe.svg"
    alt="Pixe"
    className={`h-[22px] w-[22px] object-contain ${active ? 'opacity-100' : 'opacity-60'}`}
    draggable={false}
  />
);

const PlusGlyph: React.FC<{ open: boolean }> = ({ open }) => (
  <motion.svg
    animate={{ rotate: open ? 45 : 0 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 text-white"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </motion.svg>
);

const CartGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="18" cy="20" r="1.2" />
    <path d="M3 4h2l2.4 10h10.9L21 7H7.3" />
  </svg>
);

const UserGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c1.8-3 4.2-4.4 7-4.4S17.2 17 19 20" />
  </svg>
);

const resolvePersonaType = (activeType: PersonaType | undefined, allTypes: Set<PersonaType>): PersonaType => {
  if (activeType) return activeType;
  if (allTypes.has('seller')) return 'seller';
  if (allTypes.has('provider')) return 'provider';
  if (allTypes.has('affiliate')) return 'affiliate';
  return 'consumer';
};

const MobileAppChrome: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, personas, activePersona, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const { resolvedTheme } = useTheme();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchItemResults, setSearchItemResults] = useState<Item[]>([]);
  const [searchUserResults, setSearchUserResults] = useState<User[]>([]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const hasSearchQuery = Boolean(searchParams.get('q'));

  const activeTab = useMemo<MobileTabId>(() => {
    if (location.pathname === '/') return 'home';
    if (location.pathname.startsWith('/explore')) return 'explore';
    if (location.pathname.startsWith('/pixe') || location.pathname.startsWith('/reels')) return 'pixe';
    if (location.pathname.startsWith('/browse') && hasSearchQuery) return 'search';
    if (location.pathname.startsWith('/browse')) return 'explore';
    return 'home';
  }, [location.pathname, hasSearchQuery]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const quickSearchLinks = useMemo(() => {
    if (!normalizedSearch) return MOBILE_SEARCH_LINKS.slice(0, 6);
    return MOBILE_SEARCH_LINKS
      .filter((entry) => `${entry.title} ${entry.subtitle}`.toLowerCase().includes(normalizedSearch))
      .slice(0, 6);
  }, [normalizedSearch]);

  const isDarkChrome = useMemo(() => ['obsidian', 'noir', 'hydra'].includes(resolvedTheme), [resolvedTheme]);

  const personaTypes = useMemo(() => {
    const types = new Set<PersonaType>();
    personas.forEach((persona) => types.add(persona.type));
    if (activePersona?.type) types.add(activePersona.type);
    return types;
  }, [personas, activePersona?.type]);

  const personaType = useMemo(
    () => resolvePersonaType(activePersona?.type, personaTypes),
    [activePersona?.type, personaTypes]
  );

  const createActions = useMemo<MobileCreateAction[]>(() => {
    const actions: MobileCreateAction[] = [];
    if (personaTypes.has('seller')) {
      actions.push({
        id: 'list-product',
        label: 'List product',
        description: 'Create a new product listing.',
        to: '/profile/products/new'
      });
    }
    if (personaTypes.has('provider')) {
      actions.push({
        id: 'list-service',
        label: 'List service',
        description: 'Publish a new service offer.',
        to: '/profile/services/new'
      });
    }
    actions.push({
      id: 'upload-pixe',
      label: 'Upload pixe',
      description: 'Share a short post or reel.',
      to: '/profile/add-post'
    });
    return actions;
  }, [personaTypes]);

  const profileLinks = useMemo<MobileQuickLink[]>(() => {
    const common: MobileQuickLink[] = [
      { id: 'profile', label: 'Profile', to: user ? `/user/${user.id}` : '/auth' },
      { id: 'messages', label: 'Messages', to: '/profile/messages' }
    ];

    const byPersona: Record<PersonaType, MobileQuickLink[]> = {
      consumer: [
        { id: 'orders', label: 'Your orders', to: '/profile/orders' },
        { id: 'wishlist', label: 'Wishlist', to: '/profile/wishlist' }
      ],
      seller: [
        { id: 'store', label: 'Store', to: '/profile/store' },
        { id: 'products', label: 'Products', to: '/profile/products' },
        { id: 'sales', label: 'Sales', to: '/profile/sales' }
      ],
      provider: [
        { id: 'provider-dashboard', label: 'Provider dashboard', to: '/profile/provider-dashboard' },
        { id: 'services-new', label: 'List service', to: '/profile/services/new' },
        { id: 'workflow-hub', label: 'Workflow hub', to: '/profile/workflows' }
      ],
      affiliate: [
        { id: 'affiliate-center', label: 'Affiliate center', to: '/profile/affiliate' },
        { id: 'promotions', label: 'Promotions', to: '/profile/promotions' }
      ]
    };

    return [
      ...common,
      ...byPersona[personaType],
      { id: 'settings', label: 'Settings', to: '/profile/settings' },
      {
        id: 'logout',
        label: 'Log out',
        onClick: () => {
          logout();
        }
      }
    ];
  }, [logout, personaType, user]);

  useEffect(() => {
    setIsCreateOpen(false);
    setIsProfileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = setTimeout(() => searchInputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) return;
    setSearchQuery('');
    setSearchItemResults([]);
    setSearchUserResults([]);
    setIsSearching(false);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    if (normalizedSearch.length < 2) {
      setIsSearching(false);
      setSearchItemResults([]);
      setSearchUserResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [itemsPayload, usersPayload] = await Promise.all([
          itemService.getItems({ search: searchQuery.trim() }, { page: 1, limit: 6 }).catch(() => ({ items: [], total: 0 })),
          userService.searchUsers(searchQuery.trim(), {
            excludeUserId: user?.id,
            limit: 6
          }).catch(() => [])
        ]);

        if (!cancelled) {
          setSearchItemResults(itemsPayload.items || []);
          setSearchUserResults(usersPayload || []);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSearchOpen, normalizedSearch, searchQuery, user?.id]);

  const handleNavigate = (to: string) => {
    if (!isAuthenticated && to.startsWith('/profile')) {
      navigate('/auth', { state: { from: { pathname: to } } });
      return;
    }
    navigate(to);
  };

  const handleCreateAction = (to: string) => {
    setIsCreateOpen(false);
    handleNavigate(to);
  };

  const handleProfileLink = (link: MobileQuickLink) => {
    setIsProfileMenuOpen(false);
    if (link.onClick) {
      link.onClick();
      return;
    }
    if (link.to) {
      handleNavigate(link.to);
    }
  };

  const openSearchEntry = (to: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (!isAuthenticated && to.startsWith('/profile')) {
      navigate('/auth', { state: { from: { pathname: to } } });
      return;
    }
    navigate(to);
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setIsSearchOpen(false);
    if (!query) {
      navigate('/browse');
      return;
    }
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  const handleDropdownAutoScroll = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = profileMenuRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const threshold = 54;
    const step = 20;
    const topGap = event.clientY - bounds.top;
    const bottomGap = bounds.bottom - event.clientY;

    if (topGap < threshold) {
      const ratio = (threshold - Math.max(topGap, 0)) / threshold;
      container.scrollTop -= Math.ceil(step * ratio);
    } else if (bottomGap < threshold) {
      const ratio = (threshold - Math.max(bottomGap, 0)) / threshold;
      container.scrollTop += Math.ceil(step * ratio);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
        <div className={`ml-auto flex w-max items-center gap-2 rounded-full border px-2 py-1.5 backdrop-blur-xl shadow-lg ${isDarkChrome ? 'border-white/20 bg-slate-950/70 text-white shadow-black/40' : 'border-black/10 bg-white/88 text-text-primary shadow-slate-900/10'}`}>
          <button
            type="button"
            onClick={() => handleNavigate('/cart')}
            className={`relative rounded-full p-2 transition ${isDarkChrome ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            aria-label="Cart"
          >
            <CartGlyph />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
            if (!isAuthenticated) {
              navigate('/auth');
              return;
            }
            setIsProfileMenuOpen((current) => !current);
          }}
            className={`rounded-full p-0.5 transition ${isDarkChrome ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            aria-label="Profile"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name || 'Profile'} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isDarkChrome ? 'bg-white/10' : 'bg-black/5'}`}>
                <UserGlyph />
              </span>
            )}
          </button>
        </div>
        <AnimatePresence>
          {isProfileMenuOpen && isAuthenticated ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="ml-auto mt-2 w-[240px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            >
              <div className="border-b border-border px-3 py-3">
                <p className="truncate text-sm font-semibold text-text-primary">{user?.name || 'Urban Prime user'}</p>
                <p className="truncate text-xs text-text-secondary">{activePersona?.type || personaType}</p>
              </div>
              <div
                ref={profileMenuRef}
                onMouseMove={handleDropdownAutoScroll}
                className="max-h-[52vh] overflow-y-auto"
              >
                {profileLinks.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleProfileLink(link)}
                    className="block w-full border-b border-border/70 px-3 py-2.5 text-left text-sm text-text-secondary transition hover:bg-surface-soft hover:text-text-primary last:border-0"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isSearchOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/45 px-4 pt-20 backdrop-blur-sm md:hidden"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.form
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 14, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={submitSearch}
              onClick={(event) => event.stopPropagation()}
              className={`rounded-2xl border p-4 shadow-2xl ${isDarkChrome ? 'border-white/15 bg-slate-950/88' : 'border-border bg-surface'}`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Search marketplace</p>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Find products, services, users, pages..."
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary ${isDarkChrome ? 'border-white/15 bg-slate-900/75 text-white' : 'border-border bg-surface-soft text-text-primary'}`}
              />

              <div className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {normalizedSearch.length < 2 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Quick links</p>
                    {quickSearchLinks.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => openSearchEntry(entry.to)}
                        className={`block w-full rounded-lg border px-3 py-2 text-left transition ${isDarkChrome ? 'border-white/12 bg-slate-900/60 hover:border-primary/40' : 'border-border bg-surface-soft hover:border-primary/40'}`}
                      >
                        <p className="text-sm font-semibold text-text-primary">{entry.title}</p>
                        <p className="text-xs text-text-secondary">{entry.subtitle}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {isSearching ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-text-secondary">
                        <Spinner size="sm" />
                        <span>Searching...</span>
                      </div>
                    ) : null}

                    {searchItemResults.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Products</p>
                        {searchItemResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openSearchEntry(`/item/${item.id}`)}
                            className={`block w-full rounded-lg border px-3 py-2 text-left transition ${isDarkChrome ? 'border-white/12 bg-slate-900/60 hover:border-primary/40' : 'border-border bg-surface-soft hover:border-primary/40'}`}
                          >
                            <p className="truncate text-sm font-semibold text-text-primary">{item.title}</p>
                            <p className="truncate text-xs text-text-secondary">{item.category || 'Product listing'}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {searchUserResults.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Users</p>
                        {searchUserResults.map((resultUser) => (
                          <button
                            key={resultUser.id}
                            type="button"
                            onClick={() => openSearchEntry(`/user/${resultUser.id}`)}
                            className={`block w-full rounded-lg border px-3 py-2 text-left transition ${isDarkChrome ? 'border-white/12 bg-slate-900/60 hover:border-primary/40' : 'border-border bg-surface-soft hover:border-primary/40'}`}
                          >
                            <p className="truncate text-sm font-semibold text-text-primary">{resultUser.name || 'User'}</p>
                            <p className="truncate text-xs text-text-secondary">{resultUser.email || 'Marketplace profile'}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {quickSearchLinks.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Pages and features</p>
                        {quickSearchLinks.slice(0, 4).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => openSearchEntry(entry.to)}
                            className={`block w-full rounded-lg border px-3 py-2 text-left transition ${isDarkChrome ? 'border-white/12 bg-slate-900/60 hover:border-primary/40' : 'border-border bg-surface-soft hover:border-primary/40'}`}
                          >
                            <p className="truncate text-sm font-semibold text-text-primary">{entry.title}</p>
                            <p className="truncate text-xs text-text-secondary">{entry.subtitle}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {!isSearching && searchItemResults.length === 0 && searchUserResults.length === 0 && quickSearchLinks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-surface-soft px-3 py-3 text-sm text-text-secondary">
                        No quick results found. Press Search to open full browse results.
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${isDarkChrome ? 'border-white/15 text-slate-200' : 'border-border text-text-secondary'}`}
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
                  Search
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden">
        <div className={`pointer-events-none absolute inset-x-6 bottom-0 h-16 rounded-t-[1.6rem] bg-gradient-to-t blur-xl ${isDarkChrome ? 'from-slate-950/88 via-slate-950/45 to-transparent' : 'from-white/90 via-white/45 to-transparent'}`} />
        <div className={`relative mx-auto max-w-[560px] rounded-[1.15rem] border px-2 py-2.5 backdrop-blur-xl ${isDarkChrome ? 'border-white/18 bg-slate-950/82 shadow-[0_20px_36px_-18px_rgba(0,0,0,0.75)]' : 'border-black/10 bg-white/92 shadow-[0_16px_32px_-20px_rgba(15,23,42,0.55)]'}`}>
          <div className={`pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[1.15rem] bg-gradient-to-r ${isDarkChrome ? 'from-slate-950 via-slate-950/58 to-transparent' : 'from-white via-white/55 to-transparent'}`} />
          <div className={`pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[1.15rem] bg-gradient-to-l ${isDarkChrome ? 'from-slate-950 via-slate-950/58 to-transparent' : 'from-white via-white/55 to-transparent'}`} />
          <div className={`pointer-events-none absolute inset-x-8 -bottom-4 h-5 bg-gradient-to-b blur-sm ${isDarkChrome ? 'from-slate-900/70 to-transparent' : 'from-white/75 to-transparent'}`} />
          <div className="relative grid grid-cols-5 items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold ${activeTab === 'home' ? (isDarkChrome ? 'bg-white/10' : 'bg-primary/10') : (isDarkChrome ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
              aria-label="Home"
            >
              <HomeGlyph active={activeTab === 'home'} />
              <span className={activeTab === 'home' ? 'text-primary' : (isDarkChrome ? 'text-slate-300' : 'text-slate-500')}>Home</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/explore')}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold ${activeTab === 'explore' ? (isDarkChrome ? 'bg-white/10' : 'bg-primary/10') : (isDarkChrome ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
              aria-label="Explore"
            >
              <ExploreGlyph active={activeTab === 'explore'} />
              <span className={activeTab === 'explore' ? 'text-primary' : (isDarkChrome ? 'text-slate-300' : 'text-slate-500')}>Explore</span>
            </button>

            <div className="relative flex justify-center">
              <button
                type="button"
                onClick={() => setIsCreateOpen((current) => !current)}
                className="relative -mt-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/70 bg-gradient-to-b from-primary to-teal-500 shadow-[0_12px_24px_-12px_rgba(15,185,177,0.8)]"
                aria-label="Create"
              >
                <PlusGlyph open={isCreateOpen} />
              </button>
              <AnimatePresence>
                {isCreateOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-14 left-1/2 w-[220px] -translate-x-1/2 rounded-2xl border border-border bg-surface p-2 shadow-2xl"
                  >
                    {createActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleCreateAction(action.to)}
                        className="mb-1 w-full rounded-xl px-3 py-2 text-left transition hover:bg-surface-soft last:mb-0"
                      >
                        <p className="text-sm font-semibold text-text-primary">{action.label}</p>
                        <p className="text-[11px] text-text-secondary">{action.description}</p>
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold ${activeTab === 'search' ? (isDarkChrome ? 'bg-white/10' : 'bg-primary/10') : (isDarkChrome ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
              aria-label="Search"
            >
              <SearchGlyph active={activeTab === 'search'} />
              <span className={activeTab === 'search' ? 'text-primary' : (isDarkChrome ? 'text-slate-300' : 'text-slate-500')}>Search</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/pixe')}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold ${activeTab === 'pixe' ? (isDarkChrome ? 'bg-white/10' : 'bg-primary/10') : (isDarkChrome ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
              aria-label="Pixe"
            >
              <PixeGlyph active={activeTab === 'pixe'} />
              <span className={activeTab === 'pixe' ? 'text-primary' : (isDarkChrome ? 'text-slate-300' : 'text-slate-500')}>Pixe</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileAppChrome;
