
import React from 'react';
import { Link } from 'react-router-dom';

const ContactPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-background min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-dark-surface rounded-2xl p-10 shadow-soft border border-gray-200 dark:border-gray-700 text-center">
                    <h1 className="text-4xl font-extrabold font-display text-gray-900 dark:text-dark-text mb-6">Contact Us</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                        We'd love to hear from you. For the fastest response, please use our Support Center or the live chat feature.
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-8 mb-10">
                        <div className="p-6 bg-white dark:bg-dark-background rounded-xl border dark:border-gray-600">
                            <h3 className="font-bold text-lg mb-2 dark:text-white">Support</h3>
                            <p className="text-sm text-gray-500 mb-4">For account, order, and platform issues.</p>
                            <Link to="/support-center" className="text-primary font-semibold hover:underline">Open Ticket</Link>
                        </div>
                        <div className="p-6 bg-white dark:bg-dark-background rounded-xl border dark:border-gray-600">
                            <h3 className="font-bold text-lg mb-2 dark:text-white">Press</h3>
                            <p className="text-sm text-gray-500 mb-4">For media inquiries and PR.</p>
                            <a href="mailto:press@urbanprime.com" className="text-primary font-semibold hover:underline">press@urbanprime.com</a>
                        </div>
                        <div className="p-6 bg-white dark:bg-dark-background rounded-xl border dark:border-gray-600">
                            <h3 className="font-bold text-lg mb-2 dark:text-white">Partnerships</h3>
                            <p className="text-sm text-gray-500 mb-4">For business and affiliate inquiries.</p>
                            <Link to="/affiliate-program" className="text-primary font-semibold hover:underline">Partner Program</Link>
                        </div>
                    </div>

                    <div className="text-sm text-gray-400">
                        <p>Urban Prime HQ</p>
                        <p>123 Innovation Drive, San Francisco, CA 94105</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
