import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { SidebarNavItem, SidebarSection } from './clay';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const InboxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="14" x="2" y="5" rx="2"/></svg>;
const WishlistIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2-4h14l2 4"/><path d="M12 9v12"/></svg>;
const ProductsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg>;
const EarningsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const ReviewsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const CustomersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/></svg>;
const SparkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 1.9 5.7 5.6 1.9-5.6 1.9L12 17l-1.9-5.6-5.6-1.9 5.6-1.9L12 2Z"/><path d="M5 20l1-3 3-1-3-1-1-3-1 3-3 1 3 1 1 3Z"/></svg>;
const WorkspaceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M14 7l7-3v16l-7-3"/><path d="M9 16a3 3 0 0 1-3-3V11"/></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 17h1a2 2 0 0 0 2-2V9h-3V5H3v10a2 2 0 0 0 2 2h1"/><path d="M17 9h2l2 3v3a2 2 0 0 1-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;

const UserSidebar: React.FC = () => {
    const { logout, user, activePersona, hasCapability } = useAuth();
    const canSell = hasCapability('sell');
    const canProvide = hasCapability('provide_service');
    const canAffiliate = hasCapability('affiliate');
    const canShip = hasCapability('ship');

    return (
        <motion.aside 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="w-72 flex-shrink-0 flex flex-col border-r border-white/10 hidden md:flex glass-panel h-full min-h-0 self-stretch"
        >
            {/* Header */}
            <div className="p-6 h-20 flex items-center shrink-0 border-b border-white/10">
                <Link to="/profile" className="text-lg font-bold font-display flex items-center gap-3">
                    <span className="rounded-lg bg-black p-1.5 font-black text-white text-xs">UP</span>
                    <div>
                        <span className="block font-black text-text-primary tracking-tighter">Urban Prime</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black opacity-50">Dashboard</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                <SidebarSection title="Workspace">
                    <SidebarNavItem to="/profile" end label="Overview" icon={<DashboardIcon />} />
                    <SidebarNavItem to="/profile/switch-accounts" label="Add / switch workspace" icon={<WorkspaceIcon />} />
                    <SidebarNavItem to="/profile/orders" label="My Orders" icon={<OrdersIcon />} />
                    <SidebarNavItem to="/profile/messages" label="Messages" icon={<InboxIcon />} />
                    <SidebarNavItem to="/profile/wishlist" label="Wishlist" icon={<WishlistIcon />} />
                </SidebarSection>

                {canSell && (
                    <SidebarSection title="Seller Tools">
                        <SidebarNavItem to="/profile/products" label="Products" icon={<ProductsIcon />} />
                        <SidebarNavItem to="/profile/store" label="Storefront" icon={<StoreIcon />} />
                        <SidebarNavItem to="/profile/earnings" label="Earnings" icon={<EarningsIcon />} />
                        <SidebarNavItem to="/profile/followed-stores" label="Customers" icon={<CustomersIcon />} />
                    </SidebarSection>
                )}

                {canProvide && (
                    <SidebarSection title="Provider Tools">
                        <SidebarNavItem to="/profile/provider-dashboard" label="Provider Dashboard" icon={<BriefcaseIcon />} />
                        <SidebarNavItem to="/profile/services/new" label="Create Service" icon={<SparkIcon />} />
                        <SidebarNavItem to="/profile/workflows" label="Workflows" icon={<SparkIcon />} />
                    </SidebarSection>
                )}

                {canAffiliate && (
                    <SidebarSection title="Affiliate Tools">
                        <SidebarNavItem to="/profile/affiliate" label="Affiliate Center" icon={<MegaphoneIcon />} />
                        <SidebarNavItem to="/profile/promotions" label="Promotions" icon={<SparkIcon />} />
                    </SidebarSection>
                )}

                {canShip && (
                    <SidebarSection title="Shipper Tools">
                        <SidebarNavItem to="/profile/shipper-dashboard" label="Shipper Dashboard" icon={<TruckIcon />} />
                        <SidebarNavItem to="/profile/orders" label="Delivery Queue" icon={<OrdersIcon />} />
                    </SidebarSection>
                )}

                <SidebarSection title="Community">
                    <SidebarNavItem to="/profile/reviews" label="My Reviews" icon={<ReviewsIcon />} />
                </SidebarSection>

                <SidebarSection title="Account Settings">
                    <SidebarNavItem to="/profile/settings" label="General" icon={<SettingsIcon />} />
                </SidebarSection>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 shrink-0">
                <div className="flex items-center gap-3 p-3 mb-3 rounded-2xl glass-panel border border-white/10">
                    <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                        {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" alt="" /> : <span className="text-xs font-bold">{user?.name?.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black truncate text-text-primary uppercase tracking-wider">{user?.name}</p>
                        <p className="text-[10px] text-text-secondary truncate opacity-60 font-medium capitalize">{activePersona?.type}</p>
                    </div>
                </div>
                
                <SidebarNavItem 
                  onClick={logout} 
                  label="Sign Out" 
                  icon={<LogoutIcon />} 
                  variant="danger"
                />
            </div>
        </motion.aside>
    );
};

export default UserSidebar;
