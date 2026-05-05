import { auth } from '../firebase';
import { backendFetch } from './backendClient';

export type WhatsAppMessageCategory = 'authentication' | 'security' | 'utility' | 'marketing';

export type WhatsAppPreferenceSnapshot = Record<WhatsAppMessageCategory, boolean>;

export interface WhatsAppPreferenceResponse {
  ok?: boolean;
  channel: 'whatsapp';
  phone?: string | null;
  maskedPhone?: string;
  configured?: boolean;
  dryRun?: boolean;
  preferences: WhatsAppPreferenceSnapshot;
}

const DEFAULT_WHATSAPP_PREFERENCES: WhatsAppPreferenceSnapshot = {
  authentication: false,
  security: false,
  utility: false,
  marketing: false
};

const getToken = async () => {
  if (!auth.currentUser) return undefined;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
};

const normalizeResponse = (payload: any): WhatsAppPreferenceResponse => ({
  channel: 'whatsapp',
  phone: payload?.phone || null,
  maskedPhone: payload?.maskedPhone || '',
  configured: payload?.configured === true,
  dryRun: payload?.dryRun === true,
  preferences: {
    ...DEFAULT_WHATSAPP_PREFERENCES,
    ...(payload?.preferences || {})
  }
});

export const messagePreferencesService = {
  async getWhatsAppPreferences(): Promise<WhatsAppPreferenceResponse> {
    const token = await getToken();
    const payload = await backendFetch('/api/message-preferences/whatsapp', {
      backendNoCache: true
    }, token);
    return normalizeResponse(payload);
  },

  async updateWhatsAppPreferences(preferences: Partial<WhatsAppPreferenceSnapshot>): Promise<WhatsAppPreferenceResponse> {
    const token = await getToken();
    const payload = await backendFetch('/api/message-preferences/whatsapp', {
      method: 'PATCH',
      body: JSON.stringify({ preferences }),
      backendNoQueue: true
    }, token);
    return normalizeResponse(payload);
  }
};

export default messagePreferencesService;
