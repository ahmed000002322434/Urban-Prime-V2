
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { itemService, userService } from '../../services/itemService';
import { isBackendConfigured } from '../../services/backendClient';
import { decryptChatText, encryptChatText, getChatEncryptionStorageKey } from '../../services/chatCrypto';
import profileOnboardingService from '../../services/profileOnboardingService';
import { useNotification } from '../../context/NotificationContext';
import type { ChatThread, User, Item, ChatMessage, CustomOffer, ChatCallSession, ChatSettings, ChatPresenceState } from '../../types';
import Spinner from '../../components/Spinner';
import LottieAnimation from '../../components/LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- ICONS ---
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const AttachmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>;
const OfferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72c.12.88.33 1.74.62 2.56a2 2 0 0 1-.45 2.11L9.1 10.54a16 16 0 0 0 4.36 4.36l1.15-1.15a2 2 0 0 1 2.1-.45 11.4 11.4 0 0 0 2.57.62A2 2 0 0 1 22 16.92z"></path></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="15" height="12" rx="2" ry="2"></rect><polygon points="17 10 22 7 22 17 17 14 17 10"></polygon></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.3.5.63.6 1 .07.26.1.53.1.8s-.03.54-.1.8c-.1.37-.36.7-.6 1Z"/></svg>;

interface ThreadWithDetails extends ChatThread {
    otherUser: User;
    item: Item;
}

type DeliveryStatus = 'sent' | 'delivered' | 'seen';
type CallBannerState = 'none' | 'incoming' | 'outgoing' | 'active';

const CHAT_SETTINGS_STORAGE_PREFIX = 'urbanprime_chat_settings_v1:';
const CHAT_THREADS_CACHE_PREFIX = 'urbanprime_chat_threads_v2:';
const CHAT_MESSAGES_CACHE_PREFIX = 'urbanprime_chat_messages_v2:';
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
        // ignore storage errors
    }
};

const formatMessageTimestamp = (value: string | Date) => {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return '--';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMessageDay = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()).getTime();
    const timeText = dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (startOfMessageDay === startOfToday) return timeText;
    if (startOfMessageDay === startOfToday - 86400000) return `Yesterday ${timeText}`;
    return `${dateValue.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeText}`;
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

const DeliveryTicks: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
    const tickClass = status === 'seen' ? 'text-sky-500' : 'text-gray-400';
    if (status === 'sent') {
        return (
            <svg className="h-3 w-3 text-gray-400" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3.25 8.25L6.1 11.1L12.75 4.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <span className={`inline-flex items-center ${tickClass}`} aria-hidden="true">
            <svg className="h-3 w-3 -mr-1" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.25 8.25L6.1 11.1L12.75 4.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.25 8.25L6.1 11.1L12.75 4.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </span>
    );
};

const OfferCard: React.FC<{ offer: CustomOffer; isSender: boolean; onAccept: () => void }> = ({ offer, isSender, onAccept }) => (
    <div className={`p-4 rounded-xl border-l-4 shadow-sm w-full max-w-sm ${isSender ? 'bg-blue-50 border-blue-500' : 'bg-white border-green-500'}`}>
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-900">{offer.title}</h4>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : offer.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{offer.status}</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{offer.description}</p>
        <div className="flex justify-between items-center border-t pt-3 border-gray-200">
            <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-lg font-bold text-gray-900">${offer.price}</p>
            </div>
            {!isSender && offer.status === 'pending' && (
                <button onClick={onAccept} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-md">
                    Accept Offer
                </button>
            )}
        </div>
    </div>
);

