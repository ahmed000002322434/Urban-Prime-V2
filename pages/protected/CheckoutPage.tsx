
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { itemService, userService } from '../../services/itemService';
import commerceService from '../../services/commerceService';
import type {
    PaymentMethod,
    Address,
    CartItem,
    CheckoutPaymentDetails,
    CommerceProviderSnapshot,
    RuntimeAvailabilitySnapshot
} from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import { useNotification } from '../../context/NotificationContext';
import OrderSummaryCard from '../../components/OrderSummaryCard';
import AddressesModal from '../../components/modals/AddressesModal';
import RuntimeModeNotice from '../../components/RuntimeModeNotice';
import { ensureCriticalBackendReady, getRuntimeAvailabilitySnapshot } from '../../services/runtimeService';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

const paymentRailMeta: Record<string, { label: string; detail: string; kind: 'online' | 'wallet' | 'manual' }> = {
    stripe: { label: 'Card / online', detail: 'Instant online payment and deposit capture.', kind: 'online' },
    paypal: { label: 'PayPal', detail: 'Pay using your PayPal balance or linked card.', kind: 'online' },
    razorpay: { label: 'Razorpay', detail: 'Use linked cards or supported online rails.', kind: 'online' },
    jazzcash: { label: 'JazzCash', detail: 'Use your JazzCash mobile wallet for launch payments.', kind: 'wallet' },
    bank_transfer: { label: 'Bank transfer', detail: 'Manual settlement with transfer reference review.', kind: 'manual' },
    local_bank: { label: 'Local bank deposit', detail: 'Pay from any local bank and upload the transfer reference.', kind: 'manual' }
};

const isRentMode = (item: CartItem) =>
    item.listingType === 'rent' || (item.listingType === 'both' && item.transactionMode === 'rent');

