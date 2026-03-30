import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Item, SubscriptionDetails, CartGroup, CartItem } from '../types';
import { useNotification } from './NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { itemService } from '../services/itemService';
import { spotlightService } from '../services/spotlightService';

interface CartContextType {
  cartGroups: CartGroup[];
  savedItems: CartItem[];
  addItemToCart: (
    item: Item,
    quantity: number,
    subscription?: SubscriptionDetails,
    rentalPeriod?: { startDate: string; endDate: string },
    transactionMode?: 'sale' | 'rent'
  ) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItemFromCart: (itemId: string) => void;
  saveForLater: (itemId: string) => void;
  moveToCart: (itemId: string) => void;
  removeSavedItem: (itemId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => boolean;
  couponCode: string | null;
  discountAmount: number;
  cartCount: number;
  cartTotal: number;
  cartItems: CartItem[];
}

type StoredCartState = {
  cartItems: CartItem[];
  savedItems: CartItem[];
  couponCode: string | null;
  discountPercent: number;
};

const CART_STORAGE_PREFIX = 'urbanprime_cart_v2_';
const CART_GUEST_KEY = `${CART_STORAGE_PREFIX}guest`;

const readStoredState = (key: string): StoredCartState | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      cartItems: Array.isArray(parsed.cartItems) ? parsed.cartItems : [],
      savedItems: Array.isArray(parsed.savedItems) ? parsed.savedItems : [],
      couponCode: typeof parsed.couponCode === 'string' ? parsed.couponCode : null,
      discountPercent: typeof parsed.discountPercent === 'number' ? parsed.discountPercent : 0
    };
  } catch {
    return null;
  }
};

const writeStoredState = (key: string, state: StoredCartState) => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // no-op
  }
};

const removeStoredState = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
};

const resolveTransactionMode = (item: Pick<CartItem, 'listingType' | 'transactionMode'>): 'sale' | 'rent' => {
  if (item.listingType === 'rent') return 'rent';
  if (item.listingType === 'both') return item.transactionMode === 'rent' ? 'rent' : 'sale';
  return 'sale';
};

const isRentCartItem = (item: Pick<CartItem, 'listingType' | 'transactionMode'>) => resolveTransactionMode(item) === 'rent';

const cartItemKey = (item: CartItem) => {
  const mode = resolveTransactionMode(item);
  if (mode === 'rent' && item.rentalPeriod) {
    return `${item.id}::rent::${item.rentalPeriod.startDate}::${item.rentalPeriod.endDate}`;
  }
  return `${item.id}::${mode}`;
};

