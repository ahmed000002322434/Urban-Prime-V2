
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { SupplierProduct } from '../types';
import { db } from '../firebase';

const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as T;
};

export const supplierService = {
  async getProducts(): Promise<SupplierProduct[]> {
    const snapshot = await getDocs(collection(db, 'supplierProducts'));
    return snapshot.docs.map(doc => fromFirestore<SupplierProduct>(doc));
  },
  async getProductById(id: string): Promise<SupplierProduct | undefined> {
    const docRef = doc(db, 'supplierProducts', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? fromFirestore<SupplierProduct>(docSnap) : undefined;
  }
};
