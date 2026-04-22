import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import useLowEndMode from '../hooks/useLowEndMode';
import type { ChatMessage, ChatThread, PersonaType } from '../types';
import { cx } from './dashboard/clay/classNames';
import { prefetchRoute } from '../utils/routePrefetch';

type ItemServiceModule = typeof import('../services/itemService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;

const loadItemServiceModule = () => {
  if (!itemServiceModulePromise) {
    itemServiceModulePromise = import('../services/itemService');
  }

  return itemServiceModulePromise;
};

type MobileTabId = 'home' | 'explore' | 'pixe';

interface MobileQuickLink {
  id: string;
  label: string;
  to?: string;
  onClick?: () => void;
}

interface MobileCreateAction {
  id: string;
  label: string;
  description: string;
  to: string;
}

interface ThreadMeta {
  name: string;
  role: string;
  avatar?: string;
  itemTitle?: string;
}

const HomeGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <img
    src={active ? '/images/mobile-nav/home-active.png' : '/images/mobile-nav/home-inactive.png'}
    alt="Home"
    className="h-[22px] w-[22px] object-contain"
    draggable={false}
  />
);

const ExploreGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-5 w-5 ${active ? 'text-primary' : 'text-text-secondary'}`}
  >
    <circle cx="12" cy="12" r="8.5" />
    <path d="m14.7 9.3-2.7 5.4-2.7 1.2 1.2-2.7 5.4-2.7Z" />
  </svg>
);

const PixeGlyph: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={`h-[22px] w-[22px] ${active ? 'text-[#0f4b35]' : 'text-[#6b7280]'}`}
  >
    <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="m10 9.25 5.6 2.75L10 14.75V9.25Z" fill="currentColor" />
    <circle cx="7.3" cy="7.3" r="1.25" fill="currentColor" opacity="0.75" />
  </svg>
);

const PlusGlyph: React.FC<{ open: boolean }> = ({ open }) => (
  <motion.svg
    animate={{ rotate: open ? 45 : 0 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 text-white"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </motion.svg>
);

const UserGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c1.8-3 4.2-4.4 7-4.4S17.2 17 19 20" />
  </svg>
);

const MessageGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="M5 6h14v9H9l-4 4z" />
  </svg>
);

const SendGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="M22 2 11 13" />
    <path d="m22 2-7 20-4-9-9-4z" />
  </svg>
);

const BackGlyph = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const resolvePersonaType = (activeType: PersonaType | undefined, allTypes: Set<PersonaType>): PersonaType => {
  if (activeType) return activeType;
  if (allTypes.has('seller')) return 'seller';
  if (allTypes.has('provider')) return 'provider';
  if (allTypes.has('affiliate')) return 'affiliate';
  return 'consumer';
};

const createActionIcon = (id: string) => {
  if (id === 'list-product') return 'P';
  if (id === 'list-service') return 'S';
  return 'X';
};

const formatTime = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getMessageText = (message: ChatMessage) => {
  if (message.text && String(message.text).trim()) return String(message.text);
  if (message.type === 'image') return 'Sent an image';
  if (message.type === 'offer') return 'Sent an offer';
  if (message.type === 'voice') return 'Sent a voice message';
  return 'Message';
};

const MobileAppChrome: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, personas, activePersona, isAuthenticated, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLowEndMode = useLowEndMode();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [messageThreads, setMessageThreads] = useState<ChatThread[]>([]);
  const [threadMeta, setThreadMeta] = useState<Record<string, ThreadMeta>>({});
  const [threadMessages, setThreadMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeMessageThreadId, setActiveMessageThreadId] = useState('');
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const pollTimerRef = useRef<number | null>(null);

  const activeTab = useMemo<MobileTabId>(() => {
    if (location.pathname === '/') return 'home';
    if (location.pathname.startsWith('/explore')) return 'explore';
    if (location.pathname.startsWith('/pixe') || location.pathname.startsWith('/reels') || location.pathname.startsWith('/spotlight')) return 'pixe';
    if (location.pathname.startsWith('/browse')) return 'explore';
    return 'home';
  }, [location.pathname]);

  const personaTypes = useMemo(() => {
    const types = new Set<PersonaType>();
    personas.forEach((persona) => types.add(persona.type));
    if (activePersona?.type) types.add(activePersona.type);
    return types;
  }, [personas, activePersona?.type]);

  const personaType = useMemo(() => resolvePersonaType(activePersona?.type, personaTypes), [activePersona?.type, personaTypes]);

  const createActions = useMemo<MobileCreateAction[]>(() => {
    const actions: MobileCreateAction[] = [];
    if (personaTypes.has('seller')) {
      actions.push({
        id: 'list-product',
        label: 'List product',
        description: 'Create and publish a new product listing.',
        to: '/profile/products/new'
      });
    }
    if (personaTypes.has('provider')) {
      actions.push({
        id: 'list-service',
        label: 'List service',
        description: 'Publish a high-converting service page.',
        to: '/profile/services/new'
      });
    }
    actions.push({
      id: 'upload-pixe',
      label: 'Upload pixe',
      description: 'Drop a reel or short visual story.',
      to: '/profile/add-post'
    });
    return actions;
  }, [personaTypes]);

  const profileLinks = useMemo<MobileQuickLink[]>(() => {
    const common: MobileQuickLink[] = [
      { id: 'profile', label: 'Profile', to: user ? `/user/${user.id}` : '/auth' },
      { id: 'messages', label: 'Messages', to: '/profile/messages' }
    ];

    const byPersona: Record<PersonaType, MobileQuickLink[]> = {
      consumer: [
        { id: 'orders', label: 'Your orders', to: '/profile/orders' },
        { id: 'wishlist', label: 'Wishlist', to: '/profile/wishlist' }
      ],
      seller: [
        { id: 'store', label: 'Store', to: '/profile/store' },
        { id: 'products', label: 'Products', to: '/profile/products' },
        { id: 'sales', label: 'Sales', to: '/profile/sales' }
      ],
      provider: [
        { id: 'provider-dashboard', label: 'Provider dashboard', to: '/profile/provider-dashboard' },
        { id: 'services-new', label: 'List service', to: '/profile/services/new' },
        { id: 'workflow-hub', label: 'Workflow hub', to: '/profile/workflows' }
      ],
      affiliate: [
        { id: 'affiliate-center', label: 'Affiliate center', to: '/profile/affiliate' },
        { id: 'promotions', label: 'Promotions', to: '/profile/promotions' }
      ]
    };

    return [
      ...common,
      ...byPersona[personaType],
      { id: 'settings', label: 'Settings', to: '/profile/settings' },
      {
        id: 'logout',
        label: 'Log out',
        onClick: () => {
          logout();
        }
      }
    ];
  }, [logout, personaType, user]);

  const activeMessageThread = useMemo(
    () => messageThreads.find((thread) => thread.id === activeMessageThreadId) ?? null,
    [activeMessageThreadId, messageThreads]
  );

  const activeThreadMessages = useMemo(() => {
    if (!activeMessageThread) return [];
    return threadMessages[activeMessageThread.id] || activeMessageThread.messages || [];
  }, [activeMessageThread, threadMessages]);
  const isDarkTheme = resolvedTheme === 'obsidian' || resolvedTheme === 'noir' || resolvedTheme === 'hydra';
  const navShellClass = isDarkTheme
    ? 'border-white/15 bg-[linear-gradient(135deg,rgba(20,27,38,0.95),rgba(10,16,25,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
    : 'border-white/80 bg-[linear-gradient(135deg,rgba(250,252,255,0.95),rgba(232,239,247,0.9))] shadow-[0_20px_40px_rgba(15,23,42,0.24)]';
  const floatingSheetClass = isDarkTheme
    ? 'border-white/15 bg-[linear-gradient(160deg,rgba(20,27,38,0.96),rgba(12,18,28,0.92))] shadow-[0_28px_55px_rgba(0,0,0,0.55)]'
    : 'border-white/85 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(238,246,255,0.78))] shadow-[0_28px_55px_rgba(15,23,42,0.28)]';
  const overlayBackdropClass = isDarkTheme
    ? (isLowEndMode ? 'bg-black/55' : 'bg-black/55 backdrop-blur-md')
    : (isLowEndMode ? 'bg-[#0f172a]/35' : 'bg-[#0f172a]/30 backdrop-blur-md');
  const panelSurfaceClass = isDarkTheme
    ? 'border-t border-white/15 bg-[linear-gradient(160deg,rgba(15,21,32,0.98),rgba(8,12,20,0.95))] shadow-[0_-20px_50px_rgba(0,0,0,0.58)]'
    : 'border-t border-white/85 bg-[linear-gradient(160deg,rgba(248,251,253,0.97),rgba(238,245,252,0.9))] shadow-[0_-20px_50px_rgba(15,23,42,0.24)]';
  const softCardClass = isDarkTheme
    ? 'border-white/15 bg-white/5 text-slate-100'
    : 'border-white/85 bg-white/76 text-[#1f2937]';
  const primaryTextClass = isDarkTheme ? 'text-slate-100' : 'text-[#1f2937]';
  const secondaryTextClass = isDarkTheme ? 'text-slate-400' : 'text-[#64748b]';
  const chipToneClass = isDarkTheme
    ? 'border-white/15 bg-white/10 text-slate-200'
    : 'border-white/80 bg-white/85 text-[#334155]';
  const fieldToneClass = isDarkTheme
    ? 'text-slate-100 placeholder:text-slate-500'
    : 'text-[#1f2937] placeholder:text-[#94a3b8]';

  const loadThreadMessages = useCallback(async (threadId: string) => {
    if (!threadId) return;
    try {
      const { itemService } = await loadItemServiceModule();
      const messages = await itemService.getChatMessagesForThread(threadId);
      setThreadMessages((prev) => ({
        ...prev,
        [threadId]: messages
      }));
    } catch (error) {
      console.warn('Unable to load thread messages:', error);
    }
  }, []);

  const loadMessageThreads = useCallback(async () => {
    if (!user?.id) return;

    setIsMessagesLoading(true);
    setMessagesError(null);

    try {
      const { itemService, userService } = await loadItemServiceModule();
      const threads = await itemService.getChatThreadsForUser(user.id);
      setMessageThreads(threads);

      const preferredThreadId = threads.find((thread) => thread.id === activeMessageThreadId)?.id || threads[0]?.id || '';
      setActiveMessageThreadId(preferredThreadId);

      const metaEntries = await Promise.all(
        threads.slice(0, 14).map(async (thread) => {
          const otherUserId = thread.buyerId === user.id ? thread.sellerId : thread.buyerId;
          const [otherUser, item] = await Promise.all([
            userService.getUserById(otherUserId).catch(() => null),
            thread.itemId ? itemService.getItemById(thread.itemId).catch(() => undefined) : Promise.resolve(undefined)
          ]);

          const displayName = otherUser?.name || 'Urban Prime User';
          const roleLabel = thread.sellerId === otherUserId ? 'Seller' : 'Buyer';
          return [
            thread.id,
            {
              name: displayName,
              role: roleLabel,
              avatar: otherUser?.avatar,
              itemTitle: item?.title
            } as ThreadMeta
          ] as const;
        })
      );

      setThreadMeta((prev) => ({
        ...prev,
        ...Object.fromEntries(metaEntries)
      }));

      if (preferredThreadId) {
        await loadThreadMessages(preferredThreadId);
      }
    } catch (error) {
      console.error('Unable to load message threads:', error);
      setMessagesError('Unable to load messages right now. Please try again.');
    } finally {
      setIsMessagesLoading(false);
    }
  }, [activeMessageThreadId, loadThreadMessages, user?.id]);

  useEffect(() => {
    setIsCreateOpen(false);
    setIsProfileMenuOpen(false);
    setIsMessagesOpen(false);
    setMessageDraft('');
  }, [location.pathname, location.search]);

  useEffect(() => {
    const shouldLock = isCreateOpen || isProfileMenuOpen || isMessagesOpen;
    if (!shouldLock) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isCreateOpen, isMessagesOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!isMessagesOpen || !user?.id) return;

    void loadMessageThreads();

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadMessageThreads();
    }, isLowEndMode ? 20000 : 12000);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isLowEndMode, isMessagesOpen, loadMessageThreads, user?.id]);

  useEffect(() => {
    if (!isMessagesOpen || !activeMessageThreadId) return;
    if (threadMessages[activeMessageThreadId]) return;
    void loadThreadMessages(activeMessageThreadId);
  }, [activeMessageThreadId, isMessagesOpen, loadThreadMessages, threadMessages]);

  const handleNavigate = (to: string) => {
    const nextRoute = !isAuthenticated && to.startsWith('/profile') ? '/auth' : to;
    prefetchRoute(nextRoute);
    if (!isAuthenticated && to.startsWith('/profile')) {
      navigate('/auth', { state: { from: { pathname: to } } });
      return;
    }
    navigate(to);
  };

  const handleCreateAction = (to: string) => {
    setIsCreateOpen(false);
    handleNavigate(to);
  };

  const handleOpenMessages = () => {
    if (!isAuthenticated || !user?.id) {
      navigate('/auth', { state: { from: { pathname: '/profile/messages' } } });
      return;
    }
    setIsMessagesOpen(true);
    void loadMessageThreads();
  };

  const handleProfileLink = (link: MobileQuickLink) => {
    if (link.id === 'messages') {
      handleOpenMessages();
      return;
    }

    setIsProfileMenuOpen(false);
    setIsMessagesOpen(false);

    if (link.onClick) {
      link.onClick();
      return;
    }

    if (link.to) {
      handleNavigate(link.to);
    }
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!text || !activeMessageThread || !user?.id) return;

    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      senderId: user.id,
      text,
      type: 'text',
      timestamp: new Date().toISOString()
    };

    setThreadMessages((prev) => ({
      ...prev,
      [activeMessageThread.id]: [...(prev[activeMessageThread.id] || []), optimisticMessage]
    }));
    setMessageDraft('');
    setIsSendingMessage(true);

    try {
      const { itemService } = await loadItemServiceModule();
      await itemService.sendMessageToThread(activeMessageThread.id, user.id, text);
      await Promise.all([loadThreadMessages(activeMessageThread.id), loadMessageThreads()]);
    } catch (error) {
      console.error('Unable to send message:', error);
      setMessagesError('Message failed to send. Please retry.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={isLowEndMode ? { duration: 0.16 } : { duration: 0.35, ease: 'easeOut' }}
        className={`fixed inset-x-0 bottom-3 z-[120] mx-auto flex w-[calc(100vw-2rem)] max-w-[430px] items-center justify-between rounded-full border px-6 py-2.5 md:hidden ${isLowEndMode ? '' : 'backdrop-blur-xl'} ${navShellClass}`}
      >
        <button
          onClick={() => navigate('/')}
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all',
            activeTab === 'home' ? 'bg-[#c9f0db] text-[#0f4b35] shadow-[0_10px_20px_rgba(15,75,53,0.24)]' : 'text-[#6b7280]'
          )}
        >
          <HomeGlyph active={activeTab === 'home'} />
        </button>

        <button
          onClick={() => navigate('/explore')}
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all',
            activeTab === 'explore' ? 'bg-white text-[#1f2937] shadow-[0_8px_18px_rgba(15,23,42,0.18)]' : 'text-[#6b7280]'
          )}
        >
          <ExploreGlyph active={activeTab === 'explore'} />
        </button>

        <div className="relative -mt-8">
          <motion.button
            whileTap={isLowEndMode ? undefined : { scale: 0.9 }}
            whileHover={isLowEndMode ? undefined : { scale: 1.05 }}
            onClick={() => setIsCreateOpen((prev) => !prev)}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-[radial-gradient(circle_at_20%_20%,#6f7d8c,#4a5663_58%,#3e4854)] p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.42)]"
          >
            <PlusGlyph open={isCreateOpen} />
          </motion.button>

          <AnimatePresence>
            {isCreateOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className={`absolute bottom-20 left-1/2 w-64 -translate-x-1/2 rounded-3xl border p-2.5 ${isLowEndMode ? '' : 'backdrop-blur-2xl'} ${floatingSheetClass}`}
              >
                {createActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleCreateAction(action.to)}
                    className="mb-1.5 flex w-full items-center gap-3 rounded-2xl border border-white/90 bg-white/78 p-3 text-left transition-all hover:translate-y-[-1px] hover:shadow-[0_12px_24px_rgba(15,23,42,0.14)] last:mb-0"
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#eff6ff,#dbe8f7)] text-xs font-black ${isDarkTheme ? 'text-slate-700' : 'text-[#334155]'}`}>
                      {createActionIcon(action.id)}
                    </span>
                    <span>
                      <p className={`text-xs font-black ${primaryTextClass}`}>{action.label}</p>
                      <p className={`text-[10px] ${secondaryTextClass}`}>{action.description}</p>
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <button
            onClick={() => navigate('/spotlight')}
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all',
            activeTab === 'pixe' ? 'bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]' : 'text-[#6b7280]'
          )}
        >
          <PixeGlyph active={activeTab === 'pixe'} />
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated) navigate('/auth');
            else setIsProfileMenuOpen((prev) => !prev);
          }}
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all',
            isProfileMenuOpen ? 'bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]' : 'text-[#6b7280]'
          )}
        >
          <div
            className={cx(
              'h-7 w-7 rounded-full bg-gradient-to-tr from-[#3f4c5b] to-[#6b7785] p-0.5 shadow-sm transition-all',
              isProfileMenuOpen && 'ring-2 ring-[#5e6b7a]/40 ring-offset-2 ring-offset-[#edf2f6]'
            )}
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-[#4b5563]">
              {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : <UserGlyph />}
            </div>
          </div>
        </button>
      </motion.div>

      <AnimatePresence>
        {isProfileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[130] md:hidden ${overlayBackdropClass}`}
            onClick={() => {
              setIsProfileMenuOpen(false);
              setIsMessagesOpen(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`absolute inset-x-0 bottom-0 max-h-[84vh] overflow-y-auto rounded-t-3xl p-6 pt-2 backdrop-blur-2xl ${panelSurfaceClass}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto my-4 h-1.5 w-12 rounded-full bg-[#cbd5e1]" />

              <AnimatePresence mode="wait" initial={false}>
                {isMessagesOpen ? (
                  <motion.section
                    key="mobile-messages-overlay"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.24 }}
                  >
                    <div className={`mb-3 flex items-center justify-between rounded-2xl border px-3 py-2 backdrop-blur-xl ${softCardClass}`}>
                      <button
                        type="button"
                        onClick={() => setIsMessagesOpen(false)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${chipToneClass}`}
                      >
                        <BackGlyph /> Back
                      </button>
                      <p className={`text-sm font-black ${primaryTextClass}`}>Messages</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsMessagesOpen(false);
                          navigate('/profile/messages');
                        }}
                        className="rounded-full bg-[#0f4b35] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white"
                      >
                        Full Inbox
                      </button>
                    </div>

                    {messagesError ? (
                      <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                        {messagesError}
                      </div>
                    ) : null}

                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                      {messageThreads.map((thread) => {
                        const meta = threadMeta[thread.id];
                        return (
                          <button
                            key={thread.id}
                            type="button"
                            onClick={() => {
                              setActiveMessageThreadId(thread.id);
                              void loadThreadMessages(thread.id);
                            }}
                            className={cx(
                              'relative min-w-[134px] rounded-2xl border px-3 py-2 text-left transition-all',
                              activeMessageThread?.id === thread.id
                                ? 'border-white/90 bg-white/90 shadow-[0_10px_18px_rgba(15,23,42,0.14)]'
                                : 'border-white/70 bg-white/72'
                            )}
                          >
                            <p className={`truncate text-xs font-black ${primaryTextClass}`}>{meta?.name || 'Conversation'}</p>
                            <p className={`truncate text-[10px] ${secondaryTextClass}`}>{meta?.itemTitle || meta?.role || 'Chat thread'}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className={`rounded-3xl border p-3 shadow-[0_14px_26px_rgba(15,23,42,0.14)] backdrop-blur-xl ${softCardClass}`}>
                      <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
                        {isMessagesLoading ? (
                          <p className={`py-8 text-center text-xs font-medium ${secondaryTextClass}`}>Loading messages...</p>
                        ) : activeThreadMessages.length === 0 ? (
                          <p className={`py-8 text-center text-xs font-medium ${secondaryTextClass}`}>No messages in this thread yet.</p>
                        ) : (
                          activeThreadMessages.map((message) => {
                            const isSelf = message.senderId === user?.id;
                            return (
                              <div key={message.id} className={cx('flex', isSelf ? 'justify-end' : 'justify-start')}>
                                <div
                                  className={cx(
                                    'max-w-[78%] rounded-2xl px-3 py-2 text-xs shadow-[0_8px_16px_rgba(15,23,42,0.1)]',
                                    isSelf
                                      ? 'rounded-br-md bg-[linear-gradient(145deg,#0f4b35,#176b50)] text-white'
                                      : `rounded-bl-md border border-white/85 bg-white/88 ${primaryTextClass}`
                                  )}
                                >
                                  <p className="leading-relaxed">{getMessageText(message)}</p>
                                  <p className={cx('mt-1 text-[9px]', isSelf ? 'text-white/80' : secondaryTextClass)}>
                                    {formatTime(message.timestamp)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form onSubmit={handleSendMessage} className={`mt-3 flex items-center gap-2 rounded-2xl border p-2 ${softCardClass}`}>
                        <input
                          value={messageDraft}
                          onChange={(event) => setMessageDraft(event.target.value)}
                          placeholder="Send a quick message..."
                          className={`w-full bg-transparent px-1 text-xs font-medium outline-none ${fieldToneClass}`}
                        />
                        <button
                          type="submit"
                          disabled={isSendingMessage || !activeMessageThread}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0f4b35] text-white shadow-[0_8px_14px_rgba(15,75,53,0.3)] disabled:opacity-50"
                          aria-label="Send message"
                        >
                          <SendGlyph />
                        </button>
                      </form>
                    </div>
                  </motion.section>
                ) : (
                  <motion.section
                    key="mobile-profile-overlay"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.24 }}
                  >
                    <div className={`mb-6 flex items-center gap-4 rounded-3xl border p-4 shadow-[0_14px_26px_rgba(15,23,42,0.14)] backdrop-blur-xl ${softCardClass}`}>
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#3f4c5b] to-[#6b7785] p-0.5">
                        <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-white">
                          {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[#475569]"><UserGlyph /></div>}
                        </div>
                      </div>
                      <div>
                        <p className={`text-lg font-black ${primaryTextClass}`}>{user?.name || 'UrbanPrime User'}</p>
                        <p className={`text-xs uppercase font-bold tracking-widest ${secondaryTextClass}`}>{personaType} Workspace</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {profileLinks.map((link) => (
                        <button
                          key={link.id}
                          onClick={() => handleProfileLink(link)}
                          className={cx(
                            'rounded-2xl border p-4 text-left transition-all group',
                            link.id === 'logout'
                              ? 'border-red-300 bg-red-50'
                              : 'border-white/85 bg-white/76 hover:translate-y-[-1px] hover:shadow-[0_10px_20px_rgba(15,23,42,0.14)]'
                          )}
                        >
                          {link.id === 'messages' ? (
                            <span className={`mb-1 inline-flex h-7 w-7 items-center justify-center rounded-xl border ${chipToneClass}`}>
                              <MessageGlyph />
                            </span>
                          ) : null}
                          <p className={cx('text-sm font-black transition-all', link.id === 'logout' ? 'text-red-600' : `${primaryTextClass} group-hover:text-[#0f4b35]`)}>
                            {link.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default MobileAppChrome;
