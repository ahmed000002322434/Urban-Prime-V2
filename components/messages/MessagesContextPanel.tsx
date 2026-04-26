import React from 'react';
import { Link } from 'react-router-dom';
import { AttachmentIcon, LockIcon, MicIcon, OfferIcon } from './MessageIcons';
import SafeImage from './SafeImage';
import type { ChatSettings } from '../../types';
import type { ThreadViewModel } from './types';

interface MessagesContextPanelProps {
  activeViewModel: ThreadViewModel;
  presenceLabel: string;
  chatSettings: ChatSettings;
  threadPassphraseInput: string;
  isSavingPassphrase?: boolean;
  onPassphraseChange: (value: string) => void;
  onSavePassphrase: () => void;
  onToggleSetting: (patch: Partial<ChatSettings>) => void;
  onMoveThread: (bucket: 'primary' | 'general') => void;
  onAttachImage: () => void;
  onOpenOffer: () => void;
  onToggleVoiceRecording: () => void;
}

const MessagesContextPanel: React.FC<MessagesContextPanelProps> = ({
  activeViewModel,
  presenceLabel,
  chatSettings,
  threadPassphraseInput,
  onPassphraseChange,
  onSavePassphrase,
  onToggleSetting,
  onMoveThread,
  onAttachImage,
  onOpenOffer,
  onToggleVoiceRecording
}) => {
  const { thread, bucket } = activeViewModel;
  const heroImage = thread.item?.imageUrls?.[0] || thread.item?.images?.[0] || '/icons/urbanprime.svg';
  const bucketLabel = bucket === 'requests' ? 'Requests' : bucket === 'general' ? 'General' : 'Primary';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="messages-context-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="messages-profile-hero">
          <div className="messages-profile-hero-top">
            <span className="messages-profile-pill">Conversation profile</span>
            <span className="messages-profile-pill is-soft">{bucketLabel}</span>
          </div>
          <div className="messages-profile-hero-avatar">
            <div className="messages-profile-hero-orb" aria-hidden="true" />
            <SafeImage src={thread.otherUser.avatar || '/icons/urbanprime.svg'} alt={thread.otherUser.name} className="relative z-[1] h-20 w-20 rounded-full object-cover ring-4 ring-white/75" />
          </div>
          <p className="mt-4 text-lg font-black text-text-primary">{thread.otherUser.name}</p>
          <p className="mt-1 text-sm text-text-secondary">{presenceLabel}</p>
          <div className="messages-profile-stat-row">
            <div className="messages-profile-stat-card">
              <span className="messages-profile-stat-label">Inbox</span>
              <strong>{bucketLabel}</strong>
            </div>
            <div className="messages-profile-stat-card">
              <span className="messages-profile-stat-label">Privacy</span>
              <strong>{chatSettings.e2eEnabled ? 'Encrypted' : 'Standard'}</strong>
            </div>
          </div>
          {activeViewModel.contextLabel ? (
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-text-secondary/70">{activeViewModel.contextLabel}</p>
          ) : null}
        </div>

        {thread.itemId ? (
          <div className="messages-context-card mt-4">
            <p className="messages-section-label">Listing context</p>
            <Link to={`/item/${thread.item.id}`} className="messages-listing-card mt-3 block overflow-hidden rounded-[1.5rem]">
              <SafeImage src={heroImage} alt={thread.item.title} className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-black text-text-primary">{thread.item.title}</p>
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">{thread.item.description || 'Open the listing for full details.'}</p>
              </div>
            </Link>
          </div>
        ) : null}

        <div className="messages-context-card mt-4">
          <p className="messages-section-label">Quick actions</p>
          <div className="mt-3 grid gap-2">
            <button type="button" onClick={onOpenOffer} className="messages-action-button">
              <OfferIcon />
              <span>Create offer</span>
            </button>
            <button type="button" onClick={onAttachImage} className="messages-action-button">
              <AttachmentIcon />
              <span>Attach image</span>
            </button>
            <button type="button" onClick={onToggleVoiceRecording} className="messages-action-button">
              <MicIcon />
              <span>Record voice note</span>
            </button>
          </div>
        </div>

        {bucket !== 'requests' ? (
          <div className="messages-context-card mt-4">
            <p className="messages-section-label">Inbox placement</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onMoveThread('primary')} className={`messages-context-toggle ${bucket === 'primary' ? 'is-active' : ''}`}>Primary</button>
              <button type="button" onClick={() => onMoveThread('general')} className={`messages-context-toggle ${bucket === 'general' ? 'is-active' : ''}`}>General</button>
            </div>
          </div>
        ) : (
          <div className="messages-context-card mt-4">
            <p className="messages-section-label">Inbox placement</p>
            <p className="mt-3 text-sm text-text-secondary">Request-linked conversations stay in Requests automatically.</p>
          </div>
        )}

        <div className="messages-context-card mt-4">
          <p className="messages-section-label">Message settings</p>
          <div className="mt-3 space-y-3">
            <label className="messages-setting-row">
              <span className="inline-flex items-center gap-2"><LockIcon /> E2E encryption</span>
              <input type="checkbox" checked={chatSettings.e2eEnabled} onChange={(event) => onToggleSetting({ e2eEnabled: event.target.checked })} className="accent-primary" />
            </label>
            <label className="messages-setting-row">
              <span>Presence visibility</span>
              <input type="checkbox" checked={chatSettings.presenceVisible} onChange={(event) => onToggleSetting({ presenceVisible: event.target.checked })} className="accent-primary" />
            </label>
            <label className="messages-setting-row">
              <span>Notification sound</span>
              <input type="checkbox" checked={chatSettings.soundEnabled} onChange={(event) => onToggleSetting({ soundEnabled: event.target.checked })} className="accent-primary" />
            </label>
          </div>

          <div className="messages-passphrase-card mt-4 rounded-[1.35rem] p-3">
            <label className="messages-section-label flex items-center gap-2"><LockIcon /> Passphrase</label>
            <input
              type="password"
              value={threadPassphraseInput}
              onChange={(event) => onPassphraseChange(event.target.value)}
              placeholder="Save a passphrase for encrypted messages"
              className="messages-passphrase-input mt-3"
            />
            <button type="button" onClick={onSavePassphrase} className="messages-primary-button mt-3 w-full justify-center">
              Save passphrase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesContextPanel;
