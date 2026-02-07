
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    setDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    signInWithPopup, 
    signInWithRedirect,
    sendPasswordResetEmail,
    updatePassword,
    GoogleAuthProvider,
    User as FirebaseUser,
    confirmPasswordReset
} from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import supabaseMirror from './supabaseMirror';
import { storefrontService } from './storefrontService';
import type { 
    Item, 
    User, 
    Category, 
    Review, 
    WishlistItem, 
    Badge, 
    ItemCollection, 
    DiscountCode, 
    Booking, 
    RentalHistoryItem, 
    Offer, 
    Affiliate, 
    AffiliateEarning, 
    AffiliateLink, 
    AffiliateCoupon, 
    CreativeAsset, 
    AffiliateProfile, 
    GameUpload, 
    Reel, 
    Post, 
    Service, 
    ServiceProviderProfile, 
    Job, 
    LiveStream,
    WalletTransaction,
    PayoutMethod,
    SupplierProduct,
    SupplierInfo,
    DropshipOrder,
    ShippingEstimate,
    AffiliateProgramSettings,
    AffiliateAttribution,
    AffiliateConversion,
    AffiliatePayout,
    Event,
    ProjectShowcase,
    SellerPerformanceStats,
    GrowthInsight,
    CartItem,
    Notification
} from '../types';
import { CATEGORIES, HIERARCHICAL_CATEGORIES } from '../constants';

const isIgnorableFirebaseError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false;
    const maybeError = error as { code?: string; message?: string };
    const message = (maybeError.message || String(error)).toLowerCase();
    const code = (maybeError.code || '').toLowerCase();
    return (
        message.includes('client is offline') ||
        code === 'unavailable' ||
        code === 'failed-precondition'
    );
};

const ITEM_CACHE_KEY = 'urbanprime_items_cache_v1';

const readItemCache = (): Item[] => {
    try {
        const raw = localStorage.getItem(ITEM_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to read item cache:', error);
        return [];
    }
};

const writeItemCache = (items: Item[]) => {
    try {
        localStorage.setItem(ITEM_CACHE_KEY, JSON.stringify(items));
    } catch (error) {
        console.warn('Failed to write item cache:', error);
    }
};

const upsertItemCache = (item: Item) => {
    const current = readItemCache();
    const idx = current.findIndex(existing => existing.id === item.id);
    if (idx >= 0) {
        current[idx] = item;
    } else {
        current.unshift(item);
    }
    writeItemCache(current.slice(0, 200));
};

const removeItemCache = (itemId: string) => {
    const current = readItemCache();
    writeItemCache(current.filter(item => item.id !== itemId));
};

const withTimeout = async <T>(promise: Promise<T>, ms: number, message: string) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

const removeUndefinedDeep = (value: any): any => {
    if (Array.isArray(value)) {
        return value.filter(v => v !== undefined).map(removeUndefinedDeep);
    }
    if (value && typeof value === 'object') {
        const cleaned: Record<string, any> = {};
        Object.entries(value).forEach(([key, val]) => {
            if (val === undefined) return;
            cleaned[key] = removeUndefinedDeep(val);
        });
        return cleaned;
    }
    return value;
};

const buildFallbackUser = (firebaseUser: FirebaseUser): User => ({
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    avatar: firebaseUser.photoURL || 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
    following: [],
    followers: [],
    wishlist: [],
    cart: [],
    badges: [],
    memberSince: new Date().toISOString(),
    status: 'active'
});

// Helper to convert Firestore doc to typed object
export const fromFirestore = <T extends { id: string }>(docSnap: any): T => {
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as T;
};

// --- AUTH SERVICE ---
export const authService = {
    login: async (email: string, pass: string): Promise<User> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        try {
            let user = await userService.getUserById(userCredential.user.uid);
            if (!user) {
                user = await userService.createUserProfile(userCredential.user, {});
            }
            return user;
        } catch (error) {
            console.error('Failed to load user profile after login:', error);
            return buildFallbackUser(userCredential.user);
        }
    },
    register: async (name: string, email: string, pass: string, phone: string, city: string): Promise<User> => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await userService.createUserProfile(userCredential.user, { name, phone, city });
        const created = await userService.getUserById(userCredential.user.uid);
        if (!created) {
            throw new Error('User profile not found after registration.');
        }
        return created;
    },
    logout: async () => {
        await signOut(auth);
    },
    signInWithGoogle: async (): Promise<User> => {
        try {
            const credential = await signInWithPopup(auth, googleProvider);
            const fallback = buildFallbackUser(credential.user);
            const profilePromise = (async () => {
                let user = await userService.getUserById(credential.user.uid);
                if (!user) {
                    user = await userService.createUserProfile(credential.user, {});
                }
                return user;
            })();

            try {
                const resolved = await Promise.race([
                    profilePromise,
                    new Promise<User>((resolve) => setTimeout(() => resolve(fallback), 2000))
                ]);
                if (resolved) return resolved;
            } catch (error) {
                console.error('Failed to load user profile after Google sign-in:', error);
            }

            // Fire and forget; auth state will reconcile later
            profilePromise.catch((error) => console.error('Google profile finalize failed:', error));
            return fallback;
        } catch (error: any) {
            const code = error?.code || '';
            const popupErrors = new Set([
                'auth/popup-blocked',
                'auth/popup-closed-by-user',
                'auth/cancelled-popup-request',
                'auth/operation-not-supported-in-this-environment'
            ]);
            if (popupErrors.has(code)) {
                await signInWithRedirect(auth, googleProvider);
                const redirectError: any = new Error('Redirecting to Google sign-in.');
                redirectError.code = 'auth/redirect';
                throw redirectError;
            }
            throw error;
        }
    },
    getProfile: async (uid: string): Promise<User | null> => {
        return userService.getUserById(uid);
    },
    createUserProfile: async (firebaseUser: FirebaseUser, additionalData: Partial<User>): Promise<User> => {
        return userService.createUserProfile(firebaseUser, additionalData);
    },
    requestPasswordReset: async (email: string) => {
        await sendPasswordResetEmail(auth, email);
        return;
    },
    // FIX: Implemented missing resetPassword method.
    resetPassword: async (token: string, newPass: string) => {
         await confirmPasswordReset(auth, token, newPass);
    }
};

