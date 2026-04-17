type RouteTarget = string | { pathname?: string | null } | null | undefined;

type RoutePrefetchEntry = {
  cacheKey: (path: string) => string;
  match: (path: string) => boolean;
  loaders: Array<() => Promise<unknown>>;
};

const prefetchedRoutes = new Set<string>();

const routePrefetchEntries: RoutePrefetchEntry[] = [
  {
    cacheKey: () => '/',
    match: (path) => path === '/',
    loaders: [() => import('../pages/public/HomePage')],
  },
  {
    cacheKey: () => '/browse/services',
    match: (path) => path.startsWith('/browse/services'),
    loaders: [() => import('../pages/public/BrowseServicesPage')],
  },
  {
    cacheKey: () => '/browse',
    match: (path) => path === '/browse',
    loaders: [() => import('../pages/public/BrowsePage')],
  },
  {
    cacheKey: () => '/stores',
    match: (path) => path.startsWith('/stores'),
    loaders: [() => import('../pages/public/StoresDirectoryPage')],
  },
  {
    cacheKey: () => '/brands',
    match: (path) => path === '/brands',
    loaders: [() => import('../pages/public/BrandsHubPage')],
  },
  {
    cacheKey: () => '/brands/explore',
    match: (path) => path.startsWith('/brands/explore'),
    loaders: [() => import('../pages/public/ExploreBrandsHubPage')],
  },
  {
    cacheKey: () => '/brands/detail',
    match: (path) => path.startsWith('/brands/') && path !== '/brands/explore',
    loaders: [() => import('../pages/public/BrandDetailPage')],
  },
  {
    cacheKey: () => '/item/detail',
    match: (path) => path.startsWith('/item/'),
    loaders: [() => import('../pages/public/ItemDetailPage')],
  },
  {
    cacheKey: () => '/service/detail',
    match: (path) => path.startsWith('/service/'),
    loaders: [() => import('../pages/public/ServiceDetailPage')],
  },
  {
    cacheKey: () => '/storefront',
    match: (path) => path.startsWith('/s/'),
    loaders: [() => import('../pages/public/StoreFront')],
  },
  {
    cacheKey: () => '/reels',
    match: (path) => path.startsWith('/reels'),
    loaders: [() => import('../pages/public/ReelsPage')],
  },
  {
    cacheKey: () => '/spotlight',
    match: (path) => path.startsWith('/spotlight'),
    loaders: [() => import('../pages/public/PrimeSpotlightPage')],
  },
  {
    cacheKey: () => '/pixe',
    match: (path) => path.startsWith('/pixe'),
    loaders: [() => import('../pages/public/PixePage')],
  },
  {
    cacheKey: () => '/live',
    match: (path) => path.startsWith('/live'),
    loaders: [() => import('../pages/public/LiveShoppingPage')],
  },
  {
    cacheKey: () => '/deals',
    match: (path) => path.startsWith('/deals'),
    loaders: [() => import('../pages/public/DealsPage')],
  },
  {
    cacheKey: () => '/new-arrivals',
    match: (path) => path.startsWith('/new-arrivals'),
    loaders: [() => import('../pages/public/NewArrivalsPage')],
  },
  {
    cacheKey: () => '/messages',
    match: (path) => path === '/messages',
    loaders: [() => import('../pages/protected/MessagesPage')],
  },
  {
    cacheKey: () => '/profile',
    match: (path) => path.startsWith('/profile'),
    loaders: [() => import('../layouts/DashboardLayout')],
  },
  {
    cacheKey: () => '/profile/messages',
    match: (path) => path.startsWith('/profile/messages'),
    loaders: [() => import('../layouts/DashboardLayout'), () => import('../pages/protected/MessagesPage')],
  },
  {
    cacheKey: () => '/cart',
    match: (path) => path.startsWith('/cart'),
    loaders: [() => import('../pages/protected/CartPage')],
  },
  {
    cacheKey: () => '/checkout',
    match: (path) => path.startsWith('/checkout'),
    loaders: [() => import('../pages/protected/CheckoutPage')],
  },
  {
    cacheKey: () => '/auth',
    match: (path) => path === '/auth',
    loaders: [() => import('../pages/auth/LoginPage')],
  },
  {
    cacheKey: () => '/register',
    match: (path) => path === '/register',
    loaders: [() => import('../pages/auth/RegisterPage')],
  },
  {
    cacheKey: () => '/forgot-password',
    match: (path) => path === '/forgot-password',
    loaders: [() => import('../pages/auth/ForgotPasswordPage')],
  },
  {
    cacheKey: () => '/reset-password',
    match: (path) => path === '/reset-password',
    loaders: [() => import('../pages/auth/ResetPasswordPage')],
  },
  {
    cacheKey: () => '/admin-login',
    match: (path) => path === '/admin-login',
    loaders: [() => import('../pages/auth/AdminLoginPage')],
  },
  {
    cacheKey: () => '/about',
    match: (path) => path === '/about',
    loaders: [() => import('../pages/public/AboutPage')],
  },
  {
    cacheKey: () => '/contact',
    match: (path) => path === '/contact',
    loaders: [() => import('../pages/public/ContactPage')],
  },
  {
    cacheKey: () => '/community',
    match: (path) => path === '/community',
    loaders: [() => import('../pages/public/CommunityPage')],
  },
  {
    cacheKey: () => '/events',
    match: (path) => path === '/events',
    loaders: [() => import('../pages/public/EventsPage')],
  },
  {
    cacheKey: () => '/guides',
    match: (path) => path === '/guides',
    loaders: [() => import('../pages/public/GuidesPage')],
  },
  {
    cacheKey: () => '/perks',
    match: (path) => path === '/perks',
    loaders: [() => import('../pages/public/PerksPage')],
  },
  {
    cacheKey: () => '/rewards',
    match: (path) => path === '/rewards',
    loaders: [() => import('../pages/public/RewardsPage')],
  },
  {
    cacheKey: () => '/gift-cards',
    match: (path) => path === '/gift-cards',
    loaders: [() => import('../pages/public/GiftCardsPage')],
  },
  {
    cacheKey: () => '/explore',
    match: (path) => path === '/explore',
    loaders: [() => import('../pages/public/ExploreHubPage')],
  },
  {
    cacheKey: () => '/features',
    match: (path) => path === '/features',
    loaders: [() => import('../pages/public/FeaturesHubPage')],
  },
  {
    cacheKey: () => '/compare',
    match: (path) => path === '/compare',
    loaders: [() => import('../pages/public/ComparePage')],
  },
  {
    cacheKey: () => '/notifications',
    match: (path) => path === '/notifications',
    loaders: [() => import('../pages/public/NotificationsPage')],
  },
  {
    cacheKey: () => '/more',
    match: (path) => path === '/more',
    loaders: [() => import('../pages/public/MorePage')],
  },
  {
    cacheKey: () => '/chat',
    match: (path) => path === '/chat' || path === '/chat-with-us',
    loaders: [() => import('../pages/public/ChatPage')],
  },
  {
    cacheKey: () => '/support-center',
    match: (path) => path === '/support-center',
    loaders: [() => import('../pages/public/SupportCenterPage')],
  },
  {
    cacheKey: () => '/purchase-protection',
    match: (path) => path === '/purchase-protection',
    loaders: [() => import('../pages/public/PurchaseProtectionPage')],
  },
  {
    cacheKey: () => '/track-order',
    match: (path) => path === '/track-order',
    loaders: [() => import('../pages/public/TrackOrderPage')],
  },
  {
    cacheKey: () => '/blog',
    match: (path) => path === '/blog',
    loaders: [() => import('../pages/public/BlogsPage')],
  },
  {
    cacheKey: () => '/genie',
    match: (path) => path === '/genie',
    loaders: [() => import('../pages/public/UrbanGeniePage')],
  },
  {
    cacheKey: () => '/games',
    match: (path) => path === '/games',
    loaders: [() => import('../pages/public/GamesHubPage')],
  },
];

