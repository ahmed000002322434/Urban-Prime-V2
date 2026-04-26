import React, { memo, useMemo, useRef } from 'react';
import type { ChatMessage, CustomOffer } from '../../types';
import SafeImage from './SafeImage';
import VoiceNotePlayer from './VoiceNotePlayer';
import type { DeliveryStatus, ThreadWithDetails } from './types';
import { EditIcon, HeartIcon, ReplyIcon, TrashIcon } from './MessageIcons';

interface MessageListProps {
  activeThread: ThreadWithDetails;
  messages: ChatMessage[];
  currentUserId?: string;
  recipientId: string;
  readReceipts: Record<string, string>;
  decryptedByMessageId: Record<string, string>;
  decryptErrorByMessageId: Record<string, boolean>;
  onAcceptOffer: (offerId: string) => void;
  onReplyToMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  onDeleteMessage: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  onLoadOlderMessages: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

type MessageEntry =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'unread'; id: string }
  | { kind: 'message'; id: string; index: number; message: ChatMessage };

interface MessageBubbleProps {
  activeThread: ThreadWithDetails;
  message: ChatMessage;
  previousMessage: ChatMessage | null;
  nextMessage: ChatMessage | null;
  currentUserId?: string;
  recipientId: string;
  readReceipts: Record<string, string>;
  decryptedByMessageId: Record<string, string>;
  decryptErrorByMessageId: Record<string, boolean>;
  messageLookup: Map<string, ChatMessage>;
  onAcceptOffer: (offerId: string) => void;
  onReplyToMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  onDeleteMessage: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
}

const STACK_WINDOW_MS = 5 * 60 * 1000;
const QUICK_REACTIONS = ['❤️', '👍', '😂'] as const;

