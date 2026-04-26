import React from 'react';
import { Link } from 'react-router-dom';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const guidelineSections = [
  ['Originality', 'Upload clips you own or have rights to use. Reuploads, ripped trailers, and unlicensed soundtrack edits are likely to be reviewed or blocked.'],
  ['Safety', 'Do not post content that promotes hate, self-harm, adult exploitation, or graphic violence. Borderline content can be limited or sent to moderation review.'],
  ['Commerce', 'Only tag products or services that genuinely relate to the clip. Misleading tags, fake pricing, or bait-and-switch CTAs can remove shopping privileges.'],
  ['Spam', 'Inflated engagement, duplicate uploads, and repeated low-value reposts can reduce distribution and trigger review queues.']
];

const PixeGuidelinesPage: React.FC = () => (
  <div className="pixe-noir-shell min-h-[100svh] text-white">
    <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <section className="pixe-noir-panel rounded-[32px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Community Guidelines</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">What belongs on Pixe</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
          Pixe is built for short-form social video with real creator identity, connected commerce, and accountable distribution.
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {guidelineSections.map(([title, body]) => (
          <article key={title} className="pixe-noir-panel rounded-[28px] p-5">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">{body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-white/64">
        If a clip enters review, open it in <Link to="/pixe-studio/content" className="font-semibold text-white">Pixe Studio</Link>, update metadata or subtitles, then refresh the review state from the video details page.
      </div>
    </div>
  </div>
);

export default PixeGuidelinesPage;
