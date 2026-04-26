import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import PixeTopHeader from './PixeTopHeader';
import PixeStudioGlyph from './PixeStudioGlyph';
import PixeStudioOnboardingOverlay from './PixeStudioOnboardingOverlay';
import { pixeService, type PixeChannel } from '../../services/pixeService';
import { useAuth } from '../../hooks/useAuth';

const SIDEBAR_STATE_KEY = 'pixe_studio_sidebar_collapsed_v2';

const navigationItems = [
  { to: '/pixe-studio/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { to: '/pixe-studio/upload', label: 'Upload', icon: 'upload' as const },
  { to: '/pixe-studio/content', label: 'Content', icon: 'content' as const },
  { to: '/pixe-studio/comments', label: 'Comments', icon: 'comments' as const },
  { to: '/pixe-studio/channel', label: 'Channel', icon: 'channel' as const },
  { to: '/pixe-studio/analytics', label: 'Analytics', icon: 'analytics' as const },
  { to: '/pixe-studio/settings', label: 'Settings', icon: 'settings' as const }
];

const studioHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  { to: '/pixe-studio/channel', label: 'Channel' }
];

const readSidebarState = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STATE_KEY) === 'collapsed';
  } catch {
    return false;
  }
};

const PixeStudioShell: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(readSidebarState);
  const [studioChannel, setStudioChannel] = useState<(PixeChannel & { hidden_words?: string[]; onboarding_completed?: boolean }) | null>(null);
  const [studioChannelLoading, setStudioChannelLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // ignore local preference write failures
    }
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isAuthenticated) {
        if (!cancelled) {
          setStudioChannel(null);
          setStudioChannelLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setStudioChannelLoading(true);
        }
        const payload = await pixeService.getStudioChannel();
        if (!cancelled) {
          setStudioChannel(payload);
        }
      } catch (error) {
        console.error('Unable to load studio channel state:', error);
        if (!cancelled) {
          setStudioChannel(null);
        }
      } finally {
        if (!cancelled) {
          setStudioChannelLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const showChannelOnboarding = !studioChannelLoading && Boolean(studioChannel && !studioChannel.onboarding_completed);

  return (
    <div className="pixe-noir-shell pixe-studio-shell">
      <PixeTopHeader title="Pixe Studio" subtitle="Urban Prime" brandTo="/pixe-studio/dashboard" links={studioHeaderLinks} />

      <nav className="mb-5 flex gap-2 overflow-x-auto px-4 pt-5 sm:px-6 lg:hidden">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-white text-black' : 'border border-white/10 bg-white/90 text-black/72 hover:bg-white hover:text-black'
              }`
            }
          >
            <PixeStudioGlyph name={item.icon} className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={`hidden lg:block ${collapsed ? 'pl-[5.2rem]' : 'pl-[12.2rem]'}`}>
        <aside className={`fixed bottom-0 left-0 top-[4.6rem] z-30 border-r border-white/10 bg-[#050505]/92 backdrop-blur-xl transition-all ${collapsed ? 'w-[4.7rem]' : 'w-[11.5rem]'}`}>
          <div className="flex h-full flex-col overflow-hidden px-2.5 py-3">
            <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}>
              {!collapsed ? <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">Studio</p> : null}
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white text-black transition hover:bg-white/95"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <PixeStudioGlyph name={collapsed ? 'expand' : 'collapse'} className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-2">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) =>
                    `group flex items-center rounded-[22px] transition ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-white text-black shadow-[0_18px_42px_rgba(255,255,255,0.08)]'
                        : 'text-white/72 hover:bg-white/[0.08] hover:text-white'
                    }`
                  }
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${location.pathname.startsWith(item.to) ? 'border-black/10 bg-black/10 text-black' : 'border-white/10 bg-white/[0.04] text-white/84 group-hover:bg-white/[0.08]'}`}>
                    <PixeStudioGlyph name={item.icon} className="h-4.5 w-4.5" />
                  </span>
                  {!collapsed ? <span className="truncate text-sm font-semibold">{item.label}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className={`px-4 pb-8 pt-5 sm:px-6 lg:px-8 ${collapsed ? 'lg:pl-[5.8rem]' : 'lg:pl-[12.8rem]'}`}>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      {showChannelOnboarding && studioChannel ? (
        <PixeStudioOnboardingOverlay
          channel={studioChannel}
          onComplete={(nextChannel) => {
            setStudioChannel(nextChannel);
          }}
        />
      ) : null}
    </div>
  );
};

export default PixeStudioShell;
