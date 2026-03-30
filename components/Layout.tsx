
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AIChatBot from './AIChatBot';
import BackToTopButton from './BackToTopButton';
import ComparisonBar from './ComparisonBar';
import FloatingWidget from './FloatingWidget';
import { adminService } from '../services/adminService';
import type { SiteSettings } from '../types';
import PixeFloatingButton from './PixeFloatingButton';
import { useTheme } from '../hooks/useTheme';
import OmniDashboard from './omni/OmniDashboard';
import MobileAppChrome from './MobileAppChrome';
import { useCart } from '../hooks/useCart';

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
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isOmniOpen, setIsOmniOpen] = useState(false);

  useEffect(() => {
    adminService.getSiteSettings().then(setSiteSettings);
  }, []);

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
  const showMobileChrome = !isAuthRoute && !isAdminRoute && !isSpotlightSurface;
  const isBannerActive = siteSettings?.siteBanner?.isActive && siteSettings.siteBanner.message;
  
  const isDarkGlass = resolvedTheme === 'obsidian' || resolvedTheme === 'hydra';
  const layoutClasses = isDarkGlass ? 'bg-transparent text-text-primary' : 'bg-background text-text-primary';
  const mainBgClass = isDarkGlass ? 'bg-transparent' : 'bg-background';
  const headerSpacing = showHeader && !isHomePage ? 'md:pt-24' : '';
  const mobileChromeSpacing = showMobileChrome ? 'pb-[6.25rem]' : '';
  const mainOverflowClass = 'overflow-x-hidden';

  return (
    <div className={`min-h-screen flex flex-col ${layoutClasses} transition-colors duration-300 relative overflow-x-hidden`}>
      {isBannerActive && showBanner && <SiteBanner message={siteSettings.siteBanner.message} onClose={() => setShowBanner(false)} />}
      {showHeader ? (
        <div className="hidden md:block">
          <Header onOpenOmni={() => setIsOmniOpen(true)} />
        </div>
      ) : null}
      <main className={`flex-grow relative z-10 ${mainBgClass} ${headerSpacing} ${mobileChromeSpacing} ${mainOverflowClass}`}>
        <div>
          <Outlet />
        </div>
      </main>
      
      {/* Omni Interface */}
      <OmniDashboard isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} />

      {!isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <div className="hidden md:block">
          <ComparisonBar />
        </div>
      ) : null}
      {!isStoreCreationFlow && !isListItemPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <div className="hidden md:block">
          <FloatingWidget />
        </div>
      ) : null}
      {showFooter ? (
        showMobileChrome || isHomePage ? (
          <div className="hidden md:block">
            <Footer />
          </div>
        ) : (
          <Footer />
        )
      ) : null}
      {!isStoreCreationFlow && !isListItemPage && !isReelsPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <div className="hidden md:block">
          <AIChatBot />
        </div>
      ) : null}
      {!isReelsPage && !isDashboardRoute && !isItemDetailRoute && !isSpotlightSurface ? (
        <div className="hidden md:block">
          <PixeFloatingButton />
        </div>
      ) : null}
      {showMobileChrome ? <MobileAppChrome /> : null}
      <BackToTopButton />
    </div>
  );
};

export default Layout;
