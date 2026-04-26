import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { itemService, userService } from '../../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import type { ChatMessage, ChatThread, User } from '../../types';
import SafeImage from '../messages/SafeImage';

type MessageTarget = {
  id: string;
  name: string;
  avatar_url?: string | null;
  firebase_uid?: string | null;
};

type ThreadPreview = {
  threadId: string;
  target: MessageTarget;
  lastMessage: string;
  lastUpdated: string;
};

type SpotlightMessageDrawerProps = {
  open: boolean;
  target: MessageTarget | null;
  onClose: () => void;
};

const QUICK_EMOJIS = [
  '\u{1F44B}',
  '\u{2728}',
  '\u{1F525}',
  '\u{1F499}',
  '\u{1F602}',
  '\u{1F64C}',
  '\u{1F60A}',
  '\u{1F389}',
  '\u{1F929}',
  '\u{1F680}',
  '\u{1F4AC}',
  '\u{1F31F}'
];

const MAX_SEARCH_QUERY_LENGTH = 80;
const MAX_DRAFT_LENGTH = 1200;

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14m5.2 12.2L21 21" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M22 2 11 13" />
    <path d="m22 2-7 20-4-9-9-4Z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M15 18 9 12l6-6" />
  </svg>
);

const formatTime = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatThreadTime = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (startOfMessageDay === startOfToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (startOfMessageDay === startOfToday - 86400000) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getMessageText = (message: ChatMessage) => {
  if (typeof message.text === 'string' && message.text.trim()) return message.text;
  if (typeof message.content === 'string' && message.content.trim()) return message.content;
  if (message.imageUrl) return 'Shared an image';
  if (message.audioUrl) return 'Shared a voice note';
  return 'Message';
};

const normalizeTarget = (candidate?: User | null, fallbackId?: string): MessageTarget | null => {
  if (!candidate) return fallbackId ? { id: fallbackId, name: 'Conversation' } : null;
  const anyCandidate = candidate as any;
  return {
    id: String(candidate.id || fallbackId || ''),
    firebase_uid: String(candidate.id || fallbackId || ''),
    name: String(candidate.name || 'Conversation'),
    avatar_url: anyCandidate.avatar_url || anyCandidate.avatar || null
  };
};

const sanitizeInput = (value: string, maxLength: number) => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .slice(0, maxLength);

const sanitizeSearchValue = (value: string) => sanitizeInput(value, MAX_SEARCH_QUERY_LENGTH)
  .replace(/[\r\n\t]+/g, ' ');

const sanitizeDraftValue = (value: string) => sanitizeInput(value, MAX_DRAFT_LENGTH);

const SpotlightMessageDrawer: React.FC<SpotlightMessageDrawerProps> = ({ open, target, onClose }) => {
  const { user, openAuthModal } = useAuth();
  const dragControls = useDragControls();

  const [selectedTarget, setSelectedTarget] = useState<MessageTarget | null>(target);
  const [threadId, setThreadId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageTarget[]>([]);
  const [mode, setMode] = useState<'inbox' | 'new'>('inbox');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');
  const threadsPollTimerRef = useRef<number | null>(null);
  const messagesPollTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const targetLabel = selectedTarget?.name || 'Conversation';
  const threadCountLabel = messages.length === 0 ? 'New chat' : messages.length === 1 ? '1 message' : `${messages.length} messages`;
  const quickEmojis = isMobile ? QUICK_EMOJIS.slice(0, 6) : QUICK_EMOJIS;
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const loadMessages = useCallback(async (resolvedThreadId: string, options?: { silent?: boolean }) => {
    if (!resolvedThreadId) return;
    if (!options?.silent) setLoading(true);
    try {
      const rows = await itemService.getChatMessagesForThread(resolvedThreadId, { limit: 80 });
      setMessages(rows);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  const resolveThreadForTarget = useCallback(async (nextTarget: MessageTarget | null) => {
    if (!user || !nextTarget) return;
    const resolvedThreadId = await itemService.findOrCreateChatThread('', user.id, nextTarget.id);
    setThreadId(resolvedThreadId);
    await loadMessages(resolvedThreadId);
  }, [loadMessages, user]);

  const loadThreads = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;
    if (!options?.silent) setLoadingThreads(true);
    try {
      const rawThreads: ChatThread[] = await itemService.getChatThreadsForUser(user.id);
      const previews = await Promise.all(
        rawThreads.slice(0, 12).map(async (thread): Promise<ThreadPreview | null> => {
          const counterpartId = String(thread.buyerId === user.id ? thread.sellerId : thread.buyerId || '');
          if (!counterpartId) return null;
          const counterpart = await userService.getUserById(counterpartId).catch(() => null);
          const targetPreview = normalizeTarget(counterpart, counterpartId);
          if (!targetPreview) return null;
          return {
            threadId: thread.id,
            target: targetPreview,
            lastMessage: thread.lastMessage || 'New conversation',
            lastUpdated: thread.lastUpdated || new Date().toISOString()
          };
        })
      );
      setThreads(previews.filter((entry): entry is ThreadPreview => Boolean(entry)));
    } finally {
      if (!options?.silent) setLoadingThreads(false);
    }
  }, [user]);

  useEffect(() => {
    if (!open) return;
    setSelectedTarget(target);
    if (target) setMode('inbox');
  }, [open, target]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsMobile(event ? event.matches : mediaQuery.matches);
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isMobile) {
      setMobileView(target ? 'chat' : 'list');
      return;
    }
    setMobileView('chat');
  }, [isMobile, open, target]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    void loadThreads();
    threadsPollTimerRef.current = window.setInterval(() => {
      if (cancelled) return;
      void loadThreads({ silent: true });
    }, 12000);
    return () => {
      cancelled = true;
      if (threadsPollTimerRef.current) {
        window.clearInterval(threadsPollTimerRef.current);
        threadsPollTimerRef.current = null;
      }
    };
  }, [loadThreads, open, user]);

  useEffect(() => {
    if (!open || !user) return;
    const trimmed = deferredSearchQuery.trim();
    let alive = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (trimmed.length < 2) {
          if (alive) setSearchResults([]);
          if (alive) setLoadingSearch(false);
          return;
        }
        setLoadingSearch(true);
        try {
          const users = await userService.searchUsers(trimmed, { excludeUserId: user.id, limit: 8 });
          if (!alive) return;
          setSearchResults(
            users
              .map((candidate) => normalizeTarget(candidate, candidate.id))
              .filter((entry): entry is MessageTarget => Boolean(entry))
          );
        } finally {
          if (alive) setLoadingSearch(false);
        }
      })();
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [deferredSearchQuery, open, user]);

  useEffect(() => {
    if (!open || !user || !selectedTarget) return;
    let alive = true;
    void (async () => {
      try {
        await resolveThreadForTarget(selectedTarget);
      } catch {
        if (alive) {
          setThreadId('');
          setMessages([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, resolveThreadForTarget, selectedTarget, user]);

  useEffect(() => {
    if (!open || !threadId) return;
    let cancelled = false;
    const refresh = async (silent = false) => {
      if (cancelled) return;
      await loadMessages(threadId, silent ? { silent: true } : undefined);
    };

    void refresh();
    messagesPollTimerRef.current = window.setInterval(() => {
      void refresh(true);
    }, 6000);

    return () => {
      cancelled = true;
      if (messagesPollTimerRef.current) {
        window.clearInterval(messagesPollTimerRef.current);
        messagesPollTimerRef.current = null;
      }
    };
  }, [loadMessages, open, threadId]);

  useEffect(() => {
    if (!open) return;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'end'
    });
  }, [messages, open, threadId]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = '0px';
    composer.style.height = `${Math.min(composer.scrollHeight, 156)}px`;
  }, [draft]);

  const canSend = useMemo(() => Boolean(user && selectedTarget && threadId), [selectedTarget, threadId, user]);

  const handleSelectTarget = useCallback(async (nextTarget: MessageTarget) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSelectedTarget(nextTarget);
    if (isMobile) setMobileView('chat');
    setMode('inbox');
    setSearchQuery('');
  }, [isMobile, openAuthModal, user]);

  const handleSend = useCallback(async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (sending) return;
    const nextDraft = sanitizeDraftValue(draft).trim();
    if (!selectedTarget || !threadId || !nextDraft) return;
    setSending(true);
    try {
      await itemService.sendMessageToThread(threadId, user.id, nextDraft);
      setDraft('');
      await loadMessages(threadId);
      setThreads((prev) => prev.map((thread) => (
        thread.threadId === threadId
          ? { ...thread, lastMessage: nextDraft, lastUpdated: new Date().toISOString() }
          : thread
      )));
    } finally {
      setSending(false);
    }
  }, [draft, loadMessages, openAuthModal, selectedTarget, sending, threadId, user]);

  const sidebarContent = (
    <>
      <div className="spotlight-message-search-shell">
        <div className="spotlight-message-search">
          <SearchIcon />
          <input
            value={searchQuery}
            onChange={(event) => {
              const nextValue = sanitizeSearchValue(event.target.value);
              setSearchQuery(nextValue);
              if (nextValue.trim()) setMode('new');
            }}
            onFocus={() => {
              if (isMobile) setMobileView('list');
            }}
            maxLength={MAX_SEARCH_QUERY_LENGTH}
            placeholder="Search creators or start fresh"
            className="spotlight-message-search-input"
          />
        </div>
        <p className="spotlight-message-search-helper">
          Quick Spotlight chat is temporary. Your full inbox lives in Dashboard Messages.
        </p>
      </div>

      <div className="spotlight-message-sidebar-block">
        <div className="spotlight-message-sidebar-head">
          <div>
            <p className="spotlight-message-kicker">Recent chats</p>
            <p className="spotlight-message-sidebar-copy">Jump back into active Spotlight conversations.</p>
          </div>
          <button type="button" onClick={() => setMode('new')} className="spotlight-message-inline-action">
            Start new
          </button>
        </div>

        <div className="spotlight-message-thread-list">
          {loadingThreads ? (
            <div className="space-y-2">
              <div className="spotlight-message-skeleton h-16" />
              <div className="spotlight-message-skeleton h-16" />
              <div className="spotlight-message-skeleton h-16" />
            </div>
          ) : threads.length > 0 ? (
            threads.map((thread) => {
              const active = selectedTarget?.id === thread.target.id;
              return (
                <button
                  key={thread.threadId}
                  type="button"
                  onClick={() => void handleSelectTarget(thread.target)}
                  className={`spotlight-message-thread-card ${active ? 'is-active' : ''}`}
                >
                  <SafeImage
                    src={thread.target.avatar_url || '/icons/urbanprime.svg'}
                    alt={thread.target.name}
                    className="h-11 w-11 rounded-[1rem] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{thread.target.name}</p>
                      <span className="spotlight-message-thread-time">{formatThreadTime(thread.lastUpdated)}</span>
                    </div>
                    <p className="truncate text-xs opacity-75">{thread.lastMessage || 'New conversation'}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="spotlight-message-empty-card">
              Your recent conversations will appear here.
            </div>
          )}
        </div>
      </div>

      {mode === 'new' || searchQuery.trim() ? (
        <div className="spotlight-message-sidebar-block">
          <div className="spotlight-message-sidebar-head">
            <div>
              <p className="spotlight-message-kicker">Search results</p>
              <p className="spotlight-message-sidebar-copy">Find people without leaving the Spotlight flow.</p>
            </div>
            {loadingSearch ? <span className="spotlight-message-status-pill">Searching...</span> : null}
          </div>

          <div className="spotlight-message-search-results">
            {searchResults.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => void handleSelectTarget(candidate)}
                className="spotlight-message-thread-card"
              >
                <SafeImage
                  src={candidate.avatar_url || '/icons/urbanprime.svg'}
                  alt={candidate.name}
                  className="h-10 w-10 rounded-[1rem] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{candidate.name}</p>
                  <p className="text-xs opacity-75">Tap to start a private chat</p>
                </div>
              </button>
            ))}

            {!loadingSearch && searchQuery.trim() && searchResults.length === 0 ? (
              <div className="spotlight-message-empty-card">
                No users matched your search.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );

  const conversationContent = (
    <>
      <div className="spotlight-message-mainbar">
        <div className="spotlight-message-mainbar-top">
          <div>
            <p className="spotlight-message-kicker">Conversation</p>
            <h4 className="text-sm font-black">
              {selectedTarget ? `Say hi, ${selectedTarget.name}` : 'Pick a creator or start new chat'}
            </h4>
          </div>
          <div className="spotlight-message-mainbar-meta">
            {isMobile ? (
              <button type="button" onClick={() => setMobileView('list')} className="spotlight-message-mobile-toggle">
                <BackIcon />
                <span>Chats</span>
              </button>
            ) : null}
            <span className="spotlight-message-status-pill">{threadCountLabel}</span>
            {!isMobile ? <span className="spotlight-message-mainbar-copy">Drag the header to move</span> : null}
          </div>
        </div>

        <div className="spotlight-message-notice">
          <div className="min-w-0">
            <p className="spotlight-message-notice-title">Temporary Spotlight inbox</p>
            <p className="spotlight-message-notice-copy">Your real inbox and full message history live in Dashboard Messages.</p>
          </div>
          <a href="/profile/messages" className="spotlight-message-notice-link">
            Open full inbox
          </a>
        </div>
      </div>

      <div className="spotlight-message-canvas">
        <div className="spotlight-message-stream">
          {loading ? (
            <div className="space-y-3">
              <div className="spotlight-message-skeleton h-16" />
              <div className="spotlight-message-skeleton h-16" />
              <div className="spotlight-message-skeleton h-16" />
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((message) => {
                const mine = String(message.senderId) === String(user?.id || '');
                return (
                  <div key={message.id} className={`spotlight-message-row ${mine ? 'is-own' : 'is-peer'}`}>
                    {!mine ? (
                      <SafeImage
                        src={selectedTarget?.avatar_url || '/icons/urbanprime.svg'}
                        alt={targetLabel}
                        className="spotlight-message-mini-avatar"
                      />
                    ) : null}
                    <div className={`spotlight-message-bubble ${mine ? 'is-own' : 'is-peer'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{getMessageText(message)}</p>
                      <p className={`spotlight-message-meta ${mine ? 'is-own' : ''}`}>{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : selectedTarget ? (
            <div className="spotlight-message-empty">
              Say hello and start a private Spotlight conversation.
            </div>
          ) : (
            <div className="spotlight-message-empty">
              Use search to find someone new.
            </div>
          )}
        </div>

        <div className="spotlight-message-composer-shell">
          <div className="spotlight-message-emoji-row">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDraft((current) => sanitizeDraftValue(
                  `${current}${current && !current.endsWith(' ') ? ' ' : ''}${emoji}`
                ))}
                className="spotlight-message-emoji-chip"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <form
            className="spotlight-message-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <div className="spotlight-message-form-field">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(sanitizeDraftValue(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={!selectedTarget}
                maxLength={MAX_DRAFT_LENGTH}
                placeholder={selectedTarget ? `Message ${selectedTarget.name}...` : 'Choose someone to start chatting'}
                rows={1}
                className="spotlight-message-textarea"
              />
            </div>
            <button
              type="submit"
              disabled={!canSend || sending || !draft.trim()}
              className="spotlight-message-send"
            >
              <SendIcon />
              <span>{sending ? 'Sending' : 'Send'}</span>
            </button>
          </form>

          <p className="spotlight-message-helper">
            This quick Spotlight chat is temporary. Use Dashboard Messages for your full inbox and long-term conversations.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {open && target ? (
        <div className="spotlight-modal spotlight-message-modal pointer-events-none fixed inset-0 z-[90] flex items-end justify-end p-2 sm:p-3 md:p-5">
          <motion.div
            className="spotlight-message-panel pointer-events-auto flex w-full flex-col overflow-hidden"
            initial={{ y: 28, opacity: 0, scale: 0.965 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.965 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragElastic={0.08}
            dragMomentum={false}
          >
            <header className="spotlight-message-header">
              <button
                type="button"
                onPointerDown={(event) => dragControls.start(event)}
                className="spotlight-message-header-main"
              >
                <span className="spotlight-message-avatar-shell">
                  <SafeImage
                    src={selectedTarget?.avatar_url || '/icons/urbanprime.svg'}
                    alt={targetLabel}
                    className="h-11 w-11 rounded-[1.15rem] object-cover"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="spotlight-message-kicker">Spotlight messages</p>
                  <h3 className="truncate text-sm font-black">{targetLabel}</h3>
                  <p className="spotlight-message-subtitle">
                    {selectedTarget
                      ? 'Temporary quick chat from Spotlight. Full inbox is in Dashboard Messages.'
                      : 'Choose a creator to start chatting'}
                  </p>
                </div>
              </button>

              <div className="spotlight-message-header-actions">
                {!isMobile || mobileView === 'list' ? (
                  <div className="spotlight-message-mode-switch" role="tablist" aria-label="Message mode">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'inbox'}
                      onClick={() => setMode('inbox')}
                      className={`spotlight-message-tab ${mode === 'inbox' ? 'is-active' : ''}`}
                    >
                      Inbox
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'new'}
                      onClick={() => setMode('new')}
                      className={`spotlight-message-tab ${mode === 'new' ? 'is-active' : ''}`}
                    >
                      New chat
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setMobileView('list')} className="spotlight-message-mobile-toggle">
                    <BackIcon />
                    <span>All chats</span>
                  </button>
                )}

                <button type="button" onClick={onClose} className="spotlight-message-close" aria-label="Close message drawer">
                  <CloseIcon />
                </button>
              </div>
            </header>

            <div className="spotlight-message-layout">
              {!isMobile ? (
                <>
                  <aside className="spotlight-message-sidebar">{sidebarContent}</aside>
                  <section className="spotlight-message-main">{conversationContent}</section>
                </>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  {mobileView === 'list' ? (
                    <motion.aside
                      key="spotlight-message-list"
                      className="spotlight-message-sidebar"
                      initial={{ x: -28, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -22, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {sidebarContent}
                    </motion.aside>
                  ) : (
                    <motion.section
                      key="spotlight-message-chat"
                      className="spotlight-message-main"
                      initial={{ x: 28, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 22, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {conversationContent}
                    </motion.section>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};

export default SpotlightMessageDrawer;
