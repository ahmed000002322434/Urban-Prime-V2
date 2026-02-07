
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { SupplierProduct } from '../types';
import { db } from '../firebase';
import supabaseMirror from './supabaseMirror';

const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as T;
};

export const supplierService = {
  async getProducts(): Promise<SupplierProduct[]> {
    if (supabaseMirror.enabled) {
      const mirrored = await supabaseMirror.list<SupplierProduct>('supplierProducts', { limit: 500 });
      if (mirrored.length > 0) return mirrored;
    }
    const snapshot = await getDocs(collection(db, 'supplierProducts'));
    const products = snapshot.docs.map(doc => fromFirestore<SupplierProduct>(doc));
    if (supabaseMirror.enabled) {
      await Promise.all(products.map(p => supabaseMirror.upsert('supplierProducts', p.id, p)));
    }
    return products;
  },
  async getProductById(id: string): Promise<SupplierProduct | undefined> {
    if (supabaseMirror.enabled) {
      const mirrored = await supabaseMirror.get<SupplierProduct>('supplierProducts', id);
      if (mirrored) return { id, ...mirrored } as SupplierProduct;
    }
    const docRef = doc(db, 'supplierProducts', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? fromFirestore<SupplierProduct>(docSnap) : undefined;
  }
};
