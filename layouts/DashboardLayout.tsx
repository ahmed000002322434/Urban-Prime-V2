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
};

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({ to, label, icon, badgeCount = 0 }) => {
  const hasBadge = badgeCount > 0;

  return (
    <Link
      to={to}
      aria-label={hasBadge ? `${label} (${badgeCount} unread)` : label}
      className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#e7deec] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] text-[#665573] shadow-[0_12px_24px_rgba(130,116,178,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d8cfe2] hover:shadow-[0_18px_30px_rgba(130,116,178,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(29,31,43,0.96),rgba(24,26,36,0.96))] dark:text-[#e8dfd7] dark:shadow-[0_14px_28px_rgba(0,0,0,0.24)] dark:hover:border-white/14"
    >
      {icon}
      {hasBadge ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[1.35rem] items-center justify-center rounded-full border border-white/80 bg-gradient-to-r from-[#7b6ee7] to-[#dfaa73] px-1.5 py-0.5 text-[0.62rem] font-black text-white shadow-[0_0_0_4px_rgba(255,255,255,0.92),0_14px_24px_rgba(123,110,231,0.28)] dark:border-[#171923] dark:shadow-[0_0_0_4px_rgba(23,25,35,0.95),0_14px_24px_rgba(223,170,115,0.18)]">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </Link>
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
            className="rounded-[28px] border border-white/14 bg-white/9 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_22px_rgba(76,17,71,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_28px_rgba(0,0,0,0.22)]"
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
  const { unreadNotificationCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isLowEndMode = useLowEndMode();
  const isMessagesWorkspace =
    location.pathname === '/profile/messages' || location.pathname.startsWith('/profile/messages/');

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
      if (personaDropdownRef.current && !personaDropdownRef.current.contains(event.target as Node)) {
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

  return (
    <div className="dashboard-shell dashboard-shell-scale flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f8f9fb] font-sans text-[#2d2431] dark:bg-[#0f1118] dark:text-[#ece5dc]">
      <UserSidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-140px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#d7d0ff]/28 blur-[110px] dark:bg-[#372b4d]/40" />
          <div className="absolute right-[-90px] top-10 h-[280px] w-[280px] rounded-full bg-[#f3dcc1]/30 blur-[110px] dark:bg-[#493726]/34" />
          <div className="absolute bottom-[-140px] left-[28%] h-[320px] w-[320px] rounded-full bg-[#ede6ff]/22 blur-[120px] dark:bg-[#221d33]/46" />
        </div>

        <header className="relative z-[120] shrink-0 px-4 pt-4 md:px-6 md:pt-6">
          <div
            className={`rounded-[32px] border border-white/80 px-4 py-4 shadow-[0_22px_50px_rgba(140,126,180,0.12),inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-white/10 dark:shadow-[0_20px_46px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.05)] ${
              isLowEndMode ? 'bg-white dark:bg-[#171923]' : 'bg-white/80 backdrop-blur-[26px] dark:bg-[#171923]/86'
            }`}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(true);
                    setIsPersonaDropdownOpen(false);
                    setIsSearchSuggestionsOpen(false);
                  }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#e7deec] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] text-[#665573] shadow-[0_12px_24px_rgba(130,116,178,0.1)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(29,31,43,0.96),rgba(24,26,36,0.96))] dark:text-[#e8dfd7] dark:shadow-[0_14px_28px_rgba(0,0,0,0.24)] md:hidden"
                  aria-label="Open navigation"
                >
                  <DashboardMenuIcon />
                </button>

                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8d7c99] dark:text-[#9f97a8]">
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
                    className="h-14 w-full rounded-[22px] border border-[#e8deed] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] pl-12 pr-24 text-sm font-medium text-[#4d4156] shadow-[inset_0_2px_4px_rgba(255,255,255,0.85),0_14px_24px_rgba(130,116,178,0.08)] outline-none transition-all placeholder:text-[#a79aae] focus:border-[#cfc2dc] focus:ring-4 focus:ring-[#ece5f5]/70 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(24,26,36,0.98),rgba(20,22,31,0.98))] dark:text-[#ece5dc] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_24px_rgba(0,0,0,0.24)] dark:placeholder:text-[#8a8491] dark:focus:border-white/14 dark:focus:ring-white/10 md:pr-28"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-[#e7deec] bg-white/90 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#8b7a97] dark:border-white/10 dark:bg-[#202331]/95 dark:text-[#b3aab7] md:inline-flex">
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
              </div>

              <div className="flex items-center justify-between gap-3 xl:justify-end">
                <div className="flex items-center gap-2">
                  <HeaderActionButton to="/" label="Home" icon={<DashboardHomeIcon />} />
                  <HeaderActionButton to="/profile/messages" label="Messages" icon={<DashboardMessagesIcon />} />
                  <HeaderActionButton
                    to="/profile/notifications"
                    label="Notifications"
                    icon={<DashboardBellIcon />}
                    badgeCount={unreadNotificationCount}
                  />
                </div>

                <div className="relative" ref={personaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPersonaDropdownOpen((prev) => !prev);
                      setIsSearchSuggestionsOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-full border border-[#e8deed] bg-[linear-gradient(180deg,#fffefe,#faf8ff)] px-1.5 py-1.5 text-left shadow-[0_12px_24px_rgba(130,116,178,0.1),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-300 hover:-translate-y-0.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(29,31,43,0.96),rgba(24,26,36,0.96))] dark:shadow-[0_14px_28px_rgba(0,0,0,0.24)]"
                  >
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white bg-[#f3edf9] shadow-[0_8px_14px_rgba(130,116,178,0.12)] dark:border-white/10 dark:bg-white/[0.08] dark:shadow-none">
                        {user?.avatar ? (
                          <img src={user.avatar} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <span className="text-sm font-black text-[#6b4d83] dark:text-[#ece5dc]">{user?.name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#84c86d] dark:border-[#1a1d28]" />
                    </div>

                    <div className="hidden min-w-0 xl:block">
                      <p className="truncate text-[0.82rem] font-black uppercase tracking-[0.06em] text-[#4f4657] dark:text-[#ece5dc]">
                        {user?.name || 'UrbanPrime User'}
                      </p>
                      <p className="truncate text-[0.68rem] font-medium capitalize text-[#8c8293] dark:text-[#a8a0ac]">
                        {activePersona?.displayName || activePersona?.type || 'member'}
                      </p>
                    </div>

                    <DashboardChevronDownIcon
                      className={`hidden text-[#8c8293] transition-transform dark:text-[#a8a0ac] xl:block ${
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
          className={`relative z-10 flex-1 min-h-0 overflow-x-hidden overscroll-y-contain ${
            isMessagesWorkspace ? 'overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          <div className={isMessagesWorkspace ? 'h-full w-full min-h-0' : 'mx-auto w-full max-w-[1440px] p-4 pt-5 md:p-6'}>
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
              className="fixed inset-y-0 left-0 z-[230] w-[304px] pb-3 pl-0 pr-3 pt-3 md:hidden"
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
