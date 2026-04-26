import React from 'react';

export type DashboardSidebarItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  matchMode?: 'exact' | 'prefix';
};

export type DashboardSidebarSection = {
  id: string;
  title: string;
  accentClassName: string;
  items: DashboardSidebarItem[];
};

export type UrbanPrimeSidebarOptions = {
  activePersonaType?: string | null;
  canBuy?: boolean;
  canRent?: boolean;
  canSell?: boolean;
  canProvide?: boolean;
  canAffiliate?: boolean;
  canShip?: boolean;
};

type IconProps = {
  className?: string;
};

const iconClassName = 'h-5 w-5';

export const DashboardOverviewIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const DashboardAnalyticsIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m7 14 4-4 3 3 6-7" />
  </svg>
);

export const DashboardOrdersIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const DashboardRentalsIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
    <path d="M3 15.5 12 20l9-4.5" />
    <path d="M3 12 12 16.5 21 12" />
  </svg>
);

export const DashboardWishlistIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21 4.6 13.8a5.1 5.1 0 0 1 7.2-7.2L12 7l.2-.4a5.1 5.1 0 0 1 7.2 7.2Z" />
  </svg>
);

export const DashboardMessagesIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 7-9.2 5.9a1.6 1.6 0 0 1-1.7 0L2 7" />
    <rect x="2" y="5" width="20" height="14" rx="3" />
  </svg>
);

export const DashboardLibraryIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

export const DashboardSettingsIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
  </svg>
);

export const DashboardStoreIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
    <path d="M3 9 5.5 4h13L21 9" />
    <path d="M9 21V12h6v9" />
  </svg>
);

export const DashboardEarningsIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const DashboardServicesIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M2 12h20" />
  </svg>
);

export const DashboardCalendarIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

export const DashboardPromotionsIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
    <path d="M14 7l7-3v16l-7-3" />
    <path d="M9 16a3 3 0 0 1-3-3V11" />
  </svg>
);

export const DashboardWorkspaceIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <path d="M3 10h18" />
  </svg>
);

export const DashboardDeliveryIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 17h1a2 2 0 0 0 2-2V9h-3V5H3v10a2 2 0 0 0 2 2h1" />
    <path d="M17 9h2l2 3v3a2 2 0 0 1-2 2h-1" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

export const DashboardHomeIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10.5V21h14V10.5" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const DashboardBellIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M9 17a3 3 0 0 0 6 0" />
  </svg>
);

export const DashboardSearchIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const DashboardMenuIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

export const DashboardCloseIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const DashboardChevronDownIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const DashboardLogoutIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const DashboardSwitchIcon: React.FC<IconProps> = ({ className = iconClassName }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3h5v5" />
    <path d="m4 20 7-7" />
    <path d="M21 3 9 15" />
    <path d="M3 9h5V4" />
    <path d="m15 15 6 6" />
    <path d="m3 3 6 6" />
  </svg>
);

const consumerItems: DashboardSidebarItem[] = [
  { to: '/profile/orders', label: 'Orders', icon: <DashboardOrdersIcon /> },
  { to: '/rentals', label: 'Rentals', icon: <DashboardRentalsIcon /> },
  { to: '/profile/wishlist', label: 'Wishlist', icon: <DashboardWishlistIcon /> },
  { to: '/profile/messages', label: 'Messages', icon: <DashboardMessagesIcon /> },
  { to: '/profile/digital-library', label: 'Digital Library', icon: <DashboardLibraryIcon /> }
];

const sellerItems: DashboardSidebarItem[] = [
  { to: '/profile/products', label: 'Products', icon: <DashboardLibraryIcon /> },
  { to: '/profile/sales', label: 'Sales', icon: <DashboardOrdersIcon /> },
  { to: '/profile/store', label: 'Storefront', icon: <DashboardStoreIcon /> },
  { to: '/profile/earnings', label: 'Earnings', icon: <DashboardEarningsIcon /> },
  { to: '/profile/messages', label: 'Messages', icon: <DashboardMessagesIcon /> }
];

const providerItems: DashboardSidebarItem[] = [
  { to: '/profile/provider', end: true, label: 'Provider Hub', icon: <DashboardWorkspaceIcon /> },
  { to: '/profile/provider/services', label: 'Services', icon: <DashboardServicesIcon /> },
  { to: '/profile/provider/leads', label: 'Leads', icon: <DashboardMessagesIcon /> },
  { to: '/profile/provider/calendar', label: 'Calendar', icon: <DashboardCalendarIcon /> },
  { to: '/profile/provider/payouts', label: 'Payouts', icon: <DashboardEarningsIcon /> }
];

