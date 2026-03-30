import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const targetLabel = selectedTarget?.name || 'Conversation';

  const loadMessages = useCallback(async (resolvedThreadId: string) => {
    if (!resolvedThreadId) return;
    setLoading(true);
    try {
      const rows = await itemService.getChatMessagesForThread(resolvedThreadId);
      setMessages(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveThreadForTarget = useCallback(async (nextTarget: MessageTarget | null) => {
    if (!user || !nextTarget) return;
    const resolvedThreadId = await itemService.findOrCreateChatThread('', user.id, nextTarget.id);
    setThreadId(resolvedThreadId);
    await loadMessages(resolvedThreadId);
  }, [loadMessages, user]);

  useEffect(() => {
    if (!open) return;
    setSelectedTarget(target);
    if (target) setMode('inbox');
  }, [open, target]);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    (async () => {
      setLoadingThreads(true);
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
        if (!alive) return;
        setThreads(previews);
      } finally {
        if (alive) setLoadingThreads(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, user]);

  useEffect(() => {
    if (!open || !user) return;
    const trimmed = searchQuery.trim();
    if (mode !== 'new') {
      setLoadingSearch(false);
      if (!trimmed) setSearchResults([]);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      (async () => {
        if (!trimmed) {
          if (alive) setSearchResults([]);
          return;
        }
        setLoadingSearch(true);
        try {
          const users = await itemService.searchUsers(trimmed, { excludeUserId: user.id, limit: 8 });
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
  }, [mode, open, searchQuery, user]);

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

  const canSend = useMemo(() => Boolean(user && selectedTarget && threadId), [selectedTarget, threadId, user]);

  const handleSelectTarget = useCallback(async (nextTarget: MessageTarget) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSelectedTarget(nextTarget);
    setMode('inbox');
    setSearchQuery('');
    await resolveThreadForTarget(nextTarget);
  }, [openAuthModal, resolveThreadForTarget, user]);

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
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-end justify-end p-2 sm:p-3 md:p-5">
          <motion.div
            className="pointer-events-auto flex h-[min(88vh,760px)] w-[min(100%,1040px)] flex-col overflow-hidden rounded-[1.6rem] border border-white/55 bg-white/78 shadow-[0_30px_90px_rgba(15,23,42,0.22)] backdrop-blur-3xl dark:border-white/10 dark:bg-slate-950/94 sm:rounded-[2rem]"
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
            <div className="flex items-start justify-between gap-3 border-b border-white/70 bg-white/30 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
              <button
                type="button"
                onPointerDown={(event) => dragControls.start(event)}
                className="flex items-center gap-3 text-left"
              >
                <span className="mt-1 h-10 w-10 rounded-full bg-gradient-to-br from-sky-400/30 via-blue-500/20 to-indigo-500/20 shadow-sm ring-1 ring-white/40 dark:ring-white/10" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Glassy inbox</p>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">{targetLabel}</h3>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('inbox')}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${mode === 'inbox' ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-white/70 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
                >
                  Inbox
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${mode === 'new' ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-white/70 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
                >
                  New chat
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full border border-white/70 bg-white/80 p-2 text-slate-600 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col gap-3 border-b border-white/70 bg-white/20 p-3 dark:border-white/10 dark:bg-slate-950/25 lg:border-b-0 lg:border-r lg:p-4">
                <div className="flex items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/88 p-2 shadow-sm dark:border-white/10 dark:bg-slate-900/55">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400"><path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14m5.2 12.2L21 21" /></svg>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search users"
                    className="w-full bg-transparent px-1 py-1.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Recent chats</p>
                  <button type="button" onClick={() => setMode('new')} className="text-xs font-bold text-sky-600 transition hover:text-sky-500 dark:text-sky-300">Start new</button>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {loadingThreads ? (
                    <div className="space-y-2">
                      <div className="h-16 rounded-[1.25rem] bg-slate-100/80 dark:bg-white/5" />
                      <div className="h-16 rounded-[1.25rem] bg-slate-100/80 dark:bg-white/5" />
                      <div className="h-16 rounded-[1.25rem] bg-slate-100/80 dark:bg-white/5" />
                    </div>
                  ) : threads.length > 0 ? (
                    threads.map((thread) => {
                      const active = selectedTarget?.id === thread.target.id;
                      return (
                        <button
                          key={thread.threadId}
                          type="button"
                          onClick={() => void handleSelectTarget(thread.target)}
                          className={`flex w-full items-center gap-3 rounded-[1.35rem] border px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950' : 'border-white/70 bg-white/85 text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:text-white'}`}
                        >
                          <img src={safeAvatar(thread.target.avatar_url)} alt={thread.target.name} className="h-11 w-11 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">{thread.target.name}</p>
                            </div>
                            <p className={`truncate text-xs ${active ? 'text-white/70' : 'text-slate-500 dark:text-slate-300'}`}>{thread.lastMessage || 'New conversation'}</p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.45rem] border border-dashed border-white/60 bg-white/60 p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      Your recent conversations will appear here.
                    </div>
                  )}
                </div>

                {mode === 'new' ? (
                  <div className="rounded-[1.45rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Search results</p>
                      {loadingSearch ? <span className="text-[11px] font-semibold text-sky-500">Searching...</span> : null}
                    </div>
                    <div className="mt-3 space-y-2">
                      {searchResults.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => void handleSelectTarget(candidate)}
                          className="flex w-full items-center gap-3 rounded-[1.2rem] border border-white/70 bg-white/85 px-3 py-3 text-left transition hover:-translate-y-0.5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45"
                        >
                          <img src={safeAvatar(candidate.avatar_url)} alt={candidate.name} className="h-10 w-10 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{candidate.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tap to start a new chat</p>
                          </div>
                        </button>
                      ))}
                      {!loadingSearch && searchQuery.trim() && searchResults.length === 0 ? (
                        <p className="rounded-[1.2rem] border border-dashed border-white/60 bg-white/60 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          No users matched your search.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </aside>

              <section className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-white/70 px-4 py-3 dark:border-white/10">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Conversation</p>
                    <h4 className="text-sm font-black text-slate-950 dark:text-white">{selectedTarget ? `Say hi, ${selectedTarget.name}` : 'Pick a creator or start new chat'}</h4>
                  </div>
                  <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    Drag the header to move
                  </span>
                </div>

                <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
                  <div className="min-h-0 overflow-y-auto p-4">
                    {loading ? (
                      <div className="space-y-3">
                        <div className="h-16 rounded-[1.25rem] bg-slate-100/80 dark:bg-white/5" />
                        <div className="h-16 rounded-[1.25rem] bg-slate-100/80 dark:bg-white/5" />
                        <div className="h-16 rounded-[1.25rem] bg-slate-100/80 dark:bg-white/5" />
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const mine = String(message.senderId) === String(user?.id || '');
                          return (
                            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[82%] rounded-[1.35rem] px-4 py-3 text-sm shadow-sm ${mine ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-white/88 text-slate-700 dark:bg-white/5 dark:text-slate-200'}`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{message.text || message.content || 'Message'}</p>
                                <p className={`mt-1 text-[11px] font-semibold ${mine ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>{formatTime(message.timestamp)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedTarget ? (
                      <div className="flex min-h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/60 bg-white/55 p-8 text-center text-sm text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        Say hello and start a private Spotlight conversation.
                      </div>
                    ) : (
                      <div className="flex min-h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/60 bg-white/55 p-8 text-center text-sm text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        Use search to find someone new.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/70 p-4 dark:border-white/10">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${emoji}`)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/85 text-base shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5"
                          aria-label={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/90 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={selectedTarget ? `Message ${selectedTarget.name}...` : 'Choose someone to start chatting'}
                        rows={2}
                        className="min-h-[48px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <button
                        onClick={() => void handleSend()}
                        disabled={!canSend || sending}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
                      >
                        {sending ? 'Sending' : 'Send'}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
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
