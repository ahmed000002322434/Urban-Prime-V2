
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ProviderOnboardingModal from '../../components/ProviderOnboardingModal';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import BackButton from '../../components/BackButton';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

const BecomeProviderPage: React.FC = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const heroRef = useScrollReveal<HTMLDivElement>();
    const benefitsRef = useScrollReveal<HTMLDivElement>();

    return (
        <div className="min-h-screen bg-white dark:bg-dark-background animate-fade-in-up">
            {isModalOpen && <ProviderOnboardingModal onClose={() => setIsModalOpen(false)} />}
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <BackButton to="/profile" className="mb-8" />
                
                <section ref={heroRef} className="animate-reveal text-center py-16 max-w-4xl mx-auto">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm">Urban Prime Pros</span>
                    <h1 className="text-5xl md:text-7xl font-black font-display text-gray-900 dark:text-white mt-4 mb-8">
                        Turn Your Skills Into Income
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-10">
                        Join our exclusive network of vetted service providers. Whether you're an electrician, personal trainer, or chef, connect with premium clients instantly.
                    </p>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black font-bold text-lg rounded-full hover:scale-105 transition-transform shadow-xl"
                    >
                        Apply Now
                    </button>
                </section>

                <section ref={benefitsRef} className="animate-reveal py-16 grid md:grid-cols-3 gap-8">
                    <div className="p-8 bg-gray-50 dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
                            <CheckIcon />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">0% Lead Fees</h3>
                        <p className="text-gray-600 dark:text-gray-400">Unlike other platforms, we don't charge you for leads. You only pay a small commission when you get paid.</p>
                    </div>
                    <div className="p-8 bg-gray-50 dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Secure Payments</h3>
                        <p className="text-gray-600 dark:text-gray-400">Payments are held in escrow and released to you immediately upon job completion. No more chasing invoices.</p>
                    </div>
                    <div className="p-8 bg-gray-50 dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Verified Badge</h3>
                        <p className="text-gray-600 dark:text-gray-400">Stand out with a "Verified Pro" badge. We handle the ID checks so clients trust you instantly.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default BecomeProviderPage;

