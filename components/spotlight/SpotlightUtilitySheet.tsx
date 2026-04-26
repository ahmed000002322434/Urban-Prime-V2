import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService';
import type { Notification } from '../../types';

type SpotlightUtilitySheetProps = {
  open: boolean;
  variant: 'notifications' | 'more';
  onClose: () => void;
};

const MORE_LINKS = [
  {
    to: '/spotlight/create',
    title: 'Create Spotlight',
    detail: 'Publish a photo, video, or text-first post.'
  },
  {
    to: '/profile/me',
    title: 'My Profile',
    detail: 'Open your creator identity and edit your profile.'
  },
  {
    to: '/notifications',
    title: 'Notifications',
    detail: 'See recent likes, comments, and follows.'
  },
  {
    to: '/messages',
    title: 'Messages',
    detail: 'Jump into creator conversations.'
  },
  {
    to: '/profile/settings',
    title: 'Settings',
    detail: 'Control account, privacy, and Spotlight preferences.'
  },
  {
    to: '/help',
    title: 'Help Center',
    detail: 'Get support and product guidance.'
  }
];

const formatTimeAgo = (value?: string | null) => {
  if (!value) return '';
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
};

const getNotificationPresentation = (entry: Notification) => {
  const title = String((entry as any)?.title || '').toLowerCase();
  const message = String(entry?.message || '').toLowerCase();
  const link = String(entry?.link || '').toLowerCase();
  const haystack = `${title} ${message} ${link}`;

  if (haystack.includes('follow')) {
    return {
      label: 'Follow',
      shellClass: 'bg-sky-500/12 text-sky-200 ring-1 ring-sky-400/18',
      badgeClass: 'bg-sky-500/12 text-sky-200'
    };
  }
  if (haystack.includes('comment') || haystack.includes('reply') || haystack.includes('message')) {
    return {
      label: 'Reply',
      shellClass: 'bg-violet-500/12 text-violet-200 ring-1 ring-violet-400/18',
      badgeClass: 'bg-violet-500/12 text-violet-200'
    };
  }
  if (haystack.includes('like') || haystack.includes('love')) {
    return {
      label: 'Like',
      shellClass: 'bg-rose-500/12 text-rose-200 ring-1 ring-rose-400/18',
      badgeClass: 'bg-rose-500/12 text-rose-200'
    };
  }
  if (String(entry?.type || '').toLowerCase() === 'sale' || haystack.includes('sale') || haystack.includes('order') || haystack.includes('purchase')) {
    return {
      label: 'Order',
      shellClass: 'bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-400/18',
      badgeClass: 'bg-emerald-500/12 text-emerald-200'
    };
  }
  return {
    label: 'Update',
    shellClass: 'bg-white/8 text-slate-200 ring-1 ring-white/10',
    badgeClass: 'bg-white/8 text-slate-300'
  };
};

