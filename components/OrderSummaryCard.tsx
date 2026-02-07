
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useTranslation } from '../hooks/useTranslation';
import Spinner from './Spinner';

const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>;

interface OrderSummaryCardProps {
    isCheckout?: boolean;
    onCheckout?: () => void;
    isLoading?: boolean;
    shippingTotal?: number;
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ isCheckout = false, onCheckout, isLoading = false, shippingTotal = 0 }) => {
    const { cartTotal, cartItems, cartGroups, applyCoupon, couponCode, discountAmount } = useCart();
    const { currency } = useTranslation();
    const navigate = useNavigate();
    const [promoInput, setPromoInput] = useState('');

    // Calculations
    const finalShipping = isCheckout ? shippingTotal : cartGroups.length * 5.99; 
    const taxEstimate = (cartTotal - discountAmount) * 0.08; // Mock: 8% tax
    
    // Calculate Security Deposit Total
    const totalDeposit = cartItems.reduce((sum, item) => {
        if (item.listingType === 'rent' && item.securityDeposit) {
            return sum + (item.securityDeposit * item.quantity);
        }
        return sum;
    }, 0);

    const grandTotal = cartTotal + finalShipping + taxEstimate - discountAmount + totalDeposit;
    const hasOutOfStock = cartItems.some(item => item.stock <= 0);

    const handleApplyPromo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoInput.trim()) return;
        if (applyCoupon(promoInput)) {
            setPromoInput('');
        }
    };

    const handleAction = () => {
        if (isCheckout && onCheckout) {
            onCheckout();
        } else {
            navigate('/checkout');
        }
    };

    return (
        <div className="bg-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-soft border border-border sticky top-24 animate-fade-in-up">
            <h2 className="text-xl font-bold font-display text-text-primary mb-6">Order Summary</h2>
            
            <div className="space-y-3 text-sm mb-6 border-b border-border pb-6">
                <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span className="font-medium text-text-primary">{currency.symbol}{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                    <span>Shipping {isCheckout ? '' : 'Estimate'}</span>
                    <span className="font-medium text-text-primary">{currency.symbol}{finalShipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                    <span>Tax Estimate</span>
                    <span className="font-medium text-text-primary">{currency.symbol}{taxEstimate.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                        <span className="flex items-center gap-1"><TagIcon /> Discount ({couponCode})</span>
                        <span>-{currency.symbol}{discountAmount.toFixed(2)}</span>
                    </div>
                )}
                
                {totalDeposit > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between text-blue-800 dark:text-blue-300 font-bold mb-1">
                            <span className="flex items-center gap-1"><ShieldCheckIcon /> Security Deposit</span>
                            <span>{currency.symbol}{totalDeposit.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Refundable upon safe return.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mb-6">
                <span className="text-lg font-bold text-text-primary">Total {totalDeposit > 0 ? 'Auth' : ''}</span>
                <span className="text-2xl font-black text-primary">{currency.symbol}{grandTotal.toFixed(2)}</span>
            </div>

            {!isCheckout && (
                <form onSubmit={handleApplyPromo} className="mb-6 relative">
                    <input 
                        type="text" 
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Enter promo code" 
                        className="w-full pl-4 pr-20 py-3 bg-surface-soft border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none uppercase"
                    />
                    <button 
                        type="submit"
                        disabled={!promoInput}
                        className="absolute right-2 top-2 bottom-2 px-3 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Apply
                    </button>
                </form>
            )}

            <button 
                onClick={handleAction}
                disabled={cartItems.length === 0 || hasOutOfStock || isLoading}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95 flex items-center justify-center gap-2"
            >
                {isLoading && <Spinner size="sm" className="text-white" />}
                {hasOutOfStock ? 'Remove Out of Stock Items' : isCheckout ? 'Place Order & Pay' : 'Proceed to Checkout'}
            </button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-secondary">
                <LockIcon />
                <span>Secure Checkout with 256-bit Encryption</span>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-border bg-surface-soft/60 text-xs text-text-secondary space-y-2">
                <div className="flex items-center gap-2 text-text-primary font-semibold">
                    <ShieldCheckIcon />
                    Buyer Protection
                </div>
                <p>Every order includes purchase protection, verified sellers, and support if your item arrives damaged or not as described.</p>
            </div>
            
            {isCheckout && totalDeposit > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-text-secondary leading-relaxed">
                        <strong>Security Deposit Policy:</strong> The security deposit amount will be held on your card and is not charged immediately. It will be released automatically within 48 hours of the item being returned in good condition.
                    </p>
                </div>
            )}
        </div>
    );
};

export default OrderSummaryCard;

