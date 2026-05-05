
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BackToTopButton from './BackToTopButton';
import type { SiteSettings } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import useSeoMeta from '../hooks/useSeoMeta';
import { affiliateCommissionService } from '../services/affiliateCommissionService';
import DeferredMount from './performance/DeferredMount';
import { RESERVED_PROFILE_SLUGS, resolveStaticSeoMeta } from '../seo/siteMetadata.js';

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

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { addItemToCart } = useCart();
  const { user } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const routeSeoMeta = useMemo(() => resolveStaticSeoMeta(location.pathname), [location.pathname]);

  useSeoMeta(routeSeoMeta);

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
    if (!isSpotlightSurface && !isDashboardRoute) return;

    document.documentElement.classList.add('app-viewport-lock');
    return () => {
      document.documentElement.classList.remove('app-viewport-lock');
    };
  }, [isDashboardRoute, isSpotlightSurface]);

  const showHeader = !isReelsPage && !isInspirationPage && !isDashboardRoute && !isSpotlightSurface;
  const showFooter = !isReelsPage && !isInspirationPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface;
  const showMobileChrome = !isDashboardRoute && !isAuthRoute && !isAdminRoute && !isSpotlightSurface && !isSpotlightProfileSurface;
  const isBannerActive = siteSettings?.siteBanner?.isActive && siteSettings.siteBanner.message;
  const showSiteBanner = isBannerActive && showBanner && !isDashboardRoute && !isSpotlightSurface;
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
  const layoutHeightClass = isDashboardRoute ? 'h-[100dvh] min-h-0 overflow-hidden' : 'min-h-screen overflow-x-hidden';
  const mainShellClass = isDashboardRoute
    ? 'min-h-0 flex-1 overflow-hidden'
    : `flex-grow ${headerSpacing} ${mobileChromeSpacing} ${mainOverflowClass}`;
  const outletShellClass = isDashboardRoute ? 'h-full min-h-0 overflow-hidden' : '';

  return (
    <div className={`${layoutHeightClass} flex flex-col ${layoutClasses} ${publicThemeClass} ${wordmarkShellClass} transition-colors duration-300 relative`}>
      {showSiteBanner && <SiteBanner message={siteSettings.siteBanner.message} onClose={() => setShowBanner(false)} />}
      {showHeader ? (
        <Suspense fallback={null}>
          <div className="relative z-[70] hidden md:block">
            <Header onOpenOmni={() => setIsOmniOpen(true)} />
          </div>
        </Suspense>
      ) : null}
      <main className={`relative z-10 ${mainBgClass} ${mainShellClass}`}>
        <div className={outletShellClass}>
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
      {!isDashboardRoute ? <BackToTopButton /> : null}
    </div>
  );
};

export default Layout;