// --- USER SERVICE ---
export const userService = {
    getUserById: async (uid: string): Promise<User | null> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.get<User>('users', uid);
                if (mirrored) return ({ id: uid, ...mirrored } as User);
            }
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const user = fromFirestore<User>(docSnap);
                if (supabaseMirror.enabled) {
                    await supabaseMirror.upsert('users', uid, user);
                }
                return user;
            }
            const mirrored = await supabaseMirror.get<User>('users', uid);
            return mirrored ? ({ id: uid, ...mirrored } as User) : null;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                const mirrored = await supabaseMirror.get<User>('users', uid);
                return mirrored ? ({ id: uid, ...mirrored } as User) : null;
            }
            throw error;
        }
    },
    createUserProfile: async (firebaseUser: FirebaseUser, additionalData: Partial<User>): Promise<User> => {
        const newUser: User = {
            id: firebaseUser.uid,
            name: additionalData.name || firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
            following: [],
            followers: [],
            wishlist: [],
            cart: [],
            badges: [],
            memberSince: new Date().toISOString(),
            status: 'active',
            ...additionalData
        };
        try {
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        } catch (error) {
            if (!isIgnorableFirebaseError(error)) {
                throw error;
            }
        } finally {
            await supabaseMirror.upsert('users', firebaseUser.uid, newUser);
        }
        return newUser;
    },
    updateUserProfile: async (uid: string, updates: Partial<User>): Promise<User> => {
        const userRef = doc(db, 'users', uid);
        let updated: User | null = null;
        try {
            await updateDoc(userRef, updates);
            const updatedDoc = await getDoc(userRef);
            updated = fromFirestore<User>(updatedDoc);
        } catch (error) {
            console.warn('Firestore update user failed, falling back to Supabase:', error);
        }
        if (updated) {
            await supabaseMirror.upsert('users', uid, updated);
            return updated;
        }
        const existing = await supabaseMirror.get<User>('users', uid);
        const merged = { ...(existing || {}), ...updates, id: uid } as User;
        await supabaseMirror.upsert('users', uid, merged);
        return merged;
    },
    getAllSellers: async (): Promise<User[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<User>('users', { filters: { status: 'active' }, limit: 500 });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'users'), where('status', '==', 'active')); // Simplified
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => fromFirestore<User>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(users.map(user => supabaseMirror.upsert('users', user.id, user)));
        }
        return users;
    },
    getWishlistForUser: async (userId: string): Promise<{ wishlist: WishlistItem[], items: Item[] }> => {
        const wishlist = supabaseMirror.enabled
            ? await supabaseMirror.list<WishlistItem>('wishlists', { filters: { userId } })
            : (await getDocs(query(collection(db, 'wishlists'), where('userId', '==', userId)))).docs.map(doc => fromFirestore<WishlistItem>(doc));
        
        const items = await Promise.all(wishlist.map(async (w) => {
            const item = await itemService.getItemById(w.itemId);
            return item;
        }));
        
        return { wishlist, items: items.filter(Boolean) as Item[] };
    },
    getPublicWishlist: async (userId: string): Promise<WishlistItem[]> => {
         if (supabaseMirror.enabled) {
            return await supabaseMirror.list<WishlistItem>('wishlists', { filters: { userId, isPublic: true } });
         }
         const q = query(collection(db, 'wishlists'), where('userId', '==', userId), where('isPublic', '==', true));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore<WishlistItem>(doc));
    },
    toggleWishlist: async (userId: string, itemId: string) => {
         const wishlistRef = collection(db, 'wishlists');
         const q = query(wishlistRef, where('userId', '==', userId), where('itemId', '==', itemId));
         const snapshot = await getDocs(q);

         if (!snapshot.empty) {
             const batch = writeBatch(db);
             snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
             await batch.commit();
             await Promise.all(snapshot.docs.map(docSnap => supabaseMirror.remove('wishlists', docSnap.id)));
             return;
         }

         const payload = {
             userId,
             itemId,
             addedAt: new Date().toISOString(),
             isPublic: true,
             likes: [],
             comments: []
         };
         const docRef = await addDoc(wishlistRef, payload);
         await supabaseMirror.upsert('wishlists', docRef.id, { id: docRef.id, ...payload });
    },
    toggleWishlistLike: async (ownerId: string, itemId: string, likerId: string) => {
        // Implementation
    },
    addWishlistComment: async (ownerId: string, itemId: string, user: User, text: string) => {
        // Implementation
    },
    getBadges: async (badgeIds: string[]): Promise<Badge[]> => {
        // Mock implementation
        return badgeIds.map(id => ({ id, name: id, icon: 'star', description: 'Badge' }));
    },
    getCollectionsForUser: async (userId: string): Promise<ItemCollection[]> => {
        const collections = supabaseMirror.enabled
            ? await supabaseMirror.list<ItemCollection>('collections', { filters: { userId } })
            : (await getDocs(query(collection(db, 'collections'), where('userId', '==', userId)))).docs.map(doc => fromFirestore<ItemCollection>(doc));
        
        // Populate items
        for (const col of collections) {
            const items = await Promise.all(col.itemIds.slice(0, 5).map(id => itemService.getItemById(id)));
            col.items = items.filter(Boolean) as Item[];
        }
        return collections;
    },
    getPublicCollectionsForUser: async (userId: string): Promise<ItemCollection[]> => {
         const collections = supabaseMirror.enabled
            ? await supabaseMirror.list<ItemCollection>('collections', { filters: { userId, isPublic: true } })
            : (await getDocs(query(collection(db, 'collections'), where('userId', '==', userId), where('isPublic', '==', true)))).docs.map(doc => fromFirestore<ItemCollection>(doc));
         
          for (const col of collections) {
            const items = await Promise.all(col.itemIds.slice(0, 5).map(id => itemService.getItemById(id)));
            col.items = items.filter(Boolean) as Item[];
        }
        return collections;
    },
    createCollection: async (userId: string, name: string, description: string, isPublic: boolean): Promise<ItemCollection> => {
        const newCol = {
            userId,
            name,
            description,
            isPublic,
            itemIds: [],
            isShopTheLook: false
        };
        const docRef = await addDoc(collection(db, 'collections'), newCol);
        const created = { id: docRef.id, ...newCol, items: [] } as ItemCollection;
        await supabaseMirror.upsert('collections', docRef.id, created);
        return created;
    },
    updateCollection: async (collectionId: string, updates: Partial<ItemCollection>): Promise<Partial<ItemCollection>> => {
        await updateDoc(doc(db, 'collections', collectionId), updates);
        await supabaseMirror.mergeUpdate<ItemCollection>('collections', collectionId, updates);
        return updates;
    },
    addItemToCollection: async (collectionId: string, itemId: string): Promise<ItemCollection> => {
        await updateDoc(doc(db, 'collections', collectionId), {
            itemIds: arrayUnion(itemId)
        });
        const snap = await getDoc(doc(db, 'collections', collectionId));
        const updated = fromFirestore<ItemCollection>(snap);
        await supabaseMirror.upsert('collections', collectionId, updated);
        return updated;
    },
    removeItemFromCollection: async (collectionId: string, itemId: string): Promise<ItemCollection> => {
         await updateDoc(doc(db, 'collections', collectionId), {
            itemIds: arrayRemove(itemId)
        });
        const snap = await getDoc(doc(db, 'collections', collectionId));
        const updated = fromFirestore<ItemCollection>(snap);
        await supabaseMirror.upsert('collections', collectionId, updated);
        return updated;
    },
    getPublicProfile: async (userId: string): Promise<{ user: User; items: Item[]; store: any } | null> => {
        try {
            const user = await userService.getUserById(userId);
            const items = await itemService.getItemsByOwner(userId);
            let profileUser = user;
            if (!profileUser && items.length > 0) {
                const owner = items[0].owner;
                profileUser = {
                    id: owner.id,
                    name: owner.businessName || owner.name,
                    email: '',
                    avatar: owner.avatar || 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
                    following: [],
                    followers: [],
                    wishlist: [],
                    cart: [],
                    badges: [],
                    memberSince: new Date().toISOString(),
                    status: 'active'
                };
            }
            if (!profileUser) {
                profileUser = {
                    id: userId,
                    name: 'Urban Prime Member',
                    email: '',
                    avatar: 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
                    following: [],
                    followers: [],
                    wishlist: [],
                    cart: [],
                    badges: [],
                    memberSince: new Date().toISOString(),
                    status: 'active'
                };
            }
            const store = await storefrontService.getStorefrontByUserId(userId);
            return { user: profileUser, items, store };
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return {
                    user: {
                        id: userId,
                        name: 'Urban Prime Member',
                        email: '',
                        avatar: 'https://i.ibb.co/688ds5H/blank-profile-picture-973460-960-720.png',
                        following: [],
                        followers: [],
                        wishlist: [],
                        cart: [],
                        badges: [],
                        memberSince: new Date().toISOString(),
                        status: 'active'
                    },
                    items: [],
                    store: null
                };
            }
            throw error;
        }
    },
    toggleFollow: async (followerId: string, followingId: string): Promise<{ currentUser: User, followedUser: User }> => {
        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);
        
        // Simplified toggle logic without transaction for brevity
        const followerSnap = await getDoc(followerRef);
        const followerData = followerSnap.data() as User;
        
        let newFollowing = [...followerData.following];
        if (newFollowing.includes(followingId)) {
            newFollowing = newFollowing.filter(id => id !== followingId);
            await updateDoc(followerRef, { following: arrayRemove(followingId) });
            await updateDoc(followingRef, { followers: arrayRemove(followerId) });
        } else {
            newFollowing.push(followingId);
            await updateDoc(followerRef, { following: arrayUnion(followingId) });
            await updateDoc(followingRef, { followers: arrayUnion(followerId) });
        }
        
        const updatedFollower = await getDoc(followerRef);
        const updatedFollowing = await getDoc(followingRef);
        
        await supabaseMirror.upsert('users', followerId, fromFirestore<User>(updatedFollower));
        await supabaseMirror.upsert('users', followingId, fromFirestore<User>(updatedFollowing));

        return {
            currentUser: fromFirestore<User>(updatedFollower),
            followedUser: fromFirestore<User>(updatedFollowing)
        };
    },
    getWalletTransactions: async (userId: string): Promise<WalletTransaction[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<WalletTransaction>('walletTransactions', { filters: { userId } });
                if (mirrored.length > 0) return mirrored;
            }
            const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            const txs = snapshot.docs.map(doc => fromFirestore<WalletTransaction>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(txs.map(tx => supabaseMirror.upsert('walletTransactions', tx.id, tx)));
            }
            return txs;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return await supabaseMirror.list<WalletTransaction>('walletTransactions', { filters: { userId } });
            }
            throw error;
        }
    },
    getNotificationsForUser: async (userId: string, max: number = 20): Promise<Notification[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<Notification>('notifications', { filters: { userId }, limit: max });
                if (mirrored.length > 0) return mirrored;
            }
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(max)
            );
            const snapshot = await getDocs(q);
            const notifs = snapshot.docs.map(doc => fromFirestore<Notification>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(notifs.map(n => supabaseMirror.upsert('notifications', n.id, n)));
            }
            return notifs;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return await supabaseMirror.list<Notification>('notifications', { filters: { userId }, limit: max });
            }
            throw error;
        }
    },
    markNotificationsAsRead: async (userId: string): Promise<void> => {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { isRead: true });
            });
            await batch.commit();
            const mirrored = await supabaseMirror.list<Notification>('notifications', { filters: { userId } });
            await Promise.all(
                mirrored
                    .filter(n => !n.isRead)
                    .map(n => supabaseMirror.mergeUpdate<Notification>('notifications', (n as any).id || '', { isRead: true }))
            );
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return;
            throw error;
        }
    },
    getPayoutMethods: async (userId: string): Promise<PayoutMethod[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<PayoutMethod>('payout_methods', { filters: { userId } });
                if (mirrored.length > 0) return mirrored;
            }
            const q = query(collection(db, 'users', userId, 'payoutMethods'));
            const snapshot = await getDocs(q);
            const methods = snapshot.docs.map(doc => fromFirestore<PayoutMethod>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(methods.map(m => supabaseMirror.upsert('payout_methods', m.id, { ...m, userId })));
            }
            return methods;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return await supabaseMirror.list<PayoutMethod>('payout_methods', { filters: { userId } });
            }
            throw error;
        }
    },
    addPayoutMethod: async (userId: string, method: Omit<PayoutMethod, 'id'>): Promise<PayoutMethod> => {
        const docRef = await addDoc(collection(db, 'users', userId, 'payoutMethods'), method);
        const created = { id: docRef.id, ...method };
        await supabaseMirror.upsert('payout_methods', docRef.id, { ...created, userId });
        return created;
    },
    getPaymentMethods: async (userId: string): Promise<any[]> => {
         try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<any>('payment_methods', { filters: { userId } });
                if (mirrored.length > 0) return mirrored;
            }
            const q = query(collection(db, 'users', userId, 'paymentMethods'));
            const snapshot = await getDocs(q);
            const methods = snapshot.docs.map(doc => fromFirestore(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(methods.map((m: any) => supabaseMirror.upsert('payment_methods', m.id, { ...m, userId })));
            }
            return methods;
         } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return await supabaseMirror.list<any>('payment_methods', { filters: { userId } });
            }
            throw error;
         }
    },
    addPaymentMethod: async (userId: string, method: any): Promise<void> => {
         const docRef = await addDoc(collection(db, 'users', userId, 'paymentMethods'), method);
         await supabaseMirror.upsert('payment_methods', docRef.id, { id: docRef.id, userId, ...method });
    },
    completeAffiliateOnboarding: async (userId: string, profile: AffiliateProfile) => {
        await updateDoc(doc(db, 'users', userId), {
            affiliateProfile: profile,
            affiliateOnboardingCompleted: true,
            isAffiliate: true
        });
    }
};

