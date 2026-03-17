import React from 'react';
import { SidebarNavItem, SidebarSection } from './dashboard/clay';

type IconProps = { className?: string };

const PackageIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V16.5L12 21l9-4.5V7.5" />
  </svg>
);

const LocationIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CardIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1 10h22" />
  </svg>
);

const OrdersIcon: React.FC<IconProps> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
    <rect x="3" y="4" width="18" height="16" rx="2" />
  </svg>
);

const accountItems = [
  { to: '/profile/orders', label: 'My Orders', icon: OrdersIcon },
  { to: '/packages', label: 'Bought Packages', icon: PackageIcon },
  { to: '/profile/settings/addresses', label: 'Addresses', icon: LocationIcon },
  { to: '/payment-options', label: 'Payment Options', icon: CardIcon }
];

const AccountSidebar: React.FC = () => (
  <nav className="account-glass-sidebar w-full md:w-64 flex-shrink-0 rounded-2xl p-2">
    <SidebarSection title="Account" headingArrow className="mt-0">
      <ul className="flex md:flex-col gap-1.5">
        {accountItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1 md:flex-none">
              <SidebarNavItem
                to={item.to}
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

export default AccountSidebar;
