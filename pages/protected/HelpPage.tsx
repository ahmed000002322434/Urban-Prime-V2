import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type HelpTopic = {
    id: string;
    title: string;
    summary: string;
    steps: string[];
    requirements: string[];
    links: Array<{ label: string; to: string }>;
};

const helpTopics: HelpTopic[] = [
    {
        id: 'seller-onboarding',
        title: 'Seller Workspace Setup',
        summary: 'Create a seller workspace to publish products, receive cart and order activity, and manage listings from your dashboard.',
        steps: [
            'Open Account Workspaces from dashboard settings.',
            'Choose Seller Workspace and complete the business profile fields.',
            'Submit setup to create the persona and activate it.',
            'Go to My Products and publish your first listing.',
            'Monitor Activity and Notifications for views, cart adds, and orders.'
        ],
        requirements: ['Business/store name', 'Category/industry', 'Contact phone and country', 'Operating goals'],
        links: [
            { label: 'Open Account Workspaces', to: '/profile/switch-accounts' },
            { label: 'Create a Product Listing', to: '/profile/products/new' },
            { label: 'Seller Dashboard', to: '/profile/sales' }
        ]
    },
    {
        id: 'provider-onboarding',
        title: 'Provider Workspace Setup',
        summary: 'Use a provider workspace to list services, manage bookings, and track service fulfillment performance.',
        steps: [
            'Create or activate a Provider Workspace in Account Workspaces.',
            'Complete service profile details including category and service area.',
            'Publish your first service from Service Listing page.',
            'Manage incoming requests in Provider Dashboard.',
            'Use messages and delivery/booking pages for fulfillment updates.'
        ],
        requirements: ['Service business name', 'Service category', 'Experience details', 'Coverage region'],
        links: [
            { label: 'Open Account Workspaces', to: '/profile/switch-accounts' },
            { label: 'List a Service', to: '/profile/services/new' },
            { label: 'Provider Dashboard', to: '/profile/provider-dashboard' }
        ]
    },
    {
        id: 'affiliate-onboarding',
        title: 'Affiliate Workspace Setup',
        summary: 'Affiliate workspace enables referral links, conversion analytics, and payout tracking without mixing with seller/provider data.',
        steps: [
            'Create or activate an Affiliate Workspace.',
            'Define your channel profile and campaign goals.',
            'Generate referral links for eligible products.',
            'Track clicks and conversions in Affiliate dashboard.',
            'Request payouts from wallet when eligible.'
        ],
        requirements: ['Creator name', 'Traffic source/channel', 'Country', 'Campaign focus'],
        links: [
            { label: 'Open Account Workspaces', to: '/profile/switch-accounts' },
            { label: 'Affiliate Dashboard', to: '/profile/affiliate' },
            { label: 'Wallet', to: '/profile/wallet' }
        ]
    },
    {
        id: 'consumer-workspace',
        title: 'Consumer Workspace',
        summary: 'Consumer workspace is used for buying and renting flows, checkout, orders, and saved cart/wishlist.',
        steps: [
            'Ensure Consumer Workspace is active before checkout or rent flow.',
            'Browse products and add to cart/wishlist.',
            'Complete checkout to create orders tied to consumer persona.',
            'Track orders and booking updates from dashboard.',
            'Manage payment methods and addresses in settings.'
        ],
        requirements: ['Contact profile', 'Delivery address', 'Preferred payment method'],
        links: [
            { label: 'Browse Marketplace', to: '/browse' },
            { label: 'Cart', to: '/cart' },
            { label: 'Orders', to: '/profile/orders' }
        ]
    },
    {
        id: 'notifications',
        title: 'Notifications and Activity Signals',
        summary: 'Owners receive activity notifications for cart add, purchase, rent, and auction outcomes on their listings.',
        steps: [
            'Ensure listing actions are performed while server is running.',
            'Open Notifications from header or dashboard settings.',
            'Mark notifications as read once reviewed.',
            'Use Activity page for deeper timeline details.',
            'Use Sales page for summary metrics.'
        ],
        requirements: ['Active user profile', 'Published listing'],
        links: [
            { label: 'Activity Timeline', to: '/profile/activity' },
            { label: 'Owner Controls', to: '/profile/owner-controls' },
            { label: 'Notification Settings', to: '/profile/settings/notifications' },
            { label: 'Sales Management', to: '/profile/sales' }
        ]
    }
];

const HelpPage: React.FC = () => {
    const [params] = useSearchParams();
    const requestedTopic = params.get('topic') || '';

    const activeTopic = useMemo(() => {
        if (!requestedTopic) return helpTopics[0];
        return helpTopics.find((topic) => topic.id === requestedTopic) || helpTopics[0];
    }, [requestedTopic]);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-soft">
                <p className="text-xs uppercase tracking-wider text-primary font-semibold">Help Center</p>
                <h1 className="text-3xl font-bold text-text-primary mt-1">{activeTopic.title}</h1>
                <p className="text-sm text-text-secondary mt-2 max-w-3xl">{activeTopic.summary}</p>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <aside className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-soft">
                    <h2 className="text-sm font-semibold text-text-primary mb-3">Topics</h2>
                    <ul className="space-y-2">
                        {helpTopics.map((topic) => {
                            const isActive = topic.id === activeTopic.id;
                            return (
                                <li key={topic.id}>
                                    <Link
                                        to={`/help?topic=${encodeURIComponent(topic.id)}`}
                                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                                            isActive
                                                ? 'bg-primary/10 text-primary font-semibold border border-primary/30'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-soft border border-transparent'
                                        }`}
                                    >
                                        {topic.title}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                <div className="space-y-6">
                    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-soft">
                        <h2 className="text-lg font-semibold text-text-primary">Implementation Steps</h2>
                        <ol className="mt-3 space-y-2 text-sm text-text-secondary">
                            {activeTopic.steps.map((step, index) => (
                                <li key={step}>{index + 1}. {step}</li>
                            ))}
                        </ol>
                    </section>

                    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-soft">
                        <h2 className="text-lg font-semibold text-text-primary">Required Information</h2>
                        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                            {activeTopic.requirements.map((requirement) => (
                                <li key={requirement}>- {requirement}</li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-soft">
                        <h2 className="text-lg font-semibold text-text-primary">Direct Actions</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {activeTopic.links.map((item) => (
                                <Link
                                    key={item.to + item.label}
                                    to={item.to}
                                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-primary/40"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
};

export default HelpPage;