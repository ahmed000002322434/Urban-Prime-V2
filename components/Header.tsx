
// components/Header.tsx
// FIX: Corrected the React import to include necessary hooks like useState, useRef, useEffect, and useCallback.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { itemService, userService } from '../services/itemService';
import type { Item, Notification, User } from '../types';
import Spinner from './Spinner';
import { useTranslation } from '../hooks/useTranslation';
import BackButton from './BackButton';
import LogoutConfirmationModal from './LogoutConfirmationModal';

const { Link, NavLink, useLocation, useNavigate } = ReactRouterDOM as any;

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ReelsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 5.564v12.872a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V5.564a2 2 0 0 0-2-2h-15a2 2 0 0 0-2 2z"></path><path d="m10 10.436 5 3.076-5 3.076v-6.152z"></path><path d="M7 3.564v-2"></path><path d="M12 3.564v-2"></path><path d="M17 3.564v-2"></path></svg>;
const BattleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 17.5 7.5-7.5-2.5-2.5-7.5 7.5-2.5-2.5L2 22"/><path d="m18 14 4-4"/><path d="m6 8 4 4"/><path d="M3 21l7-7"/></svg>;
const LiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const GenieIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
const DiamondIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>;

// --- DROPDOWN ICONS ---
const SupportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.504 1.012 4.735 2.636 6.364L2 22l3.636-2.636A9.955 9.955 0 0 0 12 22z"/><path d="M8 14c.43.86 2.43 2.29 4 2.29s3.57-1.43 4-2.29"/></svg>;
const PakistanFlagIcon = () => (<svg width="24" height="24" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11.5" fill="#14573C" stroke="#EAEAEA" strokeWidth="0.5"/><path d="M15.195 8.32C14.7731 9.47171 13.7225 10.2783 12.87 10.43C13.8812 10.7419 14.5443 11.6644 14.67 12.85C15.1432 11.8349 15.9392 11.082 16.5 10.85C15.8953 10.2217 15.2892 9.25514 15.195 8.32Z" fill="white"/><path d="M16.5 10.05L15.9886 11.4623L14.5 11.05L15.6114 12.1377L15.5 13.8L16.5 12.9L17.5 13.8L17.3886 12.1377L18.5 11.05L17.0114 11.4623L16.5 10.05Z" fill="white"/></svg>);
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>;
const ReviewIcon = () => <svg width="20" height="20" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="m15 5 3 3"/></svg>;
const CouponIcon = () => <svg width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a2 2 0 1 0-4 0v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a4 4 0 1 1 8 0Z"/><path d="M2 16.22V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.78c0-1.07-1.28-1.74-2.22-1.21-.52.29-1.04.53-1.58.7-1.12.35-2.28 0-3.2-1a4 4 0 0 0-4 0c-.92 1-2.08 1.35-3.2 1-.54-.17-1.06-.4-1.58-.7C3.28 14.48 2 15.15 2 16.22Z"/></svg>;
const BalanceIcon = () => <svg width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line><path d="M12 14a2 2 0 1 0-2-2"></path><path d="M10 14a2 2 0 1 0 2-2"></path></svg>;
const FollowedStoreIcon = () => <svg width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>;
const PermissionsIcon = () => <svg width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><path d="m10 10 2 2 4-4"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const SwitchAccountsIcon = () => <svg width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>;
const LogOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const HeadphonesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2z"/></svg>;
const MessageSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const MoreHorizontalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>;
const PurchaseProtectionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 10h6"/><path d="M9 14h4"/></svg>;
const AdminPanelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="3" y="15" width="7" height="5" /><rect x="14" y="11" width="7" height="9" /></svg>;


// --- DROPDOWN COMPONENTS ---
const AccountMenu: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const menuItems = [
        { icon: <ListIcon />, text: 'Your orders', path: '/profile/orders' },
        { icon: <ReviewIcon />, text: 'Your reviews', path: '/profile/reviews' },
        { icon: <UserIcon />, text: 'Your profile', path: `/user/${user.id}` },
        { icon: <CouponIcon />, text: 'Coupons & offers', path: '/profile/coupons' },
        { icon: <BalanceIcon />, text: 'Credit balance', path: '/profile/wallet' },
        { icon: <FollowedStoreIcon />, text: 'Followed stores', path: '/profile/followed-stores' },
        { icon: <ClockIcon />, text: 'Browsing history', path: '/profile/history' },
        { icon: <MapPinIcon />, text: 'Addresses', path: '/profile/settings/addresses' },
        { icon: <ShieldCheckIcon />, text: 'Account security', path: '/profile/settings/trust-and-verification' },
        { icon: <PermissionsIcon />, text: 'Permissions', path: '/profile/permissions' },
        { icon: <SwitchAccountsIcon />, text: 'Switch accounts', path: '/profile/switch-accounts' },
    ];

    return (
      <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-lg shadow-2xl border border-border z-50 animate-dropdown-fade-in-up">
        <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-soft rounded-full flex items-center justify-center font-bold">{user.name.charAt(0).toUpperCase()}</div>
                <span className="font-bold text-lg text-text-primary">{user.name}</span>
            </div>
        </div>
        <ul className="py-2 max-h-[60vh] overflow-y-auto">
            {user.isAdmin && (
                <>
                    <li>
                        <Link
                            to="/admin/dashboard"
                            className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-primary hover:bg-surface-soft"
                        >
                            <AdminPanelIcon /> Admin Panel
                        </Link>
                    </li>
                    <div className="h-px bg-border my-1 mx-4"></div>
                </>
            )}
            {menuItems.map(item => (
                <li key={item.text}>
                    <Link to={item.path} className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary">
                        {item.icon} {item.text}
                    </Link>
                </li>
            ))}
             <li>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary"
                    >
                    <LogOutIcon /> Sign out
                </button>
            </li>
        </ul>
      </div>
    );
};

