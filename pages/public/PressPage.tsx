import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const PressRelease: React.FC<{ title: string; date: string; publication: string; link: string, delay?: number }> = ({ title, date, publication, link, delay = 0 }) => {
  const cardRef = useScrollReveal<HTMLAnchorElement>();
  return (
    <a ref={cardRef} href={link} target="_blank" rel="noopener noreferrer" className="animate-reveal block bg-white dark:bg-dark-surface p-6 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all" style={{ transitionDelay: `${delay}ms` }}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{publication} &bull; {date}</p>
      <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mt-2">{title}</h3>
    </a>
  );
};

const PressPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const contactRef = useScrollReveal<HTMLDivElement>();

  const releases = [
    { title: "Urban Prime Secures $10M in Series A Funding to Expand Peer-to-Peer Rentals", date: "October 15, 2023", publication: "TechCrunch", link: "#" },
    { title: "How Urban Prime is Making Sustainability Profitable for Everyone", date: "September 28, 2023", publication: "Forbes", link: "#" },
    { title: "The Rise of the 'Rental Everything' Economy, Led by Urban Prime", date: "September 5, 2023", publication: "The New York Times", link: "#" },
  ];

  return (
    <div className="bg-gray-50 dark:bg-dark-background animate-fade-in-up">
      <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
          Press & Media
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          News, announcements, and media resources for Urban Prime.
        </p>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-3xl font-bold text-center mb-12 font-display dark:text-dark-text">In the News</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {releases.map((release, index) => (
            <PressRelease key={release.title} {...release} delay={index * 100} />
          ))}
        </div>
      </div>
      
      <section ref={contactRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-3xl mx-auto bg-white dark:bg-dark-surface p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-dark-text">Media Inquiries</h2>
            <p className="text-gray-600 dark:text-gray-400">For press and media inquiries, please contact us at:</p>
            <a href="mailto:press@urbanprime.com" className="text-primary font-bold text-lg hover:underline">press@urbanprime.com</a>
        </div>
      </section>
    </div>
  );
};

export default PressPage;
