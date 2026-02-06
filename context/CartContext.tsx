
import React, { createContext, useState, useMemo, useCallback } from 'react';
import type { Item, SubscriptionDetails, CartGroup, CartItem } from '../types';
import { useNotification } from './NotificationContext';

interface CartContextType {
  cartGroups: CartGroup[];
  savedItems: CartItem[];
  addItemToCart: (item: Item, quantity: number, subscription?: SubscriptionDetails, rentalPeriod?: { startDate: string, endDate: string }) => void;
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

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We now maintain a flat list of items and derive groups dynamically
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  
  const { showNotification } = useNotification();

  // --- Cart Actions ---

  const addItemToCart = useCallback((item: Item, quantity: number, subscription?: SubscriptionDetails, rentalPeriod?: { startDate: string, endDate: string }) => {
    setCartItems(prev => {
        // If it's a rental, treat items with different dates as different line items (complex)
        // For simplicity in this demo, if item ID matches, we block adding again if it's rental
        const existingItem = prev.find(i => i.id === item.id);
        
        if (existingItem) {
            if (item.listingType === 'rent') {
                showNotification("This item is already in your cart.");
                return prev;
            }
            showNotification("Item quantity updated!");
            return prev.map(i => i.id === item.id ? { ...i, quantity: Math.min(i.quantity + quantity, item.stock || 99) } : i);
        }
        
        showNotification("Item added to cart!");
        return [...prev, { ...item, quantity, subscription, rentalPeriod }];
    });
  }, [showNotification]);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCartItems(prev => prev.map(item => {
        if (item.id === itemId) {
            return { ...item, quantity: Math.max(1, Math.min(quantity, item.stock || 99)) };
        }
        return item;
    }));
  }, []);

  const removeItemFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
    showNotification("Item removed from cart.");
  }, [showNotification]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCouponCode(null);
    setDiscountPercent(0);
  }, []);

  // --- Saved for Later Actions ---

  const saveForLater = useCallback((itemId: string) => {
      const itemToSave = cartItems.find(i => i.id === itemId);
      if (itemToSave) {
          setCartItems(prev => prev.filter(i => i.id !== itemId));
          setSavedItems(prev => [...prev, itemToSave]);
          showNotification("Saved for later.");
      }
  }, [cartItems, showNotification]);

  const moveToCart = useCallback((itemId: string) => {
      const itemToMove = savedItems.find(i => i.id === itemId);
      if (itemToMove) {
          setSavedItems(prev => prev.filter(i => i.id !== itemId));
          setCartItems(prev => [...prev, itemToMove]);
          showNotification("Moved back to cart.");
      }
  }, [savedItems, showNotification]);

  const removeSavedItem = useCallback((itemId: string) => {
      setSavedItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  // --- Coupon Logic ---

  const applyCoupon = useCallback((code: string) => {
      if (code.toUpperCase() === 'WELCOME10') {
          setCouponCode('WELCOME10');
          setDiscountPercent(0.10);
          showNotification("Coupon applied: 10% Off!");
          return true;
      }
      setCouponCode(null);
      setDiscountPercent(0);
      showNotification("Invalid coupon code.");
      return false;
  }, [showNotification]);

  // --- Derived State ---

  const cartGroups = useMemo(() => {
      const groups: Record<string, CartGroup> = {};
      
      cartItems.forEach(item => {
          const ownerId = item.owner.id;
          if (!groups[ownerId]) {
              groups[ownerId] = {
                  id: ownerId,
                  name: item.owner.businessName || item.owner.name || 'Unknown Seller',
                  items: []
              };
          }
          groups[ownerId].items.push(item);
      });

      return Object.values(groups);
  }, [cartItems]);

  const { cartCount, cartTotal, discountAmount } = useMemo(() => {
    const count = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cartItems.reduce((acc, item) => {
        let price = item.salePrice || item.rentalPrice || 0;
        
        // If rental, re-calculate based on dates if available
        if (item.listingType === 'rent' && item.rentalPeriod && item.rentalRates?.daily) {
             const start = new Date(item.rentalPeriod.startDate);
             const end = new Date(item.rentalPeriod.endDate);
             const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
             price = item.rentalRates.daily * Math.max(1, days);
        }

        return acc + (price * item.quantity);
    }, 0);
    
    const discount = subtotal * discountPercent;
    const total = subtotal; // Note: We return raw total here, final calculation with tax/shipping happens in OrderSummary

    return { cartCount: count, cartTotal: total, discountAmount: discount };
  }, [cartItems, discountPercent]);

  const value = useMemo(() => ({
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
  }), [
      cartGroups, cartItems, savedItems, addItemToCart, updateItemQuantity, removeItemFromCart, 
      saveForLater, moveToCart, removeSavedItem, clearCart, applyCoupon, 
      couponCode, discountAmount, cartCount, cartTotal
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
