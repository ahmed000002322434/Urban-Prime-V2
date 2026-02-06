

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const BecomeASellerPage: React.FC = () => {
    const { openOnboarding } = useAuth();

    useEffect(() => {
        openOnboarding('list', '/profile/become-a-provider');
    }, [openOnboarding]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
            <h1 className="text-2xl font-bold">Seller Onboarding</h1>
            <p className="text-gray-500 max-w-md">
                We will guide you through a quick setup so you can start listing and earning.
            </p>
            <Link to="/profile/become-a-provider" className="px-6 py-3 rounded-full bg-black text-white font-semibold">
                Continue to Seller Setup
            </Link>
        </div>
    );
};

export default BecomeASellerPage;
