import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import dashboardService from '../../services/dashboardService';
import type {
  BuyerDashboardSnapshot,
  SellerDashboardSnapshot
} from '../../types';
import SellerActionCenter from '../../components/dashboard/SellerActionCenter';
import AIGrowthInsights from '../../components/dashboard/AIGrowthInsights';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const COLORS = ['#0fb9b1', '#f39c12', '#3b82f6', '#ec4899', '#8b5cf6'];
const dashboardHeroArtwork = new URL('../../dashboard images/dashboard hero section .png', import.meta.url).href;
const returnsArtwork = new URL('../../dashboard images/returns image ( empty state ) .png', import.meta.url).href;
const noOrdersArtwork = new URL('../../dashboard images/no orders .png', import.meta.url).href;

const OrdersBagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="M6.5 8.5h11l-.8 8.7a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6.5 8.5Z" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
    <path d="M10 12h4" />
  </svg>
);

const PendingClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8.5V12l2.5 1.5" />
  </svg>
);

const RentalsCalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <rect x="4.5" y="6.5" width="15" height="12.5" rx="2.8" />
    <path d="M8 4.5v4M16 4.5v4M4.5 10h15" />
    <path d="M9 13h6" />
  </svg>
);

const WishlistHeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="M12 19.2s-6.5-4.2-8.4-7.7A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 8.4 5.5c-1.9 3.5-8.4 7.7-8.4 7.7Z" />
  </svg>
);

const WorkspaceAddIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h4A2.5 2.5 0 0 1 14 7.5v4A2.5 2.5 0 0 1 11.5 14h-4A2.5 2.5 0 0 1 5 11.5v-4Z" />
    <path d="M14 15.5h5M16.5 13v5" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M5 18.5h14" />
    <path d="M7.5 15.5V11" />
    <path d="M12 15.5V7.5" />
    <path d="M16.5 15.5v-4" />
  </svg>
);

const LibraryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M6 5.5h5.5a2.5 2.5 0 0 1 2.5 2.5v10H8.5A2.5 2.5 0 0 0 6 20.5v-15Z" />
    <path d="M18 5.5h-4v12.5h1.5A2.5 2.5 0 0 1 18 20.5v-15Z" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M5 13a7 7 0 0 1 14 0v3.5a2 2 0 0 1-2 2h-1.5v-4H19" />
    <path d="M5 18.5h-.5a2 2 0 0 1-2-2V13" />
    <path d="M8.5 18.5A3.5 3.5 0 0 0 12 22h1.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const EllipsisIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