// --- ITEM SERVICE ---
export const itemService = {
    getItems: async (filters: any = {}, pagination: { page: number, limit: number } = { page: 1, limit: 20 }) => {
        const applyFilters = (items: Item[]) => {
            if (filters.category) items = items.filter(i => i.category === filters.category);
            if (filters.search) items = items.filter(i => i.title.toLowerCase().includes(filters.search.toLowerCase()));
            if (filters.isFeatured) items = items.filter(i => i.isFeatured);
            if (filters.minPrice) items = items.filter(i => (i.salePrice || i.rentalPrice || 0) >= filters.minPrice);
            if (filters.maxPrice) items = items.filter(i => (i.salePrice || i.rentalPrice || 0) <= filters.maxPrice);
            if (filters.listingType) {
                if (filters.listingType === 'rent') {
                    items = items.filter(i => i.listingType === 'rent' || i.listingType === 'both');
                } else if (filters.listingType === 'sale') {
                    items = items.filter(i => i.listingType === 'sale' || i.listingType === 'both');
                } else {
                    items = items.filter(i => i.listingType === filters.listingType);
                }
            }
            if (filters.minRating) items = items.filter(i => (i.avgRating || 0) >= filters.minRating);
            if (filters.conditions && Array.isArray(filters.conditions) && filters.conditions.length > 0) {
                items = items.filter(i => filters.conditions.includes(i.condition || ''));
            }
            if (!filters.includeArchived) items = items.filter(i => i.status === 'published' || !i.status);
            return items;
        };

        const paginate = (items: Item[]) => {
            const getPrice = (item: Item) => item.salePrice ?? item.rentalPrice ?? item.price ?? 0;
            const getPopularity = (item: Item) => {
                const rating = item.avgRating || 0;
                const reviews = item.reviews?.length || 0;
                const wins = item.battleWins || 0;
                return (rating * 10) + reviews + wins;
            };
            const sortBy = (filters as any)?.sortBy || 'newest';
            if (sortBy === 'price_asc') {
                items.sort((a, b) => getPrice(a) - getPrice(b));
            } else if (sortBy === 'price_desc') {
                items.sort((a, b) => getPrice(b) - getPrice(a));
            } else if (sortBy === 'popularity') {
                items.sort((a, b) => getPopularity(b) - getPopularity(a));
            } else {
                items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            const startIndex = (pagination.page - 1) * pagination.limit;
            return { items: items.slice(startIndex, startIndex + pagination.limit), total: items.length };
        };

        try {
            if (supabaseMirror.enabled) {
                const mirroredItems = await withTimeout(
                    supabaseMirror.list<Item>('items', { limit: 1000 }),
                    8000,
                    'Supabase request timed out'
                );
                if (mirroredItems.length > 0) {
                    const filtered = applyFilters(mirroredItems);
                    return paginate(filtered);
                }
            }
            const q = query(collection(db, 'items'));
            // In a real app, apply filters via WHERE clauses here. 
            // For now, client-side filtering for simplicity on complex filters not supported by basic indexes
            const snapshot = await withTimeout(getDocs(q), 8000, 'Firestore request timed out');
            let items = snapshot.docs.map(doc => fromFirestore<Item>(doc));
        
            items = applyFilters(items);
            if (supabaseMirror.enabled) {
                await Promise.all(items.map(item => supabaseMirror.upsert('items', item.id, item)));
            }
            if (items.length > 0) {
                writeItemCache(items);
                return paginate(items);
            }
            return { items: [], total: 0, page: options.page, limit: options.limit };
        } catch (error) {
            const cachedItems = readItemCache();
            if (cachedItems.length > 0) {
                const filtered = applyFilters(cachedItems);
                return paginate(filtered);
            }
            if (isIgnorableFirebaseError(error)) {
                const mirroredItems = await supabaseMirror.list<Item>('items', { limit: 1000 });
                const filtered = applyFilters(mirroredItems);
                return paginate(filtered);
            }
            throw error;
        }
    },
    getItemById: async (id: string): Promise<Item | undefined> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await withTimeout(supabaseMirror.get<Item>('items', id), 8000, 'Supabase request timed out');
                if (mirrored) {
                    const resolved = { id, ...mirrored } as Item;
                    upsertItemCache(resolved);
                    return resolved;
                }
            }
            const docRef = doc(db, 'items', id);
            const docSnap = await withTimeout(getDoc(docRef), 8000, 'Firestore request timed out');
            if (docSnap.exists()) {
                const item = fromFirestore<Item>(docSnap);
                if (supabaseMirror.enabled) {
                    await supabaseMirror.upsert('items', id, item);
                }
                upsertItemCache(item);
                return item;
            }
            const mirrored = await supabaseMirror.get<Item>('items', id);
            if (mirrored) {
                const resolved = { id, ...mirrored } as Item;
                upsertItemCache(resolved);
                return resolved;
            }
            return undefined;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                const mirrored = await supabaseMirror.get<Item>('items', id);
                return mirrored ? ({ id, ...mirrored } as Item) : undefined;
            }
            const cached = readItemCache().find(item => item.id === id);
            if (cached) return cached;
            throw error;
        }
    },
    getItemsByOwner: async (ownerId: string): Promise<Item[]> => {
         try {
            if (supabaseMirror.enabled) {
                const mirrored = await withTimeout(
                    supabaseMirror.list<Item>('items', { filters: { 'owner.id': ownerId } }),
                    8000,
                    'Supabase request timed out'
                );
                if (mirrored.length > 0) return mirrored;
            }
            const q = query(collection(db, 'items'), where('owner.id', '==', ownerId));
            const snapshot = await withTimeout(getDocs(q), 8000, 'Firestore request timed out');
            const items = snapshot.docs.map(doc => fromFirestore<Item>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(items.map(item => supabaseMirror.upsert('items', item.id, item)));
            }
            if (items.length > 0) {
                items.forEach(upsertItemCache);
            }
            if (items.length > 0) return items;
            return [];
         } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return await supabaseMirror.list<Item>('items', { filters: { 'owner.id': ownerId } });
            }
            const cached = readItemCache().filter(item => item.owner?.id === ownerId);
            if (cached.length > 0) return cached;
            throw error;
         }
    },
    getReviewsForOwner: async (ownerId: string): Promise<Review[]> => {
         if (supabaseMirror.enabled) {
            const items = await supabaseMirror.list<Item>('items', { filters: { 'owner.id': ownerId } });
            return items.flatMap(item => item.reviews || []);
         }
         const q = query(collection(db, 'items'), where('owner.id', '==', ownerId));
         const snapshot = await getDocs(q);
         const items = snapshot.docs.map(doc => fromFirestore<Item>(doc));
         return items.flatMap(item => item.reviews || []);
    },
    addItem: async (itemData: Partial<Item>, user: User): Promise<Item> => {
        const owner = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            ...(user.businessName ? { businessName: user.businessName } : {})
        };
        const newItem = removeUndefinedDeep({
            ...itemData,
            price: itemData.price ?? itemData.salePrice ?? itemData.rentalPrice ?? 0,
            owner,
            createdAt: new Date().toISOString(),
            reviews: [],
            avgRating: 0
        });
        let docId: string;
        try {
            const docRef = await withTimeout(
                addDoc(collection(db, 'items'), newItem),
                6000,
                'Firestore request timed out'
            );
            docId = docRef.id;
        } catch (error) {
            console.warn('Firestore add item failed, falling back to Supabase/local cache:', error);
            docId = (crypto as any)?.randomUUID?.() || `local-${Date.now()}`;
        }
        const created = { id: docId, ...newItem } as Item;
        // Mirror is best-effort; don't block listing on it.
        supabaseMirror.upsert('items', docId, created).catch((error) => {
            console.warn('Supabase mirror upsert failed (non-blocking):', error);
        });
        upsertItemCache(created);
        return created;
    },
    updateItem: async (itemId: string, updates: Partial<Item>): Promise<void> => {
        try {
            await updateDoc(doc(db, 'items', itemId), updates);
        } catch (error) {
            console.warn('Firestore update item failed, falling back to Supabase/local cache:', error);
        } finally {
            await supabaseMirror.mergeUpdate<Item>('items', itemId, updates);
            const cached = readItemCache().find(item => item.id === itemId);
            if (cached) {
                upsertItemCache({ ...cached, ...updates } as Item);
            }
        }
    },
    deleteItem: async (itemId: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, 'items', itemId));
        } catch (error) {
            console.warn('Firestore delete item failed, falling back to Supabase/local cache:', error);
        } finally {
            await supabaseMirror.remove('items', itemId);
            removeItemCache(itemId);
        }
    },
    searchItems: async (queryText: string): Promise<{ items: Item[], categories: Category[] }> => {
        const { items } = await itemService.getItems({ search: queryText }, { page: 1, limit: 5 });
        const categories = CATEGORIES.filter(c => c.name.toLowerCase().includes(queryText.toLowerCase()));
        return { items, categories };
    },
    addReview: async (itemId: string, review: { rating: number, comment: string }, author: { id: string, name: string, avatar: string }): Promise<Item> => {
        const itemRef = doc(db, 'items', itemId);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error("Item not found");
        
        const item = fromFirestore<Item>(itemSnap);
        const newReview: Review = {
            id: `rev-${Date.now()}`,
            itemId,
            author,
            ...review,
            date: new Date().toISOString()
        };
        
        const updatedReviews = [...(item.reviews || []), newReview];
        const newAvg = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
        
        await updateDoc(itemRef, { reviews: updatedReviews, avgRating: newAvg });
        await supabaseMirror.mergeUpdate<Item>('items', itemId, { reviews: updatedReviews, avgRating: newAvg });
        return { ...item, reviews: updatedReviews, avgRating: newAvg };
    },
    placeBid: async (itemId: string, bidAmount: number, bidder: { id: string; name: string }) => {
        const itemRef = doc(db, 'items', itemId);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error("Item not found");

        const item = fromFirestore<Item>(itemSnap);
        if (item.listingType !== 'auction') throw new Error("This item is not an auction listing.");

        const existingAuction = item.auctionDetails || {
            startingBid: item.salePrice || 0,
            currentBid: item.salePrice || 0,
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            bidCount: 0,
            bids: []
        };

        const minIncrement = Math.max(1, Math.round((existingAuction.currentBid || existingAuction.startingBid || 0) * 0.05));
        const minBid = (existingAuction.currentBid || existingAuction.startingBid || 0) + minIncrement;
        if (bidAmount < minBid) {
            throw new Error(`Bid must be at least ${minBid.toFixed(2)}.`);
        }

        const bid = {
            amount: bidAmount,
            bidderId: bidder.id,
            bidderName: bidder.name,
            createdAt: new Date().toISOString()
        };

        const updatedAuction = {
            ...existingAuction,
            currentBid: bidAmount,
            bidCount: (existingAuction.bidCount || 0) + 1,
            bids: [...(existingAuction.bids || []), bid]
        };

        await updateDoc(itemRef, { auctionDetails: updatedAuction });
        await supabaseMirror.mergeUpdate<Item>('items', itemId, { auctionDetails: updatedAuction });

        return { ...item, auctionDetails: updatedAuction };
    },
    // FIX: Implemented missing addHelpfulVote method.
    addHelpfulVote: async (itemId: string, questionId: string) => {
         const itemRef = doc(db, 'items', itemId);
         // Logic to update nested question in Firestore
    },
    importDropshipItem: async (supplierProduct: SupplierProduct, salePrice: number, user: User): Promise<Item> => {
         const estimatedDelivery = parseShippingEstimate(supplierProduct.shippingInfo?.time);
         const newItem: Partial<Item> = {
             title: supplierProduct.title,
             description: supplierProduct.description,
             category: supplierProduct.category,
             imageUrls: supplierProduct.imageUrls,
             productType: 'dropship',
             fulfillmentType: 'dropship',
             salePrice: salePrice,
             wholesalePrice: supplierProduct.wholesalePrice,
             supplierInfo: {
                 id: supplierProduct.supplierId || supplierProduct.id,
                 name: supplierProduct.supplierName,
                 originCountry: supplierProduct.countryOfOrigin,
                 processingTimeDays: supplierProduct.processingTimeDays,
                 shippingCost: supplierProduct.shippingInfo.cost,
                 returnPolicy: supplierProduct.returnPolicy,
                 compliance: {
                     hsCode: supplierProduct.hsCode,
                     certifications: supplierProduct.certifications
                 }
             },
             dropshipProfile: {
                 supplierId: supplierProduct.supplierId || supplierProduct.id,
                 supplierSku: supplierProduct.variants?.[0]?.supplierSku,
                 fulfillment: 'auto',
                 estimatedDelivery: estimatedDelivery
             },
             shippingEstimates: supplierProduct.shippingEstimates || (estimatedDelivery ? [estimatedDelivery] : []),
             originCountry: supplierProduct.countryOfOrigin,
             stock: 999, // Assumed dropship stock
             listingType: 'sale',
             condition: 'new',
             status: 'published'
         };
         return itemService.addItem(newItem, user);
    },
    checkAvailability: async (itemId: string, startDate: string, endDate: string): Promise<boolean> => {
        // 1. Check item's manual blackout dates
        const item = await itemService.getItemById(itemId);
        if (item && item.bookedDates) {
            // Simple string comparison for 'YYYY-MM-DD'
            const requestedRange = getDatesInRange(new Date(startDate), new Date(endDate));
            const hasConflict = requestedRange.some(date => item.bookedDates!.includes(date));
            if (hasConflict) return false;
        }

        // 2. Check overlapping bookings in 'bookings' collection
        // In a real Firestore app, range queries are complex. 
        // We will fetch active bookings for this item and check overlaps in memory for this demo.
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('itemId', '==', itemId), where('status', 'in', ['confirmed', 'pending', 'shipped', 'delivered', 'returned']));
        
        const snapshot = await getDocs(q);
        const existingBookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
        
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        const hasOverlap = existingBookings.some(booking => {
            const bStart = new Date(booking.startDate).getTime();
            const bEnd = new Date(booking.endDate).getTime();
            return (start <= bEnd) && (end >= bStart);
        });

        return !hasOverlap;
    },
    createOrder: async (userId: string, items: CartItem[], shippingInfo: any, paymentMethod: string): Promise<string> => {
        const batch = writeBatch(db);
        const orderId = `UP-${Math.floor(100000 + Math.random() * 900000)}`; // Simple ID generation
        const orderRef = doc(db, 'orders', orderId);
        const mirrorBookings: { id: string; data: any }[] = [];
        const mirrorNotifications: { id: string; data: any }[] = [];
        let totalDeposit = 0;
        
        // 1. Create Main Order Document
        const totalAmount = items.reduce((sum, item) => {
            let price = item.salePrice || item.rentalPrice || 0;
             if (item.listingType === 'rent' && item.rentalPeriod && item.rentalRates?.daily) {
                 const start = new Date(item.rentalPeriod.startDate);
                 const end = new Date(item.rentalPeriod.endDate);
                 const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                 price = item.rentalRates.daily * Math.max(1, days);
            }
            return sum + (price * item.quantity);
        }, 0);
        
        const orderPayload = {
            id: orderId,
            userId,
            items: items.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.salePrice || i.rentalPrice })),
            shippingInfo,
            paymentMethod,
            totalAmount,
            status: 'processing',
            createdAt: new Date().toISOString()
        };
        batch.set(orderRef, orderPayload);

        // 2. Create Bookings/Sub-orders for sellers and Decrement Stock
        items.forEach(item => {
             let totalPrice = (item.salePrice || item.rentalPrice || 0) * item.quantity;
             let depositAmount = 0;

             if (item.listingType === 'rent' && item.rentalPeriod && item.rentalRates?.daily) {
                 const start = new Date(item.rentalPeriod.startDate);
                 const end = new Date(item.rentalPeriod.endDate);
                 const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                 totalPrice = item.rentalRates.daily * Math.max(1, days) * item.quantity;
                 
                 // Handle Security Deposit
                 if (item.securityDeposit) {
                     depositAmount = item.securityDeposit * item.quantity;
                 }
             }
            
            // Decrement Stock & Update Status if 0
            const itemRef = doc(db, 'items', item.id);
            const isSoldOut = item.stock - item.quantity <= 0;
            
            // If rental, we don't decrement stock permanently, but in this simplified model we might tracking concurrent rentals.
            // For now, let's assume stock = quantity available for simultaneous rent.
            if (item.listingType !== 'rent') {
                 batch.update(itemRef, { 
                    stock: increment(-item.quantity),
                    ...(isSoldOut ? { status: 'sold' } : {}) 
                });
            }

            // Create Booking Record for Seller
            const bookingRef = doc(collection(db, 'bookings'));
            
            // Use rental dates if available, otherwise default to "now" for sales
            const startDate = item.rentalPeriod?.startDate || new Date().toISOString();
            const endDate = item.rentalPeriod?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const bookingPayload = {
                orderId,
                itemId: item.id,
                itemTitle: item.title,
                renterId: userId,
                renterName: shippingInfo.name,
                provider: { id: item.owner.id },
                startDate: startDate,
                endDate: endDate,
                totalPrice: totalPrice,
                status: 'confirmed', // Confirmed implies paid and ready for shipment
                shippingAddress: shippingInfo,
                paymentStatus: 'escrow',
                type: item.listingType === 'rent' ? 'rent' : 'sale',
                securityDeposit: depositAmount,
                depositStatus: depositAmount > 0 ? 'held' : undefined
            };
            batch.set(bookingRef, bookingPayload);
            mirrorBookings.push({ id: bookingRef.id, data: bookingPayload });
            totalDeposit += depositAmount;

            // Update Buyer's Held Deposits (Mock) - In real app, this would be a hold on card or separate wallet bucket
            if (depositAmount > 0) {
                 const buyerRef = doc(db, 'users', userId);
                 batch.update(buyerRef, { heldDeposits: increment(depositAmount) });
            }

            // Create Notification for Seller
            const notificationRef = doc(collection(db, 'notifications'));
            const notification: Omit<Notification, 'id'> = {
                userId: item.owner.id,
                type: 'SALE',
                message: `You just sold/rented ${item.title} x${item.quantity} for $${totalPrice.toFixed(2)}!`,
                link: '/profile/sales',
                isRead: false,
                createdAt: new Date().toISOString()
            };
            batch.set(notificationRef, notification);
            mirrorNotifications.push({ id: notificationRef.id, data: notification });
        });

        // 3. Commit Transaction
        await batch.commit();
        await supabaseMirror.upsert('orders', orderId, orderPayload);
        await Promise.all(mirrorBookings.map(b => supabaseMirror.upsert('bookings', b.id, b.data)));
        await Promise.all(mirrorNotifications.map(n => supabaseMirror.upsert('notifications', n.id, n.data)));
        await Promise.all(items.map(item => {
            if (item.listingType === 'rent') return Promise.resolve();
            if (typeof item.stock !== 'number') return Promise.resolve();
            const newStock = item.stock - item.quantity;
            const updates: Partial<Item> = { stock: newStock };
            if (newStock <= 0) updates.status = 'sold';
            return supabaseMirror.mergeUpdate<Item>('items', item.id, updates);
        }));
        if (totalDeposit > 0) {
            const existing = await supabaseMirror.get<User>('users', userId);
            const currentHeld = (existing as any)?.heldDeposits || 0;
            await supabaseMirror.upsert('users', userId, { ...(existing || {}), heldDeposits: currentHeld + totalDeposit } as User);
        }
        
        return orderId;
    },
    // Deprecated single item purchase logic - kept for backward compatibility if needed
    processPurchase: async (cartItems: CartItem[], user: User, shippingInfo: any): Promise<string> => {
         return itemService.createOrder(user.id, cartItems, shippingInfo, 'card');
    },
    completeOrder: async (bookingId: string) => {
        const batch = writeBatch(db);
        
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) throw new Error("Booking not found");
        
        const booking = fromFirestore<Booking>(bookingSnap);
        const sellerId = booking.provider.id;
        const totalPrice = booking.totalPrice;
        const completedAt = new Date().toISOString();
        
        // 1. Update Booking Status
        const bookingUpdates: Partial<Booking> = {
            status: 'completed',
            paymentStatus: 'released',
            completedAt
        };
        batch.update(bookingRef, bookingUpdates);

        // 2. Transfer Funds to Seller
        const sellerRef = doc(db, 'users', sellerId);
        // Assuming a standard 10% platform fee
        const platformFee = totalPrice * 0.10;
        const netEarnings = totalPrice - platformFee;

        batch.update(sellerRef, {
            walletBalance: increment(netEarnings),
            // Optionally update total earnings stats here too
        });

        // 3. Create Transaction Record for Seller
        const transactionRef = doc(collection(db, 'walletTransactions'));
        const transactionPayload = {
            userId: sellerId,
            amount: netEarnings,
            type: 'credit',
            description: `Sale of ${booking.itemTitle}`,
            date: new Date().toISOString(),
            status: 'completed'
        };
        batch.set(transactionRef, transactionPayload);
        
        // 4. If there was a held deposit and it wasn't claimed, release it (Auto-release logic)
        if (booking.securityDeposit && booking.depositStatus === 'held') {
             bookingUpdates.depositStatus = 'released';
             batch.update(bookingRef, { depositStatus: 'released' });
             const buyerRef = doc(db, 'users', booking.renterId);
             batch.update(buyerRef, { heldDeposits: increment(-booking.securityDeposit) });
        }

        // 5. Notify Seller
        const notificationRef = doc(collection(db, 'notifications'));
        const notification: Omit<Notification, 'id'> = {
            userId: sellerId,
            type: 'INFO',
            message: `Order completed! $${netEarnings.toFixed(2)} added to your wallet for ${booking.itemTitle}.`,
            link: '/profile/wallet',
            isRead: false,
            createdAt: new Date().toISOString()
        };
        batch.set(notificationRef, notification);

        await batch.commit();
        await supabaseMirror.mergeUpdate<Booking>('bookings', bookingId, bookingUpdates);
        await supabaseMirror.upsert('walletTransactions', transactionRef.id, { id: transactionRef.id, ...transactionPayload });
        await supabaseMirror.upsert('notifications', notificationRef.id, { id: notificationRef.id, ...notification });
        const sellerMirror = await supabaseMirror.get<User>('users', sellerId);
        if (sellerMirror) {
            const currentBalance = (sellerMirror as any)?.walletBalance || 0;
            await supabaseMirror.upsert('users', sellerId, { ...sellerMirror, walletBalance: currentBalance + netEarnings });
        }
        if (booking.securityDeposit && booking.depositStatus === 'held') {
            const buyerMirror = await supabaseMirror.get<User>('users', booking.renterId);
            if (buyerMirror) {
                const currentHeld = (buyerMirror as any)?.heldDeposits || 0;
                await supabaseMirror.upsert('users', booking.renterId, { ...buyerMirror, heldDeposits: currentHeld - booking.securityDeposit });
            }
        }
    },
    releaseSecurityDeposit: async (bookingId: string) => {
         const batch = writeBatch(db);
         const bookingRef = doc(db, 'bookings', bookingId);
         const bookingSnap = await getDoc(bookingRef);
         
         if (!bookingSnap.exists()) throw new Error("Booking not found");
         const booking = fromFirestore<Booking>(bookingSnap);
         
         if (booking.depositStatus !== 'held') throw new Error("No deposit to release.");
         
         batch.update(bookingRef, { depositStatus: 'released' });
         
         const buyerRef = doc(db, 'users', booking.renterId);
         batch.update(buyerRef, { heldDeposits: increment(-(booking.securityDeposit || 0)) });
         
         // Notify Buyer
        const notificationRef = doc(collection(db, 'notifications'));
        const notification: Omit<Notification, 'id'> = {
            userId: booking.renterId,
            type: 'INFO',
            message: `Your security deposit of $${booking.securityDeposit} for ${booking.itemTitle} has been released.`,
            link: '/profile/wallet',
            isRead: false,
            createdAt: new Date().toISOString()
        };
        batch.set(notificationRef, notification);
         
         await batch.commit();
         await supabaseMirror.mergeUpdate<Booking>('bookings', bookingId, { depositStatus: 'released' });
         await supabaseMirror.upsert('notifications', notificationRef.id, { id: notificationRef.id, ...notification });
         const buyerMirror = await supabaseMirror.get<User>('users', booking.renterId);
         if (buyerMirror) {
            const currentHeld = (buyerMirror as any)?.heldDeposits || 0;
            await supabaseMirror.upsert('users', booking.renterId, { ...buyerMirror, heldDeposits: currentHeld - (booking.securityDeposit || 0) });
         }
    },
    claimSecurityDeposit: async (bookingId: string, amount: number, reason: string, proofImage: string) => {
         const batch = writeBatch(db);
         const bookingRef = doc(db, 'bookings', bookingId);
         const bookingSnap = await getDoc(bookingRef);
         
         if (!bookingSnap.exists()) throw new Error("Booking not found");
         const booking = fromFirestore<Booking>(bookingSnap);
         
         if (booking.depositStatus !== 'held') throw new Error("No deposit to claim.");
         const maxClaim = booking.securityDeposit || 0;
         if (amount > maxClaim) throw new Error("Cannot claim more than the security deposit amount.");
         
         // Update Booking with claim details
         batch.update(bookingRef, { 
             depositStatus: 'claimed',
             claimDetails: { amount, reason, proofImage }
         });
         
         // Update Buyer: Release remainder (if any), remove full hold amount
         const buyerRef = doc(db, 'users', booking.renterId);
         batch.update(buyerRef, { heldDeposits: increment(-maxClaim) });
         
         // Transfer claimed amount to Seller
         const sellerRef = doc(db, 'users', booking.provider.id);
         batch.update(sellerRef, { walletBalance: increment(amount) });
         
         // Create Transaction for Seller
         const transactionRef = doc(collection(db, 'walletTransactions'));
         const transactionPayload = {
            userId: booking.provider.id,
            amount: amount,
            type: 'credit',
            description: `Security Deposit Claim for ${booking.itemTitle}`,
            date: new Date().toISOString(),
            status: 'completed'
        };
         batch.set(transactionRef, transactionPayload);
         
         // Notifications
         // To Buyer
         const notifBuyer = doc(collection(db, 'notifications'));
         const notifBuyerPayload = {
            userId: booking.renterId,
            type: 'INFO',
            message: `A security deposit claim of $${amount} was made for ${booking.itemTitle}.`,
            link: `/profile/orders/${bookingId}`,
            isRead: false,
            createdAt: new Date().toISOString()
        };
         batch.set(notifBuyer, notifBuyerPayload);
        
         await batch.commit();
         await supabaseMirror.mergeUpdate<Booking>('bookings', bookingId, { 
            depositStatus: 'claimed',
            claimDetails: { amount, reason, proofImage }
         });
         await supabaseMirror.upsert('walletTransactions', transactionRef.id, { id: transactionRef.id, ...transactionPayload });
         await supabaseMirror.upsert('notifications', notifBuyer.id, { id: notifBuyer.id, ...notifBuyerPayload });
         const buyerMirror = await supabaseMirror.get<User>('users', booking.renterId);
         if (buyerMirror) {
            const currentHeld = (buyerMirror as any)?.heldDeposits || 0;
            await supabaseMirror.upsert('users', booking.renterId, { ...buyerMirror, heldDeposits: currentHeld - maxClaim });
         }
         const sellerMirror = await supabaseMirror.get<User>('users', booking.provider.id);
         if (sellerMirror) {
            const currentBalance = (sellerMirror as any)?.walletBalance || 0;
            await supabaseMirror.upsert('users', booking.provider.id, { ...sellerMirror, walletBalance: currentBalance + amount });
         }
    },
    // Mock Auto-Release Logic (Would be a cloud function in reality)
    checkAutoRelease: async () => {
         // Logic to find returned bookings older than 48h and release deposit
         console.log("Checking auto-release candidates...");
    },
    getTrendingItems: async (categories: string[]): Promise<Item[]> => {
        // Mock logic
        const { items } = await itemService.getItems({}, { page: 1, limit: 20 });
        return items.filter(i => categories.includes(i.category) || i.avgRating > 4.5).slice(0, 4);
    },
    recordBattleVote: async (winnerId: string, loserId: string) => {
         await updateDoc(doc(db, 'items', winnerId), { battleWins: increment(1), battleAppearances: increment(1) });
         await updateDoc(doc(db, 'items', loserId), { battleAppearances: increment(1) });
         const winner = await supabaseMirror.get<Item>('items', winnerId);
         if (winner) {
            const wins = (winner as any).battleWins || 0;
            const appearances = (winner as any).battleAppearances || 0;
            await supabaseMirror.upsert('items', winnerId, { ...winner, battleWins: wins + 1, battleAppearances: appearances + 1 });
         }
         const loser = await supabaseMirror.get<Item>('items', loserId);
         if (loser) {
            const appearances = (loser as any).battleAppearances || 0;
            await supabaseMirror.upsert('items', loserId, { ...loser, battleAppearances: appearances + 1 });
         }
    },
    getProjectShowcases: async (): Promise<ProjectShowcase[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<ProjectShowcase>('projectShowcases', { limit: 200 });
            if (mirrored.length > 0) return mirrored;
        }
        const snapshot = await getDocs(collection(db, 'projectShowcases'));
        const showcases = snapshot.docs.map(doc => fromFirestore<ProjectShowcase>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(showcases.map(s => supabaseMirror.upsert('projectShowcases', s.id, s)));
        }
        return showcases;
    },
    getGameUploads: async (): Promise<GameUpload[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<GameUpload>('games', { limit: 200 });
            if (mirrored.length > 0) return mirrored;
        }
        const snapshot = await getDocs(collection(db, 'games'));
        const games = snapshot.docs.map(doc => fromFirestore<GameUpload>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(games.map(g => supabaseMirror.upsert('games', g.id, g)));
        }
        return games;
    },
    recordGameDownload: async (gameId: string) => {
        await updateDoc(doc(db, 'games', gameId), { downloads: increment(1) });
        const game = await supabaseMirror.get<GameUpload>('games', gameId);
        if (game) {
            const downloads = (game as any).downloads || 0;
            await supabaseMirror.upsert('games', gameId, { ...game, downloads: downloads + 1 });
        }
    },
    uploadGame: async (gameData: Omit<GameUpload, 'id' | 'createdAt' | 'downloads' | 'uploader' | 'fileUrl'>, user: User) => {
         const newGame = {
             ...gameData,
             uploader: { id: user.id, name: user.name, avatar: user.avatar },
             downloads: 0,
             createdAt: new Date().toISOString()
         };
         const docRef = await addDoc(collection(db, 'games'), newGame);
         await supabaseMirror.upsert('games', docRef.id, { id: docRef.id, ...newGame });
    },
    boostItem: async (itemId: string, plan: string, durationDays: number) => {
        await updateDoc(doc(db, 'items', itemId), { 
            boostLevel: plan, 
            boostExpiry: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() 
        });
        await supabaseMirror.mergeUpdate<Item>('items', itemId, { 
            boostLevel: plan, 
            boostExpiry: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() 
        });
    },
    getOffersForUser: async (userId: string): Promise<Offer[]> => {
         if (supabaseMirror.enabled) {
            const offers = await supabaseMirror.list<Offer>('offers', { limit: 500 });
            if (offers.length > 0) {
                return offers.filter(o => o.buyer?.id === userId || o.seller?.id === userId);
            }
         }
         const q = query(collection(db, 'offers'), where('receiverId', '==', userId)); // or senderId
         // Simplified
         const snapshot = await getDocs(collection(db, 'offers'));
         const offers = snapshot.docs.map(doc => fromFirestore<Offer>(doc)).filter(o => o.buyer.id === userId || o.seller.id === userId);
         if (supabaseMirror.enabled) {
            await Promise.all(offers.map(o => supabaseMirror.upsert('offers', o.id, o)));
         }
         return offers;
    },
    updateOfferStatus: async (offerId: string, status: 'accepted' | 'declined') => {
         await updateDoc(doc(db, 'offers', offerId), { status });
         await supabaseMirror.mergeUpdate<Offer>('offers', offerId, { status });
    },
    getPersonalizedFeed: async (user: User): Promise<Item[]> => {
         // Logic based on interests
         const { items } = await itemService.getItems({}, { page: 1, limit: 10 });
         return items;
    },
    getHierarchicalCategories: async (): Promise<Category[]> => {
        return HIERARCHICAL_CATEGORIES;
    },
    addCategory: async (name: string, parentId: string): Promise<Category> => {
        // Mock adding category to local constant list or DB
        return { id: `cat-${Date.now()}`, name };
    },
    getEvents: async (): Promise<Event[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Event>('events', { limit: 200 });
            if (mirrored.length > 0) return mirrored;
        }
        const snapshot = await getDocs(collection(db, 'events'));
        const events = snapshot.docs.map(doc => fromFirestore<Event>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(events.map(e => supabaseMirror.upsert('events', e.id, e)));
        }
        return events;
    },
    
    // --- Chat Methods ---
    findOrCreateChatThread: async (itemId: string, buyerId: string, sellerId: string) => {
        // Logic to find thread or create
        return `thread-${Date.now()}`;
    },
    getChatThreadsForUser: async (userId: string) => {
         const q = query(collection(db, 'chatThreads'), where('participants', 'array-contains', userId));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore(doc));
    },
    sendMessageToThread: async (threadId: string, senderId: string, text: string, imageUrl?: string) => {
         await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
             senderId, text, imageUrl, timestamp: new Date().toISOString()
         });
    },
    sendMessage: async (text: string, history: any[], mode: string): Promise<string> => {
        // Mock or real implementation
        return "I am processing your message...";
    },
    sendOfferToThread: async (threadId: string, senderId: string, offer: any) => {
          await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
             senderId, type: 'offer', offer, timestamp: new Date().toISOString()
         });
    },

};

