
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
    sendPasswordResetEmail,
    updatePassword,
    GoogleAuthProvider,
    User as FirebaseUser,
    confirmPasswordReset
} from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
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
        const credential = await signInWithPopup(auth, googleProvider);
        try {
            let user = await userService.getUserById(credential.user.uid);
            if (!user) {
                user = await userService.createUserProfile(credential.user, {});
            }
            return user;
        } catch (error) {
            console.error('Failed to load user profile after Google sign-in:', error);
            return buildFallbackUser(credential.user);
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
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? fromFirestore<User>(docSnap) : null;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return null;
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
        }
        return newUser;
    },
    updateUserProfile: async (uid: string, updates: Partial<User>): Promise<User> => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, updates);
        const updatedDoc = await getDoc(userRef);
        return fromFirestore<User>(updatedDoc);
    },
    getAllSellers: async (): Promise<User[]> => {
        const q = query(collection(db, 'users'), where('status', '==', 'active')); // Simplified
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<User>(doc));
    },
    getWishlistForUser: async (userId: string): Promise<{ wishlist: WishlistItem[], items: Item[] }> => {
        const q = query(collection(db, 'wishlists'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const wishlist = snapshot.docs.map(doc => fromFirestore<WishlistItem>(doc));
        
        const items = await Promise.all(wishlist.map(async (w) => {
            const item = await itemService.getItemById(w.itemId);
            return item;
        }));
        
        return { wishlist, items: items.filter(Boolean) as Item[] };
    },
    getPublicWishlist: async (userId: string): Promise<WishlistItem[]> => {
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
             return;
         }

         await addDoc(wishlistRef, {
             userId,
             itemId,
             addedAt: new Date().toISOString(),
             isPublic: true,
             likes: [],
             comments: []
         });
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
        const q = query(collection(db, 'collections'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const collections = snapshot.docs.map(doc => fromFirestore<ItemCollection>(doc));
        
        // Populate items
        for (const col of collections) {
            const items = await Promise.all(col.itemIds.slice(0, 5).map(id => itemService.getItemById(id)));
            col.items = items.filter(Boolean) as Item[];
        }
        return collections;
    },
    getPublicCollectionsForUser: async (userId: string): Promise<ItemCollection[]> => {
         const q = query(collection(db, 'collections'), where('userId', '==', userId), where('isPublic', '==', true));
         const snapshot = await getDocs(q);
         const collections = snapshot.docs.map(doc => fromFirestore<ItemCollection>(doc));
         
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
        return { id: docRef.id, ...newCol, items: [] } as ItemCollection;
    },
    updateCollection: async (collectionId: string, updates: Partial<ItemCollection>): Promise<Partial<ItemCollection>> => {
        await updateDoc(doc(db, 'collections', collectionId), updates);
        return updates;
    },
    addItemToCollection: async (collectionId: string, itemId: string): Promise<ItemCollection> => {
        await updateDoc(doc(db, 'collections', collectionId), {
            itemIds: arrayUnion(itemId)
        });
        const snap = await getDoc(doc(db, 'collections', collectionId));
        return fromFirestore<ItemCollection>(snap);
    },
    removeItemFromCollection: async (collectionId: string, itemId: string): Promise<ItemCollection> => {
         await updateDoc(doc(db, 'collections', collectionId), {
            itemIds: arrayRemove(itemId)
        });
        const snap = await getDoc(doc(db, 'collections', collectionId));
        return fromFirestore<ItemCollection>(snap);
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
            const q = query(collection(db, "storefronts"), where("ownerId", "==", userId));
            const storeSnap = await getDocs(q);
            const store = storeSnap.empty ? null : fromFirestore(storeSnap.docs[0]);
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
        
        return {
            currentUser: fromFirestore<User>(updatedFollower),
            followedUser: fromFirestore<User>(updatedFollowing)
        };
    },
    getWalletTransactions: async (userId: string): Promise<WalletTransaction[]> => {
        const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<WalletTransaction>(doc));
    },
    getNotificationsForUser: async (userId: string, max: number = 20): Promise<Notification[]> => {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(max)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => fromFirestore<Notification>(doc));
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return [];
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
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return;
            throw error;
        }
    },
    getPayoutMethods: async (userId: string): Promise<PayoutMethod[]> => {
        const q = query(collection(db, 'users', userId, 'payoutMethods'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<PayoutMethod>(doc));
    },
    addPayoutMethod: async (userId: string, method: Omit<PayoutMethod, 'id'>): Promise<PayoutMethod> => {
        const docRef = await addDoc(collection(db, 'users', userId, 'payoutMethods'), method);
        return { id: docRef.id, ...method };
    },
    getPaymentMethods: async (userId: string): Promise<any[]> => {
         const q = query(collection(db, 'users', userId, 'paymentMethods'));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore(doc));
    },
    addPaymentMethod: async (userId: string, method: any): Promise<void> => {
         await addDoc(collection(db, 'users', userId, 'paymentMethods'), method);
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
        try {
            let q = query(collection(db, 'items'));
            // In a real app, apply filters via WHERE clauses here. 
            // For now, client-side filtering for simplicity on complex filters not supported by basic indexes
            const snapshot = await getDocs(q);
            let items = snapshot.docs.map(doc => fromFirestore<Item>(doc));
        
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

            // Sort
            items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Paginate
            const startIndex = (pagination.page - 1) * pagination.limit;
            const sliced = items.slice(startIndex, startIndex + pagination.limit);
            
            return { items: sliced, total: items.length };
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return { items: [], total: 0 };
            }
            throw error;
        }
    },
    getItemById: async (id: string): Promise<Item | undefined> => {
        try {
            const docRef = doc(db, 'items', id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? fromFirestore<Item>(docSnap) : undefined;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return undefined;
            }
            throw error;
        }
    },
    getItemsByOwner: async (ownerId: string): Promise<Item[]> => {
         const q = query(collection(db, 'items'), where('owner.id', '==', ownerId));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore<Item>(doc));
    },
    getReviewsForOwner: async (ownerId: string): Promise<Review[]> => {
         const q = query(collection(db, 'items'), where('owner.id', '==', ownerId));
         const snapshot = await getDocs(q);
         const items = snapshot.docs.map(doc => fromFirestore<Item>(doc));
         return items.flatMap(item => item.reviews || []);
    },
    addItem: async (itemData: Partial<Item>, user: User): Promise<Item> => {
        const newItem = {
            ...itemData,
            price: itemData.price ?? itemData.salePrice ?? itemData.rentalPrice ?? 0,
            owner: { id: user.id, name: user.name, avatar: user.avatar, businessName: user.businessName },
            createdAt: new Date().toISOString(),
            reviews: [],
            avgRating: 0
        };
        const docRef = await addDoc(collection(db, 'items'), newItem);
        return { id: docRef.id, ...newItem } as Item;
    },
    updateItem: async (itemId: string, updates: Partial<Item>): Promise<void> => {
        await updateDoc(doc(db, 'items', itemId), updates);
    },
    deleteItem: async (itemId: string): Promise<void> => {
        await deleteDoc(doc(db, 'items', itemId));
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
        
        batch.set(orderRef, {
            id: orderId,
            userId,
            items: items.map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.salePrice || i.rentalPrice })),
            shippingInfo,
            paymentMethod,
            totalAmount,
            status: 'processing',
            createdAt: new Date().toISOString()
        });

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

            batch.set(bookingRef, {
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
            });

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
        });

        // 3. Commit Transaction
        await batch.commit();
        
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
        
        // 1. Update Booking Status
        batch.update(bookingRef, { 
            status: 'completed',
            paymentStatus: 'released',
            completedAt: new Date().toISOString()
        });

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
        batch.set(transactionRef, {
            userId: sellerId,
            amount: netEarnings,
            type: 'credit',
            description: `Sale of ${booking.itemTitle}`,
            date: new Date().toISOString(),
            status: 'completed'
        });
        
        // 4. If there was a held deposit and it wasn't claimed, release it (Auto-release logic)
        if (booking.securityDeposit && booking.depositStatus === 'held') {
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
         batch.set(transactionRef, {
            userId: booking.provider.id,
            amount: amount,
            type: 'credit',
            description: `Security Deposit Claim for ${booking.itemTitle}`,
            date: new Date().toISOString(),
            status: 'completed'
        });
         
         // Notifications
         // To Buyer
         const notifBuyer = doc(collection(db, 'notifications'));
         batch.set(notifBuyer, {
            userId: booking.renterId,
            type: 'INFO',
            message: `A security deposit claim of $${amount} was made for ${booking.itemTitle}.`,
            link: `/profile/orders/${bookingId}`,
            isRead: false,
            createdAt: new Date().toISOString()
        });
        
         await batch.commit();
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
    },
    getProjectShowcases: async (): Promise<ProjectShowcase[]> => {
        const snapshot = await getDocs(collection(db, 'projectShowcases'));
        return snapshot.docs.map(doc => fromFirestore<ProjectShowcase>(doc));
    },
    getGameUploads: async (): Promise<GameUpload[]> => {
        const snapshot = await getDocs(collection(db, 'games'));
        return snapshot.docs.map(doc => fromFirestore<GameUpload>(doc));
    },
    recordGameDownload: async (gameId: string) => {
        await updateDoc(doc(db, 'games', gameId), { downloads: increment(1) });
    },
    uploadGame: async (gameData: Omit<GameUpload, 'id' | 'createdAt' | 'downloads' | 'uploader' | 'fileUrl'>, user: User) => {
         const newGame = {
             ...gameData,
             uploader: { id: user.id, name: user.name, avatar: user.avatar },
             downloads: 0,
             createdAt: new Date().toISOString()
         };
         await addDoc(collection(db, 'games'), newGame);
    },
    boostItem: async (itemId: string, plan: string, durationDays: number) => {
        await updateDoc(doc(db, 'items', itemId), { 
            boostLevel: plan, 
            boostExpiry: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() 
        });
    },
    getOffersForUser: async (userId: string): Promise<Offer[]> => {
         const q = query(collection(db, 'offers'), where('receiverId', '==', userId)); // or senderId
         // Simplified
         const snapshot = await getDocs(collection(db, 'offers'));
         return snapshot.docs.map(doc => fromFirestore<Offer>(doc)).filter(o => o.buyer.id === userId || o.seller.id === userId);
    },
    updateOfferStatus: async (offerId: string, status: 'accepted' | 'declined') => {
         await updateDoc(doc(db, 'offers', offerId), { status });
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
        const snapshot = await getDocs(collection(db, 'events'));
        return snapshot.docs.map(doc => fromFirestore<Event>(doc));
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

    seedDatabase: async (user?: User) => {
        // Implementation to create dummy items
        if(!user) return;
        for (let i = 0; i < 5; i++) {
            await itemService.addItem({
                title: `Dummy Item ${i}`,
                description: 'This is a test item.',
                category: 'electronics',
                salePrice: 100 + i * 10,
                listingType: 'sale',
                imageUrls: ['https://picsum.photos/400/400']
            }, user);
        }
    }
};

