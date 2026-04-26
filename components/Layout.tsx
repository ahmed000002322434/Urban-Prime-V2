
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BackToTopButton from './BackToTopButton';
import type { SiteSettings } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { affiliateCommissionService } from '../services/affiliateCommissionService';
import DeferredMount from './performance/DeferredMount';

const Header = lazy(() => import('./Header'));
const Footer = lazy(() => import('./Footer'));
const AIChatBot = lazy(() => import('./AIChatBot'));
const ComparisonBar = lazy(() => import('./ComparisonBar'));
const FloatingWidget = lazy(() => import('./FloatingWidget'));
const PixeFloatingButton = lazy(() => import('./PixeFloatingButton'));
const OmniDashboard = lazy(() => import('./omni/OmniDashboard'));
const MobileAppChrome = lazy(() => import('./MobileAppChrome'));

const SiteBanner: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => (
    <div className="bg-primary text-white text-center p-2 text-sm font-semibold relative z-[60]">
        <p dangerouslySetInnerHTML={{ __html: message }}></p>
        <button onClick={onClose} className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-lg">&times;</button>
    </div>
);

const SITE_NAME = 'Urban Prime';
const SITE_DESCRIPTION = 'Urban Prime combines a premium marketplace, creator profiles, Spotlight discovery, and fast mobile browsing in one place.';
const DEFAULT_SEO_IMAGE = '/icons/urbanprime-logo.png';
const RESERVED_PROFILE_SLUGS = new Set([
  'settings',
  'edit',
  'legacy-edit',
  'activity',
  'messages',
  'orders',
  'wishlist',
  'reviews',
  'coupons',
  'followed-stores',
  'history',
  'switch-accounts',
  'collections',
  'go-live',
  'add-post',
  'track-delivery',
  'wallet',
  'permissions',
  'workflows',
  'addresses',
  'notifications-settings',
  'payment-options',
  'analytics',
  'store',
  'products',
  'sales',
  'owner-controls',
  'offers',
  'promotions',
  'earnings',
  'provider-dashboard',
  'services',
  'become-a-provider',
  'affiliate',
  'creator-hub',
  'spotlight'
]);

const toTitleCase = (value: string) => value
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (char) => char.toUpperCase());

type SeoMeta = {
  title: string;
  description: string;
  image: string;
  type: 'website' | 'article';
  themeColor: string;
  noIndex: boolean;
};