// --- DROPSHIP SERVICE ---
export const dropshipService = {
    getSuppliers: async (): Promise<SupplierInfo[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<SupplierInfo>('suppliers', { limit: 500 });
                if (mirrored.length > 0) return mirrored;
            }
            const snapshot = await getDocs(collection(db, 'suppliers'));
            const suppliers = snapshot.docs.map(doc => fromFirestore<SupplierInfo>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(suppliers.map(s => supabaseMirror.upsert('suppliers', s.id, s)));
            }
            return suppliers;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return [];
            throw error;
        }
    },
    getSupplierById: async (supplierId: string): Promise<SupplierInfo | undefined> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.get<SupplierInfo>('suppliers', supplierId);
                if (mirrored) return { id: supplierId, ...mirrored } as SupplierInfo;
            }
            const docRef = doc(db, 'suppliers', supplierId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? fromFirestore<SupplierInfo>(docSnap) : undefined;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return undefined;
            throw error;
        }
    },
    getSupplierCatalog: async (supplierId?: string): Promise<SupplierProduct[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<SupplierProduct>('supplier_products', {
                    filters: supplierId ? { supplierId } : undefined,
                    limit: 500
                });
                if (mirrored.length > 0) return mirrored;
            }
            const q = supplierId
                ? query(collection(db, 'supplier_products'), where('supplierId', '==', supplierId))
                : query(collection(db, 'supplier_products'));
            const snapshot = await getDocs(q);
            const products = snapshot.docs.map(doc => fromFirestore<SupplierProduct>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(products.map(p => supabaseMirror.upsert('supplier_products', p.id, p)));
            }
            return products;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return [];
            throw error;
        }
    },
    syncSupplierInventory: async (supplierId: string): Promise<{ syncedAt: string; updated: number }> => {
        // Placeholder for real supplier API sync
        return { syncedAt: new Date().toISOString(), updated: 0 };
    },
    calculateLandedCost: async (baseCost: number, shippingCost: number, duties: number = 0) => {
        return {
            baseCost,
            shippingCost,
            duties,
            total: baseCost + shippingCost + duties
        };
    },
    createDropshipOrder: async (order: Omit<DropshipOrder, 'id' | 'createdAt'>): Promise<DropshipOrder> => {
        try {
            const payload = { ...order, createdAt: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'dropship_orders'), payload);
            const created = { id: docRef.id, ...payload };
            await supabaseMirror.upsert('dropship_orders', docRef.id, created);
            return created;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return {
                    id: `offline-${Date.now()}`,
                    ...order,
                    createdAt: new Date().toISOString()
                };
            }
            throw error;
        }
    },
    getDropshipOrdersByUser: async (userId: string): Promise<DropshipOrder[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<DropshipOrder>('dropship_orders', { filters: { buyerId: userId } });
                if (mirrored.length > 0) return mirrored;
            }
            const q = query(collection(db, 'dropship_orders'), where('buyerId', '==', userId));
            const snapshot = await getDocs(q);
            const orders = snapshot.docs.map(doc => fromFirestore<DropshipOrder>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(orders.map(o => supabaseMirror.upsert('dropship_orders', o.id, o)));
            }
            return orders;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return [];
            throw error;
        }
    }
};

