import React from 'react';
import { Link } from 'react-router-dom';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const faqs = [
  ['Why is my video still processing?', 'Uploads move through draft, upload, processing, and ready states. Large files, subtitle generation, or Mux retries can add a short delay.'],
  ['How do I set up my channel?', 'Open Pixe Studio, finish the channel onboarding card, choose a public handle, add your bio, and save the channel profile.'],
  ['How do I appeal a flagged clip?', 'Open the clip in Pixe Studio, review the rights and moderation signals, update subtitles or metadata if needed, then refresh the review state.'],
  ['Where can I manage my clips?', 'Use Content for edits and deletes, Channel for public profile changes, and Analytics for performance trends and engagement history.']
];

const quickLinks = [
  { to: '/pixe/guidelines', label: 'Community Guidelines' },
  { to: '/pixe/policies', label: 'Policies' },
  { to: '/pixe/terms', label: 'Terms' }
];

const PixeHelpPage: React.FC = () => (
  <div className="pixe-noir-shell min-h-[100svh] text-white">
    <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <section className="pixe-noir-panel rounded-[32px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Help Center</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Support for creators and viewers</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
          Use this surface to resolve upload issues, manage your channel, and review trust and safety expectations across Pixe.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_320px]">
        <section className="space-y-4">
          {faqs.map(([question, answer]) => (
            <article key={question} className="pixe-noir-panel rounded-[28px] p-5">
              <h2 className="text-lg font-semibold">{question}</h2>
              <p className="mt-3 text-sm leading-6 text-white/62">{answer}</p>
            </article>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="pixe-noir-panel rounded-[28px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Studio</p>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <p>`/pixe-studio/upload` for new clips</p>
              <p>`/pixe-studio/content` for edits and deletes</p>
              <p>`/pixe-studio/channel` for profile setup</p>
            </div>
          </div>
          <div className="pixe-noir-panel rounded-[28px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Need more?</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/support" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78">
                Main support center
              </Link>
              <Link to="/pixe-studio/dashboard" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                Open Studio
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
);

export default PixeHelpPage;