const normalizeRouteTarget = (target: RouteTarget): string => {
  if (!target) return '';
  const raw = typeof target === 'string' ? target : target.pathname || '';
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#')) return '';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const canPrefetch = () => {
  if (typeof window === 'undefined') return false;
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) return false;
  return true;
};

export const prefetchRoute = (target: RouteTarget) => {
  if (!canPrefetch()) return;

  const path = normalizeRouteTarget(target);
  if (!path) return;

  const entry = routePrefetchEntries.find((candidate) => candidate.match(path));
  if (!entry) return;

  const cacheKey = entry.cacheKey(path);
  if (prefetchedRoutes.has(cacheKey)) return;

  prefetchedRoutes.add(cacheKey);
  Promise.all(entry.loaders.map((loader) => loader())).catch(() => {
    prefetchedRoutes.delete(cacheKey);
  });
};

export const schedulePrefetchRoutes = (targets: RouteTarget[], delayMs = 450) => {
  if (!canPrefetch()) return () => {};

  const runner = () => {
    targets.forEach((target, index) => {
      window.setTimeout(() => prefetchRoute(target), index * 180);
    });
  };

  const requestIdle = (window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  }).requestIdleCallback;

  if (requestIdle) {
    const handle = requestIdle(() => runner(), { timeout: 1200 });
    return () => {
      const cancelIdle = (window as Window & {
        cancelIdleCallback?: (handle: number) => void;
      }).cancelIdleCallback;
      cancelIdle?.(handle);
    };
  }

  const handle = window.setTimeout(runner, delayMs);
  return () => window.clearTimeout(handle);
};
