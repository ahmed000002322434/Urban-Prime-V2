import type { ChatMessage, ChatPresenceState, ChatThread, Item, User } from '../../types';

export type InboxBucket = 'primary' | 'general' | 'requests';
export type ThreadFilter = 'all' | 'unread' | 'online';
export type DeliveryStatus = 'sent' | 'delivered' | 'seen';

export interface ThreadWithDetails extends ChatThread {
  otherUser: User;
  item: Item;
}

export interface ThreadViewModel {
  thread: ThreadWithDetails;
  bucket: InboxBucket;
  previewType: 'text' | 'image' | 'voice' | 'offer' | 'contract' | 'milestone';
  previewText: string;
  previewTime: string;
  hasUnread: boolean;
  contextLabel: string;
  presence: ChatPresenceState | null;
  latestMessage: ChatMessage | null;
  isUserHydrating?: boolean;
}
