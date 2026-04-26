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
    <section className={`spotlight-commerce-bridge rounded-[1.75rem] border border-[#2F3336] bg-[rgba(22,22,22,0.7)] p-4 text-white backdrop-blur-[12px] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#71767B]">Commerce bridge</p>
          <h3 className="mt-1 text-lg font-black text-white">Spotlight to shop</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#71767B]">
            Tagged products can jump straight into item detail, cart, and checkout without leaving the discovery flow.
          </p>
        </div>
        <span className="rounded-full border border-[#2F3336] bg-black/40 px-3 py-1 text-[11px] font-semibold text-[#71767B]">
          Live funnel
        </span>
      </div>

      {topEntries.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {topEntries.map(({ item, product }) => (
            <div
              key={`${item.id}:${product.id}`}
              className="overflow-hidden rounded-[1.35rem] border border-[#2F3336] bg-black/50 transition duration-200 hover:-translate-y-0.5 hover:bg-black/70"
            >
              <button
                type="button"
                onClick={() => onOpenProduct?.(item, product)}
                className="group flex w-full items-center gap-3 p-3 text-left transition duration-200 hover:bg-white/[0.03]"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#0c0c0c]">
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
                  <p className="truncate text-sm font-bold text-white">{product.title}</p>
                  <p className="mt-1 text-xs text-[#71767B]">
                    {safePrice(product)} · {item.creator?.name || 'Creator shop'}
                  </p>
                  <p className="mt-2 inline-flex rounded-full border border-[#2F3336] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    {product.cta_label || 'Shop now'}
                  </p>
                </div>
                <span className="rounded-full border border-white/70 px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:bg-white group-hover:text-black">
                  Open
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2 border-t border-[#2F3336] p-2">
                <button
                  type="button"
                  onClick={() => onOpenProduct?.(item, product)}
                  className="rounded-full border border-[#2F3336] bg-transparent px-3 py-2 text-[11px] font-semibold text-[#71767B] transition hover:bg-white/5 hover:text-white"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => (onBuyProduct || onOpenProduct)?.(item, product)}
                  className="rounded-full border border-white/70 bg-transparent px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-white hover:text-black"
                >
                  {onBuyProduct ? 'Buy now' : 'Open'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.35rem] border border-dashed border-[#2F3336] bg-black/40 p-4 text-sm text-[#71767B]">
          When creators tag products in Spotlight, they will appear here and link directly into buy flows.
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-[1.2rem] border border-[#2F3336] bg-black/45 p-3 transition duration-200 hover:-translate-y-0.5 hover:bg-black/65"
          >
            <p className="text-sm font-bold text-white">{link.label}</p>
            <p className="mt-1 text-xs text-[#71767B]">{link.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default SpotlightCommerceBridge;
