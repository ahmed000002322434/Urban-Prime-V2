import React from 'react';
import { MoreIcon } from './MessageIcons';
import SafeImage from './SafeImage';
import type { ThreadViewModel } from './types';

interface ThreadListItemProps {
  viewModel: ThreadViewModel;
  isActive: boolean;
  isMenuOpen: boolean;
  onSelect: () => void;
  onToggleMenu: () => void;
  onMoveToPrimary: () => void;
  onMoveToGeneral: () => void;
}

const ThreadListItem: React.FC<ThreadListItemProps> = ({
  viewModel,
  isActive,
  isMenuOpen,
  onSelect,
  onToggleMenu,
  onMoveToPrimary,
  onMoveToGeneral
}) => {
  const { thread, previewText, previewTime, hasUnread, contextLabel, presence, latestMessage, bucket, isUserHydrating } = viewModel;
  const canMove = bucket !== 'requests';

  if (isUserHydrating) {
    return (
      <div className="messages-thread-item w-full text-left" aria-hidden="true">
        <div className="flex items-start gap-2.5 animate-pulse">
          <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200/85 dark:bg-slate-700/70" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded-full bg-slate-200/85 dark:bg-slate-700/70" />
                <div className="h-3 w-20 rounded-full bg-slate-200/75 dark:bg-slate-700/60" />
              </div>
              <div className="h-3 w-10 rounded-full bg-slate-200/75 dark:bg-slate-700/60" />
            </div>
            <div className="mt-2 h-3.5 w-40 rounded-full bg-slate-200/80 dark:bg-slate-700/65" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`messages-thread-item w-full text-left ${isActive ? 'is-active' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <SafeImage
            src={thread.otherUser.avatar || '/icons/urbanprime.svg'}
            alt={thread.otherUser.name}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-white/60"
          />
          {presence?.isOnline ? <span className="messages-presence-dot" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="messages-thread-name truncate text-[13px] font-bold">{thread.otherUser.name}</p>
                {contextLabel ? <span className="messages-thread-pin">{contextLabel}</span> : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`messages-thread-time-label text-[10px] font-semibold ${hasUnread ? 'is-unread' : ''}`}>{previewTime}</span>
              {canMove ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleMenu();
                    }}
                    className={`messages-thread-menu-trigger messages-icon-button h-7 w-7 rounded-full text-text-secondary ${isMenuOpen ? 'is-open' : ''}`}
                    aria-label="Thread options"
                  >
                    <MoreIcon />
                  </button>
                  {isMenuOpen ? (
                    <div className="messages-thread-menu">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onMoveToPrimary(); }}>Move to Primary</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onMoveToGeneral(); }}>Move to General</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <p className={`messages-thread-preview min-w-0 flex-1 truncate text-[12px] leading-5 ${hasUnread ? 'is-unread font-semibold' : ''}`}>
              {previewText}
            </p>
            {!hasUnread && latestMessage?.type === 'offer' ? <span className="messages-thread-offer-badge">Offer</span> : null}
            {hasUnread ? <span className="messages-thread-dot" /> : null}
          </div>
        </div>
      </div>
    </button>
  );
};

export default ThreadListItem;
