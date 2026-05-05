import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import AccountQuickAccess from './AccountQuickAccess';
import {
  DashboardLogoutIcon,
  UrbanPrimeBrandMark,
  buildUrbanPrimeSidebarSections,
  matchesDashboardPath,
  type DashboardSidebarItem,
} from './urbanPrimeShell';

type UserSidebarProps = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

const sidebarTransition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const
};

const CollapseIcon: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {isCollapsed ? (
      <>
        <path d="m9 18 6-6-6-6" />
        <path d="M5 5v14" />
      </>
    ) : (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M19 5v14" />
      </>
    )}
  </svg>
);

const BrandTile: React.FC = () => (
  <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] border border-white/55 bg-white/92 shadow-[0_18px_40px_rgba(101,43,110,0.18)]">
    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-200 via-rose-100 to-orange-100" />
    <span className="relative text-base font-black tracking-tight text-[#702c73]">UP</span>
  </div>
);

const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <span className="pointer-events-none absolute left-[calc(100%+0.8rem)] top-1/2 z-[320] -translate-y-1/2 whitespace-nowrap rounded-full border border-white/18 bg-[#21172e]/95 px-3 py-1.5 text-[0.72rem] font-bold text-white opacity-0 shadow-[0_18px_34px_rgba(20,10,31,0.28)] backdrop-blur-xl transition-all duration-200 group-hover/sidebar-tip:translate-x-1 group-hover/sidebar-tip:opacity-100 group-focus-visible/sidebar-tip:translate-x-1 group-focus-visible/sidebar-tip:opacity-100">
    {label}
  </span>
);

