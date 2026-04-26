import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { pixeService, type PixeChannel } from '../../services/pixeService';
import uploadService from '../../services/uploadService';

type StudioChannel = PixeChannel & { hidden_words?: string[]; onboarding_completed?: boolean };
type HandleState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error' | 'current';

const normalizeHandle = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

const inputClassName = 'pixe-noir-input h-12 rounded-2xl px-4 text-sm outline-none focus:border-white/18';
const secondaryButtonClassName = 'inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]';
const primaryButtonClassName = 'inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-50';

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="1.8">
    <path d="m12 20 8.5-8.5a2.12 2.12 0 0 0-3-3L9 17l-4 1 1-4Z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="2">
    <path d="m5 12.5 4.2 4.2L19 7.5" />
  </svg>
);

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

type Props = {
  channel: StudioChannel;
  onComplete: (channel: StudioChannel) => void;
};

const PixeStudioOnboardingOverlay: React.FC<Props> = ({ channel, onComplete }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleRequestRef = useRef(0);
  const [step, setStep] = useState<0 | 1>(0);
  const [displayName, setDisplayName] = useState(channel.display_name || '');
  const [handle, setHandle] = useState(channel.handle || '');
  const [bio, setBio] = useState(channel.bio || '');
  const [bannerUrl, setBannerUrl] = useState(channel.banner_url || '');
  const [avatarUrl, setAvatarUrl] = useState(channel.avatar_url || '');
  const [avatarPreview, setAvatarPreview] = useState(channel.avatar_url || '/icons/urbanprime.svg');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState(channel.avatar_url || '');

  const normalizedHandle = useMemo(() => normalizeHandle(handle), [handle]);
  const hasBasicInfo = Boolean(displayName.trim() && normalizedHandle && (handleState === 'available' || handleState === 'current'));
  const hasCustomization = Boolean(bio.trim());

  useEffect(() => {
    setDisplayName(channel.display_name || '');
    setHandle(channel.handle || '');
    setBio(channel.bio || '');
    setBannerUrl(channel.banner_url || '');
    setAvatarUrl(channel.avatar_url || '');
    setUploadedAvatarUrl(channel.avatar_url || '');
    setAvatarPreview(channel.avatar_url || '/icons/urbanprime.svg');
    setAvatarFile(null);
    setError('');
    setStep(0);
  }, [channel]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(uploadedAvatarUrl || avatarUrl || '/icons/urbanprime.svg');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile, avatarUrl, uploadedAvatarUrl]);

  useEffect(() => {
    if (!normalizedHandle) {
      setHandleState('invalid');
      return undefined;
    }
    if (normalizedHandle.length < 3) {
      setHandleState('invalid');
      return undefined;
    }
    if (normalizedHandle === normalizeHandle(channel.handle || '')) {
      setHandleState('current');
      return undefined;
    }
    if (!user?.id) {
      setHandleState('idle');
      return undefined;
    }

    const requestId = handleRequestRef.current + 1;
    handleRequestRef.current = requestId;
    setHandleState('checking');
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await pixeService.checkStudioHandleAvailability(normalizedHandle);
        if (handleRequestRef.current !== requestId) return;
        if (!result.available) {
          setHandleState('taken');
          return;
        }
        setHandleState(result.is_current ? 'current' : 'available');
      } catch {
        if (handleRequestRef.current !== requestId) return;
        setHandleState('error');
      }
    }, 90);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [channel.handle, normalizedHandle, user?.id]);

  const persistAvatarIfNeeded = async () => {
    if (!avatarFile || !user?.id) {
      return uploadedAvatarUrl || avatarUrl || null;
    }

    const upload = await uploadService.uploadImage({
      file: avatarFile,
      uploadType: 'profile',
      userId: user.id,
      resourceId: 'pixe-channel-avatar'
    });
    setAvatarFile(null);
    setUploadedAvatarUrl(upload.url);
    setAvatarUrl(upload.url);
    return upload.url;
  };

  const handleContinue = async () => {
    if (!hasBasicInfo) {
      setError('Add a channel name and an available handle.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const nextAvatarUrl = await persistAvatarIfNeeded();
      const nextChannel = await pixeService.updateStudioChannel({
        display_name: displayName.trim(),
        handle: normalizedHandle,
        avatar_url: nextAvatarUrl,
        onboarding_completed: false
      });
      setUploadedAvatarUrl(nextChannel.avatar_url || nextAvatarUrl || '');
      setAvatarUrl(nextChannel.avatar_url || nextAvatarUrl || '');
      setStep(1);
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save this channel setup right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    if (!hasCustomization) {
      setError('Add a short bio before continuing.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const nextAvatarUrl = await persistAvatarIfNeeded();
      const nextChannel = await pixeService.updateStudioChannel({
        display_name: displayName.trim(),
        handle: normalizedHandle,
        avatar_url: nextAvatarUrl,
        bio: bio.trim(),
        banner_url: bannerUrl.trim() || null,
        onboarding_completed: true
      });
      onComplete(nextChannel as StudioChannel);
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to finish channel setup right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/62 px-4 py-4 backdrop-blur-md">
      <div className="w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0b0c]/96 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">Pixe Studio</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{step === 0 ? 'Create your channel' : 'Customize your channel'}</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {['Basics', 'Customization'].map((label, index) => {
                const active = step === index;
                const complete = step > index;
                return (
                  <div
                    key={label}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      active ? 'bg-white text-black' : 'text-white/58'
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-black text-white' : complete ? 'bg-emerald-400 text-black' : 'border border-white/14 text-white/54'}`}>
                      {complete ? <CheckIcon /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 px-5 py-5 sm:px-6 sm:py-6">
            {step === 0 ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    <div className="h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
                      <img src={avatarPreview || '/icons/urbanprime.svg'} alt="Channel avatar preview" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white text-black shadow-[0_12px_26px_rgba(255,255,255,0.12)]"
                      aria-label="Change channel picture"
                    >
                      <PencilIcon />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAvatarFile(file);
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="block text-sm font-semibold text-white">Channel name</span>
                        <input
                          value={displayName}
                          onChange={(event) => {
                            setError('');
                            setDisplayName(event.target.value.slice(0, 80));
                          }}
                          placeholder="Your channel name"
                          className={inputClassName}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="block text-sm font-semibold text-white">Handle</span>
                        <div className="flex items-center rounded-2xl border border-white/10 bg-black/22 px-4">
                          <span className="text-sm font-semibold text-white/48">@</span>
                          <input
                            value={handle}
                            onChange={(event) => {
                              setError('');
                              setHandle(normalizeHandle(event.target.value));
                            }}
                            placeholder="your-handle"
                            className="h-12 w-full bg-transparent px-2 text-sm outline-none"
                          />
                        </div>
                        <p className={`text-xs font-medium ${statusToneClassName[handleState]}`}>{statusMessageFor(handleState)}</p>
                      </label>
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-[22px] border border-rose-400/24 bg-rose-500/[0.08] px-4 py-3 text-sm font-semibold text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => void handleContinue()}
                    disabled={!hasBasicInfo || busy}
                    className={primaryButtonClassName}
                  >
                    {busy ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <label className="space-y-2">
                      <span className="block text-sm font-semibold text-white">Bio</span>
                      <textarea
                        value={bio}
                        onChange={(event) => {
                          setError('');
                          setBio(event.target.value.slice(0, 280));
                        }}
                        rows={6}
                        className="pixe-noir-input w-full rounded-[22px] px-4 py-3 text-sm outline-none focus:border-white/18"
                        placeholder="Tell viewers what this channel is about"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="block text-sm font-semibold text-white">Banner URL</span>
                      <input
                        value={bannerUrl}
                        onChange={(event) => {
                          setError('');
                          setBannerUrl(event.target.value);
                        }}
                        placeholder="Optional cover image URL"
                        className={inputClassName}
                      />
                    </label>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <img src={avatarPreview || '/icons/urbanprime.svg'} alt={displayName || 'Channel'} className="h-14 w-14 rounded-full border border-white/10 object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">{displayName || 'Channel name'}</p>
                        <p className="truncate text-sm text-white/52">@{normalizedHandle || 'your-handle'}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/66">{bio.trim() || 'Add your public bio.'}</p>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-[22px] border border-rose-400/24 bg-rose-500/[0.08] px-4 py-3 text-sm font-semibold text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className={secondaryButtonClassName}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFinish()}
                    disabled={!hasCustomization || busy}
                    className={primaryButtonClassName}
                  >
                    {busy ? 'Saving...' : 'Save channel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-white/10 bg-black/22 px-5 py-5 lg:border-l lg:border-t-0 sm:px-6 sm:py-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">Preview</p>
              <div className="mt-4 flex items-center gap-3">
                <img src={avatarPreview || '/icons/urbanprime.svg'} alt="Channel avatar" className="h-12 w-12 rounded-full border border-white/10 object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName || 'Channel name'}</p>
                  <p className="truncate text-xs text-white/50">@{normalizedHandle || 'your-handle'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-white/48">
                <p>Profile picture can be changed any time.</p>
                <p>Handle stays unique across Pixe.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PixeStudioOnboardingOverlay;
