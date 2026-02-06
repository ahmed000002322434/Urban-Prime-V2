import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Link } from 'react-router-dom';

const SafetyFeature: React.FC<{ icon: string; title: string; children: React.ReactNode; delay?: number }> = ({ icon, title, children, delay = 0 }) => {
    const featureRef = useScrollReveal<HTMLDivElement>();
    return (
        <div ref={featureRef} className="animate-reveal text-center" style={{ transitionDelay: `${delay}ms` }}>
            <div className="text-5xl mb-4 flex justify-center">{icon}</div>
            <h3 className="text-xl font-bold font-display text-gray-900 dark:text-dark-text mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{children}</p>
        </div>
    );
};

const SafetyCenterPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const featuresRef = useScrollReveal<HTMLDivElement>();
    const ctaRef = useScrollReveal<HTMLDivElement>();

    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal bg-gray-50 dark:bg-dark-surface">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                        Your Safety is Our Priority
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        We're committed to building a secure and trusted marketplace where our community can transact with confidence.
                    </p>
                </div>
            </section>

            <section ref={featuresRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                    <SafetyFeature icon="🛡️" title="Seller Verification">
                        Our multi-level verification system helps ensure that sellers are who they say they are. Look for the 'ID Verified' badge on seller profiles for extra peace of mind.
                    </SafetyFeature>
                    <SafetyFeature icon="💳" title="Secure Payments" delay={100}>
                        All payments are processed through a secure, encrypted gateway. Your financial details are never shared with other users on the platform.
                    </SafetyFeature>
                    <SafetyFeature icon="⚖️" title="Dispute Resolution" delay={200}>
                        In the rare case of a dispute, our AI-powered resolution center provides neutral suggestions, and our support team is here to help mediate a fair outcome.
                    </SafetyFeature>
                </div>
            </section>

            <section ref={ctaRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="bg-primary/10 dark:bg-primary/20 p-12 rounded-lg text-center">
                    <h2 className="text-3xl font-display font-bold mb-4 text-gray-900 dark:text-dark-text">Have Questions?</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
                        Our support team is available to answer any questions you have about safety, security, or a specific transaction.
                    </p>
                    <Link
                        to="/support-center"
                        className="inline-block bg-primary text-white font-bold py-3 px-10 rounded-full hover:opacity-90 transition-colors text-lg"
                    >
                        Contact Support
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default SafetyCenterPage;
