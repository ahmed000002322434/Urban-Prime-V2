import React from 'react';
import { Link } from 'react-router-dom';
import { BackIcon, InfoIcon, PhoneIcon, VideoIcon } from './MessageIcons';
import SafeImage from './SafeImage';
import type { ThreadViewModel } from './types';

interface ConversationHeaderProps {
  activeViewModel: ThreadViewModel;
  presenceLabel: string;
  onBack: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onOpenDetails: () => void;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  activeViewModel,
  presenceLabel,
  onBack,
  onVoiceCall,
  onVideoCall,
  onOpenDetails
}) => {
  const { thread } = activeViewModel;

  return (
    <header className="messages-conversation-header">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="messages-icon-button h-9 w-9 rounded-full sm:hidden"
          title="Back"
        >
          <BackIcon />
        </button>
        <SafeImage
          src={thread.otherUser.avatar || '/icons/urbanprime.svg'}
          alt={thread.otherUser.name}
          className="h-10 w-10 rounded-full object-cover ring-1 ring-white/75"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-text-primary">{thread.otherUser.name}</p>
          <p className="truncate text-xs text-text-secondary">{presenceLabel}</p>
          {thread.itemId ? (
            <Link
              to={`/item/${thread.item.id}`}
              className="messages-context-chip mt-1 inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
            >
              <span className="truncate">{thread.item.title}</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onVoiceCall} className="messages-icon-button messages-header-action hidden h-9 w-9 rounded-full md:flex" title="Voice call">
          <PhoneIcon />
        </button>
        <button type="button" onClick={onVideoCall} className="messages-icon-button messages-header-action hidden h-9 w-9 rounded-full md:flex" title="Video call">
          <VideoIcon />
        </button>
        <button type="button" onClick={onOpenDetails} className="messages-icon-button messages-header-action h-9 w-9 rounded-full" title="Conversation details">
          <InfoIcon />
        </button>
      </div>
    </header>
  );
};

export default ConversationHeader;
