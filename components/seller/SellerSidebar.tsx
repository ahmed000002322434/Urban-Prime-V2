import React from 'react';
import { NavLink, Link } from 'react-router-dom';

const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ProductsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

interface SellerSidebarProps {
  isOpen: boolean;
}

const SellerSidebar: React.FC<SellerSidebarProps> = ({ isOpen }) => {
    const linkClass = "flex items-center gap-4 px-4 py-3 text-gray-600 rounded-lg transition-colors";
    const activeLinkClass = "bg-primary/10 text-primary font-semibold";
    const inactiveLinkClass = "hover:bg-gray-200";

    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
        `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`;

    return (
        <aside className={`fixed top-0 left-0 h-full bg-white shadow-lg flex-shrink-0 flex flex-col transition-all duration-300 z-40 ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className="p-4 border-b h-16 flex items-center">
                <Link to="/seller/dashboard" className="text-xl font-bold font-display flex items-center gap-2">
                    <span className="text-black bg-primary text-white rounded-md p-1 text-2xl font-black">UM</span>
                    <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Seller</span>
                </Link>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <NavLink to="/seller/products/new" className={getNavLinkClass}><AddIcon /> <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Add Product</span></NavLink>
                <NavLink to="/seller/products" className={getNavLinkClass} end><ProductsIcon /> <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>My Products</span></NavLink>
                <NavLink to="/seller/sales" className={getNavLinkClass}><SalesIcon /> <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Sales & Rentals</span></NavLink>
                <NavLink to="/seller/settings" className={getNavLinkClass}><SettingsIcon /> <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Settings</span></NavLink>
            </nav>
        </aside>
    );
};

export default SellerSidebar;
