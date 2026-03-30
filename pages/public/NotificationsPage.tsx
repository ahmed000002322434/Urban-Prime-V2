import React from 'react';
import { Link } from 'react-router-dom';
import SpotlightShell from '../../components/spotlight/SpotlightShell';

const notifications = [
  { id: 'n1', title: 'Maya Nova posted a new Spotlight', detail: 'A polished visual story just went live.', time: '2m' },
  { id: 'n2', title: 'Ari Stone commented on your post', detail: 'This motion feels premium.', time: '14m' },
  { id: 'n3', title: 'Your Spotlight is trending', detail: 'Performance is up 42% in the last 24 hours.', time: '1h' },
  { id: 'n4', title: 'Lina Vega followed you', detail: 'New creator relationship unlocked.', time: '4h' }
];

const NotificationsPage: React.FC = () => {
  return (
    <SpotlightShell
      rightRail={(
        <div className="space-y-4">
          <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Notifications</p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">Spotlight activity</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Likes, comments, follows, and reposts stay close in a single premium stream.</p>
          </section>
          <section className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Quick links</p>
            <div className="mt-3 space-y-2">
              <Link to="/spotlight" className="block rounded-full bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Go to Spotlight</Link>
              <Link to="/profile/me" className="block rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Open profile</Link>
            </div>
          </section>
        </div>
      )}
    >
      <div className="mx-auto max-w-4xl space-y-5 px-2 lg:px-0">
        <header className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">Notifications</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Stay close to the action</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Likes, comments, follows, and Spotlight activity land here in one premium stream.</p>
        </header>

        <section className="space-y-3">
          {notifications.map((entry) => (
            <article key={entry.id} className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.detail}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">{entry.time}</span>
              </div>
            </article>
          ))}
        </section>

        <footer className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 text-sm text-slate-600 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Want the full creative surface? Jump back to Spotlight and keep discovering.</p>
            <div className="flex gap-2">
              <Link to="/spotlight" className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950">Spotlight</Link>
              <Link to="/more" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">More</Link>
            </div>
          </div>
        </footer>
      </div>
    </SpotlightShell>
  );
};

export default NotificationsPage;

