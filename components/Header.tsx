
// components/Header.tsx
// FIX: Corrected the React import to include necessary hooks like useState, useRef, useEffect, and useCallback.
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import type { ChatThread, Item, Notification, PersonaType, User } from '../types';
import Spinner from './Spinner';
import { useTranslation } from '../hooks/useTranslation';
import { useHeroStyle } from '../context/HeroStyleContext';
import { useTheme } from '../hooks/useTheme';
import { useNotification } from '../context/NotificationContext';
import useLowEndMode from '../hooks/useLowEndMode';
import BackButton from './BackButton';
import LogoutConfirmationModal from './LogoutConfirmationModal';
import LottieAnimation from './LottieAnimation';
import { authAvatarIcons, uiLottieAnimations } from '../utils/uiAnimationAssets';
import { enforceAvatarIdentity } from '../utils/avatarEnforcement';
import { prefetchRoute } from '../utils/routePrefetch';
import { buildPublicProfilePath } from '../utils/profileIdentity';

const { Link: RouterLink, NavLink: RouterNavLink, useLocation, useNavigate } = ReactRouterDOM as any;
type ItemServiceModule = typeof import('../services/itemService');

let itemServiceModulePromise: Promise<ItemServiceModule> | null = null;

const loadItemServiceModule = () => {
    if (!itemServiceModulePromise) {
        itemServiceModulePromise = import('../services/itemService');
    }

    return itemServiceModulePromise;
};

const profileAvatarFallback = authAvatarIcons.male;
const GENERIC_INBOX_NAMES = new Set([
    'user',
    'new user',
    'urban prime user',
    'urban prime member',
    'seller',
    'buyer',
    'codex seller',
    'codexseller',
    'newseller',
    'newbuyer',
    'loading profile'
]);
const normalizeInboxIdentityLabel = (value?: string | null) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_\-.]+/g, ' ')
        .replace(/\s+/g, ' ');
const isGenericInboxIdentity = (value?: string | null) => {
    const normalized = normalizeInboxIdentityLabel(value);
    return !normalized || GENERIC_INBOX_NAMES.has(normalized) || /\b(user|seller|buyer|member)\b/i.test(normalized);
};
const resolveProfileAvatar = (user?: Partial<User> | null) => {
    const identity = enforceAvatarIdentity({
        name: user?.name,
        username: user?.username,
        email: user?.email,
        gender: user?.gender,
        avatar: user?.avatar
    });
    return String(identity.avatar || '').trim() || profileAvatarFallback;
};
const isInboxProfileHydrating = (user?: Partial<User> | null) =>
    !user
    || isGenericInboxIdentity(user.name)
    || (!String(user.username || '').trim() && !String(user.email || '').trim());

const attachPrefetch =
    (to: any, callback?: (event: any) => void) =>
    (event: any) => {
        prefetchRoute(to);
        callback?.(event);
    };

const Link = React.forwardRef<HTMLAnchorElement, any>(({ onFocus, onMouseEnter, onTouchStart, to, ...props }, ref) => (
    <RouterLink
        ref={ref}
        to={to}
        onMouseEnter={attachPrefetch(to, onMouseEnter)}
        onFocus={attachPrefetch(to, onFocus)}
        onTouchStart={attachPrefetch(to, onTouchStart)}
        {...props}
    />
));

Link.displayName = 'HeaderPrefetchLink';

const NavLink = React.forwardRef<HTMLAnchorElement, any>(({ onFocus, onMouseEnter, onTouchStart, to, ...props }, ref) => (
    <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={attachPrefetch(to, onMouseEnter)}
        onFocus={attachPrefetch(to, onFocus)}
        onTouchStart={attachPrefetch(to, onTouchStart)}
        {...props}
    />
));

NavLink.displayName = 'HeaderPrefetchNavLink';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ReelsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 5.564v12.872a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V5.564a2 2 0 0 0-2-2h-15a2 2 0 0 0-2 2z"></path><path d="m10 10.436 5 3.076-5 3.076v-6.152z"></path><path d="M7 3.564v-2"></path><path d="M12 3.564v-2"></path><path d="M17 3.564v-2"></path></svg>;
const SpotlightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.2l2.1 5.2L19 10.5l-4.9 2.1L12 18l-2.1-5.4L5 10.5l4.9-2.1z"></path><circle cx="12" cy="12" r="2"></circle></svg>;
const BattleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 17.5 7.5-7.5-2.5-2.5-7.5 7.5-2.5-2.5L2 22"/><path d="m18 14 4-4"/><path d="m6 8 4 4"/><path d="M3 21l7-7"/></svg>;
const LiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const GenieIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
const DiamondIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>;
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18l-1.5-4.5h-15L3 7z"/><path d="M5 7v12h14V7"/><path d="M9 19v-6h6v6"/></svg>;

// --- DROPDOWN ICONS ---
const SupportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.504 1.012 4.735 2.636 6.364L2 22l3.636-2.636A9.955 9.955 0 0 0 12 22z"/><path d="M8 14c.43.86 2.43 2.29 4 2.29s3.57-1.43 4-2.29"/></svg>;
const PakistanFlagIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11.5" fill="#14573C" stroke="#EAEAEA" strokeWidth="0.5"/><path d="M15.195 8.32C14.7731 9.47171 13.7225 10.2783 12.87 10.43C13.8812 10.7419 14.5443 11.6644 14.67 12.85C15.1432 11.8349 15.9392 11.082 16.5 10.85C15.8953 10.2217 15.2892 9.25514 15.195 8.32Z" fill="white"/><path d="M16.5 10.05L15.9886 11.4623L14.5 11.05L15.6114 12.1377L15.5 13.8L16.5 12.9L17.5 13.8L17.3886 12.1377L18.5 11.05L17.0114 11.4623L16.5 10.05Z" fill="white"/></svg>);
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>;
const ReviewIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="m15 5 3 3"/></svg>;
const CouponIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a2 2 0 1 0-4 0v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a4 4 0 1 1 8 0Z"/><path d="M2 16.22V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.78c0-1.07-1.28-1.74-2.22-1.21-.52.29-1.04.53-1.58.7-1.12.35-2.28 0-3.2-1a4 4 0 0 0-4 0c-.92 1-2.08 1.35-3.2 1-.54-.17-1.06-.4-1.58-.7C3.28 14.48 2 15.15 2 16.22Z"/></svg>;
const BalanceIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line><path d="M12 14a2 2 0 1 0-2-2"></path><path d="M10 14a2 2 0 1 0 2-2"></path></svg>;
const FollowedStoreIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>;
const PermissionsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><path d="m10 10 2 2 4-4"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const SwitchAccountsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>;
const LogOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const HeadphonesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2z"/></svg>;
const MessageSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const MoreHorizontalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>;
const PurchaseProtectionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 10h6"/><path d="M9 14h4"/></svg>;
const AdminPanelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="3" y="15" width="7" height="5" /><rect x="14" y="11" width="7" height="9" /></svg>;