const mergeCartLists = (base: CartItem[], incoming: CartItem[]): CartItem[] => {
  const map = new Map<string, CartItem>();
  [...base, ...incoming].forEach((item) => {
    const key = cartItemKey(item);
    if (!map.has(key)) {
      map.set(key, item);
      return;
    }
    const existing = map.get(key)!;
    map.set(key, { ...existing, quantity: Math.max(existing.quantity || 1, item.quantity || 1) });
  });
  return Array.from(map.values());
};

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [storageReady, setStorageReady] = useState(false);

  const { showNotification } = useNotification();
  const { user, activePersona } = useAuth();

  const storageKey = useMemo(() => {
    if (!user?.id) return CART_GUEST_KEY;
    const personaSuffix = activePersona?.id ? `_${activePersona.id}` : '';
    return `${CART_STORAGE_PREFIX}user_${user.id}${personaSuffix}`;
  }, [user?.id, activePersona?.id]);

  useEffect(() => {
    const currentState = readStoredState(storageKey) || {
      cartItems: [],
      savedItems: [],
      couponCode: null,
      discountPercent: 0
    };

    if (user?.id) {
      const guestState = readStoredState(CART_GUEST_KEY);
      if (guestState) {
        currentState.cartItems = mergeCartLists(currentState.cartItems, guestState.cartItems);
        currentState.savedItems = mergeCartLists(currentState.savedItems, guestState.savedItems);
        if (!currentState.couponCode && guestState.couponCode) {
          currentState.couponCode = guestState.couponCode;
          currentState.discountPercent = guestState.discountPercent;
        }
        removeStoredState(CART_GUEST_KEY);
      }
    }

    setCartItems(currentState.cartItems);
    setSavedItems(currentState.savedItems);
    setCouponCode(currentState.couponCode);
    setDiscountPercent(currentState.discountPercent);
    setStorageReady(true);
  }, [storageKey, user?.id]);

  useEffect(() => {
    if (!storageReady) return;
    writeStoredState(storageKey, {
      cartItems,
      savedItems,
      couponCode,
      discountPercent
    });
  }, [storageReady, storageKey, cartItems, savedItems, couponCode, discountPercent]);

  const addItemToCart = useCallback(
    (
      item: Item,
      quantity: number,
      subscription?: SubscriptionDetails,
      rentalPeriod?: { startDate: string; endDate: string },
      transactionMode?: 'sale' | 'rent'
    ) => {
      const resolvedMode: 'sale' | 'rent' =
        item.listingType === 'rent'
          ? 'rent'
          : item.listingType === 'both'
            ? (transactionMode === 'rent' ? 'rent' : 'sale')
            : 'sale';
      const alreadyInCart = cartItems.some((i) => i.id === item.id);
      setCartItems((prev) => {
        const incomingItem: CartItem = {
          ...item,
          quantity,
          subscription,
          rentalPeriod,
          transactionMode: resolvedMode
        };
        const existingItem = prev.find((i) => i.id === item.id);

        if (existingItem) {
          const existingMode = resolveTransactionMode(existingItem);
          if (item.listingType === 'both' && existingMode !== resolvedMode) {
            showNotification(`Listing mode switched to ${resolvedMode}.`);
            return prev.map((i) => (i.id === item.id ? { ...incomingItem, quantity: Math.max(1, quantity) } : i));
          }
          if (resolvedMode === 'rent') {
            const existingKey = cartItemKey(existingItem);
            const incomingKey = cartItemKey(incomingItem);
            if (existingKey !== incomingKey) {
              showNotification('Rental period updated in your cart.');
              return prev.map((i) => (i.id === item.id ? { ...incomingItem, quantity: Math.max(1, quantity) } : i));
            }
            showNotification('This item is already in your cart.');
            return prev;
          }
          showNotification('Item quantity updated!');
          return prev.map((i) =>
            i.id === item.id
              ? { ...i, quantity: Math.min((i.quantity || 1) + quantity, item.stock || 99) }
              : i
          );
        }

        showNotification('Item added to cart!');
        return [...prev, incomingItem];
      });

      if (!alreadyInCart && item.owner?.id && item.owner.id !== user?.id) {
        itemService
          .logItemEvent({
            action: 'cart_add',
            ownerId: item.owner.id,
            ownerPersonaId: item.ownerPersonaId || null,
            itemId: item.id,
            itemTitle: item.title,
            listingType: item.listingType,
            actorId: user?.id || null,
            actorPersonaId: activePersona?.id || null,
            actorName: user?.name || user?.email || 'Visitor',
            quantity,
            metadata: item.spotlightAttribution
              ? {
                  spotlightContentId: item.spotlightAttribution.spotlightContentId,
                  spotlightProductLinkId: item.spotlightAttribution.spotlightProductLinkId || null,
                  spotlightCampaignKey: item.spotlightAttribution.campaignKey || null,
                  spotlightAttributionExpiresAt: item.spotlightAttribution.expiresAt || null
                }
              : {}
          })
          .catch(() => {});
        if (item.spotlightAttribution?.spotlightContentId) {
          void spotlightService.trackProductEvent({
            content_id: item.spotlightAttribution.spotlightContentId,
            product_link_id: item.spotlightAttribution.spotlightProductLinkId || null,
            item_id: item.id,
            event_name: 'add_to_cart',
            campaign_key: item.spotlightAttribution.campaignKey || null,
            viewer_firebase_uid: user?.id || undefined,
            metadata: {
              transactionMode: resolveTransactionMode({
                listingType: item.listingType,
                transactionMode: resolvedMode
              }),
              quantity
            }
          }).catch(() => undefined);
        }
      }
    },
    [showNotification, cartItems, user, activePersona]
  );

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(1, Math.min(quantity, item.stock || 99)) };
        }
        return item;
      })
    );
  }, []);

  const removeItemFromCart = useCallback(
    (itemId: string) => {
      setCartItems((prev) => prev.filter((i) => i.id !== itemId));
      showNotification('Item removed from cart.');
    },
    [showNotification]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCouponCode(null);
    setDiscountPercent(0);
  }, []);

  const saveForLater = useCallback(
    (itemId: string) => {
      const itemToSave = cartItems.find((i) => i.id === itemId);
      if (itemToSave) {
        setCartItems((prev) => prev.filter((i) => i.id !== itemId));
        setSavedItems((prev) => [...prev, itemToSave]);
        showNotification('Saved for later.');
      }
    },
    [cartItems, showNotification]
  );

  const moveToCart = useCallback(
    (itemId: string) => {
      const itemToMove = savedItems.find((i) => i.id === itemId);
      if (itemToMove) {
        setSavedItems((prev) => prev.filter((i) => i.id !== itemId));
        setCartItems((prev) => [...prev, itemToMove]);
        showNotification('Moved back to cart.');
      }
    },
    [savedItems, showNotification]
  );

  const removeSavedItem = useCallback((itemId: string) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const applyCoupon = useCallback(
    (code: string) => {
      if (code.toUpperCase() === 'WELCOME10') {
        setCouponCode('WELCOME10');
        setDiscountPercent(0.1);
        showNotification('Coupon applied: 10% Off!');
        return true;
      }
      setCouponCode(null);
      setDiscountPercent(0);
      showNotification('Invalid coupon code.');
      return false;
    },
    [showNotification]
  );

  const cartGroups = useMemo(() => {
    const groups: Record<string, CartGroup> = {};

    cartItems.forEach((item) => {
      const ownerId = item.owner?.id || 'unknown-owner';
      if (!groups[ownerId]) {
        groups[ownerId] = {
          id: ownerId,
          name: item.owner?.businessName || item.owner?.name || 'Unknown Seller',
          items: []
        };
      }
      groups[ownerId].items.push(item);
    });

    return Object.values(groups);
  }, [cartItems]);

  const { cartCount, cartTotal, discountAmount } = useMemo(() => {
    const count = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
    const subtotal = cartItems.reduce((acc, item) => {
      const rentMode = isRentCartItem(item);
      let price = rentMode
        ? (item.rentalPrice || item.rentalRates?.daily || item.price || 0)
        : (item.salePrice || item.price || 0);

      if (rentMode && item.rentalPeriod && item.rentalRates?.daily) {
        const start = new Date(item.rentalPeriod.startDate);
        const end = new Date(item.rentalPeriod.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        price = item.rentalRates.daily * Math.max(1, days);
      }

      return acc + price * (item.quantity || 1);
    }, 0);

    const discount = subtotal * discountPercent;
    const total = subtotal;

    return { cartCount: count, cartTotal: total, discountAmount: discount };
  }, [cartItems, discountPercent]);

  const value = useMemo(
    () => ({
      cartGroups,
      cartItems,
      savedItems,
      addItemToCart,
      updateItemQuantity,
      removeItemFromCart,
      saveForLater,
      moveToCart,
      removeSavedItem,
      clearCart,
      applyCoupon,
      couponCode,
      discountAmount,
      cartCount,
      cartTotal
    }),
    [
      cartGroups,
      cartItems,
      savedItems,
      addItemToCart,
      updateItemQuantity,
      removeItemFromCart,
      saveForLater,
      moveToCart,
      removeSavedItem,
      clearCart,
      applyCoupon,
      couponCode,
      discountAmount,
      cartCount,
      cartTotal
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
