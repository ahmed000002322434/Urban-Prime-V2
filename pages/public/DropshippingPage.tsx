import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import commerceService from '../../services/commerceService';
import type { DropshipWorkspaceSnapshot } from '../../types';
import { CommerceDashboardSkeleton } from '../../components/commerce/CommerceSkeleton';

const pillars = [
  {
    title: 'Managed supplier catalog',
    body: 'Launch inventory comes from an admin-managed catalog with canonical supplier cost, shipping, stock, and routing rules.'
  },
  {
    title: 'Blind buyer experience',
    body: 'The buyer still sees a standard Urban Prime sale flow. Supplier identity stays internal while the seller remains merchant-of-record in UX.'
  },
  {
    title: 'Hybrid routing',
    body: 'Each listing can route through manual review, seller approval, or auto-submit after payment authorization.'
  },
  {
    title: 'Payable ledger',
    body: 'Supplier payables are tracked through a settlement ledger instead of hidden spreadsheet operations.'
  }
];

const requirements = [
  'Approved seller profile',
  'Verified store identity',
  'Margin guardrail discipline',
  'Blind dropship buyer support',
  'Operational response to supplier exceptions'
];

const statusTone: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
  suspended: 'bg-rose-100 text-rose-700',
  draft: 'bg-slate-200 text-slate-700'
};

const DropshippingPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [workspace, setWorkspace] = useState<DropshipWorkspaceSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user || !commerceService.enabled()) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setIsLoading(true);
    commerceService
      .getDropshipProfile()
      .then((snapshot) => {
        if (!cancelled) setWorkspace(snapshot);
      })
      .catch(() => {
        if (!cancelled) setWorkspace(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const cta = useMemo(() => {
    if (!user) {
      return {
        title: 'Apply for dropshipping',
        subtitle: 'Sign in as a seller to submit your profile and unlock the managed catalog.',
        href: '/register'
      };
    }
    const status = String(workspace?.profile?.status || 'draft');
    if (status === 'approved') {
      return {
        title: 'Open creator hub',
        subtitle: 'Your approval is active. Import catalog products and run supplier orders from one workspace.',
        href: '/profile/creator-hub'
      };
    }
    if (status === 'pending') {
      return {
        title: 'Review application',
        subtitle: 'Approval is pending. Keep your application details updated in the creator hub.',
        href: '/profile/creator-hub'
      };
    }
    return {
      title: 'Finish seller application',
      subtitle: 'Dropshipping access requires an approved seller profile before catalog import is enabled.',
      href: '/profile/creator-hub'
    };
  }, [user, workspace?.profile?.status]);

  if (isLoading) return <CommerceDashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-10">
        <section className="overflow-hidden rounded-[40px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef2ff_38%,#e2e8f0_100%)] px-6 py-10 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,1)_0%,rgba(30,41,59,0.98)_38%,rgba(51,65,85,0.9)_100%)] sm:px-10">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Seller Program</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
                Dropshipping that runs on the same commerce core as your sale orders.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Urban Prime keeps the storefront normal for buyers, while supplier routing, payables, catalog control,
                and exception handling move into a canonical backend workflow.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={cta.href}
                  className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                >
                  {cta.title}
                </Link>
                <Link
                  to="/profile/sales"
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                >
                  Seller operations
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">{pillar.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="rounded-[34px] border border-slate-200/80 bg-white/88 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Access State</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                  statusTone[String(workspace?.profile?.status || 'draft').toLowerCase()] || 'bg-slate-200 text-slate-700'
                }`}
              >
                {String(workspace?.profile?.status || 'draft').replace(/_/g, ' ')}
              </span>
              {workspace?.canAccessCatalog ? (
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                  Catalog unlocked
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{cta.subtitle}</p>
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 dark:bg-white/[0.05]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Launch defaults</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <li>Admin-managed suppliers, connector-ready schema</li>
                <li>Seller-only blind dropshipping buyer relationship</li>
                <li>Manual settlement ledger with audit trails</li>
                <li>Mixed routing per supplier or listing</li>
              </ul>
            </div>
          </div>

          <div className="rounded-[34px] border border-slate-200/80 bg-white/88 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Requirements</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {requirements.map((requirement) => (
                <div
                  key={requirement}
                  className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                >
                  {requirement}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DropshippingPage;
