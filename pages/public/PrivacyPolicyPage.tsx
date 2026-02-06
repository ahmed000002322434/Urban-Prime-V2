import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-dark-text font-display">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last Updated: October 26, 2023</p>
                </header>
                <div className="max-w-3xl mx-auto prose dark:prose-invert">
                    <p>
                        This Privacy Policy describes how Urban Prime ("we", "us", or "our") collects, uses, and discloses your personal information when you use our website and services.
                    </p>
                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, list an item, make a purchase, or communicate with us. This may include:
                    </p>
                    <ul>
                        <li>Contact information, such as your name, email address, phone number, and shipping address.</li>
                        <li>Account information, such as your username and password.</li>
                        <li>Transaction information, including details about the products you buy, sell, or rent.</li>
                        <li>Communications between you and other users, and between you and Urban Prime.</li>
                    </ul>
                    <h2>2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to:
                    </p>
                    <ul>
                        <li>Provide, maintain, and improve our services.</li>
                        <li>Process transactions and send you related information, including confirmations and receipts.</li>
                        <li>Communicate with you about products, services, offers, and events.</li>
                        <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
                        <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
                    </ul>
                    <h2>3. Data Security</h2>
                    <p>
                        We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
                    </p>
                    <h2>4. Your Choices</h2>
                    <p>
                        You may update, correct, or delete your account information at any time by logging into your account settings. If you wish to delete your account, please contact us, but note that we may retain certain information as required by law or for legitimate business purposes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