const resolveSeoMeta = (pathname: string): SeoMeta => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const profileMatch = normalizedPath.match(/^\/profile\/([^/]+)$/);

  if (normalizedPath === '/') {
    return {
      title: `${SITE_NAME} | Marketplace, Spotlight & Creator Hub`,
      description: SITE_DESCRIPTION,
      image: DEFAULT_SEO_IMAGE,
      type: 'website',
      themeColor: '#0f172a',
      noIndex: false
    };
  }

  if (normalizedPath === '/spotlight') {
    return {
      title: `Prime Spotlight | ${SITE_NAME}`,
      description: 'Discover premium photo and video posts, creators, and conversations in Prime Spotlight.',
      image: DEFAULT_SEO_IMAGE,
      type: 'website',
      themeColor: '#090b13',
      noIndex: false
    };
  }

  if (normalizedPath.startsWith('/spotlight/post/')) {
    return {
      title: `Spotlight Post | ${SITE_NAME}`,
      description: 'Open a Spotlight post to view the full story, media, and comments.',
      image: DEFAULT_SEO_IMAGE,
      type: 'article',
      themeColor: '#090b13',
      noIndex: false
    };
  }

  if (normalizedPath.startsWith('/spotlight/create')) {
    return {
      title: `Create Spotlight | ${SITE_NAME}`,
      description: 'Publish a photo or video to Prime Spotlight.',
      image: DEFAULT_SEO_IMAGE,
      type: 'website',
      themeColor: '#090b13',
      noIndex: true
    };
  }

  if (normalizedPath.startsWith('/item/')) {
    return {
      title: `Item Details | ${SITE_NAME}`,
      description: 'Explore product details, pricing, rentals, auctions, and digital delivery on Urban Prime.',
      image: DEFAULT_SEO_IMAGE,
      type: 'article',
      themeColor: '#0f172a',
      noIndex: false
    };
  }

  if (normalizedPath === '/reels') {
    return {
      title: `Reels | ${SITE_NAME}`,
      description: 'Watch immersive short-form video content from Urban Prime creators.',
      image: DEFAULT_SEO_IMAGE,
      type: 'website',
      themeColor: '#0b1220',
      noIndex: false
    };
  }

  if (normalizedPath === '/profile') {
    return {
      title: `Profile | ${SITE_NAME}`,
      description: 'Manage your Urban Prime account and creator settings.',
      image: DEFAULT_SEO_IMAGE,
      type: 'website',
      themeColor: '#0f172a',
      noIndex: true
    };
  }

  if (profileMatch) {
    const slug = decodeURIComponent(profileMatch[1]).toLowerCase();
    if (RESERVED_PROFILE_SLUGS.has(slug)) {
      return {
        title: `Profile | ${SITE_NAME}`,
        description: 'Manage your Urban Prime account and creator settings.',
        image: DEFAULT_SEO_IMAGE,
        type: 'website',
        themeColor: '#0f172a',
        noIndex: true
      };
    }

    return {
      title: `@${slug} | ${SITE_NAME}`,
      description: `Explore the creator profile for @${slug} on Urban Prime Spotlight.`,
      image: DEFAULT_SEO_IMAGE,
      type: 'article',
      themeColor: '#090b13',
      noIndex: false
    };
  }

  const privateRoutePrefixes = ['/messages', '/notifications', '/more', '/auth', '/admin', '/checkout'];
  if (privateRoutePrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
    const label = normalizedPath.split('/').filter(Boolean).map(toTitleCase).join(' / ') || 'Dashboard';
    return {
      title: `${label} | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      image: DEFAULT_SEO_IMAGE,
      type: 'website',
      themeColor: '#0f172a',
      noIndex: true
    };
  }

  const derivedLabel = normalizedPath === '/'
    ? SITE_NAME
    : normalizedPath.split('/').filter(Boolean).map(toTitleCase).join(' / ');

  return {
    title: `${derivedLabel ? `${derivedLabel} | ` : ''}${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    image: DEFAULT_SEO_IMAGE,
    type: 'website',
    themeColor: '#0f172a',
    noIndex: false
  };
};

const ensureMeta = (selector: string, attributeName: 'name' | 'property', attributeValue: string, content: string) => {
  const existing = document.head.querySelector<HTMLMetaElement>(`${selector}[${attributeName}="${attributeValue}"]`);
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }
  const meta = document.createElement('meta');
  meta.setAttribute(attributeName, attributeValue);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
};

const ensureLink = (rel: string, href: string) => {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (existing) {
    existing.setAttribute('href', href);
    return;
  }
  const link = document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  document.head.appendChild(link);
};


