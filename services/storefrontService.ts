
import { collection, query, where, getDocs, addDoc, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Store, User } from '../types';
import { db } from '../firebase';
import { generateStorefront } from './geminiService';
import supabaseMirror from './supabaseMirror';
import { isBackendConfigured } from './backendClient';

const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    // Bypassing Store-specific id mismatch
    return { id: docSnap.id, ...data } as unknown as T;
};

export const storefrontService = {
  async saveStorefront(userId: string, storefrontData: Store): Promise<Store> {
    if (isBackendConfigured()) {
        const existing = await supabaseMirror.list<Store>('storefronts', { filters: { ownerId: userId }, limit: 1 });
        const storeId = existing[0]?.id || storefrontData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `store-${Date.now()}`);
        await supabaseMirror.upsert('storefronts', storeId, { ...storefrontData, id: storeId, ownerId: userId });
        return { ...storefrontData, id: storeId, ownerId: userId };
    }

    if (supabaseMirror.enabled) {
        const existing = await supabaseMirror.list<Store>('storefronts', { filters: { ownerId: userId }, limit: 1 });
        if (existing[0]) {
            await setDoc(doc(db, "storefronts", existing[0].id), storefrontData);
            await supabaseMirror.upsert('storefronts', existing[0].id, { ...storefrontData, id: existing[0].id });
            return { ...storefrontData, id: existing[0].id };
        }
    }
    const q = query(collection(db, "storefronts"), where("ownerId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const storeDoc = querySnapshot.docs[0];
        await setDoc(doc(db, "storefronts", storeDoc.id), storefrontData);
        await supabaseMirror.upsert('storefronts', storeDoc.id, { ...storefrontData, id: storeDoc.id });
        return { ...storefrontData, id: storeDoc.id };
    } else {
        const docRef = await addDoc(collection(db, "storefronts"), storefrontData);
        await supabaseMirror.upsert('storefronts', docRef.id, { ...storefrontData, id: docRef.id });
        return { ...storefrontData, id: docRef.id };
    }
  },

  async createDefaultStore(userId: string, userName: string): Promise<Store> {
      const defaultQuestionnaire = [
          { question: "What is the name of your store?", answer: `${userName}'s Store` },
          { question: "In one sentence, what is the tagline for your store?", answer: `Discover amazing items from ${userName}` },
          { question: "Describe the visual style or vibe you want for your store.", answer: 'Modern & Clean' }
      ];
      
      const aiResult = await generateStorefront({ questionnaireAnswers: defaultQuestionnaire, logoUrl: '' }, [], []);
      
      const newStoreData: Omit<Store, 'id'> = {
          ownerId: userId,
          slug: aiResult.slug,
          name: `${userName}'s Store`,
          tagline: `Discover amazing items from ${userName}`,
          logo: '',
          category: 'electronics',
          city: '',
          products: [],
          pixes: [],
          reviews: [],
          followers: [],
          badges: ['just-launched'],
          brandingKit: aiResult.brandingKit,
          layout: aiResult.layout,
          banner: aiResult.banner,
          pages: aiResult.pages,
          sections: [], // Fixed missing sections property to resolve TypeScript error
          questionnaireAnswers: aiResult.questionnaireAnswers,
          createdAt: new Date().toISOString(),
      };

      if (isBackendConfigured()) {
          const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `store-${Date.now()}`;
          const created = { ...newStoreData, id } as Store;
          await supabaseMirror.upsert('storefronts', id, created);
          return created;
      }

      const docRef = await addDoc(collection(db, "storefronts"), newStoreData);
      const created = { ...newStoreData, id: docRef.id };
      await supabaseMirror.upsert('storefronts', docRef.id, created);
      return created;
  },

  async getStorefrontByUserId(userId: string): Promise<Store | null> {
    if (supabaseMirror.enabled) {
        try {
          // Try to get from mirror, but don't filter on ownerId (column doesn't exist in mirror table)
          // The mirror stores all data so filtering must be done client-side or via different approach
          const mirrored = await supabaseMirror.list<Store>('storefronts', { limit: 100 });
          const userStore = mirrored.find(s => s.ownerId === userId);
          if (userStore) return userStore;
        } catch (error) {
          console.warn('Failed to get storefront from mirror:', error);
          // Fall through to Firebase
        }
    }
    if (isBackendConfigured()) return null;
    const q = query(collection(db, "storefronts"), where("ownerId", "==", userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const store = fromFirestore<Store>(snapshot.docs[0]);
    if (supabaseMirror.enabled) {
        await supabaseMirror.upsert('storefronts', store.id, store);
    }
    return store;
  },
  
  async getStorefrontById(storeId: string): Promise<Store | null> {
    if (supabaseMirror.enabled) {
        const mirrored = await supabaseMirror.get<Store>('storefronts', storeId);
        if (mirrored) return { id: storeId, ...mirrored } as Store;
    }
    if (isBackendConfigured()) return null;
    const docRef = doc(db, "storefronts", storeId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const store = fromFirestore<Store>(docSnap);
    if (supabaseMirror.enabled) {
        await supabaseMirror.upsert('storefronts', storeId, store);
    }
    return store;
  },

  async getAllStorefronts(): Promise<(Store & { owner: User })[]> {
    let stores = supabaseMirror.enabled
        ? await supabaseMirror.list<Store>('storefronts', { limit: 500 })
        : [];
    if (stores.length === 0 && !isBackendConfigured()) {
        stores = (await getDocs(collection(db, "storefronts"))).docs.map(doc => fromFirestore<Store>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(stores.map(store => supabaseMirror.upsert('storefronts', store.id, store)));
        }
    }
    
    const enrichedStores = await Promise.all(stores.map(async store => {
        let owner = await supabaseMirror.get<User>('users', store.ownerId);
        if (!owner && !isBackendConfigured()) {
            const ownerSnap = await getDoc(doc(db, "users", store.ownerId));
            owner = ownerSnap.exists() ? fromFirestore<User>(ownerSnap) : null;
        }
        return { ...store, owner: owner! };
    }));
    
    return enrichedStores.filter(s => s.owner);
  },

  async getStorefrontBySlug(slug: string): Promise<Store | null> {
    if (supabaseMirror.enabled) {
        const mirrored = await supabaseMirror.list<Store>('storefronts', { filters: { slug }, limit: 1 });
        if (mirrored[0]) return mirrored[0];
    }
    if (isBackendConfigured()) return null;
    const q = query(collection(db, "storefronts"), where("slug", "==", slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const store = fromFirestore<Store>(snapshot.docs[0]);
    if (supabaseMirror.enabled) {
        await supabaseMirror.upsert('storefronts', store.id, store);
    }
    return store;
  },

  async checkStoreSlugAvailability(slug: string): Promise<boolean> {
      if (supabaseMirror.enabled) {
        const mirrored = await supabaseMirror.list<Store>('storefronts', { filters: { slug }, limit: 1 });
        if (mirrored.length > 0) return false;
      }
      if (isBackendConfigured()) return true;
      const q = query(collection(db, "storefronts"), where("slug", "==", slug));
      const snapshot = await getDocs(q);
      return snapshot.empty;
  },

  async updateStoreBranding(storeId: string, data: Partial<Store>): Promise<void> {
      if (isBackendConfigured()) {
        await supabaseMirror.mergeUpdate<Store>('storefronts', storeId, data);
        return;
      }
      const storeRef = doc(db, "storefronts", storeId);
      await updateDoc(storeRef, data);
      await supabaseMirror.mergeUpdate<Store>('storefronts', storeId, data);
  }
};
