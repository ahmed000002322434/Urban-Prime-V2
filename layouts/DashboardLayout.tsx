import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import useLowEndMode from '../hooks/useLowEndMode';
import { useNotification } from '../context/NotificationContext';
import AccountQuickAccess from '../components/dashboard/AccountQuickAccess';
import UserSidebar from '../components/dashboard/UserSidebar';
import { SearchSuggestionsDropdown } from '../components/dashboard/SearchSuggestionsDropdown';
import FirstTimeGuideCards from '../components/dashboard/FirstTimeGuideCards';
import { enforceAvatarIdentity } from '../utils/avatarEnforcement';
import {
  DashboardBellIcon,
  DashboardChevronDownIcon,
  DashboardCloseIcon,
  DashboardHomeIcon,
  DashboardLogoutIcon,
  DashboardMenuIcon,
  DashboardMessagesIcon,
  DashboardSearchIcon,
  DashboardSwitchIcon,
  UrbanPrimeBrandMark,
  buildUrbanPrimeSidebarSections,
  matchesDashboardPath,
} from '../components/dashboard/urbanPrimeShell';

type HeaderActionButtonProps = {
  to: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
  themeMode?: 'light' | 'dark';
};

type MobileBottomNavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
  onClick?: () => void;
};

const resolveDashboardAvatar = (user?: { name?: string; username?: string; email?: string; gender?: string; avatar?: string } | null) =>
  enforceAvatarIdentity({
    name: user?.name,
    username: user?.username,
    email: user?.email,
    gender: user?.gender,
    avatar: user?.avatar
  }).avatar;

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({ to, label, icon, badgeCount = 0, themeMode = 'dark' }) => {
  const hasBadge = badgeCount > 0;
  const className = 'dashboard-icon-btn relative flex h-11 w-11 items-center justify-center rounded-full border border-[#e7ddcf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,231,0.92))] text-[#5a5246] shadow-[0_12px_26px_rgba(166,146,116,0.10),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d9ccb8] hover:text-[#30281e] hover:shadow-[0_16px_30px_rgba(166,146,116,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(31,32,40,0.96),rgba(24,25,31,0.92))] dark:text-[#e7dccb] dark:hover:border-white/16 dark:hover:text-white';

  return (
    <Link
      to={to}
      aria-label={hasBadge ? `${label} (${badgeCount} unread)` : label}
      className={className}
    >
      {icon}
      {hasBadge ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[1.35rem] items-center justify-center rounded-full border border-white/80 bg-gradient-to-r from-[#8f9d4c] to-[#d6ab73] px-1.5 py-0.5 text-[0.62rem] font-black text-white shadow-[0_0_0_4px_rgba(255,255,255,0.92),0_12px_22px_rgba(143,157,76,0.22)] dark:border-[#171923] dark:shadow-[0_0_0_4px_rgba(23,25,35,0.95),0_12px_22px_rgba(214,171,115,0.16)]">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </Link>
  );
};

const MobileBottomNav: React.FC<{ items: MobileBottomNavItem[] }> = ({ items }) => {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[210] rounded-[24px] border border-white/80 bg-white/92 p-2 shadow-[0_22px_48px_rgba(140,126,180,0.16)] backdrop-blur-[26px] dark:border-white/10 dark:bg-[#171923]/92 dark:shadow-[0_20px_46px_rgba(0,0,0,0.3)] md:hidden">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => {
          const isActive = item.to !== '#' && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
          const hasBadge = (item.badgeCount || 0) > 0;

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[#665573] transition-all dark:text-[#e8dfd7]"
                aria-label={item.label}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[#e7deec] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] shadow-[0_10px_20px_rgba(130,116,178,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(29,31,43,0.96),rgba(24,26,36,0.96))] dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
                  {item.icon}
                </span>
                <span className="text-[0.62rem] font-black uppercase tracking-[0.08em]">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 transition-all ${
                isActive
                  ? 'bg-[linear-gradient(180deg,#f8f3ff,#fff2e8)] text-[#5d4277] shadow-[0_14px_24px_rgba(130,116,178,0.12)] dark:bg-[linear-gradient(180deg,rgba(41,36,56,0.96),rgba(50,38,32,0.92))] dark:text-[#f3eadf]'
                  : 'text-[#665573] dark:text-[#e8dfd7]'
              }`}
              aria-label={hasBadge ? `${item.label} (${item.badgeCount} unread)` : item.label}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-[16px] border ${
                isActive
                  ? 'border-white/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.08]'
                  : 'border-[#e7deec] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(29,31,43,0.96),rgba(24,26,36,0.96))]'
              }`}>
                {item.icon}
              </span>
              <span className="text-[0.62rem] font-black uppercase tracking-[0.08em]">{item.label}</span>
              {hasBadge ? (
                <span className="absolute right-3 top-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-gradient-to-r from-[#7b6ee7] to-[#dfaa73] px-1 py-0.5 text-[0.56rem] font-black text-white">
                  {item.badgeCount! > 9 ? '9+' : item.badgeCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const MobileSidebarNav: React.FC<{ closeNav: () => void }> = ({ closeNav }) => {
  const { logout, user, activePersona, hasCapability } = useAuth();
  const location = useLocation();

  const roleLabel = activePersona?.type ? `${activePersona.type} role` : 'UrbanPrime member';
  const sidebarSections = buildUrbanPrimeSidebarSections({
    activePersonaType: activePersona?.type,
    canBuy: hasCapability('buy'),
    canRent: hasCapability('rent'),
    canSell: hasCapability('sell'),
    canProvide: hasCapability('provide_service'),
    canAffiliate: hasCapability('affiliate'),
    canShip: hasCapability('ship')
  });

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-l-none rounded-r-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] px-5 pb-5 pt-6 text-white backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-24 rounded-b-[34px] bg-white/12 blur-3xl dark:bg-white/6" />

      <div className="relative z-10 flex items-center justify-between">
        <Link to="/profile" onClick={closeNav}>
          <UrbanPrimeBrandMark />
        </Link>
        <button
          type="button"
          onClick={closeNav}
          className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/28 bg-white/16 text-white dark:border-white/10 dark:bg-white/[0.06]"
          aria-label="Close navigation"
        >
          <DashboardCloseIcon />
        </button>
      </div>

      <div className="relative z-10 mt-7 flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {sidebarSections.map((section) => (
          <section
            key={section.id}
            className="rounded-[28px] bg-white/9 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_22px_rgba(76,17,71,0.08)] backdrop-blur-xl dark:bg-white/[0.045] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_28px_rgba(0,0,0,0.22)]"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-white/72">{section.title}</p>
              </div>
              <div className={`rounded-full bg-gradient-to-br ${section.accentClassName} p-[1px] shadow-[0_8px_20px_rgba(255,186,159,0.18)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.22)]`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16 text-[0.72rem] font-black text-white dark:bg-white/10">
                  {section.items.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {section.items.map((item) => {
                const isActive = matchesDashboardPath(location.pathname, item);

                return (
                  <NavLink
                    key={`${section.id}-${item.to}`}
                    to={item.to}
                    end={item.end}
                    onClick={closeNav}
                    className="block"
                  >
                    <div
                      className={`rounded-full p-[1px] transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-white via-[#f8f3ff] to-[#fff0e4] shadow-[0_16px_28px_rgba(101,85,150,0.18)] dark:from-[#2f2a40] dark:via-[#252032] dark:to-[#312820] dark:shadow-[0_16px_28px_rgba(0,0,0,0.2)]'
                          : 'bg-transparent'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-3 rounded-full px-4 py-3 ${
                          isActive
                            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(249,246,255,0.92))] text-[#5d4277] dark:bg-[linear-gradient(180deg,rgba(41,36,56,0.96),rgba(34,30,47,0.95))] dark:text-[#f3eadf]'
                            : 'bg-white/10 text-white/92 dark:bg-white/[0.05] dark:text-white/84'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-[16px] border ${
                            isActive
                              ? 'border-white/70 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-100 text-[#86527b] shadow-[0_12px_22px_rgba(255,214,171,0.22)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#4a425f] dark:via-[#372f48] dark:to-[#4e3a2a] dark:text-[#f5ddc8] dark:shadow-none'
                              : 'border-white/18 bg-white/12 dark:border-white/10 dark:bg-white/[0.06]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 text-[0.88rem] font-semibold">{item.label}</span>
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="relative z-10 mt-3 space-y-2">
        <AccountQuickAccess user={user} roleLabel={roleLabel} onNavigate={closeNav} />

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-full bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-3 py-2.5 text-[0.8rem] font-bold text-white shadow-[0_14px_26px_rgba(122,103,187,0.2)] dark:from-[#2b2f46] dark:via-[#342942] dark:to-[#5a4330] dark:shadow-[0_14px_26px_rgba(0,0,0,0.22)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[13px] bg-white/20 dark:bg-white/10">
            <DashboardLogoutIcon />
          </span>
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  const { user, logout, personas, activePersona, setActivePersona } = useAuth();
  const { unreadNotificationCount, unreadMessageCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const mobilePersonaDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isLowEndMode = useLowEndMode();
  const isMessagesWorkspace =
    location.pathname === '/profile/messages' || location.pathname.startsWith('/profile/messages/');
  const dashboardSearchInputClass = 'h-12 w-full rounded-full border border-[#e5dbc9] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,240,231,0.95))] pl-12 pr-4 text-sm font-medium text-[#5b544b] shadow-[0_14px_28px_rgba(166,146,116,0.08),inset_0_1px_0_rgba(255,255,255,0.98)] outline-none transition-all placeholder:text-[#9a9185] focus:border-[#cdbca1] focus:ring-4 focus:ring-[#f5ecdf] md:h-[50px] md:pr-20 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(24,25,31,0.96),rgba(18,19,24,0.92))] dark:text-[#e9dfd1] dark:placeholder:text-[#9f978d] dark:focus:border-[#6b6255] dark:focus:ring-[#25211b]';
  const dashboardShortcutClass = 'dashboard-shortcut-pill pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-[#e1d6c6] bg-[linear-gradient(180deg,#ffffff,#f8f1e8)] px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#7b6a50] shadow-[0_6px_14px_rgba(166,146,116,0.08),inset_0_1px_0_rgba(255,255,255,0.98)] md:inline-flex dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(34,36,43,0.96),rgba(23,24,29,0.92))] dark:text-[#d8c8b0]';
  const dashboardProfileButtonClass = 'dashboard-profile-btn dashboard-dropdown-trigger flex h-[50px] w-[118px] items-center gap-1.5 rounded-full border border-[#e5dbc9] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,240,231,0.94))] px-1.5 pr-2 py-1.5 text-left shadow-[0_12px_24px_rgba(166,146,116,0.08),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d8cab4] hover:shadow-[0_16px_28px_rgba(166,146,116,0.14)] xl:w-[126px] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,31,39,0.96),rgba(23,24,30,0.92))] dark:hover:border-white/14';
  const dashboardAvatarShellClass = 'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#e5dbc9] bg-[linear-gradient(180deg,#ffffff,#f4ede3)] shadow-[0_8px_16px_rgba(166,146,116,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(42,43,52,0.96),rgba(28,29,35,0.92))]';
  const dashboardAvatarMetaTextClass = 'text-[#8f8678] dark:text-[#a69c91]';

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsSearchSuggestionsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktopDropdown = personaDropdownRef.current?.contains(target);
      const clickedMobileDropdown = mobilePersonaDropdownRef.current?.contains(target);

      if (!clickedDesktopDropdown && !clickedMobileDropdown) {
        setIsPersonaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchSuggestionsOpen(true);
        setIsPersonaDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setIsSearchSuggestionsOpen(true);
    setIsPersonaDropdownOpen(false);
  };

  const handleSwitchPersona = async (personaId: string) => {
    try {
      await setActivePersona(personaId, { requireConfirmation: false });
      setIsPersonaDropdownOpen(false);
      setIsMobileNavOpen(false);
      navigate('/profile');
    } catch (error) {
      console.error('Failed to switch persona:', error);
    }
  };

  const mobileBottomNavItems: MobileBottomNavItem[] = [
    { to: '/', label: 'Home', icon: <DashboardHomeIcon /> },
    { to: '/profile/messages', label: 'Inbox', icon: <DashboardMessagesIcon />, badgeCount: unreadMessageCount },
    { to: '/profile/notifications', label: 'Alerts', icon: <DashboardBellIcon />, badgeCount: unreadNotificationCount },
    {
      to: '#',
      label: 'Menu',
      icon: <DashboardMenuIcon />,
      onClick: () => {
        setIsMobileNavOpen(true);
        setIsPersonaDropdownOpen(false);
        setIsSearchSuggestionsOpen(false);
      }
    }
  ];

  return (
    <div className="dashboard-shell flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#f8f9fb] font-sans text-[#2d2431] dark:bg-[#0f1118] dark:text-[#ece5dc]">
      <UserSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-140px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#f3e6d0]/28 blur-[110px] dark:bg-[#2b2420]/38" />
          <div className="absolute right-[-90px] top-10 h-[280px] w-[280px] rounded-full bg-[#efe5d7]/28 blur-[110px] dark:bg-[#302720]/34" />
          <div className="absolute bottom-[-140px] left-[28%] h-[320px] w-[320px] rounded-full bg-[#f8efe3]/22 blur-[120px] dark:bg-[#1f1a17]/46" />
        </div>

        <header className="relative z-[120] shrink-0 px-3 pt-3 md:px-6 md:pt-6">
          <div className="dashboard-topbar rounded-[30px] border border-[#ece1d1] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,242,234,0.9))] px-3 py-3 shadow-[0_16px_38px_rgba(166,146,116,0.08)] backdrop-blur-[28px] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(20,21,27,0.9),rgba(17,18,23,0.82))] dark:shadow-[0_20px_48px_rgba(0,0,0,0.28)]">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="dashboard-search relative min-w-0 flex-1 xl:max-w-[640px]">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8f80] dark:text-[#9f97a8]">
                    <DashboardSearchIcon />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      setIsSearchSuggestionsOpen(true);
                      setIsPersonaDropdownOpen(false);
                    }}
                    placeholder="Search workspace, orders, messages..."
                    className={dashboardSearchInputClass}
                  />
                  <span className={dashboardShortcutClass}>
                    Ctrl + K
                  </span>
                  <SearchSuggestionsDropdown
                    query={searchQuery}
                    isOpen={isSearchSuggestionsOpen}
                    onClose={() => setIsSearchSuggestionsOpen(false)}
                    onNavigate={(path) => {
                      navigate(path);
                      setSearchQuery('');
                      setIsSearchSuggestionsOpen(false);
                      setIsPersonaDropdownOpen(false);
                    }}
                  />
                </div>

                <div className="relative shrink-0 md:hidden" ref={mobilePersonaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPersonaDropdownOpen((prev) => !prev);
                      setIsSearchSuggestionsOpen(false);
                    }}
                    className={`${dashboardProfileButtonClass} h-12 w-12 justify-center`}
                    aria-label="Open account menu"
                  >
                    <div className="relative">
                      <div className={dashboardAvatarShellClass}>
                        <img src={resolveDashboardAvatar(user)} className="h-full w-full object-cover" alt="" />
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#84c86d] dark:border-[#1a1d28]" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isPersonaDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        className={`absolute right-0 top-[calc(100%+0.75rem)] z-[140] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-[24px] border border-[#ece1d1] shadow-[0_20px_48px_rgba(166,146,116,0.14)] dark:border-white/10 dark:shadow-[0_24px_56px_rgba(0,0,0,0.28)] ${
                          isLowEndMode ? 'bg-white dark:bg-[#181b26]' : 'bg-white/92 backdrop-blur-[26px] dark:bg-[#181b26]/94'
                        }`}
                      >
                        <div className="border-b border-[#ece1d1] px-4 py-3.5 dark:border-white/10">
                          <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-[#8c7d69] dark:text-[#a8a0ac]">Switch Account</p>
                          <div className="mt-2 rounded-[18px] border border-[#ece1d1] bg-[#faf7f1] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                            <p className="truncate text-sm font-semibold text-[#544a45] dark:text-[#ece5dc]">
                              {activePersona?.displayName || activePersona?.type || 'Current workspace'}
                            </p>
                            <p className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#948874] dark:text-[#a8a0ac]">
                              Active workspace
                            </p>
                          </div>
                        </div>

                        <div className="max-h-[260px] space-y-1.5 overflow-y-auto px-2.5 py-2.5 custom-scrollbar">
                          {personas.map((persona) => {
                            const isActive = persona.id === activePersona?.id;

                            return (
                              <motion.button
                                key={persona.id}
                                type="button"
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                                onClick={() => void handleSwitchPersona(persona.id)}
                                className={`flex w-full items-center gap-2.5 rounded-[18px] border px-2.5 py-2.5 text-left transition-all ${
                                  isActive
                                    ? 'border-[#ddd1ea] bg-[linear-gradient(180deg,#faf8ff,#f6f0e8)] shadow-[0_12px_24px_rgba(130,116,178,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(40,36,54,0.96),rgba(32,28,43,0.96))] dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]'
                                    : 'border-transparent bg-[#fbf8fd] hover:border-[#e0d7e8] dark:bg-white/[0.03] dark:hover:border-white/10'
                                }`}
                              >
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-[14px] text-[0.82rem] font-black uppercase ${
                                    isActive
                                      ? 'bg-gradient-to-br from-[#8f7ae2] to-[#d7a16f] text-white'
                                      : 'bg-[#efe9f5] text-[#756686] dark:bg-white/[0.08] dark:text-[#d7cfc7]'
                                  }`}
                                >
                                  {persona.type.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[0.82rem] font-semibold capitalize text-[#4e4656] dark:text-[#ece5dc]">{persona.type}</p>
                                  <p className="truncate text-[0.68rem] text-[#8c8293] dark:text-[#a8a0ac]">
                                    {persona.displayName || `${persona.type} workspace`}
                                  </p>
                                </div>
                                {isActive ? (
                                  <span className="rounded-full bg-[#ede7f8] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#6b59a8] dark:bg-white/[0.08] dark:text-[#dccfbf]">
                                    Active
                                  </span>
                                ) : null}
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="border-t border-[#eee4f2] px-2.5 py-2.5 dark:border-white/10">
                          <button
                            type="button"
                            onClick={logout}
                            className="flex w-full items-center gap-2.5 rounded-[18px] bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-2.5 py-2.5 text-[0.82rem] font-bold text-white shadow-[0_16px_28px_rgba(122,103,187,0.18)] dark:from-[#2b2f46] dark:via-[#342942] dark:to-[#5a4330] dark:shadow-[0_16px_28px_rgba(0,0,0,0.2)]"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/20 dark:bg-white/10">
                              <DashboardLogoutIcon />
                            </span>
                            <span className="flex-1 text-left">Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            <div className="hidden items-center justify-between gap-2 md:flex xl:justify-end">
                <div className="hidden items-center gap-2 md:flex">
                  <HeaderActionButton to="/" label="Home" icon={<DashboardHomeIcon />} themeMode="light" />
                  <HeaderActionButton to="/profile/messages" label="Messages" icon={<DashboardMessagesIcon />} badgeCount={unreadMessageCount} themeMode="light" />
                  <HeaderActionButton
                    to="/profile/notifications"
                    label="Notifications"
                    icon={<DashboardBellIcon />}
                    badgeCount={unreadNotificationCount}
                    themeMode="light"
                  />
                </div>

                <div className="relative" ref={personaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPersonaDropdownOpen((prev) => !prev);
                      setIsSearchSuggestionsOpen(false);
                    }}
                    className={dashboardProfileButtonClass}
                  >
                    <div className="relative">
                      <div className={dashboardAvatarShellClass}>
                        <img src={resolveDashboardAvatar(user)} className="h-full w-full rounded-full object-cover" alt="" />
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#84c86d] dark:border-[#1a1d28]" />
                    </div>

                    <div className="hidden min-w-0 lg:block">
                      <p className="truncate max-w-[4.2rem] text-[0.78rem] font-black text-[#4d5448]">
                        {user?.name || 'UrbanPrime User'}
                      </p>
                      <p className={`truncate max-w-[4.2rem] text-[0.64rem] font-medium ${dashboardAvatarMetaTextClass}`}>
                        {activePersona?.displayName || activePersona?.type || 'member'}
                      </p>
                    </div>

                    <DashboardChevronDownIcon
                      className={`hidden transition-transform lg:block ${dashboardAvatarMetaTextClass} ${
                        isPersonaDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isPersonaDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        className={`absolute right-0 top-[calc(100%+0.75rem)] z-[140] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-[24px] border border-[#ece2f0] shadow-[0_24px_56px_rgba(130,116,178,0.14)] dark:border-white/10 dark:shadow-[0_24px_56px_rgba(0,0,0,0.28)] ${
                          isLowEndMode ? 'bg-white dark:bg-[#181b26]' : 'bg-white/92 backdrop-blur-[26px] dark:bg-[#181b26]/94'
                        }`}
                      >
                        <div className="border-b border-[#eee4f2] px-4 py-3.5 dark:border-white/10">
                          <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-[#8c8293] dark:text-[#a8a0ac]">Switch Account</p>
                          <div className="mt-2 rounded-[18px] border border-[#ece2f0] bg-[#faf8fd] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                            <p className="truncate text-sm font-semibold text-[#544a5e] dark:text-[#ece5dc]">
                              {activePersona?.displayName || activePersona?.type || 'Current workspace'}
                            </p>
                            <p className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#918694] dark:text-[#a8a0ac]">
                              Active workspace
                            </p>
                          </div>
                        </div>

                        <div className="max-h-[260px] space-y-1.5 overflow-y-auto px-2.5 py-2.5 custom-scrollbar">
                          {personas.map((persona) => {
                            const isActive = persona.id === activePersona?.id;

                            return (
                              <motion.button
                                key={persona.id}
                                type="button"
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                                onClick={() => void handleSwitchPersona(persona.id)}
                                className={`flex w-full items-center gap-2.5 rounded-[18px] border px-2.5 py-2.5 text-left transition-all ${
                                  isActive
                                    ? 'border-[#ddd1ea] bg-[linear-gradient(180deg,#faf8ff,#f6f0e8)] shadow-[0_12px_24px_rgba(130,116,178,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(40,36,54,0.96),rgba(32,28,43,0.96))] dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]'
                                    : 'border-transparent bg-[#fbf8fd] hover:border-[#e0d7e8] dark:bg-white/[0.03] dark:hover:border-white/10'
                                  }`}
                              >
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-[14px] text-[0.82rem] font-black uppercase ${
                                    isActive
                                      ? 'bg-gradient-to-br from-[#8f7ae2] to-[#d7a16f] text-white'
                                      : 'bg-[#efe9f5] text-[#756686] dark:bg-white/[0.08] dark:text-[#d7cfc7]'
                                  }`}
                                >
                                  {persona.type.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[0.82rem] font-semibold capitalize text-[#4e4656] dark:text-[#ece5dc]">{persona.type}</p>
                                  <p className="truncate text-[0.68rem] text-[#8c8293] dark:text-[#a8a0ac]">
                                    {persona.displayName || `${persona.type} workspace`}
                                  </p>
                                </div>
                                {isActive ? (
                                  <span className="rounded-full bg-[#ede7f8] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#6b59a8] dark:bg-white/[0.08] dark:text-[#dccfbf]">
                                    Active
                                  </span>
                                ) : null}
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="border-t border-[#eee4f2] px-2.5 py-2.5 dark:border-white/10">
                          <button
                            type="button"
                            onClick={logout}
                            className="flex w-full items-center gap-2.5 rounded-[18px] bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-2.5 py-2.5 text-[0.82rem] font-bold text-white shadow-[0_16px_28px_rgba(122,103,187,0.18)] dark:from-[#2b2f46] dark:via-[#342942] dark:to-[#5a4330] dark:shadow-[0_16px_28px_rgba(0,0,0,0.2)]"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/20 dark:bg-white/10">
                              <DashboardLogoutIcon />
                            </span>
                            <span className="flex-1 text-left">Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main
          className={`relative z-10 min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-y-contain scroll-smooth ${
            isMessagesWorkspace ? 'overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          <div className={isMessagesWorkspace ? 'h-full min-h-0 w-full' : 'mx-auto min-h-full w-full max-w-[1440px] p-3 pb-24 pt-4 md:p-6 md:pb-6'}>
            {!isMessagesWorkspace ? <FirstTimeGuideCards /> : null}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={isMessagesWorkspace ? 'h-full min-h-0' : undefined}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {!isMessagesWorkspace ? <MobileBottomNav items={mobileBottomNavItems} /> : null}

      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 z-[220] bg-[#1d1021]/36 backdrop-blur-sm dark:bg-black/56 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="fixed inset-y-0 left-0 z-[230] w-[304px] md:hidden"
            >
              <div className="relative flex h-full flex-col overflow-hidden rounded-l-none rounded-r-[34px] bg-gradient-to-b from-[#6d60d5] via-[#8660ae] to-[#cf9a69] p-[1px] shadow-[0_30px_70px_rgba(123,101,179,0.24)] dark:from-[#171a29] dark:via-[#241e35] dark:to-[#493726] dark:shadow-[0_30px_70px_rgba(0,0,0,0.34)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]" />
                <MobileSidebarNav closeNav={() => setIsMobileNavOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
