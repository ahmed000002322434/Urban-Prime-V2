
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, setDoc, deleteDoc, increment, query, where } from 'firebase/firestore';
import type { SupportQuery, User, Notification, SiteSettings, AIFeature, Item, Booking, PayoutRequest } from '../types';
import { db } from '../firebase';
import { itemService, userService } from './itemService';
import supabaseMirror from './supabaseMirror';

const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as T;
};

const sanitizeHTML = (str: string): string => {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

export const adminService = {
  async getSupportQueries(): Promise<SupportQuery[]> {
    if (supabaseMirror.enabled) {
      const mirrored = await supabaseMirror.list<SupportQuery>('supportQueries', { limit: 500 });
      if (mirrored.length > 0) return mirrored;
    }
    const snapshot = await getDocs(collection(db, 'supportQueries'));
    const queries = snapshot.docs.map(doc => fromFirestore<SupportQuery>(doc));
    if (supabaseMirror.enabled) {
      await Promise.all(queries.map(q => supabaseMirror.upsert('supportQueries', q.id, q)));
    }
    return queries;
  },

  async createSupportQuery(name: string, email: string, subject: string, message: string, user: User | null): Promise<SupportQuery> {
    const newQueryData = {
      userId: user?.id || 'guest',
      userName: sanitizeHTML(user?.name || name),
      userAvatar: user?.avatar || 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
      userEmail: sanitizeHTML(user?.email || email),
      subject: sanitizeHTML(subject),
      message: sanitizeHTML(message),
      createdAt: new Date().toISOString(),
      status: 'open',
    };
    const docRef = await addDoc(collection(db, 'supportQueries'), newQueryData);
    await supabaseMirror.upsert('supportQueries', docRef.id, { id: docRef.id, ...newQueryData });
    return { id: docRef.id, ...newQueryData } as SupportQuery;
  },

  async replyToQuery(queryId: string, replyText: string): Promise<SupportQuery> {
    const queryRef = doc(db, 'supportQueries', queryId);
    const updates = {
        reply: sanitizeHTML(replyText),
        repliedAt: new Date().toISOString(),
        status: 'closed',
    };
    await updateDoc(queryRef, updates);
    await supabaseMirror.mergeUpdate<SupportQuery>('supportQueries', queryId, updates as Partial<SupportQuery>);

    const updatedQuerySnap = await getDoc(queryRef);
    const query = fromFirestore<SupportQuery>(updatedQuerySnap);

    if (query.userId !== 'guest') {
      const newNotification: Omit<Notification, 'id'> = {
        userId: query.userId,
        message: `An admin has replied to your support query regarding "${query.subject}".`,
        link: `/profile/messages`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      const notifRef = await addDoc(collection(db, 'notifications'), newNotification);
      await supabaseMirror.upsert('notifications', notifRef.id, { id: notifRef.id, ...newNotification });
    }
    return query;
  },

  async getSiteSettings(): Promise<SiteSettings> {
    if (supabaseMirror.enabled) {
      const mirrored = await supabaseMirror.get<SiteSettings>('siteSettings', 'site');
      if (mirrored) return mirrored;
    }
    const docRef = doc(db, 'settings', 'site');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data() as SiteSettings;
    const mirrored = await supabaseMirror.get<SiteSettings>('siteSettings', 'site');
    return mirrored || { siteBanner: { message: '', isActive: false } };
  },

  async updateSiteSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    const settingsRef = doc(db, 'settings', 'site');
    const sanitizedUpdates = {
        ...updates,
        siteBanner: {
            ...updates.siteBanner,
            message: sanitizeHTML(updates.siteBanner?.message || '')
        }
    };
    await setDoc(settingsRef, sanitizedUpdates, { merge: true });
    await supabaseMirror.upsert('siteSettings', 'site', sanitizedUpdates as SiteSettings);
    const docSnap = await getDoc(settingsRef);
    return docSnap.data() as SiteSettings;
  },

  // This remains a simulation as per its original implementation
  async generateFeatureWithAI(prompt: string): Promise<{ success: boolean; message: string; pseudoCode: string; }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const pseudoCode = `// AI-generated feature for: "${sanitizeHTML(prompt)}"`;
        resolve({
          success: true,
          message: 'Generated new component and added route (simulated).',
          pseudoCode: pseudoCode,
        });
      }, 1500);
    });
  },

  async getSiteStats() {
    if (supabaseMirror.enabled) {
        const [users, items, bookings, payouts] = await Promise.all([
            supabaseMirror.list<User>('users', { limit: 2000 }),
            supabaseMirror.list<Item>('items', { limit: 2000 }),
            supabaseMirror.list<Booking>('bookings', { limit: 2000 }),
            supabaseMirror.list<PayoutRequest>('payout_requests', { limit: 2000 })
        ]);
        const totalRevenue = bookings
          .filter(b => b.type === 'sale' && b.status === 'completed')
          .reduce((sum, b) => sum + b.totalPrice, 0);
        const totalPendingPayouts = payouts
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0);
        return {
            users: users.length,
            items: items.length,
            bookings: bookings.length,
            totalRevenue,
            totalPendingPayouts,
            unverifiedItems: items.filter(i => !i.isVerified).length,
            unverifiedUsers: users.filter(u => u.verificationLevel !== 'level2').length,
        };
    }
    const [usersSnap, itemsSnap, bookingsSnap, payoutSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'items')),
        getDocs(collection(db, 'bookings')),
        getDocs(query(collection(db, 'payout_requests'), where('status', '==', 'pending')))
    ]);
    
    const bookings = bookingsSnap.docs.map(doc => fromFirestore<Booking>(doc));
    const totalRevenue = bookings
      .filter(b => b.type === 'sale' && b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);
      
    const totalPendingPayouts = payoutSnap.docs.map(doc => fromFirestore<PayoutRequest>(doc))
      .reduce((sum, p) => sum + p.amount, 0);

    return {
        users: usersSnap.size,
        items: itemsSnap.size,
        bookings: bookingsSnap.size,
        totalRevenue,
        totalPendingPayouts,
        unverifiedItems: itemsSnap.docs.filter(d => !d.data().isVerified).length,
        unverifiedUsers: usersSnap.docs.filter(d => d.data().verificationLevel !== 'level2').length,
    };
  },
  
  // --- Payout Management ---
  
  async getPayoutRequests(): Promise<(PayoutRequest & { userName: string })[]> {
      let requests = supabaseMirror.enabled
          ? await supabaseMirror.list<PayoutRequest>('payout_requests', { limit: 500 })
          : [];
      if (requests.length === 0) {
        requests = (await getDocs(collection(db, 'payout_requests'))).docs.map(doc => fromFirestore<PayoutRequest>(doc));
        if (supabaseMirror.enabled) {
          await Promise.all(requests.map(req => supabaseMirror.upsert('payout_requests', req.id, req)));
        }
      }
      
      // Enrich with user names
      const enrichedRequests = await Promise.all(requests.map(async (req) => {
          const user = await userService.getUserById(req.userId);
          return { ...req, userName: user?.name || 'Unknown User' };
      }));
      
      return enrichedRequests.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  
  async updatePayoutStatus(requestId: string, status: 'completed' | 'rejected', adminNote?: string): Promise<void> {
      const payoutRef = doc(db, 'payout_requests', requestId);
      const payoutSnap = await getDoc(payoutRef);
      if (!payoutSnap.exists()) throw new Error("Payout request not found");
      
      const payoutData = payoutSnap.data() as PayoutRequest;
      const userRef = doc(db, 'users', payoutData.userId);
      
      // Update the payout status
      await updateDoc(payoutRef, { status });
      
      if (status === 'rejected') {
          // Refund logic: Remove from processing, add back to available wallet
          await updateDoc(userRef, {
              processingBalance: increment(-payoutData.amount),
              walletBalance: increment(payoutData.amount)
          });
          
          // Log the refund transaction
          const txRef = await addDoc(collection(db, 'walletTransactions'), {
              userId: payoutData.userId,
              amount: payoutData.amount,
              type: 'credit',
              description: `Refund: Payout Rejected. ${adminNote || ''}`,
              date: new Date().toISOString(),
              status: 'completed'
          });
          await supabaseMirror.upsert('walletTransactions', txRef.id, {
              id: txRef.id,
              userId: payoutData.userId,
              amount: payoutData.amount,
              type: 'credit',
              description: `Refund: Payout Rejected. ${adminNote || ''}`,
              date: new Date().toISOString(),
              status: 'completed'
          });
      } else if (status === 'completed') {
          // Completion logic: Just remove from processing (money effectively leaves system)
          await updateDoc(userRef, {
              processingBalance: increment(-payoutData.amount)
          });
          
           // Log transaction status update if you track the original debit ID, 
           // otherwise, the original 'debit' remains 'pending' or can be updated here if tracked.
      }
      
      // Notify user
      const notification: Omit<Notification, 'id'> = {
          userId: payoutData.userId,
          message: `Your payout request for $${payoutData.amount} was ${status}.${adminNote ? ` Note: ${adminNote}` : ''}`,
          link: '/profile/wallet',
          isRead: false,
          createdAt: new Date().toISOString()
      };
      const notifRef = await addDoc(collection(db, 'notifications'), notification);
      await supabaseMirror.upsert('notifications', notifRef.id, { id: notifRef.id, ...notification });
      await supabaseMirror.mergeUpdate<PayoutRequest>('payout_requests', requestId, { status } as Partial<PayoutRequest>);
      const userMirror = await supabaseMirror.get<User>('users', payoutData.userId);
      if (userMirror) {
        if (status === 'rejected') {
          const processing = (userMirror as any).processingBalance || 0;
          const wallet = (userMirror as any).walletBalance || 0;
          await supabaseMirror.upsert('users', payoutData.userId, {
            ...userMirror,
            processingBalance: processing - payoutData.amount,
            walletBalance: wallet + payoutData.amount
          });
        } else if (status === 'completed') {
          const processing = (userMirror as any).processingBalance || 0;
          await supabaseMirror.upsert('users', payoutData.userId, {
            ...userMirror,
            processingBalance: processing - payoutData.amount
          });
        }
      }
  },

  getAllUsers: () => userService.getAllSellers(),
  getAllItems: () => itemService.getItems({}, { page: 1, limit: 1000 }).then(res => res.items),
  async getAllBookings(): Promise<Booking[]> {
    if (supabaseMirror.enabled) {
      const mirrored = await supabaseMirror.list<Booking>('bookings', { limit: 2000 });
      if (mirrored.length > 0) return mirrored;
    }
    const snapshot = await getDocs(collection(db, 'bookings'));
    const bookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
    if (supabaseMirror.enabled) {
      await Promise.all(bookings.map(b => supabaseMirror.upsert('bookings', b.id, b)));
    }
    return bookings;
  },
  updateUser: (userId: string, updates: Partial<User>) => userService.updateUserProfile(userId, updates),
  updateItem: (itemId: string, updates: Partial<Item>) => itemService.updateItem(itemId, updates),
  deleteUser: async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
    await supabaseMirror.remove('users', userId);
  },
  deleteItem: async (itemId: string) => {
    await deleteDoc(doc(db, 'items', itemId));
    await supabaseMirror.remove('items', itemId);
  }
};
