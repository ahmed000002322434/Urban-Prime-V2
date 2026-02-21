import { dataModeConfig, prefersSupabase } from './dataMode';

const getBackendBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:5050';
  return '';
};

export const isBackendConfigured = () => Boolean(getBackendBaseUrl());

export const shouldUseBackend = () => {
  if (!prefersSupabase()) return false;
  return isBackendConfigured() || dataModeConfig.requireBackend;
};

export const backendFetch = async (
  path: string,
  options: RequestInit = {},
  token?: string
) => {
  const baseUrl = getBackendBaseUrl();
  const backendKey = (import.meta.env.VITE_BACKEND_API_KEY as string | undefined)?.trim();

  if (!baseUrl) {
    if (dataModeConfig.requireBackend) {
      throw new Error('Backend URL not configured. Set VITE_BACKEND_URL.');
    }
    throw new Error('Backend unavailable in current data mode.');
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (backendKey) {
    headers.set('x-backend-key', backendKey);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText;
    throw new Error(message);
  }

  return payload;
};
