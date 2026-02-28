import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import dashboardService from '../services/dashboardService';
import { SearchSuggestionsDropdown } from '../components/dashboard/SearchSuggestionsDropdown';
import type { SellerDashboardSetup } from '../types';
import LottieAnimation from '../components/LottieAnimation';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';

const TOP_BAR_HEIGHT = 52;
const DESKTOP_SIDEBAR_WIDTH = 248;

type IconProps = { className?: string };
type NavItem = { to: string; label: string; icon: React.FC<IconProps>; end?: boolean; trailingDot?: boolean };
type NavSection = { title?: string; items: NavItem[]; headingArrow?: boolean };

const HomeIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

const OrdersIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
    <rect x="3" y="4" width="18" height="16" rx="2" />
  </svg>
);

const ProductIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V16.5L12 21l9-4.5V7.5" />
  </svg>
);

const PeopleIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const MarketingIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-6 4 12 2-6h6" />
  </svg>
);

const DiscountIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 10.5 13.5 4H4v9.5L10.5 20a2 2 0 0 0 2.8 0L20 13.3a2 2 0 0 0 0-2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

const ContentIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const MarketIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15 15 0 0 1 0 20" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15 15 0 0 0 0 20" />
  </svg>
);

const AnalyticsIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v-7" />
  </svg>
);

const StoreIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16l-1.5 13H5.5L4 7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l2-4h14l2 4" />
  </svg>
);

const AppsIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v7M14 17h7" />
  </svg>
);

const InboxIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v12H4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 8 8 6 8-6" />
  </svg>
);

const SettingsIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.8 1.8 0 0 0 .36 2l.03.03a2 2 0 1 1-2.83 2.83l-.03-.03a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.09 1.64V22a2 2 0 1 1-4 0v-.05a1.8 1.8 0 0 0-1.09-1.64 1.8 1.8 0 0 0-2 .36l-.03.03a2 2 0 0 1-2.83-2.83l.03-.03a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1.09H2a2 2 0 1 1 0-4h.05a1.8 1.8 0 0 0 1.64-1.09 1.8 1.8 0 0 0-.36-2l-.03-.03a2 2 0 1 1 2.83-2.83l.03.03a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.09-1.64V2a2 2 0 1 1 4 0v.05a1.8 1.8 0 0 0 1.09 1.64 1.8 1.8 0 0 0 2-.36l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.64 1.09H22a2 2 0 1 1 0 4h-.05a1.8 1.8 0 0 0-1.64 1.09z" />
  </svg>
);

const WorkflowIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
    <circle cx="18" cy="12" r="2" />
    <circle cx="13" cy="18" r="2" />
  </svg>
);

const CompassIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 14.5 1.8-4.8 4.8-1.8-1.8 4.8z" />
  </svg>
);

const LogoutIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5" />
  </svg>
);

const SearchIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3-3" />
  </svg>
);

const BellIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LifeBuoyIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 5.6 9.9 9.9M14.1 14.1l4.3 4.3M18.4 5.6 14.1 9.9M9.9 14.1l-4.3 4.3" />
  </svg>
);

const MenuIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const WishlistIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ReviewIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <polygon points="12 2 15.09 10.26 24 10.27 17.18 16.63 20.27 24.79 12 18.43 3.73 24.79 6.82 16.63 0 10.27 8.91 10.26 12 2" />
  </svg>
);

const EarningsIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.22 4.22l1.41 1.41m10.74 10.74l1.41 1.41" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m14 0h2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.22 19.78l1.41-1.41m10.74-10.74l1.41-1.41" />
  </svg>
);

const TrendIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v-7" />
  </svg>
);

const MapPinIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CreditCardIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const ChevronDown: React.FC<IconProps> = ({ className = 'h-3 w-3' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronRight: React.FC<IconProps> = ({ className = 'h-3 w-3' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
  </svg>
);

const defaultSetup: SellerDashboardSetup = {
  hasStore: false,
  hasProducts: false,
  hasContent: false,
  hasApps: false
};

const DashboardLayout: React.FC = () => {
  const { user, logout, personas, activePersona, setActivePersona, hasCapability } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [sellerSetup, setSellerSetup] = useState<SellerDashboardSetup>(defaultSetup);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsProfileMenuOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const personaTypeLabel: Record<string, string> = {
    consumer: 'Consumer',
    seller: 'Seller',
    provider: 'Provider',
    affiliate: 'Affiliate'
  };

  const isSellerWorkspace = useMemo(() => {
    const activeType = activePersona?.type;
    if (activeType === 'seller') return true;
    return hasCapability('sell');
  }, [activePersona?.type, hasCapability]);

  const isProviderWorkspace = useMemo(() => {
    const activeType = activePersona?.type;
    if (activeType === 'provider') return true;
    return hasCapability('provide_service');
  }, [activePersona?.type, hasCapability]);

  const isAffiliateWorkspace = useMemo(() => {
    const activeType = activePersona?.type;
    if (activeType === 'affiliate') return true;
    return hasCapability('affiliate');
  }, [activePersona?.type, hasCapability]);

  useEffect(() => {
    let cancelled = false;

    const loadSetup = async () => {
      if (!user || !isSellerWorkspace) {
        setSellerSetup(defaultSetup);
        return;
      }

      try {
        const snapshot = await dashboardService.getSellerDashboardSnapshot(6);
        if (!cancelled) {
          setSellerSetup(snapshot.setup || defaultSetup);
        }
      } catch {
        if (!cancelled) {
          setSellerSetup({
            hasStore: Boolean(user.businessName),
            hasProducts: false,
            hasContent: false,
            hasApps: false
          });
        }
      }
    };

    loadSetup();

    return () => {
      cancelled = true;
    };
  }, [user, isSellerWorkspace]);

  const runSearch = useCallback(() => {
    const raw = searchQuery.trim();
    if (!raw) return;
    const term = raw.toLowerCase();

    const go = (to: string) => {
      navigate(to);
      setSearchQuery('');
    };

    if (term.includes('home') || term.includes('dashboard')) {
      go('/profile');
      return;
    }
    if (term.includes('workflow')) {
      go('/profile/workflows');
      return;
    }
    if (term.includes('order') || term.includes('shipment')) {
      go(isSellerWorkspace ? '/profile/sales' : '/profile/orders');
      return;
    }
    if (term.includes('message') || term.includes('chat') || term.includes('inbox')) {
      go('/profile/messages');
      return;
    }
    if (term.includes('store') || term.includes('shop')) {
      go(isSellerWorkspace ? '/profile/store' : '/');
      return;
    }
    if (term.includes('product') || term.includes('listing') || term.includes('catalog')) {
      go(isSellerWorkspace ? '/profile/products' : `/browse?q=${encodeURIComponent(raw)}`);
      return;
    }
    if (term.includes('setting') || term.includes('profile')) {
      go('/profile/settings');
      return;
    }
    if (term.includes('analytics') || term.includes('report')) {
      go(isSellerWorkspace ? '/profile/analytics/advanced' : '/profile');
      return;
    }
    if (term.includes('support') || term.includes('help')) {
      go('/help');
      return;
    }
    if (term.includes('marketplace') || term.includes('browse')) {
      go(`/browse?q=${encodeURIComponent(raw)}`);
      return;
    }

    go(`/browse?q=${encodeURIComponent(raw)}`);
  }, [isSellerWorkspace, navigate, searchQuery]);

  const navSections = useMemo<NavSection[]>(() => {
    const sections: NavSection[] = [
      {
        items: [
          { to: '/profile', label: 'Home', icon: HomeIcon, end: true },
          { to: '/profile/workflows', label: 'Workflows', icon: WorkflowIcon },
          { to: '/profile/orders', label: 'Orders', icon: OrdersIcon },
          { to: '/profile/messages', label: 'Inbox', icon: InboxIcon, trailingDot: true },
          { to: '/profile/wishlist', label: 'Wishlist', icon: WishlistIcon },
          { to: '/profile/reviews', label: 'My Reviews', icon: ReviewIcon }
        ]
      }
    ];

    if (isSellerWorkspace) {
      const sellerItems: NavItem[] = [];
      if (sellerSetup.hasProducts) {
        sellerItems.push(
          { to: '/profile/products', label: 'Products', icon: ProductIcon },
          { to: '/profile/followed-stores', label: 'Customers', icon: PeopleIcon },
          { to: '/profile/promotions', label: 'Marketing', icon: MarketingIcon },
          { to: '/profile/coupons', label: 'Discounts', icon: DiscountIcon }
        );
      }
      if (sellerSetup.hasStore) {
        sellerItems.push({ to: '/profile/activity', label: 'Markets', icon: MarketIcon });
      }

      // Always show analytics section for sellers
      sellerItems.push(
        { to: '/store/manager/analytics/traffic', label: 'Traffic', icon: AnalyticsIcon },
        { to: '/store/manager/analytics/revenue', label: 'Revenue', icon: EarningsIcon },
        { to: '/store/manager/analytics/conversion', label: 'Conversions', icon: TrendIcon },
        { to: '/store/manager/analytics/sales-units', label: 'Units Sold', icon: OrdersIcon }
      );

      // Show earnings
      sellerItems.push({ to: '/profile/earnings', label: 'Earnings', icon: EarningsIcon });

      if (sellerItems.length > 0) {
        sections.push({ items: sellerItems });
      }

      sections.push({
        title: 'Sales channels',
        headingArrow: true,
        items: [
          {
            to: '/profile/store',
            label: sellerSetup.hasStore ? 'Online Store' : 'Set up Store',
            icon: StoreIcon
          }
        ]
      });

      if (sellerSetup.hasApps) {
        sections.push({
          title: 'Apps',
          headingArrow: true,
          items: [{ to: '/profile/messages', label: 'Urban Prime AI', icon: AppsIcon }]
        });
      }
    }

    if ((isSellerWorkspace || isProviderWorkspace) && sellerSetup.hasContent) {
      sections.push({
        title: 'Content',
        headingArrow: true,
        items: [{ to: '/profile/creator-hub', label: 'Creator Hub', icon: ContentIcon }]
      });
    }

    if (isProviderWorkspace) {
      sections.push({
        title: 'Service workspace',
        headingArrow: true,
        items: [
          { to: '/profile/provider-dashboard', label: 'Provider dashboard', icon: HomeIcon },
          { to: '/profile/services/new', label: 'List a service', icon: ProductIcon }
        ]
      });
    }

    if (isAffiliateWorkspace) {
      sections.push({
        title: 'Affiliate',
        headingArrow: true,
        items: [{ to: '/profile/affiliate', label: 'Affiliate dashboard', icon: AnalyticsIcon }]
      });
    }

    // Account & Settings section
    sections.push({
      title: 'Account & Settings',
      headingArrow: true,
      items: [
        { to: '/profile/settings/addresses', label: 'Addresses', icon: MapPinIcon },
        { to: '/payment-options', label: 'Payment Methods', icon: CreditCardIcon },
        { to: '/profile/settings/notifications', label: 'Notifications', icon: BellIcon },
        { to: '/profile/settings', label: 'Settings', icon: SettingsIcon }
      ]
    });

    sections.push({
      items: [
        { to: '/', label: 'Marketplace Home', icon: CompassIcon },
        { to: '/profile/switch-accounts', label: 'Switch workspace', icon: PeopleIcon }
      ]
    });

    return sections;
  }, [isAffiliateWorkspace, isProviderWorkspace, isSellerWorkspace, sellerSetup]);

  const userInitials = useMemo(() => {
    const base = user?.name?.trim() || 'User';
    const parts = base.split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }, [user?.name]);

  const navLinkClass = (isActive: boolean) =>
    [
      'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] font-medium transition-all duration-150',
      isActive
        ? 'bg-[#ffffff] text-[#111111] shadow-[inset_0_0_0_1px_rgba(17,17,17,0.07)]'
        : 'text-[#3f3f3f] hover:bg-[#ffffff] hover:text-[#111111]'
    ].join(' ');

  const renderNavigation = () => (
    <div className="flex h-full flex-col">
      <nav className="flex-1 px-2 py-2">
        {navSections.map((section, sectionIndex) => (
          <div key={`${section.title || 'default'}-${sectionIndex}`} className={sectionIndex === 0 ? '' : 'mt-2'}>
            {section.title ? (
              <p className="mb-1 flex items-center px-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666]">
                {section.title}
                {section.headingArrow ? <ChevronRight className="ml-1 h-3 w-3" /> : null}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={({ isActive }) => navLinkClass(isActive)}>
                      <Icon className="h-[16px] w-[16px] text-current" />
                      <span className="truncate">{item.label}</span>
                      {item.trailingDot ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2d2d2d]" /> : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  const renderMobileNavigation = () => (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navSections.map((section, sectionIndex) => (
          <div key={`${section.title || 'default'}-${sectionIndex}`} className={sectionIndex === 0 ? '' : 'mt-2'}>
            {section.title ? (
              <p className="mb-1 flex items-center px-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666]">
                {section.title}
                {section.headingArrow ? <ChevronRight className="ml-1 h-3 w-3" /> : null}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={({ isActive }) => navLinkClass(isActive)}>
                      <Icon className="h-[16px] w-[16px] text-current" />
                      <span className="truncate">{item.label}</span>
                      {item.trailingDot ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2d2d2d]" /> : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="dashboard-shell min-h-screen bg-[#ececec] text-[#1f1f1f]">
      <header
        className="sticky top-0 z-40 grid h-[52px] grid-cols-[1fr_auto] items-center border-b border-black/35 bg-[#101113] text-white md:grid-cols-[248px_1fr_auto]"
        style={{ height: TOP_BAR_HEIGHT }}
      >
        <div className="hidden h-full items-center border-r border-white/10 px-4 md:flex">
          <Link to="/profile" className="inline-flex items-center gap-2">
            <img src="/icons/urbanprime.svg" alt="Urban Prime" className="h-4 w-4" />
            <span className="urban-prime-wordmark text-[0.78rem]">Urban Prime</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 px-3 md:px-5">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white md:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>
          <p className="text-sm font-semibold tracking-wide text-white md:hidden">Dashboard</p>
          <div className="hidden items-center gap-2 md:flex">
            <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                to="/"
                className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-2.5 text-[11px] font-semibold text-white/90 hover:bg-white/20"
              >
                <LottieAnimation src={uiLottieAnimations.home} className="mr-1 h-4 w-4 object-contain" />
                Back to homepage
              </Link>
            </motion.div>
            <p className="text-sm font-semibold tracking-wide text-white/90">Dashboard</p>
          </div>
          <div className="relative flex h-9 w-full max-w-[700px] md:ml-auto">
            <form
              className="flex w-full items-center rounded-xl border border-white/15 bg-white/10 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              onSubmit={(event) => {
                event.preventDefault();
                runSearch();
              }}
            >
              <SearchIcon className="h-4 w-4 text-white/70" />
              <input
                type="text"
                placeholder="Search products, orders, workflows..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setIsSearchSuggestionsOpen(true);
                }}
                onFocus={() => setIsSearchSuggestionsOpen(true)}
                className="ml-2 h-full w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
              />
              <button
                type="submit"
                className="hidden rounded-md border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 sm:inline-flex"
              >
                Search
              </button>
            </form>
            <SearchSuggestionsDropdown
              query={searchQuery}
              isOpen={isSearchSuggestionsOpen}
              onNavigate={(path) => {
                navigate(path);
                setSearchQuery('');
                setIsSearchSuggestionsOpen(false);
              }}
              onClose={() => setIsSearchSuggestionsOpen(false)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 md:px-4">
          {personas.length > 0 && (
            <select
              value={activePersona?.id || ''}
              onChange={async (event) => {
                try {
                  await setActivePersona(event.target.value);
                } catch (error) {
                  if (error instanceof Error && error.message !== 'Workspace switch cancelled.') {
                    if (typeof window !== 'undefined') {
                      window.alert(error.message);
                    }
                  }
                }
              }}
              className="hidden h-8 min-w-[152px] rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white/95 lg:block"
            >
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id} className="text-black">
                  {personaTypeLabel[persona.type] || persona.type} - {persona.status}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/90 hover:bg-white/20"
            aria-label="Support"
            onClick={() => {
              window.location.hash = '#/help';
            }}
          >
            <LifeBuoyIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/90 hover:bg-white/20"
            aria-label="Notifications"
            onClick={() => {
              window.location.hash = '#/profile/messages';
            }}
          >
            <BellIcon className="h-4 w-4" />
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-2.5"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#f15bb5] text-xs font-bold text-white">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name || 'User'} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </span>
              <span className="max-w-[110px] truncate text-xs font-semibold text-white/90">{user?.name || 'User'}</span>
              <ChevronDown className="h-3 w-3 text-white/70" />
            </button>

            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 z-50 mt-2 w-[220px] rounded-xl border border-[#d8d8d8] bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.18)]"
                >
                  <Link to="/profile" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Dashboard</Link>
                  <Link to="/profile/workflows" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Workflows</Link>
                  <Link to="/profile/orders" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Orders</Link>
                  <Link to="/profile/messages" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Inbox</Link>
                  <Link to="/profile/wishlist" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Wishlist</Link>
                  <Link to="/profile/reviews" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">My Reviews</Link>
                  {isSellerWorkspace ? (
                    <>
                      <div className="my-1 border-t border-[#e5e5e5]" />
                      <Link to="/profile/products" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Products</Link>
                      <Link to="/store/manager/analytics/traffic" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Traffic Analytics</Link>
                      <Link to="/store/manager/analytics/revenue" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Revenue Analytics</Link>
                      <Link to="/profile/earnings" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Earnings</Link>
                      <Link to="/profile/store" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">
                        {sellerSetup.hasStore ? 'Online Store' : 'Set up Store'}
                      </Link>
                    </>
                  ) : null}
                  {(isSellerWorkspace || isProviderWorkspace) && sellerSetup.hasContent ? (
                    <Link to="/profile/creator-hub" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">
                      Creator Hub
                    </Link>
                  ) : null}
                  {isProviderWorkspace ? (
                    <Link to="/profile/provider-dashboard" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">
                      Provider dashboard
                    </Link>
                  ) : null}
                  {isAffiliateWorkspace ? (
                    <Link to="/profile/affiliate" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">
                      Affiliate dashboard
                    </Link>
                  ) : null}
                  <div className="my-1 border-t border-[#e5e5e5]" />
                  <Link to="/profile/settings/addresses" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Addresses</Link>
                  <Link to="/payment-options" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Payment Methods</Link>
                  <Link to="/profile/settings/notifications" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Notifications</Link>
                  <Link to="/profile/settings" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Settings</Link>
                  <div className="my-1 border-t border-[#e5e5e5]" />
                  <Link to="/" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Marketplace home</Link>
                  <Link to="/profile/switch-accounts" className="block rounded-lg px-3 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f5]">Switch workspace</Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#7f1d1d] hover:bg-[#fff5f5]"
                  >
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex" style={{ minHeight: `calc(100vh - ${TOP_BAR_HEIGHT}px)` }}>
        <aside
          className="hidden self-start overflow-hidden border-r border-[#d8d8d8] bg-[#efefef] md:sticky md:top-[52px] md:block md:h-[calc(100vh-52px)]"
          style={{ width: DESKTOP_SIDEBAR_WIDTH }}
        >
          {renderNavigation()}
        </aside>

        <main className="min-w-0 flex-1 bg-[#ececec] px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="dashboard-content mx-auto w-full max-w-[1200px]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              className="absolute inset-0 bg-black/45"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="absolute left-0 top-0 h-full w-[86vw] max-w-[320px] border-r border-[#d6d6d6] bg-[#efefef]"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[#d7d7d7] px-4 py-3">
                  <p className="text-sm font-semibold text-[#1f1f1f]">Dashboard</p>
                  <button
                    onClick={() => setIsMobileNavOpen(false)}
                    className="inline-flex h-8 items-center rounded-md border border-[#d0d0d0] bg-white px-3 text-xs font-semibold text-[#2a2a2a]"
                  >
                    Close
                  </button>
                </div>
                {renderMobileNavigation()}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
