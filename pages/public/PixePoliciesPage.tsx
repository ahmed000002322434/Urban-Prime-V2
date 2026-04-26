import React from 'react';
import { Link } from 'react-router-dom';
import PixeTopHeader from '../../components/pixe/PixeTopHeader';

const publicHeaderLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/pixe', label: 'Feed' },
  { to: '/pixe/explore', label: 'Explore' },
  { to: '/pixe-studio/dashboard', label: 'Studio' }
];

const policySections = [
  ['Copyright review', 'Pixe scans video metadata, subtitles, and duplicate patterns. Clips can be queued for manual review before or after publishing when signals point to reused source material.'],
  ['Fraud and engagement abuse', 'Bot traffic, view farms, replayed milestone events, and suspicious share bursts are filtered and can lead to reduced distribution or enforcement action.'],
  ['Channel access', 'Creator tools, visibility settings, and product tagging can be limited when a channel repeatedly violates policy or submits deceptive account information.'],
  ['Comment enforcement', 'Reported comments can be hidden, flagged, deleted, or dismissed by creators and admins based on severity and repeat behavior.']
];

const PixePoliciesPage: React.FC = () => (
  <div className="pixe-noir-shell min-h-[100svh] text-white">
    <PixeTopHeader title="Pixe" subtitle="Urban Prime" brandTo="/pixe" links={publicHeaderLinks} />
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <section className="pixe-noir-panel rounded-[32px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Policies</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Safety and integrity rules</h1>
      </section>

      <div className="mt-6 space-y-4">
        {policySections.map(([title, body]) => (
          <article key={title} className="pixe-noir-panel rounded-[28px] p-5">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">{body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-white/64">
        For broader site-wide legal terms, privacy, and refunds, see the main <Link to="/terms" className="font-semibold text-white">Urban Prime terms</Link> and <Link to="/privacy-policy" className="font-semibold text-white">privacy policy</Link>.
      </div>
    </div>
  </div>
);

export default PixePoliciesPage;