// --- AFFILIATE SERVICE ---
export const affiliateService = {
    getProgramSettings: async (): Promise<AffiliateProgramSettings | null> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.get<AffiliateProgramSettings>('affiliate_program', 'settings');
                if (mirrored) return mirrored;
            }
            const docRef = doc(db, 'affiliate_program', 'settings');
            const snap = await getDoc(docRef);
            if (!snap.exists()) return null;
            const settings = snap.data() as AffiliateProgramSettings;
            if (supabaseMirror.enabled) {
                await supabaseMirror.upsert('affiliate_program', 'settings', settings);
            }
            return settings;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return null;
            throw error;
        }
    },
    trackClick: async (attribution: Omit<AffiliateAttribution, 'id'>): Promise<AffiliateAttribution> => {
        try {
            const docRef = await addDoc(collection(db, 'affiliate_attributions'), attribution);
            const created = { id: docRef.id, ...attribution };
            await supabaseMirror.upsert('affiliate_attributions', docRef.id, created);
            return created;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return { id: `offline-${Date.now()}`, ...attribution };
            }
            throw error;
        }
    },
    recordConversion: async (conversion: Omit<AffiliateConversion, 'id'>): Promise<AffiliateConversion> => {
        try {
            const docRef = await addDoc(collection(db, 'affiliate_conversions'), conversion);
            const created = { id: docRef.id, ...conversion };
            await supabaseMirror.upsert('affiliate_conversions', docRef.id, created);
            return created;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return { id: `offline-${Date.now()}`, ...conversion };
            }
            throw error;
        }
    },
    requestPayout: async (payout: Omit<AffiliatePayout, 'id'>): Promise<AffiliatePayout> => {
        try {
            const docRef = await addDoc(collection(db, 'affiliate_payouts'), payout);
            const created = { id: docRef.id, ...payout };
            await supabaseMirror.upsert('affiliate_payouts', docRef.id, created);
            return created;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return { id: `offline-${Date.now()}`, ...payout };
            }
            throw error;
        }
    },
    getCreatives: async (): Promise<CreativeAsset[]> => {
        try {
            if (supabaseMirror.enabled) {
                const mirrored = await supabaseMirror.list<CreativeAsset>('affiliate_creatives', { limit: 200 });
                if (mirrored.length > 0) return mirrored;
            }
            const snapshot = await getDocs(collection(db, 'affiliate_creatives'));
            const creatives = snapshot.docs.map(doc => fromFirestore<CreativeAsset>(doc));
            if (supabaseMirror.enabled) {
                await Promise.all(creatives.map(c => supabaseMirror.upsert('affiliate_creatives', c.id, c)));
            }
            return creatives;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return [];
            throw error;
        }
    }
};

