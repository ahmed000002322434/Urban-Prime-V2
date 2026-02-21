import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

type DraftField =
  | { kind: 'text'; value: string }
  | { kind: 'textarea'; value: string }
  | { kind: 'select'; value: string }
  | { kind: 'checkbox'; checked: boolean; value: string }
  | { kind: 'radio'; checked: boolean; value: string };

interface RouteDraftPayload {
  fields: Record<string, DraftField>;
  updatedAt: string;
}

const DRAFT_KEY_PREFIX = 'urbanprime_route_draft_v1:';
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const BLOCKED_INPUT_TYPES = new Set(['password', 'hidden', 'file', 'submit', 'button', 'image', 'reset']);

const isTrackableElement = (
  element: EventTarget | null
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  return Boolean(
    element
    && (
      element instanceof HTMLInputElement
      || element instanceof HTMLTextAreaElement
      || element instanceof HTMLSelectElement
    )
  );
};

const getFieldKey = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | null => {
  if (element.name && element.name.trim().length > 0) return `name:${element.name.trim()}`;
  if (element.id && element.id.trim().length > 0) return `id:${element.id.trim()}`;
  return null;
};

const readDraft = (key: string): RouteDraftPayload | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RouteDraftPayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.fields) return null;

    const updatedAtMs = new Date(parsed.updatedAt || 0).getTime();
    if (!updatedAtMs || Date.now() - updatedAtMs > DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const AutoDraftPersistence: React.FC = () => {
  const location = useLocation();
  const routeKey = useMemo(
    () => `${DRAFT_KEY_PREFIX}${location.pathname}${location.search}`,
    [location.pathname, location.search]
  );

  const routeKeyRef = useRef(routeKey);
  const payloadRef = useRef<RouteDraftPayload>({ fields: {}, updatedAt: new Date().toISOString() });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedNoticeAtRef = useRef(0);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (message: string) => {
    const now = Date.now();
    if (message.startsWith('Draft saved') && now - lastSavedNoticeAtRef.current < 3000) {
      return;
    }
    if (message.startsWith('Draft saved')) {
      lastSavedNoticeAtRef.current = now;
    }

    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2200);
  };

  const persistNow = () => {
    try {
      payloadRef.current.updatedAt = new Date().toISOString();
      localStorage.setItem(routeKeyRef.current, JSON.stringify(payloadRef.current));
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    routeKeyRef.current = routeKey;
    const existing = readDraft(routeKey);
    payloadRef.current = existing || { fields: {}, updatedAt: new Date().toISOString() };
    dirtyRef.current = false;

    if (existing && Object.keys(existing.fields).length > 0) {
      requestAnimationFrame(() => {
        Object.entries(existing.fields).forEach(([key, field]) => {
          const [type, identifier] = key.split(':');
          if (!identifier) return;

          const elements: Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = [];
          if (type === 'name') {
            elements.push(
              ...(Array.from(document.getElementsByName(identifier))
                .filter((node): node is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
                  node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement
                ))
            );
          } else if (type === 'id') {
            const node = document.getElementById(identifier);
            if (node && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
              elements.push(node);
            }
          }

          elements.forEach((element) => {
            if (element instanceof HTMLInputElement) {
              if (BLOCKED_INPUT_TYPES.has((element.type || '').toLowerCase())) return;

              if (field.kind === 'checkbox') {
                element.checked = Boolean(field.checked);
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return;
              }

              if (field.kind === 'radio') {
                element.checked = element.value === field.value && Boolean(field.checked);
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return;
              }

              element.value = field.value || '';
              element.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }

            if (element instanceof HTMLTextAreaElement) {
              if (field.kind !== 'textarea' && field.kind !== 'text') return;
              element.value = field.value || '';
              element.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }

            if (element instanceof HTMLSelectElement) {
              if (field.kind !== 'select' && field.kind !== 'text') return;
              element.value = field.value || '';
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        });

        showNotice('Restored unsaved draft from your last session.');
      });
    }
  }, [routeKey]);

  useEffect(() => {
    const onFieldChange = (event: Event) => {
      if (!isTrackableElement(event.target)) return;
      const target = event.target;
      const key = getFieldKey(target);
      if (!key) return;

      if (target instanceof HTMLInputElement) {
        const inputType = (target.type || '').toLowerCase();
        if (BLOCKED_INPUT_TYPES.has(inputType)) return;

        if (inputType === 'checkbox') {
          payloadRef.current.fields[key] = { kind: 'checkbox', checked: target.checked, value: target.value || '' };
        } else if (inputType === 'radio') {
          payloadRef.current.fields[key] = { kind: 'radio', checked: target.checked, value: target.value || '' };
        } else {
          payloadRef.current.fields[key] = { kind: 'text', value: target.value || '' };
        }
      } else if (target instanceof HTMLTextAreaElement) {
        payloadRef.current.fields[key] = { kind: 'textarea', value: target.value || '' };
      } else if (target instanceof HTMLSelectElement) {
        payloadRef.current.fields[key] = { kind: 'select', value: target.value || '' };
      }

      dirtyRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        persistNow();
        showNotice('Draft saved locally for this page.');
      }, 350);
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      persistNow();
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('input', onFieldChange, true);
    document.addEventListener('change', onFieldChange, true);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('input', onFieldChange, true);
      document.removeEventListener('change', onFieldChange, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-xs rounded-xl border border-white/30 bg-black/75 px-3 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur">
      {notice}
    </div>
  );
};

export default AutoDraftPersistence;
