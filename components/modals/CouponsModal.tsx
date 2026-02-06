import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { DiscountCode } from '../../types';
import Spinner from '../Spinner';
import { useNotification } from '../../context/NotificationContext';
import { Link } from 'react-router-dom';

const CouponsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [coupons, setCoupons] = useState<DiscountCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            listerService.getDiscountCodes(user.id)
                .then(allCoupons => setCoupons(allCoupons.filter(c => c.isActive)))
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        showNotification(`Coupon code "${code}" copied!`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">My Coupons</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : coupons.length > 0 ? (
                        <div className="space-y-3">
                            {coupons.map(coupon => (
                                <div key={coupon.id} className="p-3 bg-gray-50 dark:bg-dark-background rounded-lg border-l-4 border-primary flex justify-between items-center">
                                    <div>
                                        <p className="font-mono text-base font-bold text-light-text dark:text-dark-text">{coupon.code}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{coupon.percentage}% off</p>
                                    </div>
                                    <button onClick={() => handleCopyCode(coupon.code)} className="px-3 py-1 text-xs bg-primary text-white font-semibold rounded-md">Copy</button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-gray-500 py-10">No active coupons found.</p>}
                </main>
                <footer className="p-4 bg-gray-50 dark:bg-dark-surface/50 border-t dark:border-gray-700 text-center">
                    <Link to="/profile/coupons" onClick={onClose} className="text-sm font-semibold text-primary hover:underline">Manage All Coupons</Link>
                </footer>
            </div>
        </div>
    );
};

export default CouponsModal;