const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { addItemToCart } = useCart();
  const { user } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isOmniOpen, setIsOmniOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void import('../services/adminService')
      .then(({ adminService }) => adminService.getSiteSettings())
      .then((settings) => {
        if (!cancelled) {
          setSiteSettings(settings);
        }
      })
      .catch((error) => {
        console.warn('Unable to load site settings:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    affiliateCommissionService
      .captureReferralFromLocation(location.search, `${location.pathname}${location.search}`)
      .catch((error) => {
        console.warn('Affiliate referral capture skipped:', error);
      });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user?.id) return;
    affiliateCommissionService.persistPendingReferralForUser(user.id).catch((error) => {
      console.warn('Affiliate referral persistence skipped:', error);
    });
  }, [user?.id, location.pathname, location.search]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const seo = resolveSeoMeta(location.pathname);
    const canonicalUrl = `${window.location.origin}${location.pathname}`;
    const imageUrl = new URL(seo.image, window.location.origin).toString();

    document.title = seo.title;
    ensureMeta('meta', 'name', 'description', seo.description);
    ensureMeta('meta', 'name', 'robots', seo.noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    ensureMeta('meta', 'name', 'application-name', SITE_NAME);
    ensureMeta('meta', 'name', 'apple-mobile-web-app-title', SITE_NAME);
    ensureMeta('meta', 'name', 'theme-color', seo.themeColor);
    ensureMeta('meta', 'property', 'og:site_name', SITE_NAME);
    ensureMeta('meta', 'property', 'og:type', seo.type);
    ensureMeta('meta', 'property', 'og:title', seo.title);
    ensureMeta('meta', 'property', 'og:description', seo.description);
    ensureMeta('meta', 'property', 'og:url', canonicalUrl);
    ensureMeta('meta', 'property', 'og:image', imageUrl);
    ensureMeta('meta', 'property', 'og:image:alt', `${SITE_NAME} preview image`);
    ensureMeta('meta', 'name', 'twitter:card', 'summary_large_image');
    ensureMeta('meta', 'name', 'twitter:title', seo.title);
    ensureMeta('meta', 'name', 'twitter:description', seo.description);
    ensureMeta('meta', 'name', 'twitter:image', imageUrl);
    ensureLink('canonical', canonicalUrl);
    document.documentElement.setAttribute('lang', 'en');
  }, [location.pathname]);

  useEffect(() => {
    const handleItemDetailAction = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || payload.type !== 'urbanprime:item-detail-action') return;

      const action = String(payload.action || '').trim();
      if (!action) return;

      if (action === 'place_bid') {
        const itemId = encodeURIComponent(String(payload.itemId || ''));
        const sellerId = encodeURIComponent(String(payload.sellerId || ''));
        const amount = encodeURIComponent(String(payload.amount || ''));
        navigate(`/chat-with-us?itemId=${itemId}&sellerId=${sellerId}&bid=${amount}`);
        return;
      }

      const item = payload.item;
      if (!item || typeof item !== 'object' || !('id' in item)) return;

      const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
      const transactionMode = payload.transactionMode === 'rent' ? 'rent' : 'sale';
      const rentalPeriod =
        payload.rentalPeriod &&
        typeof payload.rentalPeriod === 'object' &&
        payload.rentalPeriod.startDate &&
        payload.rentalPeriod.endDate
          ? {
              startDate: String(payload.rentalPeriod.startDate),
              endDate: String(payload.rentalPeriod.endDate)
            }
          : undefined;

      addItemToCart(item as any, quantity, undefined, rentalPeriod, transactionMode);

      if (action === 'buy_now' || action === 'rent_now') {
        navigate('/checkout');
      }
    };

    window.addEventListener('message', handleItemDetailAction);
    return () => window.removeEventListener('message', handleItemDetailAction);
  }, [addItemToCart, navigate]);

  const isStoreCreationFlow = location.pathname.startsWith('/create-store') || location.pathname.startsWith('/store/preview') || location.pathname.startsWith('/store/generating');
  const isListItemPage = location.pathname.includes('/profile/products/new');
  const isItemDetailRoute = location.pathname.startsWith('/item/');
  const isReelsPage = location.pathname === '/reels';
  const isInspirationPage = location.pathname.startsWith('/inspiration');
  const isDashboardRoute = location.pathname.startsWith('/profile');
  const isSpotlightSurface =
    location.pathname === '/spotlight' ||
    location.pathname.startsWith('/spotlight/post/') ||
    location.pathname.startsWith('/spotlight/create');
  const spotlightProfileMatch = location.pathname.match(/^\/profile\/([^/]+)$/);
  const spotlightProfileSlug = spotlightProfileMatch?.[1] ? decodeURIComponent(spotlightProfileMatch[1]).toLowerCase() : '';
  const isSpotlightProfileSurface = Boolean(spotlightProfileSlug) && !RESERVED_PROFILE_SLUGS.has(spotlightProfileSlug);
  const isAuthRoute =
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/admin-login');
  const isAdminRoute = location.pathname.startsWith('/admin');

  const isHomePage = location.pathname === '/';
  useEffect(() => {
    if (!isSpotlightSurface) return;
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isSpotlightSurface]);

  const showHeader = !isReelsPage && !isInspirationPage && !isDashboardRoute && !isSpotlightSurface;
  const showFooter = !isReelsPage && !isInspirationPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface;
  const showMobileChrome = !isAuthRoute && !isAdminRoute && !isSpotlightSurface && !isSpotlightProfileSurface;
  const isBannerActive = siteSettings?.siteBanner?.isActive && siteSettings.siteBanner.message;
  const isWarmPublicExperience =
    resolvedTheme === 'light' &&
    !isDashboardRoute &&
    !isAuthRoute &&
    !isAdminRoute &&
    !isSpotlightSurface;
  
  const isDarkGlass = resolvedTheme === 'obsidian' || resolvedTheme === 'hydra';
  const layoutClasses = isDarkGlass || isWarmPublicExperience ? 'bg-transparent text-text-primary' : 'bg-background text-text-primary';
  const mainBgClass = isDarkGlass || isWarmPublicExperience ? 'bg-transparent' : 'bg-background';
  const headerSpacing = showHeader && !isHomePage ? 'md:pt-24' : '';
  const mobileChromeSpacing = showMobileChrome ? 'pb-[6.25rem]' : '';
  const mainOverflowClass = 'overflow-x-hidden';
  const publicThemeClass = isWarmPublicExperience ? 'public-theme-shell public-theme-shell--warm' : '';
  const wordmarkShellClass = !isDashboardRoute && !isAdminRoute ? 'site-wordmark-shell' : '';

  return (
    <div className={`min-h-screen flex flex-col ${layoutClasses} ${publicThemeClass} ${wordmarkShellClass} transition-colors duration-300 relative overflow-x-hidden`}>
      {isBannerActive && showBanner && <SiteBanner message={siteSettings.siteBanner.message} onClose={() => setShowBanner(false)} />}
      {showHeader ? (
        <Suspense fallback={null}>
          <div className="relative z-[70] hidden md:block">
            <Header onOpenOmni={() => setIsOmniOpen(true)} />
          </div>
        </Suspense>
      ) : null}
      <main className={`flex-grow relative z-10 ${mainBgClass} ${headerSpacing} ${mobileChromeSpacing} ${mainOverflowClass}`}>
        <div>
          <Outlet />
        </div>
      </main>
      
      {/* Omni Interface */}
      <DeferredMount enabled={true} timeoutMs={1200}>
        <Suspense fallback={null}>
          <OmniDashboard isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} />
        </Suspense>
      </DeferredMount>

      {!isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <DeferredMount enabled={true} timeoutMs={1200}>
          <Suspense fallback={null}>
            <div className="hidden md:block">
              <ComparisonBar />
            </div>
          </Suspense>
        </DeferredMount>
      ) : null}
      {!isStoreCreationFlow && !isListItemPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <DeferredMount enabled={true} timeoutMs={1400}>
          <Suspense fallback={null}>
            <div className="hidden md:block">
              <FloatingWidget />
            </div>
          </Suspense>
        </DeferredMount>
      ) : null}
      {showFooter ? (
        <Suspense fallback={null}>
          {showMobileChrome || isHomePage ? (
            <div className="relative z-[20] hidden md:block">
              <Footer />
            </div>
          ) : (
            <Footer />
          )}
        </Suspense>
      ) : null}
      {!isStoreCreationFlow && !isListItemPage && !isReelsPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <DeferredMount enabled={true} timeoutMs={1800}>
          <Suspense fallback={null}>
            <div className="hidden md:block">
              <AIChatBot />
            </div>
          </Suspense>
        </DeferredMount>
      ) : null}
      {!isReelsPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <DeferredMount enabled={true} timeoutMs={1600}>
          <Suspense fallback={null}>
            <div className="hidden md:block">
              <PixeFloatingButton />
            </div>
          </Suspense>
        </DeferredMount>
      ) : null}
      {showMobileChrome ? (
        <Suspense fallback={null}>
          <MobileAppChrome />
        </Suspense>
      ) : null}
      <BackToTopButton />
    </div>
  );
};

export default Layout;
