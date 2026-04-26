import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { collection, limit as firestoreLimit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { itemService, userService } from '../../services/itemService';
import { isBackendConfigured } from '../../services/backendClient';
import { decryptChatText, encryptChatText, getChatEncryptionStorageKey } from '../../services/chatCrypto';
import profileOnboardingService from '../../services/profileOnboardingService';
import { useNotification } from '../../context/NotificationContext';
import useLowEndMode from '../../hooks/useLowEndMode';
import type {
  ChatCallSession,
  ChatMessage,
  ChatPresenceState,
  ChatSettings,
  CustomOffer,
  Item,
  User
} from '../../types';
import Spinner from '../../components/Spinner';
import ConversationHeader from '../../components/messages/ConversationHeader';
import CallBanner from '../../components/messages/CallBanner';
import ComposerDock from '../../components/messages/ComposerDock';
import CreateOfferModal from '../../components/messages/CreateOfferModal';
import MessageList from '../../components/messages/MessageList';
import MessagesContextPanel from '../../components/messages/MessagesContextPanel';
import NewChatModal from '../../components/messages/NewChatModal';
import ThreadRail from '../../components/messages/ThreadRail';
import type { InboxBucket, ThreadFilter, ThreadViewModel, ThreadWithDetails } from '../../components/messages/types';
import { CloseIcon } from '../../components/messages/MessageIcons';
import { db } from '../../firebase';

type CallBannerState = 'none' | 'incoming' | 'outgoing' | 'active';

const CHAT_SETTINGS_STORAGE_PREFIX = 'urbanprime_chat_settings_v1:';
const CHAT_THREADS_CACHE_PREFIX = 'urbanprime_chat_threads_v2:';
const CHAT_MESSAGES_CACHE_PREFIX = 'urbanprime_chat_messages_v2:';
const MESSAGE_PAGE_SIZE = 180;
const MESSAGE_CACHE_LIMIT = 240;
const MESSAGE_POLL_FOREGROUND_MS = 2400;
const MESSAGE_POLL_BACKGROUND_MS = 7600;
const META_POLL_RINGING_MS = 360;
const META_POLL_FOREGROUND_MS = 620;
const META_POLL_BACKGROUND_MS = 1600;
const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  e2eEnabled: false,
  presenceVisible: true,
  soundEnabled: true
};

const readCachedJson = <T,>(key: string): T | null => {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeCachedJson = (key: string, payload: unknown) => {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const chatSettingsStorageKey = (threadId: string) => `${CHAT_SETTINGS_STORAGE_PREFIX}${threadId}`;
const messageCacheStorageKey = (threadId: string) => `${CHAT_MESSAGES_CACHE_PREFIX}${threadId}`;

const readChatSettings = (threadId?: string): ChatSettings => {
  if (!threadId || typeof window === 'undefined') return DEFAULT_CHAT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(chatSettingsStorageKey(threadId));
    if (!raw) return DEFAULT_CHAT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      e2eEnabled: parsed?.e2eEnabled === true,
      presenceVisible: parsed?.presenceVisible !== false,
      soundEnabled: parsed?.soundEnabled !== false
    };
  } catch {
    return DEFAULT_CHAT_SETTINGS;
  }
};

