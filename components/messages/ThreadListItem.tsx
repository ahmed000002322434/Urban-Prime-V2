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
  const { thread, previewText, previewTime, hasUnread, contextLabel, presence, latestMessage, bucket } = viewModel;
  const canMove = bucket !== 'requests';

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
                <p className="truncate text-[13px] font-bold text-text-primary">{thread.otherUser.name}</p>
                {contextLabel ? <span className="messages-thread-pin">{contextLabel}</span> : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-semibold ${hasUnread ? 'text-primary' : 'text-text-secondary/80'}`}>{previewTime}</span>
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
            <p className={`min-w-0 flex-1 truncate text-[12px] leading-5 ${hasUnread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
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