const NotificationGlyph = ({ entry }: { entry: Notification }) => {
  const presentation = getNotificationPresentation(entry);
  const label = presentation.label;

  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${presentation.shellClass}`}>
      {label === 'Follow' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" className="h-5 w-5">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M4 20a8 8 0 0 1 12.8-6.4" />
          <path d="M19 8v6M16 11h6" />
        </svg>
      ) : label === 'Reply' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" className="h-5 w-5">
          <path d="M5 6.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-11a2 2 0 0 1 2-2Z" />
        </svg>
      ) : label === 'Like' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" className="h-5 w-5">
          <path d="M12 21s-7.5-4.8-7.5-10.4A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 3.6C19.5 16.2 12 21 12 21Z" />
        </svg>
      ) : label === 'Order' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" className="h-5 w-5">
          <path d="M6 7h15l-1.4 6.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L5 4H3" />
          <circle cx="10" cy="19" r="1.4" />
          <circle cx="18" cy="19" r="1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" className="h-5 w-5">
          <path d="M12 3l2.7 5.8L21 11l-6.1 2.2L12 19l-2.9-5.8L3 11l6.3-2.2L12 3Z" />
        </svg>
      )}
    </span>
  );
};

const SpotlightUtilitySheet: React.FC<SpotlightUtilitySheetProps> = ({ open, variant, onClose }) => {
  const { user, openAuthModal } = useAuth();
  const { showNotification } = useNotification();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((entry) => !entry.isRead).length, [notifications]);

  const loadNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!user?.id) return;
    if (!options?.silent) setLoadingNotifications(true);
    try {
      const rows = await itemService.getNotificationsForUser(user.id, { limit: 16, includePersona: true });
      setNotifications(rows);
    } catch (error: any) {
      console.warn('Unable to load Spotlight notifications:', error);
      setNotifications([]);
    } finally {
      if (!options?.silent) setLoadingNotifications(false);
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) {
      openAuthModal('login');
      return;
    }
    setMarkingRead(true);
    try {
      await itemService.markNotificationsAsRead(user.id, { includePersona: true });
      setNotifications((current) => current.map((entry) => ({ ...entry, isRead: true })));
      showNotification('Notifications marked as read.');
      void loadNotifications({ silent: true });
    } catch (error: any) {
      showNotification(error?.message || 'Unable to mark notifications as read.');
    } finally {
      setMarkingRead(false);
    }
  }, [loadNotifications, openAuthModal, showNotification, user?.id]);

  useEffect(() => {
    if (!open || variant !== 'notifications' || !user?.id) return;
    let cancelled = false;
    const refresh = async () => {
      if (cancelled) return;
      await loadNotifications();
    };

    void refresh();
    const timer = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadNotifications, open, user?.id, variant]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="spotlight-modal spotlight-utility-modal fixed inset-0 z-[95] flex items-end justify-center bg-black/72 p-0 backdrop-blur-xl md:items-center md:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="spotlight-utility-panel w-full overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/96 text-white shadow-[0_35px_120px_rgba(0,0,0,0.52)] backdrop-blur-3xl max-sm:border-white/10 max-sm:bg-slate-950/96 max-sm:shadow-[0_28px_80px_rgba(0,0,0,0.52)] md:max-w-2xl md:rounded-[2rem]"
            initial={{ y: 26, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 26, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                  {variant === 'notifications' ? 'Spotlight alerts' : 'Spotlight menu'}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <h3 className="text-xl font-black tracking-tight text-white">
                    {variant === 'notifications' ? 'Notifications card' : 'More cards'}
                  </h3>
                  {variant === 'notifications' && unreadCount > 0 ? (
                    <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                      {unreadCount} new
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-slate-900/80 p-2 text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
                aria-label="Close utility card"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-6">
              {variant === 'notifications' ? (
                <div className="space-y-3">
                  {!user?.id ? (
                    <div className="rounded-[1.45rem] border border-white/10 bg-slate-900/70 p-5 text-center shadow-sm">
                      <p className="text-sm font-bold text-white">Sign in to view Spotlight notifications.</p>
                      <p className="mt-1 text-xs text-slate-400">Likes, comments, follows, and profile activity will appear here.</p>
                      <button
                        type="button"
                        onClick={() => openAuthModal('login')}
                        className="mt-4 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950"
                      >
                        Log in
                      </button>
                    </div>
                  ) : null}

                  {user?.id ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live activity</p>
                        <button
                          type="button"
                          onClick={() => void markAllAsRead()}
                          disabled={markingRead || unreadCount === 0}
                          className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {markingRead ? 'Updating...' : 'Mark all as read'}
                        </button>
                      </div>

                      {loadingNotifications ? (
                        <div className="space-y-3">
                          <div className="h-20 rounded-[1.45rem] bg-white/5" />
                          <div className="h-20 rounded-[1.45rem] bg-white/5" />
                          <div className="h-20 rounded-[1.45rem] bg-white/5" />
                        </div>
                      ) : notifications.length > 0 ? (
                        <div className="space-y-2.5">
                          {notifications.map((entry, index) => (
                            <motion.div
                              key={String(entry.id || `${index}`)}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
                            >
                              <Link
                                to={entry.link || '/spotlight'}
                                onClick={() => {
                                  if (unreadCount > 0) {
                                    void markAllAsRead();
                                  }
                                  onClose();
                                }}
                                className={`group block rounded-[1.35rem] border px-4 py-4 transition duration-200 hover:border-white/16 hover:bg-[#121d2b] ${
                                  entry.isRead
                                    ? 'border-white/10 bg-[#0b1320]/78'
                                    : 'border-sky-400/22 bg-[#0f1c2b]/92 shadow-[0_14px_34px_rgba(14,165,233,0.08)]'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <NotificationGlyph entry={entry} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="truncate text-sm font-semibold text-white">{(entry as any).title || 'Spotlight update'}</p>
                                          {!entry.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-sky-300" /> : null}
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-slate-300">{entry.message}</p>
                                      </div>
                                      <span className="shrink-0 pt-0.5 text-[11px] font-medium text-slate-400">
                                        {formatTimeAgo(entry.createdAt)}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getNotificationPresentation(entry).badgeClass}`}>
                                        {getNotificationPresentation(entry).label}
                                      </span>
                                      {entry.link ? <span className="text-xs font-semibold text-slate-400 transition group-hover:text-sky-300">Open activity</span> : null}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-slate-900/55 p-8 text-center text-sm text-slate-300">
                          No notifications yet. Likes, comments, follows, and replies will appear here in real time.
                        </div>
                      )}

                      <div className="grid gap-3 pt-2 sm:grid-cols-3">
                        <Link to="/spotlight" onClick={onClose} className="rounded-[1.35rem] border border-white/10 bg-slate-900/70 p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                          <p className="text-sm font-bold text-white">Open Spotlight</p>
                          <p className="mt-1 text-xs text-slate-400">Go back to the feed</p>
                        </Link>
                        <Link to="/messages" onClick={onClose} className="rounded-[1.35rem] border border-white/10 bg-slate-900/70 p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                          <p className="text-sm font-bold text-white">Messages</p>
                          <p className="mt-1 text-xs text-slate-400">Jump to inbox</p>
                        </Link>
                        <Link to="/profile/me" onClick={onClose} className="rounded-[1.35rem] border border-white/10 bg-slate-900/70 p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                          <p className="text-sm font-bold text-white">Profile</p>
                          <p className="mt-1 text-xs text-slate-400">Open your card</p>
                        </Link>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {MORE_LINKS.map((entry, index) => (
                    <motion.div
                      key={entry.to}
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.16) }}
                    >
                      <Link
                        to={entry.to}
                        onClick={onClose}
                        className="group block h-full rounded-[1.45rem] border border-white/10 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_65px_rgba(0,0,0,0.24)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white transition group-hover:translate-x-0.5">{entry.title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-300">{entry.detail}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                            Open
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SpotlightUtilitySheet;
