import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import LottieAnimation from '../../../components/LottieAnimation';
import { uiLottieAnimations } from '../../../utils/uiAnimationAssets';

const cx = (...items: Array<string | false | null | undefined>) => items.filter(Boolean).join(' ');

export const providerNavItems = [
  { label: 'Overview', to: '/profile/provider', badge: 'OV', hint: 'Control tower', tone: 'from-[#8b7be8] to-[#dfaa73]' },
  { label: 'Hub Profile', to: '/profile/provider/hub-profile', badge: 'HP', hint: 'Public identity', tone: 'from-[#ff9c88] to-[#f2c46f]' },
  { label: 'Services', to: '/profile/provider/services', badge: 'SV', hint: 'Catalog + moderation', tone: 'from-[#6d8cff] to-[#76d0cb]' },
  { label: 'Leads', to: '/profile/provider/leads', badge: 'LD', hint: 'Demand triage', tone: 'from-[#ff9d6c] to-[#f4cc74]' },
  { label: 'Proposals', to: '/profile/provider/proposals', badge: 'PR', hint: 'Custom scope', tone: 'from-[#7e7cf7] to-[#b98af6]' },
  { label: 'Jobs', to: '/profile/provider/jobs', badge: 'JB', hint: 'Active delivery', tone: 'from-[#5dcb93] to-[#7fd6b0]' },
  { label: 'Calendar', to: '/profile/provider/calendar', badge: 'CL', hint: 'Availability', tone: 'from-[#68c2ff] to-[#8ad0f7]' },
  { label: 'Earnings', to: '/profile/provider/earnings', badge: 'ER', hint: 'Performance', tone: 'from-[#6e8dfa] to-[#9cc4ff]' },
  { label: 'Payouts', to: '/profile/provider/payouts', badge: 'PO', hint: 'Settlement desk', tone: 'from-[#f08e73] to-[#efbc6b]' },
  { label: 'Reviews', to: '/profile/provider/reviews', badge: 'RV', hint: 'Reputation', tone: 'from-[#8c77e9] to-[#e8a4c6]' },
  { label: 'Settings', to: '/profile/provider/settings', badge: 'ST', hint: 'Workspace config', tone: 'from-[#7a8aa4] to-[#adb5c6]' }
];

export const formatMoney = (amount?: number | null, currency = 'USD') =>
  `${currency} ${Number(amount || 0).toLocaleString()}`;

export const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const formatStatus = (value?: string | null) =>
  String(value || 'draft')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

export const statusPillClass = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'published' || normalized === 'approved' || normalized === 'completed' || normalized === 'active') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (normalized === 'pending_review' || normalized === 'submitted' || normalized === 'under_review' || normalized === 'pending') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'declined' || normalized === 'disputed') {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }
  return 'border-border bg-surface-soft text-text-secondary';
};

export const ProviderPageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, actions }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary md:text-[2rem]">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);

export const ProviderSurface: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div
    className={cx(
      'rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:bg-[linear-gradient(180deg,rgba(24,27,38,0.96),rgba(18,21,31,0.94))] dark:shadow-[0_20px_42px_rgba(0,0,0,0.24)]',
      className
    )}
  >
    {children}
  </div>
);

export const ProviderStatCard: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
}> = ({ label, value, hint }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,255,0.94))] p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)] dark:bg-[linear-gradient(180deg,rgba(25,29,40,0.96),rgba(19,22,32,0.95))] dark:shadow-[0_16px_30px_rgba(0,0,0,0.2)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <p className="mt-2 text-2xl font-black text-text-primary">{value}</p>
      </div>
      <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#8b7be8] to-[#dfaa73] shadow-[0_0_18px_rgba(139,123,232,0.32)]" />
    </div>
    {hint ? <p className="mt-2 text-xs leading-6 text-text-secondary">{hint}</p> : null}
  </motion.div>
);

export const ProviderEmptyState: React.FC<{
  title: string;
  body: string;
  ctaLabel?: string;
  ctaTo?: string;
  animation?: keyof typeof uiLottieAnimations;
  imageSrc?: string;
  imageAlt?: string;
}> = ({ title, body, ctaLabel, ctaTo, animation = 'noResults', imageSrc, imageAlt }) => (
  <div className="overflow-hidden rounded-[30px] border border-dashed border-border bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,255,255,0.78)_44%,_rgba(242,245,255,0.88)_100%),linear-gradient(160deg,_rgba(255,255,255,0.96),_rgba(245,247,255,0.88))] p-6 shadow-soft dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03)_44%,_rgba(24,29,42,0.98)_100%),linear-gradient(160deg,_rgba(20,24,35,0.96),_rgba(12,15,24,0.96))] sm:p-8">
    <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
      <div className="relative flex justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex min-h-[180px] w-full items-center justify-center rounded-[28px] border border-white/50 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          {imageSrc ? (
            <img src={imageSrc} alt={imageAlt || title} className="h-36 w-auto max-w-full object-contain" />
          ) : (
            <LottieAnimation src={uiLottieAnimations[animation]} alt={title} className="h-36 w-36 object-contain" loop autoplay />
          )}
        </div>
      </div>
      <div className="text-center md:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Provider workflow</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">{body}</p>
        {ctaLabel && ctaTo ? (
          <Link to={ctaTo} className="mt-5 inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:brightness-110">
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  </div>
);

export const ProviderInlineNav: React.FC = () => (
  <div className="-mx-1 overflow-x-auto px-1 pb-1">
    <div className="flex min-w-max flex-wrap gap-2 xl:min-w-0">
      {providerNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/profile/provider'}
          className={({ isActive }) =>
            cx(
              'min-w-[180px] rounded-[22px] border p-3 transition xl:min-w-[200px]',
              isActive
                ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(139,123,232,0.1),rgba(103,181,255,0.08))] text-text-primary shadow-[0_16px_30px_rgba(15,23,42,0.08)]'
                : 'border-border bg-background text-text-secondary shadow-[0_10px_20px_rgba(15,23,42,0.03)] hover:border-primary/20 hover:text-text-primary dark:bg-[linear-gradient(180deg,rgba(24,27,38,0.94),rgba(18,21,31,0.92))]'
            )
          }
        >
          {({ isActive }) => (
            <div className="flex items-center gap-3">
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border text-[11px] font-black uppercase tracking-[0.14em]', isActive ? `border-transparent bg-gradient-to-br ${item.tone} text-white` : 'border-border bg-surface text-text-secondary')}>
                {item.badge}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">{item.label}</p>
                  {isActive ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                </div>
                <p className="truncate text-[11px] uppercase tracking-[0.12em] text-text-secondary">{item.hint}</p>
              </div>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  </div>
);
