import { supabase } from '../utils/supabase';

type RefreshSource = 'realtime' | 'poll';
type RefreshHandler = (source: RefreshSource, table: string) => void;

type ChangeListener = {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  filter?: string;
};

type RealtimeOptions = {
  fallbackMs?: number;
};

const isUsableRealtimeClient = () => {
  try {
    return typeof window !== 'undefined' && Boolean((supabase as any)?.channel);
  } catch {
    return false;
  }
};

const createRealtimeSubscription = (
  channelName: string,
  listeners: ChangeListener[],
  onRefresh: RefreshHandler,
  options: RealtimeOptions = {}
) => {
  const fallbackMs = Math.max(4000, Number(options.fallbackMs || 30000));
  let fallbackTimer: number | null = null;

  const stopFallback = () => {
    if (fallbackTimer) {
      window.clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  };

  const startFallback = (table: string) => {
    if (typeof window === 'undefined' || fallbackTimer) return;
    fallbackTimer = window.setInterval(() => {
      onRefresh('poll', table);
    }, fallbackMs);
  };

  if (!isUsableRealtimeClient()) {
    startFallback(listeners[0]?.table || 'unknown');
    return () => {
      stopFallback();
    };
  }

  const channel = listeners.reduce((activeChannel, listener) => (
    activeChannel.on(
      'postgres_changes',
      {
        event: listener.event || '*',
        schema: 'public',
        table: listener.table,
        ...(listener.filter ? { filter: listener.filter } : {})
      },
      () => {
        stopFallback();
        onRefresh('realtime', listener.table);
      }
    )
  ), supabase.channel(channelName));

  startFallback(listeners[0]?.table || 'unknown');

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      stopFallback();
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      startFallback(listeners[0]?.table || 'unknown');
    }
  });

  return () => {
    stopFallback();
    void supabase.removeChannel(channel);
  };
};

export const spotlightRealtime = {
  subscribeFeed(onRefresh: RefreshHandler, options?: RealtimeOptions) {
    return createRealtimeSubscription(
      'spotlight-feed',
      [
        { table: 'spotlight_content' },
        { table: 'spotlight_metrics' },
        { table: 'spotlight_comments' }
      ],
      onRefresh,
      options
    );
  },

  subscribeNotifications(userId: string, onRefresh: RefreshHandler, options?: RealtimeOptions) {
    if (!userId) return () => undefined;
    return createRealtimeSubscription(
      `spotlight-notifications-${userId}`,
      [
        {
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }
      ],
      onRefresh,
      options
    );
  },

  subscribeThreads(userId: string, threadId: string | null, onRefresh: RefreshHandler, options?: RealtimeOptions) {
    if (!userId) return () => undefined;
    const listeners: ChangeListener[] = [
      {
        table: 'chat_threads',
        filter: `buyer_id=eq.${userId}`
      },
      {
        table: 'chat_threads',
        filter: `seller_id=eq.${userId}`
      }
    ];
    if (threadId) {
      listeners.push({
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`
      });
    }
    return createRealtimeSubscription(`spotlight-threads-${userId}-${threadId || 'all'}`, listeners, onRefresh, options);
  }
};
