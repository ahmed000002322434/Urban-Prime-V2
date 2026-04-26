import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixeChartPageSkeleton } from '../../../components/pixe/PixeSkeleton';
import { pixeService, type PixeChannel } from '../../../services/pixeService';

type ChannelState = PixeChannel & { hidden_words?: string[] };
type HandleState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error' | 'current';

const inputClassName = 'h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none';
const cardClassName = 'rounded-[28px] border border-white/10 bg-white/[0.04] p-5';

const normalizeHandle = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

const statusToneClassName: Record<HandleState, string> = {
  idle: 'text-white/46',
  checking: 'text-white/58',
  available: 'text-emerald-300',
  current: 'text-emerald-300',
  taken: 'text-rose-300',
  invalid: 'text-amber-200',
  error: 'text-rose-300'
};

const statusMessageFor = (state: HandleState) => {
  switch (state) {
    case 'checking':
      return 'Checking handle...';
    case 'available':
      return 'Handle is available.';
    case 'current':
      return 'This handle is ready to use.';
    case 'taken':
      return 'This handle is already taken.';
    case 'invalid':
      return 'Use 3 to 32 letters, numbers, dots, underscores, or hyphens.';
    case 'error':
      return 'Unable to check right now.';
    default:
      return ' ';
  }
};

