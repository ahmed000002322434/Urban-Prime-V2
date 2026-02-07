import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Link } from 'react-router-dom';
import IconBadge from '../../components/IconBadge';

const ProtectionStep: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; delay?: number }> = ({ icon, title, children, delay = 0 }) => {
    const stepRef = useScrollReveal<HTMLDivElement>();
    return (
        <div ref={stepRef} className="animate-reveal" style={{ transitionDelay: `${delay}ms` }}>
            <IconBadge icon={icon} size="lg" className="mb-4 border-primary/10 bg-primary/10 text-primary" />
            <h3 className="text-xl font-bold font-display text-gray-900 dark:text-dark-text mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{children}</p>
        </div>
    );
};

const PurchaseProtectionPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const stepsRef = useScrollReveal<HTMLDivElement>();

    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal bg-gray-50 dark:bg-dark-surface">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                        Urban Prime Purchase Protection
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Shop and rent with confidence. We've got your back on all eligible purchases.
                    </p>
                </div>
            </section>

            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="max-w-3xl mx-auto prose dark:prose-invert">
                    <h2 className="text-center">What's Covered</h2>
                    <p>
                        Urban Prime Purchase Protection means you can request a full refund if one of the following issues occurs:
                    </p>
                    <ul>
                        <li><strong>Item Not Delivered:</strong> You made a purchase, but the item never arrived.</li>
                        <li><strong>Not as Described:</strong> The item you received is significantly different from the seller's photos or description. This includes wrong items, incorrect sizes, or undisclosed damage.</li>
                        <li><strong>Item Arrived Damaged:</strong> The item was damaged in transit.</li>
                    </ul>
                    <p>
                        Our protection program covers the full cost of the item and shipping fees for all eligible transactions made through our secure checkout system.
                    </p>
                </div>
            </section>

            <section ref={stepsRef} className="animate-reveal bg-gray-50 dark:bg-dark-surface py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold font-display text-center mb-12 dark:text-dark-text">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
                        <ProtectionStep icon="💬" title="1. Contact the Seller">
                            First, try to resolve the issue directly with the seller through our messaging system. Most issues can be resolved this way.
                        </ProtectionStep>
                        <ProtectionStep icon="📝" title="2. Open a Case" delay={100}>
                            If you can't reach a resolution, open a case from your order details page within 30 days of delivery.
                        </ProtectionStep>
                        <ProtectionStep icon="✅" title="3. We'll Step In" delay={200}>
                            Our support team will review the case. If your claim is valid, we'll issue a full refund to your original payment method.
                        </ProtectionStep>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PurchaseProtectionPage;
