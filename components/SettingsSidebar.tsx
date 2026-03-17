import React from 'react';
import { SidebarNavItem, SidebarSection } from './dashboard/clay';

type IconProps = { className?: string };

const ProfileIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <circle cx="12" cy="8" r="4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const VerifyIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
  </svg>
);

const AddressIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PrivacyIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const NotificationIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const settingsItems = [
  { to: '/profile/settings', label: 'Profile Hub', icon: ProfileIcon, end: true },
  { to: '/profile/settings/trust-and-verification', label: 'Trust & Verification', icon: VerifyIcon },
  { to: '/profile/settings/addresses', label: 'Addresses', icon: AddressIcon },
  { to: '/profile/settings/privacy', label: 'Privacy', icon: PrivacyIcon },
  { to: '/profile/settings/notifications', label: 'Notifications', icon: NotificationIcon }
];

const SettingsSidebar: React.FC = () => (
  <nav className="account-glass-sidebar w-full md:w-64 flex-shrink-0 rounded-2xl p-2">
    <SidebarSection title="Settings" headingArrow className="mt-0">
      <ul className="flex flex-wrap md:flex-col gap-1.5">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1 md:flex-none">
              <SidebarNavItem
                to={item.to}
                end={item.end}
                label={item.label}
                icon={<Icon />}
                size="md"
              />
            </li>
          );
        })}
      </ul>
    </SidebarSection>
  </nav>
);

export default SettingsSidebar;
