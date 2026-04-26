import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import AccountQuickAccess from './AccountQuickAccess';
import {
  DashboardLogoutIcon,
  UrbanPrimeBrandMark,
  buildUrbanPrimeSidebarSections,
  matchesDashboardPath,
} from './urbanPrimeShell';

const UserSidebar: React.FC = () => {
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
    <div className="hidden w-[304px] shrink-0 self-stretch py-4 pl-0 pr-4 md:flex">
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative flex h-full w-full flex-col overflow-hidden rounded-l-none rounded-r-[34px] bg-gradient-to-b from-[#6d60d5] via-[#8660ae] to-[#cf9a69] p-[1px] shadow-[0_28px_76px_rgba(123,101,179,0.22)] dark:from-[#171a29] dark:via-[#241e35] dark:to-[#493726] dark:shadow-[0_30px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_32%),radial-gradient(circle_at_80%_15%,rgba(255,245,232,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]" />

        <div className="relative flex h-full flex-col overflow-hidden rounded-l-none rounded-r-[33px] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] px-5 pb-5 pt-6 text-white backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
          <div className="pointer-events-none absolute inset-x-5 top-0 h-24 rounded-b-[34px] bg-white/12 blur-3xl dark:bg-white/6" />

          <Link to="/profile" className="relative z-10">
            <UrbanPrimeBrandMark />
          </Link>

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
                      <motion.div
                        key={`${section.id}-${item.to}`}
                        whileHover={{ scale: 1.015, x: 4 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                      >
                        <NavLink to={item.to} end={item.end} className="block">
                          <div
                            className={`rounded-full p-[1px] transition-all duration-300 ${
                              isActive
                                ? 'bg-gradient-to-r from-white via-[#fff4f7] to-[#ffe6da] shadow-[0_18px_34px_rgba(91,29,85,0.24),0_10px_30px_rgba(255,255,255,0.16)]'
                                : 'bg-transparent'
                            }`}
                          >
                            <div
                              className={`flex items-center gap-3 rounded-full px-4 py-3 transition-all duration-300 ${
                                isActive
                                  ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(249,246,255,0.92))] text-[#5d4277] dark:bg-[linear-gradient(180deg,rgba(41,36,56,0.96),rgba(34,30,47,0.95))] dark:text-[#f3eadf]'
                                  : 'border border-transparent bg-white/10 text-white/92 hover:border-white/18 hover:bg-white/16 dark:bg-white/[0.05] dark:text-white/84 dark:hover:border-white/14 dark:hover:bg-white/[0.07]'
                              }`}
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border transition-all ${
                                  isActive
                                    ? 'border-white/70 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-100 text-[#86527b] shadow-[0_12px_22px_rgba(255,214,171,0.22)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#4a425f] dark:via-[#372f48] dark:to-[#4e3a2a] dark:text-[#f5ddc8] dark:shadow-none'
                                    : 'border-white/18 bg-white/12 text-white dark:border-white/10 dark:bg-white/[0.06]'
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[0.88rem] font-semibold">{item.label}</span>
                              <span
                                className={`h-2.5 w-2.5 rounded-full transition-all ${
                                  isActive
                                    ? 'bg-gradient-to-r from-violet-500 to-amber-400 shadow-[0_0_16px_rgba(255,190,120,0.4)] dark:from-[#c9b4ff] dark:to-[#f0c39b]'
                                    : 'bg-white/35 dark:bg-white/28'
                                }`}
                              />
                            </div>
                          </div>
                        </NavLink>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="relative z-10 mt-3 space-y-2">
            <AccountQuickAccess user={user} roleLabel={roleLabel} />

            <button
              type="button"
              onClick={logout}
              className="group flex w-full items-center gap-3 rounded-full bg-gradient-to-r from-[#8f6ce1] via-[#8f69c2] to-[#d39a65] px-3 py-2.5 text-[0.8rem] font-bold text-white shadow-[0_14px_26px_rgba(122,103,187,0.2)] transition-transform duration-300 hover:-translate-y-0.5 dark:from-[#2b2f46] dark:via-[#342942] dark:to-[#5a4330] dark:shadow-[0_14px_26px_rgba(0,0,0,0.22)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[13px] bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:bg-white/10">
                <DashboardLogoutIcon />
              </span>
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
};

export default UserSidebar;
