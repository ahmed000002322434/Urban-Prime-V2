
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

const SiteBanner: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => (
    <div className="bg-primary text-white text-center p-2 text-sm font-semibold relative z-[60]">
        <p dangerouslySetInnerHTML={{ __html: message }}></p>
        <button onClick={onClose} className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-lg">&times;</button>
    </div>
);


const Layout: React.FC = () => {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isOmniOpen, setIsOmniOpen] = useState(false);

  useEffect(() => {
    adminService.getSiteSettings().then(setSiteSettings);
  }, []);

  const isStoreCreationFlow = location.pathname.startsWith('/create-store') || location.pathname.startsWith('/store/preview') || location.pathname.startsWith('/store/generating');
  const isListItemPage = location.pathname.includes('/profile/products/new');
  const isReelsPage = location.pathname === '/reels';
  const isInspirationPage = location.pathname.startsWith('/inspiration');
  const isDashboardRoute = location.pathname.startsWith('/profile');
  
  const isHomePage = location.pathname === '/';
  const showHeader = !isReelsPage && !isInspirationPage && !isDashboardRoute;
  const showFooter = !isReelsPage && !isInspirationPage && !isDashboardRoute;
  const isBannerActive = siteSettings?.siteBanner?.isActive && siteSettings.siteBanner.message;
  
  const isDarkGlass = resolvedTheme === 'obsidian' || resolvedTheme === 'hydra';
  const layoutClasses = isDarkGlass ? 'bg-transparent text-text-primary' : 'bg-background text-text-primary';
  const mainBgClass = isDarkGlass ? 'bg-transparent' : 'bg-background';

  return (
    <div className={`min-h-screen flex flex-col ${layoutClasses} transition-colors duration-300 relative overflow-x-hidden`}>
      {isBannerActive && showBanner && <SiteBanner message={siteSettings.siteBanner.message} onClose={() => setShowBanner(false)} />}
      {showHeader && <Header onOpenOmni={() => setIsOmniOpen(true)} />}
      <main className={`flex-grow relative z-10 ${mainBgClass} ${showHeader && !isHomePage ? 'pt-20 md:pt-24' : ''}`}>
        <div>
          <Outlet />
        </div>
      </main>
      
      {/* Omni Interface */}
      <OmniDashboard isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} />

      {!isDashboardRoute && <ComparisonBar />}
      {!isStoreCreationFlow && !isListItemPage && !isDashboardRoute && <FloatingWidget />}
      {showFooter && <Footer />}
      {!isStoreCreationFlow && !isListItemPage && !isReelsPage && !isDashboardRoute && <AIChatBot />}
      {!isReelsPage && !isDashboardRoute && <PixeFloatingButton />}
      <BackToTopButton />
    </div>
  );
};

export default Layout;