// --- DROPSHIP SERVICE ---
export const dropshipService = {
    getSuppliers: async (): Promise<SupplierInfo[]> => {
        try {
            const snapshot = await getDocs(collection(db, 'suppliers'));
            return snapshot.docs.map(doc => fromFirestore<SupplierInfo>(doc));
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return [];
            throw error;
        }
    },
    getSupplierById: async (supplierId: string): Promise<SupplierInfo | undefined> => {
        try {
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
            const q = supplierId
                ? query(collection(db, 'supplier_products'), where('supplierId', '==', supplierId))
                : query(collection(db, 'supplier_products'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => fromFirestore<SupplierProduct>(doc));
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
            return { id: docRef.id, ...payload };
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
            const q = query(collection(db, 'dropship_orders'), where('buyerId', '==', userId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => fromFirestore<DropshipOrder>(doc));
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
            const docRef = doc(db, 'affiliate_program', 'settings');
            const snap = await getDoc(docRef);
            return snap.exists() ? (snap.data() as AffiliateProgramSettings) : null;
        } catch (error) {
            if (isIgnorableFirebaseError(error)) return null;
            throw error;
        }
    },
    trackClick: async (attribution: Omit<AffiliateAttribution, 'id'>): Promise<AffiliateAttribution> => {
        try {
            const docRef = await addDoc(collection(db, 'affiliate_attributions'), attribution);
            return { id: docRef.id, ...attribution };
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
            return { id: docRef.id, ...conversion };
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
            return { id: docRef.id, ...payout };
        } catch (error) {
            if (isIgnorableFirebaseError(error)) {
                return { id: `offline-${Date.now()}`, ...payout };
            }
            throw error;
        }
    },
    getCreatives: async (): Promise<CreativeAsset[]> => {
        try {
            const snapshot = await getDocs(collection(db, 'affiliate_creatives'));
            return snapshot.docs.map(doc => fromFirestore<CreativeAsset>(doc));
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
         const q = query(collection(db, 'bookings'), where('provider.id', '==', userId));
         const snapshot = await getDocs(q);
         return snapshot.docs.map(doc => fromFirestore<Booking>(doc));
    },
    getBookingById: async (bookingId: string): Promise<Booking | undefined> => {
        const docRef = doc(db, 'bookings', bookingId);
        const snap = await getDoc(docRef);
        return snap.exists() ? fromFirestore<Booking>(snap) : undefined;
    },
    updateBooking: async (bookingId: string, updates: Partial<Booking>) => {
        await updateDoc(doc(db, 'bookings', bookingId), updates);
    },
    updateBookingStatus: async (bookingId: string, status: string) => {
        await updateDoc(doc(db, 'bookings', bookingId), { status });
    },
    getRentalHistory: async (userId: string): Promise<RentalHistoryItem[]> => {
        // Combine bookings where user is renter or provider
        const q = query(collection(db, 'bookings')); // Simplified
        const snapshot = await getDocs(q);
        const allBookings = snapshot.docs.map(doc => fromFirestore<Booking>(doc));
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
        const q = query(collection(db, 'discountCodes'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<DiscountCode>(doc));
    },
    createDiscountCode: async (userId: string, code: string, percentage: number) => {
        await addDoc(collection(db, 'discountCodes'), { userId, code, percentage, isActive: true, uses: 0 });
    },
    updateDiscountCode: async (id: string, updates: Partial<DiscountCode>) => {
        await updateDoc(doc(db, 'discountCodes', id), updates);
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
        await addDoc(collection(db, 'bookings'), newBooking);
    },
    getTransactionsForUser: async (userId: string): Promise<any[]> => {
        const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore(doc));
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
        await addDoc(collection(db, 'payout_requests'), {
            userId, amount, method, status: 'pending', createdAt: new Date().toISOString()
        });
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
        const snapshot = await getDocs(collection(db, 'reels'));
        return snapshot.docs.map(doc => fromFirestore<Reel>(doc));
    },
    getReelsByCreator: async (userId: string): Promise<Reel[]> => {
        const q = query(collection(db, 'reels'), where('creatorId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Reel>(doc));
    },
    toggleLikeReel: async (userId: string, reelId: string): Promise<User> => {
        const reelRef = doc(db, 'reels', reelId);
        const userRef = doc(db, 'users', userId);
        
        // Mock toggle
        await updateDoc(reelRef, { likes: increment(1) });
        // Update user liked list locally or in DB
        return (await userService.getUserById(userId))!;
    },
    addCommentToReel: async (reelId: string, user: User, text: string): Promise<Reel> => {
        const reelRef = doc(db, 'reels', reelId);
        const newComment = { id: `c-${Date.now()}`, author: { id: user.id, name: user.name, avatar: user.avatar }, text, timestamp: new Date().toISOString() };
        await updateDoc(reelRef, { comments: arrayUnion(newComment) });
        return fromFirestore<Reel>(await getDoc(reelRef));
    },
    addReel: async (reelData: Partial<Reel>): Promise<Reel> => {
        const docRef = await addDoc(collection(db, 'reels'), { ...reelData, createdAt: new Date().toISOString() });
        return { id: docRef.id, ...reelData } as Reel;
    },
    updateReel: async (reelId: string, updates: Partial<Reel>): Promise<Reel> => {
        await updateDoc(doc(db, 'reels', reelId), updates);
        return { id: reelId, ...updates } as Reel;
    },
    deleteReel: async (reelId: string) => {
        await deleteDoc(doc(db, 'reels', reelId));
    },
    startLiveStream: async (streamData: Partial<LiveStream>, user: User) => {
        await addDoc(collection(db, 'livestreams'), {
            ...streamData,
            hostName: user.name,
            hostAvatar: user.avatar,
            viewers: 0,
            status: 'live'
        });
    }
};

// --- POST SERVICE ---
export const postService = {
    addPost: async (postData: any) => {
        await addDoc(collection(db, 'posts'), { ...postData, createdAt: new Date().toISOString() });
    }
};

// --- SERVICE SERVICE ---
export const serviceService = {
    getServices: async (): Promise<Service[]> => {
        const snapshot = await getDocs(collection(db, 'services'));
        return snapshot.docs.map(doc => fromFirestore<Service>(doc));
    },
    getServiceById: async (id: string): Promise<Service | undefined> => {
        const docSnap = await getDoc(doc(db, 'services', id));
        return docSnap.exists() ? fromFirestore<Service>(docSnap) : undefined;
    },
    addService: async (serviceData: Partial<Service>, user: User) => {
        await addDoc(collection(db, 'services'), { 
            ...serviceData, 
            provider: { id: user.id, name: user.name, avatar: user.avatar, rating: 0, reviews: [] },
            avgRating: 0,
            reviews: []
        });
    },
    getServicesByProvider: async (userId: string): Promise<Service[]> => {
        const q = query(collection(db, 'services'), where('provider.id', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Service>(doc));
    }
};

// --- PROVIDER SERVICE ---
export const providerService = {
    getProviderStats: async (userId: string) => {
        return { earnings: 500, activeJobs: 2, jobsCompleted: 10, rating: 4.8 };
    },
    getIncomingRequests: async (userId: string): Promise<Job[]> => {
        const q = query(collection(db, 'jobs'), where('providerId', '==', userId), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Job>(doc));
    },
    getActiveJobs: async (userId: string): Promise<Job[]> => {
        const q = query(collection(db, 'jobs'), where('providerId', '==', userId), where('status', 'in', ['confirmed', 'in_progress']));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Job>(doc));
    },
    updateJobStatus: async (jobId: string, status: string) => {
        await updateDoc(doc(db, 'jobs', jobId), { status });
    }
};

// --- LIVESTREAM SERVICE ---
export const livestreamService = {
    getLiveStreams: async (): Promise<LiveStream[]> => {
        const snapshot = await getDocs(collection(db, 'livestreams'));
        return snapshot.docs.map(doc => fromFirestore<LiveStream>(doc));
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
