
import React from 'react';
// FIX: Switched from namespace import for 'react-router-dom' to a named import for 'NavLink' to resolve module resolution error.
import { NavLink } from 'react-router-dom';

const AccountSidebar: React.FC = () => {
    const navLinkClass = "block px-4 py-3 text-sm font-medium border-l-4";
    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
        `${navLinkClass} ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-600 hover:bg-slate-100'}`;

    return (
        <nav className="w-full md:w-64 flex-shrink-0 bg-white rounded-lg shadow-md border border-rentify-border">
            <ul className="flex md:flex-col">
                <li className="flex-1 md:flex-none"><NavLink to="/profile/orders" className={getNavLinkClass}>My Orders</NavLink></li>
                <li className="flex-1 md:flex-none"><NavLink to="/packages" className={getNavLinkClass}>My Bought Packages</NavLink></li>
                <li className="flex-1 md:flex-none"><NavLink to="/profile/settings/addresses" className={getNavLinkClass}>My Addresses</NavLink></li>
                <li className="flex-1 md:flex-none"><NavLink to="/payment-options" className={getNavLinkClass}>My Payment Options</NavLink></li>
            </ul>
        </nav>
    );
};

export default AccountSidebar;