const buildSparklinePath = (values: number[], width = 102, height = 42) => {
  const padding = 4;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => (
  <svg viewBox="0 0 102 42" className="h-12 w-24 overflow-visible">
    <path d={buildSparklinePath(values)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GlassStatCard: React.FC<{ label: string; value: string | number; subtext?: string; to?: string; className?: string }> = ({ label, value, subtext, to, className }) => {
  const content = (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', damping: 15, stiffness: 200 }} className={`glass-panel p-6 flex flex-col justify-between h-full glass-panel-shadow ${className}`}>
      <div>
        <p className="text-sm font-bold text-text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-4xl font-black text-text-primary mt-2">{value}</p>
      </div>
      {subtext && <p className="text-xs font-medium text-text-secondary opacity-70 mt-4">{subtext}</p>}
    </motion.div>
  );

  return to ? <Link to={to} className="glass-panel-hover block">{content}</Link> : <div className="glass-panel-hover">{content}</div>;
};

const BuyerOverviewStatCard: React.FC<{
  label: string;
  value: string | number;
  subtext: string;
  to: string;
  icon: React.ReactNode;
  iconShellClassName: string;
  iconClassName: string;
  sparklineColor: string;
  sparklineValues: number[];
}> = ({ label, value, subtext, to, icon, iconShellClassName, iconClassName, sparklineColor, sparklineValues }) => (
  <Link to={to} className="group block">
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="relative flex h-full min-h-[190px] flex-col justify-between overflow-hidden rounded-[30px] border border-[#ece3e8] bg-[linear-gradient(180deg,#ffffff,#fffdfd)] p-6 shadow-[0_24px_48px_rgba(224,197,196,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_22px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-16 w-16 items-center justify-center rounded-[22px] shadow-[0_16px_26px_rgba(228,197,196,0.16)] dark:shadow-none ${iconShellClassName}`}>
          <span className={iconClassName}>{icon}</span>
        </span>
        <div className="pt-3 text-right">
          <Sparkline values={sparklineValues} color={sparklineColor} />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[0.82rem] font-black uppercase tracking-[0.12em] text-[#5f5567] dark:text-[#efe4d7]">{label}</p>
        <p className="mt-2 text-5xl font-black leading-none tracking-tight text-text-primary">{value}</p>
        <p className="mt-3 text-sm font-medium text-[#837886] dark:text-[#bdb1a6]">{subtext}</p>
      </div>
    </motion.div>
  </Link>
);

const BuyerOverviewPanel: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconShellClassName: string;
  iconClassName: string;
  children: React.ReactNode;
}> = ({ title, icon, iconShellClassName, iconClassName, children }) => (
  <motion.section className="rounded-[32px] border border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] p-6 shadow-[0_28px_55px_rgba(224,196,196,0.11),inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_26px_50px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-[16px] ${iconShellClassName}`}>
          <span className={iconClassName}>{icon}</span>
        </span>
        <h3 className="text-[1.1rem] font-black tracking-tight text-text-primary">{title}</h3>
      </div>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[#8f8191] transition-colors hover:bg-black/5 hover:text-[#5f5567] dark:text-[#ab9fae] dark:hover:bg-white/6 dark:hover:text-[#f1e7dc]"
        aria-label={`${title} actions`}
      >
        <EllipsisIcon />
      </button>
    </div>
    <div className="mt-6">{children}</div>
  </motion.section>
);

const QuickActionButton: React.FC<{
  label: string;
  to: string;
  icon: React.ReactNode;
  accentClassName: string;
  iconClassName: string;
}> = ({ label, to, icon, accentClassName, iconClassName }) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-full border border-[#ede2e7] bg-white px-4 py-3 text-sm font-bold text-[#463b50] shadow-[0_18px_30px_rgba(229,202,201,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_36px_rgba(229,202,201,0.18)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.03)] dark:text-[#f2e8dc] dark:shadow-[0_16px_26px_rgba(0,0,0,0.18)]"
  >
    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${accentClassName}`}>
      <span className={iconClassName}>{icon}</span>
    </span>
    <span className="flex-1">{label}</span>
    <span className="text-[#8a7b8d] transition-transform group-hover:translate-x-0.5 dark:text-[#baaea3]">
      <ArrowRightIcon />
    </span>
  </Link>
);

const EmptyPanel: React.FC<{ title: string; body: string; actionLabel: string; to: string; imageSrc?: string; imageAlt?: string }> = ({
  title,
  body,
  actionLabel,
  to,
  imageSrc,
  imageAlt
}) => (
  <div className="relative flex h-full min-h-[320px] w-full flex-col items-center justify-center overflow-hidden rounded-[30px] border border-[#eee3ef] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),rgba(255,255,255,0.82)_48%,rgba(255,242,249,0.7)_100%),linear-gradient(180deg,rgba(255,252,251,0.96),rgba(251,246,255,0.92))] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_28px_55px_rgba(224,176,177,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),rgba(255,255,255,0.03)_48%,rgba(255,207,164,0.04)_100%),linear-gradient(180deg,rgba(33,30,43,0.97),rgba(27,24,36,0.96))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_28px_55px_rgba(0,0,0,0.26)]">
    <div className="pointer-events-none absolute inset-x-12 bottom-4 h-20 rounded-full bg-gradient-to-r from-[#f5cddf]/35 via-[#dccdfb]/30 to-[#ffd7a4]/30 blur-3xl dark:from-[#6b4460]/18 dark:via-[#4a3f6a]/18 dark:to-[#6a5134]/18" />
    {imageSrc ? (
      <div className="relative z-10 mb-5 flex justify-center">
        <img src={imageSrc} alt={imageAlt || ''} className="h-40 w-auto max-w-full object-contain sm:h-44" />
      </div>
    ) : null}
    <p className="relative z-10 text-sm font-black uppercase tracking-[0.18em] text-[#8d5b81] dark:text-[#ebbda2]">{title}</p>
    <p className="relative z-10 mt-3 max-w-md text-sm font-medium leading-relaxed text-text-secondary">{body}</p>
    <Link
      to={to}
      className="relative z-10 mt-6 inline-flex items-center justify-center rounded-full border border-white/60 bg-white/80 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#5b4866] shadow-[0_14px_28px_rgba(227,183,196,0.16)] transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_34px_rgba(227,183,196,0.22)] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f4e7d8] dark:shadow-[0_14px_28px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.1]"
    >
      {actionLabel}
    </Link>
  </div>
);

const DashboardHero: React.FC<{ title: string; subtitle: string; chips: string[] }> = ({ title, subtitle, chips }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
    className="relative w-full overflow-hidden rounded-[34px] border border-[#eee2e7] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),rgba(255,255,255,0.78)_32%,rgba(255,238,243,0.78)_68%,rgba(255,240,219,0.9)_100%),linear-gradient(120deg,rgba(255,248,244,0.98),rgba(255,240,246,0.96)_50%,rgba(255,236,211,0.98)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_30px_65px_rgba(236,172,167,0.14)] xl:max-w-[960px] xl:mr-auto dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),rgba(255,255,255,0.02)_32%,rgba(240,157,181,0.05)_68%,rgba(255,193,118,0.06)_100%),linear-gradient(125deg,rgba(39,33,49,0.98),rgba(46,34,48,0.97)_48%,rgba(56,42,36,0.98)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_32px_70px_rgba(0,0,0,0.28)]"
  >
    <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-white/80 blur-3xl dark:bg-white/6" />
    <div className="pointer-events-none absolute right-[-4rem] top-8 h-48 w-48 rounded-full bg-[#ffd8ad]/45 blur-3xl dark:bg-[#ffb56b]/10" />
    <div className="pointer-events-none absolute bottom-[-4rem] left-[28%] h-40 w-40 rounded-full bg-[#f4c9df]/45 blur-3xl dark:bg-[#d785a7]/10" />

    <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.78fr] lg:items-center">
      <div className="max-w-xl">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-[#9d6f8c] dark:text-[#e5bc9e]">UrbanPrime overview</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">{title}</h2>
        <p className="mt-3 text-sm font-medium leading-7 text-text-secondary sm:text-base">{subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {chips.map((chip, index) => (
            <span
              key={chip}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.78rem] font-bold shadow-[0_16px_28px_rgba(226,186,196,0.14)] dark:shadow-[0_14px_24px_rgba(0,0,0,0.16)] ${
                index % 2 === 0
                  ? 'border-[#e8d7f2] bg-[linear-gradient(180deg,#fffefe,#f9f2ff)] text-[#6f54b3] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(85,63,107,0.32),rgba(61,44,83,0.24))] dark:text-[#eadcfb]'
                  : 'border-[#f1d9dd] bg-[linear-gradient(180deg,#fffdfd,#fff4f8)] text-[#ef5d8f] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(114,61,86,0.34),rgba(82,43,63,0.24))] dark:text-[#ffc5d7]'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-current opacity-75" />
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center lg:justify-end">
        <div className="pointer-events-none absolute inset-x-10 bottom-0 h-20 rounded-full bg-gradient-to-r from-[#ffd9b3]/45 via-[#f3d3e8]/45 to-[#e2d7ff]/40 blur-3xl dark:from-[#7d5534]/14 dark:via-[#6d4565]/14 dark:to-[#544978]/14" />
        <img
          src={dashboardHeroArtwork}
          alt="UrbanPrime dashboard hero illustration"
          className="relative z-10 w-full max-w-[360px] object-contain drop-shadow-[0_28px_60px_rgba(255,170,110,0.18)] lg:max-w-[390px]"
        />
      </div>
    </div>
  </motion.div>
);

const defaultBuyerSnapshot: BuyerDashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  summary: { totalOrders: 0, pendingOrders: 0, completedOrders: 0, activeRentals: 0, upcomingReturns: 0, totalPurchases: 0, wishlistItems: 0, unreadNotifications: 0, conversations: 0 },
  recentOrders: [],
  upcomingReturns: []
};

const defaultSellerSnapshot: SellerDashboardSnapshot = {
  generatedAt: new Date().toISOString(),
  summary: { totalRevenue: 0, pendingOrders: 0, completedOrders: 0, totalSalesUnits: 0, totalViews: 0, conversionRate: 0, lowStockCount: 0, unreadMessages: 0 },
  earningsByMonth: [],
  categorySales: [],
  recentOrders: [],
  lowStockItems: [],
  insights: [],
  setup: { hasStore: false, hasProducts: false, hasContent: false, hasApps: false }
};

const DashboardOverview: React.FC = () => {
  const { user, activePersona } = useAuth();

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const [buyerSnapshot, setBuyerSnapshot] = useState<BuyerDashboardSnapshot>(defaultBuyerSnapshot);
  const [sellerSnapshot, setSellerSnapshot] = useState<SellerDashboardSnapshot>(defaultSellerSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  const isSellerWorkspace = activePersona?.type === 'seller';
  const isProviderWorkspace = activePersona?.type === 'provider';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const snapshot = isSellerWorkspace 
          ? await dashboardService.getSellerDashboardSnapshot(8)
          : await dashboardService.getBuyerDashboardSnapshot(8);
        
        if (isSellerWorkspace) {
          setSellerSnapshot(snapshot as SellerDashboardSnapshot);
        } else {
          setBuyerSnapshot(snapshot as BuyerDashboardSnapshot);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isSellerWorkspace, user]);

  if (isLoading) return <DashboardPageLoader title="Loading dashboard..." />;
  if (!user) return null;

  const buyerStatCards = [
    {
      label: 'TOTAL ORDERS',
      value: buyerSnapshot.summary.totalOrders,
      subtext: `${buyerSnapshot.summary.completedOrders} completed`,
      to: '/profile/orders',
      icon: <OrdersBagIcon />,
      iconShellClassName: 'bg-[linear-gradient(180deg,#e4d6ff,#d8c6ff)]',
      iconClassName: 'text-[#6f42d3]',
      sparklineColor: '#7c4dff',
      sparklineValues: [14, 18, 16, 23, 21, 29, 42]
    },
    {
      label: 'PENDING ORDERS',
      value: buyerSnapshot.summary.pendingOrders,
      subtext: 'Needs review',
      to: '/profile/orders',
      icon: <PendingClockIcon />,
      iconShellClassName: 'bg-[linear-gradient(180deg,#ffb04c,#ff9427)]',
      iconClassName: 'text-white',
      sparklineColor: '#ff9427',
      sparklineValues: [10, 12, 9, 18, 16, 26, 30]
    },
    {
      label: 'ACTIVE RENTALS',
      value: buyerSnapshot.summary.activeRentals,
      subtext: 'Current bookings',
      to: '/profile/orders',
      icon: <RentalsCalendarIcon />,
      iconShellClassName: 'bg-[linear-gradient(180deg,#42cf88,#2fbb72)]',
      iconClassName: 'text-white',
      sparklineColor: '#34c67a',
      sparklineValues: [9, 15, 13, 22, 20, 35, 28]
    },
    {
      label: 'WISHLIST',
      value: buyerSnapshot.summary.wishlistItems,
      subtext: 'Saved products',
      to: '/profile/wishlist',
      icon: <WishlistHeartIcon />,
      iconShellClassName: 'bg-[linear-gradient(180deg,#ff4d92,#ff2d78)]',
      iconClassName: 'text-white',
      sparklineColor: '#ff4b8d',
      sparklineValues: [8, 16, 13, 19, 17, 31, 38]
    }
  ];

  const buyerQuickActions = [
    {
      label: 'Add New Workspace',
      to: '/profile/switch-accounts',
      icon: <WorkspaceAddIcon />,
      accentClassName: 'bg-[linear-gradient(180deg,#fff0f5,#ffe2ec)]',
      iconClassName: 'text-[#f05192]'
    },
    {
      label: 'View Analytics',
      to: '/profile/analytics',
      icon: <AnalyticsIcon />,
      accentClassName: 'bg-[linear-gradient(180deg,#fff4ea,#ffe3ca)]',
      iconClassName: 'text-[#ff9736]'
    },
    {
      label: 'Browse Library',
      to: '/profile/digital-library',
      icon: <LibraryIcon />,
      accentClassName: 'bg-[linear-gradient(180deg,#f1eaff,#e8deff)]',
      iconClassName: 'text-[#8053e5]'
    },
    {
      label: 'Help Center',
      to: '/profile/help',
      icon: <HelpIcon />,
      accentClassName: 'bg-[linear-gradient(180deg,#edfdf2,#dcf8e6)]',
      iconClassName: 'text-[#33bb68]'
    }
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <DashboardHero
        title={`Welcome back, ${user?.name || 'Urbanite'}! 👋`}
        subtitle={
          isSellerWorkspace
            ? 'Your premium business dashboard is ready.'
            : isProviderWorkspace
              ? 'This page stays focused on account overview. The provider hub now lives as its own dedicated workspace.'
              : 'Track orders, rentals, and conversations.'
        }
        chips={
          isSellerWorkspace
            ? ['Premium Access', 'Glass UI', 'Real-time Sync']
            : isProviderWorkspace
              ? ['Account overview', 'Provider hub separate', 'Messages synced']
              : [`${buyerSnapshot.summary.pendingOrders} pending`, `${buyerSnapshot.summary.wishlistItems} wishlist`]
        }
      />

      {isSellerWorkspace ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={itemVariants}><GlassStatCard label="Total Revenue" value={`$${sellerSnapshot.summary.totalRevenue.toLocaleString()}`} subtext="All-time earnings" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Sales Units" value={sellerSnapshot.summary.totalSalesUnits} subtext="Units sold to date" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Pending Orders" value={sellerSnapshot.summary.pendingOrders} subtext="Requiring fulfillment" /></motion.div>
            <motion.div variants={itemVariants}><GlassStatCard label="Conversion Rate" value={`${sellerSnapshot.summary.conversionRate.toFixed(1)}%`} subtext="Visitor to order ratio" /></motion.div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
            <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="p-6 glass-panel">
              <h3 className="text-xl font-black text-text-primary">Earnings Overview</h3>
              <div className="mt-6 h-[300px] w-full">
                {sellerSnapshot.earningsByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sellerSnapshot.earningsByMonth}>
                      <defs><linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} /><stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="month" stroke="var(--dash-border)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--dash-border)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip contentStyle={{ background: 'var(--dash-surface)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid var(--dash-border)', color: 'inherit' }} />
                      <Area type="monotone" dataKey="earnings" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyPanel
                    title="Earnings will chart here"
                    body="Once orders and payouts flow through your storefront, this view becomes a month-by-month pulse of revenue."
                    actionLabel="Open products"
                    to="/profile/products"
                  />
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.3 }} className="p-6 glass-panel">
              <h3 className="text-xl font-black text-text-primary">Sales by Category</h3>
              <div className="mt-6 h-[300px] w-full">
                {sellerSnapshot.categorySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sellerSnapshot.categorySales} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                        {sellerSnapshot.categorySales.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--dash-surface)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid var(--dash-border)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyPanel
                    title="Category mix appears after sales"
                    body="List a few items with clear categories so shoppers can discover you; sales volume will fill this breakdown."
                    actionLabel="Manage storefront"
                    to="/profile/store"
                  />
                )}
              </div>
            </motion.div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <SellerActionCenter pendingShipments={sellerSnapshot.summary.pendingOrders} lowStockItems={sellerSnapshot.lowStockItems} unreadMessages={sellerSnapshot.summary.unreadMessages} />
            <AIGrowthInsights insights={sellerSnapshot.insights} />
          </div>
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {buyerStatCards.map((card) => (
              <motion.div key={card.label} variants={itemVariants}>
                <BuyerOverviewStatCard {...card} />
              </motion.div>
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div variants={itemVariants}>
              <BuyerOverviewPanel
                title="Upcoming Returns"
                icon={<RentalsCalendarIcon />}
                iconShellClassName="bg-[linear-gradient(180deg,#eee1ff,#e4d3ff)]"
                iconClassName="text-[#7b4cdf]"
              >
                {buyerSnapshot.upcomingReturns.length > 0 ? (
                  <div className="space-y-3">
                    {buyerSnapshot.upcomingReturns.map((entry) => (
                      <Link
                        key={entry.orderItemId}
                        to={`/profile/orders/${entry.orderId}`}
                        className="block rounded-[24px] border border-[#eee3ea] bg-[linear-gradient(180deg,#fffefe,#fffafa)] p-4 shadow-[0_18px_30px_rgba(230,207,217,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_34px_rgba(230,207,217,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] dark:shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                      >
                        <p className="text-sm font-bold text-text-primary">{entry.itemTitle}</p>
                        <p className="mt-1 text-xs font-medium text-text-secondary opacity-80">
                          Due {new Date(entry.rentalEnd).toLocaleDateString()} | Qty {entry.quantity}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    title="No returns due soon"
                    body="You're all caught up. Return reminders will appear here whenever an active rental is due back."
                    actionLabel="Browse rentals"
                    to="/browse"
                    imageSrc={returnsArtwork}
                    imageAlt="UrbanPrime returns illustration"
                  />
                )}
              </BuyerOverviewPanel>
            </motion.div>

            <motion.div variants={itemVariants}>
              <BuyerOverviewPanel
                title="Recent Orders"
                icon={<OrdersBagIcon />}
                iconShellClassName="bg-[linear-gradient(180deg,#ddf5e6,#c9edd6)]"
                iconClassName="text-[#35b26a]"
              >
                {buyerSnapshot.recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {buyerSnapshot.recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        to={`/profile/orders/${order.id}`}
                        className="block rounded-[24px] border border-[#eee3ea] bg-[linear-gradient(180deg,#fffefe,#fffafa)] p-4 shadow-[0_18px_30px_rgba(230,207,217,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_34px_rgba(230,207,217,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] dark:shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="text-sm font-bold text-text-primary">Order #{order.id.slice(0, 8)}</p>
                            <p className="mt-1 text-xs font-medium text-text-secondary opacity-80">
                              {new Date(order.createdAt).toLocaleDateString()} | {order.quantityTotal} items
                            </p>
                          </div>
                          <span className="text-xs font-black text-[#ef5e8f] dark:text-[#ffb4ca]">
                            {order.currency} {order.total.toFixed(2)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    title="No recent orders yet"
                    body="Your recent orders will appear here as soon as your first purchase or rental is placed."
                    actionLabel="View orders"
                    to="/profile/orders"
                    imageSrc={noOrdersArtwork}
                    imageAlt="UrbanPrime no orders illustration"
                  />
                )}
              </BuyerOverviewPanel>
            </motion.div>
          </div>

          <motion.section
            variants={itemVariants}
            className="rounded-[32px] border border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] p-6 shadow-[0_28px_55px_rgba(224,196,196,0.11),inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_26px_50px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="grid gap-4 xl:grid-cols-[180px_1fr] xl:items-center">
              <div>
                <p className="text-sm font-black tracking-tight text-text-primary">Quick Actions</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {buyerQuickActions.map((action) => (
                  <QuickActionButton key={action.label} {...action} />
                ))}
              </div>
            </div>
          </motion.section>
        </>
      )}
    </motion.div>
  );
};

export default DashboardOverview;