const PixeStudioChannelPage: React.FC = () => {
  const handleRequestRef = useRef(0);
  const [state, setState] = useState<ChannelState | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [savedHandle, setSavedHandle] = useState('');
  const [handleState, setHandleState] = useState<HandleState>('idle');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const payload = await pixeService.getStudioChannel();
        if (!cancelled) {
          setState(payload as ChannelState);
          setSavedHandle(normalizeHandle(payload.handle || ''));
        }
      } catch (loadError) {
        console.error('Unable to load Pixe channel settings:', loadError);
        if (!cancelled) setError('Unable to load channel settings right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedHandle = useMemo(() => normalizeHandle(state?.handle || ''), [state?.handle]);
  const bioLength = String(state?.bio || '').trim().length;

  useEffect(() => {
    if (!state) return undefined;
    if (!normalizedHandle || normalizedHandle.length < 3) {
      setHandleState('invalid');
      return undefined;
    }
    if (normalizedHandle === savedHandle) {
      setHandleState('current');
      return undefined;
    }

    const requestId = handleRequestRef.current + 1;
    handleRequestRef.current = requestId;
    setHandleState('checking');

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await pixeService.checkStudioHandleAvailability(normalizedHandle);
        if (handleRequestRef.current !== requestId) return;
        setHandleState(result.available ? (result.is_current ? 'current' : 'available') : 'taken');
      } catch (handleError) {
        if (handleRequestRef.current !== requestId) return;
        console.error('Unable to check Pixe handle availability from channel page:', handleError);
        setHandleState('error');
      }
    }, 90);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedHandle, savedHandle, state]);

  const canSave = Boolean(
    state
    && String(state.display_name || '').trim()
    && normalizedHandle
    && bioLength > 0
    && (handleState === 'available' || handleState === 'current')
    && !saving
  );

  if (loading || !state) {
    return <PixeChartPageSkeleton />;
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextHandle = normalizeHandle(state.handle || '');
        const nextBio = String(state.bio || '').trim();

        if (!nextHandle) {
          setError('Choose a public handle before saving.');
          return;
        }
        if (!(handleState === 'available' || handleState === 'current')) {
          setError('Choose an available public handle before saving.');
          return;
        }
        if (!nextBio) {
          setError('Add a public bio before saving.');
          return;
        }

        setSaving(true);
        setError('');
        setSavedMessage('');
        try {
          const next = await pixeService.updateStudioChannel({
            display_name: String(state.display_name || '').trim(),
            handle: nextHandle,
            bio: nextBio,
            avatar_url: String(state.avatar_url || '').trim(),
            banner_url: String(state.banner_url || '').trim(),
            hidden_words: state.hidden_words || []
          });
          setState((current) => (current ? { ...current, ...next, handle: next.handle, bio: next.bio } : current));
          setSavedHandle(normalizeHandle(next.handle || nextHandle));
          setSavedMessage('Channel saved.');
        } catch (saveError: any) {
          console.error('Unable to save Pixe channel settings:', saveError);
          setError(saveError?.message || 'Unable to save channel settings right now.');
        } finally {
          setSaving(false);
        }
      }}
    >
      <section className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Channel</p>
            <h2 className="mt-2 text-3xl font-semibold">Customize channel</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Set the public identity people see on Pixe. Your handle is unique across the platform.
            </p>
          </div>

          <div className="w-full max-w-[360px] rounded-[28px] border border-white/10 bg-black/24 p-4">
            <div className="flex items-center gap-3">
              <img
                src={state.avatar_url || '/icons/urbanprime.svg'}
                alt={state.display_name}
                className="h-14 w-14 rounded-full border border-white/10 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{state.display_name || 'Channel name'}</p>
                <p className="truncate text-sm text-white/52">@{normalizedHandle || 'your-handle'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/62">
              {String(state.bio || '').trim() || 'Add a short bio so viewers know what this channel is about.'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div className={cardClassName}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Display name</span>
                <input
                  value={state.display_name}
                  onChange={(event) => {
                    setSavedMessage('');
                    setState({ ...state, display_name: event.target.value });
                  }}
                  className={inputClassName}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Public handle</span>
                <div className="flex items-center rounded-2xl border border-white/10 bg-black/20 px-4">
                  <span className="text-sm font-semibold text-white/48">@</span>
                  <input
                    value={state.handle}
                    onChange={(event) => {
                      setSavedMessage('');
                      setState({ ...state, handle: normalizeHandle(event.target.value) });
                    }}
                    className="h-11 w-full bg-transparent px-2 text-sm outline-none"
                  />
                </div>
                <p className={`text-xs font-medium ${statusToneClassName[handleState]}`}>{statusMessageFor(handleState)}</p>
              </label>
            </div>
          </div>

          <div className={cardClassName}>
            <label className="space-y-2">
              <span className="block text-sm font-semibold text-white">Bio</span>
              <textarea
                value={state.bio}
                onChange={(event) => {
                  setSavedMessage('');
                  setState({ ...state, bio: event.target.value.slice(0, 280) });
                }}
                rows={6}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </label>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/45">
              <span>Required</span>
              <span>{bioLength}/280</span>
            </div>
          </div>

          <div className={cardClassName}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Avatar URL</span>
                <input
                  value={state.avatar_url || ''}
                  onChange={(event) => {
                    setSavedMessage('');
                    setState({ ...state, avatar_url: event.target.value });
                  }}
                  className={inputClassName}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Banner URL</span>
                <input
                  value={state.banner_url || ''}
                  onChange={(event) => {
                    setSavedMessage('');
                    setState({ ...state, banner_url: event.target.value });
                  }}
                  className={inputClassName}
                />
              </label>
            </div>
          </div>

          <div className={cardClassName}>
            <label className="space-y-2">
              <span className="block text-sm font-semibold text-white">Hidden words</span>
              <input
                value={(state.hidden_words || []).join(', ')}
                onChange={(event) => {
                  setSavedMessage('');
                  setState({
                    ...state,
                    hidden_words: event.target.value
                      .split(',')
                      .map((entry) => entry.trim())
                      .filter(Boolean)
                  });
                }}
                className={inputClassName}
              />
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <div className={cardClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Public URL</p>
            <p className="mt-3 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/74">
              urbanprime.com/pixe/channel/{normalizedHandle || 'your-handle'}
            </p>
          </div>

          {(error || savedMessage) ? (
            <div className={`${cardClassName} ${error ? 'border-rose-500/30 bg-rose-500/[0.06]' : 'border-emerald-500/30 bg-emerald-500/[0.08]'}`}>
              <p className={`text-sm font-semibold ${error ? 'text-rose-200' : 'text-emerald-200'}`}>
                {error || savedMessage}
              </p>
            </div>
          ) : null}

          <div className={cardClassName}>
            <button
              type="submit"
              disabled={!canSave}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save channel'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
};

export default PixeStudioChannelPage;
