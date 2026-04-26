import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ClayCard, ClaySectionHeader } from '../../components/dashboard/clay';

type WorkflowAction = {
  title: string;
  description: string;
  to: string;
  badge?: string;
};

type WorkflowSection = {
  title: string;
  subtitle: string;
  actions: WorkflowAction[];
};

const ActionCard: React.FC<WorkflowAction> = ({ title, description, to, badge }) => (
  <Link
    to={to}
    className="group rounded-[24px] border border-border bg-surface-soft p-4 transition hover:border-primary/35 hover:bg-white dark:hover:bg-white/5"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-base font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {badge ? (
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
          {badge}
        </span>
      ) : (
        <span className="text-lg font-black text-text-secondary transition group-hover:text-primary">{'->'}</span>
      )}
    </div>
  </Link>
);

const WorkflowHubPage: React.FC = () => {
  const { activePersona, hasCapability } = useAuth();

  const activePersonaType = activePersona?.type || 'consumer';
  const canSell = activePersonaType === 'seller' || hasCapability('sell');
  const canProvide = activePersonaType === 'provider' || hasCapability('provide_service');
  const canAffiliate = activePersonaType === 'affiliate' || hasCapability('affiliate');
  const canShip = activePersonaType === 'shipper' || hasCapability('ship');

  const starterActions = useMemo<WorkflowAction[]>(() => {
    if (activePersonaType === 'seller') {
      return [
        {
          title: 'List a product',
          description: 'Create a live listing with pricing, inventory, and fulfillment.',
          to: '/profile/products/new',
          badge: 'Start here'
        },
        {
          title: 'Manage sales',
          description: 'Process orders, shipping updates, and buyer follow-up.',
          to: '/profile/sales'
        },
        {
          title: 'Storefront settings',
          description: 'Tune the public store experience before traffic lands.',
          to: '/profile/store'
        }
      ];
    }

    if (activePersonaType === 'shipper') {
      return [
        {
          title: 'Open delivery queue',
          description: 'See active shipments, delayed rows, and tracking references.',
          to: '/profile/shipper/queue',
          badge: 'Start here'
        },
        {
          title: 'Shipper hub',
          description: 'Watch pickup, in-transit, and delivered counts refresh live.',
          to: '/profile/shipper-dashboard'
        },
        {
          title: 'SLA analytics',
          description: 'Review delays and exception pressure before the queue slips.',
          to: '/profile/analytics/shipper/overview'
        }
      ];
    }

    if (activePersonaType === 'provider') {
      return [
        {
          title: 'Provider dashboard',
          description: 'Review incoming leads, utilization, and open work.',
          to: '/profile/provider',
          badge: 'Start here'
        },
        {
          title: 'List service',
          description: 'Publish a new package with scope, pricing, and availability.',
          to: '/profile/provider/services/new'
        },
        {
          title: 'Messages',
          description: 'Continue buyer and client conversations from one inbox.',
          to: '/profile/messages'
        }
      ];
    }

    return [
      {
        title: 'Browse products',
        description: 'Explore the live marketplace catalog and seller storefronts.',
        to: '/browse',
        badge: 'Start here'
      },
      {
        title: 'Cart and checkout',
        description: 'Move from selection to purchase without leaving the main flow.',
        to: '/cart'
      },
      {
        title: 'My orders',
        description: 'Check purchases, rentals, delivery progress, and receipts.',
        to: '/profile/orders'
      }
    ];
  }, [activePersonaType]);

  const sections = useMemo<WorkflowSection[]>(() => {
    const baseSections: WorkflowSection[] = [
      {
        title: 'Account workflow',
        subtitle: 'Core account actions shared across every workspace.',
        actions: [
          {
            title: 'Profile settings',
            description: 'Update identity, notification, privacy, and account preferences.',
            to: '/profile/settings'
          },
          {
            title: 'Switch workspace',
            description: 'Move between buyer, seller, provider, affiliate, and shipper personas.',
            to: '/profile/switch-accounts'
          },
          {
            title: 'Messages',
            description: 'Keep operational conversations in one inbox.',
            to: '/profile/messages'
          },
          {
            title: 'Marketplace home',
            description: 'Return to public browsing, categories, and search.',
            to: '/'
          }
        ]
      },
      {
        title: 'Buyer workflow',
        subtitle: 'Browse, purchase, and track active orders without leaving the core path.',
        actions: [
          {
            title: 'Browse products',
            description: 'Search the live catalog, categories, and public item pages.',
            to: '/browse'
          },
          {
            title: 'Cart',
            description: 'Review selected items before checkout.',
            to: '/cart'
          },
          {
            title: 'Orders',
            description: 'Check purchase status, rentals, and delivery updates.',
            to: '/profile/orders'
          },
          {
            title: 'Public order tracking',
            description: 'Track an order from the confirmation email without signing in.',
            to: '/track-order'
          },
          {
            title: 'Digital library',
            description: 'Access purchased ZIP packages from the private library.',
            to: '/profile/digital-library'
          }
        ]
      }
    ];

    if (canSell) {
      baseSections.push({
        title: 'Seller workflow',
        subtitle: 'Listing, catalog operations, and fulfillment from one workspace.',
        actions: [
          {
            title: 'Store setup',
            description: 'Configure storefront branding, business profile, and public presence.',
            to: '/profile/store'
          },
          {
            title: 'List product',
            description: 'Publish a new listing with inventory, pricing, and media.',
            to: '/profile/products/new',
            badge: 'Core'
          },
          {
            title: 'Products',
            description: 'Review live listings, stock, and catalog health.',
            to: '/profile/products'
          },
          {
            title: 'Manage sales',
            description: 'Handle incoming orders, shipping updates, and fulfillment.',
            to: '/profile/sales'
          },
          {
            title: 'Promotions',
            description: 'Launch discounts and campaigns to improve conversion.',
            to: '/profile/promotions'
          },
          {
            title: 'Analytics',
            description: 'Watch revenue, conversion, and listing performance.',
            to: '/profile/analytics/advanced'
          }
        ]
      });
    }

    if (canProvide) {
      baseSections.push({
        title: 'Provider workflow',
        subtitle: 'Service listing, lead intake, and delivery operations.',
        actions: [
          {
            title: 'Provider dashboard',
            description: 'Monitor lead flow, service performance, and open work.',
            to: '/profile/provider'
          },
          {
            title: 'List service',
            description: 'Publish a new service package and availability.',
            to: '/profile/provider/services/new'
          },
          {
            title: 'Leads board',
            description: 'Accept bookings and reply to buyer requests.',
            to: '/profile/provider/leads'
          },
          {
            title: 'Calendar',
            description: 'Manage schedule and active work commitments.',
            to: '/profile/provider/calendar'
          }
        ]
      });
    }

    if (canAffiliate) {
      baseSections.push({
        title: 'Affiliate workflow',
        subtitle: 'Referral performance, promotions, and commission tracking.',
        actions: [
          {
            title: 'Affiliate dashboard',
            description: 'View referral activity and conversion performance.',
            to: '/profile/affiliate'
          },
          {
            title: 'Promotions',
            description: 'Create and distribute campaign assets and referral links.',
            to: '/profile/promotions'
          },
          {
            title: 'Wallet',
            description: 'Track commissions and payout readiness.',
            to: '/profile/wallet'
          }
        ]
      });
    }

    if (canShip) {
      baseSections.push({
        title: 'Shipper workflow',
        subtitle: 'Dispatch, queue review, and shipment exception control.',
        actions: [
          {
            title: 'Shipper dashboard',
            description: 'Watch active shipments, pickups, deliveries, and delays.',
            to: '/profile/shipper-dashboard'
          },
          {
            title: 'Delivery queue',
            description: 'Work the live queue with tracking references and ETA pressure.',
            to: '/profile/shipper/queue',
            badge: 'Core'
          },
          {
            title: 'SLA analytics',
            description: 'Review delayed shipments and delivery performance trends.',
            to: '/profile/analytics/shipper/overview'
          },
          {
            title: 'Messages',
            description: 'Coordinate with buyers, sellers, and support from the main inbox.',
            to: '/profile/messages'
          }
        ]
      });
    }

    return baseSections;
  }, [canAffiliate, canProvide, canSell, canShip]);

  return (
    <div className="dashboard-page space-y-5">
      <ClayCard size="lg" className="overflow-hidden">
        <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
          <ClaySectionHeader
            title="Workflow hub"
            subtitle="The pages below are grouped by user journey so listing, checkout, fulfillment, and follow-up stay easy to find."
          />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            {starterActions.map((action) => (
              <ActionCard key={`starter-${action.title}`} {...action} />
            ))}
          </div>
        </div>
      </ClayCard>

      {sections.map((section) => (
        <section key={section.title} className="rounded-[28px] border border-border bg-surface p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">{section.title}</h2>
            <p className="text-sm text-text-secondary">{section.subtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.actions.map((action) => (
              <ActionCard key={`${section.title}-${action.title}`} {...action} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default WorkflowHubPage;
