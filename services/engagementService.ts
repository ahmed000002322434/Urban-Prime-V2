import { auth } from '../firebase';
import { backendFetch } from './backendClient';

const PRESENCE_THROTTLE_MS = 5 * 60 * 1000;
let lastPresenceAt = 0;
let lastPresencePath = '';

export const engagementService = {
  async markPresence(path = ''): Promise<void> {
    const now = Date.now();
    const normalizedPath = String(path || '').slice(0, 240);
    if (now - lastPresenceAt < PRESENCE_THROTTLE_MS && normalizedPath === lastPresencePath) {
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    lastPresenceAt = now;
    lastPresencePath = normalizedPath;
    try {
      await backendFetch('/api/engagement/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: normalizedPath }),
        backendNoQueue: true,
        backendNoCache: true
      }, token);
    } catch (error) {
      console.warn('Engagement presence sync skipped:', error);
    }
  }
};

export default engagementService;
