
import React from 'react';
import { NavLink } from 'react-router-dom';

const SettingsSidebar: React.FC = () => {
    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
        `block px-4 py-3 text-sm font-medium border-l-4 transition-colors ${
            isActive 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-text-secondary hover:bg-surface-soft'
        }`;

    return (
        <nav className="w-full md:w-56 flex-shrink-0 bg-surface p-2 rounded-lg shadow-soft border border-border">
            <ul className="flex flex-row flex-wrap md:flex-col">
                 <li className="flex-1 md:flex-none"><NavLink to="/profile/settings" end className={getNavLinkClass}>Edit Profile</NavLink></li>
                 <li className="flex-1 md:flex-none"><NavLink to="/profile/settings/trust-and-verification" className={getNavLinkClass}>Trust & Verification</NavLink></li>
                 <li className="flex-1 md:flex-none"><NavLink to="/profile/settings/addresses" className={getNavLinkClass}>Addresses</NavLink></li>
                 <li className="flex-1 md:flex-none"><NavLink to="/profile/settings/privacy" className={getNavLinkClass}>Privacy</NavLink></li>
                 <li className="flex-1 md:flex-none"><NavLink to="/profile/settings/notifications" className={getNavLinkClass}>Notifications</NavLink></li>
            </ul>
        </nav>
    );
};

export default SettingsSidebar;
