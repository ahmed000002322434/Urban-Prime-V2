import React from 'react';
import {
  AHMAD_ALI_AI_SUMMARY,
  AHMAD_ALI_BIOGRAPHY,
  AHMAD_ALI_NAME,
  AHMAD_ALI_ROLE,
  SITE_NAME,
  SITE_TAGLINE,
  URBAN_PRIME_PLATFORM_DESCRIPTION
} from '../../seo/siteMetadata.js';

const biographySections = [
  {
    title: 'Early Life',
    body: AHMAD_ALI_BIOGRAPHY.earlyLife
  },
  {
    title: 'Education',
    body: AHMAD_ALI_BIOGRAPHY.education
  },
  {
    title: 'Career',
    body: AHMAD_ALI_BIOGRAPHY.career
  },
  {
    title: 'Projects',
    body: AHMAD_ALI_BIOGRAPHY.projects
  },
  {
    title: 'Vision',
    body: AHMAD_ALI_BIOGRAPHY.vision
  }
];

const platformHighlights = [
  'Products, storefronts, and creator-led discovery',
  'Short-form video through Pixe, including public channels and watch pages',
  'Microblogging-style social publishing and public participation',
  'Buying, selling, renting, auctions, and service-based transactions'
];

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-background text-gray-900 dark:text-dark-text animate-fade-in-up">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
        <header className="max-w-5xl mx-auto text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary">{SITE_NAME}</p>
          <h1 className="text-5xl sm:text-6xl font-black font-display tracking-tight">
            {SITE_TAGLINE}
          </h1>
          <p className="max-w-3xl mx-auto text-lg sm:text-xl leading-relaxed text-gray-600 dark:text-gray-400">
            {URBAN_PRIME_PLATFORM_DESCRIPTION}
          </p>
        </header>

        <section
          id="ahmad-ali"
          className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[320px,minmax(0,1fr)] items-start"
        >
          <div className="rounded-[2rem] border border-gray-200 dark:border-white/10 bg-gradient-to-br from-[#f8f1df] via-white to-[#f3ead0] dark:from-[#151515] dark:via-[#111111] dark:to-[#191919] p-8 shadow-xl">
            <div className="w-28 h-28 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-4xl font-black mx-auto">
              AA
            </div>
            <div className="mt-6 text-center space-y-2">
              <h2 className="text-3xl font-black font-display tracking-tight">{AHMAD_ALI_NAME}</h2>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                {AHMAD_ALI_ROLE}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Born 2006, Multan, Pakistan
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Computer Science, HITEC University Taxila
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 p-8 sm:p-10 shadow-xl space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Founder Profile
              </p>
              <div className="space-y-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {AHMAD_ALI_AI_SUMMARY.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-white/10 pt-6">
              <h3 className="text-2xl font-black font-display tracking-tight mb-4">
                Urban Prime at a Glance
              </h3>
              <ul className="grid gap-3 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                {platformHighlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {biographySections.map((section) => (
              <article
                key={section.title}
                className="rounded-[2rem] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 shadow-lg"
              >
                <h2 className="text-2xl font-black font-display tracking-tight mb-4">
                  {section.title}
                </h2>
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