const CreateOfferModal: React.FC<{ onClose: () => void; onSend: (offer: Omit<CustomOffer, 'id' | 'status'>) => void }> = ({ onClose, onSend }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend({
            title,
            description,
            price: Number(price),
            duration: Number(duration)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><OfferIcon /> Create Custom Offer</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Offer Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Full House Deep Clean" className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Describe what's included..." rows={3} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Total Price ($)</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Duration (Days)</label>
                            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                    <button type="submit" className="clay-button clay-button-primary clay-size-lg is-interactive w-full mt-4">Send Offer</button>
                </form>
            </div>
        </div>
    );
};

const MessagesPage: React.FC = () => {
    const { user } = useAuth();
    const { notificationSettings, updateNotificationSettings } = useNotification();
    const { threadId } = useParams<{ threadId?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
    const [activeThread, setActiveThread] = useState<ThreadWithDetails | null>(null);
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
    const [isMessageSettingsOpen, setIsMessageSettingsOpen] = useState(false);
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
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingHeartbeatRef = useRef<number | null>(null);
    const typingStateRef = useRef(false);
    const markReadKeyRef = useRef('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const voiceChunksRef = useRef<BlobPart[]>([]);
    const recordingTimerRef = useRef<number | null>(null);
    const fetchMessagesInFlightRef = useRef(false);
    const threadMetaInFlightRef = useRef(false);
    const callInFlightRef = useRef(false);
    const messagePollBackoffRef = useRef(2800);
    const metaPollBackoffRef = useRef(3500);
    const threadCacheKey = useMemo(() => (user?.id ? `${CHAT_THREADS_CACHE_PREFIX}${user.id}` : ''), [user?.id]);
    const messageCacheKey = useMemo(() => (threadId ? `${CHAT_MESSAGES_CACHE_PREFIX}${threadId}` : ''), [threadId]);
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

    const recipientId = useMemo(() => {
        if (!activeThread || !user) return '';
        return activeThread.buyerId === user.id ? activeThread.sellerId : activeThread.buyerId;
    }, [activeThread, user]);

    const recipientPresence = useMemo(() => {
        if (!recipientId) return null;
        return presenceByUserId[recipientId] || null;
    }, [presenceByUserId, recipientId]);

    const filteredThreads = useMemo(() => {
        const query = threadSearch.trim().toLowerCase();
        if (!query) return threads;
        return threads.filter((thread) => {
            const byName = String(thread.otherUser?.name || '').toLowerCase().includes(query);
            const byTitle = String(thread.item?.title || '').toLowerCase().includes(query);
            const byLastMessage = String(thread.lastMessage || '').toLowerCase().includes(query);
            return byName || byTitle || byLastMessage;
        });
    }, [threadSearch, threads]);
    
    useEffect(() => {
        const initNewChat = async () => {
            if (!user) return;

            if (pendingConversationSellerId) {
                try {
                    const thread_id = await itemService.findOrCreateChatThread(pendingConversationItemId, user.id, pendingConversationSellerId);
                    navigate(`/profile/messages/${thread_id}`, { replace: true });
                } catch (error) {
                    console.error('Failed to initialize conversation:', error);
                }
            }
        };
        void initNewChat();
    }, [pendingConversationItemId, pendingConversationSellerId, user, navigate]);

    useEffect(() => {
        if (!user || !threadId) return;
        const pushAction = pendingPushAction;
        if (!pushAction) return;

        const handlePushAction = async () => {
            try {
                if (pushAction === 'mark_read') {
                    await itemService.markThreadRead(threadId, user.id, new Date().toISOString());
                } else if (pushAction === 'react') {
                    await itemService.sendMessageToThread(threadId, user.id, '+1');
                }
            } catch (error) {
                console.warn('Unable to process push action:', error);
            } finally {
                navigate(`/profile/messages/${threadId}`, { replace: true });
            }
        };

        void handlePushAction();
    }, [pendingPushAction, threadId, user, navigate]);


    useEffect(() => {
        const fetchThreads = async () => {
            if (!user) return;
            const cachedThreads = readCachedJson<ThreadWithDetails[]>(threadCacheKey) || [];
            if (cachedThreads.length > 0) {
                setThreads(cachedThreads);
                if (threadId) {
                    setActiveThread(cachedThreads.find((entry) => entry.id === threadId) || null);
                } else {
                    setActiveThread((prev) => prev || cachedThreads[0] || null);
                }
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
                            name: 'User',
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
                
                threadsWithDetails.sort((a, b) => {
                    const toSortMs = (thread: ThreadWithDetails) => {
                        const stamp = thread.lastUpdated || thread.messages[thread.messages.length - 1]?.timestamp || '';
                        const parsed = new Date(stamp).getTime();
                        return Number.isFinite(parsed) ? parsed : 0;
                    };
                    return toSortMs(b) - toSortMs(a);
                });

                const resolvedThreads = threadsWithDetails.length > 0 ? threadsWithDetails : cachedThreads;
                setThreads(resolvedThreads);
                if (resolvedThreads.length > 0) {
                    writeCachedJson(threadCacheKey, resolvedThreads);
                }
                
                if (threadId) {
                    setActiveThread(resolvedThreads.find(t => t.id === threadId) || null);
                } else if (resolvedThreads.length > 0) {
                    navigate(`/profile/messages/${resolvedThreads[0].id}`, { replace: true });
                    setActiveThread(resolvedThreads[0]);
                }
            } catch (error) {
                console.error("Failed to fetch threads:", error);
                if (cachedThreads.length > 0) {
                    setThreads(cachedThreads);
                    if (threadId) {
                        setActiveThread(cachedThreads.find((entry) => entry.id === threadId) || null);
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (!pendingConversationItemId || !pendingConversationSellerId) {
          void fetchThreads();
        }
    }, [user, threadId, pendingConversationItemId, pendingConversationSellerId, navigate, threadCacheKey]);

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

    // REAL-TIME MESSAGE LISTENER
    useEffect(() => {
        if (!threadId) return;

        if (isBackendConfigured()) {
            let cancelled = false;
            const loadMessages = async () => {
                if (fetchMessagesInFlightRef.current) return;
                fetchMessagesInFlightRef.current = true;
                try {
                    const threadMessages = await itemService.getChatMessagesForThread(threadId);
                    if (cancelled) return;
                    const cachedMessages = readCachedJson<ChatMessage[]>(messageCacheKey) || [];
                    if (threadMessages.length === 0 && cachedMessages.length > 0) {
                        setMessages(cachedMessages);
                    } else {
                        setMessages(threadMessages);
                    }
                    if (threadMessages.length > 0) {
                        writeCachedJson(messageCacheKey, threadMessages);
                    }
                    messagePollBackoffRef.current = 2800;
                } catch (error) {
                    console.error('Failed to load thread messages:', error);
                    const cachedMessages = readCachedJson<ChatMessage[]>(messageCacheKey);
                    if (cachedMessages && cachedMessages.length > 0 && !cancelled) {
                        setMessages(cachedMessages);
                    }
                    messagePollBackoffRef.current = Math.min(messagePollBackoffRef.current * 2, 12000);
                } finally {
                    fetchMessagesInFlightRef.current = false;
                }
            };
            let timeoutId: number | null = null;
            const scheduleNext = () => {
                if (cancelled) return;
                timeoutId = window.setTimeout(async () => {
                    await loadMessages();
                    scheduleNext();
                }, messagePollBackoffRef.current);
            };
            void loadMessages().then(scheduleNext);
            return () => {
                cancelled = true;
                if (timeoutId) window.clearTimeout(timeoutId);
            };
        }

        const q = query(collection(db, "chatThreads", threadId, "messages"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const msgs: ChatMessage[] = [];
                querySnapshot.forEach((doc) => {
                    msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
                });
                setMessages(msgs);
                if (msgs.length > 0) {
                    writeCachedJson(messageCacheKey, msgs);
                }
            },
            (error) => {
                console.warn('Realtime message listener failed:', error);
                const cachedMessages = readCachedJson<ChatMessage[]>(messageCacheKey);
                if (cachedMessages && cachedMessages.length > 0) {
                    setMessages(cachedMessages);
                }
            }
        );

        return () => unsubscribe();
    }, [threadId, messageCacheKey]);

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
                setActiveCall(callSession);
                if (recipientId) {
                    setPresenceByUserId((current) => ({
                        ...current,
                        ...(presenceMap || {})
                    }));
                }
                metaPollBackoffRef.current = 3500;
            } catch {
                metaPollBackoffRef.current = Math.min(metaPollBackoffRef.current * 2, 14000);
            } finally {
                threadMetaInFlightRef.current = false;
            }
        };

        let timeoutId: number | null = null;
        const scheduleNext = () => {
            if (cancelled) return;
            timeoutId = window.setTimeout(async () => {
                await refreshThreadMeta();
                scheduleNext();
            }, metaPollBackoffRef.current);
        };

        void refreshThreadMeta().then(scheduleNext);
        return () => {
            cancelled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, [threadId, user, recipientId]);

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
    }, [threadId, notificationSettings.soundEnabled]);

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
    }, [messages, threadPassphrase, chatSettings.e2eEnabled]);

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
    
    const handleSelectThread = (thread: ThreadWithDetails) => {
        navigate(`/profile/messages/${thread.id}`);
        setActiveThread(thread);
        setSendError(null);
        setIsMessageSettingsOpen(false);
    };

    const handleStartNewConversation = async (targetUser: User) => {
        if (!user || !targetUser?.id) return;
        if (targetUser.id === user.id) {
            setNewChatError('You cannot start a conversation with yourself.');
            return;
        }
        try {
            setNewChatError(null);
            const thread = await itemService.findOrCreateChatThread('', user.id, targetUser.id);
            setIsNewChatOpen(false);
            setNewChatQuery('');
            setNewChatResults([]);
            navigate(`/profile/messages/${thread}`);
        } catch (error) {
            setNewChatError(error instanceof Error ? error.message : 'Unable to start conversation.');
        }
    };

    const saveThreadPassphrase = () => {
        if (!threadId) return;
        const storageKey = getChatEncryptionStorageKey(threadId);
        const normalized = threadPassphraseInput.trim();
        if (!normalized) {
            window.localStorage.removeItem(storageKey);
            setThreadPassphrase('');
            const nextSettings = { ...chatSettings, e2eEnabled: false };
            setChatSettings(nextSettings);
            persistChatSettings(threadId, nextSettings);
        } else {
            window.localStorage.setItem(storageKey, normalized);
            setThreadPassphrase(normalized);
            const nextSettings = { ...chatSettings, e2eEnabled: true };
            setChatSettings(nextSettings);
            persistChatSettings(threadId, nextSettings);
        }
        setIsMessageSettingsOpen(false);
    };

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
            voiceChunksRef.current = [];
            setRecordingMs(0);

            recorder.ondataavailable = (event) => {
                if (event.data?.size) voiceChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                const mimeType = recorder.mimeType || preferredMimeType || 'audio/webm';
                const voiceBlob = new Blob(voiceChunksRef.current, { type: mimeType });
                const duration = recordingMs;
                voiceChunksRef.current = [];
                stopMediaResources();
                setIsRecordingVoice(false);
                if (!voiceBlob.size) return;

                try {
                    setIsSendingVoice(true);
                    await itemService.sendVoiceNoteToThread(activeThread.id, user.id, voiceBlob, duration);
                    const latest = await itemService.getChatMessagesForThread(activeThread.id);
                    setMessages(latest);
                } catch (error) {
                    setSendError(error instanceof Error ? error.message : 'Failed to send voice note.');
                } finally {
                    setIsSendingVoice(false);
                    setRecordingMs(0);
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start(200);
            setIsRecordingVoice(true);
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingMs((value) => value + 1000);
            }, 1000);
        } catch (error) {
            stopMediaResources();
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
            } else if (action === 'decline') {
                setCallBannerState('none');
            } else if (action === 'silent') {
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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageToSend) || !activeThread || !user) return;

        try {
            setSendError(null);
            let payloadText = newMessage.trim();
            if (payloadText && chatSettings.e2eEnabled && threadPassphrase.trim()) {
                payloadText = await encryptChatText(payloadText, threadPassphrase);
            }
            await itemService.sendMessageToThread(activeThread.id, user.id, payloadText, imageToSend || undefined);
            setNewMessage('');
            setImageToSend(null);
            typingStateRef.current = false;
            if (isBackendConfigured()) {
                await itemService.setThreadTypingState(activeThread.id, user.id, false);
            }
            const latest = await itemService.getChatMessagesForThread(activeThread.id);
            setMessages(latest);
        } catch (error) {
            console.error("Failed to send message:", error);
            setSendError(error instanceof Error ? error.message : 'Failed to send message.');
        }
    };
    
    const handleSendOffer = async (offerData: Omit<CustomOffer, 'id' | 'status'>) => {
        if (!activeThread || !user) return;
        try {
            setSendError(null);
            await itemService.sendOfferToThread(activeThread.id, user.id, offerData);
            const latest = await itemService.getChatMessagesForThread(activeThread.id);
            setMessages(latest);
        } catch (error) {
            console.error("Failed to send offer:", error);
            setSendError(error instanceof Error ? error.message : 'Failed to send offer.');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToSend(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAcceptOffer = (_offerId: string) => {
        // In a real app, this would update the offer status in DB and redirect to checkout
        navigate('/checkout');
    };
    
     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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

    if (isLoading) return <Spinner size="lg" className="mt-20" />;

    return (
        <>
            {isOfferModalOpen && <CreateOfferModal onClose={() => setIsOfferModalOpen(false)} onSend={handleSendOffer} />}
            {isNewChatOpen ? (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => setIsNewChatOpen(false)}>
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-lg font-bold text-text-primary">Start new conversation</h3>
                            <button
                                type="button"
                                onClick={() => setIsNewChatOpen(false)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
                            >
                                Close
                            </button>
                        </div>
                        <input
                            type="search"
                            value={newChatQuery}
                            onChange={(event) => setNewChatQuery(event.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-white/80">
                            {isSearchingUsers ? (
                                <div className="py-6 text-center text-sm text-text-secondary">Searching...</div>
                            ) : newChatQuery.trim().length < 2 ? (
                                <div className="py-6 text-center text-sm text-text-secondary">Type at least 2 characters to search.</div>
                            ) : newChatResults.length === 0 ? (
                                <div className="py-6 text-center text-sm text-text-secondary">No users found.</div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {newChatResults.map((entry) => (
                                        <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <img src={entry.avatar || '/icons/urbanprime.svg'} alt={entry.name} className="h-10 w-10 rounded-full object-cover" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-text-primary">{entry.name}</p>
                                                    <p className="truncate text-xs text-text-secondary">{entry.email || 'Urban Prime user'}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleStartNewConversation(entry)}
                                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                                            >
                                                Chat
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {newChatError ? (
                            <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{newChatError}</p>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <style>{`
                .chat-wallpaper {
                    background-color: #eef3ef;
                    background-image:
                        linear-gradient(rgba(255,255,255,.78), rgba(255,255,255,.78)),
                        url('/images/chat-doodle-bg.png'),
                        radial-gradient(circle at 24px 24px, rgba(24, 132, 80, 0.08) 2px, transparent 0),
                        radial-gradient(circle at 76px 76px, rgba(10, 80, 56, 0.06) 2px, transparent 0);
                    background-size: auto, 360px 360px, 100px 100px, 100px 100px;
                    background-position: center, center, 0 0, 0 0;
                }
                .bubble-enter {
                    animation: bubble-enter .24s cubic-bezier(0.21, 0.61, 0.35, 1);
                }
                @keyframes bubble-enter {
                    from { opacity: 0; transform: translateY(10px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .typing-dots span {
                    display: inline-block;
                    animation: typing-dot 1.1s infinite ease-in-out;
                }
                .typing-dots span:nth-child(2) { animation-delay: .16s; }
                .typing-dots span:nth-child(3) { animation-delay: .32s; }
                @keyframes typing-dot {
                    0%, 80%, 100% { opacity: .25; transform: translateY(0) scale(.9); }
                    40% { opacity: 1; transform: translateY(-4px) scale(1.05); }
                }
            `}</style>
            <div className="container mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 md:py-10 animate-fade-in-up">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Messages</h1>
                    <button
                        type="button"
                        onClick={() => setIsNewChatOpen(true)}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                    >
                        Start new chat
                    </button>
                </div>
                <div className="h-[72vh] md:h-[78vh] flex flex-col md:flex-row bg-surface rounded-2xl shadow-soft border border-border overflow-hidden">
                    {/* Conversation List */}
                    <aside className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border h-auto md:h-full flex flex-col">
                        <div className="p-4 border-b border-border space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={threadSearch}
                                    onChange={(event) => setThreadSearch(event.target.value)}
                                    placeholder="Search messages..."
                                    className="w-full text-sm p-3 bg-surface-soft text-text-primary rounded-lg border-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsNewChatOpen(true)}
                                    className="shrink-0 rounded-lg bg-primary px-3 py-3 text-xs font-semibold text-white hover:brightness-110"
                                >
                                    New chat
                                </button>
                            </div>
                        </div>
                        {filteredThreads.length > 0 ? (
                            <ul className="overflow-y-auto flex-1 max-h-[30vh] md:max-h-none">
                                {filteredThreads.map(thread => {
                                    const lastMessage = thread.messages[thread.messages.length - 1];
                                    return (
                                        <li key={thread.id} onClick={() => handleSelectThread(thread)} className={`p-4 cursor-pointer border-l-4 flex gap-3 transition-colors ${activeThread?.id === thread.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-surface-soft'}`}>
                                            <img src={thread.otherUser.avatar} alt={thread.otherUser.name} className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-bold truncate text-text-primary">{thread.otherUser.name}</p>
                                                    <span className="text-xs text-text-secondary">{lastMessage ? new Date(lastMessage.timestamp).toLocaleDateString() : ''}</span>
                                                </div>
                                                <p className="text-sm text-text-secondary truncate">
                                                    {lastMessage?.type === 'offer'
                                                        ? 'Sent an offer'
                                                        : lastMessage?.type === 'voice'
                                                            ? 'Voice note'
                                                            : (lastMessage?.text || 'No messages yet')}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-sm text-text-secondary">
                                <LottieAnimation
                                    src={uiLottieAnimations.noChatStarted}
                                    alt="No chats started"
                                    className="h-36 w-36 md:h-44 md:w-44 mx-auto"
                                    loop
                                    autoplay
                                />
                                <p className="mt-2">
                                    {threads.length === 0 ? 'No chats started yet.' : 'No conversations matched your search.'}
                                </p>
                            </div>
                        )}
                    </aside>
                    {/* Chat Window */}
                    <main className="relative w-full md:w-2/3 flex flex-col h-full bg-surface">
                        {activeThread ? (
                            <>
                                <header className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-surface-soft flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <img src={activeThread.otherUser.avatar} alt={activeThread.otherUser.name} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <p className="font-bold text-text-primary">{activeThread.otherUser.name}</p>
                                            <p className="text-xs text-text-secondary flex items-center gap-2">
                                                {activeThread.itemId
                                                    ? <>Inquiring about <span className="font-semibold text-primary">{activeThread.item.title}</span></>
                                                    : <>Direct conversation</>}
                                                <span className="text-[11px] font-medium text-emerald-700">{formatPresenceLabel(recipientPresence)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => void startCall('voice')}
                                            disabled={Boolean(activeCall && (callBannerState === 'outgoing' || callBannerState === 'active'))}
                                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            <PhoneIcon /> Voice
                                        </button>
                                        <button
                                            onClick={() => void startCall('video')}
                                            disabled={Boolean(activeCall && (callBannerState === 'outgoing' || callBannerState === 'active'))}
                                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            <VideoIcon /> Video
                                        </button>
                                        {activeThread.itemId ? (
                                            <Link to={`/item/${activeThread.item.id}`} className="text-xs font-bold border border-border px-3 py-1.5 rounded-lg hover:bg-white transition-colors">View Item</Link>
                                        ) : null}
                                    </div>
                                </header>
                                {activeCall && callBannerState !== 'none' ? (
                                    <div className="border-b border-border bg-sky-50 px-4 py-3">
                                        {callBannerState === 'incoming' ? (
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-sky-900">Incoming {activeCall.mode} call</p>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => void respondToCall('decline')} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600">Decline</button>
                                                    <button onClick={() => void respondToCall('silent')} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">Silent</button>
                                                    <button onClick={() => void respondToCall('accept')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Answer</button>
                                                </div>
                                            </div>
                                        ) : null}
                                        {callBannerState === 'outgoing' ? (
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-sky-900">Ringing... waiting for answer</p>
                                                <button onClick={() => void hangupCall('cancelled')} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600">Cancel</button>
                                            </div>
                                        ) : null}
                                        {callBannerState === 'active' ? (
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-emerald-900">{activeCall.mode === 'video' ? 'Video' : 'Voice'} call in progress</p>
                                                <button onClick={() => void hangupCall('ended')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Hang up</button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                <div className="flex-1 p-4 sm:p-6 overflow-y-auto chat-wallpaper">
                                    <div className="space-y-6">
                                         {messages.map(msg => {
                                             const isSender = msg.senderId === user?.id;
                                             const isEncrypted = Boolean(msg.content?.encrypted) || (typeof msg.text === 'string' && msg.text.startsWith('__enc_v1__:'));
                                             const decryptedText = decryptedByMessageId[msg.id];
                                             const decryptedError = Boolean(decryptErrorByMessageId[msg.id]);
                                             const displayText = decryptedText || (isEncrypted ? '' : (msg.text || ''));
                                             const deliveryStatus: DeliveryStatus | null = (() => {
                                                 if (!isSender) return null;
                                                 if (!recipientId) return 'sent';
                                                 const readAt = readReceipts[recipientId];
                                                 const msgAt = new Date(msg.timestamp).getTime();
                                                 if (readAt && new Date(readAt).getTime() >= msgAt) return 'seen';
                                                 return Date.now() - msgAt > 3500 ? 'delivered' : 'sent';
                                             })();

                                             return (
                                                 <div key={msg.id} className={`bubble-enter flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                                                     {!isSender && <img src={activeThread.otherUser.avatar} className="w-8 h-8 rounded-full mb-1" />}
                                                     <div className={`max-w-[85%] ${msg.type === 'offer' ? 'w-full max-w-sm' : ''}`}>
                                                         {msg.type === 'offer' && msg.offer ? (
                                                             <OfferCard offer={msg.offer} isSender={isSender} onAccept={() => handleAcceptOffer(msg.offer!.id)} />
                                                         ) : msg.type === 'voice' && msg.audioUrl ? (
                                                             <div className={`px-4 py-3 rounded-2xl shadow-sm ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                                                                 <p className="mb-2 text-[11px] font-semibold opacity-85">Voice note {msg.audioDurationMs ? `(${formatDuration(msg.audioDurationMs)})` : ''}</p>
                                                                 <audio controls src={msg.audioUrl} className="max-w-[280px]" />
                                                             </div>
                                                         ) : (msg.type === 'contract' || msg.type === 'milestone') ? (
                                                             <div className="px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-900 text-sm shadow-sm">
                                                                 <p className="font-bold mb-1">
                                                                     {msg.type === 'contract' ? 'Contract Update' : 'Milestone Update'}
                                                                 </p>
                                                                 <p className="leading-relaxed whitespace-pre-wrap">
                                                                     {typeof msg.content === 'string'
                                                                         ? msg.content
                                                                         : msg.content?.summary || msg.text || 'New workflow update shared in this conversation.'}
                                                                 </p>
                                                             </div>
                                                         ) : (
                                                             <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                                                                 {msg.imageUrl && <img src={msg.imageUrl} alt="attached" className="rounded-lg mb-2 max-w-xs w-full" />}
                                                                 {displayText && <p className="leading-relaxed whitespace-pre-wrap">{displayText}</p>}
                                                                 {isEncrypted && !decryptedText ? (
                                                                     <p className="mt-1 text-[11px] font-semibold text-amber-200">
                                                                         {decryptedError ? 'Decryption failed (wrong passphrase).' : 'Encrypted message'}
                                                                     </p>
                                                                 ) : null}
                                                             </div>
                                                         )}
                                                         <div className={`mt-1 flex items-center gap-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
                                                             <p className="text-[10px] text-gray-400">
                                                                 {formatMessageTimestamp(msg.timestamp)}
                                                             </p>
                                                             {deliveryStatus ? <DeliveryTicks status={deliveryStatus} /> : null}
                                                         </div>
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                         <div ref={messagesEndRef} />
                                    </div>
                                </div>
                                {typingUsers.length > 0 ? (
                                    <div className="border-t border-border bg-white/85 px-4 py-2 text-xs text-text-secondary">
                                        <span className="font-semibold text-text-primary">{activeThread.otherUser.name}</span> is typing
                                        <span className="typing-dots ml-1"><span>.</span><span>.</span><span>.</span></span>
                                    </div>
                                ) : null}
                                <footer className="p-4 bg-surface border-t border-border">
                                    {imageToSend && <div className="mb-2 p-2 bg-surface-soft rounded-lg flex items-center justify-between border border-border w-max"><img src={imageToSend} alt="preview" className="w-16 h-16 rounded-md object-cover" /><button onClick={() => setImageToSend(null)} className="ml-4 text-red-500 text-xs font-bold hover:underline">Remove</button></div>}
                                    {isRecordingVoice ? (
                                        <div className="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs">
                                            <span className="font-semibold text-red-700">Recording: {formatDuration(recordingMs)}</span>
                                            <button onClick={stopVoiceRecording} className="rounded-md bg-red-600 px-2 py-1 font-bold text-white">Stop & send</button>
                                        </div>
                                    ) : null}
                                    {sendError ? <p className="mb-2 text-xs text-red-500">{sendError}</p> : null}
                                    {isMessageSettingsOpen ? (
                                        <div className="mb-3 rounded-xl border border-border bg-white/95 px-3 py-3 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Message settings</p>
                                                <button onClick={() => setIsMessageSettingsOpen(false)} className="text-xs font-semibold text-text-secondary">Close</button>
                                            </div>
                                            <div className="mt-3 space-y-2 text-xs">
                                                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                                                    <span className="flex items-center gap-1 font-semibold text-text-primary"><LockIcon /> End-to-end encryption</span>
                                                    <input type="checkbox" checked={chatSettings.e2eEnabled} onChange={(event) => {
                                                        const nextEnabled = event.target.checked;
                                                        void updateChatSettings({ e2eEnabled: nextEnabled });
                                                        if (!nextEnabled && threadId) {
                                                            window.localStorage.removeItem(getChatEncryptionStorageKey(threadId));
                                                            setThreadPassphrase('');
                                                            setThreadPassphraseInput('');
                                                            persistChatSettings(threadId, { ...chatSettings, e2eEnabled: false });
                                                        }
                                                    }} />
                                                </label>
                                                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                                                    <span className="font-semibold text-text-primary">Presence visibility</span>
                                                    <input type="checkbox" checked={chatSettings.presenceVisible} onChange={(event) => {
                                                        void updateChatSettings({ presenceVisible: event.target.checked });
                                                    }} />
                                                </label>
                                                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                                                    <span className="font-semibold text-text-primary">Notification sound</span>
                                                    <input type="checkbox" checked={chatSettings.soundEnabled} onChange={(event) => {
                                                        void updateChatSettings({ soundEnabled: event.target.checked });
                                                    }} />
                                                </label>
                                                <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                                                    <p className="mb-2 font-semibold text-emerald-800">Thread passphrase</p>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="password"
                                                            value={threadPassphraseInput}
                                                            onChange={(event) => setThreadPassphraseInput(event.target.value)}
                                                            placeholder="Set passphrase for this thread"
                                                            className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                                                        />
                                                        <button onClick={saveThreadPassphrase} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Save</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <button type="button" onClick={() => setIsOfferModalOpen(true)} className="p-2.5 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Create Offer">
                                            <OfferIcon />
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-soft rounded-full transition-colors" title="Attach Image">
                                            <AttachmentIcon />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isSendingVoice}
                                            onClick={() => {
                                                if (isRecordingVoice) stopVoiceRecording();
                                                else void startVoiceRecording();
                                            }}
                                            className={`p-2.5 rounded-full transition-colors ${isRecordingVoice ? 'bg-red-100 text-red-600' : 'text-text-secondary hover:text-text-primary hover:bg-surface-soft'} disabled:opacity-50`}
                                            title={isRecordingVoice ? 'Stop recording' : 'Record voice note'}
                                        >
                                            <MicIcon />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsMessageSettingsOpen((current) => !current)}
                                            className={`p-2.5 rounded-full transition-colors ${isMessageSettingsOpen ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-soft'}`}
                                            title="Message settings"
                                        >
                                            <SettingsIcon />
                                        </button>
                                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={chatSettings.e2eEnabled && threadPassphrase ? 'Type encrypted message...' : 'Type a message...'} className="flex-1 px-4 py-2.5 bg-surface-soft text-text-primary border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                                        <button type="submit" disabled={(!newMessage.trim() && !imageToSend) || isSendingVoice} className="p-3 bg-primary text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-md">
                                            <SendIcon />
                                        </button>
                                    </form>
                                </footer>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8 text-center">
                                <LottieAnimation
                                    src={uiLottieAnimations.noChatStarted}
                                    alt="No active chat"
                                    className="h-52 w-52 md:h-64 md:w-64"
                                    loop
                                    autoplay
                                />
                                <h3 className="text-xl font-bold text-text-primary">Your Messages</h3>
                                <p className="mt-2 max-w-sm">Select a conversation from the list to start chatting or view your history.</p>
                                <button
                                    type="button"
                                    onClick={() => setIsNewChatOpen(true)}
                                    className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                                >
                                    Start new chat
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default MessagesPage;