const formatMessageTimestamp = (value: string | Date) => {
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '--';
  return dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatDayLabel = (value: string | Date) => {
  const dateValue = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfMessageDay = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()).getTime();
  if (startOfMessageDay === startOfToday) return 'Today';
  if (startOfMessageDay === startOfToday - 86400000) return 'Yesterday';
  return dateValue.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const isSameDay = (left: string | Date, right: string | Date) => {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const isEncryptedMessage = (message: ChatMessage) =>
  Boolean(message.content?.encrypted) || (typeof message.text === 'string' && message.text.startsWith('__enc_v1__:'));

const getMessageTimestampMs = (message: ChatMessage | null) => {
  if (!message) return 0;
  const parsed = new Date(message.timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMessageSnippet = (message: ChatMessage | null, decryptedByMessageId: Record<string, string>) => {
  if (!message) return '';
  if (message.deletedAt) return 'Message deleted';
  const decrypted = decryptedByMessageId[message.id];
  if (decrypted) return decrypted.trim() || 'Message';
  if (isEncryptedMessage(message)) return 'Encrypted message';
  if (message.type === 'voice') return 'Voice note';
  if (message.type === 'offer') return 'Offer';
  if (message.type === 'contract') return 'Contract update';
  if (message.type === 'milestone') return 'Milestone update';
  if (message.type === 'image' && !message.text) return 'Image';
  return String(message.text || '').trim() || 'Message';
};

const DeliveryTicks: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const tickClass = status === 'seen' ? 'text-sky-500' : 'text-gray-400';
  if (status === 'sent') {
    return (
      <svg className="h-3 w-3 text-gray-400" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3.25 8.25L6.1 11.1L12.75 4.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <span className={`inline-flex items-center ${tickClass}`} aria-hidden="true">
      <svg className="h-3 w-3 -mr-1" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.25 8.25L6.1 11.1L12.75 4.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.25 8.25L6.1 11.1L12.75 4.45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
};

const OfferCard: React.FC<{ offer: CustomOffer; isSender: boolean; onAccept: () => void }> = ({ offer, isSender, onAccept }) => (
  <div className={`messages-offer-card w-full max-w-sm ${isSender ? 'is-own' : 'is-peer'}`}>
    <div className="mb-2 flex items-start justify-between gap-3">
      <h4 className="text-sm font-black text-text-primary">{offer.title}</h4>
      <span className="messages-offer-status">{offer.status}</span>
    </div>
    <p className="text-sm text-text-secondary">{offer.description}</p>
    <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Price</p>
        <p className="text-base font-black text-text-primary">${offer.price}</p>
      </div>
      {!isSender && offer.status === 'pending' ? (
        <button onClick={onAccept} className="messages-primary-button px-3 py-2 text-[11px]">
          Accept
        </button>
      ) : null}
    </div>
  </div>
);

const MessageBubble = memo(({
  activeThread,
  message,
  previousMessage,
  nextMessage,
  currentUserId,
  recipientId,
  readReceipts,
  decryptedByMessageId,
  decryptErrorByMessageId,
  messageLookup,
  onAcceptOffer,
  onReplyToMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction
}: MessageBubbleProps) => {
  const lastTapAtRef = useRef(0);
  const isSender = message.senderId === currentUserId;
  const isDeleted = Boolean(message.deletedAt);
  const isPending = String(message.id || '').startsWith('temp-');
  const isEncrypted = isEncryptedMessage(message);
  const decryptedText = decryptedByMessageId[message.id];
  const decryptedError = Boolean(decryptErrorByMessageId[message.id]);
  const replyTarget = message.replyToMessageId ? messageLookup.get(message.replyToMessageId) || null : null;
  const replyLabel = replyTarget
    ? (replyTarget.senderId === currentUserId ? 'You' : activeThread.otherUser.name.split(' ')[0] || 'Reply')
    : '';
  const reactionEntries = Object.entries(message.reactions || {})
    .filter(([, userIds]) => Array.isArray(userIds) && userIds.length > 0)
    .sort((left, right) => right[1].length - left[1].length);

  const displayText = isDeleted
    ? (isSender ? 'You deleted this message.' : 'Message deleted.')
    : (decryptedText || (isEncrypted ? '' : (message.text || '')));
  const messageTimestampMs = getMessageTimestampMs(message);
  const isStackedWithPrev = Boolean(
    previousMessage &&
    previousMessage.senderId === message.senderId &&
    isSameDay(previousMessage.timestamp, message.timestamp) &&
    messageTimestampMs - getMessageTimestampMs(previousMessage) <= STACK_WINDOW_MS
  );
  const isStackedWithNext = Boolean(
    nextMessage &&
    nextMessage.senderId === message.senderId &&
    isSameDay(nextMessage.timestamp, message.timestamp) &&
    getMessageTimestampMs(nextMessage) - messageTimestampMs <= STACK_WINDOW_MS
  );
  const showPeerAvatar = !isSender && !isStackedWithNext;
  const showMeta = !isStackedWithNext;
  const canEdit = Boolean(
    isSender &&
    !isPending &&
    !isDeleted &&
    message.type === 'text' &&
    !message.imageUrl &&
    !message.audioUrl &&
    !message.offer
  );
  const canDelete = Boolean(isSender && !isPending && !isDeleted);
  const deliveryStatus: DeliveryStatus | null = (() => {
    if (!isSender) return null;
    if (!recipientId) return 'sent';
    const readAt = readReceipts[recipientId];
    if (readAt && new Date(readAt).getTime() >= messageTimestampMs) return 'seen';
    return Date.now() - messageTimestampMs > 3500 ? 'delivered' : 'sent';
  })();
  const stackShapeClass = isSender
    ? `${isStackedWithPrev ? 'rounded-tr-md' : ''} ${isStackedWithNext ? 'rounded-br-md' : ''}`
    : `${isStackedWithPrev ? 'rounded-tl-md' : ''} ${isStackedWithNext ? 'rounded-bl-md' : ''}`;

  const handleHeartToggle = () => {
    if (isPending) return;
    onToggleReaction(message, '❤️');
  };

  const handleTouchEnd = () => {
    const now = Date.now();
    if (now - lastTapAtRef.current < 280) {
      handleHeartToggle();
      lastTapAtRef.current = 0;
      return;
    }
    lastTapAtRef.current = now;
  };

  return (
    <div
      className={`messages-message-row ${isStackedWithPrev ? 'is-stacked' : ''} ${isSender ? 'justify-end' : 'justify-start'}`}
      onDoubleClick={handleHeartToggle}
      onTouchEnd={handleTouchEnd}
    >
      {!isSender ? (
        showPeerAvatar ? (
          <SafeImage
            src={activeThread.otherUser.avatar || '/icons/urbanprime.svg'}
            alt={activeThread.otherUser.name}
            className="h-7 w-7 self-end rounded-full object-cover"
          />
        ) : (
          <div className="w-7 shrink-0" aria-hidden="true" />
        )
      ) : null}
      <div className={`messages-bubble-stack ${isSender ? 'items-end' : 'items-start'} ${message.type === 'offer' ? 'w-full max-w-sm' : 'max-w-[84%] sm:max-w-xl'}`}>
        <div className={`messages-message-tools ${isSender ? 'is-own' : 'is-peer'}`}>
          {!isPending ? (
            <>
              <button type="button" className="messages-message-tool" onClick={() => onReplyToMessage(message)} aria-label="Reply to message">
                <ReplyIcon />
              </button>
              <button type="button" className="messages-message-tool" onClick={handleHeartToggle} aria-label="React with heart">
                <HeartIcon />
              </button>
            </>
          ) : null}
          {canEdit ? (
            <button type="button" className="messages-message-tool" onClick={() => onEditMessage(message)} aria-label="Edit message">
              <EditIcon />
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="messages-message-tool is-danger" onClick={() => onDeleteMessage(message)} aria-label="Delete message">
              <TrashIcon />
            </button>
          ) : null}
        </div>

        {message.type === 'offer' && message.offer && !isDeleted ? (
          <OfferCard offer={message.offer} isSender={isSender} onAccept={() => onAcceptOffer(message.offer!.id)} />
        ) : message.type === 'voice' && message.audioUrl && !isDeleted ? (
          <div className={`messages-message-card ${isSender ? 'messages-message-card--own' : 'messages-message-card--peer'} ${stackShapeClass}`}>
            {replyTarget ? (
              <div className="messages-reply-quote">
                <p className="messages-reply-quote-label">{replyLabel}</p>
                <p className="messages-reply-quote-copy">{getMessageSnippet(replyTarget, decryptedByMessageId)}</p>
              </div>
            ) : null}
            <VoiceNotePlayer audioUrl={message.audioUrl} durationMs={message.audioDurationMs} isOwn={isSender} />
          </div>
        ) : message.type === 'contract' || message.type === 'milestone' ? (
          <div className={`messages-update-card ${stackShapeClass}`}>
            {replyTarget ? (
              <div className="messages-reply-quote">
                <p className="messages-reply-quote-label">{replyLabel}</p>
                <p className="messages-reply-quote-copy">{getMessageSnippet(replyTarget, decryptedByMessageId)}</p>
              </div>
            ) : null}
            <p className="messages-update-card-label">{message.type === 'contract' ? 'Contract update' : 'Milestone update'}</p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-text-secondary">
              {typeof message.content === 'string'
                ? message.content
                : message.content?.summary || message.text || 'New workflow update shared in this conversation.'}
            </p>
          </div>
        ) : (
          <div className={`messages-message-card ${isSender ? 'messages-message-card--own' : 'messages-message-card--peer'} ${stackShapeClass} ${isDeleted ? 'is-deleted' : ''}`}>
            {replyTarget ? (
              <div className="messages-reply-quote">
                <p className="messages-reply-quote-label">{replyLabel}</p>
                <p className="messages-reply-quote-copy">{getMessageSnippet(replyTarget, decryptedByMessageId)}</p>
              </div>
            ) : null}
            {message.imageUrl && !isDeleted ? (
              <SafeImage src={message.imageUrl} fallbackSrc="" alt="attached" className="mb-2 w-full max-w-xs rounded-2xl object-cover" />
            ) : null}
            {displayText ? (
              <p className={`whitespace-pre-wrap break-words leading-relaxed ${isDeleted ? 'messages-deleted-copy' : ''}`}>{displayText}</p>
            ) : null}
            {isEncrypted && !decryptedText && !isDeleted ? (
              <p className="mt-2 text-[11px] font-semibold text-amber-500">
                {decryptedError ? 'Decryption failed. Save the correct passphrase in details.' : 'Encrypted message'}
              </p>
            ) : null}
          </div>
        )}

        {reactionEntries.length > 0 ? (
          <div className={`messages-reaction-strip ${isSender ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, userIds]) => {
              const reacted = Boolean(currentUserId && userIds.includes(currentUserId));
              return (
                <button
                  key={`${message.id}-${emoji}`}
                  type="button"
                  className={`messages-reaction-pill ${reacted ? 'is-active' : ''}`}
                  onClick={() => onToggleReaction(message, emoji)}
                >
                  <span>{emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              );
            })}
            {reactionEntries.length < QUICK_REACTIONS.length
              ? QUICK_REACTIONS
                  .filter((emoji) => !reactionEntries.some(([currentEmoji]) => currentEmoji === emoji))
                  .slice(0, 1)
                  .map((emoji) => (
                    <button
                      key={`${message.id}-${emoji}-quick`}
                      type="button"
                      className="messages-reaction-pill is-ghost"
                      onClick={() => onToggleReaction(message, emoji)}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))
              : null}
          </div>
        ) : null}

        {showMeta ? (
          <div className={`mt-1 flex items-center gap-1 text-[10px] text-text-secondary ${isSender ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
            <span>{formatMessageTimestamp(message.timestamp)}</span>
            {message.editedAt && !isDeleted ? <span className="messages-meta-label">edited</span> : null}
            {deliveryStatus ? <DeliveryTicks status={deliveryStatus} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

const MessageList: React.FC<MessageListProps> = ({
  activeThread,
  messages,
  currentUserId,
  recipientId,
  readReceipts,
  decryptedByMessageId,
  decryptErrorByMessageId,
  onAcceptOffer,
  onReplyToMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  hasOlderMessages,
  isLoadingOlderMessages,
  onLoadOlderMessages,
  scrollContainerRef,
  messagesEndRef
}) => {
  const unreadMarkerId = useMemo(() => {
    if (!currentUserId || messages.length === 0) return '';
    const ownReadAt = readReceipts[currentUserId];
    const ownReadMs = ownReadAt ? new Date(ownReadAt).getTime() : 0;
    const firstUnread = messages.find((message) => {
      if (message.senderId === currentUserId) return false;
      const messageMs = new Date(message.timestamp).getTime();
      return !ownReadMs || messageMs > ownReadMs;
    });
    return firstUnread?.id || '';
  }, [currentUserId, messages, readReceipts]);

  const groupedItems = useMemo<MessageEntry[]>(() => {
    const items: MessageEntry[] = [];
    let currentDayKey = '';

    messages.forEach((message, index) => {
      const dateValue = new Date(message.timestamp);
      const dayKey = Number.isNaN(dateValue.getTime())
        ? `unknown-${message.id}`
        : `${dateValue.getFullYear()}-${dateValue.getMonth()}-${dateValue.getDate()}`;

      if (dayKey !== currentDayKey) {
        currentDayKey = dayKey;
        items.push({ kind: 'day', id: dayKey, label: formatDayLabel(message.timestamp) });
      }

      if (unreadMarkerId && unreadMarkerId === message.id) {
        items.push({ kind: 'unread', id: `unread-${message.id}` });
      }

      items.push({ kind: 'message', id: message.id, index, message });
    });

    return items;
  }, [messages, unreadMarkerId]);

  const messageLookup = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages]
  );

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </div>
        <p className="mt-4 text-base font-black text-text-primary">Start the conversation</p>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">Send the first message to {activeThread.otherUser.name.split(' ')[0]}.</p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="messages-scroll-area flex-1 overflow-y-auto px-3 py-3 sm:px-4">
      <div>
        {hasOlderMessages || isLoadingOlderMessages ? (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={onLoadOlderMessages}
              disabled={isLoadingOlderMessages}
              className="messages-load-older-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingOlderMessages ? 'Loading earlier messages...' : 'Load earlier messages'}
            </button>
          </div>
        ) : null}

        {groupedItems.map((entry) => {
          if (entry.kind === 'day') {
            return (
              <div key={entry.id} className="mb-3 mt-3 flex justify-center">
                <span className="messages-day-pill">{entry.label}</span>
              </div>
            );
          }

          if (entry.kind === 'unread') {
            return (
              <div key={entry.id} className="messages-unread-divider">
                <span>Unread messages</span>
              </div>
            );
          }

          const { index, message } = entry;
          return (
            <MessageBubble
              key={message.id}
              activeThread={activeThread}
              message={message}
              previousMessage={messages[index - 1] || null}
              nextMessage={messages[index + 1] || null}
              currentUserId={currentUserId}
              recipientId={recipientId}
              readReceipts={readReceipts}
              decryptedByMessageId={decryptedByMessageId}
              decryptErrorByMessageId={decryptErrorByMessageId}
              messageLookup={messageLookup}
              onAcceptOffer={onAcceptOffer}
              onReplyToMessage={onReplyToMessage}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onToggleReaction={onToggleReaction}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