const affiliateItems: DashboardSidebarItem[] = [
  { to: '/profile/affiliate', label: 'Affiliate Center', icon: <DashboardWorkspaceIcon /> },
  { to: '/profile/promotions', label: 'Promotions', icon: <DashboardPromotionsIcon /> },
  { to: '/profile/messages', label: 'Messages', icon: <DashboardMessagesIcon /> }
];

const shipperItems: DashboardSidebarItem[] = [
  { to: '/profile/shipper-dashboard', label: 'Shipper Hub', icon: <DashboardDeliveryIcon /> },
  { to: '/profile/shipper/queue', label: 'Delivery Queue', icon: <DashboardOrdersIcon /> },
  { to: '/profile/analytics/shipper/overview', label: 'SLA Analytics', icon: <DashboardAnalyticsIcon /> },
  { to: '/profile/messages', label: 'Messages', icon: <DashboardMessagesIcon /> }
];

export const buildUrbanPrimeSidebarSections = ({
  activePersonaType,
  canBuy = false,
  canRent = false,
  canSell = false,
  canProvide = false,
  canAffiliate = false,
  canShip = false
}: UrbanPrimeSidebarOptions): DashboardSidebarSection[] => {
  const normalizedPersonaType = (activePersonaType || '').toLowerCase();

  const workspaceItems: DashboardSidebarItem[] = [
    { to: '/profile', end: true, label: 'Overview', icon: <DashboardOverviewIcon />, matchMode: 'exact' },
    { to: '/profile/analytics', label: 'Analytics', icon: <DashboardAnalyticsIcon /> }
  ];

  let operationsTitle = 'Buying & Orders';
  let operationsItems: DashboardSidebarItem[] = [];

  if (normalizedPersonaType === 'seller' || canSell) {
    operationsTitle = 'Commerce';
    operationsItems = sellerItems;
  } else if (normalizedPersonaType === 'provider' || canProvide) {
    operationsTitle = 'Service Ops';
    operationsItems = providerItems;
  } else if (normalizedPersonaType === 'affiliate' || canAffiliate) {
    operationsTitle = 'Affiliate';
    operationsItems = affiliateItems;
  } else if (normalizedPersonaType === 'shipper' || canShip) {
    operationsTitle = 'Logistics';
    operationsItems = shipperItems;
  } else if (canBuy || canRent || !normalizedPersonaType || normalizedPersonaType === 'consumer') {
    operationsItems = consumerItems;
  }

  return [
    {
      id: 'workspace',
      title: 'Workspace',
      accentClassName: 'from-violet-500 via-fuchsia-400 to-amber-300',
      items: workspaceItems
    },
    {
      id: 'operations',
      title: operationsTitle,
      accentClassName: 'from-[#8f6ce1] via-[#8f69c2] to-[#d39a65]',
      items: operationsItems
    },
    {
      id: 'account',
      title: 'Account',
      accentClassName: 'from-amber-300 via-violet-300 to-fuchsia-400',
      items: [{ to: '/profile/settings', label: 'Settings', icon: <DashboardSettingsIcon /> }]
    }
  ].filter((section) => section.items.length > 0);
};

export const matchesDashboardPath = (pathname: string, item: DashboardSidebarItem) => {
  if (item.matchMode === 'exact' || item.end) {
    return pathname === item.to;
  }

  if (item.to === '/') {
    return pathname === '/';
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
};

export const UrbanPrimeBrandMark: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
    <div
      className={`relative flex items-center justify-center overflow-hidden border border-white/55 bg-white/92 shadow-[0_18px_40px_rgba(101,43,110,0.18)] ${
        compact ? 'h-12 w-12 rounded-[17px]' : 'h-14 w-14 rounded-[20px]'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-200 via-rose-100 to-orange-100" />
      <span className={`relative font-black tracking-tight text-[#702c73] ${compact ? 'text-base' : 'text-lg'}`}>UP</span>
    </div>
    <div>
      <span className={`block font-black tracking-[-0.04em] text-white ${compact ? 'text-[1.45rem]' : 'text-[1.65rem]'}`}>UrbanPrime</span>
      <span className={`block font-bold uppercase text-white/72 ${compact ? 'text-[0.58rem] tracking-[0.35em]' : 'text-[0.65rem] tracking-[0.42em]'}`}>
        Dashboard
      </span>
    </div>
  </div>
);