// --- DROPDOWN COMPONENTS ---
const AccountMenu: React.FC<{
    user: User;
    activePersonaType?: PersonaType;
    onLogout: () => void;
    onClose: () => void;
}> = ({ user, activePersonaType, onLogout, onClose }) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const quickActions = [
        { icon: <AdminPanelIcon />, text: 'Dashboard', path: '/profile' },
        { icon: <UserIcon />, text: 'Profile', path: buildPublicProfilePath(user) },
        { icon: <ShieldCheckIcon />, text: 'Settings', path: '/profile/settings' }
    ];

    const workspaceItems = (() => {
        if (activePersonaType === 'seller') {
            return [
                { icon: <StoreIcon />, text: 'Store', path: '/profile/store' },
                { icon: <ListIcon />, text: 'Products', path: '/profile/products' },
                { icon: <ListIcon />, text: 'Sales', path: '/profile/sales' },
                { icon: <BalanceIcon />, text: 'Earnings', path: '/profile/earnings' }
            ];
        }
        if (activePersonaType === 'provider') {
            return [
                { icon: <ListIcon />, text: 'Provider dashboard', path: '/profile/provider' },
                { icon: <ListIcon />, text: 'Hub profile', path: '/profile/provider/hub-profile' },
                { icon: <ListIcon />, text: 'Create service', path: '/profile/provider/services/new' },
                { icon: <ClockIcon />, text: 'Workflows', path: '/profile/workflows' }
            ];
        }
        if (activePersonaType === 'affiliate') {
            return [
                { icon: <CouponIcon />, text: 'Affiliate center', path: '/profile/affiliate' },
                { icon: <ClockIcon />, text: 'Promotions', path: '/profile/promotions' }
            ];
        }
        return [
            { icon: <ListIcon />, text: 'Your orders', path: '/profile/orders' },
            { icon: <ListIcon />, text: 'Wishlist', path: '/profile/wishlist' },
            { icon: <ClockIcon />, text: 'Browsing history', path: '/profile/history' }
        ];
    })();

    const sections = [
        {
            title: 'Workspace',
            items: workspaceItems
        },
        {
            title: 'My Activity',
            items: [
                { icon: <ReviewIcon />, text: 'Your reviews', path: '/profile/reviews' },
                { icon: <FollowedStoreIcon />, text: 'Followed stores', path: '/profile/followed-stores' },
                { icon: <CouponIcon />, text: 'Coupons & offers', path: '/profile/coupons' },
                { icon: <BalanceIcon />, text: 'Credit balance', path: '/profile/wallet' }
            ]
        },
        {
            title: 'Account',
            items: [
                { icon: <MapPinIcon />, text: 'Addresses', path: '/profile/settings/addresses' },
                { icon: <PakistanFlagIcon />, text: 'Language & region', path: '/profile/settings/language' },
                { icon: <ShieldCheckIcon />, text: 'Account security', path: '/profile/settings/trust-and-verification' },
                { icon: <PermissionsIcon />, text: 'Permissions', path: '/profile/permissions' },
                { icon: <SwitchAccountsIcon />, text: 'Switch accounts', path: '/profile/switch-accounts' }
            ]
        }
    ];

    const handleAutoScroll = (event: React.MouseEvent<HTMLDivElement>) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const bounds = container.getBoundingClientRect();
        const threshold = 64;
        const maxStep = 22;
        const fromTop = event.clientY - bounds.top;
        const fromBottom = bounds.bottom - event.clientY;

        if (fromTop < threshold) {
            const ratio = (threshold - Math.max(fromTop, 0)) / threshold;
            container.scrollTop -= Math.ceil(maxStep * ratio);
        } else if (fromBottom < threshold) {
            const ratio = (threshold - Math.max(fromBottom, 0)) / threshold;
            container.scrollTop += Math.ceil(maxStep * ratio);
        }
    };

    const handleLogoutClick = () => {
        onClose();
        onLogout();
    };

    return (
        <div className="absolute top-full right-0 mt-2 w-[320px] bg-surface rounded-2xl shadow-2xl border border-border z-50 animate-dropdown-fade-in-up overflow-hidden">
            <div className="p-4 border-b border-border bg-surface/80">
                <div className="flex items-center gap-3">
                    <img
                        src={resolveProfileAvatar(user)}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover bg-surface-soft"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = profileAvatarFallback; }}
                    />
                    <div>
                        <p className="font-bold text-text-primary">{user.name}</p>
                        <p className="text-xs text-text-secondary">{user.email || 'Urban Prime member'}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {quickActions.map(action => (
                        <Link
                            key={action.text}
                            to={action.path}
                            onClick={onClose}
                            className="flex flex-col items-center gap-1 py-2 rounded-xl border border-border bg-surface-soft text-xs font-semibold text-text-primary hover:border-primary"
                        >
                            <span className="text-text-secondary">{action.icon}</span>
                            <span>{action.text}</span>
                        </Link>
                    ))}
                </div>
            </div>
            <div
                ref={scrollContainerRef}
                className="max-h-[60vh] overflow-y-auto"
                onMouseMove={handleAutoScroll}
            >
                {user.isAdmin && (
                    <div className="px-4 py-3 border-b border-border">
                        <Link
                            to="/admin/dashboard"
                            onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-surface-soft"
                        >
                            <AdminPanelIcon /> Admin Panel
                        </Link>
                    </div>
                )}
                {sections.map(section => (
                    <div key={section.title} className="px-4 py-3 border-b border-border last:border-0">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary mb-2">{section.title}</p>
                        <ul className="space-y-1">
                            {section.items.map(item => (
                                <li key={item.text}>
                                    <Link
                                        to={item.path}
                                        onClick={onClose}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary"
                                    >
                                        <span className="w-9 h-9 rounded-full bg-surface-soft flex items-center justify-center text-text-secondary">
                                            {item.icon}
                                        </span>
                                        <span className="font-medium">{item.text}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                <div className="px-4 py-3">
                    <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary"
                    >
                        <span className="w-9 h-9 rounded-full bg-surface-soft flex items-center justify-center text-text-secondary">
                            <LogOutIcon />
                        </span>
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

const PulseLine: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse rounded-full bg-surface-soft/90 ${className}`}></div>
);

const NotificationMenuSkeleton = () => (
    <div className="p-3 space-y-3">
        {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface-soft/50 p-3">
                <PulseLine className="h-4 w-3/4" />
                <PulseLine className="mt-2 h-3 w-1/2" />
            </div>
        ))}
    </div>
);

const SearchResultsSkeleton = () => (
    <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft/40 p-3 animate-pulse">
                <div className="h-12 w-12 rounded-lg bg-surface-soft"></div>
                <div className="flex-1 space-y-2">
                    <PulseLine className="h-3.5 w-3/4" />
                    <PulseLine className="h-3 w-1/4" />
                </div>
            </div>
        ))}
    </div>
);

const NotificationMenu: React.FC<{ notifications: Notification[], onMarkAsRead: () => void, unreadCount: number, isLoading?: boolean }> = ({ notifications, onMarkAsRead, unreadCount, isLoading = false }) => {
    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface rounded-lg shadow-2xl border border-border z-50 animate-dropdown-fade-in-up">
            <div className="p-3 border-b border-border flex justify-between items-center">
                <h4 className="font-bold text-text-primary">Notifications</h4>
                {unreadCount > 0 && <button onClick={onMarkAsRead} className="text-xs font-semibold text-primary hover:underline">Mark all as read</button>}
            </div>
            {isLoading ? (
                <NotificationMenuSkeleton />
            ) : notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-secondary">You have no new notifications.</p>
            ) : (
                <ul className="py-2 max-h-80 overflow-y-auto">
                    {notifications.map(notif => (
                        <li key={notif.id}>
                            <Link to={notif.link || '#'} className={`block px-4 py-3 hover:bg-surface-soft ${!notif.isRead ? 'bg-primary/5' : ''}`}>
                                <p className="text-sm text-text-primary">{notif.message}</p>
                                <p className="text-xs text-text-secondary mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <div className="p-2 text-center border-t border-border">
                <Link to="/profile/notifications" className="text-sm font-semibold text-primary hover:underline">Open notification inbox</Link>
            </div>
        </div>
    );
};
  
const SupportMenu: React.FC<{ onOpenOmni?: () => void }> = ({ onOpenOmni }) => {
    const menuItems = [
        { icon: <HeadphonesIcon />, text: 'Support center', path: '/support-center' },
        { icon: <ShieldCheckIcon />, text: 'Safety center', path: '/safety-center' },
        { icon: <MessageSquareIcon />, text: 'Chat with Urban Prime', path: '/chat-with-us', action: onOpenOmni },
        { icon: <PurchaseProtectionIcon />, text: 'Urban Prime purchase protection', path: '/purchase-protection' },
        { icon: <LockIcon />, text: 'Privacy policy', path: '/privacy-policy' },
        { icon: <MoreHorizontalIcon />, text: 'Terms of use', path: '/terms-of-use' },
    ];

    return (
        <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-lg shadow-2xl border border-border z-50 animate-dropdown-fade-in-up">
            <ul className="py-2">
            {menuItems.map(item => (
                <li key={item.text}>
                    {item.action ? (
                        <button
                            type="button"
                            onClick={item.action}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary text-left"
                        >
                            {item.icon} {item.text}
                        </button>
                    ) : (
                        <Link to={item.path} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary">
                            {item.icon} {item.text}
                        </Link>
                    )}
                </li>
            ))}
            </ul>
        </div>
    );
};
  
const LanguageMenu: React.FC = () => {
    const { t, currentLanguageInfo, currency } = useTranslation();
    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface rounded-lg shadow-2xl border border-border z-50 p-4 space-y-4 animate-dropdown-fade-in-up">
            <div>
                <h4 className="font-bold text-sm mb-2 text-text-primary">Language</h4>
                <div className="flex items-center justify-between p-2 rounded-md bg-surface-soft">
                    <span className="text-sm font-semibold text-text-primary">{currentLanguageInfo?.name}</span>
                    <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"><div className="w-2 h-2 bg-primary rounded-full"></div></div>
                </div>
            </div>
            <div className="border-t border-border"></div>
            <div>
                <h4 className="font-bold text-sm mb-2 text-text-primary">Currency</h4>
                <p className="p-2 rounded-md bg-surface-soft text-sm font-semibold text-text-primary">{currency.code}: {currency.symbol}</p>
            </div>
            <div className="border-t border-border"></div>
            <div className="p-2 rounded-md bg-surface-soft">
                <p className="text-sm text-text-primary">{t('langMenu.shoppingIn')}</p>
                <Link to="/languages" className="text-sm font-bold text-primary hover:underline">{t('langMenu.changeLanguage')}</Link>
            </div>
        </div>
    );
};

const ExploreMenu: React.FC<{ onClose: () => void; onOpenOmni?: () => void }> = ({ onClose, onOpenOmni }) => {
    const { t } = useTranslation();
    const features = [
        { title: 'Live', desc: 'Shop live streams and creator drops in real time.', link: '/live', icon: <LiveIcon /> },
        { title: 'Spotlight', desc: 'Premium discovery feed for photos, clips, and creators.', link: '/spotlight', icon: <SpotlightIcon /> },
        { title: 'Services', desc: 'Browse trusted services, instant booking, and custom quote providers.', link: '/services/marketplace', icon: <ListIcon /> },
        { titleKey: 'exploreMenu.pixe.title', descKey: 'exploreMenu.pixe.desc', link: '/reels', icon: <ReelsIcon /> },
        { titleKey: 'exploreMenu.battles.title', descKey: 'exploreMenu.battles.desc', link: '/battles', icon: <BattleIcon /> },
        { titleKey: 'exploreMenu.games.title', descKey: 'exploreMenu.games.desc', link: '/games', icon: <DiamondIcon /> },
        { titleKey: 'exploreMenu.affiliate.title', descKey: 'exploreMenu.affiliate.desc', link: '/affiliate-program', icon: <CouponIcon /> },
        { titleKey: 'exploreMenu.stores.title', descKey: 'exploreMenu.stores.desc', link: '/stores', icon: <StoreIcon /> },
        { titleKey: 'exploreMenu.browse.title', descKey: 'exploreMenu.browse.desc', link: '/browse', icon: <SearchIcon /> },
        { titleKey: 'exploreMenu.sellers.title', descKey: 'exploreMenu.sellers.desc', link: '/sellers', icon: <UserIcon /> },
        { titleKey: 'exploreMenu.events.title', descKey: 'exploreMenu.events.desc', link: '/events', icon: <ClockIcon /> },
        { title: 'Omni Chat', desc: 'Instant help and marketplace chat.', link: '/chat-with-us', action: onOpenOmni, icon: <MessageSquareIcon /> }
    ];
  
    return (
        <>
            {/* Desktop Menu */}
            <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[640px] bg-surface rounded-lg shadow-2xl border border-border z-50 p-4 animate-dropdown-fade-in-up">
                <div className="grid grid-cols-2 gap-4">
                    {features.map(feature => {
                        const content = (
                            <>
                                <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center text-text-secondary">
                                    {feature.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-text-primary">{feature.titleKey ? t(feature.titleKey) : feature.title}</p>
                                    <p className="text-xs text-text-secondary">{feature.descKey ? t(feature.descKey) : feature.desc}</p>
                                </div>
                                <div className="text-text-secondary/50">
                                    <span className="transition-transform duration-200 ease-in-out inline-block group-hover:-translate-y-0.5">?</span>
                                </div>
                            </>
                        );
                        if (feature.action) {
                            return (
                                <button
                                    key={feature.titleKey || feature.title}
                                    type="button"
                                    onClick={() => {
                                        feature.action?.();
                                        onClose();
                                    }}
                                    className="group flex items-center gap-4 p-3 rounded-lg hover:bg-surface-soft transition-colors text-left"
                                >
                                    {content}
                                </button>
                            );
                        }
                        return (
                            <Link to={feature.link} onClick={onClose} key={feature.titleKey || feature.title} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-surface-soft transition-colors">
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Menu */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="md:hidden absolute top-full left-0 right-0 mt-2 mx-2 bg-surface rounded-lg shadow-lg border border-border z-50 p-3 max-h-[60vh] overflow-y-auto"
            >
                <div className="space-y-2">
                    {features.map((feature, index) => {
                        const content = (
                            <>
                                <div className="w-9 h-9 rounded-lg bg-surface-soft flex items-center justify-center text-text-secondary flex-shrink-0">
                                    {feature.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs text-text-primary truncate">{feature.titleKey ? t(feature.titleKey) : feature.title}</p>
                                    <p className="text-[11px] text-text-secondary line-clamp-1">{feature.descKey ? t(feature.descKey) : feature.desc}</p>
                                </div>
                            </>
                        );
                        
                        if (feature.action) {
                            return (
                                <motion.button
                                    key={feature.titleKey || feature.title}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    type="button"
                                    onClick={() => {
                                        feature.action?.();
                                        onClose();
                                    }}
                                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-surface-soft active:bg-primary/10 transition-colors text-left"
                                >
                                    {content}
                                </motion.button>
                            );
                        }
                        return (
                            <motion.div
                                key={feature.titleKey || feature.title}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <Link to={feature.link} onClick={onClose} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-soft active:bg-primary/10 transition-colors">
                                    {content}
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </>
    );
};

// --- MAIN HEADER ---
const Header: React.FC<{ onOpenOmni?: () => void }> = ({ onOpenOmni }) => {
    const { isAuthenticated, user, activePersona, openAuthModal, logout } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const { t } = useTranslation();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [scrollOpacity, setScrollOpacity] = useState(0);
    const { heroStyle } = useHeroStyle();
    const { resolvedTheme } = useTheme();
    const { unreadNotificationCount } = useNotification();
    const isLowEndMode = useLowEndMode();

    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuTimeoutRef = useRef<number | null>(null);
    const messageDropdownScrollRef = useRef<HTMLDivElement | null>(null);

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchTimeoutRef = useRef<number | null>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const navContainerRef = useRef<HTMLElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchIconRef = useRef<HTMLDivElement>(null);
    const [searchPosition, setSearchPosition] = useState({ top: 0, left: 0 });
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const isHoveringSearchRef = useRef(false);

    const handleOpenOmni = useCallback(() => {
        if (onOpenOmni) {
            onOpenOmni();
        } else {
            navigate('/chat-with-us');
        }
    }, [onOpenOmni, navigate]);
    
    // --- Notification State ---
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const hasLoadedNotificationsRef = useRef(false);
    const [messageThreads, setMessageThreads] = useState<ChatThread[]>([]);
    const [messageUsersById, setMessageUsersById] = useState<Record<string, User | null>>({});
    const [unreadThreadIds, setUnreadThreadIds] = useState<string[]>([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const recentMessageThreads = useMemo(() => {
        const unreadSet = new Set(unreadThreadIds);
        return [...messageThreads]
            .sort((left, right) => {
                const leftUnread = unreadSet.has(left.id) ? 1 : 0;
                const rightUnread = unreadSet.has(right.id) ? 1 : 0;
                if (leftUnread !== rightUnread) return rightUnread - leftUnread;
                return new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime();
            })
            .slice(0, 4)
            .map((thread) => {
                const counterpartId = thread.buyerId === user?.id ? thread.sellerId : thread.buyerId;
                return {
                    thread,
                    counterpartId,
                    counterpart: messageUsersById[counterpartId] || null,
                    unread: unreadSet.has(thread.id)
                };
            });
    }, [messageThreads, messageUsersById, unreadThreadIds, user?.id]);
    const unreadMessageThreads = useMemo(
        () => recentMessageThreads.filter((entry) => entry.unread),
        [recentMessageThreads]
    );
    const dropdownMessageThreads = useMemo(
        () => (unreadMessageThreads.length > 0 ? unreadMessageThreads.slice(0, 4) : recentMessageThreads.slice(0, 2)),
        [recentMessageThreads, unreadMessageThreads]
    );
    const effectiveUnreadMessageCount = unreadThreadIds.length;
    const messageIndicatorCount = effectiveUnreadMessageCount;
    const activityNotifications = useMemo(
        () =>
            notifications.filter((notification) => {
                const normalizedType = String(notification.type || '').toUpperCase();
                const normalizedLink = String(notification.link || '').toLowerCase();
                return normalizedType !== 'MESSAGE' && !normalizedLink.startsWith('/profile/messages');
            }),
        [notifications]
    );
    const activityNotificationUnreadCount = activityNotifications.filter((notification) => !notification.isRead).length;
    const effectiveUnreadNotificationBadgeCount = hasLoadedNotificationsRef.current
        ? activityNotificationUnreadCount
        : unreadNotificationCount;

    useEffect(() => {
        const isItemRoute = location.pathname.startsWith('/item/');

        const handleWindowScroll = () => {
            if (isItemRoute) return;
            const scrollY = window.scrollY;
            const maxScroll = 200;
            const opacity = Math.min(scrollY / maxScroll, 1);
            setScrollOpacity(opacity);
            setIsScrolled(scrollY > 50);
        };

        const handleItemFrameScroll = (event: MessageEvent) => {
            if (!isItemRoute) return;
            if (event.origin !== window.location.origin) return;

            const payload = event.data;
            if (!payload || payload.type !== 'urbanprime:item-detail-scroll') return;

            const scrollY = Number(payload.scrollY) || 0;
            setIsScrolled(scrollY > 50);
        };

        if (isItemRoute) {
            setIsScrolled(false);
            window.addEventListener('message', handleItemFrameScroll);
        } else {
            handleWindowScroll();
            window.addEventListener('scroll', handleWindowScroll);
        }

        return () => {
            window.removeEventListener('scroll', handleWindowScroll);
            window.removeEventListener('message', handleItemFrameScroll);
        };
    }, [location.pathname]);

    const isBannerHero = heroStyle === 'banner' && isHomePage;

    useEffect(() => {
        if (!headerRef.current) return;
        if (isLowEndMode) {
            gsap.set(headerRef.current, { clearProps: 'transform' });
            return;
        }
        if (!isBannerHero) {
            gsap.set(headerRef.current, { clearProps: 'transform' });
            return;
        }
        gsap.to(headerRef.current, {
            y: isScrolled ? 0 : -4,
            scale: 1,
            duration: isScrolled ? 0.42 : 0.28,
            ease: 'power2.out'
        });
    }, [isBannerHero, isLowEndMode, isScrolled]);

    const fetchNotifications = useCallback(async (showLoader = false) => {
        if (!user) {
            setIsNotificationsLoading(false);
            return;
        }

        if (showLoader) {
            setIsNotificationsLoading(true);
        }

        try {
            const { userService } = await loadItemServiceModule();
            if (typeof userService.getNotificationsForUser !== 'function') {
                setNotifications([]);
                return;
            }
            const userNotifs = await userService.getNotificationsForUser(user.id, {
                personaId: activePersona?.id,
                includePersona: Boolean(activePersona?.id),
                limit: 50
            });
            setNotifications(Array.isArray(userNotifs) ? userNotifs : []);
            hasLoadedNotificationsRef.current = true;
        } catch (error) {
            console.warn('Notification fetch failed:', error);
            setNotifications([]);
        } finally {
            setIsNotificationsLoading(false);
        }
    }, [user, activePersona?.id]);

    const fetchMessageThreads = useCallback(async (showLoader = false) => {
        if (!user) {
            setMessageThreads([]);
            setUnreadThreadIds([]);
            setMessageUsersById({});
            setIsMessagesLoading(false);
            return;
        }

        if (showLoader) {
            setIsMessagesLoading(true);
        }

        try {
            const { itemService, userService } = await loadItemServiceModule();
            const threads = await itemService.getChatThreadsForUser(user.id);
            const threadIds = threads.map((thread) => thread.id).filter(Boolean);
            const readReceiptsByThreadId =
                threadIds.length > 0 && typeof itemService.getReadReceiptsForThreads === 'function'
                    ? await itemService.getReadReceiptsForThreads(threadIds)
                    : {};

            const unreadIds = threads
                .filter((thread) => {
                    const latestMessage = thread.messages?.[thread.messages.length - 1];
                    if (!latestMessage || latestMessage.senderId === user.id) return false;
                    const ownReadAt = readReceiptsByThreadId?.[thread.id]?.[user.id] || '';
                    return !ownReadAt || new Date(ownReadAt).getTime() < new Date(latestMessage.timestamp).getTime();
                })
                .map((thread) => thread.id);

            const counterpartIds = Array.from(new Set(
                threads
                    .map((thread) => thread.buyerId === user.id ? thread.sellerId : thread.buyerId)
                    .filter(Boolean)
            ));

            const counterpartUsers = await Promise.all(
                counterpartIds.map(async (id) => [id, await userService.getUserById(id).catch(() => null)] as const)
            );

            setMessageUsersById(
                counterpartUsers.reduce<Record<string, User | null>>((acc, [id, nextUser]) => {
                    acc[id] = nextUser;
                    return acc;
                }, {})
            );
            setMessageThreads(Array.isArray(threads) ? threads : []);
            setUnreadThreadIds(unreadIds);
        } catch (error) {
            console.warn('Message thread fetch failed:', error);
            setMessageThreads([]);
            setUnreadThreadIds([]);
            setMessageUsersById({});
        } finally {
            setIsMessagesLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated) {
            let timeoutId: number | null = null;
            let idleId: number | null = null;

            const runFetch = () => {
                timeoutId = window.setTimeout(() => {
                    void fetchNotifications();
                    void fetchMessageThreads();
                }, 900);
            };

            if ('requestIdleCallback' in window) {
                idleId = (window as any).requestIdleCallback(runFetch, { timeout: 1800 });
            } else {
                runFetch();
            }

            return () => {
                if (idleId !== null) {
                    (window as any).cancelIdleCallback?.(idleId);
                }
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                }
            };
        } else {
            setNotifications([]);
            setMessageThreads([]);
            setUnreadThreadIds([]);
            setMessageUsersById({});
            setIsNotificationsLoading(false);
            setIsMessagesLoading(false);
            hasLoadedNotificationsRef.current = false;
        }
    }, [isAuthenticated, fetchMessageThreads, fetchNotifications]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const intervalId = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            void fetchNotifications();
            void fetchMessageThreads();
        }, isLowEndMode ? 45000 : 25000);

        return () => window.clearInterval(intervalId);
    }, [isAuthenticated, fetchMessageThreads, fetchNotifications, isLowEndMode]);

    const handleMarkAsRead = async () => {
        if (!user) return;
        try {
            const { userService } = await loadItemServiceModule();
            if (typeof userService.markNotificationsAsRead !== 'function') return;
            await userService.markNotificationsAsRead(user.id, {
                personaId: activePersona?.id,
                includePersona: Boolean(activePersona?.id)
            });
            await fetchNotifications();
        } catch (error) {
            console.warn('Mark notifications as read failed:', error);
        }
    };
    
    // --- Search Logic ---
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Item[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const quickLinks = [
        { name: 'Product Battles', path: '/battles' },
        { name: 'Affiliate Program', path: '/affiliate-program' },
        { name: 'Discover Pixe', path: '/reels' },
        { name: 'Prime Spotlight', path: '/spotlight' },
        { name: 'Services Marketplace', path: '/services/marketplace' },
        { name: 'Create Your AI Store', path: '/create-store' },
        { name: 'Browse All Items', path: '/browse' },
    ];

    const filteredQuickLinks = searchQuery.trim()
        ? quickLinks.filter(link =>
            link.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
        : [];

    const fetchProducts = useCallback(async (query: string) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }
        setIsLoadingSearch(true);
        try {
            const { itemService } = await loadItemServiceModule();
            const { items } = await itemService.getItems({ search: query }, { page: 1, limit: 4 });
            setProducts(items);
        } catch (error) {
            console.error("Failed to fetch search products", error);
        } finally {
            setIsLoadingSearch(false);
        }
    }, []);

    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (searchQuery.trim()) {
            debounceTimeoutRef.current = setTimeout(() => fetchProducts(searchQuery), 300);
        } else {
            setProducts([]);
        }
        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [searchQuery, fetchProducts]);

    useEffect(() => {
        if (!isMobileSearchOpen) return;
        void loadItemServiceModule().catch(() => undefined);
    }, [isMobileSearchOpen]);
    
    const startVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice search is not supported in this browser.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };

        recognition.onend = () => {
            isListeningRef.current = false;
            setIsListening(false);
            if (!isHoveringSearchRef.current) {
                 searchTimeoutRef.current = window.setTimeout(() => setIsSearchOpen(false), 1500);
            }
        };

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            setSearchQuery(transcript);
        };
        recognition.start();
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
            setIsMobileSearchOpen(false);
        }
    };

    const closeMobileSearch = () => {
        setIsMobileSearchOpen(false);
        setSearchQuery('');
        setProducts([]);
    };
    
    const HighlightMatch: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
        if (!highlight.trim()) {
            return <span>{text}</span>;
        }
        const regex = new RegExp(`(${highlight})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <strong key={i} className="font-bold text-text-primary">{part}</strong>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </span>
        );
    };

    const hasSearchResults = searchQuery.trim().length > 0 && (products.length > 0 || filteredQuickLinks.length > 0);
    const showSearchPanel = isSearchOpen && (searchQuery.trim().length > 0);

    const handleMenuEnter = (menu: string) => {
        if ((menu === 'notifications' || menu === 'messages') && isAuthenticated && !hasLoadedNotificationsRef.current && !isNotificationsLoading) {
            void fetchNotifications(true);
        }
        if (menu === 'messages' && isAuthenticated && !isMessagesLoading) {
            void fetchMessageThreads(true);
        }
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
        setActiveMenu(menu);
    };
    const handleMenuLeave = () => {
        menuTimeoutRef.current = window.setTimeout(() => setActiveMenu(null), 200);
    };

    const handleMessageDropdownAutoScroll = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const container = messageDropdownScrollRef.current;
        if (!container) return;
        const bounds = container.getBoundingClientRect();
        const threshold = 64;
        const maxStep = 22;
        const fromTop = event.clientY - bounds.top;
        const fromBottom = bounds.bottom - event.clientY;

        if (fromTop < threshold) {
            const ratio = (threshold - Math.max(fromTop, 0)) / threshold;
            container.scrollTop -= Math.ceil(maxStep * ratio);
        } else if (fromBottom < threshold) {
            const ratio = (threshold - Math.max(fromBottom, 0)) / threshold;
            container.scrollTop += Math.ceil(maxStep * ratio);
        }
    }, []);
    
    const handleSearchEnter = () => {
        isHoveringSearchRef.current = true;
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        void loadItemServiceModule().catch(() => undefined);
        setIsSearchOpen(true);
    };
    
    const handleSearchLeave = () => {
        isHoveringSearchRef.current = false;
        if (isListeningRef.current) return;
        searchTimeoutRef.current = window.setTimeout(() => {
            setIsSearchOpen(false);
            setSearchQuery('');
        }, 300);
    };
    
    useEffect(() => {
        const calculatePosition = () => {
            if (isSearchOpen && navContainerRef.current && searchIconRef.current) {
                const navRect = navContainerRef.current.getBoundingClientRect();
                const iconRect = searchIconRef.current.getBoundingClientRect();
                const searchBarWidth = 640; // from w-[640px] class

                setSearchPosition({
                    top: navRect.bottom + 12,
                    left: iconRect.left + (iconRect.width / 2) - (searchBarWidth / 2),
                });
            }
        };

        calculatePosition();
        window.addEventListener('resize', calculatePosition);
        window.addEventListener('scroll', calculatePosition);

        return () => {
            window.removeEventListener('resize', calculatePosition);
            window.removeEventListener('scroll', calculatePosition);
        };
    }, [isSearchOpen]);


    const isLightResolvedTheme = !['obsidian', 'noir', 'hydra'].includes(resolvedTheme);
    const prefersNoirTuning = isLowEndMode || resolvedTheme === 'noir';

    const bannerPillBorderProgress = Math.min(Math.max(isHomePage ? scrollOpacity : 1, 0), 1);
    const isHomePillCollapsed = isBannerHero && bannerPillBorderProgress < 0.12;
    const homeTextClass = isHomePillCollapsed
        ? 'text-white/95 [text-shadow:0_2px_18px_rgba(0,0,0,0.65)]'
        : 'text-[#1f1d12]';
    const homeMutedTextClass = isHomePillCollapsed
        ? 'text-white/80 hover:text-white'
        : 'text-[#4d4630] hover:text-[#1f1d12]';
    const homeHoverBgClass = isHomePillCollapsed ? 'hover:bg-white/10' : 'hover:bg-black/5';

    const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `px-3 py-2 text-sm font-semibold transition-colors duration-300 rounded-md ${
            isHomePage
                ? isActive
                    ? `${homeTextClass} ${isHomePillCollapsed ? 'bg-white/12' : ''}`
                    : `${homeMutedTextClass} ${homeHoverBgClass}`
                : isActive
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary'
        }`;

    const pillClasses = isHomePage
        ? 'transition-all duration-300 rounded-full border'
        : `transition-all duration-300 rounded-full border ${
              prefersNoirTuning
                  ? (isScrolled ? 'bg-surface/92 backdrop-blur-md shadow-md border-border/80' : 'bg-surface/90 backdrop-blur-sm shadow-sm border-border/60')
                  : (isScrolled ? 'bg-surface/80 backdrop-blur-xl shadow-md border-border/80' : 'bg-surface/70 backdrop-blur-lg shadow-sm border-border/60')
          }`;

    const desktopPillClasses = pillClasses;

    const desktopWordmarkClass = isHomePage
        ? homeTextClass
        : isBannerHero
            ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
            : 'text-text-primary';
    const desktopWordmarkTextClass = isHomePage
        ? `text-[0.95rem] font-extrabold tracking-widest font-["Dh_Caloins",sans-serif] ${homeTextClass}`
        : isBannerHero
            ? isScrolled
                ? 'text-[0.95rem] font-extrabold tracking-widest text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.88)] font-["Dh_Caloins",sans-serif]'
                : 'text-[0.95rem] font-extrabold tracking-widest text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.42)] font-["Dh_Caloins",sans-serif]'
            : 'text-[0.95rem] font-["Dh_Caloins",sans-serif]';

    const desktopSearchButtonClass = isHomePage
        ? `p-2.5 rounded-full bg-transparent border-transparent shadow-none ${isHomePillCollapsed ? 'text-white/90 hover:bg-white/10' : 'text-[#4d4630] hover:bg-black/5 hover:text-[#1f1d12]'}`
        : isBannerHero
            ? isScrolled
                ? 'p-2.5 rounded-full text-white/90 bg-white/10 border border-white/10 hover:bg-white/16'
                : 'p-2.5 rounded-full text-white bg-transparent border-transparent shadow-none hover:bg-white/12'
            : 'p-2.5 rounded-full text-text-secondary bg-surface-soft hover:bg-gray-200';
    const desktopActionButtonClass = isHomePage
        ? `flex h-9 w-9 items-center justify-center rounded-full ${isHomePillCollapsed ? 'text-white/90 hover:bg-white/10' : 'text-[#1f1d12] hover:bg-black/5'}`
        : isBannerHero
            ? isScrolled
                ? 'flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10'
                : 'flex h-9 w-9 items-center justify-center rounded-full border-transparent bg-transparent text-white shadow-none hover:bg-white/12'
            : 'flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-soft text-text-primary';

    const mobilePillClasses = `
        ${pillClasses}
        ${isHomePage ? '' : 'bg-surface/80'}
    `;
    const desktopBannerPillStyle: React.CSSProperties = isHomePage
        ? isLightResolvedTheme
            ? {
                  backgroundColor: `rgba(248, 242, 216, ${bannerPillBorderProgress * 0.92})`,
                  borderColor: `rgba(226, 214, 170, ${bannerPillBorderProgress * 0.9})`,
                  borderWidth: `${bannerPillBorderProgress}px`,
                  backdropFilter: `blur(${bannerPillBorderProgress * 18}px)`,
                  boxShadow: `0 ${bannerPillBorderProgress * 10}px ${bannerPillBorderProgress * 26}px rgba(0,0,0,${bannerPillBorderProgress * 0.08})`
              }
            : {
                  backgroundColor: `rgba(255, 255, 255, ${bannerPillBorderProgress * 0.08})`,
                  borderColor: `rgba(255, 255, 255, ${bannerPillBorderProgress * 0.2})`,
                  borderWidth: `${bannerPillBorderProgress}px`,
                  backdropFilter: `blur(${prefersNoirTuning ? 4 + bannerPillBorderProgress * 6 : 6 + bannerPillBorderProgress * 12}px)`,
                  boxShadow: `0 ${bannerPillBorderProgress * 8}px ${bannerPillBorderProgress * (prefersNoirTuning ? 18 : 28)}px rgba(255,255,255,${bannerPillBorderProgress * (prefersNoirTuning ? 0.05 : 0.08)})`
              }
        : {};
    const getMobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-300 rounded-full ${
            isHomePage
                ? isActive
                    ? `${homeTextClass} ${isHomePillCollapsed ? 'bg-white/12' : ''}`
                    : `${homeMutedTextClass} ${homeHoverBgClass}`
                : isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-text-secondary hover:text-text-primary'
        }`;
    const mobileIconBtnClass = isHomePage
        ? `p-1.5 rounded-full ${isHomePillCollapsed ? 'hover:bg-white/10 text-white/90' : 'hover:bg-black/5 text-[#1f1d12]'}`
        : 'p-1.5 rounded-full hover:bg-surface-soft text-text-primary';

    const searchVariants = {
        hidden: { opacity: 0, y: -5, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1 },
    };

    return (
        <>
            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={logout}
            />
            {/* Desktop Header */}
            <header
                ref={headerRef}
                className={`
                    fixed top-4 left-0 right-0 z-50
                    hidden md:block
                    transition-all duration-300 ease-in-out
                    pointer-events-auto
                `}
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    {/* Left Pill: Logo */}
                <div 
                    className={`px-4 py-2 ${desktopPillClasses}`}
                    style={desktopBannerPillStyle}>
                        <Link to="/" className={`text-xl font-extrabold font-display flex items-center ${desktopWordmarkClass}`}>
                           <span className={desktopWordmarkTextClass}>Urban Prime</span>
                        </Link>
                    </div>
                    
                    {/* Center Pill: Navigation + Search */}
                    <nav 
                        ref={navContainerRef} 
                        className={`flex items-center gap-1 p-0.5 ${desktopPillClasses}`}
                        style={desktopBannerPillStyle}>
                        <NavLink to="/deals" className={getNavLinkClass}>{t('header.deals')}</NavLink>
                        <NavLink to="/genie" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-purple-500' : 'hover:text-purple-500'}`}>
                             <span className="text-purple-500"><GenieIcon /></span> Genie
                        </NavLink>
                        
                        <div ref={searchIconRef} onMouseEnter={handleSearchEnter} onMouseLeave={handleSearchLeave}>
                            <button className={desktopSearchButtonClass} aria-label="Search"><SearchIcon/></button>
                        </div>
                        
                        <NavLink to="/luxury" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-[#0066FF]' : 'hover:text-[#0066FF]'}`}>
                             <span className="text-[#0066FF]"><DiamondIcon /></span> Luxury
                        </NavLink>
                        <NavLink to="/services/marketplace" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-primary' : 'hover:text-primary'}`}>
                             <span className="text-primary"><ListIcon /></span> Services
                        </NavLink>
                        <NavLink to="/spotlight" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-sky-500' : 'hover:text-sky-500'}`}>
                             <span className="text-sky-500"><SpotlightIcon /></span> Spotlight
                        </NavLink>
                        <div onMouseEnter={() => handleMenuEnter('explore')} onMouseLeave={handleMenuLeave}>
                            <button className={`px-3 py-2 text-sm font-semibold rounded-md ${getNavLinkClass({isActive: false})}`}>{t('header.explore')}</button>
                            {activeMenu === 'explore' && <ExploreMenu onClose={() => setActiveMenu(null)} onOpenOmni={handleOpenOmni} />}
                        </div>
                    </nav>
                    
                    {/* Right Pill: User Actions */}
                    <div 
                        className={`flex items-center gap-0.5 px-1.5 py-1 ${desktopPillClasses}`} 
                        onMouseLeave={handleMenuLeave}
                        style={desktopBannerPillStyle}>
                        <div className="relative" onMouseEnter={() => handleMenuEnter('account')}>
                            {isAuthenticated && user ? (
                                <button className={`flex items-center gap-1 p-0.5 ${desktopActionButtonClass}`}>
                                    <img
                                        src={resolveProfileAvatar(user)}
                                        alt={user.name}
                                        className="h-8 w-8 rounded-full object-cover bg-surface-soft"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = profileAvatarFallback; }}
                                    />
                                </button>
                            ) : (
                                <button onClick={() => openAuthModal('login')} className={`p-2 ${desktopActionButtonClass}`}>
                                    <UserIcon />
                                </button>
                            )}
                            {activeMenu === 'account' && user && (
                                <AccountMenu
                                    user={user}
                                    activePersonaType={activePersona?.type}
                                    onLogout={() => setIsLogoutModalOpen(true)}
                                    onClose={() => setActiveMenu(null)}
                                />
                            )}
                        </div>
                        
                        {isAuthenticated && (
                            <div className="relative" onMouseEnter={() => handleMenuEnter('messages')}>
                                <NavLink to="/profile/messages" className={`relative p-2 ${desktopActionButtonClass}`} aria-label="Messages">
                                    <MessageSquareIcon />
                                    {messageIndicatorCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#7b6ee7] px-1 text-[10px] font-bold text-white ring-2 ring-surface">{messageIndicatorCount > 9 ? '9+' : messageIndicatorCount}</span>}
                                </NavLink>
                                {activeMenu === 'messages' && (
                                    <div className="absolute right-0 top-full mt-2 w-[18.5rem] overflow-hidden rounded-[1.35rem] border border-[rgba(168,141,88,0.16)] bg-[rgba(246,239,227,0.94)] p-3.5 shadow-[0_24px_50px_rgba(84,67,43,0.14)] backdrop-blur-[26px] animate-dropdown-fade-in-up dark:border-white/8 dark:bg-[rgba(16,22,34,0.94)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-text-secondary">Inbox</p>
                                                <p className="mt-1 text-sm font-semibold text-text-primary">
                                                    {effectiveUnreadMessageCount > 0
                                                        ? `${effectiveUnreadMessageCount} unread messages`
                                                        : dropdownMessageThreads.length > 0
                                                            ? 'Recent chats'
                                                            : 'All caught up'}
                                                </p>
                                            </div>
                                            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-primary/12 px-2 py-1 text-xs font-black text-primary">
                                                {effectiveUnreadMessageCount > 9 ? '9+' : effectiveUnreadMessageCount}
                                            </span>
                                        </div>
                                        {isMessagesLoading ? (
                                            <div className="mt-3 space-y-2">
                                                {Array.from({ length: effectiveUnreadMessageCount > 0 ? 4 : 2 }).map((_, index) => (
                                                    <div
                                                        key={`header-thread-skeleton-${index}`}
                                                        className="flex items-center gap-2.5 rounded-2xl border border-transparent bg-black/[0.035] px-2.5 py-2.5 dark:bg-white/[0.045]"
                                                        aria-hidden="true"
                                                    >
                                                        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-300/80 dark:bg-slate-700/70" />
                                                        <div className="min-w-0 flex-1 animate-pulse space-y-1.5">
                                                            <div className="h-3.5 w-24 rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
                                                            <div className="h-3 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700/55" />
                                                            <div className="h-3.5 w-32 rounded-full bg-slate-200/75 dark:bg-slate-700/55" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : dropdownMessageThreads.length > 0 ? (
                                            <div
                                                ref={messageDropdownScrollRef}
                                                className="mt-3 max-h-[18rem] space-y-2 overflow-y-auto pr-1"
                                                onMouseMove={handleMessageDropdownAutoScroll}
                                            >
                                                {dropdownMessageThreads.map(({ thread, counterpart, counterpartId, unread }) => {
                                                    const isHydrating = isInboxProfileHydrating(counterpart);
                                                    return (
                                                        <RouterLink
                                                            key={thread.id}
                                                            to={`/profile/messages/${thread.id}`}
                                                            className="flex items-center gap-2.5 rounded-2xl border border-[rgba(128,104,58,0.1)] bg-black/[0.035] px-2.5 py-2.5 transition hover:bg-black/[0.05] dark:border-white/6 dark:bg-white/[0.04] dark:hover:bg-white/[0.065]"
                                                        >
                                                            {isHydrating ? (
                                                                <>
                                                                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-300/80 dark:bg-slate-700/70" />
                                                                    <div className="min-w-0 flex-1 animate-pulse space-y-1.5">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="h-3.5 w-24 rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
                                                                            <div className="h-3 w-10 rounded-full bg-slate-200/80 dark:bg-slate-700/55" />
                                                                        </div>
                                                                        <div className="h-3 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700/55" />
                                                                        <div className="h-3.5 w-32 rounded-full bg-slate-200/75 dark:bg-slate-700/55" />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <img
                                                                        src={resolveProfileAvatar(counterpart || undefined)}
                                                                        alt={counterpart?.name || 'Conversation'}
                                                                        className="h-10 w-10 rounded-full object-cover bg-surface-soft"
                                                                        onError={(event) => {
                                                                            event.currentTarget.src = resolveProfileAvatar(counterpart || undefined);
                                                                        }}
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="truncate text-[12px] font-black leading-4 text-text-primary">
                                                                                    {counterpart?.name || 'Conversation'}
                                                                                </p>
                                                                                <p className="mt-0.5 truncate text-[10px] font-semibold leading-4 text-text-secondary">
                                                                                    {counterpart?.username ? `@${counterpart.username}` : `@${String(counterpartId || '').slice(0, 8)}`}
                                                                                </p>
                                                                            </div>
                                                                            <span className="shrink-0 pt-0.5 text-[10px] text-text-secondary">
                                                                                {new Date(thread.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className={`mt-1 truncate text-xs leading-5 ${unread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                                                                            {thread.lastMessage || 'New message'}
                                                                        </p>
                                                                    </div>
                                                                    {unread ? (
                                                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                                                                    ) : null}
                                                                </>
                                                            )}
                                                        </RouterLink>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-xs leading-5 text-text-secondary">
                                                {effectiveUnreadMessageCount > 0
                                                    ? 'Open your inbox to reply quickly and keep conversations active.'
                                                    : 'No unread conversations right now. New replies will appear here.'}
                                            </p>
                                        )}
                                        <RouterLink
                                            to="/profile/messages"
                                            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                                        >
                                            Open inbox
                                        </RouterLink>
                                    </div>
                                )}
                            </div>
                        )}

                        {isAuthenticated && (
                             <div className="relative" onMouseEnter={() => handleMenuEnter('notifications')}>
                                <button className={`relative p-2 ${desktopActionButtonClass}`}>
                                    <BellIcon />
                                    {effectiveUnreadNotificationBadgeCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">{effectiveUnreadNotificationBadgeCount > 9 ? '9+' : effectiveUnreadNotificationBadgeCount}</span>}
                                </button>
                                {activeMenu === 'notifications' && (
                                    <NotificationMenu
                                        notifications={activityNotifications}
                                        onMarkAsRead={handleMarkAsRead}
                                        unreadCount={activityNotificationUnreadCount}
                                        isLoading={isNotificationsLoading}
                                    />
                                )}
                            </div>
                        )}

                        <NavLink to="/cart" className={`relative p-2 ${desktopActionButtonClass}`}>
                            <CartIcon />
                            {cartCount > 0 && <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{cartCount}</span>}
                        </NavLink>
                    </div>
                </div>
            </header>

            {/* Mobile Header */}
            <header 
                className={`
                    fixed top-0 left-0 right-0 z-50
                    md:hidden transition-colors duration-300
                    ${isScrolled || !isHomePage
                        ? (prefersNoirTuning ? 'bg-surface/92 backdrop-blur-sm border-b border-border/80' : 'bg-surface/80 backdrop-blur-md border-b border-border/80')
                        : 'bg-transparent'
                    }
                `}
            >
                <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-1.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${mobilePillClasses}`} style={desktopBannerPillStyle}>
                            {!isHomePage && (
                                <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-surface-soft" aria-label="Go back">
                                    <span className="inline-flex scale-90"><BackIcon /></span>
                                </button>
                            )}
                            <Link to="/" className="text-[13px] font-extrabold font-display tracking-tight flex items-center">
                                <span className={`urban-prime-wordmark text-[0.72rem] ${homeTextClass}`}>Urban Prime</span>
                            </Link>
                        </div>
                        <div className={`flex items-center gap-1 p-0.5 rounded-full ${mobilePillClasses}`} style={desktopBannerPillStyle}>
                            <button onClick={() => setIsMobileSearchOpen(true)} className={mobileIconBtnClass} aria-label="Search">
                                <SearchIcon />
                            </button>
                            <NavLink to="/cart" className={`${mobileIconBtnClass} relative`} aria-label="Cart">
                                <CartIcon />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                                        {cartCount}
                                    </span>
                                )}
                            </NavLink>
                            {isAuthenticated && user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === 'account' ? null : 'account')}
                                        className="p-0.5 rounded-full hover:bg-surface-soft"
                                        aria-label="Account menu"
                                    >
                                        <img
                                            src={resolveProfileAvatar(user)}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-full object-cover bg-surface-soft"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = profileAvatarFallback; }}
                                        />
                                    </button>
                                    {activeMenu === 'account' && (
                                        <AccountMenu
                                            user={user}
                                            activePersonaType={activePersona?.type}
                                            onLogout={() => setIsLogoutModalOpen(true)}
                                            onClose={() => setActiveMenu(null)}
                                        />
                                    )}
                                </div>
                            ) : (
                                <button onClick={() => openAuthModal('login')} className="px-2.5 py-1.5 bg-primary text-white font-bold rounded-full text-[11px]">Login</button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className={`flex items-center gap-1 p-0.5 rounded-full ${mobilePillClasses} flex-wrap justify-center`} style={desktopBannerPillStyle}>
                            <NavLink to="/deals" className={getMobileNavLinkClass}>{t('header.deals')}</NavLink>
                            <NavLink to="/genie" className={({ isActive }: { isActive: boolean }) => `${getMobileNavLinkClass({ isActive })} flex items-center gap-1 ${isActive ? 'text-purple-500' : 'hover:text-purple-500'}`}>
                                <span className="text-purple-500"><GenieIcon /></span> Genie
                            </NavLink>
                            <NavLink to="/luxury" className={({ isActive }: { isActive: boolean }) => `${getMobileNavLinkClass({ isActive })} flex items-center gap-1 ${isActive ? 'text-[#0066FF]' : 'hover:text-[#0066FF]'}`}>
                                <span className="text-[#0066FF]"><DiamondIcon /></span> Luxury
                            </NavLink>
                            <NavLink to="/services/marketplace" className={({ isActive }: { isActive: boolean }) => `${getMobileNavLinkClass({ isActive })} flex items-center gap-1 ${isActive ? 'text-primary' : 'hover:text-primary'}`}>
                                <span className="text-primary"><ListIcon /></span> Services
                            </NavLink>
                            <NavLink to="/spotlight" className={({ isActive }: { isActive: boolean }) => `${getMobileNavLinkClass({ isActive })} flex items-center gap-1 ${isActive ? 'text-sky-500' : 'hover:text-sky-500'}`}>
                                <span className="text-sky-500"><SpotlightIcon /></span> Spotlight
                            </NavLink>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveMenu(activeMenu === 'explore' ? null : 'explore')}
                                className={`${getMobileNavLinkClass({ isActive: activeMenu === 'explore' })} whitespace-nowrap transition-all duration-300 ${
                                    activeMenu === 'explore' ? 'bg-primary/20 shadow-md' : ''
                                }`}
                            >
                                <motion.span
                                    animate={{ rotate: activeMenu === 'explore' ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="inline-block"
                                >
                                    ✨
                                </motion.span>
                                {t('header.explore')}
                            </motion.button>
                        </div>
                        <AnimatePresence>
                            {activeMenu === 'explore' && <ExploreMenu onClose={() => setActiveMenu(null)} onOpenOmni={handleOpenOmni} />}
                        </AnimatePresence>
                    </div>
                </div>
            </header>
            
            {isMobileSearchOpen && (
                <div className="fixed inset-0 z-[60] bg-background md:hidden animate-fade-in-up">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 h-[72px] border-b border-border">
                        <button onClick={closeMobileSearch} className="p-2 text-text-secondary"><BackIcon /></button>
                        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                            <input
                                type="search"
                                placeholder="Search products, pages, and features..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-14 px-5 text-base rounded-full bg-surface-soft text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                                autoFocus
                            />
                        </form>
                        <button type="button" onClick={startVoiceSearch} className={`p-2 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-text-secondary'}`}>
                            <MicIcon />
                        </button>
                    </div>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5 overflow-y-auto h-[calc(100vh-72px)]">
                        {searchQuery.trim().length === 0 ? (
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Quick Links</h4>
                                <div className="flex flex-col gap-2">
                                    {quickLinks.map(link => (
                                        <Link key={link.path} to={link.path} onClick={closeMobileSearch} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm font-semibold text-text-primary">
                                            {link.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Products</h4>
                                    {isLoadingSearch ? (
                                        <SearchResultsSkeleton />
                                    ) : products.length === 0 ? (
                                        <div className="rounded-xl border border-border bg-surface p-4 text-center">
                                            <LottieAnimation src={uiLottieAnimations.noResults} className="h-24 w-24 mx-auto" loop autoplay />
                                            <p className="text-sm text-text-secondary mt-1">No results found for "{searchQuery}"</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {products.map(product => {
                                                const productImage = product.imageUrls?.[0] || product.images?.[0] || `https://picsum.photos/seed/${product.id}/80/80`;
                                                return (
                                                    <Link key={product.id} to={`/item/${product.id}`} onClick={closeMobileSearch} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
                                                        <img src={productImage} alt={product.title} className="w-12 h-12 rounded-lg object-cover bg-surface-soft" />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-text-primary line-clamp-1">
                                                                <HighlightMatch text={product.title} highlight={searchQuery} />
                                                            </p>
                                                            <p className="text-xs text-text-secondary">
                                                                ${product.salePrice || product.rentalPrice || product.price || 0}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {filteredQuickLinks.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Explore</h4>
                                        <div className="flex flex-col gap-2">
                                            {filteredQuickLinks.map(link => (
                                                <Link key={link.path} to={link.path} onClick={closeMobileSearch} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm font-semibold text-text-primary">
                                                    <HighlightMatch text={link.name} highlight={searchQuery} />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
            
            <AnimatePresence>
            {isSearchOpen && (
                <motion.div
                    ref={searchContainerRef}
                    onMouseEnter={handleSearchEnter}
                    onMouseLeave={handleSearchLeave}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={searchVariants}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    style={{
                        position: 'fixed',
                        top: `${searchPosition.top}px`,
                        left: `${searchPosition.left}px`,
                        transformOrigin: 'top center',
                    }}
                    className={`z-40 w-[640px] bg-surface/90 backdrop-blur-md shadow-lg border border-border/80
                        ${showSearchPanel ? 'rounded-2xl p-4' : 'h-12 p-1 rounded-full'}`}
                >
                    <form onSubmit={handleSearchSubmit} className={`relative ${showSearchPanel ? '' : 'h-full'}`}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                            <SearchIcon />
                        </div>
                        <input 
                            type="search" 
                            placeholder="Search for products, features, Pixe, and more..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className="w-full h-full pl-12 pr-12 py-3 text-base bg-transparent focus:ring-0 rounded-full border-none text-text-primary"
                            autoComplete="off" 
                            autoFocus
                        />
                        <button type="button" onClick={startVoiceSearch} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-surface-soft transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-text-secondary'}`}>
                            <MicIcon />
                        </button>
                    </form>

                    {showSearchPanel && (
                        <div className="transition-opacity duration-300 opacity-100">
                            <div className="mt-4 border-t border-border/80 pt-4 max-h-[60vh] overflow-y-auto">
                                {isLoadingSearch ? (
                                    <SearchResultsSkeleton />
                                ) : !hasSearchResults ? (
                                    <div className="text-center py-10">
                                        <LottieAnimation src={uiLottieAnimations.noResults} className="h-28 w-28 mx-auto" loop autoplay />
                                        <p className="text-text-secondary mt-1">No results found for "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="md:col-span-2">
                                            {products.length > 0 && (
                                                <>
                                                    <h4 className="font-bold text-xs mb-3 text-text-secondary uppercase tracking-wider">Product Suggestions</h4>
                                                    <div className="space-y-2">
                                                        {products.map(p => (
                                                            <Link to={`/item/${p.id}`} onClick={() => setIsSearchOpen(false)} key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-soft">
                                                                <img src={p.imageUrls[0]} alt={p.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                                                                <div><p className="font-semibold text-sm line-clamp-1 text-text-primary"><HighlightMatch text={p.title} highlight={searchQuery} /></p></div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {filteredQuickLinks.length > 0 && (
                                            <div className="md:col-span-1">
                                                <h4 className="font-bold text-xs mb-3 text-text-secondary uppercase tracking-wider">Explore Urban Prime</h4>
                                                <ul className="space-y-1">
                                                    {filteredQuickLinks.map(link => (
                                                        <li key={link.path}>
                                                            <Link to={link.path} onClick={() => setIsSearchOpen(false)} className="block p-1.5 rounded-md text-sm font-semibold text-text-secondary hover:bg-surface-soft hover:text-primary">
                                                                <HighlightMatch text={link.name} highlight={searchQuery} />
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

export default Header;


