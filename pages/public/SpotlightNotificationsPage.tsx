import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { spotlightRealtime } from '../../services/spotlightRealtime';
import { spotlightService } from '../../services/spotlightService';
import { itemService } from '../../services/itemService';
import type { Notification } from '../../types';

type FeedFilter = 'all' | 'unread' | 'orders' | 'messages' | 'updates';

const filters: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'messages', label: 'Messages' },
  { id: 'updates', label: 'Updates' }
];

const panelClass =
  'rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_35%),linear-gradient(180deg,rgba(18,18,22,0.98),rgba(7,8,10,0.96))] shadow-[0_26px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[24px]';
const softClass =
  'rounded-[24px] border border-white/[0.06] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const getNotificationKind = (entry: Notification): Exclude<FeedFilter, 'all' | 'unread'> => {
  const normalizedType = String(entry.type || 'INFO').toUpperCase();
  if (normalizedType === 'MESSAGE') return 'messages';
  if (normalizedType === 'ORDER' || normalizedType === 'SALE') return 'orders';
  return 'updates';
};

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Just now';
  const diffMs = timestamp - Date.now();
  if (Math.abs(diffMs) < 3600000) {
    return relativeFormatter.format(Math.round(diffMs / 60000), 'minute');
  }
  if (Math.abs(diffMs) < 86400000) {
    return relativeFormatter.format(Math.round(diffMs / 3600000), 'hour');
  }
  return relativeFormatter.format(Math.round(diffMs / 86400000), 'day');
};

const SpotlightNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshUnreadNotificationCount, showNotification } = useNotification();
  const [entries, setEntries] = useState<Notification[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const loadNotifications = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user?.id) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const nextEntries = await spotlightService.getNotifications(user.id, {
        query: deferredQuery,
        limit: 120
      });
      setEntries(nextEntries);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [deferredQuery, showNotification, user?.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return spotlightRealtime.subscribeNotifications(user.id, () => {
      void loadNotifications({ silent: true });
    }, { fallbackMs: 30000 });
  }, [loadNotifications, user?.id]);

  const summary = useMemo(() => ({
    unread: entries.filter((entry) => !entry.isRead).length,
    messages: entries.filter((entry) => getNotificationKind(entry) === 'messages').length,
    orders: entries.filter((entry) => getNotificationKind(entry) === 'orders').length
  }), [entries]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !entry.isRead;
    return getNotificationKind(entry) === activeFilter;
  }), [activeFilter, entries]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id || summary.unread === 0) return;
    setIsMarkingAll(true);
    try {
      await itemService.markNotificationsAsRead(user.id, { includePersona: false });
      setEntries((current) => current.map((entry) => ({ ...entry, isRead: true })));
      await refreshUnreadNotificationCount();
      showNotification('All notifications marked as read.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to mark notifications as read.');
    } finally {
      setIsMarkingAll(false);
    }
  }, [refreshUnreadNotificationCount, showNotification, summary.unread, user?.id]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    filteredEntries.forEach((entry) => {
      const date = new Date(entry.createdAt);
      const key = Number.isFinite(date.getTime())
        ? date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
        : 'Earlier';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
    return Array.from(groups.entries());
  }, [filteredEntries]);

  return (
    <SpotlightNoirBlankSurface>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className={`${panelClass} p-6 sm:p-7`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/36">Spotlight alerts</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                Messages, orders, and creator signals in one feed.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/56 sm:text-[15px]">
                This view reuses the live notification stream already backing the header badge, with realtime refresh and filtering.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadNotifications({ silent: true })} className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74 transition hover:bg-white/[0.08] hover:text-white">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link to="/profile/settings/notifications" className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74 transition hover:bg-white/[0.08] hover:text-white">
                Settings
              </Link>
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={summary.unread === 0 || isMarkingAll}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className={`${softClass} p-4`}>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Unread</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.unread}</p>
            </div>
            <div className={`${softClass} p-4`}>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Message alerts</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.messages}</p>
            </div>
            <div className={`${softClass} p-4`}>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/38">Commerce updates</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.orders}</p>
            </div>
          </div>
        </section>

        <section className={`${panelClass} p-4 sm:p-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${activeFilter === filter.id ? 'bg-white text-black' : 'bg-white/[0.05] text-white/62 hover:bg-white/[0.08] hover:text-white'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search copy, links, or activity type..."
              className="h-12 w-full rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/14 lg:max-w-sm"
            />
          </div>
        </section>

        {isLoading ? (
          <section className={`${panelClass} p-6 text-center text-sm text-white/54`}>Loading notifications...</section>
        ) : groupedEntries.length === 0 ? (
          <section className={`${panelClass} p-8 text-center`}>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/36">Quiet lane</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">No notifications match this view.</p>
            <p className="mt-3 text-sm leading-relaxed text-white/54">
              Switch the filter, clear the search, or head back to the Spotlight feed.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => { setActiveFilter('all'); setQuery(''); }} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
                Clear filters
              </button>
              <Link to="/spotlight" className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74">
                Back to feed
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            {groupedEntries.map(([groupLabel, groupEntries]) => (
              <div key={groupLabel} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="h-px flex-1 bg-white/10" />
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/34">{groupLabel}</p>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid gap-3">
                  {groupEntries.map((entry) => (
                    <motion.button
                      key={entry.id}
                      type="button"
                      onClick={() => navigate(entry.link || '/profile')}
                      whileHover={{ y: -2 }}
                      className={`${panelClass} flex w-full items-start gap-4 p-4 text-left transition`}
                    >
                      <div className={`mt-1 h-11 w-11 shrink-0 rounded-2xl ${entry.isRead ? 'bg-white/[0.05]' : 'bg-white text-black'} flex items-center justify-center text-xs font-black uppercase tracking-[0.18em]`}>
                        {getNotificationKind(entry).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${entry.isRead ? 'bg-white/[0.05] text-white/42' : 'bg-white text-black'}`}>
                            {getNotificationKind(entry)}
                          </span>
                          {!entry.isRead ? <span className="h-2 w-2 rounded-full bg-sky-300" /> : null}
                          <span className="text-xs text-white/34">{formatRelativeTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-white/78">{entry.message}</p>
                        {entry.link ? <p className="mt-2 truncate text-xs text-white/36">{entry.link}</p> : null}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </SpotlightNoirBlankSurface>
  );
};

export default SpotlightNotificationsPage;
