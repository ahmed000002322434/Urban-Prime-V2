import React from 'react';

const ShippingPolicyPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-background animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-dark-text font-display">Shipping Policy</h1>
                </header>
                <div className="max-w-3xl mx-auto prose dark:prose-invert">
                    <h2>Processing Time</h2>
                    <p>
                        All orders are processed within 1-2 business days. Orders are not shipped or delivered on weekends or holidays. If we are experiencing a high volume of orders, shipments may be delayed by a few days. Please allow additional days in transit for delivery.
                    </p>
                    <h2>Shipping Rates & Delivery Estimates</h2>
                    <p>
                        Shipping charges for your order will be calculated and displayed at checkout. Delivery estimates will be provided once your order is placed.
                    </p>
                    <ul>
                        <li><strong>Standard Shipping:</strong> 3-5 business days</li>
                        <li><strong>Expedited Shipping:</strong> 1-2 business days</li>
                    </ul>
                    <h2>Shipment Confirmation & Order Tracking</h2>
                    <p>
                        You will receive a Shipment Confirmation email once your order has shipped containing your tracking number(s). The tracking number will be active within 24 hours.
                    </p>
                    <h2>Damages</h2>
                    <p>
                        Urban Prime is not liable for any products damaged or lost during shipping. If you received your order damaged, please contact the shipment carrier to file a claim.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShippingPolicyPage;
