
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { DiscountCode } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import BackButton from '../../components/BackButton';

const CouponIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-700"><path d="M14 8v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a2 2 0 1 0-4 0v1.83c0 .54-.23.95-.5.95s-.5-.41-.5-.95V8a4 4 0 1 1 8 0Z"/><path d="M2 16.22V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.78c0-1.07-1.28-1.74-2.22-1.21-.52.29-1.04.53-1.58.7-1.12.35-2.28 0-3.2-1a4 4 0 0 0-4 0c-.92 1-2.08 1.35-3.2 1-.54-.17-1.06-.4-1.58-.7C3.28 14.48 2 15.15 2 16.22Z"/></svg>;

const CouponsPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [coupons, setCoupons] = useState<DiscountCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCoupons = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // This fetches all codes, in a real app it would be user-specific
                const allCoupons = await listerService.getDiscountCodes(user.id);
                setCoupons(allCoupons.filter(c => c.isActive));
            } catch (error) {
                console.error("Failed to fetch coupons:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCoupons();
    }, [user]);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        showNotification(`Coupon code "${code}" copied!`);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold font-display text-text-primary">My Coupons & Offers</h1>
            </div>
            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                {isLoading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : coupons.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="bg-surface-soft p-4 rounded-lg border-l-4 border-primary flex justify-between items-center">
                                <div>
                                    <p className="font-mono text-lg font-bold text-text-primary">{coupon.code}</p>
                                    <p className="text-sm text-text-secondary">{coupon.percentage}% off your next order</p>
                                </div>
                                <button onClick={() => handleCopyCode(coupon.code)} className="px-4 py-2 text-sm bg-primary text-white font-semibold rounded-md hover:opacity-90">
                                    Copy
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <CouponIcon />
                        <h2 className="font-bold text-xl mt-4 text-text-primary">No Coupons Available</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Check back later for special offers and discounts.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CouponsPage;
