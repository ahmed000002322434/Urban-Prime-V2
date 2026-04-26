import { db as mockDb } from '../data/database';
import type { Booking, ChatMessage, ChatThread, Item, Notification, Review, Store, User } from '../types';

type LocalDbStore =
  | 'meta'
  | 'users'
  | 'items'
  | 'bookings'
  | 'orders'
  | 'messages'
  | 'reviews'
  | 'notifications'
  | 'stores'
  | 'chatThreads'
  | 'chatMessages'
  | 'storeLayouts'
  | 'affiliatePrograms'
  | 'affiliateUsers'
  | 'affiliateLinks'
  | 'affiliateCoupons'
  | 'affiliateCommissions'
  | 'affiliateClicks'
  | 'affiliateSubmissions'
  | 'storeAnalytics'
  | 'payouts';

type LocalDbRecord = Record<string, any> & { id?: string };

const DB_NAME = 'urbanprime_local_db_v1';
const DB_VERSION = 2;
const SEED_FLAG_KEY = 'seeded_v1';

const STORES: LocalDbStore[] = [
  'meta',
  'users',
  'items',
  'bookings',
  'orders',
  'messages',
  'reviews',
  'notifications',
  'stores',
  'chatThreads',
  'chatMessages',
  'storeLayouts',
  'affiliatePrograms',
  'affiliateUsers',
  'affiliateLinks',
  'affiliateCoupons',
  'affiliateCommissions',
  'affiliateClicks',
  'affiliateSubmissions',
  'storeAnalytics',
  'payouts'
];

const isIndexedDbAvailable = () => typeof indexedDB !== 'undefined';

const memoryStore = new Map<LocalDbStore, Map<string, LocalDbRecord>>();

const ensureMemoryStore = (store: LocalDbStore) => {
  if (!memoryStore.has(store)) {
    memoryStore.set(store, new Map());
  }
  return memoryStore.get(store)!;
};

const openDb = (): Promise<IDBDatabase | null> => {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed.'));
  });
};

const runStore = async <T>(
  store: LocalDbStore,
  mode: IDBTransactionMode,
  exec: (objectStore: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  if (!db) {
    const memory = ensureMemoryStore(store);
    const placeholder = exec({
      get: (key: IDBValidKey) => ({ result: memory.get(String(key)) } as any),
      getAll: () => ({ result: Array.from(memory.values()) } as any),
      put: (value: any) => {
        const id = String(value?.id || '');
        if (id) memory.set(id, value);
        return { result: id } as any;
      },
      delete: (key: IDBValidKey) => {
        memory.delete(String(key));
        return { result: undefined } as any;
      }
    } as any);
    return placeholder.result as T;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const objectStore = tx.objectStore(store);
    const request = exec(objectStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
};

const getMetaFlag = async (key: string) => {
  const record = await runStore<LocalDbRecord | undefined>('meta', 'readonly', (store) => store.get(key));
  return record?.value === true;
};

const setMetaFlag = async (key: string, value: boolean) => {
  await runStore('meta', 'readwrite', (store) => store.put({ id: key, value }));
};

const ensureSeeded = async () => {
  const seeded = await getMetaFlag(SEED_FLAG_KEY);
  if (seeded) return;

  mockDb.init();
  const users = (mockDb.get<User[]>('users') || []).map((user) => ({ ...user, id: user.id || `user-${Date.now()}` }));
  const items = (mockDb.get<Item[]>('items') || []).map((item) => ({ ...item, id: item.id || `item-${Date.now()}` }));
  const bookings = mockDb.get<Booking[]>('bookings') || [];
  const notifications = mockDb.get<Notification[]>('notifications') || [];
  const stores = (mockDb.get<Store[]>('storefronts') || []).map((store) => ({ ...store, id: store.storeId || store.id }));
  const threads = mockDb.get<ChatThread[]>('chatThreads') || [];
  const messages = mockDb.get<ChatMessage[]>('chatMessages') || [];
  const reviews = (items.flatMap((item) => item.reviews || []) as Review[]).map((review) => ({
    ...review,
    id: review.id || `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }));

  await Promise.all([
    ...users.map((user) => runStore('users', 'readwrite', (store) => store.put(user))),
    ...items.map((item) => runStore('items', 'readwrite', (store) => store.put(item))),
    ...bookings.map((booking) => runStore('bookings', 'readwrite', (store) => store.put({ ...booking, id: booking.id || `booking-${Date.now()}` }))),
    ...notifications.map((notification) => runStore('notifications', 'readwrite', (store) => store.put({
      ...notification,
      id: notification.id || `notification-${Date.now()}`
    }))),
    ...stores.map((storeRecord) =>
      runStore('stores', 'readwrite', (objectStore) => objectStore.put(storeRecord))
    ),
    ...threads.map((thread) => runStore('chatThreads', 'readwrite', (store) => store.put({ ...thread, id: thread.id || `thread-${Date.now()}` }))),
    ...messages.map((message) => runStore('chatMessages', 'readwrite', (store) => store.put({ ...message, id: message.id || `message-${Date.now()}` }))),
    ...reviews.map((review) => runStore('reviews', 'readwrite', (store) => store.put(review)))
  ]);

  await setMetaFlag(SEED_FLAG_KEY, true);
};

const list = async <T extends LocalDbRecord>(store: LocalDbStore): Promise<T[]> => {
  const rows = await runStore<T[]>('meta' === store ? 'meta' : store, 'readonly', (objectStore) => objectStore.getAll());
  return Array.isArray(rows) ? rows : [];
};

const getById = async <T extends LocalDbRecord>(store: LocalDbStore, id: string): Promise<T | null> => {
  if (!id) return null;
  const row = await runStore<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(id));
  return row || null;
};

const upsert = async <T extends LocalDbRecord>(store: LocalDbStore, record: T): Promise<T> => {
  const id = record.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const value = { ...record, id } as T;
  await runStore(store, 'readwrite', (objectStore) => objectStore.put(value));
  return value;
};

const remove = async (store: LocalDbStore, id: string): Promise<void> => {
  if (!id) return;
  await runStore(store, 'readwrite', (objectStore) => objectStore.delete(id));
};

const bulkUpsert = async <T extends LocalDbRecord>(store: LocalDbStore, records: T[]): Promise<T[]> => {
  const results: T[] = [];
  for (const record of records) {
    results.push(await upsert(store, record));
  }
  return results;
};

const findByField = async <T extends LocalDbRecord>(
  store: LocalDbStore,
  field: string,
  value: string
): Promise<T[]> => {
  const rows = await list<T>(store);
  return rows.filter((row) => String((row as any)?.[field] || '') === value);
};

export const localDb = {
  init: async () => {
    await ensureSeeded();
  },
  list,
  getById,
  upsert,
  remove,
  bulkUpsert,
  findByField
};

export type { LocalDbStore };
