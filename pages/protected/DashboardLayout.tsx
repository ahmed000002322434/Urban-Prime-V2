
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Icons
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>;
const WishlistIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const MessagesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const EarningsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const AnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const ProductsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const OffersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const CreatorHubIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 1-6 2-6-2-6 2v20l6-2 6 2 6-2V1z"/><path d="m12 3 6 2"/><path d="M6 3v20"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M4 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M18 12a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2H4"/></svg>;
const AffiliateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const FinancesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 12h.01"/></svg>;
const CollectionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4"/><rect x="2" y="10" width="20" height="12" rx="2"/></svg>;
const PromotionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>;
const ReviewIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="m15 5 3 3"/></svg>;
const CouponIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a2 2 0 1 0-4 0v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a4 4 0 1 1 8 0Z"/><path d="M2 16.22V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.78c0-1.07-1.28-1.74-2.22-1.21-.52.29-1.04.53-1.58.7-1.12.35-2.28 0-3.2-1a4 4 0 0 0-4 0c-.92 1-2.08 1.35-3.2 1-.54-.17-1.06-.4-1.58-.7C3.28 14.48 2 15.15 2 16.22Z"/></svg>;
const FollowedStoreIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const PermissionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><path d="m10 10 2 2 4-4"/></svg>;
const SwitchAccountsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>;


const DashboardLayout: React.FC = () => {
    const { user, logout } = useAuth();

    const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm font-medium ${
            isActive 
                ? 'bg-slate-100 text-slate-900 border-l-2 border-slate-900' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`;
    
    const NavGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div>
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
            <ul className="space-y-1">{children}</ul>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row">
                {/* Sidebar */}
                <aside className="w-full md:w-64 md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-slate-200 p-6">
                    <div className="flex md:flex-col items-center md:items-start md:gap-3 pb-6 md:pb-6 border-b border-slate-200 mb-6">
                        <img src={user?.avatar} alt={user?.name} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="ml-3 md:ml-0">
                            <p className="font-bold text-slate-900 text-sm">{user?.name}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                    </div>

                    <nav className="space-y-8 overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-none">
                        <NavGroup title="Dashboard">
                            <li><NavLink to="/profile" end className={getNavLinkClass}><HomeIcon /> Overview</NavLink></li>
                            <li><NavLink to="/profile/orders" className={getNavLinkClass}><OrdersIcon /> My Orders</NavLink></li>
                            <li><NavLink to="/profile/messages" className={getNavLinkClass}><MessagesIcon /> Messages</NavLink></li>
                        </NavGroup>

                         <NavGroup title="My Activity">
                            <li><NavLink to="/profile/wishlist" className={getNavLinkClass}><WishlistIcon /> Wishlist</NavLink></li>
                            <li><NavLink to="/profile/reviews" className={getNavLinkClass}><ReviewIcon /> My Reviews</NavLink></li>
                            <li><NavLink to="/profile/coupons" className={getNavLinkClass}><CouponIcon /> Coupons & Offers</NavLink></li>
                            <li><NavLink to="/profile/followed-stores" className={getNavLinkClass}><FollowedStoreIcon /> Followed Stores</NavLink></li>
                            <li><NavLink to="/profile/history" className={getNavLinkClass}><ClockIcon /> Browsing History</NavLink></li>
                        </NavGroup>

                        <NavGroup title="Selling">
                            <li><NavLink to="/profile/store" className={getNavLinkClass}><StoreIcon /> My Store</NavLink></li>
                            <li><NavLink to="/profile/products" className={getNavLinkClass}><ProductsIcon /> My Products</NavLink></li>
                            <li><NavLink to="/profile/collections" className={getNavLinkClass}><CollectionsIcon /> My Collections</NavLink></li>
                            <li><NavLink to="/profile/sales" className={getNavLinkClass}><EarningsIcon /> Sales Management</NavLink></li>
                            <li><NavLink to="/profile/offers" className={getNavLinkClass}><OffersIcon /> Offers</NavLink></li>
                            <li><NavLink to="/profile/creator-hub" className={getNavLinkClass}><CreatorHubIcon /> Creator Hub</NavLink></li>
                            <li><NavLink to="/profile/affiliate" className={getNavLinkClass}><AffiliateIcon /> Affiliate Program</NavLink></li>
                        </NavGroup>

                         <NavGroup title="Account">
                            <li><NavLink to="/profile/wallet" className={getNavLinkClass}><WalletIcon/> Wallet</NavLink></li>
                            <li><NavLink to="/profile/permissions" className={getNavLinkClass}><PermissionsIcon /> Permissions</NavLink></li>
                            <li><NavLink to="/profile/switch-accounts" className={getNavLinkClass}><SwitchAccountsIcon /> Switch Accounts</NavLink></li>
                            <li><NavLink to="/profile/settings" className={getNavLinkClass}><SettingsIcon /> Settings</NavLink></li>
                            <li><button onClick={logout} className="flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-500/10 w-full"><LogoutIcon /> Logout</button></li>
                        </NavGroup>
                    </nav>
                </aside>
                
                {/* Main Content */}
                <main className="flex-1 p-6 sm:p-8 lg:p-12">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