// --- LISTER SERVICE ---
export const listerService = {
    getDashboardAnalytics: async (userId: string): Promise<any> => {
        // Mock data
        return {
            totalEarnings: 1250,
            rentalCount: 45,
            topItem: "Sony Alpha Camera",
            earningsByMonth: [{ month: 'Jan', earnings: 200 }, { month: 'Feb', earnings: 450 }],
            repeatRenters: 12,
            avgRentalDuration: 4
        };
    },
    getBookings: async (userId: string): Promise<Booking[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Booking>('bookings', { filters: { 'provider.id': userId } });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'bookings'), where('provider.id', '==', userId));
        const snapshot = await getDocs(q);
        const bookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(bookings.map(b => supabaseMirror.upsert('bookings', b.id, b)));
        }
        return bookings;
    },
    getBookingById: async (bookingId: string): Promise<Booking | undefined> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.get<Booking>('bookings', bookingId);
            if (mirrored) return { id: bookingId, ...mirrored } as Booking;
        }
        const docRef = doc(db, 'bookings', bookingId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return undefined;
        const booking = fromFirestore<Booking>(snap);
        if (supabaseMirror.enabled) {
            await supabaseMirror.upsert('bookings', bookingId, booking);
        }
        return booking;
    },
    updateBooking: async (bookingId: string, updates: Partial<Booking>) => {
        await updateDoc(doc(db, 'bookings', bookingId), updates);
        await supabaseMirror.mergeUpdate<Booking>('bookings', bookingId, updates);
    },
    updateBookingStatus: async (bookingId: string, status: string) => {
        await updateDoc(doc(db, 'bookings', bookingId), { status });
        await supabaseMirror.mergeUpdate<Booking>('bookings', bookingId, { status } as Partial<Booking>);
    },
    getRentalHistory: async (userId: string): Promise<RentalHistoryItem[]> => {
        // Combine bookings where user is renter or provider
        const allBookings = supabaseMirror.enabled
            ? await supabaseMirror.list<Booking>('bookings', { limit: 500 })
            : (await getDocs(query(collection(db, 'bookings')))).docs.map(doc => fromFirestore<Booking>(doc));
        // Filter and map to RentalHistoryItem
        return allBookings
            .filter(b => b.renterId === userId || b.provider.id === userId)
            .map(b => ({
                id: b.id,
                itemId: b.itemId,
                itemTitle: b.itemTitle,
                itemImageUrl: 'https://picsum.photos/200', // Mock
                startDate: b.startDate,
                endDate: b.endDate,
                totalPrice: b.totalPrice,
                status: b.status,
                type: 'rent' // or derived from booking
            }));
    },
    getDiscountCodes: async (userId: string): Promise<DiscountCode[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<DiscountCode>('discountCodes', { filters: { userId } });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'discountCodes'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const codes = snapshot.docs.map(doc => fromFirestore<DiscountCode>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(codes.map(c => supabaseMirror.upsert('discountCodes', c.id, c)));
        }
        return codes;
    },
    createDiscountCode: async (userId: string, code: string, percentage: number) => {
        const payload = { userId, code, percentage, isActive: true, uses: 0 };
        const docRef = await addDoc(collection(db, 'discountCodes'), payload);
        await supabaseMirror.upsert('discountCodes', docRef.id, { id: docRef.id, ...payload });
    },
    updateDiscountCode: async (id: string, updates: Partial<DiscountCode>) => {
        await updateDoc(doc(db, 'discountCodes', id), updates);
        await supabaseMirror.mergeUpdate<DiscountCode>('discountCodes', id, updates);
    },
    getBundles: async (userId: string): Promise<any[]> => {
         return [];
    },
    addBooking: async (item: Item, renter: User, startDate: string, endDate: string, totalPrice: number, shippingAddress: any) => {
        const newBooking = {
            itemId: item.id,
            itemTitle: item.title,
            renterId: renter.id,
            renterName: renter.name,
            provider: { id: item.owner.id },
            startDate,
            endDate,
            totalPrice,
            status: 'confirmed', // Updated to match createOrder logic
            shippingAddress,
            paymentStatus: 'escrow'
        };
        const docRef = await addDoc(collection(db, 'bookings'), newBooking);
        await supabaseMirror.upsert('bookings', docRef.id, { id: docRef.id, ...newBooking });
    },
    getTransactionsForUser: async (userId: string): Promise<any[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<any>('walletTransactions', { filters: { userId } });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const txs = snapshot.docs.map(doc => fromFirestore(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(txs.map((tx: any) => supabaseMirror.upsert('walletTransactions', tx.id, tx)));
        }
        return txs;
    },
    getAffiliateData: async (userId: string) => {
        const affiliate = { userId, referralCode: 'USER123', clicks: 150, signups: 5, commissionRate: 0.05, earnings: 250, balance: 50 };
        return { affiliate, earnings: [] };
    },
    getAffiliateLinks: async (userId: string): Promise<AffiliateLink[]> => [],
    getAffiliateCoupons: async (userId: string): Promise<AffiliateCoupon[]> => [],
    getCreativeAssets: async (): Promise<CreativeAsset[]> => [],
    getAffiliateLeaderboard: async (): Promise<any[]> => [],
    joinAffiliateProgram: async (userId: string): Promise<User> => {
        const updates = { isAffiliate: true, affiliateOnboardingCompleted: false };
        await updateDoc(doc(db, 'users', userId), updates);
        const u = await userService.getUserById(userId);
        return u!;
    },
    generateAffiliateLink: async (userId: string, url: string): Promise<AffiliateLink> => {
        return { id: 'link-1', userId, originalUrl: url, shortCode: 'xyz', clicks: 0 };
    },
    createAffiliateCoupon: async (userId: string, code: string, percentage: number): Promise<AffiliateCoupon> => {
        return { id: 'coup-1', userId, code, discountPercentage: percentage, uses: 0, commissionRate: 0.05 };
    },
    transferEarningsToWallet: async (userId: string): Promise<User> => {
        // Mock transfer
        return (await userService.getUserById(userId))!;
    },
    submitExternalProduct: async (userId: string, url: string) => {},
    submitContentReview: async (userId: string, url: string) => {},
    requestPayout: async (userId: string, amount: number, method: any) => {
        const payload = {
            userId, amount, method, status: 'pending', createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'payout_requests'), payload);
        await supabaseMirror.upsert('payout_requests', docRef.id, { id: docRef.id, ...payload });
    },
    getSellerPerformanceStats: async (userId: string): Promise<SellerPerformanceStats> => {
         return {
             earnings: [],
             categorySales: [],
             pendingShipments: 2,
             lowStockItems: [],
             unreadMessages: 1,
             totalViews: 1200,
             conversionRate: 3.5
         };
    },
    getGrowthInsights: async (stats: SellerPerformanceStats): Promise<GrowthInsight[]> => {
        return [
            { id: '1', type: 'pricing', message: 'Lowering price on X might increase sales', actionLabel: 'Adjust Price', actionLink: '#' }
        ];
    }
};

