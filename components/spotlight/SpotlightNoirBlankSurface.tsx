import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import SpotlightBrand, { SpotlightBrandIcon } from './SpotlightBrand';
import SpotlightHomeFeed from './SpotlightHomeFeed';
import SpotlightSidebarNavButton from './SpotlightSidebarNavButton';

type SpotlightNoirBlankSurfaceProps = {
  variant?: 'auto' | 'home' | 'profile' | 'compose' | 'messages' | 'notifications';
  children?: ReactNode;
};

type SurfaceKind = 'home' | 'detail' | 'profile' | 'compose' | 'messages' | 'notifications';

type ChromeItem = {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: number;
};

const motionEase = [0.22, 1, 0.36, 1] as const;
const SIDEBAR_COLLAPSE_STORAGE_KEY = 'urbanprime:spotlight:noir-sidebar-collapsed:v1';
const headingFontStyle = { fontFamily: 'Inter, "Segoe UI", sans-serif' } as const;

const ghostButtonClass =
  'inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition duration-200 hover:bg-white/[0.06] hover:text-white';
const solidButtonClass =
  'inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(234,234,234,0.94))] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(255,255,255,0.08)] transition duration-200 hover:brightness-95';
const headerPillClass =
  'rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,22,0.94),rgba(8,8,10,0.92))] shadow-[0_18px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[18px]';
const sidebarRailClass =
  'relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(17,18,21,0.95),rgba(9,10,12,0.95))] shadow-[0_24px_54px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[20px]';
const sidebarCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(17,18,21,0.94),rgba(9,10,12,0.94))] shadow-[0_18px_36px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[18px]';
const sidebarPrimaryButtonClass =
  'inline-flex w-full items-center justify-center gap-3 rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,236,236,0.94))] px-4 py-3 text-[14px] font-semibold text-black shadow-[0_14px_26px_rgba(255,255,255,0.08)] transition duration-200 hover:brightness-95';
const sidebarToggleClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition duration-200 hover:bg-white/[0.06] hover:text-white';
const surfacePanelClass =
  'rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,20,0.94),rgba(8,8,10,0.92))] shadow-[0_22px_48px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[22px]';
const surfacePanelStrongClass =
  'rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(124,211,255,0.08),rgba(255,255,255,0)_28%),linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.94))] shadow-[0_26px_58px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[24px]';
const insetStripClass = 'rounded-[24px] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="M12 3 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="m12 3 2.7 5.9 6.4.9-4.7 4.4 1.2 6.5L12 17.6 6.4 20.7l1.2-6.5L3 9.8l6.4-.9Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="M4 5.5h16v10.2H8.3L4 19Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="M12 3.5a5.9 5.9 0 0 0-5.9 5.9v3.3L4.4 15.7a.9.9 0 0 0 .8 1.3h13.6a.9.9 0 0 0 .8-1.3l-1.7-3V9.4A5.9 5.9 0 0 0 12 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.8 19a2.4 2.4 0 0 0 4.4 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 20a7.6 7.6 0 0 1 15 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 10h10" strokeLinecap="round" />
    <path d="m10 6 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="m12.5 4.5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="m7.5 4.5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparklineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="M4 16.5 9.2 11l3.3 3.2 7.5-8.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 6v4h-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProfileAvatar: React.FC<{
  src?: string;
  label: string;
  className?: string;
}> = ({ src, label, className = 'h-11 w-11' }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={label}
        onError={() => setHasError(true)}
        className={`${className} rounded-full object-cover shadow-[0_10px_24px_rgba(0,0,0,0.28)]`}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.2),rgba(255,255,255,0.05)_44%,rgba(255,255,255,0)_78%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-xs font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)]`}
    >
      {initials || 'UP'}
    </div>
  );
};

const SurfaceCard: React.FC<{
  children: ReactNode;
  className?: string;
  strong?: boolean;
}> = ({ children, className = '', strong = false }) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.42, ease: motionEase }}
    whileHover={{ y: -3 }}
    className={`${strong ? surfacePanelStrongClass : surfacePanelClass} ${className}`}
  >
    {children}
  </motion.section>
);

const SectionEyebrow: React.FC<{ children: ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/42">{children}</p>
);

const MetricPill: React.FC<{ children: ReactNode }> = ({ children }) => (
  <span className="rounded-full bg-white/[0.045] px-3 py-1.5 text-[11px] font-semibold text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    {children}
  </span>
);

const StatTile: React.FC<{
  label: string;
  value: string;
  detail: string;
}> = ({ label, value, detail }) => (
  <div className={`${insetStripClass} p-4`}>
    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">{label}</p>
    <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
      {value}
    </p>
    <p className="mt-2 text-sm leading-relaxed text-white/54">{detail}</p>
  </div>
);

const PlaceholderStage: React.FC<{
  label: string;
  minHeightClass?: string;
}> = ({ label, minHeightClass = 'min-h-[260px]' }) => (
  <div className={`${insetStripClass} p-5 ${minHeightClass}`}>
    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/36">{label}</p>
    <div className="mt-6 space-y-3">
      <div className="h-3 w-28 rounded-full bg-white/10" />
      <div className="h-3 w-44 rounded-full bg-white/[0.08]" />
      <div className="h-3 w-20 rounded-full bg-white/10" />
    </div>
  </div>
);

const ConversationBubble: React.FC<{
  role: 'them' | 'you';
  text: string;
  meta: string;
}> = ({ role, text, meta }) => (
  <div className={`flex ${role === 'you' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[78%] rounded-[24px] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        role === 'you'
          ? 'bg-white text-black shadow-[0_18px_34px_rgba(255,255,255,0.1)]'
          : 'bg-white/[0.05] text-white/86'
      }`}
    >
      <p className="text-sm leading-relaxed">{text}</p>
      <p className={`mt-2 text-[11px] font-medium ${role === 'you' ? 'text-black/55' : 'text-white/42'}`}>{meta}</p>
    </div>
  </div>
);

const NavigationGroup: React.FC<{
  items: ChromeItem[];
}> = ({ items }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        className={`group inline-flex items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm font-semibold transition duration-200 ${
          item.active
            ? 'bg-white text-black shadow-[0_16px_32px_rgba(255,255,255,0.14)]'
            : 'bg-white/[0.04] text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:-translate-y-0.5 hover:bg-white/[0.07] hover:text-white'
        }`}
      >
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
            item.active
              ? 'bg-black/[0.08]'
              : 'bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]'
          }`}
        >
          {item.icon}
          {item.badge && item.badge > 0 ? (
            <span className={`absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ${
              item.active ? 'bg-black text-white' : 'bg-white text-black'
            }`}>
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          ) : null}
        </span>
        <span className="tracking-[-0.02em]">{item.label}</span>
      </Link>
    ))}
  </div>
);

