import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import PixeBrand from './PixeBrand';

export type PixeHeaderLink =
  | {
    type?: 'link';
    to: string;
    label: string;
    end?: boolean;
  }
  | {
    type: 'menu';
    label: string;
    match?: string[];
    items: Array<{
      to: string;
      label: string;
      end?: boolean;
    }>;
  };

type PixeTopHeaderProps = {
  title: string;
  subtitle?: string;
  brandTo: string;
  links: PixeHeaderLink[];
  overlay?: boolean;
  containerClassName?: string;
  children?: React.ReactNode;
};

const baseLinkClassName =
  'inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition';

const PixeHeaderMenuPill: React.FC<{
  link: Extract<PixeHeaderLink, { type: 'menu' }>;
}> = ({ link }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const active = useMemo(() => {
    const currentPath = location.pathname;
    return (link.match || link.items.map((item) => item.to)).some((entry) => currentPath === entry || currentPath.startsWith(`${entry}/`));
  }, [link, location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div ref={shellRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${baseLinkClassName} ${
          open || active
            ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
            : 'text-white/74 hover:bg-white/[0.08] hover:text-white'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{link.label}</span>
        <svg viewBox="0 0 20 20" className={`ml-1.5 h-3.5 w-3.5 fill-none transition ${open ? 'rotate-180' : ''}`} stroke="currentColor" strokeWidth="1.8">
          <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
        </svg>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.65rem)] w-52 origin-top-right rounded-[24px] border border-white/10 bg-black/72 p-2 shadow-[0_26px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl transition ${
          open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
        }`}
        role="menu"
      >
        {link.items.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={`flex items-center justify-between rounded-[18px] px-3.5 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-white/78 hover:bg-white/[0.08] hover:text-white'
              }`}
              role="menuitem"
            >
              <span>{item.label}</span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 10h10" />
                <path d="m10 6 4 4-4 4" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const PixeTopHeader: React.FC<PixeTopHeaderProps> = ({
  title,
  subtitle,
  brandTo,
  links,
  overlay = false,
  containerClassName = 'mx-auto max-w-7xl',
  children
}) => {
  return (
    <div className={`${overlay ? 'absolute inset-x-0 top-0 z-40 px-3 pt-2 sm:px-5 lg:px-6' : 'sticky top-0 z-40 px-3 pt-2 sm:px-5 lg:px-6'}`}>
      <div className={containerClassName}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-full border border-white/10 bg-black/52 px-3 py-2 shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <PixeBrand title={title} subtitle={subtitle} to={brandTo} compact />
          </div>
          <nav className="inline-flex max-w-[calc(100vw-8rem)] flex-wrap items-center justify-end gap-1 rounded-full border border-white/10 bg-black/52 px-2 py-2 shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            {links.map((link) => (
              link.type === 'menu' ? (
                <PixeHeaderMenuPill key={`menu-${link.label}`} link={link} />
              ) : (
                <NavLink
                  key={`${link.to}-${link.label}`}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `${baseLinkClassName} ${
                      isActive
                        ? 'bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
                        : 'text-white/74 hover:bg-white/[0.08] hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              )
            ))}
          </nav>
        </div>
        {children ? (
          <div className="mt-2 rounded-[28px] border border-white/10 bg-black/46 px-4 py-3 shadow-[0_20px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-5">
            <div className="flex flex-wrap gap-2">{children}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PixeTopHeader;
