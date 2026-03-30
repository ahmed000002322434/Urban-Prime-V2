import React from 'react';
import { Link } from 'react-router-dom';

const links = [
  { to: '/spotlight/create', title: 'Create Spotlight', detail: 'Publish photos and videos in the unified feed.' },
  { to: '/spotlight', title: 'Discover Spotlight', detail: 'Explore the new premium social surface.' },
  { to: '/messages', title: 'Messages', detail: 'Check creator conversations and replies.' },
  { to: '/notifications', title: 'Notifications', detail: 'See likes, comments, and follows.' },
  { to: '/profile/settings', title: 'Settings', detail: 'Control account, privacy, and notifications.' },
  { to: '/help', title: 'Help Center', detail: 'Support and guidance for creators and shoppers.' }
];

const MorePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18)_0%,_rgba(248,250,252,1)_70%)] px-4 py-6 text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18)_0%,_rgba(2,6,23,1)_55%)] dark:text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">More</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Everything you need, in one calm place</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">This keeps the Spotlight shell clean while still surfacing the most useful actions and shortcuts.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {links.map((entry) => (
            <Link key={entry.to} to={entry.to} className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-bold text-slate-950 dark:text-white">{entry.title}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.detail}</p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default MorePage;
