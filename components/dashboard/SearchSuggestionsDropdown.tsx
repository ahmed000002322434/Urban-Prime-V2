import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import LottieAnimation from '../LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

interface Suggestion {
  id: string;
  label: string;
  category: 'page' | 'feature' | 'action';
  icon: React.FC<{ className?: string }>;
  path: string;
  keywords: string[];
  description?: string;
  requiresSeller?: boolean;
  requiresProvider?: boolean;
  requiresAffiliate?: boolean;
}

const HomeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3-3" />
  </svg>
);

const ProductIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V16.5L12 21l9-4.5V7.5" />
  </svg>
);

const OrdersIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
  </svg>
);

const TrendIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v-7" />
  </svg>
);

const HeartIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const StarIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polygon points="12 2 15.09 10.26 24 10.27 17.18 16.63 20.27 24.79 12 18.43 3.73 24.79 6.82 16.63 0 10.27 8.91 10.26 12 2" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.8 1.8 0 0 0 .36 2l.03.03a2 2 0 1 1-2.83 2.83l-.03-.03a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.09 1.64V22a2 2 0 1 1-4 0v-.05a1.8 1.8 0 0 0-1.09-1.64 1.8 1.8 0 0 0-2 .36l-.03.03a2 2 0 0 1-2.83-2.83l.03-.03a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1.09H2a2 2 0 1 1 0-4h.05a1.8 1.8 0 0 0 1.64-1.09 1.8 1.8 0 0 0-.36-2l-.03-.03a2 2 0 1 1 2.83-2.83l.03.03a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.09-1.64V2a2 2 0 1 1 4 0v.05a1.8 1.8 0 0 0 1.09 1.64 1.8 1.8 0 0 0 2-.36l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.64 1.09H22a2 2 0 1 1 0 4h-.05a1.8 1.8 0 0 0-1.64 1.09z" />
  </svg>
);

const CreditCardIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const suggestions: Suggestion[] = [
  // Pages - Core
  { id: 'home', label: 'Home', category: 'page', icon: HomeIcon, path: '/profile', keywords: ['home', 'dashboard', 'overview', 'start'], description: 'Back to dashboard' },
  { id: 'orders', label: 'My Orders', category: 'page', icon: OrdersIcon, path: '/profile/orders', keywords: ['order', 'orders', 'purchase', 'buy', 'history'], description: 'View your orders' },
  { id: 'messages', label: 'Messages', category: 'page', icon: SearchIcon, path: '/profile/messages', keywords: ['message', 'messages', 'chat', 'inbox', 'communication'], description: 'See your messages' },
  { id: 'wishlist', label: 'Wishlist', category: 'page', icon: HeartIcon, path: '/profile/wishlist', keywords: ['wish', 'wishlist', 'saved', 'favorite', 'like'], description: 'Saved items' },

  // Pages - Seller only
  { id: 'products', label: 'Products', category: 'page', icon: ProductIcon, path: '/profile/products', keywords: ['product', 'products', 'catalog', 'items', 'listings'], description: 'Manage your products', requiresSeller: true },
  { id: 'sales', label: 'Sales', category: 'page', icon: OrdersIcon, path: '/profile/sales', keywords: ['sale', 'sales', 'sell', 'seller orders'], description: 'View sales', requiresSeller: true },
  { id: 'analytics-traffic', label: 'Traffic Analytics', category: 'page', icon: TrendIcon, path: '/store/manager/analytics/traffic', keywords: ['traffic', 'view', 'visitor', 'analytics', 'traffic analytics'], description: 'View traffic and visitors', requiresSeller: true },
  { id: 'analytics-revenue', label: 'Revenue Analytics', category: 'page', icon: TrendIcon, path: '/store/manager/analytics/revenue', keywords: ['revenue', 'earning', 'income', 'revenue analytics', 'money'], description: 'Check revenue', requiresSeller: true },
  { id: 'analytics-conversion', label: 'Conversion Analytics', category: 'page', icon: TrendIcon, path: '/store/manager/analytics/conversion', keywords: ['conversion', 'convert', 'funnel', 'conversion analytics', 'rate'], description: 'Conversion rates', requiresSeller: true },
  { id: 'analytics-sales-units', label: 'Sales Units', category: 'page', icon: TrendIcon, path: '/store/manager/analytics/sales-units', keywords: ['sales', 'units', 'quantity', 'sales units', 'sold'], description: 'Units sold', requiresSeller: true },
  { id: 'store', label: 'Online Store', category: 'page', icon: ProductIcon, path: '/profile/store', keywords: ['store', 'shop', 'online store', 'storefront', 'business'], description: 'Manage your store', requiresSeller: true },
  { id: 'coupons', label: 'Coupons & Discounts', category: 'page', icon: SearchIcon, path: '/profile/coupons', keywords: ['coupon', 'coupon', 'discount', 'promo', 'promotion', 'deal'], description: 'Create discounts', requiresSeller: true },
  { id: 'promotions', label: 'Promotions', category: 'page', icon: TrendIcon, path: '/profile/promotions', keywords: ['promotion', 'promotional', 'campaign', 'marketing', 'advertise'], description: 'Manage promotions', requiresSeller: true },
  { id: 'customers', label: 'Customers', category: 'page', icon: SearchIcon, path: '/profile/followed-stores', keywords: ['customer', 'customers', 'buyer', 'follower'], description: 'View customers', requiresSeller: true },
  { id: 'earnings', label: 'Earnings', category: 'page', icon: TrendIcon, path: '/profile/earnings', keywords: ['earning', 'earnings', 'income', 'revenue', 'payout'], description: 'Check earnings', requiresSeller: true },

  // Pages - Provider only
  { id: 'provider', label: 'Provider Dashboard', category: 'page', icon: ProductIcon, path: '/profile/provider-dashboard', keywords: ['provider', 'service', 'provider dashboard'], description: 'Provider workspace', requiresProvider: true },

  // Pages - General
  { id: 'reviews', label: 'My Reviews', category: 'page', icon: StarIcon, path: '/profile/reviews', keywords: ['review', 'reviews', 'rating', 'feedback', 'rate'], description: 'Your reviews' },
  { id: 'addresses', label: 'Addresses', category: 'page', icon: MapPinIcon, path: '/profile/settings/addresses', keywords: ['address', 'addresses', 'shipping', 'delivery', 'location'], description: 'Delivery addresses' },
  { id: 'payments', label: 'Payment Methods', category: 'page', icon: CreditCardIcon, path: '/payment-options', keywords: ['payment', 'payment method', 'card', 'billing', 'credit'], description: 'Payment options' },
  { id: 'notifications', label: 'Notifications', category: 'page', icon: BellIcon, path: '/profile/settings/notifications', keywords: ['notification', 'notifications', 'alert', 'alert settings'], description: 'Notification preferences' },
  { id: 'settings', label: 'Settings', category: 'page', icon: SettingsIcon, path: '/profile/settings', keywords: ['setting', 'settings', 'preference', 'config', 'configuration'], description: 'Account settings' },

  // Features/Actions
  { id: 'create-product', label: 'Create Product', category: 'action', icon: ProductIcon, path: '/profile/products/new', keywords: ['create', 'product', 'new', 'add', 'upload', 'list'], description: 'List a new product', requiresSeller: true },
  { id: 'help', label: 'Help & Support', category: 'feature', icon: BellIcon, path: '/help', keywords: ['help', 'support', 'assist', 'question', 'faq'], description: 'Get help' },
  { id: 'marketplace', label: 'Browse Marketplace', category: 'feature', icon: SearchIcon, path: '/', keywords: ['marketplace', 'browse', 'shop', 'explore', 'store'], description: 'Marketplace' },
];

