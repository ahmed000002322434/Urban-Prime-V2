import React from 'react';

const TermsOfUsePage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-dark-text font-display">Terms of Use</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last Updated: October 26, 2023</p>
                </header>
                <div className="max-w-3xl mx-auto prose dark:prose-invert">
                    <p>
                        Welcome to Urban Prime! These Terms of Use ("Terms") govern your access to and use of our website, applications, and services (collectively, the "Services"). Please read these Terms carefully.
                    </p>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use our Services.
                    </p>
                    <h2>2. User Conduct</h2>
                    <p>
                        You agree not to use the Services for any unlawful purpose or in any way that could harm, disable, overburden, or impair any of our servers. You agree not to misrepresent your identity or provide false information in your profile or listings.
                    </p>
                    <h2>3. Listings and Transactions</h2>
                    <p>
                        As a seller, you are responsible for the accuracy and content of your listings. All transactions are between the buyer and the seller. While Urban Prime provides the platform and certain protections, we are not a party to the transaction itself.
                    </p>
                    <h2>4. Disclaimers</h2>
                    <p>
                        The Services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Services will be uninterrupted, error-free, or secure.
                    </p>
                    <h2>5. Limitation of Liability</h2>
                    <p>
                        To the fullest extent permitted by applicable law, Urban Prime shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfUsePage;
