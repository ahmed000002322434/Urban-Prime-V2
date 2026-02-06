import React from 'react';

const ReturnPolicyPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-dark-text font-display">Return Policy</h1>
                </header>
                <div className="max-w-3xl mx-auto prose dark:prose-invert">
                    <p>
                        Our policy lasts 30 days. If 30 days have gone by since your purchase, unfortunately, we can’t offer you a refund or exchange.
                    </p>
                    <h2>Eligibility</h2>
                    <p>
                        To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging.
                    </p>
                    <h2>Refunds (if applicable)</h2>
                    <p>
                        Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund. If you are approved, then your refund will be processed, and a credit will automatically be applied to your original method of payment, within a certain amount of days.
                    </p>
                    <h2>Exchanges (if applicable)</h2>
                    <p>
                        We only replace items if they are defective or damaged. If you need to exchange it for the same item, send us an email at support@urbanprime.com.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReturnPolicyPage;
