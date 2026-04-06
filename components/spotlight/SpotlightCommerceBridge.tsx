import React from 'react';
import { Link } from 'react-router-dom';
import type { SpotlightItem, SpotlightProductLink } from '../../services/spotlightService';

type CommerceEntry = {
  item: SpotlightItem;
  product: SpotlightProductLink;
};

type QuickLink = {
  label: string;
  hint: string;
  to: string;
};

type SpotlightCommerceBridgeProps = {
  entries?: CommerceEntry[];
  quickLinks?: QuickLink[];
  onOpenProduct?: (item: SpotlightItem, product: SpotlightProductLink) => void;
  onBuyProduct?: (item: SpotlightItem, product: SpotlightProductLink) => void;
  className?: string;
};

const safePrice = (product: SpotlightProductLink) => {
  if (typeof product.sale_price === 'number' && Number.isFinite(product.sale_price)) {
    return `${product.currency || 'USD'} ${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(product.sale_price)}`;
  }
  if (typeof product.rental_price === 'number' && Number.isFinite(product.rental_price)) {
    return `${product.currency || 'USD'} ${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(product.rental_price)}/mo`;
  }
  return product.cta_label || 'Open product';
};

const SpotlightCommerceBridge: React.FC<SpotlightCommerceBridgeProps> = ({
  entries = [],
  quickLinks = [
    { label: 'Products', hint: 'Manage listings', to: '/profile/products' },
    { label: 'Storefront', hint: 'Open your shop', to: '/profile/store' },
    { label: 'Cart', hint: 'Review your bag', to: '/cart' },
    { label: 'Sales', hint: 'Track orders', to: '/profile/sales' },
    { label: 'Earnings', hint: 'Review revenue', to: '/profile/earnings' },
    { label: 'Checkout', hint: 'Buyer flow', to: '/checkout' }
  ],
  onOpenProduct,
  onBuyProduct,
  className = ''
}) => {
  const topEntries = entries.slice(0, 4);

  return (
    <section className={`spotlight-commerce-bridge rounded-[1.75rem] border border-white/70 bg-white/72 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500">Commerce bridge</p>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Spotlight to shop</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Tagged products can jump straight into item detail, cart, and checkout without leaving the discovery flow.
          </p>
        </div>
        <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Live funnel
        </span>
      </div>

      {topEntries.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {topEntries.map(({ item, product }) => (
            <div
              key={`${item.id}:${product.id}`}
              className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/78 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5"
            >
              <button
                type="button"
                onClick={() => onOpenProduct?.(item, product)}
                className="group flex w-full items-center gap-3 p-3 text-left transition duration-200 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{product.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {safePrice(product)} · {item.creator?.name || 'Creator shop'}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                    {product.cta_label || 'Shop now'}
                  </p>
                </div>
                <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition group-hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:group-hover:bg-white/10">
                  Open
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2 border-t border-white/60 p-2 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => onOpenProduct?.(item, product)}
                  className="rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => (onBuyProduct || onOpenProduct)?.(item, product)}
                  className="rounded-full bg-slate-950 px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-110 dark:bg-white dark:text-slate-950"
                >
                  {onBuyProduct ? 'Buy now' : 'Open'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.35rem] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          When creators tag products in Spotlight, they will appear here and link directly into buy flows.
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-[1.2rem] border border-white/70 bg-white/80 p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-sm font-bold text-slate-950 dark:text-white">{link.label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{link.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default SpotlightCommerceBridge;
