
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { itemService, userService } from '../../services/itemService';
import type { PaymentMethod, Address } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import { useNotification } from '../../context/NotificationContext';
import OrderSummaryCard from '../../components/OrderSummaryCard';
import AddressesModal from '../../components/modals/AddressesModal';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

const CheckoutPage: React.FC = () => {
    const { cartItems, cartGroups, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    const [isLoading, setIsLoading] = useState(false);
    
    // Address State
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    // Shipping State (GroupId -> 'standard' | 'express')
    const [deliveryMethods, setDeliveryMethods] = useState<Record<string, 'standard' | 'express'>>({});
    
    // Payment State
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
    const [isAddingCard, setIsAddingCard] = useState(false);
    
    // Form for new card
    const [newCard, setNewCard] = useState({ number: '', expiry: '', cvc: '', name: '' });

    const getGroupEstimate = (groupId: string) => {
        const group = cartGroups.find(g => g.id === groupId);
        if (!group) return '3-5 business days';
        const estimates = group.items
            .map(item => item.shippingEstimates?.[0] || item.supplierInfo?.shippingProfile?.fastestEstimate)
            .filter(Boolean) as { minDays: number; maxDays: number }[];
        if (estimates.length === 0) return '3-5 business days';
        const min = Math.min(...estimates.map(e => e.minDays));
        const max = Math.max(...estimates.map(e => e.maxDays));
        return `${min}-${max} business days`;
    };

    useEffect(() => {
        if (user) {
            // Set default address
            if (user.addresses && user.addresses.length > 0) {
                setSelectedAddress(user.addresses[0]);
            }
            // Fetch Payment Methods
            userService.getPaymentMethods(user.id).then(methods => {
                setSavedMethods(methods);
                if (methods.length > 0) {
                    setPaymentMethodId(methods.find(m => m.isDefault)?.id || methods[0].id);
                } else {
                    setIsAddingCard(true); // Auto open new card if none saved
                }
            });
            // Initialize delivery methods
            const initialMethods: Record<string, 'standard' | 'express'> = {};
            cartGroups.forEach(g => initialMethods[g.id] = 'standard');
            setDeliveryMethods(initialMethods);
        } else {
             // Redirect guest to login (usually handled by ProtectedRoute but extra safety)
             navigate('/auth', { state: { from: '/checkout' } });
        }
    }, [user, cartGroups, navigate]);

    // Calculate total shipping
    const shippingTotal = useMemo(() => {
        let total = 0;
        cartGroups.forEach(group => {
            const method = deliveryMethods[group.id] || 'standard';
            // Mock costs: Standard = $5.99, Express = $14.99
            total += method === 'standard' ? 5.99 : 14.99;
        });
        return total;
    }, [cartGroups, deliveryMethods]);

    const handlePlaceOrder = async () => {
        if (!user || !selectedAddress) {
            showNotification("Please select a shipping address.");
            return;
        }
        if (!paymentMethodId && !isAddingCard) {
             showNotification("Please select a payment method.");
             return;
        }

        setIsLoading(true);
        try {
            // 1. If adding new card, simulate saving it first (mock)
            let finalPaymentMethodId = paymentMethodId;
            if (isAddingCard) {
                 const mockNewMethod: PaymentMethod = {
                     id: `pm_${Date.now()}`,
                     type: 'card',
                     label: `Card ending in ${newCard.number.slice(-4)}`,
                     details: { brand: 'Visa', last4: newCard.number.slice(-4) },
                     isDefault: true
                 };
                 await userService.addPaymentMethod(user.id, mockNewMethod);
                 finalPaymentMethodId = mockNewMethod.id;
            }

            // 2. Create Order
            const orderId = await itemService.createOrder(
                user.id,
                cartItems,
                selectedAddress,
                finalPaymentMethodId
            );

            // 3. Clear Cart & Navigate
            clearCart();
            navigate('/order-confirmation', { state: { orderId } });

        } catch (error) {
            console.error("Checkout failed:", error);
            showNotification("Order processing failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background min-h-screen pb-20">
            {isAddressModalOpen && <AddressesModal onClose={() => setIsAddressModalOpen(false)} />}
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-6 flex items-center gap-4">
                    <BackButton to="/cart" alwaysShowText />
                    <h1 className="text-3xl font-bold font-display text-text-primary">Checkout</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* LEFT COLUMN: Checkout Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border flex items-center gap-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <CheckIcon />
                            </div>
                            <div>
                                <p className="font-bold text-text-primary">Buyer Protection Included</p>
                                <p className="text-sm text-text-secondary">Secure payment, verified sellers, and dispute support for every order.</p>
                            </div>
                        </div>
                        
                        {/* 1. Shipping Address */}
                        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    <MapPinIcon /> Shipping Address
                                </h2>
                                <button onClick={() => setIsAddressModalOpen(true)} className="text-primary text-sm font-bold hover:underline">Change</button>
                            </div>
                            
                            {selectedAddress ? (
                                <div className="p-4 bg-surface-soft rounded-lg border border-border">
                                    <p className="font-bold text-text-primary">{selectedAddress.name}</p>
                                    <p className="text-text-secondary">{selectedAddress.addressLine1}</p>
                                    <p className="text-text-secondary">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}</p>
                                    <p className="text-text-secondary">{selectedAddress.country}</p>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddressModalOpen(true)} className="w-full py-6 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-primary hover:text-primary transition-colors flex flex-col items-center gap-2">
                                    <PlusIcon />
                                    <span className="font-bold">Add Address</span>
                                </button>
                            )}
                        </div>

                        {/* 2. Delivery Method (Per Seller) */}
                        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                             <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                                <TruckIcon /> Delivery Method
                            </h2>
                            <div className="space-y-6">
                                {cartGroups.map(group => (
                                    <div key={group.id} className="border-b border-border last:border-0 pb-6 last:pb-0">
                                        <h3 className="font-bold text-sm text-text-secondary uppercase tracking-wider mb-3">Item(s) from {group.name}</h3>
                                        <p className="text-xs text-text-secondary mb-3">Estimated delivery: {getGroupEstimate(group.id)}</p>
                                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                            {group.items.map(item => (
                                                <div key={item.id} className="flex items-center gap-3">
                                                     <img src={item.imageUrls[0]} alt={item.title} className="w-12 h-12 rounded-md object-cover border border-border" />
                                                     <div className="text-xs">
                                                         <p className="font-semibold text-text-primary line-clamp-1">{item.title}</p>
                                                         <p className="text-text-secondary">Qty: {item.quantity}</p>
                                                         {item.returnPolicy?.windowDays && (
                                                             <p className="text-text-secondary">Returns: {item.returnPolicy.windowDays} days</p>
                                                         )}
                                                     </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <label className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${deliveryMethods[group.id] === 'standard' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-gray-400'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name={`delivery-${group.id}`} checked={deliveryMethods[group.id] === 'standard'} onChange={() => setDeliveryMethods(p => ({...p, [group.id]: 'standard'}))} className="text-primary focus:ring-primary" />
                                                    <div>
                                                        <p className="font-bold text-text-primary text-sm">Standard Shipping</p>
                                                        <p className="text-xs text-text-secondary">3-5 Business Days</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-text-primary">$5.99</span>
                                            </label>
                                            <label className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${deliveryMethods[group.id] === 'express' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-gray-400'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name={`delivery-${group.id}`} checked={deliveryMethods[group.id] === 'express'} onChange={() => setDeliveryMethods(p => ({...p, [group.id]: 'express'}))} className="text-primary focus:ring-primary" />
                                                    <div>
                                                        <p className="font-bold text-text-primary text-sm">Express Shipping</p>
                                                        <p className="text-xs text-text-secondary">1-2 Business Days</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-text-primary">$14.99</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Payment */}
                        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                            <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                                <CardIcon /> Payment
                            </h2>
                            
                            {!isAddingCard && savedMethods.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    {savedMethods.map(method => (
                                        <label key={method.id} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${paymentMethodId === method.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-surface-soft hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="radio" 
                                                    name="paymentMethod" 
                                                    checked={paymentMethodId === method.id} 
                                                    onChange={() => setPaymentMethodId(method.id)} 
                                                    className="w-5 h-5 text-primary focus:ring-primary"
                                                />
                                                <div>
                                                    <p className="font-bold text-text-primary">{method.label}</p>
                                                    <p className="text-xs text-text-secondary capitalize">{method.type}</p>
                                                </div>
                                            </div>
                                            {method.isDefault && <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Default</span>}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {isAddingCard ? (
                                <div className="space-y-4 bg-surface-soft p-4 rounded-xl border border-border animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-text-primary">Add New Card</h3>
                                        <button onClick={() => setIsAddingCard(false)} className="text-xs text-red-500 font-bold hover:underline">Cancel</button>
                                    </div>
                                    <input placeholder="Name on Card" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                    <input placeholder="Card Number" value={newCard.number} onChange={e => setNewCard({...newCard, number: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input placeholder="MM/YY" value={newCard.expiry} onChange={e => setNewCard({...newCard, expiry: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                        <input placeholder="CVC" value={newCard.cvc} onChange={e => setNewCard({...newCard, cvc: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => { setIsAddingCard(true); setPaymentMethodId(''); }} className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-secondary font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                                    <PlusIcon /> Add New Payment Method
                                </button>
                            )}
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Order Summary */}
                    <div className="lg:col-span-1">
                        <OrderSummaryCard 
                            isCheckout={true} 
                            onCheckout={handlePlaceOrder} 
                            isLoading={isLoading} 
                            shippingTotal={shippingTotal}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
