import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { itemService, userService } from '../../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import type { ChatMessage, ChatThread, User } from '../../types';

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

const safeAvatar = (url?: string | null) => (url && url.trim() ? url : '/icons/urbanprime.svg');
const QUICK_EMOJIS = ['👋', '✨', '🔥', '💙', '😂', '🙌', '😊', '🎉', '🤍', '🚀', '💬', '🌟'];

const formatTime = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
  const threadsPollTimerRef = useRef<number | null>(null);
  const messagesPollTimerRef = useRef<number | null>(null);

  const targetLabel = selectedTarget?.name || 'Conversation';

  const loadMessages = useCallback(async (resolvedThreadId: string, options?: { silent?: boolean }) => {
    if (!resolvedThreadId) return;
    if (!options?.silent) setLoading(true);
    try {
      const rows = await itemService.getChatMessagesForThread(resolvedThreadId);
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
      const previews: ThreadPreview[] = [];
      for (const thread of rawThreads.slice(0, 12)) {
        const counterpartId = String(thread.buyerId === user.id ? thread.sellerId : thread.buyerId || '');
        if (!counterpartId) continue;
        const counterpart = await userService.getUserById(counterpartId).catch(() => null);
        const targetPreview = normalizeTarget(counterpart, counterpartId);
        if (!targetPreview) continue;
        previews.push({
          threadId: thread.id,
          target: targetPreview,
          lastMessage: thread.lastMessage || 'New conversation',
          lastUpdated: thread.lastUpdated || new Date().toISOString()
        });
      }
      setThreads(previews);
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
    const trimmed = searchQuery.trim();
    let alive = true;
    const timer = window.setTimeout(() => {
      (async () => {
        if (trimmed.length < 2) {
          if (alive) setSearchResults([]);
          if (alive) setLoadingSearch(false);
          return;
        }
        setLoadingSearch(true);
        try {
          const users = await userService.searchUsers(trimmed, { excludeUserId: user.id, limit: 8 });
          if (!alive) return;
          setSearchResults(users
            .map((candidate) => normalizeTarget(candidate, candidate.id))
            .filter((entry): entry is MessageTarget => Boolean(entry)));
        } finally {
          if (alive) setLoadingSearch(false);
        }
      })();
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, searchQuery, user]);

  useEffect(() => {
    if (!open || !user || !selectedTarget) return;
    let alive = true;
    (async () => {
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

  const canSend = useMemo(() => Boolean(user && selectedTarget && threadId), [selectedTarget, threadId, user]);

  const handleSelectTarget = useCallback(async (nextTarget: MessageTarget) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSelectedTarget(nextTarget);
    setMode('inbox');
    setSearchQuery('');
  }, [openAuthModal, user]);

  const handleSend = useCallback(async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!selectedTarget || !threadId || !draft.trim()) return;
    setSending(true);
    try {
      await itemService.sendMessageToThread(threadId, user.id, draft.trim());
      setDraft('');
      await loadMessages(threadId);
      setThreads((prev) => prev.map((thread) => (thread.threadId === threadId ? { ...thread, lastMessage: draft.trim(), lastUpdated: new Date().toISOString() } : thread)));
    } finally {
      setSending(false);
    }
  }, [draft, loadMessages, openAuthModal, selectedTarget, threadId, user]);

  return (
    <AnimatePresence>
      {open && target ? (
        <div className="spotlight-modal spotlight-message-modal pointer-events-none fixed inset-0 z-[90] flex items-end justify-end p-2 sm:p-3 md:p-5">
          <motion.div
            className="spotlight-message-panel pointer-events-auto flex h-[min(92vh,840px)] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-[1.4rem] border border-white/10 bg-slate-950/96 text-white shadow-[0_30px_90px_rgba(0,0,0,0.52)] backdrop-blur-3xl max-sm:border-white/10 max-sm:bg-slate-950/96 max-sm:shadow-[0_28px_80px_rgba(0,0,0,0.52)] sm:rounded-[2rem]"
            initial={{ y: 28, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragElastic={0.08}
            dragMomentum={false}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/80 px-3 py-2.5 sm:px-4 sm:py-3">
              <button
                type="button"
                onPointerDown={(event) => dragControls.start(event)}
                className="flex items-center gap-3 text-left"
              >
                <span className="mt-1 h-10 w-10 rounded-full bg-gradient-to-br from-violet-500/40 via-indigo-500/30 to-cyan-400/30 shadow-sm ring-1 ring-white/10" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Glassy inbox</p>
                  <h3 className="text-sm font-black text-white">{targetLabel}</h3>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('inbox')}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${mode === 'inbox' ? 'border-white/10 bg-white/10 text-white' : 'border-white/10 bg-slate-900/70 text-slate-300'}`}
                >
                  Inbox
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${mode === 'new' ? 'border-white/10 bg-white/10 text-white' : 'border-white/10 bg-slate-900/70 text-slate-300'}`}
                >
                  New chat
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-slate-900/80 p-2 text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col gap-3 border-b border-white/10 bg-slate-950/60 p-2.5 lg:max-h-none lg:border-b-0 lg:border-r lg:p-4">
                <div className="flex items-center gap-2 rounded-[1.15rem] border border-white/10 bg-slate-900/70 p-2 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400"><path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14m5.2 12.2L21 21" /></svg>
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      if (event.target.value.trim()) setMode('new');
                    }}
                    placeholder="Search creators"
                    className="w-full bg-transparent px-1 py-1.5 text-sm text-white outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Recent chats</p>
                  <button type="button" onClick={() => setMode('new')} className="text-xs font-bold text-cyan-300 transition hover:text-cyan-200">Start new</button>
                </div>

                <div className="max-h-[40vh] min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-none">
                  {loadingThreads ? (
                    <div className="space-y-2">
                      <div className="h-16 rounded-[1.25rem] bg-white/5" />
                      <div className="h-16 rounded-[1.25rem] bg-white/5" />
                      <div className="h-16 rounded-[1.25rem] bg-white/5" />
                    </div>
                  ) : threads.length > 0 ? (
                    threads.map((thread) => {
                      const active = selectedTarget?.id === thread.target.id;
                      return (
                        <button
                          key={thread.threadId}
                          type="button"
                          onClick={() => void handleSelectTarget(thread.target)}
                          className={`flex w-full items-center gap-3 rounded-[1.15rem] border px-2.5 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 sm:rounded-[1.35rem] sm:px-3 sm:py-3 ${active ? 'border-white/10 bg-white/10 text-white shadow-lg' : 'border-white/10 bg-slate-900/60 text-white shadow-sm backdrop-blur-xl'}`}
                        >
                          <img src={safeAvatar(thread.target.avatar_url)} alt={thread.target.name} className="h-11 w-11 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">{thread.target.name}</p>
                            </div>
                            <p className={`truncate text-xs ${active ? 'text-white/70' : 'text-slate-300'}`}>{thread.lastMessage || 'New conversation'}</p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-slate-900/55 p-5 text-sm text-slate-300">
                      Your recent conversations will appear here.
                    </div>
                  )}
                </div>

                {mode === 'new' || searchQuery.trim() ? (
                  <div className="rounded-[1.2rem] border border-white/10 bg-slate-900/60 p-3 shadow-sm backdrop-blur-xl sm:rounded-[1.45rem] sm:p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Search results</p>
                      {loadingSearch ? <span className="text-[11px] font-semibold text-sky-500">Searching...</span> : null}
                    </div>
                    <div className="mt-3 space-y-2">
                      {searchResults.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => void handleSelectTarget(candidate)}
                          className="flex w-full items-center gap-3 rounded-[1.05rem] border border-white/10 bg-slate-900/65 px-2.5 py-2.5 text-left transition hover:-translate-y-0.5 backdrop-blur-xl sm:rounded-[1.2rem] sm:px-3 sm:py-3"
                        >
                          <img src={safeAvatar(candidate.avatar_url)} alt={candidate.name} className="h-10 w-10 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{candidate.name}</p>
                            <p className="text-xs text-slate-400">Tap to start a new chat</p>
                          </div>
                        </button>
                      ))}
                      {!loadingSearch && searchQuery.trim() && searchResults.length === 0 ? (
                        <p className="rounded-[1.2rem] border border-dashed border-white/10 bg-slate-900/55 p-4 text-sm text-slate-300">
                          No users matched your search.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </aside>

              <section className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Conversation</p>
                    <h4 className="text-sm font-black text-white">{selectedTarget ? `Say hi, ${selectedTarget.name}` : 'Pick a creator or start new chat'}</h4>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-300">
                    Drag the header to move
                  </span>
                </div>

                <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
                  <div className="min-h-0 overflow-y-auto p-4">
                    {loading ? (
                      <div className="space-y-3">
                        <div className="h-16 rounded-[1.25rem] bg-white/5" />
                        <div className="h-16 rounded-[1.25rem] bg-white/5" />
                        <div className="h-16 rounded-[1.25rem] bg-white/5" />
                      </div>
                    ) : messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const mine = String(message.senderId) === String(user?.id || '');
                        return (
                          <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[82%] rounded-[1.15rem] px-3.5 py-2.5 text-sm shadow-sm sm:rounded-[1.35rem] sm:px-4 sm:py-3 ${mine ? 'bg-[linear-gradient(90deg,#a855f7_0%,#6366f1_45%,#38bdf8_100%)] text-white' : 'bg-slate-900/70 text-slate-100'}`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{message.text || message.content || 'Message'}</p>
                                <p className={`mt-1 text-[11px] font-semibold ${mine ? 'text-white/60' : 'text-slate-400'}`}>{formatTime(message.timestamp)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedTarget ? (
                      <div className="flex min-h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-slate-900/55 p-8 text-center text-sm text-slate-300 backdrop-blur-xl">
                        Say hello and start a private Spotlight conversation.
                      </div>
                    ) : (
                      <div className="flex min-h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-slate-900/55 p-8 text-center text-sm text-slate-300 backdrop-blur-xl">
                        Use search to find someone new.
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/88 p-2.5 backdrop-blur-2xl sm:p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${emoji}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-base shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900 sm:h-9 sm:w-9"
                          aria-label={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 rounded-[1.15rem] border border-white/10 bg-slate-900/75 p-2 shadow-sm backdrop-blur-xl sm:rounded-[1.35rem]">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={selectedTarget ? `Message ${selectedTarget.name}...` : 'Choose someone to start chatting'}
                        rows={2}
                        className="min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400"
                      />
                      <button
                        onClick={() => void handleSend()}
                        disabled={!canSend || sending}
                        className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_12px_28px_rgba(255,255,255,0.12)] transition hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? 'Sending' : 'Send'}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Search other users, start a new thread, or continue an existing one without leaving Spotlight.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};

export default SpotlightMessageDrawer;
