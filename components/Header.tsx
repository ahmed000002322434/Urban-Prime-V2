
import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import type { Item, Notification } from '../types';
import LogoutConfirmationModal from './LogoutConfirmationModal';
import { useTheme } from '../hooks/useTheme';
import { itemService } from '../services/itemService';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { CATEGORIES } from '../constants';

// --- ICONS ---
const SearchIcon = ({size=20}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>;
const GenieIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
const DiamondIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PakistanFlagIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11.5" fill="#14573C" stroke="#EAEAEA" strokeWidth="0.5"/><path d="M15.195 8.32C14.7731 9.47171 13.7225 10.2783 12.87 10.43C13.8812 10.7419 14.5443 11.6644 14.67 12.85C15.1432 11.8349 15.9392 11.082 16.5 10.85C15.8953 10.2217 15.2892 9.25514 15.195 8.32Z" fill="white"/><path d="M16.5 10.05L15.9886 11.4623L14.5 11.05L15.6114 12.1377L15.5 13.8L16.5 12.9L17.5 13.8L17.3886 12.1377L18.5 11.05L17.0114 11.4623L16.5 10.05Z" fill="white"/></svg>);

// --- DROPDOWN MENUS ---
const AccountMenu: React.FC<{ user: any, onLogout: () => void }> = ({ user, onLogout }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    transition={{ duration: 0.2 }}
    className="absolute top-full right-0 mt-4 w-64 bg-white/80 dark:bg-[#111]/80 backdrop-blur-3xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 overflow-hidden z-50 ring-1 ring-black/5"
  >
    <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
        <Link to="/profile" className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">View Profile</Link>
    </div>
    <ul className="py-2">
        <li><Link to="/profile/orders" className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Orders</Link></li>
        <li><Link to="/profile/settings" className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Settings</Link></li>
        <li className="border-t border-gray-100 dark:border-white/5 mt-1 pt-1"><button onClick={onLogout} className="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium">Sign Out</button></li>
    </ul>
  </motion.div>
);

const NotificationMenu: React.FC<{ notifications: Notification[] }> = ({ notifications }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full right-0 mt-4 w-80 bg-white/80 dark:bg-[#111]/80 backdrop-blur-3xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 overflow-hidden z-50 ring-1 ring-black/5 max-h-96 overflow-y-auto"
    >
      <div className="p-3 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 sticky top-0 backdrop-blur-md z-10">
          <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications</span>
          {notifications.length > 0 && <span className="text-xs text-primary font-medium">{notifications.length} new</span>}
      </div>
      {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No new notifications</div>
      ) : (
          <ul>
              {notifications.map(n => (
                  <li key={n.id} className={`border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${n.type === 'SALE' ? 'bg-green-50/50 dark:bg-green-900/10 border-l-4 border-l-green-500' : ''}`}>
                      <Link to={n.link || '#'} className="block p-4">
                          {n.type === 'SALE' && <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1 block">New Sale!</span>}
                          <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </Link>
                  </li>
              ))}
          </ul>
      )}
    </motion.div>
  );

const ExploreMenu: React.FC = () => (
    <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full left-0 mt-4 w-56 bg-white/80 dark:bg-[#111]/80 backdrop-blur-3xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 overflow-hidden z-50 ring-1 ring-black/5"
    >
        <ul className="py-2">
            <li><Link to="/browse" className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Browse Products</Link></li>
            <li><Link to="/reels" className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Pixe Feed (TikTok)</Link></li>
            <li><Link to="/battles" className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Product Battles</Link></li>
            <li><Link to="/live" className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Live Shopping</Link></li>
            <li><Link to="/inspiration" className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">Inspiration Hub</Link></li>
        </ul>
    </motion.div>
);

interface NavLinkItemProps {
    to: string;
    children?: React.ReactNode;
    icon?: React.ReactNode;
}

// Navigation Link with animated background
const NavLinkItem: React.FC<NavLinkItemProps> = ({ to, children, icon }) => (
    <NavLink 
        to={to} 
        className={({ isActive }) => `
            relative px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 z-10
            ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}
        `}
    >
        {({ isActive }) => (
            <>
                {isActive && (
                    <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                {icon}
                <span>{children}</span>
            </>
        )}
    </NavLink>
);

// --- UNIVERSAL SEARCH COMPONENT ---
const FloatingSearch: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [queryText, setQueryText] = useState('');
    const [results, setResults] = useState<{items: Item[], categories: any[], pages: any[]}>({ items: [], categories: [], pages: [] });
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Universal Pages List
    const appPages = [
        { name: 'Profile', link: '/profile' },
        { name: 'Settings', link: '/profile/settings' },
        { name: 'Orders', link: '/profile/orders' },
        { name: 'Wishlist', link: '/profile/wishlist' },
        { name: 'Store', link: '/profile/store' },
        { name: 'Genie', link: '/genie' },
        { name: 'Live Shopping', link: '/live' },
        { name: 'Reels', link: '/reels' },
        { name: 'Help Center', link: '/support-center' },
    ];

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchResults = async () => {
            if (queryText.length < 2) {
                setResults({ items: [], categories: [], pages: [] });
                return;
            }
            
            // 1. Search Pages
            const matchedPages = appPages.filter(p => p.name.toLowerCase().includes(queryText.toLowerCase()));
            
            // 2. Search Items & Categories
            const { items, categories } = await itemService.searchItems(queryText);
            
            setResults({ items, categories, pages: matchedPages });
        };
        
        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [queryText]);

    const handleNavigate = (link: string) => {
        navigate(link);
        onClose();
        setQueryText('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl z-[100]"
                    onMouseLeave={onClose}
                >
                    <div className="bg-white/90 dark:bg-black/90 backdrop-blur-3xl rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-4">
                            <SearchIcon size={22} />
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={queryText}
                                onChange={e => setQueryText(e.target.value)}
                                placeholder="Search products, pages, categories..." 
                                className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            {queryText && <button onClick={() => setQueryText('')}><XIcon /></button>}
                        </div>
                        
                        {(results.pages.length > 0 || results.categories.length > 0 || results.items.length > 0) ? (
                            <div className="max-h-[60vh] overflow-y-auto p-2">
                                {results.pages.length > 0 && (
                                    <div className="mb-3">
                                        <h4 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Pages</h4>
                                        {results.pages.map((page, i) => (
                                            <button key={i} onClick={() => handleNavigate(page.link)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors">
                                                {page.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {results.categories.length > 0 && (
                                    <div className="mb-3">
                                        <h4 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Categories</h4>
                                        {results.categories.map((cat, i) => (
                                             <button key={i} onClick={() => handleNavigate(`/browse?category=${cat.id}`)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors">
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.items.length > 0 && (
                                    <div>
                                        <h4 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Products</h4>
                                        {results.items.map(item => (
                                             <button key={item.id} onClick={() => handleNavigate(`/item/${item.id}`)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 transition-colors">
                                                <img src={item.imageUrls[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100"/>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{item.title}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">${item.salePrice || item.rentalPrice}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : queryText.length > 1 && (
                            <div className="p-8 text-center text-gray-400 text-sm">No results found.</div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


// --- COMPONENT: Header ---
const Header: React.FC = () => {
    const { isAuthenticated, user, openAuthModal, logout } = useAuth();
    const { cartCount } = useCart();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { scrollY } = useScroll();
    
    // State
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    // Refs
    const menuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 20);
    });

    // Real-time Notifications Listener
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.id),
            where('isRead', '==', false), 
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(newNotifications);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMenuEnter = (menu: string) => {
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
        setActiveMenu(menu);
    };
    const handleMenuLeave = () => {
        menuTimeoutRef.current = setTimeout(() => setActiveMenu(null), 200);
    };

    const handleSearchClick = () => {
        setIsSearchOpen(true);
    };

    // --- Styling Constants ---
    // Unified base style for the "pill" elements
    const basePillStyles = `
        flex items-center backdrop-blur-3xl border
        transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
        rounded-full shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)]
        pointer-events-auto h-14
    `;

    // Dynamic coloring based on theme
    let pillTheme = `bg-white/80 border-white/50 text-gray-900 dark:bg-[#121212]/80 dark:border-white/10 dark:text-white`;
    if (theme === 'icy') pillTheme = `bg-[rgba(225,245,255,0.7)] border-white/60 text-[#023E8A]`;
    if (theme === 'hydra') pillTheme = `bg-[rgba(0,20,40,0.8)] border-[rgba(0,229,255,0.3)] text-[#E0F7FA] shadow-[0_0_20px_rgba(0,229,255,0.15)]`;
    if (theme === 'sandstone') pillTheme = `bg-[rgba(230,220,200,0.7)] border-[rgba(255,255,255,0.3)] text-[#3E2723]`;

    const pillClass = `${basePillStyles} ${pillTheme}`;
    
    // Icon Button Styles - Perfectly Round & Centered
    const iconBtnClass = `w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors relative flex-shrink-0`;

    return (
        <>
            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={logout}
            />

            {/* Floating Search Overlay - Centered in middle of screen */}
            <FloatingSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            {/* MAIN HEADER CONTAINER - Grid Layout for Strict Positioning */}
            <motion.header 
                className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 flex justify-center pointer-events-none"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="w-full max-w-7xl grid grid-cols-[auto_1fr_auto] items-center gap-4">
                    
                    {/* 1. Left Pill: Logo */}
                    <motion.div className={`${pillClass} px-6 self-start`} layout>
                        <Link to="/" className="text-xl font-extrabold font-display tracking-tight flex items-center gap-1">
                            <span className="text-inherit">Urban</span>
                            <span className="text-primary">Prime</span>
                        </Link>
                    </motion.div>

                    {/* 2. Center Pill: Navigation - Centered in Grid */}
                    <div className="flex justify-center w-full">
                        <motion.nav className={`${pillClass} px-2 md:px-4 hidden md:flex`} layout>
                            <NavLinkItem to="/deals">Deals</NavLinkItem>
                            <div className="w-px h-4 bg-current opacity-20 mx-1"></div>
                            <NavLinkItem to="/browse/services">Services</NavLinkItem>
                            
                            {/* Search Button in Middle */}
                            <div className="relative mx-1">
                                <button onClick={handleSearchClick} className={iconBtnClass}>
                                    <SearchIcon size={20} />
                                </button>
                            </div>

                            <NavLinkItem to="/genie" icon={<GenieIcon />}>Genie</NavLinkItem>
                            <NavLinkItem to="/luxury" icon={<DiamondIcon />}>Luxury</NavLinkItem>
                            
                            <div className="relative" onMouseEnter={() => handleMenuEnter('explore')} onMouseLeave={handleMenuLeave}>
                                <button className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${activeMenu === 'explore' ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                    Explore
                                </button>
                                <AnimatePresence>
                                    {activeMenu === 'explore' && <ExploreMenu />}
                                </AnimatePresence>
                            </div>
                        </motion.nav>
                    </div>

                    {/* 3. Right Pill: Actions - Aligned End */}
                    <motion.div className={`${pillClass} px-2 flex justify-end self-start`} layout>
                        <button className={iconBtnClass}>
                            <PakistanFlagIcon />
                        </button>

                        {isAuthenticated && (
                            <div className="relative" onMouseEnter={() => handleMenuEnter('notifications')} onMouseLeave={handleMenuLeave}>
                                <button className={iconBtnClass}>
                                    <BellIcon />
                                    {notifications.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-black"></span>}
                                </button>
                                <AnimatePresence>
                                    {activeMenu === 'notifications' && <NotificationMenu notifications={notifications} />}
                                </AnimatePresence>
                            </div>
                        )}

                        <div className="relative" onMouseEnter={() => handleMenuEnter('account')} onMouseLeave={handleMenuLeave}>
                            {isAuthenticated && user ? (
                                <Link to="/profile" className="flex items-center gap-3 pl-1 pr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-1 h-10">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-black shadow-sm">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-bold truncate max-w-[80px] hidden xl:block pr-2">
                                        {user.name.split(' ')[0]}
                                    </span>
                                </Link>
                            ) : (
                                <button onClick={() => openAuthModal('login')} className={iconBtnClass}>
                                    <UserIcon />
                                </button>
                            )}
                            <AnimatePresence>
                                {activeMenu === 'account' && user && <AccountMenu user={user} onLogout={() => setIsLogoutModalOpen(true)} />}
                            </AnimatePresence>
                        </div>

                        <NavLink to="/cart" className={`${iconBtnClass} relative ml-1`}>
                            <CartIcon />
                            {cartCount > 0 && <span className="absolute top-2 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-white dark:ring-black">{cartCount}</span>}
                        </NavLink>
                    </motion.div>

                </div>
            </motion.header>

            {/* Mobile Header (Simple Fallback) */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 pointer-events-auto">
                 <button onClick={handleSearchClick} className="p-2"><SearchIcon /></button>
                 <Link to="/" className="text-lg font-extrabold font-display tracking-tight"><span className="text-inherit">Urban</span><span className="text-primary">Prime</span></Link>
                 <NavLink to="/cart" className="relative p-2">
                    <CartIcon />
                    {cartCount > 0 && <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-primary rounded-full border-2 border-white dark:border-black"></span>}
                </NavLink>
            </div>
        </>
    );
};

export default Header;
