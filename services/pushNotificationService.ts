import app from '../firebase';
import type { MessagePayload } from 'firebase/messaging';

const DEFAULT_SW_PATH = '/firebase-messaging-sw.js';
const PUSH_PERMISSION_PROMPT_KEY = 'urbanprime:push-permission-prompted:v1';

type PushPermissionState = NotificationPermission | 'unsupported';

export interface PushInitResult {
  supported: boolean;
  permission: PushPermissionState;
  token: string | null;
}

export interface ForegroundPushPayload {
  title: string;
  body: string;
  link: string;
  threadId: string;
  senderId: string;
  raw: MessagePayload;
}

let messagingInstance: ReturnType<typeof getMessaging> | null = null;
let swRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;
let messagingModulePromise: Promise<typeof import('firebase/messaging')> | null = null;

const loadMessagingModule = () => {
  if (!messagingModulePromise) {
    messagingModulePromise = import('firebase/messaging');
  }
  return messagingModulePromise;
};

const toNotificationPermission = (): PushPermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

const canUseServiceWorkerPush = async () => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    const { isSupported } = await loadMessagingModule();
    return await isSupported();
  } catch {
    return false;
  }
};

const getMessagingInstance = async () => {
  if (!messagingInstance) {
    const { getMessaging } = await loadMessagingModule();
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

const getServiceWorkerRegistration = async () => {
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register(DEFAULT_SW_PATH, { scope: '/' });
  }
  return swRegistrationPromise;
};

const readVapidKey = () => String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();

const normalizeLink = (value: string) => {
  const link = String(value || '').trim();
  if (!link) return '/#/profile/messages';
  if (/^https?:\/\//i.test(link)) return link;
  if (link.startsWith('/#/')) return link;
  if (link.startsWith('#/')) return `/${link}`;
  return `/#${link.startsWith('/') ? link : `/${link}`}`;
};

const normalizeForegroundPayload = (payload: MessagePayload): ForegroundPushPayload => {
  const title = String(payload.notification?.title || payload.data?.title || 'Urban Prime');
  const body = String(payload.notification?.body || payload.data?.body || 'New message');
  const link = normalizeLink(String(payload.data?.link || payload.fcmOptions?.link || '/#/profile/messages'));
  return {
    title,
    body,
    link,
    threadId: String(payload.data?.threadId || ''),
    senderId: String(payload.data?.senderId || ''),
    raw: payload
  };
};

export const requestPushPermission = async (): Promise<PushPermissionState> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    try {
      window.localStorage.setItem(PUSH_PERMISSION_PROMPT_KEY, '1');
    } catch {
      // ignore storage errors
    }
    return permission;
  } catch {
    return Notification.permission;
  }
};

export const initializePushMessaging = async (
  options: { promptIfDefault?: boolean } = {}
): Promise<PushInitResult> => {
  const supported = await canUseServiceWorkerPush();
  if (!supported) {
    return { supported: false, permission: 'unsupported', token: null };
  }

  let permission = toNotificationPermission();
  if (permission === 'default' && options.promptIfDefault) {
    permission = await requestPushPermission();
  }

  if (permission !== 'granted') {
    return { supported: true, permission, token: null };
  }

  const vapidKey = readVapidKey();
  if (!vapidKey) {
    return { supported: true, permission, token: null };
  }

  try {
    const registration = await getServiceWorkerRegistration();
    const messaging = await getMessagingInstance();
    const { getToken } = await loadMessagingModule();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });
    return { supported: true, permission, token: token || null };
  } catch (error) {
    console.warn('Unable to initialize web push messaging:', error);
    return { supported: true, permission, token: null };
  }
};

export const maybePromptPushPermissionOnce = async () => {
  if (typeof window === 'undefined') return toNotificationPermission();
  const permission = toNotificationPermission();
  if (permission !== 'default') return permission;
  try {
    const prompted = window.localStorage.getItem(PUSH_PERMISSION_PROMPT_KEY) === '1';
    if (prompted) return permission;
  } catch {
    // ignore storage errors
  }
  return requestPushPermission();
};

export const subscribeToForegroundPush = async (
  callback: (payload: ForegroundPushPayload) => void
): Promise<() => void> => {
  const supported = await canUseServiceWorkerPush();
  if (!supported) return () => {};

  try {
    const messaging = await getMessagingInstance();
    const { onMessage } = await loadMessagingModule();
    return onMessage(messaging, (payload) => {
      callback(normalizeForegroundPayload(payload));
    });
  } catch (error) {
    console.warn('Unable to subscribe to foreground push messages:', error);
    return () => {};
  }
};
