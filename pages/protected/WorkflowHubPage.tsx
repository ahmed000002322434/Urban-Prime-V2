import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ClayCard, ClaySectionHeader } from '../../components/dashboard/clay';

type WorkflowAction = {
  title: string;
  description: string;
  to: string;
};

type WorkflowSection = {
  title: string;
  subtitle: string;
  actions: WorkflowAction[];
};

const ActionCard: React.FC<WorkflowAction> = ({ title, description, to }) => (
  <Link
    to={to}
    className="clay-card clay-size-md is-interactive"
  >
    <p className="text-base font-semibold text-[#1f1f1f]">{title}</p>
    <p className="mt-1 text-sm text-[#666]">{description}</p>
  </Link>
);

const WorkflowHubPage: React.FC = () => {
  const { activePersona, hasCapability } = useAuth();

  const canSell = activePersona?.type === 'seller' || hasCapability('sell');
  const canProvide = activePersona?.type === 'provider' || hasCapability('provide_service');
  const canAffiliate = activePersona?.type === 'affiliate' || hasCapability('affiliate');

  const sections = useMemo<WorkflowSection[]>(() => {
    const baseSections: WorkflowSection[] = [
      {
        title: 'Account workflow',
        subtitle: 'Core account actions used in every workspace.',
        actions: [
          {
            title: 'Profile settings',
            description: 'Update profile details, security, privacy, and notifications.',
            to: '/profile/settings'
          },
          {
            title: 'Switch workspace',
            description: 'Switch between consumer, seller, provider, and affiliate personas.',
            to: '/profile/switch-accounts'
          },
          {
            title: 'Messages',
            description: 'Manage buyer, seller, and support conversations in one inbox.',
            to: '/profile/messages'
          },
          {
            title: 'Marketplace home',
            description: 'Go back to public marketplace browsing and search.',
            to: '/'
          }
        ]
      },
      {
        title: 'Buyer workflow',
        subtitle: 'Browse, purchase, and track your orders.',
        actions: [
          {
            title: 'Browse products',
            description: 'Explore listings, categories, and search results.',
            to: '/browse'
          },
          {
            title: 'Cart',
            description: 'Review selected items before checkout.',
            to: '/cart'
          },
          {
            title: 'Orders',
            description: 'Track order status, rentals, and delivery updates.',
            to: '/profile/orders'
          },
          {
            title: 'Wishlist',
            description: 'Save products and monitor future purchase options.',
            to: '/profile/wishlist'
          }
        ]
      }
    ];

    if (canSell) {
      baseSections.push({
        title: 'Seller workflow',
        subtitle: 'Store setup, product operations, and growth tracking.',
        actions: [
          {
            title: 'Store setup',
            description: 'Configure your storefront and business profile.',
            to: '/profile/store'
          },
          {
            title: 'List product',
            description: 'Create a new product listing with inventory details.',
            to: '/profile/products/new'
          },
          {
            title: 'Manage sales',
            description: 'Handle incoming orders, shipping, and fulfillment.',
            to: '/profile/sales'
          },
          {
            title: 'Promotions',
            description: 'Run campaigns and discounts to drive conversions.',
            to: '/profile/promotions'
          },
          {
            title: 'Analytics',
            description: 'Monitor revenue trends, conversion, and catalog health.',
            to: '/profile/analytics/advanced'
          },
          {
            title: 'Earnings',
            description: 'Review payouts, balance movement, and income history.',
            to: '/profile/earnings'
          }
        ]
      });
    }

    if (canProvide) {
      baseSections.push({
        title: 'Provider workflow',
        subtitle: 'Create and manage service offers.',
        actions: [
          {
            title: 'Provider dashboard',
            description: 'Track service performance and request pipeline.',
            to: '/profile/provider-dashboard'
          },
          {
            title: 'List service',
            description: 'Publish a new service package and availability.',
            to: '/profile/services/new'
          },
          {
            title: 'Messages',
            description: 'Follow up with leads and clients from inbox.',
            to: '/profile/messages'
          }
        ]
      });
    }

    if (canAffiliate) {
      baseSections.push({
        title: 'Affiliate workflow',
        subtitle: 'Track referrals, performance, and commissions.',
        actions: [
          {
            title: 'Affiliate dashboard',
            description: 'View referral activity and conversion performance.',
            to: '/profile/affiliate'
          },
          {
            title: 'Wallet',
            description: 'Monitor payouts and available affiliate balance.',
            to: '/profile/wallet'
          }
        ]
      });
    }

    return baseSections;
  }, [canAffiliate, canProvide, canSell]);

  return (
    <div className="dashboard-page space-y-5">
      <ClayCard size="lg">
        <ClaySectionHeader
          title="Workflow hub"
          subtitle="All operational pages are grouped here so each workflow is one click away."
        />
      </ClayCard>

      {sections.map((section) => (
        <section key={section.title} className="clay-card clay-size-md">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-[#1f1f1f]">{section.title}</h2>
            <p className="text-sm text-[#666]">{section.subtitle}</p>
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
