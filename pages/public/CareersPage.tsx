import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const JobOpening: React.FC<{ title: string; location: string; type: string; delay?: number }> = ({ title, location, type, delay = 0 }) => {
  const cardRef = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={cardRef} className="animate-reveal bg-white dark:bg-dark-surface p-6 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 flex justify-between items-center" style={{ transitionDelay: `${delay}ms` }}>
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{location} &bull; {type}</p>
      </div>
      <button className="px-4 py-2 bg-primary text-white font-semibold rounded-md text-sm hover:opacity-90">Apply Now</button>
    </div>
  );
};

const CareersPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();

  const openings = [
    { title: 'Senior Frontend Engineer', location: 'Remote', type: 'Full-time' },
    { title: 'Product Manager, Growth', location: 'San Francisco, CA', type: 'Full-time' },
    { title: 'Community Support Specialist', location: 'Remote', type: 'Part-time' },
    { title: 'Lead Backend Engineer (Go)', location: 'New York, NY', type: 'Full-time' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-dark-background animate-fade-in-up">
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
          Join Our Team
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          We're building the future of the circular economy. If you're passionate about technology, sustainability, and community, we want to hear from you.
        </p>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12 font-display dark:text-dark-text">Current Openings</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {openings.map((job, index) => (
            <JobOpening key={job.title} {...job} delay={index * 100} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
