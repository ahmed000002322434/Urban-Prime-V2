import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const GUIDE_SEEN_KEY = 'urbanprime_dashboard_guide_seen_v1';

const FirstTimeGuideCards: React.FC = () => {
  const { activePersona, hasCapability } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const cards = useMemo(() => {
    const base = [
      { title: 'Start buying fast', desc: 'Browse, add to cart, and checkout in a few taps.', link: '/browse', cta: 'Browse items' },
      { title: 'Track every order', desc: 'Watch shipment and delivery updates in real-time.', link: '/profile/orders', cta: 'Open orders' }
    ];
    if (hasCapability('sell')) {
      base.push({ title: 'Launch your storefront', desc: 'Create listings, manage pricing, and monitor sales analytics.', link: '/profile/products', cta: 'Manage listings' });
    }
    if (hasCapability('ship')) {
      base.push({ title: 'Run shipper ops', desc: 'Monitor pickup queue, transit status, and delayed shipments.', link: '/profile/shipper-dashboard', cta: 'Open shipper dashboard' });
    }
    return base;
  }, [hasCapability]);

  if (dismissed || !activePersona) return null;

  return (
    <section className="mb-5 rounded-3xl border border-white/12 bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">First-time guide</p>
          <h2 className="text-lg font-black text-text-primary">Welcome, {activePersona.type}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(GUIDE_SEEN_KEY, '1');
            } catch {
              // no-op
            }
          }}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          Dismiss
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {cards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-border bg-surface-soft p-3.5">
            <p className="text-sm font-bold text-text-primary">{card.title}</p>
            <p className="mt-1 text-xs text-text-secondary">{card.desc}</p>
            <Link to={card.link} className="mt-3 inline-flex rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
              {card.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FirstTimeGuideCards;