// --- REEL SERVICE ---
export const reelService = {
    getReelsForFeed: async (userId: string): Promise<Reel[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Reel>('reels', { limit: 200 });
            if (mirrored.length > 0) return mirrored;
        }
        const snapshot = await getDocs(collection(db, 'reels'));
        const reels = snapshot.docs.map(doc => fromFirestore<Reel>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(reels.map(r => supabaseMirror.upsert('reels', r.id, r)));
        }
        return reels;
    },
    getReelsByCreator: async (userId: string): Promise<Reel[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Reel>('reels', { filters: { creatorId: userId } });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'reels'), where('creatorId', '==', userId));
        const snapshot = await getDocs(q);
        const reels = snapshot.docs.map(doc => fromFirestore<Reel>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(reels.map(r => supabaseMirror.upsert('reels', r.id, r)));
        }
        return reels;
    },
    toggleLikeReel: async (userId: string, reelId: string): Promise<User> => {
        const reelRef = doc(db, 'reels', reelId);
        const userRef = doc(db, 'users', userId);
        
        // Mock toggle
        await updateDoc(reelRef, { likes: increment(1) });
        const reel = await supabaseMirror.get<Reel>('reels', reelId);
        if (reel) {
            const likes = (reel as any).likes || 0;
            await supabaseMirror.upsert('reels', reelId, { ...reel, likes: likes + 1 });
        }
        // Update user liked list locally or in DB
        return (await userService.getUserById(userId))!;
    },
    addCommentToReel: async (reelId: string, user: User, text: string): Promise<Reel> => {
        const reelRef = doc(db, 'reels', reelId);
        const newComment = { id: `c-${Date.now()}`, author: { id: user.id, name: user.name, avatar: user.avatar }, text, timestamp: new Date().toISOString() };
        await updateDoc(reelRef, { comments: arrayUnion(newComment) });
        const updated = fromFirestore<Reel>(await getDoc(reelRef));
        await supabaseMirror.upsert('reels', reelId, updated);
        return updated;
    },
    addReel: async (reelData: Partial<Reel>): Promise<Reel> => {
        const payload = { ...reelData, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'reels'), payload);
        const created = { id: docRef.id, ...payload } as Reel;
        await supabaseMirror.upsert('reels', docRef.id, created);
        return created;
    },
    updateReel: async (reelId: string, updates: Partial<Reel>): Promise<Reel> => {
        await updateDoc(doc(db, 'reels', reelId), updates);
        await supabaseMirror.mergeUpdate<Reel>('reels', reelId, updates);
        return { id: reelId, ...updates } as Reel;
    },
    deleteReel: async (reelId: string) => {
        await deleteDoc(doc(db, 'reels', reelId));
        await supabaseMirror.remove('reels', reelId);
    },
    startLiveStream: async (streamData: Partial<LiveStream>, user: User) => {
        const payload = {
            ...streamData,
            hostName: user.name,
            hostAvatar: user.avatar,
            viewers: 0,
            status: 'live'
        };
        const docRef = await addDoc(collection(db, 'livestreams'), payload);
        await supabaseMirror.upsert('livestreams', docRef.id, { id: docRef.id, ...payload });
    }
};

