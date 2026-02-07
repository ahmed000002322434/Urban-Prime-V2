
import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Link } from 'react-router-dom';
import IconBadge from '../../components/IconBadge';

const HowItWorksPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const customerRef = useScrollReveal<HTMLDivElement>();
    const providerRef = useScrollReveal<HTMLDivElement>();
    const differenceRef = useScrollReveal<HTMLDivElement>();

    return (
        <div className="bg-surface dark:bg-dark-background animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold font-display text-text-primary">How It Works</h1>
                <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto">
                    A premium, secure, and simple way to find and offer services.
                </p>
            </section>

            <section ref={customerRef} className="animate-reveal py-20 bg-surface-soft dark:bg-dark-surface/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold font-display text-center mb-16 text-text-primary">For Customers</h2>
                    <div className="grid md:grid-cols-4 gap-10 text-center max-w-6xl mx-auto">
                        <StepCard icon="🔍" title="1. Find Your Pro" description="Browse categories or post a job request with your specific needs, location, and budget." />
                        <StepCard icon="🤝" title="2. Compare & Book" description="Review matched providers, compare profiles, ratings, and prices. Send a request or accept an offer." />
                        <StepCard icon="🔒" title="3. Pay Securely" description="Your payment is held safely in our escrow system. We don't release it until you confirm the job is complete." />
                        <StepCard icon="⭐" title="4. Rate & Review" description="Job done? Mark it as complete to release the payment and leave a review to help our community grow." />
                    </div>
                </div>
            </section>
            
            <section ref={providerRef} className="animate-reveal py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                     <h2 className="text-4xl font-bold font-display text-center mb-16 text-text-primary">For Service Providers</h2>
                     <div className="grid md:grid-cols-4 gap-10 text-center max-w-6xl mx-auto">
                        <StepCard icon="📝" title="1. Create Your Profile" description="Complete our guided onboarding, select your services, set your prices, and upload verification documents." />
                        <StepCard icon="⏳" title="2. Get Approved" description="Our admin team manually reviews and approves every new provider to ensure quality and safety for everyone." />
                        <StepCard icon="💼" title="3. Get Job Requests" description="Receive requests from customers. Chat directly, send counter-offers, and confirm bookings that fit your schedule." />
                        <StepCard icon="💸" title="4. Get Paid" description="Once the job is marked complete, your earnings are released from escrow and sent directly to your account. Simple and secure." />
                    </div>
                </div>
            </section>
            
            <section ref={differenceRef} className="animate-reveal py-20 bg-surface-soft dark:bg-dark-surface/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold font-display text-center mb-16 text-text-primary">The Urban Prime Difference</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        <DifferenceCard icon="🛡️" title="Admin-Vetted Quality" description="We don't just let anyone on our platform. Every service provider goes through a manual verification and approval process by our admin team to maintain a high standard of quality and trust." />
                        <DifferenceCard icon="🔒" title="Secure Escrow System" description="Forget payment disputes. Customer payments are held securely in escrow and are only released to the provider after the customer confirms that the service has been completed to their satisfaction." />
                        <DifferenceCard icon="🆔" title="Identity Verification" description="Trust is paramount. We implement a robust identity verification system for our service providers, ensuring that you know who you are hiring. This adds a crucial layer of security for everyone." />
                        <DifferenceCard icon="📈" title="Enterprise-Level Oversight" description="Our platform is managed by a dedicated admin team with powerful tools to monitor bookings, handle disputes, manage categories, and enforce quality standards, ensuring a safe and premium marketplace." />
                    </div>
                </div>
            </section>
        </div>
    );
};

const StepCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex flex-col items-center">
        <IconBadge icon={icon} size="lg" className="mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
    </div>
);

const DifferenceCard: React.FC<{ icon: string; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="bg-surface dark:bg-dark-surface/80 p-6 rounded-xl shadow-soft border border-border">
        <IconBadge icon={icon} size="md" className="mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
    </div>
);

export default HowItWorksPage;