const SpotlightNoirBlankSurface: React.FC<SpotlightNoirBlankSurfaceProps> = ({ variant = 'auto', children }) => {
  const location = useLocation();
  const { unreadNotificationCount } = useNotification();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  const viewerName = String(user?.name || 'Urban Prime Creator').trim() || 'Urban Prime Creator';
  const avatarSrc = String((user as { avatar?: string; photoURL?: string } | null)?.avatar || (user as { avatar?: string; photoURL?: string } | null)?.photoURL || '').trim();
  const profileHref = '/spotlight/profile';

  const surfaceKind = useMemo<SurfaceKind>(() => {
    if (location.pathname.startsWith('/spotlight/messages')) return 'messages';
    if (location.pathname.startsWith('/spotlight/notifications')) return 'notifications';
    if (location.pathname.startsWith('/spotlight/profile') || location.pathname.startsWith('/profile/')) return 'profile';
    if (location.pathname.startsWith('/spotlight/create')) return 'compose';
    if (location.pathname.startsWith('/spotlight/post/')) return 'detail';
    if (variant === 'messages') return 'messages';
    if (variant === 'notifications') return 'notifications';
    if (variant === 'profile') return 'profile';
    if (variant === 'compose') return 'compose';
    return 'home';
  }, [location.pathname, variant]);

  const postId = useMemo(() => {
    const match = location.pathname.match(/\/spotlight\/post\/([^/]+)/);
    return match?.[1] || '';
  }, [location.pathname]);

  const profileSlug = useMemo(() => {
    const match = location.pathname.match(/\/profile\/([^/]+)/);
    return decodeURIComponent(match?.[1] || '');
  }, [location.pathname]);

  const profileLabel = profileSlug ? `@${profileSlug}` : viewerName;
  const profileHandle = profileSlug ? `@${profileSlug}` : `@${String(user?.id || 'spotlight.studio').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 18) || 'spotlight.studio'}`;

  const sidebarItems = useMemo<ChromeItem[]>(
    () => [
      {
        to: '/',
        label: 'Home',
        icon: <HomeIcon />,
        active: location.pathname === '/'
      },
      {
        to: '/spotlight',
        label: 'Explore',
        icon: <ExploreIcon />,
        active: surfaceKind === 'home' || surfaceKind === 'detail' || surfaceKind === 'compose'
      },
      {
        to: '/spotlight/messages',
        label: 'Messages',
        icon: <MessageIcon />,
        active: surfaceKind === 'messages'
      },
      {
        to: '/spotlight/notifications',
        label: 'Notifications',
        icon: <BellIcon />,
        active: surfaceKind === 'notifications',
        badge: unreadNotificationCount
      }
    ],
    [location.pathname, surfaceKind, unreadNotificationCount]
  );

  const headerItems = useMemo<ChromeItem[]>(
    () => [
      {
        to: '/',
        label: 'Home',
        icon: <HomeIcon />,
        active: location.pathname === '/'
      },
      {
        to: '/spotlight',
        label: 'Explore',
        icon: <ExploreIcon />,
        active: surfaceKind === 'home' || surfaceKind === 'detail' || surfaceKind === 'compose'
      },
      {
        to: '/spotlight/notifications',
        label: 'Notifications',
        icon: <BellIcon />,
        active: surfaceKind === 'notifications',
        badge: unreadNotificationCount
      },
      {
        to: profileHref,
        label: 'Profile',
        icon: <UserIcon />,
        active: surfaceKind === 'profile'
      }
    ],
    [location.pathname, profileHref, surfaceKind, unreadNotificationCount]
  );

  const notificationFeed = useMemo(
    () => [
      {
        title: 'Creator orbit is expanding',
        detail: `${viewerName} picked up fresh attention after a premium repost and two saves.`,
        meta: 'Followers',
        time: '02m'
      },
      {
        title: 'Comment thread needs a reply',
        detail: 'A high-intent buyer asked for shipping timing on your latest drop.',
        meta: 'Comments',
        time: '11m'
      },
      {
        title: 'Notification digest prepared',
        detail: 'Daily summary is ready for email, push, and in-app delivery.',
        meta: 'Digest',
        time: '42m'
      },
      {
        title: 'Momentum spike detected',
        detail: 'Reach lifted 28% against the last spotlight window with stronger replay depth.',
        meta: 'Analytics',
        time: '3h'
      }
    ],
    [viewerName]
  );

  const messageThreads = useMemo(
    () => [
      {
        name: 'Studio concierge',
        snippet: 'Launch assets are framed and ready for final review.',
        status: 'Priority',
        time: 'Now',
        unread: 2,
        active: true
      },
      {
        name: 'Maya Nova',
        snippet: 'Can we lock the spotlight teaser sequence today?',
        status: 'Creator',
        time: '24m',
        unread: 0,
        active: false
      },
      {
        name: 'Affiliate desk',
        snippet: 'Tracking links are live with the new campaign set.',
        status: 'Campaign',
        time: '1h',
        unread: 1,
        active: false
      },
      {
        name: 'Client success',
        snippet: 'Your delivery note was pinned inside the request room.',
        status: 'Requests',
        time: 'Yesterday',
        unread: 0,
        active: false
      }
    ],
    []
  );

  const conversationPreview = useMemo(
    () => [
      {
        role: 'them' as const,
        text: 'The cinematic crop feels right. I only want the headline card to land a bit stronger.',
        meta: 'Studio concierge · 09:14'
      },
      {
        role: 'you' as const,
        text: 'I’ll harden that hero card and keep the rest darker so the content stands out instead of glowing.',
        meta: 'You · 09:16'
      },
      {
        role: 'them' as const,
        text: 'Perfect. Keep the cards premium and let the messaging lane stay easy to scan.',
        meta: 'Studio concierge · 09:18'
      }
    ],
    []
  );

  const profileHighlights = useMemo(
    () => [
      {
        title: 'Spotlight identity',
        detail: 'A premium social layer for creator updates, launch drops, and curated community replies.'
      },
      {
        title: 'Pinned direction',
        detail: 'Muted noir glass, bold headings, and clean high-contrast controls that hold up with real data later.'
      },
      {
        title: 'Next data hookup',
        detail: 'Followers, reach, messages, and notification streams can slot straight into these cards without rebuilding layout.'
      }
    ],
    []
  );

  const profileShowcase = useMemo(
    () => [
      { label: 'Pinned story', title: 'Launch rhythm', meta: 'Hero sequence · 4 slides' },
      { label: 'Saved concept', title: 'Channel redesign', meta: 'Board ready · 7 cards' },
      { label: 'Audience note', title: 'Top performing caption', meta: 'Replay lift · +18%' }
    ],
    []
  );

  const desktopSidebar = surfaceKind === 'home';
  const profileIsActive = surfaceKind === 'profile';

  const shellBody = (() => {
    if (children) {
      return <div className="min-w-0">{children}</div>;
    }

    if (surfaceKind === 'home') {
      return <SpotlightHomeFeed />;
    }

    if (surfaceKind === 'messages') {
      return (
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <SurfaceCard strong className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <SectionEyebrow>Messages hub</SectionEyebrow>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl" style={headingFontStyle}>
                  Conversations built for focus.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/56 sm:text-[15px]">
                  This is the Spotlight inbox surface for replies, requests, and creator coordination. Live message data can
                  drop into these lanes later without changing the layout.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label="Open threads" value="18" detail="Priority and creator chats waiting inside one polished rail." />
                <StatTile label="Unread" value="03" detail="Fresh replies surfaced without flooding the rest of the page." />
                <StatTile label="Response pace" value="12m" detail="Average first reply timing across active conversations." />
              </div>
            </div>
          </SurfaceCard>

          <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <SurfaceCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <SectionEyebrow>Thread rail</SectionEyebrow>
                  <p className="mt-2 text-xl font-semibold text-white" style={headingFontStyle}>
                    Inbox layers
                  </p>
                </div>
                <MetricPill>Synced</MetricPill>
              </div>

              <div className={`${insetStripClass} mt-4 h-11 px-4 py-3 text-sm text-white/32`}>
                Search threads, brands, or requests
              </div>

              <div className="mt-4 space-y-2">
                {messageThreads.map((thread) => (
                  <article
                    key={thread.name}
                    className={`rounded-[24px] px-4 py-3 transition ${
                      thread.active
                        ? 'bg-white text-black shadow-[0_18px_34px_rgba(255,255,255,0.1)]'
                        : 'bg-white/[0.045] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{thread.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                            thread.active ? 'bg-black/10 text-black/60' : 'bg-white/[0.06] text-white/46'
                          }`}>
                            {thread.status}
                          </span>
                        </div>
                        <p className={`mt-2 text-sm leading-relaxed ${thread.active ? 'text-black/66' : 'text-white/54'}`}>
                          {thread.snippet}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[11px] font-semibold ${thread.active ? 'text-black/56' : 'text-white/42'}`}>{thread.time}</span>
                        {thread.unread > 0 ? (
                          <span className={`flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                            thread.active ? 'bg-black text-white' : 'bg-white text-black'
                          }`}>
                            {thread.unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </SurfaceCard>

            <div className="space-y-5">
              <SurfaceCard className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar src={avatarSrc || undefined} label="Studio concierge" className="h-14 w-14" />
                    <div>
                      <SectionEyebrow>Live preview</SectionEyebrow>
                      <p className="mt-1 text-2xl font-semibold text-white" style={headingFontStyle}>
                        Studio concierge
                      </p>
                      <p className="mt-1 text-sm text-white/48">Priority review thread · Active now</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <MetricPill>2 attachments</MetricPill>
                    <MetricPill>Urgent review</MetricPill>
                    <MetricPill>Autosave on</MetricPill>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {conversationPreview.map((entry, index) => (
                    <ConversationBubble key={`${entry.meta}-${index}`} role={entry.role} text={entry.text} meta={entry.meta} />
                  ))}
                </div>

                <div className={`${insetStripClass} mt-6 flex items-center justify-between gap-3 px-4 py-3`}>
                  <span className="text-sm text-white/34">Draft a reply, attach a brief, or drop a launch file.</span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-black">
                    Composer
                  </span>
                </div>
              </SurfaceCard>

              <div className="grid gap-5 lg:grid-cols-2">
                <SurfaceCard className="p-5">
                  <SectionEyebrow>Shared orbit</SectionEyebrow>
                  <div className="mt-4 space-y-3">
                    {['Launch storyboard.pdf', 'Caption grid v2.fig', 'Motion timing notes'].map((asset) => (
                      <div key={asset} className={`${insetStripClass} flex items-center justify-between px-4 py-3`}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/72">
                            <SparklineIcon />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{asset}</p>
                            <p className="mt-1 text-xs text-white/42">Pinned for the next production pass</p>
                          </div>
                        </div>
                        <ArrowIcon />
                      </div>
                    ))}
                  </div>
                </SurfaceCard>

                <SurfaceCard className="p-5">
                  <SectionEyebrow>Workflow cues</SectionEyebrow>
                  <div className="mt-4 space-y-3">
                    {[
                      'Mark high-intent threads before feed publishing.',
                      'Pull proposal cards into the inbox once service workflows connect.',
                      'Keep creator replies compact so the lane stays scannable.'
                    ].map((note) => (
                      <div key={note} className={`${insetStripClass} px-4 py-3 text-sm leading-relaxed text-white/58`}>
                        {note}
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (surfaceKind === 'notifications') {
      return (
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <SurfaceCard strong className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <SectionEyebrow>Notifications hub</SectionEyebrow>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl" style={headingFontStyle}>
                  Everything that moved today.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/56 sm:text-[15px]">
                  Likes, follows, comment pressure, and reach spikes land here in a darker, quieter notification surface.
                  We can connect the real stream later without redesigning the page.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label="Unread" value={`${Math.max(3, unreadNotificationCount)}`} detail="Attention points that still need a reply, review, or follow-up." />
                <StatTile label="Mentions" value="07" detail="Comment callouts and creator pings stacked into one column." />
                <StatTile label="Reach lift" value="+28%" detail="Momentum compared with the last active Spotlight window." />
              </div>
            </div>
          </SurfaceCard>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SurfaceCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <SectionEyebrow>Live feed</SectionEyebrow>
                  <p className="mt-2 text-2xl font-semibold text-white" style={headingFontStyle}>
                    Priority activity
                  </p>
                </div>
                <MetricPill>Realtime soon</MetricPill>
              </div>

              <div className="mt-5 space-y-3">
                {notificationFeed.map((entry) => (
                  <article key={`${entry.title}-${entry.time}`} className={`${insetStripClass} px-4 py-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/56">
                            {entry.meta}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{entry.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-white/54">{entry.detail}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-white/42">{entry.time}</span>
                    </div>
                  </article>
                ))}
              </div>
            </SurfaceCard>

            <div className="space-y-5">
              <SurfaceCard className="p-5">
                <SectionEyebrow>Filter stack</SectionEyebrow>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['All activity', 'Mentions', 'Followers', 'Reach alerts', 'Saved posts'].map((chip, index) => (
                    <span
                      key={chip}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        index === 0
                          ? 'bg-white text-black shadow-[0_14px_28px_rgba(255,255,255,0.1)]'
                          : 'bg-white/[0.05] text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                      }`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className={`${insetStripClass} mt-4 px-4 py-4`}>
                  <p className="text-sm font-semibold text-white">Digest routing</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/52">
                    Push for urgent mentions, in-app for creator actions, and daily email for slow-burn analytics changes.
                  </p>
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-5">
                <SectionEyebrow>Next actions</SectionEyebrow>
                <div className="mt-4 space-y-3">
                  {[
                    'Reply to top comment before the replay window cools.',
                    'Approve digest preferences before live notification sync.',
                    'Connect launch cards to alert badges after feed data lands.'
                  ].map((action) => (
                    <div key={action} className={`${insetStripClass} px-4 py-3 text-sm leading-relaxed text-white/56`}>
                      {action}
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <SurfaceCard className="p-5">
              <SectionEyebrow>Comment velocity</SectionEyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                4.2x
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/54">Reply momentum is strongest within the first hour of publishing.</p>
            </SurfaceCard>
            <SurfaceCard className="p-5">
              <SectionEyebrow>Follower quality</SectionEyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                81%
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/54">Most new follows are arriving from premium creator discovery rather than random feed drift.</p>
            </SurfaceCard>
            <SurfaceCard className="p-5">
              <SectionEyebrow>Saved for later</SectionEyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                12
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/54">High-intent saves signal which spotlight cards deserve pinned placement next.</p>
            </SurfaceCard>
          </div>
        </div>
      );
    }

    if (surfaceKind === 'profile') {
      return (
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <SurfaceCard strong className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <ProfileAvatar src={avatarSrc || undefined} label={profileLabel} className="h-24 w-24 sm:h-28 sm:w-28" />
                <div className="min-w-0">
                  <SectionEyebrow>Profile deck</SectionEyebrow>
                  <h1 className="mt-3 truncate text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl" style={headingFontStyle}>
                    {profileLabel}
                  </h1>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-white/36">{profileHandle}</p>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/56 sm:text-[15px]">
                    This is the premium Spotlight profile surface. Bio, audience stats, saved storylines, and creator metrics
                    can be wired in here later without changing the visual system.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <MetricPill>Creator identity</MetricPill>
                    <MetricPill>Story cards</MetricPill>
                    <MetricPill>Audience dashboard</MetricPill>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/spotlight/create" className={solidButtonClass}>
                  <PlusIcon />
                  <span>Create spotlight</span>
                </Link>
                <Link to="/spotlight" className={ghostButtonClass}>
                  <span>Back to explore</span>
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </SurfaceCard>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-3">
                <SurfaceCard className="p-5">
                  <SectionEyebrow>Followers</SectionEyebrow>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                    18.4K
                  </p>
                  <p className="mt-2 text-sm text-white/54">Premium audience growth held in one clean stat layer.</p>
                </SurfaceCard>
                <SurfaceCard className="p-5">
                  <SectionEyebrow>Reach</SectionEyebrow>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                    241K
                  </p>
                  <p className="mt-2 text-sm text-white/54">Monthly discovery headroom once Spotlight analytics connect.</p>
                </SurfaceCard>
                <SurfaceCard className="p-5">
                  <SectionEyebrow>Saved cards</SectionEyebrow>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white" style={headingFontStyle}>
                    36
                  </p>
                  <p className="mt-2 text-sm text-white/54">Pinned visual stories ready to be surfaced in public view.</p>
                </SurfaceCard>
              </div>

              <SurfaceCard className="p-5 sm:p-6">
                <SectionEyebrow>Profile narrative</SectionEyebrow>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {profileHighlights.map((item) => (
                    <div key={item.title} className={`${insetStripClass} p-4`}>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-3 text-sm leading-relaxed text-white/54">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <SectionEyebrow>Showcase grid</SectionEyebrow>
                    <p className="mt-2 text-2xl font-semibold text-white" style={headingFontStyle}>
                      Spotlight cards ready for live content
                    </p>
                  </div>
                  <MetricPill>Data-ready layout</MetricPill>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {profileShowcase.map((item) => (
                    <article key={item.title} className={`${insetStripClass} p-4`}>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">{item.label}</p>
                      <p className="mt-5 text-xl font-semibold text-white" style={headingFontStyle}>
                        {item.title}
                      </p>
                      <p className="mt-3 text-sm text-white/50">{item.meta}</p>
                      <div className="mt-5 h-28 rounded-[20px] bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" />
                    </article>
                  ))}
                </div>
              </SurfaceCard>
            </div>

            <div className="space-y-5">
              <SurfaceCard className="p-5">
                <SectionEyebrow>Identity stack</SectionEyebrow>
                <div className="mt-4 space-y-3">
                  {[
                    'Creator category · Luxury storytelling',
                    'Visual direction · Midnight glass with hard contrast',
                    'Audience mode · Discovery first, replies second'
                  ].map((line) => (
                    <div key={line} className={`${insetStripClass} px-4 py-3 text-sm text-white/58`}>
                      {line}
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-5">
                <SectionEyebrow>Performance note</SectionEyebrow>
                <p className="mt-4 text-2xl font-semibold text-white" style={headingFontStyle}>
                  3 standout windows
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/54">
                  Launch day, repost bursts, and direct audience questions are the moments this layout is designed to surface most clearly.
                </p>

                <div className="mt-5 space-y-3">
                  {['Launch peak · 9:00 PM', 'Reply burst · 42 min window', 'Follower lift · +640 in 24h'].map((item) => (
                    <div key={item} className={`${insetStripClass} px-4 py-3 text-sm font-semibold text-white/72`}>
                      {item}
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </div>
        </div>
      );
    }

    if (surfaceKind === 'compose') {
      return (
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <SurfaceCard strong className="p-6 sm:p-8">
            <SectionEyebrow>Create page</SectionEyebrow>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl" style={headingFontStyle}>
              Composer shell
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/56 sm:text-[15px]">
              The publishing surface stays in the same darker system. Content tools can plug into these two panels next.
            </p>
          </SurfaceCard>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <SurfaceCard className="p-5">
              <PlaceholderStage label="Composer main slot" minHeightClass="min-h-[420px]" />
            </SurfaceCard>
            <SurfaceCard className="p-5">
              <PlaceholderStage label="Composer settings slot" minHeightClass="min-h-[420px]" />
            </SurfaceCard>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <SurfaceCard strong className="p-6 sm:p-8">
          <SectionEyebrow>Post detail</SectionEyebrow>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl" style={headingFontStyle}>
            {postId ? `Post ${postId.slice(0, 8)}` : 'Post shell'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/56 sm:text-[15px]">
            The detail surface stays dark and content-first so comments, engagement, and related cards can sit here later.
          </p>
        </SurfaceCard>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_340px]">
          <SurfaceCard className="p-5">
            <PlaceholderStage label="Viewer slot" minHeightClass="min-h-[520px]" />
          </SurfaceCard>
          <div className="space-y-5">
            <SurfaceCard className="p-5">
              <PlaceholderStage label="Comments rail slot" minHeightClass="min-h-[240px]" />
            </SurfaceCard>
            <SurfaceCard className="p-5">
              <PlaceholderStage label="Related slot" minHeightClass="min-h-[240px]" />
            </SurfaceCard>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <main className="pixe-noir-shell spotlight-theme-root relative min-h-[100svh] w-full text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />
        <div className="absolute left-[-6rem] top-20 h-72 w-72 rounded-full bg-sky-300/8 blur-[110px]" />
        <div className="absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-white/5 blur-[130px]" />
      </div>

      {desktopSidebar ? (
        <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: motionEase }}
            className="mx-auto max-w-7xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`${headerPillClass} px-4 py-3`}>
                <SpotlightBrand to="/spotlight" title="Spotlight" subtitle="Urban Prime" compact />
              </div>
              <div className={`${headerPillClass} p-2`}>
                <NavigationGroup items={sidebarItems} />
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5 lg:px-6">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: motionEase }}
            className="mx-auto max-w-7xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`${headerPillClass} px-4 py-3`}>
                <SpotlightBrand to="/spotlight" title="Spotlight" subtitle="Urban Prime" compact />
              </div>

              <div className={`${headerPillClass} p-2`}>
                <NavigationGroup items={headerItems} />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mx-auto max-w-[1360px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <div className={`grid gap-5 ${desktopSidebar ? 'lg:grid-cols-[236px_minmax(0,1fr)]' : ''}`}>
          {desktopSidebar ? (
            <motion.aside
              initial={{ opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: motionEase }}
              className="hidden lg:block"
            >
              <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col px-2">
                <div className="px-2">
                  <SpotlightBrand to="/spotlight" title="Spotlight" subtitle="Urban Prime" compact />
                </div>

                <div className="mt-8 space-y-1">
                  {sidebarItems.map((item) => (
                    <SpotlightSidebarNavButton
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      active={item.active}
                      badge={item.badge}
                      collapsed={false}
                    />
                  ))}
                </div>

                <div className="mt-6 px-2">
                  <Link to="/spotlight/create" className={sidebarPrimaryButtonClass} aria-label="Post">
                    <PlusIcon />
                    <span>Post</span>
                  </Link>
                </div>

                <div className="mt-auto px-2 pt-8">
                  <Link
                    to={profileHref}
                    className={`flex items-center gap-3 rounded-full border px-3.5 py-3 transition duration-200 ${
                      profileIsActive
                        ? 'border-white/[0.14] bg-white/[0.08] text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/84 hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <ProfileAvatar src={avatarSrc || undefined} label={profileLabel} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/36">Profile</p>
                      <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{profileLabel}</p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/68">
                      <ArrowIcon />
                    </span>
                  </Link>
                </div>
              </div>
            </motion.aside>
          ) : null}

          {shellBody}
        </div>
      </div>
    </main>
  );
};

export default SpotlightNoirBlankSurface;
