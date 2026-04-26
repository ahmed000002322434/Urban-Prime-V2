import React, { createContext, useState, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import ToastNotification, { type ToastAction } from '../components/ToastNotification';
import LottieAnimation from '../components/LottieAnimation';
import { auth } from '../firebase';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';
import type { ChatMessage, User } from '../types';

const SETTINGS_STORAGE_KEY = 'urbanprime:notification-settings:v1';
const PUSH_TOKEN_STORAGE_KEY = 'urbanprime:push-token:v1';
const PUSH_TOKEN_OWNER_STORAGE_KEY = 'urbanprime:push-token-owner:v1';
const CHAT_POLL_INTERVAL_MS = 10000;
type ItemServiceModule = typeof import('../services/itemService');
type PushNotificationModule = typeof import('../services/pushNotificationService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;
let pushNotificationModulePromise: Promise<PushNotificationModule> | null = null;

const loadItemServiceModule = () => {
  if (!itemServiceModulePromise) {
    itemServiceModulePromise = import('../services/itemService');
  }
  return itemServiceModulePromise;
};

const loadPushNotificationModule = () => {
  if (!pushNotificationModulePromise) {
    pushNotificationModulePromise = import('../services/pushNotificationService');
  }
  return pushNotificationModulePromise;
};

const withItemService = async <T,>(
  callback: (service: ItemServiceModule['itemService']) => Promise<T> | T
): Promise<T> => callback((await loadItemServiceModule()).itemService);

const withUserService = async <T,>(
  callback: (service: ItemServiceModule['userService']) => Promise<T> | T
): Promise<T> => callback((await loadItemServiceModule()).userService);

export interface NotificationSettings {
  chatBannersEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  quickActionsEnabled: boolean;
  soundEnabled: boolean;
}

interface NotificationPayload {
  id: string;
  title?: string;
  message: string;
  avatarUrl?: string;
  tone?: 'success' | 'info' | 'message' | 'error';
  durationMs?: number;
  actions?: ToastAction[];
}

interface FloatingMessageAnimation {
  id: string;
  src: string;
  alt: string;
  variant: 'incoming' | 'reply';
}

interface NotificationContextType {
  showNotification: (message: string) => void;
  showMessageBanner: (payload: Omit<NotificationPayload, 'id'>) => void;
  dismissNotification: () => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  unreadNotificationCount: number;
  refreshUnreadNotificationCount: () => Promise<void>;
  desktopPermission: NotificationPermission | 'unsupported';
  requestDesktopPermission: () => Promise<NotificationPermission | 'unsupported'>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_SETTINGS: NotificationSettings = {
  chatBannersEnabled: true,
  desktopNotificationsEnabled: true,
  quickActionsEnabled: true,
  soundEnabled: true
};

const readSettings = (): NotificationSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      chatBannersEnabled: parsed?.chatBannersEnabled !== false,
      desktopNotificationsEnabled: parsed?.desktopNotificationsEnabled !== false,
      quickActionsEnabled: parsed?.quickActionsEnabled !== false,
      soundEnabled: parsed?.soundEnabled !== false
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const writeSettings = (settings: NotificationSettings) => {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage failure
  }
};

const readStoredPushToken = () => {
  try {
    return window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const writeStoredPushToken = (token: string) => {
  try {
    if (!token) {
      window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage failure
  }
};

const readStoredPushTokenOwner = () => {
  try {
    return window.localStorage.getItem(PUSH_TOKEN_OWNER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const writeStoredPushTokenOwner = (ownerId: string) => {
  try {
    if (!ownerId) {
      window.localStorage.removeItem(PUSH_TOKEN_OWNER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(PUSH_TOKEN_OWNER_STORAGE_KEY, ownerId);
  } catch {
    // ignore storage failure
  }
};

const messagePreview = (message?: ChatMessage) => {
  if (!message) return 'New message';
  if (message.type === 'offer') return 'Sent you an offer';
  if (message.type === 'voice') return 'Sent a voice note';
  if (message.imageUrl && !message.text) return 'Sent an image';
  if (typeof message.text === 'string' && message.text.startsWith('__enc_v1__:')) return 'Encrypted message';
  const text = String(message.text || '').trim();
  return text || 'New message';
};

const playNotificationTone = () => {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 820;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
    oscillator.stop(context.currentTime + 0.25);
    window.setTimeout(() => {
      void context.close();
    }, 300);
  } catch {
    // ignore audio failures
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const [floatingAnimation, setFloatingAnimation] = useState<FloatingMessageAnimation | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => readSettings());
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [authUserId, setAuthUserId] = useState<string | null>(auth.currentUser?.uid || null);
  const hideTimerRef = useRef<number | null>(null);
  const seenThreadMessageRef = useRef<Map<string, string>>(new Map());
  const senderCacheRef = useRef<Map<string, User>>(new Map());
  const foregroundPushUnsubscribeRef = useRef<(() => void) | null>(null);
  const registeredPushTokenRef = useRef<string>(readStoredPushToken());
  const registeredPushTokenOwnerRef = useRef<string>(readStoredPushTokenOwner());
  const locationPathRef = useRef<string>(location.pathname);
  const floatingAnimationHideTimerRef = useRef<number | null>(null);
  const lastIncomingAnimationAtRef = useRef(0);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  const dismissNotification = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setNotification(null);
  }, []);

  const dismissFloatingAnimation = useCallback(() => {
    if (floatingAnimationHideTimerRef.current) {
      window.clearTimeout(floatingAnimationHideTimerRef.current);
      floatingAnimationHideTimerRef.current = null;
    }
    setFloatingAnimation(null);
  }, []);

  const triggerFloatingAnimation = useCallback((variant: FloatingMessageAnimation['variant']) => {
    if (variant === 'incoming') {
      const now = Date.now();
      if (now - lastIncomingAnimationAtRef.current < 2200) return;
      lastIncomingAnimationAtRef.current = now;
    }

    dismissFloatingAnimation();
    const next: FloatingMessageAnimation = {
      id: `floating-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      variant,
      src: variant === 'incoming' ? uiLottieAnimations.incomingMessageOverlay : uiLottieAnimations.sendMessageEnter,
      alt: variant === 'incoming' ? 'New incoming message' : 'Reply sent'
    };
    setFloatingAnimation(next);
    floatingAnimationHideTimerRef.current = window.setTimeout(() => {
      setFloatingAnimation((current) => (current?.id === next.id ? null : current));
      floatingAnimationHideTimerRef.current = null;
    }, variant === 'incoming' ? 2200 : 1500);
  }, [dismissFloatingAnimation]);

  const showMessageBanner = useCallback((payload: Omit<NotificationPayload, 'id'>) => {
    dismissNotification();
    const nextNotification: NotificationPayload = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tone: 'message',
      durationMs: 8000,
      ...payload
    };
    setNotification(nextNotification);
    hideTimerRef.current = window.setTimeout(() => {
      setNotification((current) => (current?.id === nextNotification.id ? null : current));
      hideTimerRef.current = null;
    }, nextNotification.durationMs || 8000);
  }, [dismissNotification]);

  const showNotification = useCallback((message: string) => {
    showMessageBanner({
      message,
      tone: 'success',
      durationMs: 3000
    });
  }, [showMessageBanner]);

  const updateNotificationSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setNotificationSettings((current) => {
      const next = {
        ...current,
        ...patch
      };
      writeSettings(next);
      return next;
    });
  }, []);

  const requestDesktopPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    const permission = await (await loadPushNotificationModule()).requestPushPermission();
    setDesktopPermission(permission);
    return permission;
  }, []);

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!authUserId) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const notifications = await withItemService((itemService) =>
        itemService.getNotificationsForUser(authUserId, { includePersona: false, limit: 100 })
      );
      setUnreadNotificationCount(notifications.filter((entry) => !entry.isRead).length);
    } catch {
      setUnreadNotificationCount(0);
    }
  }, [authUserId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthUserId(firebaseUser?.uid || null);
      if (!firebaseUser) {
        seenThreadMessageRef.current.clear();
        senderCacheRef.current.clear();
        dismissFloatingAnimation();
        registeredPushTokenOwnerRef.current = '';
        writeStoredPushTokenOwner('');
        if (foregroundPushUnsubscribeRef.current) {
          foregroundPushUnsubscribeRef.current();
          foregroundPushUnsubscribeRef.current = null;
        }
      }
    });
    return () => unsubscribe();
  }, [dismissFloatingAnimation]);

  useEffect(() => {
    let cancelled = false;

    const cleanupForegroundPush = () => {
      if (foregroundPushUnsubscribeRef.current) {
        foregroundPushUnsubscribeRef.current();
        foregroundPushUnsubscribeRef.current = null;
      }
    };

    const syncPushState = async () => {
      if (!authUserId || !notificationSettings.desktopNotificationsEnabled) {
        cleanupForegroundPush();
        const existingToken = registeredPushTokenRef.current || readStoredPushToken();
        if (existingToken) {
          await withItemService((itemService) => itemService.unregisterPushToken(existingToken));
          registeredPushTokenRef.current = '';
          registeredPushTokenOwnerRef.current = '';
          writeStoredPushToken('');
          writeStoredPushTokenOwner('');
        }
        return;
      }

      const pushNotifications = await loadPushNotificationModule();
      const promptedPermission = await pushNotifications.maybePromptPushPermissionOnce();
      if (!cancelled) {
        setDesktopPermission(promptedPermission);
      }

      const initResult = await pushNotifications.initializePushMessaging({ promptIfDefault: false });
      if (cancelled) return;
      setDesktopPermission(initResult.permission);

      if (initResult.permission !== 'granted' || !initResult.token) {
        return;
      }

      const previousToken = registeredPushTokenRef.current || readStoredPushToken();
      const previousOwner = registeredPushTokenOwnerRef.current || readStoredPushTokenOwner();
      if (previousToken && previousToken !== initResult.token && previousOwner === authUserId) {
        await withItemService((itemService) => itemService.unregisterPushToken(previousToken));
      }

      if (previousToken !== initResult.token || previousOwner !== authUserId) {
        const registrationOk = await withItemService((itemService) => itemService.registerPushToken(initResult.token, {
          permission: initResult.permission
        }));
        if (registrationOk) {
          registeredPushTokenRef.current = initResult.token;
          registeredPushTokenOwnerRef.current = authUserId;
          writeStoredPushToken(initResult.token);
          writeStoredPushTokenOwner(authUserId);
        }
      } else {
        registeredPushTokenRef.current = initResult.token;
        registeredPushTokenOwnerRef.current = authUserId;
      }

      cleanupForegroundPush();
      foregroundPushUnsubscribeRef.current = await pushNotifications.subscribeToForegroundPush((payload) => {
        if (cancelled) return;
        const shouldShowInAppBanner =
          notificationSettings.chatBannersEnabled && !locationPathRef.current.startsWith('/profile/messages');
        if (!shouldShowInAppBanner) return;

        const actions: ToastAction[] = notificationSettings.quickActionsEnabled ? [
          {
            id: `push-reply-${payload.threadId}`,
            label: 'Reply',
            variant: 'primary',
            onClick: () => {
              const quickReply = window.prompt(`Reply to ${payload.title}`);
              dismissNotification();
              const trimmed = String(quickReply || '').trim();
              if (!trimmed) {
                navigate(payload.link || '/profile/messages');
                return;
              }
              if (payload.threadId) {
                void withItemService((itemService) => itemService.sendMessageToThread(payload.threadId, authUserId, trimmed)).then(() => {
                  triggerFloatingAnimation('reply');
                  void withItemService((itemService) =>
                    itemService.markThreadRead(payload.threadId, authUserId, new Date().toISOString())
                  );
                });
              } else {
                navigate(payload.link || '/profile/messages');
              }
            }
          },
          {
            id: `push-mark-read-${payload.threadId}`,
            label: 'Mark read',
            onClick: () => {
              dismissNotification();
              if (payload.threadId) {
                void withItemService((itemService) =>
                  itemService.markThreadRead(payload.threadId, authUserId, new Date().toISOString())
                );
              }
            }
          },
          {
            id: `push-react-${payload.threadId}`,
            label: 'React +1',
            onClick: () => {
              dismissNotification();
              if (payload.threadId) {
                void withItemService((itemService) =>
                  itemService.sendMessageToThread(payload.threadId, authUserId, '+1')
                );
              }
            }
          }
        ] : [];

        showMessageBanner({
          title: payload.title,
          message: payload.body,
          tone: 'message',
          actions,
          durationMs: 9000
        });
        triggerFloatingAnimation('incoming');

        if (notificationSettings.soundEnabled) {
          playNotificationTone();
        }
      });
    };

    void syncPushState();

    return () => {
      cancelled = true;
      cleanupForegroundPush();
    };
  }, [
    authUserId,
    notificationSettings.desktopNotificationsEnabled,
    notificationSettings.chatBannersEnabled,
    notificationSettings.quickActionsEnabled,
    notificationSettings.soundEnabled,
    desktopPermission,
    dismissNotification,
    navigate,
    showMessageBanner,
    triggerFloatingAnimation
  ]);

  useEffect(() => {
    if (!authUserId) return;

    const isMessagesRoute = location.pathname.startsWith('/profile/messages');
    const shouldShowInAppBanner = notificationSettings.chatBannersEnabled && !isMessagesRoute;
    const shouldShowDesktop =
      notificationSettings.desktopNotificationsEnabled && (!isMessagesRoute || document.visibilityState !== 'visible');
    if (!shouldShowInAppBanner && !shouldShowDesktop) return;

    let cancelled = false;

    const pollMessages = async () => {
      try {
        const threads = await withItemService((itemService) => itemService.getChatThreadsForUser(authUserId));
        for (const thread of threads) {
          const latest = thread.messages[thread.messages.length - 1];
          if (!latest) continue;

          const previousMessageId = seenThreadMessageRef.current.get(thread.id);
          seenThreadMessageRef.current.set(thread.id, latest.id);

          if (!previousMessageId) continue;
          if (previousMessageId === latest.id) continue;
          if (latest.senderId === authUserId) continue;

          const senderId = latest.senderId || (thread.buyerId === authUserId ? thread.sellerId : thread.buyerId);
          let sender = senderCacheRef.current.get(senderId);
          if (!sender) {
            sender = await withUserService((userService) => userService.getUserById(senderId));
            if (sender) senderCacheRef.current.set(senderId, sender);
          }

          const senderName = sender?.name || 'New message';
          const senderAvatar = sender?.avatar || '/icons/urbanprime.svg';
          const preview = messagePreview(latest);
          const messageTimestamp = new Date(latest.timestamp).toISOString();
          const isEncryptedThreadMessage =
            Boolean((latest.content as { encrypted?: boolean } | undefined)?.encrypted) ||
            (typeof latest.text === 'string' && latest.text.startsWith('__enc_v1__:'));

          const actions: ToastAction[] = notificationSettings.quickActionsEnabled ? [
            {
              id: 'reply',
              label: 'Reply',
              variant: 'primary',
              onClick: () => {
                if (isEncryptedThreadMessage) {
                  dismissNotification();
                  navigate(`/profile/messages/${thread.id}`);
                  return;
                }
                const quickReply = window.prompt(`Reply to ${senderName}`);
                dismissNotification();
                const trimmed = String(quickReply || '').trim();
                if (!trimmed) {
                  navigate(`/profile/messages/${thread.id}`);
                  return;
                }
                void withItemService((itemService) => itemService.sendMessageToThread(thread.id, authUserId, trimmed)).then(() => {
                  triggerFloatingAnimation('reply');
                  void withItemService((itemService) =>
                    itemService.markThreadRead(thread.id, authUserId, new Date().toISOString())
                  );
                });
              }
            },
            {
              id: 'mark-read',
              label: 'Mark read',
              onClick: () => {
                dismissNotification();
                void withItemService((itemService) =>
                  itemService.markThreadRead(thread.id, authUserId, messageTimestamp)
                );
              }
            },
            {
              id: 'react',
              label: 'React +1',
              onClick: () => {
                dismissNotification();
                void withItemService((itemService) =>
                  itemService.sendMessageToThread(thread.id, authUserId, '+1')
                );
              }
            }
          ] : [];

          if (cancelled) return;
          if (shouldShowInAppBanner) {
            showMessageBanner({
              title: senderName,
              message: preview,
              avatarUrl: senderAvatar,
              actions,
              tone: 'message',
              durationMs: 9000
            });
            triggerFloatingAnimation('incoming');
          }

          if (notificationSettings.soundEnabled && (shouldShowInAppBanner || document.visibilityState !== 'visible')) {
            playNotificationTone();
          }

          if (
            shouldShowDesktop &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            document.visibilityState !== 'visible'
          ) {
            try {
              const nativeNotification = new Notification(senderName, {
                body: preview,
                icon: senderAvatar
              });
              nativeNotification.onclick = () => {
                window.focus();
                navigate(`/profile/messages/${thread.id}`);
                nativeNotification.close();
              };
            } catch {
              // ignore desktop notification failure
            }
          }

          break;
        }
      } catch {
        // ignore polling errors
      }
    };

    void pollMessages();
    const intervalId = window.setInterval(() => {
      void pollMessages();
    }, CHAT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authUserId, location.pathname, notificationSettings, dismissNotification, navigate, showMessageBanner, triggerFloatingAnimation]);

  useEffect(() => {
    void refreshUnreadNotificationCount();
    const intervalId = window.setInterval(() => {
      void refreshUnreadNotificationCount();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshUnreadNotificationCount]);

  const contextValue = useMemo<NotificationContextType>(() => ({
    showNotification,
    showMessageBanner,
    dismissNotification,
    notificationSettings,
    updateNotificationSettings,
    unreadNotificationCount,
    refreshUnreadNotificationCount,
    desktopPermission,
    requestDesktopPermission
  }), [
    showNotification,
    showMessageBanner,
    dismissNotification,
    notificationSettings,
    updateNotificationSettings,
    unreadNotificationCount,
    refreshUnreadNotificationCount,
    desktopPermission,
    requestDesktopPermission
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {floatingAnimation ? (
        <div
          className={`pointer-events-none fixed z-[115] ${
            floatingAnimation.variant === 'incoming'
              ? 'bottom-6 right-6 md:bottom-8 md:right-8'
              : 'top-24 right-4 md:top-24 md:right-8'
          }`}
        >
          <div className="rounded-2xl border border-white/70 bg-white/85 p-2 shadow-2xl backdrop-blur-sm">
            <LottieAnimation
              src={floatingAnimation.src}
              alt={floatingAnimation.alt}
              className={`${
                floatingAnimation.variant === 'incoming'
                  ? 'h-28 w-28 md:h-36 md:w-36'
                  : 'h-24 w-24 md:h-32 md:w-32'
              }`}
              loop
              autoplay
            />
          </div>
        </div>
      ) : null}
      {notification ? (
        <ToastNotification
          key={notification.id}
          title={notification.title}
          message={notification.message}
          avatarUrl={notification.avatarUrl}
          tone={notification.tone}
          actions={notification.actions}
          onClose={dismissNotification}
        />
      ) : null}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
