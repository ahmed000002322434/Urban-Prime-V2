import React from 'react';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const terms = [
  ['Creator responsibility', 'Creators are responsible for the rights, accuracy, and safety of every clip, subtitle track, linked product tag, and profile detail submitted through Pixe Studio.'],
  ['Viewer interactions', 'Likes, comments, follows, saves, and shares may be limited, reversed, or filtered when fraud, abuse, or policy violations are detected.'],
  ['Distribution', 'Pixe may limit, downrank, age-gate, or remove content that violates copyright, moderation, commerce, or anti-fraud policies.'],
  ['Operational review', 'Admin and moderation teams may review videos, comment reports, subtitle edits, and enforcement history to protect viewers, creators, and the platform.']
];

const PixeTermsPage: React.FC = () => (
  <div className="pixe-noir-shell min-h-[100svh] text-white">
    <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <section className="pixe-noir-panel rounded-[32px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Pixe Terms</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Creator and viewer terms for short-form video</h1>
      </section>

      <div className="mt-6 space-y-4">
        {terms.map(([title, body]) => (
          <article key={title} className="pixe-noir-panel rounded-[28px] p-5">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">{body}</p>
          </article>
        ))}
      </div>
    </div>
  </div>
);

export default PixeTermsPage;