const isPickupRentalItem = (item: CartItem) => isRentMode(item) && item.deliveryMode === 'pickup';
const requiresShippingForItem = (item: CartItem) => !isPickupRentalItem(item) && item.productType !== 'digital' && item.itemType !== 'digital' && !item.digitalFileUrl;
const mapCheckoutPaymentMethod = (rail: string) => (rail === 'stripe' ? 'card' : rail);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CheckoutPage: React.FC = () => {
    const { cartItems, cartGroups, clearCart, couponCode } = useCart();
    const { user, activePersona } = useAuth();
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
    const [providerSnapshot, setProviderSnapshot] = useState<CommerceProviderSnapshot | null>(null);
    const [providerLoading, setProviderLoading] = useState(false);
    const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeAvailabilitySnapshot | null>(null);
    const [runtimeLoading, setRuntimeLoading] = useState(false);
    
    // Form for new card
    const [newCard, setNewCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
    const [paymentDetails, setPaymentDetails] = useState({ payerName: '', payerPhone: '', reference: '', notes: '' });
    const [deliveryNote, setDeliveryNote] = useState('');
    const [giftWrap, setGiftWrap] = useState(false);
    const [contactless, setContactless] = useState(false);
    const isCommerceCheckout = commerceService.enabled();
    const requiresLiveBackendForOrder = useMemo(
        () => cartItems.length > 0 && cartItems.every((item) => UUID_PATTERN.test(String(item.id || '').trim())),
        [cartItems]
    );
    const shippingGroups = useMemo(() => cartGroups.filter(group => group.items.some(requiresShippingForItem)), [cartGroups]);
    const pickupGroups = useMemo(() => cartGroups.filter(group => group.items.every(isPickupRentalItem)), [cartGroups]);
    const availablePaymentRails = useMemo(
        () => (providerSnapshot?.paymentRails?.length ? providerSnapshot.paymentRails : ['stripe', 'jazzcash', 'bank_transfer', 'local_bank']),
        [providerSnapshot]
    );
    const selectedPaymentRail = paymentMethodId || availablePaymentRails[0] || '';
    const selectedRailKind = paymentRailMeta[selectedPaymentRail]?.kind || 'online';
    const isCardRail = selectedPaymentRail === 'stripe';
    const isAddressReady = shippingGroups.length === 0 || !!selectedAddress;
    const isPaymentReady = isCommerceCheckout
        ? !!selectedPaymentRail && (
            isCardRail
                ? !!newCard.number && !!newCard.expiry && !!newCard.cvc && !!newCard.name
                : selectedRailKind === 'wallet'
                    ? !!paymentDetails.payerPhone
                    : selectedRailKind === 'manual'
                        ? !!paymentDetails.payerName && !!paymentDetails.reference
                        : true
        )
        : (!!paymentMethodId || (isAddingCard && !!newCard.number && !!newCard.expiry && !!newCard.cvc && !!newCard.name));
    const isReviewReady = isAddressReady && isPaymentReady;
    const isBackendBlocked = requiresLiveBackendForOrder && runtimeSnapshot !== null && !runtimeSnapshot.backendAvailable;

    const getItemImage = (item: any) => {
        if (item.podSelection?.mockupImageUrl) return item.podSelection.mockupImageUrl;
        if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls[0];
        if (item.images && item.images.length > 0) return item.images[0];
        return `https://picsum.photos/seed/${item.id}/200/200`;
    };

    const getPodSelectionLabel = (item: CartItem) =>
        [item.podSelection?.color, item.podSelection?.size].filter(Boolean).join(' / ');

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
            if (isCommerceCheckout) {
                setProviderLoading(true);
                commerceService.getProviders()
                    .then((providers) => {
                        setProviderSnapshot(providers);
                        const preferredRail = providers.paymentRails?.[0] || 'stripe';
                        setPaymentMethodId(preferredRail);
                        setIsAddingCard(false);
                    })
                    .catch((error) => {
                        console.warn('Unable to load commerce provider rails:', error);
                        setProviderSnapshot(null);
                        setPaymentMethodId((current) => current || 'stripe');
                        setIsAddingCard(false);
                    })
                    .finally(() => setProviderLoading(false));
            } else {
                // Fetch Payment Methods
                userService.getPaymentMethods(user.id).then(methods => {
                    setSavedMethods(methods);
                    if (methods.length > 0) {
                        setPaymentMethodId(methods.find(m => m.isDefault)?.id || methods[0].id);
                    } else {
                        setIsAddingCard(true); // Auto open new card if none saved
                    }
                });
            }
            // Initialize delivery methods
            const initialMethods: Record<string, 'standard' | 'express'> = {};
            shippingGroups.forEach(g => initialMethods[g.id] = 'standard');
            setDeliveryMethods(initialMethods);
        } else {
             // Redirect guest to login (usually handled by ProtectedRoute but extra safety)
             navigate('/auth', { state: { from: '/checkout' } });
        }
    }, [user, cartGroups, isCommerceCheckout, navigate, shippingGroups]);

    useEffect(() => {
        if (cartItems.length === 0) {
            navigate('/cart');
        }
    }, [cartItems.length, navigate]);

    useEffect(() => {
        if (!user || cartItems.length === 0) {
            setRuntimeSnapshot(null);
            return;
        }

        let cancelled = false;
        setRuntimeLoading(true);
        getRuntimeAvailabilitySnapshot({ forceRefresh: true, requiresLiveBackend: requiresLiveBackendForOrder })
            .then((snapshot) => {
                if (!cancelled) setRuntimeSnapshot(snapshot);
            })
            .catch((error) => {
                if (cancelled) return;
                console.warn('Unable to resolve runtime snapshot for checkout:', error);
                setRuntimeSnapshot(null);
            })
            .finally(() => {
                if (!cancelled) setRuntimeLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [cartItems.length, requiresLiveBackendForOrder, user]);

    // Calculate total shipping
    const shippingTotal = useMemo(() => {
        let total = 0;
        shippingGroups.forEach(group => {
            const method = deliveryMethods[group.id] || 'standard';
            // Client-side total is advisory only; the server remains authoritative.
            total += method === 'standard' ? 5.99 : 14.99;
        });
        return total;
    }, [shippingGroups, deliveryMethods]);

    const handlePlaceOrder = async () => {
        if (!user) {
            showNotification("Please sign in to continue.");
            return;
        }
        if (shippingGroups.length > 0 && !selectedAddress) {
            showNotification("Please select a shipping address.");
            return;
        }
        if (!paymentMethodId && !isAddingCard) {
             showNotification("Please select a payment method.");
             return;
        }
        if (requiresLiveBackendForOrder) {
            try {
                const snapshot = await ensureCriticalBackendReady('Checkout');
                setRuntimeSnapshot(snapshot);
            } catch (error: any) {
                setRuntimeSnapshot(await getRuntimeAvailabilitySnapshot({ forceRefresh: true, requiresLiveBackend: true }).catch(() => null));
                showNotification(error?.message || "Live checkout backend unavailable. Please try again when the backend reconnects.");
                return;
            }
        }
        const hasInvalidRentalWindow = cartItems.some((item) => {
            const isRentMode = item.listingType === 'rent' || (item.listingType === 'both' && item.transactionMode === 'rent');
            if (!isRentMode) return false;
            const start = String(item.rentalPeriod?.startDate || '').trim();
            const end = String(item.rentalPeriod?.endDate || '').trim();
            if (!start || !end) return true;
            const startMs = Date.parse(`${start}T00:00:00`);
            const endMs = Date.parse(`${end}T00:00:00`);
            return !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs;
        });
        if (hasInvalidRentalWindow) {
            showNotification("One or more rental items are missing valid rental dates. Please update dates on the item page and try again.");
            return;
        }
        const rentalItems = cartItems.filter((item) => item.listingType === 'rent' || (item.listingType === 'both' && item.transactionMode === 'rent'));
        for (const rentalItem of rentalItems) {
            const start = String(rentalItem.rentalPeriod?.startDate || '').trim();
            const end = String(rentalItem.rentalPeriod?.endDate || '').trim();
            try {
                const available = await itemService.checkAvailability(rentalItem.id, start, end);
                if (!available) {
                    showNotification(`${rentalItem.title} is no longer available for the selected dates. Please update your rental period.`);
                    return;
                }
            } catch {
                showNotification(`We could not verify rental availability for ${rentalItem.title}. Please try again.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            let finalPaymentMethodId = paymentMethodId;
            let finalPaymentDetails: CheckoutPaymentDetails | null = null;

            if (isCommerceCheckout) {
                finalPaymentMethodId = mapCheckoutPaymentMethod(selectedPaymentRail);
                finalPaymentDetails = {
                    rail: selectedPaymentRail,
                    kind: selectedRailKind,
                    payer_name: paymentDetails.payerName || user.name || selectedAddress?.name || 'Customer',
                    payer_phone: paymentDetails.payerPhone || selectedAddress?.phone || '',
                    reference: paymentDetails.reference || null,
                    notes: paymentDetails.notes || null,
                    provider_label: paymentRailMeta[selectedPaymentRail]?.label || selectedPaymentRail
                };

                if (isCardRail) {
                    finalPaymentDetails = {
                        ...finalPaymentDetails,
                        card_last4: newCard.number.slice(-4),
                        card_holder_name: newCard.name,
                        card_expiry: newCard.expiry
                    };
                }
            } else if (isAddingCard) {
                finalPaymentMethodId = paymentMethodId || 'card_entry';
                finalPaymentDetails = {
                    rail: 'legacy_card_entry',
                    kind: 'online',
                    payer_name: newCard.name || user.name || selectedAddress?.name || 'Customer',
                    card_last4: newCard.number.slice(-4),
                    card_holder_name: newCard.name,
                    card_expiry: newCard.expiry
                };
            }

            // 2. Create Order
            const orderId = await itemService.createOrder(
                user.id,
                cartItems,
                {
                    ...(selectedAddress || {}),
                    shippingTotal,
                    deliveryNote,
                    giftWrap,
                    contactless,
                    pickupOnly: shippingGroups.length === 0,
                    shippingGroups: shippingGroups.map((group) => group.id),
                    pickupGroups: pickupGroups.map((group) => group.id)
                },
                finalPaymentMethodId,
                {
                    actorPersonaId: activePersona?.id || null,
                    actorName: user.name || selectedAddress?.name || 'Customer',
                    paymentDetails: finalPaymentDetails,
                    couponCode
                }
            );

            // 3. Clear Cart & Navigate
            clearCart();
            navigate('/order-confirmation', { state: { orderId } });

        } catch (error) {
            console.error("Checkout failed:", error);
            showNotification((error as Error)?.message || "Order processing failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background min-h-screen pb-20">
            {isAddressModalOpen && <AddressesModal onClose={() => setIsAddressModalOpen(false)} />}
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                <div className="mb-6 flex items-center gap-4">
                    <BackButton to="/cart" alwaysShowText />
                    <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">Checkout</h1>
                </div>
                {runtimeLoading && requiresLiveBackendForOrder ? (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Checking live checkout availability...
                    </div>
                ) : null}
                <RuntimeModeNotice snapshot={runtimeSnapshot} title="Checkout runtime" className="mb-6" />
                <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-xs">
                    {[
                        { label: 'Address', complete: isAddressReady },
                        { label: 'Delivery', complete: cartGroups.length > 0 },
                        { label: 'Payment', complete: isPaymentReady },
                        { label: 'Review', complete: isReviewReady }
                    ].map((step, idx) => (
                        <div
                            key={step.label}
                            className={`px-3 py-2 rounded-full border uppercase tracking-[0.2em] font-semibold flex items-center gap-2 justify-center ${step.complete ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary'}`}
                        >
                            <span className="text-[10px]">{idx + 1}</span>
                            <span className="text-[10px]">{step.label}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                    {/* LEFT COLUMN: Checkout Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-soft border border-border flex items-center gap-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <CheckIcon />
                            </div>
                            <div>
                                <p className="font-bold text-text-primary">Buyer Protection Included</p>
                                <p className="text-sm text-text-secondary">Secure payment, verified sellers, and dispute support for every order.</p>
                            </div>
                        </div>
                        
                        {/* 1. Shipping Address */}
                        <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-soft border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    <MapPinIcon /> {shippingGroups.length > 0 ? 'Shipping Address' : 'Pickup / Access'}
                                </h2>
                                {shippingGroups.length > 0 ? (
                                    <button onClick={() => setIsAddressModalOpen(true)} className="text-primary text-xs sm:text-sm font-bold hover:underline">Change</button>
                                ) : null}
                            </div>
                            
                            {shippingGroups.length === 0 ? (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                    This checkout only contains pickup rentals or instant-access items. No shipping address is required.
                                </div>
                            ) : selectedAddress ? (
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
                                {shippingGroups.map(group => (
                                    <div key={group.id} className="border-b border-border pb-6">
                                        <h3 className="font-bold text-sm text-text-secondary uppercase tracking-wider mb-3">Item(s) from {group.name}</h3>
                                        <p className="text-xs text-text-secondary mb-3">Estimated delivery: {getGroupEstimate(group.id)}</p>
                                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                            {group.items.map(item => (
                                                <div key={item.id} className="flex items-center gap-3">
                                                     <img src={getItemImage(item)} alt={item.title} className="w-12 h-12 rounded-md object-cover border border-border" />
                                                     <div className="text-xs">
                                                         <p className="font-semibold text-text-primary line-clamp-1">{item.title}</p>
                                                         <p className="text-text-secondary">Qty: {item.quantity}</p>
                                                         {getPodSelectionLabel(item) ? (
                                                             <p className="text-violet-700 dark:text-violet-300">POD variant: {getPodSelectionLabel(item)}</p>
                                                         ) : null}
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
                                                        <p className="font-bold text-text-primary text-sm">Local courier</p>
                                                        <p className="text-xs text-text-secondary">3-5 business days</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-text-primary">$5.99</span>
                                            </label>
                                            <label className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${deliveryMethods[group.id] === 'express' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-gray-400'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name={`delivery-${group.id}`} checked={deliveryMethods[group.id] === 'express'} onChange={() => setDeliveryMethods(p => ({...p, [group.id]: 'express'}))} className="text-primary focus:ring-primary" />
                                                    <div>
                                                        <p className="font-bold text-text-primary text-sm">Priority dispatch</p>
                                                        <p className="text-xs text-text-secondary">1-2 business days</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-text-primary">$14.99</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                {pickupGroups.map(group => (
                                    <div key={`${group.id}-pickup`} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                        <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-900">Pickup rental</h3>
                                        <p className="mt-1 text-xs text-emerald-800">This group is configured for in-person pickup. Seller pickup instructions and codes appear after confirmation.</p>
                                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                            {group.items.map(item => (
                                                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2">
                                                    <img src={getItemImage(item)} alt={item.title} className="w-12 h-12 rounded-md object-cover border border-emerald-100" />
                                                    <div className="text-xs">
                                                        <p className="font-semibold text-emerald-950 line-clamp-1">{item.title}</p>
                                                        <p className="text-emerald-800">Qty: {item.quantity}</p>
                                                        {getPodSelectionLabel(item) ? (
                                                            <p className="text-emerald-800">POD variant: {getPodSelectionLabel(item)}</p>
                                                        ) : null}
                                                        {item.rentalPeriod?.startDate && item.rentalPeriod?.endDate ? (
                                                            <p className="text-emerald-800">
                                                                {item.rentalPeriod.startDate} to {item.rentalPeriod.endDate}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {shippingGroups.length === 0 && pickupGroups.length === 0 ? (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                        Delivery is not required for this checkout.
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* 2b. Delivery Preferences */}
                        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                            <h2 className="text-xl font-bold text-text-primary mb-4">{pickupGroups.length > 0 ? 'Delivery & Pickup Notes' : 'Delivery Preferences'}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={giftWrap} onChange={e => setGiftWrap(e.target.checked)} />
                                    <div>
                                        <p className="font-semibold text-text-primary">Gift Wrap</p>
                                        <p className="text-xs text-text-secondary">Premium wrap + note</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={contactless} onChange={e => setContactless(e.target.checked)} />
                                    <div>
                                        <p className="font-semibold text-text-primary">Contactless Delivery</p>
                                        <p className="text-xs text-text-secondary">Leave at door</p>
                                    </div>
                                </label>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-text-secondary mb-2">{pickupGroups.length > 0 ? 'Delivery / Pickup Instructions' : 'Delivery Instructions'}</label>
                                <textarea
                                    value={deliveryNote}
                                    onChange={e => setDeliveryNote(e.target.value)}
                                    placeholder={pickupGroups.length > 0 ? "Pickup contact, arrival window, gate code..." : "Gate code, concierge, preferred time..."}
                                    className="w-full p-3 border border-border rounded-lg bg-surface-soft text-text-primary"
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* 3. Payment */}
                        <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                            <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                                <CardIcon /> Payment
                            </h2>

                            {isCommerceCheckout ? (
                                <div className="space-y-5">
                                    {providerLoading ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {[0, 1, 2, 3].map((row) => (
                                                <div key={row} className="h-24 animate-pulse rounded-2xl bg-slate-200/80" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {availablePaymentRails.map((rail) => {
                                                const meta = paymentRailMeta[rail] || { label: rail, detail: 'Configured payment rail.', kind: 'online' as const };
                                                const active = selectedPaymentRail === rail;
                                                return (
                                                    <label
                                                        key={rail}
                                                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-surface-soft hover:border-gray-400'}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="radio"
                                                                name="paymentRail"
                                                                checked={active}
                                                                onChange={() => setPaymentMethodId(rail)}
                                                                className="mt-1 text-primary focus:ring-primary"
                                                            />
                                                            <div>
                                                                <p className="font-bold text-text-primary">{meta.label}</p>
                                                                <p className="mt-1 text-xs text-text-secondary">{meta.detail}</p>
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {providerSnapshot ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                                            Available rails are loaded from the commerce backend. Final collection, deposit handling, and settlement checks are still validated server-side.
                                        </div>
                                    ) : null}

                                    {isCardRail ? (
                                        <div className="space-y-4 rounded-xl border border-border bg-surface-soft p-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-text-primary">Card details</h3>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Server validated</span>
                                            </div>
                                            <input placeholder="Name on Card" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                            <input placeholder="Card Number" value={newCard.number} onChange={e => setNewCard({...newCard, number: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="MM/YY" value={newCard.expiry} onChange={e => setNewCard({...newCard, expiry: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                                <input placeholder="CVC" value={newCard.cvc} onChange={e => setNewCard({...newCard, cvc: e.target.value})} className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary" />
                                            </div>
                                        </div>
                                    ) : null}

                                    {selectedRailKind === 'wallet' ? (
                                        <div className="space-y-4 rounded-xl border border-border bg-surface-soft p-4">
                                            <h3 className="font-bold text-text-primary">Wallet confirmation</h3>
                                            <input
                                                placeholder="JazzCash mobile number"
                                                value={paymentDetails.payerPhone}
                                                onChange={(e) => setPaymentDetails((prev) => ({ ...prev, payerPhone: e.target.value }))}
                                                className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <textarea
                                                placeholder="Optional wallet note or payer reference"
                                                value={paymentDetails.notes}
                                                onChange={(e) => setPaymentDetails((prev) => ({ ...prev, notes: e.target.value }))}
                                                className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                                rows={3}
                                            />
                                        </div>
                                    ) : null}

                                    {selectedRailKind === 'manual' ? (
                                        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <div>
                                                <h3 className="font-bold text-amber-950">Manual settlement details</h3>
                                                <p className="mt-1 text-xs text-amber-800">Your order will stay under review until the transfer reference is verified.</p>
                                            </div>
                                            <input
                                                placeholder="Payer full name"
                                                value={paymentDetails.payerName}
                                                onChange={(e) => setPaymentDetails((prev) => ({ ...prev, payerName: e.target.value }))}
                                                className="w-full p-3 border border-amber-200 rounded-lg bg-white text-text-primary outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <input
                                                placeholder="Transfer reference / receipt ID"
                                                value={paymentDetails.reference}
                                                onChange={(e) => setPaymentDetails((prev) => ({ ...prev, reference: e.target.value }))}
                                                className="w-full p-3 border border-amber-200 rounded-lg bg-white text-text-primary outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <textarea
                                                placeholder="Bank name, branch, or extra settlement notes"
                                                value={paymentDetails.notes}
                                                onChange={(e) => setPaymentDetails((prev) => ({ ...prev, notes: e.target.value }))}
                                                className="w-full p-3 border border-amber-200 rounded-lg bg-white text-text-primary outline-none focus:ring-2 focus:ring-amber-400"
                                                rows={3}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <>
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
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                                Card details are used for this order only. This fallback path does not create a fake saved method anymore.
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
                                </>
                            )}
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Order Summary */}
                    <div className="lg:col-span-1">
                        {isBackendBlocked ? (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
                                Live backend checkout is required for this order. Browsing can degrade gracefully, but payment and fulfillment stay blocked until the backend reconnects.
                            </div>
                        ) : null}
                        {!isReviewReady && (
                            <div className="mb-4 rounded-xl border border-border bg-surface p-4 text-xs text-text-secondary">
                                Complete your address and payment details to place the order.
                            </div>
                        )}
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