const persistChatSettings = (threadId: string, settings: ChatSettings) => {
  if (!threadId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(chatSettingsStorageKey(threadId), JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
};

const formatPresenceLabel = (presence: ChatPresenceState | null): string => {
  if (!presence) return 'Offline';
  if (presence.visibility === false) return 'Last seen hidden';
  if (presence.isOnline) return 'Online';
  if (!presence.lastSeenAt) return 'Offline';
  const lastSeen = new Date(presence.lastSeenAt);
  if (Number.isNaN(lastSeen.getTime())) return 'Offline';
  return `Last seen ${lastSeen.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
};

const getPreferredRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
};

const isEncryptedMessage = (message: ChatMessage | null) =>
  Boolean(message?.content?.encrypted) || (typeof message?.text === 'string' && message.text.startsWith('__enc_v1__:'));

const getLatestMessage = (thread: ThreadWithDetails) =>
  thread.messages[thread.messages.length - 1] || null;

const getPreviewType = (message: ChatMessage | null): ThreadViewModel['previewType'] => {
  if (!message?.type) return 'text';
  if (message.type === 'image') return 'image';
  if (message.type === 'voice') return 'voice';
  if (message.type === 'offer') return 'offer';
  if (message.type === 'contract') return 'contract';
  if (message.type === 'milestone') return 'milestone';
  return 'text';
};

const getPreviewText = (thread: ThreadWithDetails, message: ChatMessage | null) => {
  if (!message) return thread.lastMessage || 'No messages yet';
  if (message.deletedAt) return 'Message deleted';
  if (isEncryptedMessage(message)) return 'Encrypted message';
  if (message.type === 'offer') return 'Sent an offer';
  if (message.type === 'voice') return 'Voice note';
  if (message.type === 'contract') return 'Contract update';
  if (message.type === 'milestone') return 'Milestone update';
  if (message.type === 'image' && !message.text) return 'Sent an image';
  return message.text || thread.lastMessage || 'No messages yet';
};

const getMessageSnippet = (message: ChatMessage | null) => {
  if (!message) return '';
  if (message.deletedAt) return 'Message deleted';
  if (isEncryptedMessage(message)) return 'Encrypted message';
  if (message.type === 'voice') return 'Voice note';
  if (message.type === 'offer') return 'Offer';
  if (message.type === 'contract') return 'Contract update';
  if (message.type === 'milestone') return 'Milestone update';
  if (message.type === 'image' && !message.text) return 'Image';
  return String(message.text || '').trim() || 'Message';
};

const getMessageTimestampMs = (message: ChatMessage | null) => {
  if (!message) return 0;
  const parsed = new Date(message.timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortMessagesByTimestamp = (items: ChatMessage[]) =>
  [...items].sort((left, right) => getMessageTimestampMs(left) - getMessageTimestampMs(right));

const stripTempMessages = (items: ChatMessage[]) =>
  items.filter((message) => !String(message.id || '').startsWith('temp-'));

const mergeMessagesById = (...collections: ChatMessage[][]) => {
  const merged = new Map<string, ChatMessage>();
  collections.flat().forEach((message) => {
    if (!message?.id) return;
    merged.set(message.id, message);
  });
  return sortMessagesByTimestamp(Array.from(merged.values()));
};

const isScrollerNearBottom = (node: HTMLDivElement | null) => {
  if (!node) return true;
  return node.scrollHeight - node.scrollTop - node.clientHeight < 140;
};

const formatThreadPreviewTime = (value?: string | Date | null) => {
  if (!value) return '';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMessageDay = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()).getTime();
  if (startOfMessageDay === startOfToday) {
    return dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (startOfMessageDay === startOfToday - 86400000) return 'Yesterday';
  const daysDiff = Math.round((startOfToday - startOfMessageDay) / 86400000);
  if (daysDiff < 7) return dateValue.toLocaleDateString([], { weekday: 'short' });
  return dateValue.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const isRequestThread = (thread: ThreadWithDetails, latestMessage: ChatMessage | null) =>
  Boolean(
    thread.itemId ||
    thread.engagementId ||
    (latestMessage?.type && ['offer', 'contract', 'milestone'].includes(latestMessage.type))
  );

const getThreadBucket = (thread: ThreadWithDetails, latestMessage: ChatMessage | null): InboxBucket => {
  if (isRequestThread(thread, latestMessage)) return 'requests';
  return thread.inboxLabel === 'general' ? 'general' : 'primary';
};

const getContextLabel = (thread: ThreadWithDetails, bucket: InboxBucket) => {
  if (bucket === 'requests') {
    return 'Request';
  }
  return '';
};

const getThreadSortMs = (thread: ThreadWithDetails) => {
  const latestMessage = getLatestMessage(thread);
  const stamp = latestMessage?.timestamp || thread.lastUpdated || '';
  const parsed = new Date(stamp).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortThreadsByActivity = (items: ThreadWithDetails[]) =>
  [...items].sort((left, right) => getThreadSortMs(right) - getThreadSortMs(left));

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { notificationSettings, updateNotificationSettings } = useNotification();
  const { threadId } = useParams<{ threadId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isLowEndMode = useLowEndMode();
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : false)
  );

  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threadSearch, setThreadSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [newChatResults, setNewChatResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
  const [threadReadReceiptsById, setThreadReadReceiptsById] = useState<Record<string, Record<string, string>>>({});
  const [threadMenuId, setThreadMenuId] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<InboxBucket>('primary');
  const [activeFilter, setActiveFilter] = useState<ThreadFilter>('all');
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isComposerActionsOpen, setIsComposerActionsOpen] = useState(false);
  const [threadPassphraseInput, setThreadPassphraseInput] = useState('');
  const [threadPassphrase, setThreadPassphrase] = useState('');
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [decryptedByMessageId, setDecryptedByMessageId] = useState<Record<string, string>>({});
  const [decryptErrorByMessageId, setDecryptErrorByMessageId] = useState<Record<string, boolean>>({});
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [activeCall, setActiveCall] = useState<ChatCallSession | null>(null);
  const [callBannerState, setCallBannerState] = useState<CallBannerState>('none');
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, ChatPresenceState>>({});
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingHeartbeatRef = useRef<number | null>(null);
  const typingStateRef = useRef(false);
  const markReadKeyRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);
  const discardVoiceRecordingRef = useRef(false);
  const recordingMsRef = useRef(0);
  const recordingTimerRef = useRef<number | null>(null);
  const fetchMessagesInFlightRef = useRef(false);
  const threadMetaInFlightRef = useRef(false);
  const callInFlightRef = useRef(false);
  const messagePollBackoffRef = useRef(MESSAGE_POLL_FOREGROUND_MS);
  const metaPollBackoffRef = useRef(META_POLL_FOREGROUND_MS);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeCallRef = useRef<ChatCallSession | null>(null);
  const loadedThreadIdRef = useRef<string | null>(null);
  const preserveScrollOffsetRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(false);

  const threadCacheKey = useMemo(() => (user?.id ? `${CHAT_THREADS_CACHE_PREFIX}${user.id}` : ''), [user?.id]);
  const messageCacheKey = useMemo(() => (threadId ? messageCacheStorageKey(threadId) : ''), [threadId]);
  const deferredThreadSearch = useDeferredValue(threadSearch);
  const searchParamsKey = useMemo(() => searchParams.toString(), [searchParams]);
  const pendingConversationItemId = useMemo(
    () => searchParams.get('itemId') || searchParams.get('serviceId') || '',
    [searchParamsKey, searchParams]
  );
  const pendingConversationSellerId = useMemo(
    () => String(searchParams.get('sellerId') || '').trim(),
    [searchParamsKey, searchParams]
  );
  const pendingPushAction = useMemo(
    () => String(searchParams.get('pushAction') || '').trim().toLowerCase(),
    [searchParamsKey, searchParams]
  );
  const messagesBasePath = useMemo(
    () => (location.pathname.startsWith('/messages') ? '/messages' : '/profile/messages'),
    [location.pathname]
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === threadId) || null,
    [threadId, threads]
  );

  const replyingToMessage = useMemo(
    () => messages.find((message) => message.id === replyingToMessageId) || null,
    [messages, replyingToMessageId]
  );

  const editingMessage = useMemo(
    () => messages.find((message) => message.id === editingMessageId) || null,
    [editingMessageId, messages]
  );

  const recipientId = useMemo(() => {
    if (!activeThread || !user) return '';
    return activeThread.buyerId === user.id ? activeThread.sellerId : activeThread.buyerId;
  }, [activeThread, user]);

  const recipientPresence = useMemo(() => {
    if (!recipientId) return null;
    return presenceByUserId[recipientId] || null;
  }, [presenceByUserId, recipientId]);

  const syncThreadPreview = useCallback((targetThreadId: string, nextMessages: ChatMessage[]) => {
    if (!targetThreadId) return;
    startTransition(() => {
      setThreads((current) => {
        const next = current.map((thread) => {
          if (thread.id !== targetThreadId) return thread;
          const latestMessage = nextMessages[nextMessages.length - 1] || null;
          return {
            ...thread,
            messages: latestMessage ? [latestMessage] : [],
            lastMessage: latestMessage ? getPreviewText(thread, latestMessage) : thread.lastMessage,
            lastUpdated: latestMessage ? new Date(latestMessage.timestamp).toISOString() : thread.lastUpdated
          };
        });
        return sortThreadsByActivity(next);
      });
    });
  }, []);

  const threadViewModels = useMemo<ThreadViewModel[]>(() => {
    return threads.map((thread) => {
      const latestMessage = getLatestMessage(thread);
      const bucket = getThreadBucket(thread, latestMessage);
      const ownReadTimestamp = threadReadReceiptsById[thread.id]?.[user?.id || ''] || '';
      const latestMessageTimestamp = latestMessage ? new Date(latestMessage.timestamp).getTime() : 0;
      const hasUnread = Boolean(
        latestMessage &&
        latestMessage.senderId !== user?.id &&
        (!ownReadTimestamp || new Date(ownReadTimestamp).getTime() < latestMessageTimestamp)
      );
      return {
        thread,
        bucket,
        previewType: getPreviewType(latestMessage),
        previewText: getPreviewText(thread, latestMessage),
        previewTime: formatThreadPreviewTime(latestMessage?.timestamp || thread.lastUpdated),
        hasUnread,
        contextLabel: getContextLabel(thread, bucket),
        presence: presenceByUserId[thread.otherUser.id] || null,
        latestMessage
      };
    });
  }, [threads, threadReadReceiptsById, presenceByUserId, user?.id]);

  const activeViewModel = useMemo(
    () => threadViewModels.find((viewModel) => viewModel.thread.id === activeThread?.id) || null,
    [activeThread?.id, threadViewModels]
  );

  const bucketCounts = useMemo<Record<InboxBucket, number>>(() => {
    return threadViewModels.reduce(
      (acc, viewModel) => {
        acc[viewModel.bucket] += 1;
        return acc;
      },
      { primary: 0, general: 0, requests: 0 }
    );
  }, [threadViewModels]);

  const filteredThreadViews = useMemo(() => {
    const queryText = deferredThreadSearch.trim().toLowerCase();
    const getMatchScore = (viewModel: ThreadViewModel) => {
      if (!queryText) return 0;
      const name = String(viewModel.thread.otherUser.name || '').toLowerCase();
      const email = String(viewModel.thread.otherUser.email || '').toLowerCase();
      const preview = String(viewModel.previewText || '').toLowerCase();
      const itemTitle = String(viewModel.thread.item?.title || '').toLowerCase();
      const context = String(viewModel.contextLabel || '').toLowerCase();

      if (name.startsWith(queryText)) return 5;
      if (name.includes(queryText)) return 4;
      if (email.includes(queryText)) return 3;
      if (preview.includes(queryText)) return 2;
      if (itemTitle.includes(queryText) || context.includes(queryText)) return 1;
      return -1;
    };

    return threadViewModels
      .filter((viewModel) => {
        if (viewModel.bucket !== activeBucket) return false;
        if (activeFilter === 'unread' && !viewModel.hasUnread) return false;
        if (activeFilter === 'online' && !viewModel.presence?.isOnline) return false;
        if (!queryText) return true;
        return getMatchScore(viewModel) >= 0;
      })
      .sort((left, right) => getMatchScore(right) - getMatchScore(left));
  }, [activeBucket, activeFilter, deferredThreadSearch, threadViewModels]);

  const accountLabel = useMemo(
    () => user?.name || user?.email?.split('@')[0] || 'Messages',
    [user?.email, user?.name]
  );

  const workspaceSubtitle = useMemo(() => {
    if (threads.length === 0) return 'No conversations';
    return `${threads.length} conversation${threads.length === 1 ? '' : 's'}`;
  }, [threads.length]);
  const typingLabel = useMemo(() => {
    if (!typingUsers.length || !activeThread) return null;
    return `${activeThread.otherUser.name.split(' ')[0]} is typing...`;
  }, [activeThread, typingUsers]);

  const presenceLabel = useMemo(() => formatPresenceLabel(recipientPresence), [recipientPresence]);
  const replyPreview = useMemo(() => {
    if (!replyingToMessage) return null;
    const senderLabel = replyingToMessage.senderId === user?.id
      ? 'You'
      : activeThread?.otherUser.name.split(' ')[0] || 'Reply';
    const decrypted = decryptedByMessageId[replyingToMessage.id];
    return {
      senderLabel,
      text: (decrypted || getMessageSnippet(replyingToMessage)).trim() || 'Message'
    };
  }, [activeThread?.otherUser.name, decryptedByMessageId, replyingToMessage, user?.id]);
  const editPreview = useMemo(() => {
    if (!editingMessage) return null;
    const decrypted = decryptedByMessageId[editingMessage.id];
    return {
      text: (decrypted || getMessageSnippet(editingMessage)).trim() || 'Message'
    };
  }, [decryptedByMessageId, editingMessage]);

  const writeMessagesCache = useCallback((targetThreadId: string, nextMessages: ChatMessage[]) => {
    if (!targetThreadId) return;
    writeCachedJson(messageCacheStorageKey(targetThreadId), nextMessages.slice(-MESSAGE_CACHE_LIMIT));
  }, []);

  const commitThreadMessages = useCallback((
    targetThreadId: string,
    nextMessages: ChatMessage[],
    options: {
      cache?: boolean;
      preserveScroll?: boolean;
      scrollToBottom?: boolean;
    } = {}
  ) => {
    const normalizedMessages = sortMessagesByTimestamp(nextMessages);
    if (options.preserveScroll) {
      const scroller = messagesListRef.current;
      preserveScrollOffsetRef.current = scroller
        ? Math.max(0, scroller.scrollHeight - scroller.scrollTop)
        : null;
      shouldScrollToBottomRef.current = false;
    } else {
      preserveScrollOffsetRef.current = null;
      shouldScrollToBottomRef.current = Boolean(options.scrollToBottom);
    }
    loadedThreadIdRef.current = targetThreadId;
    messagesRef.current = normalizedMessages;
    setMessages(normalizedMessages);
    syncThreadPreview(targetThreadId, normalizedMessages);
    if (options.cache) {
      writeMessagesCache(targetThreadId, normalizedMessages);
    }
  }, [syncThreadPreview, writeMessagesCache]);

  const refreshThreadMessages = useCallback(async (
    targetThreadId: string,
    options: {
      scrollToBottom?: boolean;
      preserveLoadedMessages?: boolean;
    } = {}
  ) => {
    const latestMessages = await itemService.getChatMessagesForThread(targetThreadId, { limit: MESSAGE_PAGE_SIZE });
    const baseMessages = options.preserveLoadedMessages
      ? stripTempMessages(messagesRef.current)
      : [];
    const mergedMessages = options.preserveLoadedMessages
      ? mergeMessagesById(baseMessages, latestMessages)
      : latestMessages;
    commitThreadMessages(targetThreadId, mergedMessages, {
      cache: true,
      scrollToBottom: options.scrollToBottom
    });
    setHasOlderMessages((current) => latestMessages.length >= MESSAGE_PAGE_SIZE || (options.preserveLoadedMessages && current));
    return mergedMessages;
  }, [commitThreadMessages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (activeViewModel) {
      setActiveBucket(activeViewModel.bucket);
    }
  }, [activeViewModel?.bucket, activeViewModel?.thread.id]);

  useEffect(() => {
    loadedThreadIdRef.current = null;
    preserveScrollOffsetRef.current = null;
    shouldScrollToBottomRef.current = Boolean(threadId);
    setReplyingToMessageId(null);
    setEditingMessageId(null);
    setNewMessage('');
    setImageToSend(null);
    setIsLoadingOlderMessages(false);
    setHasOlderMessages(false);
  }, [threadId]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopLayout(event.matches);
    };

    setIsDesktopLayout(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isDesktopLayout || threadId || threads.length === 0 || pendingConversationSellerId) return;
    navigate(`${messagesBasePath}/${threads[0].id}`, { replace: true });
  }, [isDesktopLayout, messagesBasePath, navigate, pendingConversationSellerId, threadId, threads]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const initNewChat = async () => {
      if (!pendingConversationSellerId) return;
      try {
        const nextThreadId = await itemService.findOrCreateChatThread(pendingConversationItemId, user.id, pendingConversationSellerId);
        navigate(`${messagesBasePath}/${nextThreadId}`, { replace: true });
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };

    void initNewChat();
  }, [messagesBasePath, navigate, pendingConversationItemId, pendingConversationSellerId, user]);

  useEffect(() => {
    if (!user || !threadId) return;
    if (!pendingPushAction) return;

    const handlePushAction = async () => {
      try {
        if (pendingPushAction === 'mark_read') {
          await itemService.markThreadRead(threadId, user.id, new Date().toISOString());
        } else if (pendingPushAction === 'react') {
          await itemService.sendMessageToThread(threadId, user.id, '+1');
        }
      } catch (error) {
        console.warn('Unable to process push action:', error);
      } finally {
        navigate(`${messagesBasePath}/${threadId}`, { replace: true });
      }
    };

    void handlePushAction();
  }, [messagesBasePath, navigate, pendingPushAction, threadId, user]);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      return;
    }

    let cancelled = false;

    const fetchThreads = async () => {
      const cachedThreads = readCachedJson<ThreadWithDetails[]>(threadCacheKey) || [];
      if (cachedThreads.length > 0 && !cancelled) {
        setThreads(sortThreadsByActivity(cachedThreads));
      }
      setIsLoading(true);
      try {
        const userThreads = await itemService.getChatThreadsForUser(user.id);
        const participantProfileCache = new Map<string, User | null>();
        const resolveParticipantProfile = async (participantId: string): Promise<User | null> => {
          const key = String(participantId || '');
          if (!key) return null;
          if (participantProfileCache.has(key)) {
            return participantProfileCache.get(key) || null;
          }
          const resolved = await userService.getUserById(key).catch(() => null);
          participantProfileCache.set(key, resolved);
          return resolved;
        };

        const threadsWithDetails: ThreadWithDetails[] = await Promise.all(
          userThreads.map(async (thread) => {
            let otherUserId = thread.sellerId === user.id ? thread.buyerId : thread.sellerId;
            let preResolvedOtherUser: User | null = null;

            if (thread.buyerId !== user.id && thread.sellerId !== user.id) {
              const [buyerProfile, sellerProfile] = await Promise.all([
                resolveParticipantProfile(thread.buyerId),
                resolveParticipantProfile(thread.sellerId)
              ]);

              if (buyerProfile?.id === user.id && thread.sellerId) {
                otherUserId = thread.sellerId;
                preResolvedOtherUser = sellerProfile;
              } else if (sellerProfile?.id === user.id && thread.buyerId) {
                otherUserId = thread.buyerId;
                preResolvedOtherUser = buyerProfile;
              } else if (sellerProfile?.id && sellerProfile.id !== user.id) {
                otherUserId = thread.sellerId;
                preResolvedOtherUser = sellerProfile;
              } else if (buyerProfile?.id && buyerProfile.id !== user.id) {
                otherUserId = thread.buyerId;
                preResolvedOtherUser = buyerProfile;
              }
            }

            const [otherUser, item] = await Promise.all([
              preResolvedOtherUser ? Promise.resolve(preResolvedOtherUser) : resolveParticipantProfile(otherUserId),
              thread.itemId ? itemService.getItemById(thread.itemId) : Promise.resolve(null)
            ]);

            const fallbackUser: User = otherUser || {
              id: otherUserId,
              name: 'Urban Prime User',
              email: '',
              avatar: '/icons/urbanprime.svg',
              following: [],
              followers: [],
              wishlist: [],
              cart: [],
              badges: [],
              memberSince: new Date().toISOString(),
              status: 'active'
            };

            const fallbackItem: Item = item || ({
              id: thread.itemId || `direct-${thread.id}`,
              title: thread.itemId ? 'Listing' : 'Direct conversation',
              description: '',
              category: 'general',
              price: 0,
              listingType: 'sale',
              imageUrls: [],
              images: [],
              owner: {
                id: otherUserId,
                name: fallbackUser.name,
                avatar: fallbackUser.avatar || '/icons/urbanprime.svg'
              },
              avgRating: 0,
              reviews: [],
              stock: 0,
              createdAt: new Date().toISOString()
            } as Item);

            return { ...thread, otherUser: fallbackUser, item: fallbackItem };
          })
        );

        if (cancelled) return;
        const resolvedThreads = sortThreadsByActivity(threadsWithDetails.length > 0 ? threadsWithDetails : cachedThreads);
        startTransition(() => {
          setThreads(resolvedThreads);
        });
        if (resolvedThreads.length > 0) {
          writeCachedJson(threadCacheKey, resolvedThreads);
        }
      } catch (error) {
        console.error('Failed to fetch threads:', error);
        if (!cancelled && cachedThreads.length > 0) {
          setThreads(sortThreadsByActivity(cachedThreads));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (!pendingConversationItemId || !pendingConversationSellerId) {
      void fetchThreads();
    }

    return () => {
      cancelled = true;
    };
  }, [navigate, pendingConversationItemId, pendingConversationSellerId, threadCacheKey, user]);

  useEffect(() => {
    if (!isNewChatOpen) {
      setNewChatResults([]);
      setIsSearchingUsers(false);
      setNewChatError(null);
      return;
    }

    const queryText = newChatQuery.trim();
    if (queryText.length < 2) {
      setNewChatResults([]);
      setIsSearchingUsers(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await userService.searchUsers(queryText, {
          excludeUserId: user?.id,
          limit: 12
        });
        if (cancelled) return;
        setNewChatResults(results);
      } catch (error) {
        if (cancelled) return;
        console.warn('User search failed:', error);
        setNewChatResults([]);
      } finally {
        if (!cancelled) setIsSearchingUsers(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isNewChatOpen, newChatQuery, user?.id]);

  useEffect(() => {
    if (!threadId) {
      loadedThreadIdRef.current = null;
      setMessages([]);
      setTypingUsers([]);
      setReadReceipts({});
      setActiveCall(null);
      setHasOlderMessages(false);
      setIsLoadingOlderMessages(false);
      return;
    }

    if (isBackendConfigured()) {
      let cancelled = false;

      const loadMessages = async () => {
        if (fetchMessagesInFlightRef.current) return;
        fetchMessagesInFlightRef.current = true;
        try {
          const isFirstLoad = loadedThreadIdRef.current !== threadId;
          const threadMessages = await itemService.getChatMessagesForThread(threadId, { limit: MESSAGE_PAGE_SIZE });
          if (cancelled) return;
          const cachedMessages = readCachedJson<ChatMessage[]>(messageCacheKey) || [];
          const resolvedPage = threadMessages.length === 0 && cachedMessages.length > 0
            ? sortMessagesByTimestamp(cachedMessages)
            : threadMessages;
          const mergedMessages = isFirstLoad
            ? resolvedPage
            : mergeMessagesById(stripTempMessages(messagesRef.current), resolvedPage);
          commitThreadMessages(threadId, mergedMessages, {
            cache: threadMessages.length > 0,
            scrollToBottom: isFirstLoad || isScrollerNearBottom(messagesListRef.current)
          });
          setHasOlderMessages(threadMessages.length >= MESSAGE_PAGE_SIZE);
          messagePollBackoffRef.current = document.hidden ? MESSAGE_POLL_BACKGROUND_MS : MESSAGE_POLL_FOREGROUND_MS;
        } catch (error) {
          console.error('Failed to load thread messages:', error);
          const cachedMessages = readCachedJson<ChatMessage[]>(messageCacheKey);
          if (cachedMessages && cachedMessages.length > 0 && !cancelled) {
            commitThreadMessages(threadId, sortMessagesByTimestamp(cachedMessages), {
              scrollToBottom: loadedThreadIdRef.current !== threadId
            });
            setHasOlderMessages(cachedMessages.length >= MESSAGE_PAGE_SIZE);
          }
          messagePollBackoffRef.current = Math.min(messagePollBackoffRef.current * 2, MESSAGE_POLL_BACKGROUND_MS * 2);
        } finally {
          fetchMessagesInFlightRef.current = false;
        }
      };

      let timeoutId: number | null = null;
      const scheduleNext = () => {
        if (cancelled) return;
        const nextDelay = document.hidden ? Math.max(messagePollBackoffRef.current, MESSAGE_POLL_BACKGROUND_MS) : messagePollBackoffRef.current;
        timeoutId = window.setTimeout(async () => {
          await loadMessages();
          scheduleNext();
        }, nextDelay);
      };

      void loadMessages().then(scheduleNext);
      return () => {
        cancelled = true;
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    const firebaseQuery = query(
      collection(db, 'chatThreads', threadId, 'messages'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(MESSAGE_PAGE_SIZE)
    );
    const unsubscribe = onSnapshot(
      firebaseQuery,
      (querySnapshot) => {
        const threadMessages: ChatMessage[] = [];
        querySnapshot.forEach((entry) => {
          threadMessages.push({ id: entry.id, ...entry.data() } as ChatMessage);
        });
        const normalizedMessages = sortMessagesByTimestamp(threadMessages);
        commitThreadMessages(threadId, normalizedMessages, {
          cache: normalizedMessages.length > 0,
          scrollToBottom: loadedThreadIdRef.current !== threadId || isScrollerNearBottom(messagesListRef.current)
        });
        setHasOlderMessages(querySnapshot.size >= MESSAGE_PAGE_SIZE);
        if (threadMessages.length > 0) {
          writeMessagesCache(threadId, normalizedMessages);
        }
      },
      (error) => {
        console.warn('Realtime message listener failed:', error);
        const cachedMessages = readCachedJson<ChatMessage[]>(messageCacheKey);
        if (cachedMessages && cachedMessages.length > 0) {
          commitThreadMessages(threadId, sortMessagesByTimestamp(cachedMessages), {
            scrollToBottom: loadedThreadIdRef.current !== threadId
          });
          setHasOlderMessages(cachedMessages.length >= MESSAGE_PAGE_SIZE);
        }
      }
    );

    return () => unsubscribe();
  }, [commitThreadMessages, messageCacheKey, threadId, writeMessagesCache]);

  useEffect(() => {
    if (!threadId || !user || !isBackendConfigured()) {
      setTypingUsers([]);
      setReadReceipts({});
      setActiveCall(null);
      return;
    }

    let cancelled = false;
    const refreshThreadMeta = async () => {
      if (threadMetaInFlightRef.current) return;
      threadMetaInFlightRef.current = true;
      try {
        const [typing, receipts, callSession, presenceMap] = await Promise.all([
          itemService.getThreadTypingUsers(threadId, user.id),
          itemService.getThreadReadReceipts(threadId),
          itemService.getActiveThreadCall(threadId),
          recipientId ? itemService.getPresenceForUsers([recipientId]) : Promise.resolve({})
        ]);
        if (cancelled) return;
        setTypingUsers(typing);
        setReadReceipts(receipts);
        setThreadReadReceiptsById((current) => ({
          ...current,
          [threadId]: receipts
        }));
        setActiveCall(callSession);
        if (recipientId) {
          setPresenceByUserId((current) => ({
            ...current,
            ...(presenceMap || {})
          }));
        }
        metaPollBackoffRef.current = document.hidden ? META_POLL_BACKGROUND_MS : META_POLL_FOREGROUND_MS;
      } catch {
        metaPollBackoffRef.current = Math.min(metaPollBackoffRef.current * 2, META_POLL_BACKGROUND_MS * 2);
      } finally {
        threadMetaInFlightRef.current = false;
      }
    };

    let timeoutId: number | null = null;
    const scheduleNext = () => {
      if (cancelled) return;
      const liveCallDelay = activeCallRef.current?.status === 'ringing'
        ? META_POLL_RINGING_MS
        : metaPollBackoffRef.current;
      const nextDelay = document.hidden
        ? Math.max(liveCallDelay, META_POLL_BACKGROUND_MS)
        : liveCallDelay;
      timeoutId = window.setTimeout(async () => {
        await refreshThreadMeta();
        scheduleNext();
      }, nextDelay);
    };

    void refreshThreadMeta().then(scheduleNext);
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [recipientId, threadId, user]);

  useEffect(() => {
    if (!user || !threads.length || !isBackendConfigured()) return;
    const threadIds = threads.map((thread) => thread.id);
    let cancelled = false;

    const loadReceipts = async () => {
      try {
        const receiptsByThread = await itemService.getReadReceiptsForThreads(threadIds);
        if (cancelled) return;
        setThreadReadReceiptsById((current) => ({
          ...current,
          ...receiptsByThread
        }));
      } catch {
        // ignore unread hydration failures
      }
    };

    void loadReceipts();

    return () => {
      cancelled = true;
    };
  }, [threads, user]);

  useEffect(() => {
    if (!user || !threads.length || !isBackendConfigured()) return;
    const otherUserIds = Array.from(new Set(threads.map((thread) => thread.otherUser.id).filter(Boolean)));
    let cancelled = false;

    const refreshPresence = async () => {
      try {
        const nextPresence = await itemService.getPresenceForUsers(otherUserIds);
        if (cancelled) return;
        setPresenceByUserId((current) => ({
          ...current,
          ...nextPresence
        }));
      } catch {
        // ignore presence refresh failures
      }
    };

    void refreshPresence();
    const intervalId = window.setInterval(() => {
      void refreshPresence();
    }, 28000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [threads, user]);

  useEffect(() => {
    if (!user || !isBackendConfigured()) return;
    let active = true;

    const sendHeartbeat = async (isOnline: boolean) => {
      try {
        await itemService.updatePresenceStatus({
          isOnline,
          lastSeenAt: isOnline ? undefined : new Date().toISOString()
        });
      } catch {
        // keep silent for transient presence errors
      }
    };

    void sendHeartbeat(true);
    const intervalId = window.setInterval(() => {
      if (!active) return;
      void sendHeartbeat(true);
    }, 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      void sendHeartbeat(false);
    };
  }, [user]);

  useEffect(() => {
    if (!activeCall || !user) {
      setCallBannerState('none');
      return;
    }
    if (activeCall.status === 'accepted') {
      setCallBannerState('active');
      return;
    }
    if (activeCall.status === 'ringing') {
      if (activeCall.initiatorId === user.id) {
        setCallBannerState('outgoing');
        return;
      }
      const silentByIds = activeCall.silentByIds || [];
      if (silentByIds.includes(user.id)) {
        setCallBannerState('none');
        return;
      }
      setCallBannerState('incoming');
      return;
    }
    setCallBannerState('none');
  }, [activeCall, user]);

  useEffect(() => {
    if (!threadId || !user || !messages.length || !isBackendConfigured()) return;
    const latest = messages[messages.length - 1];
    const latestTs = new Date(latest.timestamp).toISOString();
    const nextKey = `${threadId}:${latestTs}`;
    if (markReadKeyRef.current === nextKey) return;
    markReadKeyRef.current = nextKey;
    setReadReceipts((current) => ({
      ...current,
      [user.id]: latestTs
    }));
    setThreadReadReceiptsById((current) => ({
      ...current,
      [threadId]: {
        ...(current[threadId] || {}),
        [user.id]: latestTs
      }
    }));
    void itemService.markThreadRead(threadId, user.id, latestTs);
  }, [messages, threadId, user]);

  useEffect(() => {
    if (!threadId) return;
    const storageKey = getChatEncryptionStorageKey(threadId);
    const savedPassphrase = window.localStorage.getItem(storageKey) || '';
    const storedSettings = readChatSettings(threadId);
    const nextSettings: ChatSettings = {
      ...storedSettings,
      e2eEnabled: storedSettings.e2eEnabled || Boolean(savedPassphrase),
      soundEnabled: notificationSettings.soundEnabled
    };
    setThreadPassphrase(savedPassphrase);
    setThreadPassphraseInput(savedPassphrase);
    setChatSettings(nextSettings);
    persistChatSettings(threadId, nextSettings);
    setDecryptedByMessageId({});
    setDecryptErrorByMessageId({});
  }, [notificationSettings.soundEnabled, threadId]);

  useEffect(() => {
    if (!threadId || !isBackendConfigured()) return;
    let cancelled = false;

    const syncSettingsFromProfile = async () => {
      try {
        const unified = await profileOnboardingService.getProfileMe();
        const profilePreferences = unified?.profile?.preferences || {};
        if (cancelled) return;
        if (typeof profilePreferences?.chatPresenceVisible === 'boolean') {
          setChatSettings((current) => {
            const next = {
              ...current,
              presenceVisible: profilePreferences.chatPresenceVisible
            };
            persistChatSettings(threadId, next);
            return next;
          });
        }
      } catch {
        // ignore profile preference sync failures
      }
    };

    void syncSettingsFromProfile();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    let cancelled = false;

    const decryptMessages = async () => {
      if (!chatSettings.e2eEnabled || !threadPassphrase.trim()) {
        setDecryptedByMessageId({});
        setDecryptErrorByMessageId({});
        return;
      }

      const nextDecrypted: Record<string, string> = {};
      const nextErrors: Record<string, boolean> = {};
      await Promise.all(
        messages.map(async (message) => {
          const encryptedPayload = message.content?.encrypted
            ? String(message.content?.payload || '')
            : (typeof message.text === 'string' && message.text.startsWith('__enc_v1__:') ? message.text : '');
          if (!encryptedPayload) return;
          try {
            const plain = await decryptChatText(encryptedPayload, threadPassphrase);
            nextDecrypted[message.id] = plain;
          } catch {
            nextErrors[message.id] = true;
          }
        })
      );

      if (cancelled) return;
      setDecryptedByMessageId(nextDecrypted);
      setDecryptErrorByMessageId(nextErrors);
    };

    void decryptMessages();
    return () => {
      cancelled = true;
    };
  }, [chatSettings.e2eEnabled, messages, threadPassphrase]);

  useEffect(() => {
    if (!threadId || !user || !isBackendConfigured()) return;
    const shouldType = Boolean(newMessage.trim());

    if (typingStateRef.current !== shouldType) {
      typingStateRef.current = shouldType;
      void itemService.setThreadTypingState(threadId, user.id, shouldType);
    }

    if (typingHeartbeatRef.current) {
      window.clearInterval(typingHeartbeatRef.current);
      typingHeartbeatRef.current = null;
    }

    if (shouldType) {
      typingHeartbeatRef.current = window.setInterval(() => {
        void itemService.setThreadTypingState(threadId, user.id, true);
      }, 2500);
    }

    return () => {
      if (typingHeartbeatRef.current) {
        window.clearInterval(typingHeartbeatRef.current);
        typingHeartbeatRef.current = null;
      }
    };
  }, [newMessage, threadId, user]);

  const updateChatSettings = useCallback(async (patch: Partial<ChatSettings>) => {
    const nextSettings: ChatSettings = {
      ...chatSettings,
      ...patch
    };
    setChatSettings(nextSettings);
    if (threadId) {
      persistChatSettings(threadId, nextSettings);
    }
    if (patch.soundEnabled !== undefined) {
      updateNotificationSettings({ soundEnabled: patch.soundEnabled });
    }
    if (patch.presenceVisible !== undefined) {
      try {
        await itemService.updatePresenceStatus({
          visibility: patch.presenceVisible,
          isOnline: true
        });
        await profileOnboardingService.patchProfileMe({
          preferences: {
            chatPresenceVisible: patch.presenceVisible
          }
        });
      } catch (error) {
        console.warn('Unable to sync presence preference:', error);
      }
    }
  }, [chatSettings, threadId, updateNotificationSettings]);

  const handleChatSettingsPatch = useCallback((patch: Partial<ChatSettings>) => {
    if (patch.e2eEnabled === false && threadId) {
      window.localStorage.removeItem(getChatEncryptionStorageKey(threadId));
      setThreadPassphrase('');
      setThreadPassphraseInput('');
    }
    void updateChatSettings(patch);
  }, [threadId, updateChatSettings]);

  const saveThreadPassphrase = () => {
    if (!threadId) return;
    const storageKey = getChatEncryptionStorageKey(threadId);
    const normalized = threadPassphraseInput.trim();
    if (!normalized) {
      window.localStorage.removeItem(storageKey);
      setThreadPassphrase('');
      setThreadPassphraseInput('');
      void updateChatSettings({ e2eEnabled: false });
      return;
    }
    window.localStorage.setItem(storageKey, normalized);
    setThreadPassphrase(normalized);
    void updateChatSettings({ e2eEnabled: true });
  };

  const stopMediaResources = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== 'inactive') recorder.stop();
  };

  const cancelVoiceRecording = () => {
    discardVoiceRecordingRef.current = true;
    stopVoiceRecording();
  };

  const startVoiceRecording = async () => {
    if (!activeThread || !user) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSendError('Voice recording is not supported in this browser.');
      return;
    }

    try {
      setSendError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMimeType = getPreferredRecorderMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      const voiceReplyTargetId = replyingToMessageId || undefined;
      voiceChunksRef.current = [];
      discardVoiceRecordingRef.current = false;
      recordingMsRef.current = 0;
      setRecordingMs(0);

      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || preferredMimeType || 'audio/webm';
        const voiceBlob = new Blob(voiceChunksRef.current, { type: mimeType });
        const duration = recordingMsRef.current;
        const shouldDiscard = discardVoiceRecordingRef.current;
        voiceChunksRef.current = [];
        discardVoiceRecordingRef.current = false;
        stopMediaResources();
        setIsRecordingVoice(false);
        recordingMsRef.current = 0;
        setRecordingMs(0);
        if (shouldDiscard || !voiceBlob.size) return;

        try {
          setIsSendingVoice(true);
          await itemService.sendVoiceNoteToThread(activeThread.id, user.id, voiceBlob, duration, {
            replyToMessageId: voiceReplyTargetId
          });
          setReplyingToMessageId(null);
          await refreshThreadMessages(activeThread.id, {
            scrollToBottom: true,
            preserveLoadedMessages: true
          });
        } catch (error) {
          setSendError(error instanceof Error ? error.message : 'Failed to send voice note.');
        } finally {
          setIsSendingVoice(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsRecordingVoice(true);
      setIsComposerActionsOpen(false);
      recordingTimerRef.current = window.setInterval(() => {
        recordingMsRef.current += 1000;
        setRecordingMs(recordingMsRef.current);
      }, 1000);
    } catch (error) {
      stopMediaResources();
      discardVoiceRecordingRef.current = false;
      recordingMsRef.current = 0;
      setIsRecordingVoice(false);
      setSendError(error instanceof Error ? error.message : 'Unable to start voice recording.');
    }
  };

  const openJitsiRoom = useCallback((roomName: string, mode: 'voice' | 'video') => {
    const configHash = mode === 'voice'
      ? '#config.startWithVideoMuted=true&config.startAudioOnly=true'
      : '#config.startWithVideoMuted=false';
    window.open(`https://meet.jit.si/${encodeURIComponent(roomName)}${configHash}`, '_blank', 'noopener,noreferrer');
  }, []);

  const startCall = async (mode: 'voice' | 'video') => {
    if (!activeThread || !user) return;
    if (callInFlightRef.current) return;
    callInFlightRef.current = true;
    try {
      const session = await itemService.startThreadCall(activeThread.id, mode);
      if (!session) return;
      setActiveCall(session);
      setCallBannerState('outgoing');
      openJitsiRoom(session.roomName, session.mode);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to start call.');
    } finally {
      callInFlightRef.current = false;
    }
  };

  const respondToCall = async (action: 'accept' | 'decline' | 'silent') => {
    if (!activeCall) return;
    if (callInFlightRef.current) return;
    callInFlightRef.current = true;
    try {
      const session = await itemService.respondToThreadCall(activeCall.id, action);
      if (session) setActiveCall(session);
      if (action === 'accept' && session) {
        setCallBannerState('active');
        openJitsiRoom(session.roomName, session.mode);
      } else {
        setCallBannerState('none');
      }
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to update call.');
    } finally {
      callInFlightRef.current = false;
    }
  };

  const hangupCall = async (reason?: string) => {
    if (!activeCall) return;
    if (callInFlightRef.current) return;
    callInFlightRef.current = true;
    try {
      const session = await itemService.endThreadCall(activeCall.id, reason || 'ended');
      if (session) setActiveCall(session);
      setCallBannerState('none');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to end call.');
    } finally {
      callInFlightRef.current = false;
    }
  };

  const handleReplyToMessage = useCallback((message: ChatMessage) => {
    if (!message?.id) return;
    setEditingMessageId(null);
    setReplyingToMessageId(message.id);
    setIsComposerActionsOpen(false);
  }, []);

  const handleEditMessage = useCallback((message: ChatMessage) => {
    if (!message?.id || message.deletedAt) return;
    setReplyingToMessageId(null);
    setEditingMessageId(message.id);
    setImageToSend(null);
    setIsComposerActionsOpen(false);
    setNewMessage(decryptedByMessageId[message.id] || message.text || '');
  }, [decryptedByMessageId]);

  const handleCancelComposerReply = useCallback(() => {
    setReplyingToMessageId(null);
  }, []);

  const handleCancelComposerEdit = useCallback(() => {
    setEditingMessageId(null);
    setNewMessage('');
  }, []);

  const handleDeleteMessage = useCallback(async (message: ChatMessage) => {
    if (!activeThread || !user || message.senderId !== user.id || message.deletedAt) return;
    const previousMessages = messagesRef.current;
    const optimisticDeletedAt = new Date().toISOString();
    const optimisticMessages = previousMessages.map((entry) => (
      entry.id === message.id
        ? {
            ...entry,
            text: '',
            imageUrl: undefined,
            audioUrl: undefined,
            audioDurationMs: undefined,
            offer: undefined,
            content: undefined,
            reactions: {},
            editedAt: undefined,
            deletedAt: optimisticDeletedAt
          }
        : entry
    ));

    if (editingMessageId === message.id) {
      setEditingMessageId(null);
      setNewMessage('');
    }
    if (replyingToMessageId === message.id) {
      setReplyingToMessageId(null);
    }

    commitThreadMessages(activeThread.id, optimisticMessages, { cache: true });
    try {
      await itemService.deleteThreadMessage(activeThread.id, message.id);
      await refreshThreadMessages(activeThread.id, {
        preserveLoadedMessages: true
      });
    } catch (error) {
      commitThreadMessages(activeThread.id, previousMessages, { cache: true });
      setSendError(error instanceof Error ? error.message : 'Failed to delete message.');
    }
  }, [activeThread, commitThreadMessages, editingMessageId, refreshThreadMessages, replyingToMessageId, user]);

  const handleToggleReaction = useCallback(async (message: ChatMessage, emoji: string) => {
    if (!activeThread || !user || !message?.id || message.deletedAt) return;
    const previousMessages = messagesRef.current;
    const currentReactions = message.reactions || {};
    const currentUsers = currentReactions[emoji] || [];
    const nextUsers = currentUsers.includes(user.id)
      ? currentUsers.filter((entry) => entry !== user.id)
      : [...currentUsers, user.id];
    const nextReactions = Object.entries(currentReactions).reduce<Record<string, string[]>>((accumulator, [key, userIds]) => {
      if (key === emoji) return accumulator;
      if (Array.isArray(userIds) && userIds.length > 0) accumulator[key] = userIds;
      return accumulator;
    }, {});
    if (nextUsers.length > 0) {
      nextReactions[emoji] = nextUsers;
    }

    const optimisticMessages = previousMessages.map((entry) => (
      entry.id === message.id
        ? { ...entry, reactions: nextReactions }
        : entry
    ));

    commitThreadMessages(activeThread.id, optimisticMessages, { cache: true });
    try {
      await itemService.setThreadMessageReactions(activeThread.id, message.id, nextReactions);
    } catch (error) {
      commitThreadMessages(activeThread.id, previousMessages, { cache: true });
      setSendError(error instanceof Error ? error.message : 'Failed to update reaction.');
    }
  }, [activeThread, commitThreadMessages, user]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!activeThread || isLoadingOlderMessages || !hasOlderMessages || messagesRef.current.length === 0) return;
    const oldestLoadedMessage = messagesRef.current[0];
    const before = new Date(oldestLoadedMessage.timestamp).toISOString();

    setIsLoadingOlderMessages(true);
    try {
      const olderMessages = await itemService.getChatMessagesForThread(activeThread.id, {
        limit: MESSAGE_PAGE_SIZE,
        before
      });
      if (olderMessages.length === 0) {
        setHasOlderMessages(false);
        return;
      }

      const mergedMessages = mergeMessagesById(olderMessages, stripTempMessages(messagesRef.current));
      commitThreadMessages(activeThread.id, mergedMessages, {
        cache: true,
        preserveScroll: true
      });
      setHasOlderMessages(olderMessages.length >= MESSAGE_PAGE_SIZE);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to load older messages.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [activeThread, commitThreadMessages, hasOlderMessages, isLoadingOlderMessages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!newMessage.trim() && !imageToSend) || !activeThread || !user) return;

    try {
      setSendError(null);
      let payloadText = newMessage.trim();
      if (payloadText && chatSettings.e2eEnabled && threadPassphrase.trim()) {
        payloadText = await encryptChatText(payloadText, threadPassphrase);
      }

      if (editingMessageId) {
        await itemService.editThreadMessage(activeThread.id, editingMessageId, payloadText);
        setNewMessage('');
        setEditingMessageId(null);
        await refreshThreadMessages(activeThread.id, {
          preserveLoadedMessages: true
        });
      } else {
        const previousMessages = stripTempMessages(messagesRef.current);
        const optimisticMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          senderId: user.id,
          text: payloadText,
          imageUrl: imageToSend || undefined,
          timestamp: new Date().toISOString(),
          type: 'text',
          replyToMessageId: replyingToMessageId || undefined
        };
        const optimisticMessages = [...previousMessages, optimisticMessage];
        commitThreadMessages(activeThread.id, optimisticMessages, {
          cache: true,
          scrollToBottom: true
        });

        try {
          await itemService.sendMessageToThread(
            activeThread.id,
            user.id,
            payloadText,
            imageToSend || undefined,
            { replyToMessageId: replyingToMessageId || undefined }
          );
        } catch (error) {
          commitThreadMessages(activeThread.id, previousMessages, { cache: true });
          throw error;
        }

        setNewMessage('');
        setImageToSend(null);
        setReplyingToMessageId(null);
        setIsComposerActionsOpen(false);
        typingStateRef.current = false;
        if (isBackendConfigured()) {
          await itemService.setThreadTypingState(activeThread.id, user.id, false);
        }
        await refreshThreadMessages(activeThread.id, {
          scrollToBottom: true,
          preserveLoadedMessages: true
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send message.');
    }
  };

  const handleSendOffer = async (offerData: Omit<CustomOffer, 'id' | 'status'>) => {
    if (!activeThread || !user) return;
    try {
      setSendError(null);
      await itemService.sendOfferToThread(activeThread.id, user.id, offerData);
      setReplyingToMessageId(null);
      setEditingMessageId(null);
      await refreshThreadMessages(activeThread.id, {
        scrollToBottom: true,
        preserveLoadedMessages: true
      });
    } catch (error) {
      console.error('Failed to send offer:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send offer.');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (editingMessageId) {
        setEditingMessageId(null);
        setNewMessage('');
      }
      setImageToSend(reader.result as string);
      setIsComposerActionsOpen(false);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAcceptOffer = useCallback((_offerId: string) => {
    navigate('/checkout');
  }, [navigate]);

  const handleSelectThread = (nextThreadId: string) => {
    setThreadMenuId(null);
    setSendError(null);
    setIsComposerActionsOpen(false);
    setIsContextPanelOpen(false);
    setReplyingToMessageId(null);
    setEditingMessageId(null);
    setImageToSend(null);
    navigate(`${messagesBasePath}/${nextThreadId}`);
  };

  const handleBackToInbox = () => {
    setThreadMenuId(null);
    setIsComposerActionsOpen(false);
    setIsContextPanelOpen(false);
    setReplyingToMessageId(null);
    setEditingMessageId(null);
    setImageToSend(null);
    navigate(messagesBasePath);
  };

  const handleStartNewConversation = async (targetUser: User) => {
    if (!user || !targetUser?.id) return;
    if (targetUser.id === user.id) {
      setNewChatError('You cannot start a conversation with yourself.');
      return;
    }
    try {
      setNewChatError(null);
      const nextThreadId = await itemService.findOrCreateChatThread('', user.id, targetUser.id);
      setIsNewChatOpen(false);
      setNewChatQuery('');
      setNewChatResults([]);
      navigate(`${messagesBasePath}/${nextThreadId}`);
    } catch (error) {
      setNewChatError(error instanceof Error ? error.message : 'Unable to start conversation.');
    }
  };

  const handleMoveThread = async (targetThreadId: string, bucket: 'primary' | 'general') => {
    const previousThread = threads.find((thread) => thread.id === targetThreadId);
    if (!previousThread) return;
    const previousLabel = previousThread.inboxLabel ?? null;
    startTransition(() => {
      setThreads((current) => current.map((thread) => (
        thread.id === targetThreadId
          ? { ...thread, inboxLabel: bucket }
          : thread
      )));
    });
    setThreadMenuId(null);
    try {
      await itemService.setThreadInboxLabel(targetThreadId, bucket);
    } catch (error) {
      startTransition(() => {
        setThreads((current) => current.map((thread) => (
          thread.id === targetThreadId
            ? { ...thread, inboxLabel: previousLabel }
            : thread
        )));
      });
      setSendError(error instanceof Error ? error.message : 'Unable to update inbox placement.');
    }
  };

  const recordingLabel = useMemo(
    () => `Voice note ${formatDuration(recordingMs)}`,
    [recordingMs]
  );

  useLayoutEffect(() => {
    const scroller = messagesListRef.current;
    if (!scroller) return;
    if (preserveScrollOffsetRef.current !== null) {
      const nextOffset = preserveScrollOffsetRef.current;
      preserveScrollOffsetRef.current = null;
      scroller.scrollTop = Math.max(0, scroller.scrollHeight - nextOffset);
      return;
    }
    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: isLowEndMode ? 'auto' : 'smooth'
      });
    }
  }, [isLowEndMode, messages]);

  useEffect(() => {
    return () => {
      if (typingHeartbeatRef.current) {
        window.clearInterval(typingHeartbeatRef.current);
      }
      if (threadId && user && typingStateRef.current && isBackendConfigured()) {
        void itemService.setThreadTypingState(threadId, user.id, false);
      }
      stopMediaResources();
    };
  }, [threadId, user]);

  if (!user) {
    return (
      <div className="messages-auth-gate mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="messages-auth-card rounded-[2.2rem] border border-border bg-surface p-8 text-center shadow-soft">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </div>
          <p className="messages-auth-kicker mt-6">Full inbox access</p>
          <h1 className="mt-6 text-2xl font-black text-text-primary">Sign in to open Messages</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-text-secondary">
            Your inbox syncs across mobile and desktop, including offers, voice notes, replies, and conversation history.
          </p>
          <div className="messages-auth-chip-row mt-5">
            <span className="messages-auth-chip">Desktop + mobile sync</span>
            <span className="messages-auth-chip">Offers and milestones</span>
            <span className="messages-auth-chip">Voice notes and calls</span>
          </div>
          <button type="button" onClick={() => navigate('/auth')} className="messages-primary-button messages-auth-cta mx-auto mt-6">
            <span>Sign in</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
          <p className="messages-auth-helper mx-auto mt-4 max-w-xl text-sm text-text-secondary">
            Spotlight quick chats continue here after sign in. Your full inbox also lives in Dashboard Messages.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && threads.length === 0) {
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <>
      <CreateOfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSend={handleSendOffer}
      />
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        query={newChatQuery}
        onQueryChange={setNewChatQuery}
        results={newChatResults}
        isSearching={isSearchingUsers}
        error={newChatError}
        onSelectUser={(targetUser) => void handleStartNewConversation(targetUser)}
      />

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <div className={`messages-workspace ${isLowEndMode ? 'messages-workspace--lite' : ''}`}>
        <div className="messages-workspace-grid messages-chat-shell">
          <aside className={`messages-thread-rail ${threadId ? 'hidden sm:flex' : 'flex'}`}>
            <ThreadRail
              accountLabel={accountLabel}
              subtitle={workspaceSubtitle}
              activeBucket={activeBucket}
              counts={bucketCounts}
              activeFilter={activeFilter}
              searchValue={threadSearch}
              onSearchChange={setThreadSearch}
              onBucketChange={setActiveBucket}
              onFilterChange={setActiveFilter}
              onNewChat={() => setIsNewChatOpen(true)}
              threadViews={filteredThreadViews}
              activeThreadId={activeThread?.id}
              menuThreadId={threadMenuId}
              onSelectThread={handleSelectThread}
              onToggleThreadMenu={(nextThreadId) => setThreadMenuId((current) => current === nextThreadId ? null : nextThreadId)}
              onMoveThread={handleMoveThread}
            />
          </aside>

          <section className={`messages-conversation-panel ${threadId || isDesktopLayout ? 'flex' : 'hidden'} ${threadId ? 'is-mobile-active' : ''}`}>
            {activeThread && activeViewModel ? (
              <>
                <ConversationHeader
                  activeViewModel={activeViewModel}
                  presenceLabel={presenceLabel}
                  onBack={handleBackToInbox}
                  onVoiceCall={() => void startCall('voice')}
                  onVideoCall={() => void startCall('video')}
                  onOpenDetails={() => setIsContextPanelOpen(true)}
                />

                {activeCall && callBannerState !== 'none' ? (
                  <div className="px-3 pt-3 sm:px-4">
                    <CallBanner
                      mode={activeCall.mode}
                      state={callBannerState}
                      participantName={activeThread.otherUser.name}
                      onAccept={callBannerState === 'incoming' ? () => void respondToCall('accept') : undefined}
                      onDecline={callBannerState === 'incoming' ? () => void respondToCall('decline') : undefined}
                      onSilent={callBannerState === 'incoming' ? () => void respondToCall('silent') : undefined}
                      onCancel={callBannerState === 'outgoing' ? () => void hangupCall('cancelled') : undefined}
                      onHangup={callBannerState === 'active' ? () => void hangupCall('ended') : undefined}
                    />
                  </div>
                ) : null}

                <MessageList
                  activeThread={activeThread}
                  messages={messages}
                  currentUserId={user.id}
                  recipientId={recipientId}
                  readReceipts={readReceipts}
                  decryptedByMessageId={decryptedByMessageId}
                  decryptErrorByMessageId={decryptErrorByMessageId}
                  onAcceptOffer={handleAcceptOffer}
                  onReplyToMessage={handleReplyToMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onToggleReaction={handleToggleReaction}
                  hasOlderMessages={hasOlderMessages}
                  isLoadingOlderMessages={isLoadingOlderMessages}
                  onLoadOlderMessages={() => void handleLoadOlderMessages()}
                  scrollContainerRef={messagesListRef}
                  messagesEndRef={messagesEndRef}
                />

                <ComposerDock
                  newMessage={newMessage}
                  onMessageChange={setNewMessage}
                  onSubmit={(event) => void handleSendMessage(event)}
                  imageToSend={imageToSend}
                  onRemoveImage={() => setImageToSend(null)}
                  sendError={sendError}
                  typingLabel={typingLabel}
                  replyPreview={replyPreview}
                  editPreview={editPreview}
                  isRecordingVoice={isRecordingVoice}
                  recordingLabel={recordingLabel}
                  isSendingVoice={isSendingVoice}
                  isActionsOpen={isComposerActionsOpen}
                  onToggleActions={() => setIsComposerActionsOpen((current) => !current)}
                  onCloseActions={() => setIsComposerActionsOpen(false)}
                  onOpenOffer={() => {
                    if (editingMessageId) {
                      setEditingMessageId(null);
                      setNewMessage('');
                    }
                    setIsOfferModalOpen(true);
                  }}
                  onTriggerImageUpload={() => {
                    if (editingMessageId) {
                      setEditingMessageId(null);
                      setNewMessage('');
                    }
                    fileInputRef.current?.click();
                  }}
                  onToggleVoiceRecording={() => {
                    if (isRecordingVoice) stopVoiceRecording();
                    else {
                      if (editingMessageId) {
                        setEditingMessageId(null);
                        setNewMessage('');
                      }
                      void startVoiceRecording();
                    }
                  }}
                  onCancelVoiceRecording={cancelVoiceRecording}
                  onCancelReply={handleCancelComposerReply}
                  onCancelEdit={handleCancelComposerEdit}
                  onOpenDetails={() => setIsContextPanelOpen(true)}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-text-secondary">
                {threads.length === 0 ? (
                  <div className="space-y-4">
                    <p>No conversation selected yet.</p>
                    <button type="button" onClick={() => setIsNewChatOpen(true)} className="messages-primary-button">
                      Start new chat
                    </button>
                  </div>
                ) : (
                  <p>Loading conversation...</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {activeViewModel && isContextPanelOpen ? (
        <div className="fixed inset-0 z-[210]">
          <button type="button" className="messages-context-scrim absolute inset-0" onClick={() => setIsContextPanelOpen(false)} />
          <aside className="messages-context-panel absolute inset-y-0 right-0 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
              <div>
                <p className="text-base font-black text-text-primary">Conversation details</p>
                <p className="text-xs text-text-secondary">Settings, context, and quick actions</p>
              </div>
              <button type="button" onClick={() => setIsContextPanelOpen(false)} className="messages-icon-button h-10 w-10 rounded-2xl">
                <CloseIcon />
              </button>
            </div>
            <MessagesContextPanel
              activeViewModel={activeViewModel}
              presenceLabel={presenceLabel}
              chatSettings={chatSettings}
              threadPassphraseInput={threadPassphraseInput}
              onPassphraseChange={setThreadPassphraseInput}
              onSavePassphrase={saveThreadPassphrase}
              onToggleSetting={handleChatSettingsPatch}
              onMoveThread={(bucket) => void handleMoveThread(activeViewModel.thread.id, bucket)}
              onAttachImage={() => {
                if (editingMessageId) {
                  setEditingMessageId(null);
                  setNewMessage('');
                }
                fileInputRef.current?.click();
              }}
              onOpenOffer={() => {
                if (editingMessageId) {
                  setEditingMessageId(null);
                  setNewMessage('');
                }
                setIsOfferModalOpen(true);
              }}
              onToggleVoiceRecording={() => {
                if (isRecordingVoice) stopVoiceRecording();
                else {
                  if (editingMessageId) {
                    setEditingMessageId(null);
                    setNewMessage('');
                  }
                  void startVoiceRecording();
                }
              }}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default MessagesPage;