// --- POST SERVICE ---
export const postService = {
    addPost: async (postData: any) => {
        const payload = { ...postData, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'posts'), payload);
        await supabaseMirror.upsert('posts', docRef.id, { id: docRef.id, ...payload });
    }
};

// --- SERVICE SERVICE ---
export const serviceService = {
    getServices: async (): Promise<Service[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Service>('services', { limit: 500 });
            if (mirrored.length > 0) return mirrored;
        }
        const snapshot = await getDocs(collection(db, 'services'));
        const services = snapshot.docs.map(doc => fromFirestore<Service>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(services.map(s => supabaseMirror.upsert('services', s.id, s)));
        }
        return services;
    },
    getServiceById: async (id: string): Promise<Service | undefined> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.get<Service>('services', id);
            if (mirrored) return { id, ...mirrored } as Service;
        }
        const docSnap = await getDoc(doc(db, 'services', id));
        return docSnap.exists() ? fromFirestore<Service>(docSnap) : undefined;
    },
    addService: async (serviceData: Partial<Service>, user: User) => {
        const payload = { 
            ...serviceData, 
            provider: { id: user.id, name: user.name, avatar: user.avatar, rating: 0, reviews: [] },
            avgRating: 0,
            reviews: []
        };
        const docRef = await addDoc(collection(db, 'services'), payload);
        await supabaseMirror.upsert('services', docRef.id, { id: docRef.id, ...payload });
    },
    getServicesByProvider: async (userId: string): Promise<Service[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Service>('services', { filters: { 'provider.id': userId } });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'services'), where('provider.id', '==', userId));
        const snapshot = await getDocs(q);
        const services = snapshot.docs.map(doc => fromFirestore<Service>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(services.map(s => supabaseMirror.upsert('services', s.id, s)));
        }
        return services;
    }
};

// --- PROVIDER SERVICE ---
export const providerService = {
    getProviderStats: async (userId: string) => {
        return { earnings: 500, activeJobs: 2, jobsCompleted: 10, rating: 4.8 };
    },
    getIncomingRequests: async (userId: string): Promise<Job[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<Job>('jobs', { filters: { providerId: userId, status: 'pending' } });
            if (mirrored.length > 0) return mirrored;
        }
        const q = query(collection(db, 'jobs'), where('providerId', '==', userId), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        const jobs = snapshot.docs.map(doc => fromFirestore<Job>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(jobs.map(j => supabaseMirror.upsert('jobs', j.id, j)));
        }
        return jobs;
    },
    getActiveJobs: async (userId: string): Promise<Job[]> => {
        if (supabaseMirror.enabled) {
            const jobs = await supabaseMirror.list<Job>('jobs', { filters: { providerId: userId } });
            if (jobs.length > 0) {
                return jobs.filter(job => ['confirmed', 'in_progress'].includes((job as any).status));
            }
        }
        const q = query(collection(db, 'jobs'), where('providerId', '==', userId), where('status', 'in', ['confirmed', 'in_progress']));
        const snapshot = await getDocs(q);
        const jobs = snapshot.docs.map(doc => fromFirestore<Job>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(jobs.map(j => supabaseMirror.upsert('jobs', j.id, j)));
        }
        return jobs;
    },
    updateJobStatus: async (jobId: string, status: string) => {
        await updateDoc(doc(db, 'jobs', jobId), { status });
        await supabaseMirror.mergeUpdate<Job>('jobs', jobId, { status } as Partial<Job>);
    }
};

// --- LIVESTREAM SERVICE ---
export const livestreamService = {
    getLiveStreams: async (): Promise<LiveStream[]> => {
        if (supabaseMirror.enabled) {
            const mirrored = await supabaseMirror.list<LiveStream>('livestreams', { limit: 200 });
            if (mirrored.length > 0) return mirrored;
        }
        const snapshot = await getDocs(collection(db, 'livestreams'));
        const streams = snapshot.docs.map(doc => fromFirestore<LiveStream>(doc));
        if (supabaseMirror.enabled) {
            await Promise.all(streams.map(s => supabaseMirror.upsert('livestreams', s.id, s)));
        }
        return streams;
    }
};

// Helper for date range array generation
function getDatesInRange(startDate: Date, endDate: Date) {
    const date = new Date(startDate.getTime());
    const dates = [];
    while (date <= endDate) {
        dates.push(new Date(date).toISOString().split('T')[0]);
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

function parseShippingEstimate(time?: string): ShippingEstimate | undefined {
    if (!time) return undefined;
    const rangeMatch = time.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
        return { minDays: Number(rangeMatch[1]), maxDays: Number(rangeMatch[2]) };
    }
    const singleMatch = time.match(/(\d+)/);
    if (singleMatch) {
        const days = Number(singleMatch[1]);
        return { minDays: days, maxDays: days };
    }
    return undefined;
}
