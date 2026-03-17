import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useTheme } from '../hooks/useTheme';
import { itemService, userService } from '../services/itemService';
import brandService from '../services/brandService';
import type { Brand, Item, PersonaType, User } from '../types';
import Spinner from './Spinner';
import { cx } from './dashboard/clay/classNames';

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
  const [searchBrandResults, setSearchBrandResults] = useState<Brand[]>([]);

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
    setSearchBrandResults([]);
    setIsSearching(false);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    if (normalizedSearch.length < 2) {
      setIsSearching(false);
      setSearchItemResults([]);
      setSearchUserResults([]);
      setSearchBrandResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [itemsPayload, usersPayload, brandsPayload] = await Promise.all([
          itemService.getItems({ search: searchQuery.trim() }, { page: 1, limit: 6 }).catch(() => ({ items: [], total: 0 })),
          userService.searchUsers(searchQuery.trim(), {
            excludeUserId: user?.id,
            limit: 6
          }).catch(() => []),
          brandService.getBrands({
            search: searchQuery.trim(),
            sort: 'followers',
            limit: 6,
            offset: 0,
            status: 'active'
          }).catch(() => ({ data: [] as Brand[], count: 0 }))
        ]);

        if (!cancelled) {
          setSearchItemResults(itemsPayload.items || []);
          setSearchUserResults(usersPayload || []);
          setSearchBrandResults(brandsPayload.data || []);
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
      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl md:hidden"
            onClick={() => setIsSearchOpen(false)}
          >
            <div className="px-4 pt-20" onClick={(e) => e.stopPropagation()}>
              <motion.form
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onSubmit={submitSearch}
                className="glass-panel p-4 shadow-2xl border-white/20"
              >
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10 focus-within:ring-2 ring-primary/50 transition-all">
                  <SearchGlyph active={true} />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search anything..."
                    className="bg-transparent text-white outline-none w-full text-sm font-medium placeholder:text-white/40"
                  />
                </div>

                <div className="mt-4 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-4">
                  {normalizedSearch.length < 2 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {MOBILE_SEARCH_LINKS.map((link) => (
                        <button
                          key={link.id}
                          onClick={() => openSearchEntry(link.to)}
                          className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left"
                        >
                          <p className="text-xs font-bold text-white truncate">{link.title}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isSearching && <div className="flex items-center gap-2 text-white/60 text-xs"><Spinner size="sm" /> Searching...</div>}
                      {searchItemResults.map(item => (
                        <button key={item.id} onClick={() => openSearchEntry(`/item/${item.id}`)} className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-lg transition-all">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                            <img src={item.imageUrls?.[0]} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-white truncate">{item.title}</p>
                            <p className="text-[10px] text-white/50">{item.category}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] flex h-[76px] items-center justify-around border-t border-white/10 bg-black/80 backdrop-blur-2xl md:hidden px-2 pb-[env(safe-area-inset-bottom)]">
        <button 
          onClick={() => navigate('/')}
          className={cx("flex flex-col items-center gap-1 transition-all", activeTab === 'home' ? "text-primary scale-110" : "text-white/40")}
        >
          <HomeGlyph active={activeTab === 'home'} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
        </button>

        <button 
          onClick={() => navigate('/explore')}
          className={cx("flex flex-col items-center gap-1 transition-all", activeTab === 'explore' ? "text-primary scale-110" : "text-white/40")}
        >
          <ExploreGlyph active={activeTab === 'explore'} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Explore</span>
        </button>

        <div className="relative -mt-8">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-secondary p-4 shadow-lg shadow-primary/30 border-2 border-white/20"
          >
            <PlusGlyph open={isCreateOpen} />
          </motion.button>
          
          <AnimatePresence>
            {isCreateOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48 glass-panel p-2 shadow-2xl border-white/20"
              >
                {createActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleCreateAction(action.to)}
                    className="w-full p-3 rounded-xl hover:bg-white/10 text-left transition-all"
                  >
                    <p className="text-xs font-black text-white">{action.label}</p>
                    <p className="text-[9px] text-white/50">{action.description}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setIsSearchOpen(true)}
          className={cx("flex flex-col items-center gap-1 transition-all", isSearchOpen ? "text-primary scale-110" : "text-white/40")}
        >
          <SearchGlyph active={isSearchOpen} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Search</span>
        </button>

        <button 
          onClick={() => {
            if (!isAuthenticated) navigate('/auth');
            else setIsProfileMenuOpen(!isProfileMenuOpen);
          }}
          className={cx("flex flex-col items-center gap-1 transition-all", isProfileMenuOpen ? "text-primary scale-110" : "text-white/40")}
        >
          <div className={cx(
            "h-7 w-7 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-sm transition-all",
            isProfileMenuOpen && "ring-2 ring-primary ring-offset-2 ring-offset-black"
          )}>
            <div className="h-full w-full rounded-full bg-black overflow-hidden flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" />
              ) : (
                <UserGlyph />
              )}
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Profile</span>
        </button>
      </div>

      {/* Profile Menu Overlay */}
      <AnimatePresence>
        {isProfileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl md:hidden"
            onClick={() => setIsProfileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 inset-x-0 glass-panel !rounded-t-3xl !rounded-b-none border-t border-white/20 p-6 pt-2 shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-4" />
              <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5">
                  <img src={user?.avatar} className="w-full h-full rounded-full object-cover border-2 border-black" />
                </div>
                <div>
                  <p className="text-lg font-black text-white">{user?.name}</p>
                  <p className="text-xs text-white/50 uppercase font-bold tracking-widest">{personaType} Workspace</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {profileLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => handleProfileLink(link)}
                    className={cx(
                      "p-4 rounded-2xl border transition-all text-left group",
                      link.id === 'logout' ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <p className={cx("text-sm font-black transition-all", link.id === 'logout' ? "text-red-500" : "text-white group-hover:text-primary")}>{link.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileAppChrome;