const SidebarNavItem: React.FC<{
  item: DashboardSidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
}> = ({ item, isActive, isCollapsed }) => {
  if (isCollapsed) {
    return (
      <NavLink
        to={item.to}
        end={item.end}
        aria-label={item.label}
        className="group/sidebar-tip relative flex justify-center rounded-[18px] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <motion.div
          whileHover={{ scale: 1.06, y: -1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          className={`relative flex h-12 w-12 items-center justify-center rounded-[18px] border transition-all duration-300 ${
            isActive
              ? 'border-white/70 bg-[linear-gradient(145deg,#fff9ff,#f8eefc_50%,#ffe6d8)] text-[#6b4176] shadow-[0_16px_32px_rgba(64,25,86,0.26),inset_0_1px_0_rgba(255,255,255,0.9)]'
              : 'border-white/16 bg-white/[0.08] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/26 hover:bg-white/[0.15] hover:text-white'
          }`}
        >
          {item.icon}
          {isActive ? <span className="absolute -right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#ffd39f] shadow-[0_0_18px_rgba(255,211,159,0.7)]" /> : null}
        </motion.div>
        <Tooltip label={item.label} />
      </NavLink>
    );
  }

  return (
    <motion.div
      whileHover={{ x: 4, scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 340, damping: 24 }}
    >
      <NavLink
        to={item.to}
        end={item.end}
        className="block rounded-[22px] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <div
          className={`group relative overflow-hidden rounded-[22px] border px-3 py-2.5 transition-all duration-300 ${
            isActive
              ? 'border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(250,242,255,0.93)_54%,rgba(255,237,220,0.92))] text-[#5d4277] shadow-[0_18px_34px_rgba(91,29,85,0.24),inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(41,36,56,0.96),rgba(34,30,47,0.95)_54%,rgba(51,40,31,0.95))] dark:text-[#f3eadf] dark:shadow-[0_16px_28px_rgba(0,0,0,0.22)]'
              : 'border-white/0 bg-white/[0.075] text-white/88 hover:border-white/16 hover:bg-white/[0.13] hover:text-white dark:bg-white/[0.045] dark:text-white/82 dark:hover:border-white/10 dark:hover:bg-white/[0.07]'
          }`}
        >
          {isActive ? <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#7b6ee7] to-[#dfaa73]" /> : null}
          <div className="relative flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border transition-all duration-300 ${
                isActive
                  ? 'border-white/50 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-100 text-[#86527b] shadow-[0_12px_22px_rgba(255,214,171,0.24)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#4a425f] dark:via-[#372f48] dark:to-[#4e3a2a] dark:text-[#f5ddc8] dark:shadow-none'
                  : 'border-white/16 bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:border-white/28 group-hover:bg-white/[0.16] dark:border-white/10 dark:bg-white/[0.06]'
              }`}
            >
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.88rem] font-semibold">{item.label}</span>
            <span
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500 to-amber-400 shadow-[0_0_16px_rgba(255,190,120,0.42)] dark:from-[#c9b4ff] dark:to-[#f0c39b]'
                  : 'bg-white/28 group-hover:bg-white/48 dark:bg-white/22'
              }`}
            />
          </div>
        </div>
      </NavLink>
    </motion.div>
  );
};

const UserSidebar: React.FC<UserSidebarProps> = ({ isCollapsed, onToggleCollapsed }) => {
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
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 92 : 304 }}
      transition={sidebarTransition}
      className="relative hidden h-[100dvh] shrink-0 overflow-visible md:flex"
      aria-label="Dashboard sidebar"
    >
      <div className="relative flex h-full w-full flex-col overflow-visible rounded-r-[30px] border-r border-white/18 bg-[linear-gradient(180deg,#6d60d5_0%,#8062bd_38%,#9464a4_66%,#cf9a69_100%)] text-white shadow-[18px_0_48px_rgba(80,62,131,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,#171a29_0%,#241e35_52%,#493726_100%)] dark:shadow-[18px_0_54px_rgba(0,0,0,0.36)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-r-[30px]">
          <div className="dashboard-sidebar-aurora absolute inset-0 opacity-80" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-white/42 to-white/10" />
          <div className="absolute -left-24 top-[-8rem] h-72 w-72 rounded-full bg-white/20 blur-[84px] dark:bg-white/[0.05]" />
          <div className="absolute bottom-[-7rem] right-[-5rem] h-72 w-72 rounded-full bg-[#ffd9aa]/24 blur-[92px] dark:bg-[#9d6a42]/16" />
        </div>

        <div className={`relative z-10 flex h-full min-h-0 flex-col ${isCollapsed ? 'px-3 py-4' : 'px-4 py-5'}`}>
          <div className={`flex shrink-0 items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
            <Link to="/profile" aria-label="UrbanPrime dashboard home" className={isCollapsed ? 'block' : 'min-w-0'}>
              {isCollapsed ? <BrandTile /> : <UrbanPrimeBrandMark compact />}
            </Link>

            {!isCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/20 bg-white/[0.11] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/34 hover:bg-white/[0.18] hover:text-white"
                aria-label="Collapse sidebar"
              >
                <CollapseIcon isCollapsed={false} />
              </button>
            ) : null}
          </div>

          {isCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="group/sidebar-tip relative mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-[15px] border border-white/16 bg-white/[0.08] text-white/78 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.15] hover:text-white"
              aria-label="Expand sidebar"
            >
              <CollapseIcon isCollapsed />
              <Tooltip label="Expand" />
            </button>
          ) : null}

          <div
            className={`relative z-10 min-h-0 flex-1 ${
              isCollapsed
                ? 'mt-5 space-y-3 overflow-visible'
                : 'mt-6 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 custom-scrollbar'
            }`}
          >
            {sidebarSections.map((section, sectionIndex) => (
              <section
                key={section.id}
                className={
                  isCollapsed
                    ? 'space-y-2'
                    : 'rounded-[26px] bg-white/[0.07] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_rgba(61,25,74,0.08)] backdrop-blur-xl dark:bg-white/[0.04]'
                }
              >
                {isCollapsed && sectionIndex > 0 ? <div className="mx-auto h-px w-10 bg-white/18" /> : null}

                {!isCollapsed ? (
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <p className="text-[0.64rem] font-black uppercase tracking-[0.28em] text-white/66">{section.title}</p>
                    <div className={`rounded-full bg-gradient-to-br ${section.accentClassName} p-[1px] shadow-[0_8px_20px_rgba(255,186,159,0.16)]`}>
                      <div className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-white/16 px-2 text-[0.68rem] font-black text-white">
                        {section.items.length}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className={isCollapsed ? 'space-y-2' : 'space-y-1.5'}>
                  {section.items.map((item) => (
                    <SidebarNavItem
                      key={`${section.id}-${item.to}`}
                      item={item}
                      isCollapsed={isCollapsed}
                      isActive={matchesDashboardPath(location.pathname, item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className={`relative z-20 shrink-0 ${isCollapsed ? 'space-y-3 pb-1 pt-3' : 'space-y-2 pt-3'}`}>
            <AccountQuickAccess user={user} roleLabel={roleLabel} compact={isCollapsed} />

            <button
              type="button"
              onClick={logout}
              className={`group/sidebar-tip relative flex items-center rounded-[20px] bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] text-[0.8rem] font-bold text-white shadow-[0_16px_30px_rgba(78,45,123,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(78,45,123,0.28)] dark:from-[#2b2f46] dark:via-[#342942] dark:to-[#5a4330] dark:shadow-[0_14px_26px_rgba(0,0,0,0.22)] ${
                isCollapsed ? 'mx-auto h-12 w-12 justify-center' : 'w-full gap-3 px-3 py-2.5'
              }`}
              aria-label="Logout"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-transform duration-300 group-hover/sidebar-tip:scale-105 dark:bg-white/10">
                <DashboardLogoutIcon />
              </span>
              <AnimatePresence initial={false}>
                {!isCollapsed ? (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.16 }}
                    className="flex-1 text-left"
                  >
                    Logout
                  </motion.span>
                ) : null}
              </AnimatePresence>
              {isCollapsed ? <Tooltip label="Logout" /> : null}
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default UserSidebar;
