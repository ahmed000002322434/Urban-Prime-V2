
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9 12l2 2 4-4"></path>
    </svg>
);

const OrderConfirmationPage: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const orderId = location.state?.orderId || "UP-000000";

    // Estimated delivery date (5 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);

    useEffect(() => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = window.setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-background min-h-screen flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border p-8 text-center relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
                    className="flex justify-center mb-6"
                >
                    <CheckIcon />
                </motion.div>

                <h1 className="text-3xl font-bold font-display text-text-primary mb-2">Order Confirmed!</h1>
                <p className="text-text-secondary mb-8">Thank you, {user?.name?.split(' ')[0]}. Your order has been placed successfully.</p>

                <div className="bg-surface-soft p-6 rounded-xl border border-border mb-8">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                        <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Order ID</span>
                        <span className="text-xl font-mono font-bold text-primary">{orderId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Est. Delivery</span>
                        <span className="font-bold text-text-primary">{deliveryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
                
                <p className="text-sm text-text-secondary mb-8">
                    We've sent a confirmation email to <span className="font-semibold text-text-primary">{user?.email}</span> with your order details and receipt.
                </p>

                <div className="flex flex-col gap-4">
                    <Link to="/profile/orders" className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95">
                        View My Orders
                    </Link>
                    <Link to="/browse" className="w-full py-4 bg-transparent border-2 border-border text-text-primary font-bold rounded-xl hover:bg-surface-soft transition-all">
                        Continue Shopping
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default OrderConfirmationPage;