const NotificationMenu: React.FC<{ notifications: Notification[], onMarkAsRead: () => void, unreadCount: number }> = ({ notifications, onMarkAsRead, unreadCount }) => {
    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface rounded-lg shadow-2xl border border-border z-50 animate-dropdown-fade-in-up">
            <div className="p-3 border-b border-border flex justify-between items-center">
                <h4 className="font-bold text-text-primary">Notifications</h4>
                {unreadCount > 0 && <button onClick={onMarkAsRead} className="text-xs font-semibold text-primary hover:underline">Mark all as read</button>}
            </div>
            {notifications.length === 0 ? (
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
                <Link to="/profile/settings/notifications" className="text-sm font-semibold text-primary hover:underline">Notification Settings</Link>
            </div>
        </div>
    );
};
  
const SupportMenu: React.FC = () => {
    const menuItems = [
        { icon: <HeadphonesIcon />, text: 'Support center', path: '/support-center' },
        { icon: <ShieldCheckIcon />, text: 'Safety center', path: '/safety-center' },
        { icon: <MessageSquareIcon />, text: 'Chat with Urban Prime', path: '/chat' },
        { icon: <PurchaseProtectionIcon />, text: 'Urban Prime purchase protection', path: '/purchase-protection' },
        { icon: <LockIcon />, text: 'Privacy policy', path: '/privacy-policy' },
        { icon: <MoreHorizontalIcon />, text: 'Terms of use', path: '/terms-of-use' },
    ];

    return (
        <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-lg shadow-2xl border border-border z-50 animate-dropdown-fade-in-up">
            <ul className="py-2">
            {menuItems.map(item => (
                <li key={item.text}><Link to={item.path} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-soft hover:text-text-primary">{item.icon} {item.text}</Link></li>
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
                <Link to="/select-language" className="text-sm font-bold text-primary hover:underline mt-1">{t('langMenu.changeLanguage')}</Link>
            </div>
        </div>
    );
};

const ExploreMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    const features = [
        { titleKey: 'exploreMenu.pixe.title', descKey: 'exploreMenu.pixe.desc', link: '/reels' },
        { titleKey: 'exploreMenu.battles.title', descKey: 'exploreMenu.battles.desc', link: '/battles' },
        { titleKey: 'exploreMenu.games.title', descKey: 'exploreMenu.games.desc', link: '/games' },
        { titleKey: 'exploreMenu.affiliate.title', descKey: 'exploreMenu.affiliate.desc', link: '/affiliate-program' },
        { titleKey: 'exploreMenu.stores.title', descKey: 'exploreMenu.stores.desc', link: '/stores' },
        { titleKey: 'exploreMenu.browse.title', descKey: 'exploreMenu.browse.desc', link: '/browse' },
        { titleKey: 'exploreMenu.sellers.title', descKey: 'exploreMenu.sellers.desc', link: '/sellers' },
        { titleKey: 'exploreMenu.events.title', descKey: 'exploreMenu.events.desc', link: '/events' }
    ];
  
    return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[640px] bg-surface rounded-lg shadow-2xl border border-border z-50 p-4 animate-dropdown-fade-in-up">
            <div className="grid grid-cols-2 gap-4">
                {features.map(feature => (
                    <Link to={feature.link} onClick={onClose} key={feature.titleKey} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-surface-soft transition-colors">
                        <div className="flex-1">
                            <p className="font-bold text-sm text-text-primary">{t(feature.titleKey)}</p>
                            <p className="text-xs text-text-secondary">{t(feature.descKey)}</p>
                        </div>
                        <div className="text-text-secondary/50">
                            <span className="transition-transform duration-200 ease-in-out inline-block group-hover:-translate-y-0.5">➡</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
  
// --- MAIN HEADER ---
const Header: React.FC = () => {
    const { isAuthenticated, user, openAuthModal, logout } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const { t, currentLanguageInfo, isTranslating } = useTranslation();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuTimeoutRef = useRef<number | null>(null);

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
    
    // --- Notification State ---
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (user) {
            const userNotifs = await userService.getNotificationsForUser(user.id);
            setNotifications(userNotifs);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
        }
    }, [isAuthenticated, fetchNotifications]);

    const handleMarkAsRead = async () => {
        if (user) {
            await userService.markNotificationsAsRead(user.id);
            fetchNotifications(); // Refetch to update UI
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
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
        setActiveMenu(menu);
    };
    const handleMenuLeave = () => {
        menuTimeoutRef.current = window.setTimeout(() => setActiveMenu(null), 200);
    };
    
    const handleSearchEnter = () => {
        isHoveringSearchRef.current = true;
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
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


    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
        `px-3 py-2 text-sm font-semibold transition-colors duration-300 rounded-md ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`;

    const isHomePage = location.pathname === '/';

    const pillClasses = `
        transition-all duration-300
        ${isScrolled 
            ? 'bg-surface/80 backdrop-blur-md shadow-md border border-border/80' 
            : 'bg-surface/30 backdrop-blur-sm border border-white/20'
        }
    `;

    const searchVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
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
                `}
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    {/* Left Pill: Logo */}
                    <div className={`flex-shrink-0 px-4 py-2 rounded-full ${pillClasses}`}>
                        <Link to="/" className="text-xl font-extrabold font-display">
                           <span className="text-text-primary">Urban</span><span className="text-primary">Prime</span>
                        </Link>
                    </div>
                    
                    {/* Center Pill: Navigation + Search */}
                    <nav ref={navContainerRef} className={`flex items-center gap-1 p-1 rounded-full ${pillClasses}`}>
                        <NavLink to="/deals" className={getNavLinkClass}>{t('header.deals')}</NavLink>
                        <NavLink to="/live" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-red-500' : 'hover:text-red-500'}`}>
                             <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Live
                        </NavLink>
                        <NavLink to="/genie" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-purple-500' : 'hover:text-purple-500'}`}>
                             <span className="text-purple-500"><GenieIcon /></span> Genie
                        </NavLink>
                        
                        <div ref={searchIconRef} onMouseEnter={handleSearchEnter} onMouseLeave={handleSearchLeave}>
                            <button className="p-2.5 rounded-full text-text-secondary bg-surface-soft hover:bg-gray-200" aria-label="Search"><SearchIcon/></button>
                        </div>
                        
                        <NavLink to="/luxury" className={({ isActive }: { isActive: boolean }) => `${getNavLinkClass({isActive})} flex items-center gap-1 ${isActive ? 'text-[#0066FF]' : 'hover:text-[#0066FF]'}`}>
                             <span className="text-[#0066FF]"><DiamondIcon /></span> Luxury
                        </NavLink>
                        <div onMouseEnter={() => handleMenuEnter('explore')} onMouseLeave={handleMenuLeave}>
                            <button className={`px-3 py-2 text-sm font-semibold rounded-md ${getNavLinkClass({isActive: false})}`}>{t('header.explore')}</button>
                            {activeMenu === 'explore' && <ExploreMenu onClose={() => setActiveMenu(null)} />}
                        </div>
                    </nav>
                    
                    {/* Right Pill: User Actions */}
                    <div className={`flex items-center gap-1 p-1 rounded-full ${pillClasses}`} onMouseLeave={handleMenuLeave}>
                        <div className="relative" onMouseEnter={() => handleMenuEnter('account')}>
                            {isAuthenticated && user ? (
                                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-soft text-text-primary">
                                    <div className="w-8 h-8 bg-surface-soft rounded-full flex items-center justify-center font-bold text-sm text-text-secondary">{user.name.charAt(0).toUpperCase()}</div>
                                </button>
                            ) : (
                                <button onClick={() => openAuthModal('login')} className="p-2 rounded-full hover:bg-surface-soft text-text-primary">
                                    <UserIcon />
                                </button>
                            )}
                            {activeMenu === 'account' && user && <AccountMenu user={user} onLogout={() => setIsLogoutModalOpen(true)} />}
                        </div>
                        
                        {isAuthenticated && (
                             <div className="relative" onMouseEnter={() => handleMenuEnter('notifications')}>
                                <button className="relative p-2 rounded-full hover:bg-surface-soft text-text-primary">
                                    <BellIcon />
                                    {unreadCount > 0 && <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-surface">{unreadCount}</span>}
                                </button>
                                {activeMenu === 'notifications' && <NotificationMenu notifications={notifications} onMarkAsRead={handleMarkAsRead} unreadCount={unreadCount} />}
                            </div>
                        )}

                        <div className="relative" onMouseEnter={() => handleMenuEnter('language')}>
                            <button className="p-2 rounded-full hover:bg-surface-soft text-text-primary">
                                {isTranslating ? <Spinner size="sm" className="w-6 h-6"/> : <PakistanFlagIcon />}
                            </button>
                             {activeMenu === 'language' && <LanguageMenu />}
                        </div>
                        
                        <NavLink to="/cart" className="relative p-2 rounded-full hover:bg-surface-soft text-text-primary">
                            <CartIcon />
                            {cartCount > 0 && <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{cartCount}</span>}
                        </NavLink>
                    </div>
                </div>
            </header>

            {/* Mobile Header */}
             <header 
                className={`
                    fixed top-0 left-0 right-0 z-50 h-[72px]
                    md:hidden transition-colors duration-300
                    ${isScrolled || !isHomePage
                        ? 'bg-surface/80 backdrop-blur-md border-b border-border/80'
                        : 'bg-transparent'
                    }
                `}
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full relative">
                    {isHomePage ? (
                        <Link to="/" className="text-2xl font-extrabold font-display"><span className="text-text-primary">Urban</span><span className="text-primary">Prime</span></Link>
                    ) : (
                        <BackButton />
                    )}
                     {!isHomePage && (
                        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
                            <span className="text-2xl font-extrabold font-display"><span className="text-text-primary">UB</span><span className="text-primary">P</span></span>
                        </Link>
                    )}
                    <div className="flex items-center gap-2">
                        <NavLink to="/battles" className="p-2 rounded-full hover:bg-surface-soft"><BattleIcon /></NavLink>
                        <NavLink to="/live" className="p-2 rounded-full hover:bg-surface-soft text-red-500"><LiveIcon /></NavLink>
                        <NavLink to="/reels" className="p-2 rounded-full hover:bg-surface-soft"><ReelsIcon /></NavLink>
                        <button onClick={() => setIsMobileSearchOpen(true)} className="p-2 rounded-full hover:bg-surface-soft"><SearchIcon /></button>
                        {isAuthenticated && user ? (
                            <div 
                                className="relative" 
                                onMouseEnter={() => handleMenuEnter('account')} 
                                onMouseLeave={handleMenuLeave}
                            >
                                <button
                                    onClick={() => setActiveMenu(activeMenu === 'account' ? null : 'account')}
                                    aria-label="Account menu"
                                >
                                    <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full" />
                                </button>
                                {activeMenu === 'account' && <AccountMenu user={user} onLogout={() => setIsLogoutModalOpen(true)} />}
                            </div>
                        ) : (<button onClick={() => openAuthModal('login')} className="px-4 py-2 bg-primary text-white font-bold rounded-full text-sm">Login</button>)}
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
                                className="w-full h-11 px-4 rounded-full bg-surface-soft text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
                                        <div className="py-6 flex justify-center"><Spinner /></div>
                                    ) : products.length === 0 ? (
                                        <p className="text-sm text-text-secondary">No products found for "{searchQuery}"</p>
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
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        top: `${searchPosition.top}px`,
                        left: `${searchPosition.left}px`,
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
                        <div className={`transition-opacity duration-300 ${hasSearchResults || isLoadingSearch ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="mt-4 border-t border-border/80 pt-4 max-h-[60vh] overflow-y-auto">
                                {isLoadingSearch ? (
                                    <div className="text-center py-10"><Spinner /></div>
                                ) : !hasSearchResults ? (
                                    <div className="text-center py-10">
                                        <p className="text-text-secondary">No results found for "{searchQuery}"</p>
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
