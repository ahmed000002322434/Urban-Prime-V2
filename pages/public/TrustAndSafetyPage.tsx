
import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Link } from 'react-router-dom';

const TrustPoint: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex gap-4 items-start">
        <div className="text-3xl flex-shrink-0 bg-primary/10 p-3 rounded-lg">{icon}</div>
        <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
    </div>
);

const TrustAndSafetyPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const contentRef = useScrollReveal<HTMLDivElement>();

    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                    Built on Trust
                </h1>
                <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Urban Prime is designed to keep you safe at every step of the journey. From verified identities to secure payments, your peace of mind is our product.
                </p>
            </section>

            <section ref={contentRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    <TrustPoint 
                        icon="🆔" 
                        title="Identity Verification" 
                        description="We use advanced technology to verify the identities of our users. When you see a 'Verified' badge, you know you're dealing with a real person who has submitted government-issued ID." 
                    />
                    <TrustPoint 
                        icon="💸" 
                        title="Payment Protection" 
                        description="Payments are held in a secure escrow account and are not released to the seller or provider until the service is complete or the item is received as described." 
                    />
                    <TrustPoint 
                        icon="🛡️" 
                        title="$50,000 Guarantee" 
                        description="Eligible rentals are protected by our Urban Prime Guarantee, covering damage or theft up to $50,000, so owners can lend with confidence." 
                    />
                    <TrustPoint 
                        icon="⭐" 
                        title="Community Reviews" 
                        description="Our transparent review system ensures accountability. Both buyers and sellers rate each other after every transaction, building a reputation you can trust." 
                    />
                    <TrustPoint 
                        icon="🔐" 
                        title="Data Privacy" 
                        description="We use bank-level encryption to protect your personal and financial data. We never sell your data to third parties." 
                    />
                    <TrustPoint 
                        icon="🤖" 
                        title="AI Fraud Detection" 
                        description="Our proprietary AI monitors transactions 24/7 for suspicious activity, blocking fraud before it happens." 
                    />
                </div>

                <div className="mt-20 text-center bg-gray-50 dark:bg-dark-surface p-12 rounded-2xl">
                    <h2 className="text-3xl font-bold mb-4 font-display dark:text-dark-text">Need Help?</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Our support team is available 24/7 to assist with any safety concerns.</p>
                    <Link to="/support-center" className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90">Visit Safety Center</Link>
                </div>
            </section>
        </div>
    );
};

export default TrustAndSafetyPage;
