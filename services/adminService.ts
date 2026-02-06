
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, setDoc, deleteDoc, increment, query, where } from 'firebase/firestore';
import type { SupportQuery, User, Notification, SiteSettings, AIFeature, Item, Booking, PayoutRequest } from '../types';
import { db } from '../firebase';
import { itemService, userService } from './itemService';

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
    const snapshot = await getDocs(collection(db, 'supportQueries'));
    return snapshot.docs.map(doc => fromFirestore<SupportQuery>(doc));
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
      await addDoc(collection(db, 'notifications'), newNotification);
    }
    return query;
  },

  async getSiteSettings(): Promise<SiteSettings> {
    const docRef = doc(db, 'settings', 'site');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as SiteSettings : { siteBanner: { message: '', isActive: false } };
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
      const snapshot = await getDocs(collection(db, 'payout_requests'));
      const requests = snapshot.docs.map(doc => fromFirestore<PayoutRequest>(doc));
      
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
          await addDoc(collection(db, 'walletTransactions'), {
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
      await addDoc(collection(db, 'notifications'), notification);
  },

  getAllUsers: () => userService.getAllSellers(),
  getAllItems: () => itemService.getItems({}, { page: 1, limit: 1000 }).then(res => res.items),
  async getAllBookings(): Promise<Booking[]> {
    const snapshot = await getDocs(collection(db, 'bookings'));
    return snapshot.docs.map(doc => fromFirestore<Booking>(doc));
  },
  updateUser: (userId: string, updates: Partial<User>) => userService.updateUserProfile(userId, updates),
  updateItem: (itemId: string, updates: Partial<Item>) => itemService.updateItem(itemId, updates),
  deleteUser: async (userId: string) => { await deleteDoc(doc(db, 'users', userId)); },
  deleteItem: async (itemId: string) => { await deleteDoc(doc(db, 'items', itemId)); }
};
