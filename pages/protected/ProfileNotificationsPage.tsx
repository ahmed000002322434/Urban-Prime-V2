import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import DashboardPageLoader from '../../components/dashboard/DashboardPageLoader';
import LottieAnimation from '../../components/LottieAnimation';
import { itemService, userService } from '../../services/itemService';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';
import type { Notification as NotificationEntry } from '../../types';

type FeedFilter = 'all' | 'unread' | 'orders' | 'messages' | 'updates';

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const OrderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 8.5h11l-.8 8.7a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6.5 8.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V7a3 3 0 0 1 6 0v2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h4" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 1 0 2 5.3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v7h-7" />
  </svg>
);

const filters: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'All activity' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'messages', label: 'Messages' },
  { id: 'updates', label: 'Updates' }
];

const getNotificationKind = (entry: NotificationEntry): Exclude<FeedFilter, 'all' | 'unread'> => {
  const normalizedType = String(entry.type || 'INFO').toUpperCase();
  if (normalizedType === 'MESSAGE') return 'messages';
  if (normalizedType === 'ORDER' || normalizedType === 'SALE') return 'orders';
  return 'updates';
};

const getNotificationMeta = (entry: NotificationEntry) => {
  const kind = getNotificationKind(entry);
  if (kind === 'messages') {
    return {
      label: 'Message',
      icon: <MessageIcon />,
      badgeClassName: 'border-[#d9ddff] bg-[linear-gradient(180deg,#f7f8ff,#eef0ff)] text-[#5a63d8] dark:border-[#3b4165] dark:bg-[linear-gradient(180deg,rgba(73,81,138,0.3),rgba(44,49,86,0.22))] dark:text-[#dfe3ff]',
      iconShellClassName: 'from-[#e6e9ff] via-[#dfe3ff] to-[#f5f6ff] text-[#5561d7] dark:from-[#2d3358] dark:via-[#262b48] dark:to-[#20253f] dark:text-[#dfe3ff]'
    };
  }
  if (kind === 'orders') {
    return {
      label: 'Order',
      icon: <OrderIcon />,
      badgeClassName: 'border-[#f4dcc5] bg-[linear-gradient(180deg,#fff7ef,#fff1e2)] text-[#c6722f] dark:border-[#5c4530] dark:bg-[linear-gradient(180deg,rgba(111,71,40,0.28),rgba(78,52,31,0.2))] dark:text-[#ffd2a2]',
      iconShellClassName: 'from-[#ffe7cf] via-[#ffdcb4] to-[#fff2df] text-[#c6722f] dark:from-[#4e3524] dark:via-[#5c3f2b] dark:to-[#3f2d21] dark:text-[#ffd2a2]'
    };
  }
  return {
    label: 'Update',
    icon: <SparkIcon />,
    badgeClassName: 'border-[#ebd7f1] bg-[linear-gradient(180deg,#fcf7ff,#f6efff)] text-[#8d52a8] dark:border-[#51385c] dark:bg-[linear-gradient(180deg,rgba(92,57,111,0.28),rgba(68,42,82,0.2))] dark:text-[#f0d6ff]',
    iconShellClassName: 'from-[#f2dcff] via-[#ecd4ff] to-[#fff0f7] text-[#9757b1] dark:from-[#3d2b48] dark:via-[#442e53] dark:to-[#38253f] dark:text-[#f0d6ff]'
  };
};

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Just now';

  const diffMs = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diffMs) < hour) {
    return relativeFormatter.format(Math.round(diffMs / minute), 'minute');
  }
  if (Math.abs(diffMs) < day) {
    return relativeFormatter.format(Math.round(diffMs / hour), 'hour');
  }
  return relativeFormatter.format(Math.round(diffMs / day), 'day');
};

const formatDayLabel = (value: string) => {
  const current = new Date(value);
  if (!Number.isFinite(current.getTime())) return 'Earlier';

  const today = new Date();
  const sameDay =
    current.getFullYear() === today.getFullYear() &&
    current.getMonth() === today.getMonth() &&
    current.getDate() === today.getDate();

  if (sameDay) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    current.getFullYear() === yesterday.getFullYear() &&
    current.getMonth() === yesterday.getMonth() &&
    current.getDate() === yesterday.getDate();

  if (isYesterday) return 'Yesterday';

  return current.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric'
  });
};

const ProfileNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshUnreadNotificationCount, showNotification } = useNotification();
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!user?.id) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const notificationsApi = typeof userService.getNotificationsForUser === 'function'
          ? userService
          : itemService;
        const nextEntries = await notificationsApi.getNotificationsForUser(user.id, {
          includePersona: false,
          limit: 120
        });

        startTransition(() => {
          setNotifications(nextEntries);
          setErrorMessage(null);
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load notifications right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return notifications.filter((entry) => {
      if (activeFilter === 'unread' && entry.isRead) return false;
      if (activeFilter !== 'all' && activeFilter !== 'unread' && getNotificationKind(entry) !== activeFilter) {
        return false;
      }
      if (!normalizedQuery) return true;

      const haystack = `${entry.message} ${entry.link || ''} ${String(entry.type || '')}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeFilter, deferredQuery, notifications]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationEntry[]>();
    filteredNotifications.forEach((entry) => {
      const key = formatDayLabel(entry.createdAt);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });
    return Array.from(groups.entries());
  }, [filteredNotifications]);

  const summary = useMemo(() => {
    const messages = notifications.filter((entry) => getNotificationKind(entry) === 'messages').length;
    const orders = notifications.filter((entry) => getNotificationKind(entry) === 'orders').length;
    const unread = notifications.filter((entry) => !entry.isRead).length;

    return { messages, orders, unread };
  }, [notifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id || summary.unread === 0) return;

    setIsMarkingAll(true);
    try {
      const notificationsApi = typeof userService.markNotificationsAsRead === 'function'
        ? userService
        : itemService;
      await notificationsApi.markNotificationsAsRead(user.id, { includePersona: false });
      setNotifications((current) => current.map((entry) => ({ ...entry, isRead: true })));
      await refreshUnreadNotificationCount();
      showNotification('All notifications marked as read.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to mark notifications as read.');
    } finally {
      setIsMarkingAll(false);
    }
  }, [refreshUnreadNotificationCount, showNotification, summary.unread, user?.id]);

  const handleNotificationOpen = useCallback(
    (entry: NotificationEntry) => {
      navigate(entry.link || '/profile');
    },
    [navigate]
  );

  if (isLoading) {
    return <DashboardPageLoader title="Loading notifications..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="space-y-5"
    >
      <section className="rounded-[24px] border border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] p-4 shadow-[0_18px_36px_rgba(224,196,196,0.08),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_20px_40px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-[#9d6f8c] dark:text-[#e5bc9e]">Notifications</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-text-secondary">
              <span>{summary.unread} unread</span>
              <span>{summary.messages} messages</span>
              <span>{summary.orders} orders</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void loadNotifications({ silent: true })}
              className="inline-flex items-center gap-2 rounded-full border border-[#ece2e7] bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#5b4866] shadow-[0_12px_22px_rgba(227,183,196,0.12)] transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f4e7d8] dark:shadow-[0_12px_22px_rgba(0,0,0,0.18)]"
            >
              <RefreshIcon />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link
              to="/profile/settings/notifications"
              className="inline-flex items-center rounded-full border border-[#ece2e7] bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#5b4866] shadow-[0_12px_22px_rgba(227,183,196,0.12)] transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f4e7d8] dark:shadow-[0_12px_22px_rgba(0,0,0,0.18)]"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={summary.unread === 0 || isMarkingAll}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_24px_rgba(122,103,187,0.18)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 dark:shadow-[0_14px_24px_rgba(0,0,0,0.22)]"
            >
              {isMarkingAll ? 'Marking...' : 'Mark all read'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] p-4 shadow-[0_20px_40px_rgba(224,196,196,0.08),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_22px_42px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                    active
                      ? 'bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] text-white shadow-[0_14px_26px_rgba(122,103,187,0.2)]'
                      : 'border border-[#ece2e7] bg-white text-[#6f6274] hover:border-[#d9cfe0] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#d8cec5] dark:hover:border-white/16'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:max-w-[19rem]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8d7c99] dark:text-[#9f97a8]">
              <BellIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notification copy or links..."
              className="h-11 w-full rounded-[18px] border border-[#e8deed] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] pl-11 pr-4 text-sm font-medium text-[#4d4156] shadow-[inset_0_2px_4px_rgba(255,255,255,0.85),0_12px_20px_rgba(130,116,178,0.07)] outline-none transition-all placeholder:text-[#a79aae] focus:border-[#cfc2dc] focus:ring-4 focus:ring-[#ece5f5]/70 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(24,26,36,0.98),rgba(20,22,31,0.98))] dark:text-[#ece5dc] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_20px_rgba(0,0,0,0.22)] dark:placeholder:text-[#8a8491] dark:focus:border-white/14 dark:focus:ring-white/10"
            />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <section className="rounded-[30px] border border-[#f1d6d8] bg-[linear-gradient(180deg,#fff8f8,#fff1f3)] p-6 shadow-[0_18px_34px_rgba(233,117,124,0.1)] dark:border-[#5a2d33] dark:bg-[linear-gradient(180deg,rgba(82,32,39,0.28),rgba(48,20,24,0.22))]">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#c55b65] dark:text-[#ffc3cb]">Load issue</p>
          <p className="mt-3 text-sm font-medium leading-7 text-[#7c4a50] dark:text-[#f1d7db]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="mt-5 inline-flex items-center rounded-full bg-[#a34c5a] px-4 py-2.5 text-sm font-bold text-white"
          >
            Try again
          </button>
        </section>
      ) : null}

      {groupedNotifications.length === 0 ? (
        <section className="rounded-[32px] border border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] p-6 shadow-[0_24px_48px_rgba(224,196,196,0.1),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))] dark:shadow-[0_24px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),rgba(255,255,255,0.74)_48%,rgba(255,242,249,0.7)_100%),linear-gradient(180deg,rgba(255,251,249,0.95),rgba(251,244,255,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_24px_48px_rgba(227,169,190,0.14)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),rgba(255,255,255,0.03)_48%,rgba(255,207,164,0.04)_100%),linear-gradient(180deg,rgba(34,30,43,0.98),rgba(27,24,35,0.96))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_48px_rgba(0,0,0,0.24)]">
              <LottieAnimation
                src={filteredNotifications.length === 0 && notifications.length > 0 ? uiLottieAnimations.noResults : uiLottieAnimations.nothing}
                className="h-36 w-36"
                alt="Empty notification state"
                loop
                autoplay
              />
            </div>
            <h2 className="mt-6 text-2xl font-black tracking-tight text-text-primary">
              {notifications.length === 0 ? 'No notifications yet' : 'No results match this view'}
            </h2>
            <p className="mt-3 text-sm font-medium leading-7 text-text-secondary">
              {notifications.length === 0
                ? 'When orders move, messages arrive, or marketplace activity needs your attention, the feed will populate here automatically.'
                : 'Try switching the filter or clearing your search to bring the full activity feed back into view.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {notifications.length === 0 ? (
                <Link
                  to="/"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(122,103,187,0.2)]"
                >
                  Explore marketplace
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('all');
                    setQuery('');
                  }}
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(122,103,187,0.2)]"
                >
                  Clear filters
                </button>
              )}
              <Link
                to="/profile/settings/notifications"
                className="inline-flex items-center rounded-full border border-[#ece2e7] bg-white px-5 py-3 text-sm font-bold text-[#5b4866] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f4e7d8]"
              >
                Open settings
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {groupedNotifications.map(([groupLabel, entries]) => (
            <div key={groupLabel} className="space-y-2.5">
              <div className="flex items-center gap-3 px-1">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#dccfe3] to-[#dccfe3] dark:via-white/10 dark:to-white/10" />
                <p className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-[#8c8293] dark:text-[#a8a0ac]">{groupLabel}</p>
                <span className="h-px flex-1 bg-gradient-to-r from-[#dccfe3] via-[#dccfe3] to-transparent dark:from-white/10 dark:via-white/10" />
              </div>

              <div className="grid gap-2.5">
                {entries.map((entry, index) => {
                  const meta = getNotificationMeta(entry);
                  return (
                    <motion.button
                      key={entry.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.22 }}
                      onClick={() => handleNotificationOpen(entry)}
                      className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-[24px] border p-3.5 text-left shadow-[0_18px_32px_rgba(224,196,196,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(224,196,196,0.12)] dark:shadow-[0_18px_32px_rgba(0,0,0,0.18)] sm:p-4 ${
                        entry.isRead
                          ? 'border-[#ece2e7] bg-[linear-gradient(180deg,#ffffff,#fffefe)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(33,31,43,0.98),rgba(27,25,35,0.96))]'
                          : 'border-[#e6d9ef] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),rgba(255,247,251,0.9)_46%,rgba(255,241,230,0.9)_100%),linear-gradient(180deg,#fffefe,#fff7fb)] shadow-[0_24px_48px_rgba(218,164,193,0.16)] dark:border-[#4d3a55] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),rgba(255,255,255,0.03)_46%,rgba(255,188,120,0.05)_100%),linear-gradient(180deg,rgba(45,36,54,0.98),rgba(31,26,39,0.96))] dark:shadow-[0_24px_48px_rgba(0,0,0,0.24)]'
                      }`}
                    >
                      {!entry.isRead ? (
                        <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#8f6ce1] to-[#d39a65] shadow-[0_0_18px_rgba(143,108,225,0.28)]" />
                      ) : null}

                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br ${meta.iconShellClassName}`}>
                        {meta.icon}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${meta.badgeClassName}`}>
                                {meta.label}
                              </span>
                              {!entry.isRead ? (
                                <span className="inline-flex rounded-full border border-[#e9d7f6] bg-[#f6efff] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#7a55b8] dark:border-[#49355a] dark:bg-[#32263b] dark:text-[#efd3ff]">
                                  Unread
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[0.96rem] font-bold leading-6 text-text-primary">{entry.message}</p>
                            <p className="mt-1.5 text-[0.82rem] leading-5 text-text-secondary">
                              {entry.link ? `Opens ${entry.link}` : 'Saved in your notification inbox.'}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8c8293] dark:text-[#a8a0ac]">
                              {formatRelativeTime(entry.createdAt)}
                            </p>
                            <p className="mt-2 text-xs font-medium text-text-secondary">
                              {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#998c9e] dark:text-[#b8afbb]">
                            {entry.link ? 'Tap to open destination' : 'No linked destination'}
                          </p>
                          <span className="inline-flex items-center rounded-full border border-[#ece2e7] bg-white px-3 py-1 text-[0.72rem] font-bold text-[#5b4866] transition-colors group-hover:border-[#d9cfe0] group-hover:text-[#4d3d58] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f4e7d8]">
                            Open
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </motion.div>
  );
};

export default ProfileNotificationsPage;