interface SearchSuggestionsDropdownProps {
  query: string;
  isOpen: boolean;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
  query,
  isOpen,
  onNavigate,
  onClose
}) => {
  const { hasCapability, activePersona } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on query and capabilities
  const filteredSuggestions = React.useMemo(() => {
    if (!query.trim()) {
      // Show quick access items when empty
      return suggestions
        .filter(s => {
          if (s.requiresSeller && !hasCapability('sell')) return false;
          if (s.requiresProvider && !hasCapability('provide_service')) return false;
          return s.category === 'page';
        })
        .slice(0, 8);
    }

    const searchTerm = query.toLowerCase();
    const matched = suggestions.filter(s => {
      if (s.requiresSeller && !hasCapability('sell')) return false;
      if (s.requiresProvider && !hasCapability('provide_service')) return false;

      return (
        s.label.toLowerCase().includes(searchTerm) ||
        s.keywords.some(k => k.includes(searchTerm)) ||
        s.description?.toLowerCase().includes(searchTerm)
      );
    });

    return matched.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.label.toLowerCase() === searchTerm;
      const bExact = b.label.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then prioritize keyword matches
      const aKeyword = a.keywords.some(k => k === searchTerm);
      const bKeyword = b.keywords.some(k => k === searchTerm);
      if (aKeyword && !bKeyword) return -1;
      if (!aKeyword && bKeyword) return 1;

      return 0;
    }).slice(0, 12);
  }, [query, hasCapability]);

  // Group suggestions by category
  const groupedSuggestions = React.useMemo(() => {
    const groups: Record<string, Suggestion[]> = {
      feature: [],
      action: [],
      page: []
    };

    filteredSuggestions.forEach(s => {
      groups[s.category].push(s);
    });

    return groups;
  }, [filteredSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.12 }}
        className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-white/15 bg-[#1a1a1a] shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
      >
        {filteredSuggestions.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/60">
            <LottieAnimation src={uiLottieAnimations.noResults} className="h-20 w-20 mx-auto" loop autoplay />
            <p className="text-sm">No results found for "{query}"</p>
            <p className="text-xs mt-2">Try searching for pages, products, or features</p>
          </div>
        ) : (
          <div className="py-1">
            {/* Pages Group */}
            {groupedSuggestions.page.length > 0 && (
              <>
                {groupedSuggestions.page.map((suggestion, idx) => {
                  const Icon = suggestion.icon;
                  return (
                    <motion.button
                      key={suggestion.id}
                      onClick={() => {
                        onNavigate(suggestion.path);
                        onClose();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                      whileHover={{ x: 4 }}
                    >
                      <Icon className="h-4 w-4 text-white/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{suggestion.label}</div>
                        {suggestion.description && (
                          <div className="text-xs text-white/50 truncate">{suggestion.description}</div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </>
            )}

            {/* Actions Group */}
            {groupedSuggestions.action.length > 0 && (
              <>
                {groupedSuggestions.action.length > 0 && groupedSuggestions.page.length > 0 && (
                  <div className="my-1 border-t border-white/10" />
                )}
                {groupedSuggestions.action.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <motion.button
                      key={suggestion.id}
                      onClick={() => {
                        onNavigate(suggestion.path);
                        onClose();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                      whileHover={{ x: 4 }}
                    >
                      <Icon className="h-4 w-4 text-blue-400/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{suggestion.label}</div>
                        {suggestion.description && (
                          <div className="text-xs text-white/50 truncate">{suggestion.description}</div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </>
            )}

            {/* Features Group */}
            {groupedSuggestions.feature.length > 0 && (
              <>
                {(groupedSuggestions.page.length > 0 || groupedSuggestions.action.length > 0) && (
                  <div className="my-1 border-t border-white/10" />
                )}
                {groupedSuggestions.feature.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <motion.button
                      key={suggestion.id}
                      onClick={() => {
                        onNavigate(suggestion.path);
                        onClose();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                      whileHover={{ x: 4 }}
                    >
                      <Icon className="h-4 w-4 text-orange-400/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{suggestion.label}</div>
                        {suggestion.description && (
                          <div className="text-xs text-white/50 truncate">{suggestion.description}</div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchSuggestionsDropdown;
