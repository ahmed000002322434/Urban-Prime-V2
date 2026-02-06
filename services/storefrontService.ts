
import { collection, query, where, getDocs, addDoc, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Store, User } from '../types';
import { db } from '../firebase';
import { generateStorefront } from './geminiService';

const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    // Bypassing Store-specific id mismatch
    return { id: docSnap.id, ...data } as unknown as T;
};

export const storefrontService = {
  async saveStorefront(userId: string, storefrontData: Store): Promise<Store> {
    const q = query(collection(db, "storefronts"), where("ownerId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const storeDoc = querySnapshot.docs[0];
        await setDoc(doc(db, "storefronts", storeDoc.id), storefrontData);
        return { ...storefrontData, id: storeDoc.id };
    } else {
        const docRef = await addDoc(collection(db, "storefronts"), storefrontData);
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
      const docRef = await addDoc(collection(db, "storefronts"), newStoreData);
      return { ...newStoreData, id: docRef.id };
  },

  async getStorefrontByUserId(userId: string): Promise<Store | null> {
    const q = query(collection(db, "storefronts"), where("ownerId", "==", userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return fromFirestore<Store>(snapshot.docs[0]);
  },
  
  async getStorefrontById(storeId: string): Promise<Store | null> {
    const docRef = doc(db, "storefronts", storeId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? fromFirestore<Store>(docSnap) : null;
  },

  async getAllStorefronts(): Promise<(Store & { owner: User })[]> {
    const storesSnapshot = await getDocs(collection(db, "storefronts"));
    const stores = storesSnapshot.docs.map(doc => fromFirestore<Store>(doc));
    
    // In a real app, you might want to fetch owner data more efficiently
    const enrichedStores = await Promise.all(stores.map(async store => {
        const userDocRef = doc(db, "users", store.ownerId);
        const ownerSnap = await getDoc(userDocRef);
        const owner = ownerSnap.exists() ? fromFirestore<User>(ownerSnap) : null;
        return { ...store, owner: owner! };
    }));
    
    return enrichedStores.filter(s => s.owner);
  },

  async getStorefrontBySlug(slug: string): Promise<Store | null> {
    const q = query(collection(db, "storefronts"), where("slug", "==", slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return fromFirestore<Store>(snapshot.docs[0]);
  },

  async checkStoreSlugAvailability(slug: string): Promise<boolean> {
      const q = query(collection(db, "storefronts"), where("slug", "==", slug));
      const snapshot = await getDocs(q);
      return snapshot.empty;
  },

  async updateStoreBranding(storeId: string, data: Partial<Store>): Promise<void> {
      const storeRef = doc(db, "storefronts", storeId);
      await updateDoc(storeRef, data);
  }
};
