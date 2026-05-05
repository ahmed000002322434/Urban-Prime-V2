import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';

const panelClass =
  'rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_35%),linear-gradient(180deg,rgba(18,18,22,0.98),rgba(7,8,10,0.96))] shadow-[0_26px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[24px]';
const softClass =
  'rounded-[24px] border border-white/[0.06] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';

const routeMeta: Record<string, { title: string; detail: string; cards: Array<{ title: string; detail: string; to: string }> }> = {
  '/spotlight/more': {
    title: 'More from Spotlight',
    detail: 'Shortcuts into the rest of the X-style surfaces, commerce workflow, and creator tools.',
    cards: [
      { title: 'Lists', detail: 'Curated creator and product lanes.', to: '/spotlight/lists' },
      { title: 'Communities', detail: 'Group surfaces and topical social clusters.', to: '/spotlight/communities' },
      { title: 'Premium', detail: 'Upgrade-focused creator perks and signals.', to: '/spotlight/premium' },
      { title: 'Jobs', detail: 'Talent and collaboration opportunities.', to: '/spotlight/jobs' },
      { title: 'Spaces', detail: 'Live conversation placeholders linked to feed discovery.', to: '/spotlight/spaces' }
    ]
  },
  '/spotlight/lists': {
    title: 'Spotlight Lists',
    detail: 'Curated creator, product, and launch watchlists without introducing a new persistence model yet.',
    cards: [
      { title: 'Top sellers', detail: 'Jump into storefront-heavy creators.', to: '/spotlight/search?q=seller' },
      { title: 'Luxury drops', detail: 'Track the highest-signal commerce posts.', to: '/spotlight/explore' },
      { title: 'Saved lane', detail: 'Review the posts you already bookmarked.', to: '/spotlight/saved' }
    ]
  },
  '/spotlight/communities': {
    title: 'Spotlight Communities',
    detail: 'Thin v1 community surfaces that route into real Spotlight feeds, profiles, and messages.',
    cards: [
      { title: 'Creator chat', detail: 'Open the message workspace.', to: '/spotlight/messages' },
      { title: 'Explore tags', detail: 'Jump into searchable discovery.', to: '/spotlight/search' },
      { title: 'Live alerts', detail: 'Review community updates and mentions.', to: '/spotlight/notifications' }
    ]
  },
  '/spotlight/premium': {
    title: 'Spotlight Premium',
    detail: 'A premium surface aligned to creator analytics, profile polish, and post distribution.',
    cards: [
      { title: 'Creator profile', detail: 'Tune public identity and pinned posts.', to: '/spotlight/profile' },
      { title: 'Post composer', detail: 'Ship a premium Spotlight with tagged products.', to: '/spotlight/create' },
      { title: 'Notifications', detail: 'Monitor delivery and social response.', to: '/spotlight/notifications' }
    ]
  },
  '/spotlight/jobs': {
    title: 'Spotlight Jobs',
    detail: 'A route-level jobs surface that links into the real inbox, creator profiles, and discovery flows.',
    cards: [
      { title: 'Find creators', detail: 'Search by handle, tag, or product.', to: '/spotlight/search' },
      { title: 'Message talent', detail: 'Use the shared inbox workspace.', to: '/spotlight/messages' },
      { title: 'View profiles', detail: 'Inspect public creator timelines.', to: '/spotlight/profile' }
    ]
  },
  '/spotlight/spaces': {
    title: 'Spotlight Spaces',
    detail: 'Conversation-first surfaces that stay thin in v1 and route into feed, alerts, and inbox data already in the app.',
    cards: [
      { title: 'Live feed', detail: 'Return to realtime Spotlight posts.', to: '/spotlight' },
      { title: 'Alerts', detail: 'Watch replies, orders, and mentions.', to: '/spotlight/notifications' },
      { title: 'Inbox', detail: 'Continue the thread in messages.', to: '/spotlight/messages' }
    ]
  }
};

const SpotlightMorePage: React.FC = () => {
  const location = useLocation();
  const meta = routeMeta[location.pathname] || routeMeta['/spotlight/more'];

  return (
    <SpotlightNoirBlankSurface>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className={`${panelClass} p-6 sm:p-7`}>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/36">Spotlight utility</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{meta.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/56 sm:text-[15px]">{meta.detail}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {meta.cards.map((card) => (
            <Link key={card.to} to={card.to} className={`${panelClass} block p-5 transition hover:-translate-y-1`}>
              <div className={`${softClass} p-4`}>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/38">Route</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">{card.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/56">{card.detail}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </SpotlightNoirBlankSurface>
  );
};

export default SpotlightMorePage;
