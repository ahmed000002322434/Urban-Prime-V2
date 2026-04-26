

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
// FIX: Import ItemCollection type
import type { Item, Badge, Store, ItemCollection, WishlistItem, WishlistItemComment } from '../types';

type ItemServiceModule = typeof import('../services/itemService');
type StorefrontServiceModule = typeof import('../services/storefrontService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;
let storefrontServiceModulePromise: Promise<StorefrontServiceModule> | null = null;

const loadItemServiceModule = () => {
  if (!itemServiceModulePromise) {
    itemServiceModulePromise = import('../services/itemService');
  }
  return itemServiceModulePromise;
};

const loadStorefrontServiceModule = () => {
  if (!storefrontServiceModulePromise) {
    storefrontServiceModulePromise = import('../services/storefrontService');
  }
  return storefrontServiceModulePromise;
};

const withUserService = async <T,>(
  callback: (service: ItemServiceModule['userService']) => Promise<T> | T
): Promise<T> => callback((await loadItemServiceModule()).userService);

const withStorefrontService = async <T,>(
  callback: (service: StorefrontServiceModule['storefrontService']) => Promise<T> | T
): Promise<T> => callback((await loadStorefrontServiceModule()).storefrontService);

interface UserDataContextType {
  wishlist: WishlistItem[];
  wishlistItems: Item[];
  badges: Badge[];
  storefront: Store | null;
  hasStore: boolean;
  isWishlisted: (itemId: string) => boolean;
  toggleWishlist: (itemId: string) => Promise<void>;
  isLoading: boolean;
  // FIX: Add collection properties to context type
  collections: ItemCollection[];
  createCollection: (name: string, description: string, isPublic: boolean) => Promise<void>;
  addItemToCollection: (collectionId: string, itemId: string) => Promise<void>;
  removeItemFromCollection: (collectionId: string, itemId: string) => Promise<void>;
  // FIX: Add updateCollection to the context type to allow components to update collection details.
  updateCollection: (collectionId: string, updates: Partial<ItemCollection>) => Promise<void>;
}

export const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Item[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [storefront, setStorefront] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // FIX: Add state for collections
  const [collections, setCollections] = useState<ItemCollection[]>([]);

  const fetchUserData = useCallback(async () => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      try {
        const [wishlistData, badgesData, storefrontData, collectionsData] = await Promise.all([
          withUserService((userService) => userService.getWishlistForUser(user.id)),
          withUserService((userService) => userService.getBadges(user.badges || [])),
          withStorefrontService((storefrontService) => storefrontService.getStorefrontByUserId(user.id)),
          withUserService((userService) => userService.getCollectionsForUser(user.id)),
        ]);
        
        // FIX: Correctly destructure the object returned by getWishlistForUser
        setWishlist(wishlistData.wishlist);
        setWishlistItems(wishlistData.items);
        setBadges(badgesData);
        setStorefront(storefrontData);
        setCollections(collectionsData);
      } catch (error) {
        console.error("Failed to load user data", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Clear data on logout
      setWishlist([]);
      setWishlistItems([]);
      setBadges([]);
      setStorefront(null);
      setCollections([]); // Clear collections on logout
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const isWishlisted = useCallback((itemId: string) => {
    return wishlist.some(item => item.itemId === itemId);
  }, [wishlist]);

  const toggleWishlist = useCallback(async (itemId: string) => {
    if (!user) return;
    
    // Optimistic UI update
    const wasWishlisted = isWishlisted(itemId);
    const tempWishlistItem: WishlistItem = { id: `temp-${Date.now()}`, itemId, addedAt: new Date().toISOString(), isPublic: true, likes: [], comments: [] };
    
    setWishlist(prev => 
        wasWishlisted 
            ? prev.filter(item => item.itemId !== itemId) 
            : [...prev, tempWishlistItem]
    );

    try {
      await withUserService((userService) => userService.toggleWishlist(user.id, itemId));
      // Fetch fresh data to ensure consistency
      fetchUserData();
    } catch (error) {
      console.error("Failed to toggle wishlist", error);
      // Revert optimistic update on error
       setWishlist(prev => 
        wasWishlisted 
            ? [...prev, tempWishlistItem]
            : prev.filter(item => item.itemId !== itemId)
      );
    }
  }, [user, isWishlisted, fetchUserData]);

  // FIX: Implement collection management functions
  const createCollection = useCallback(async (name: string, description: string, isPublic: boolean) => {
    if (!user) return;
    try {
        const newCollection = await withUserService((userService) =>
          userService.createCollection(user.id, name, description, isPublic)
        );
        setCollections(prev => [...prev, newCollection]);
    } catch (error) {
        console.error("Failed to create collection", error);
    }
  }, [user]);

  const addItemToCollection = useCallback(async (collectionId: string, itemId: string) => {
    if (!user) return;
    try {
        const updatedCollection = await withUserService((userService) =>
          userService.addItemToCollection(collectionId, itemId)
        );
        setCollections(prev => prev.map(c => c.id === collectionId ? updatedCollection : c));
    } catch (error) {
        console.error("Failed to add item to collection", error);
    }
  }, [user]);

  const removeItemFromCollection = useCallback(async (collectionId: string, itemId: string) => {
    if (!user) return;
    try {
        const updatedCollection = await withUserService((userService) =>
          userService.removeItemFromCollection(collectionId, itemId)
        );
        setCollections(prev => prev.map(c => c.id === collectionId ? updatedCollection : c));
    } catch (error) {
        console.error("Failed to remove item from collection", error);
    }
  }, [user]);

  // FIX: Implement the missing updateCollection function.
  const updateCollection = useCallback(async (collectionId: string, updates: Partial<ItemCollection>) => {
      if (!user) return;
      try {
          const updated = await withUserService((userService) => userService.updateCollection(collectionId, updates));
          setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, ...updated } : c));
      } catch (error) {
          console.error("Failed to update collection", error);
      }
  }, [user]);

  const value = useMemo(() => ({
    wishlist,
    wishlistItems,
    badges,
    storefront,
    hasStore: !!storefront,
    isWishlisted,
    toggleWishlist,
    isLoading,
    collections,
    createCollection,
    addItemToCollection,
    removeItemFromCollection,
    updateCollection,
  }), [wishlist, wishlistItems, badges, storefront, isWishlisted, toggleWishlist, isLoading, collections, createCollection, addItemToCollection, removeItemFromCollection, updateCollection]);

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};
