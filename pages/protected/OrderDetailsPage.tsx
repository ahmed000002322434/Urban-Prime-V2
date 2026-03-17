
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listerService, itemService, userService } from '../../services/itemService';
import type { Booking, Item, User } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import ReviewSystem from '../../components/ReviewSystem';
import LottieAnimation from '../../components/LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

const FormCard: React.FC<{title: string, children: React.ReactNode, className?: string}> = ({title, children, className}) => (
    <div className={`clay-card clay-size-lg ${className}`}>
        <h3 className="text-lg font-semibold mb-4 text-text-primary border-b border-border pb-2">{title}</h3>
        <div className="space-y-4 text-text-secondary">{children}</div>
    </div>
);

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>;

const OrderDetailsPage: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [item, setItem] = useState<Item | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [hasReviewed, setHasReviewed] = useState(false);
    
    // Claim Modal State
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [claimAmount, setClaimAmount] = useState('');
    const [claimReason, setClaimReason] = useState('');
    const [proofImage, setProofImage] = useState<string | null>(null);

    const fetchDetails = useCallback(async () => {
        if (!bookingId || !user) return;
        setIsLoading(true);
        try {
            const bookingData = await listerService.getBookingById(bookingId);
            if (bookingData) {
                setBooking(bookingData);
                setTrackingNumber(bookingData.trackingNumber || '');
                const itemData = await itemService.getItemById(bookingData.itemId);
                setItem(itemData || null);
                if(itemData) {
                    const otherUserData = await userService.getUserById(user.id === bookingData.renterId ? itemData.owner.id : bookingData.renterId);
                    setOtherUser(otherUserData || null);
                    // Check if user has already reviewed
                    const existingReview = itemData.reviews?.find(r => r.author.id === user.id);
                    setHasReviewed(!!existingReview);
                }
            }
        } catch (error) {
            console.error("Failed to fetch order details", error);
        } finally {
            setIsLoading(false);
        }
    }, [bookingId, user]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleAddTracking = async () => {
        if (!bookingId || !trackingNumber) return;
        await listerService.updateBooking(bookingId, { trackingNumber });
        showNotification("Tracking number updated!");
        fetchDetails();
    };

    const handleConfirmReceipt = async () => {
        if (!bookingId) return;
        if (!window.confirm("Confirm you have received the item? This will release funds to the seller.")) return;
        
        setIsProcessing(true);
        try {
            await itemService.completeOrder(bookingId);
            setBooking(prev => prev ? { ...prev, status: 'completed', paymentStatus: 'released' } : null);
            showNotification("Order completed! Funds released.");
        } catch (error) {
            showNotification(typeof error === 'string' ? error : "Transaction failed.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleReturnItem = async () => {
        if (!bookingId) return;
        if (!window.confirm("Mark item as returned?")) return;
        setIsProcessing(true);
        try {
            await listerService.updateBookingStatus(bookingId, 'returned');
            showNotification("Item marked as returned.");
            fetchDetails();
        } catch (error) {
            showNotification("Failed to update status.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReleaseDeposit = async () => {
        if (!bookingId) return;
        setIsProcessing(true);
        try {
            await itemService.releaseSecurityDeposit(bookingId);
            showNotification("Security deposit released to buyer.");
            fetchDetails();
        } catch (error) {
            console.error(error);
            showNotification("Failed to release deposit.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClaimDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingId || !proofImage) {
             showNotification("Please upload proof of damage.");
             return;
        }
        const amount = parseFloat(claimAmount);
        if (isNaN(amount) || amount <= 0 || (booking?.securityDeposit && amount > booking.securityDeposit)) {
             showNotification("Invalid claim amount.");
             return;
        }

        setIsProcessing(true);
        try {
            await itemService.claimSecurityDeposit(bookingId, amount, claimReason, proofImage);
            showNotification("Deposit claimed successfully.");
            setIsClaimModalOpen(false);
            fetchDetails();
        } catch (error) {
            console.error(error);
            showNotification("Failed to claim deposit.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setProofImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmitReview = async (rating: number, comment: string) => {
        if (!item || !user) return;
        try {
            const authorInfo = { id: user.id, name: user.name, avatar: user.avatar };
            await itemService.addReview(item.id, { rating, comment }, authorInfo);
            setHasReviewed(true);
            showNotification("Review submitted successfully!");
            fetchDetails();
        } catch (error) {
            showNotification("Failed to submit review.");
        }
    };

    if (isLoading) return <Spinner size="lg" className="m-auto" />;
    if (!booking || !item) {
        return (
            <div className="text-center p-8">
                <LottieAnimation src={uiLottieAnimations.noFileFound} className="h-40 w-40 mx-auto" loop autoplay />
                <p>Order not found.</p>
            </div>
        );
    }

    const isSeller = user?.id === item.owner.id;
    const isBuyer = user?.id === booking.renterId;
    const hasDeposit = booking.securityDeposit && booking.securityDeposit > 0;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-text-primary">Order Details</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Status & Actions Card */}
                    <div className="clay-card clay-size-lg border-l-4 border-primary">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Status</p>
                                <p className="text-xl font-bold text-text-primary capitalize">{booking.status.replace('_', ' ')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Payment</p>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${booking.paymentStatus === 'released' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {booking.paymentStatus || 'Escrow'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Tracking Info for Buyer */}
                        {isBuyer && booking.status === 'shipped' && booking.trackingNumber && (
                             <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-1">Tracking Number</p>
                                <p className="text-lg font-mono font-bold text-text-primary mb-3">{booking.trackingNumber}</p>
                                <button 
                                    onClick={() => navigate(`/profile/track-delivery/${booking.id}`)}
                                    className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                                >
                                    Track Package &rarr;
                                </button>
                             </div>
                        )}

                        {/* Actions */}
                        {isBuyer && booking.status === 'shipped' && (
                             <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="font-bold mb-2">Item Received?</h4>
                                <p className="text-sm text-gray-600 mb-4">Please verify you have received your item to complete the order.</p>
                                <button 
                                    onClick={handleConfirmReceipt} 
                                    disabled={isProcessing}
                                    className="clay-button clay-button-primary clay-size-lg is-interactive w-full justify-center"
                                >
                                    {isProcessing ? <Spinner size="sm" className="text-white"/> : 'I Have Received My Item'}
                                </button>
                             </div>
                        )}

                        {/* Seller Actions for Rental Return */}
                        {isSeller && booking.type === 'rent' && booking.status === 'delivered' && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <button 
                                    onClick={handleReturnItem}
                                    disabled={isProcessing}
                                    className="clay-button clay-button-secondary clay-size-lg is-interactive w-full justify-center"
                                >
                                    Mark as Returned
                                </button>
                            </div>
                        )}

                        {/* Security Deposit Management (Seller View) */}
                        {isSeller && booking.status === 'returned' && hasDeposit && booking.depositStatus === 'held' && (
                             <div className="mt-6 pt-6 border-t border-gray-100 bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-4 text-blue-800">
                                    <ShieldCheckIcon />
                                    <h4 className="font-bold">Security Deposit Action Required</h4>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    The item has been returned. Please inspect it. You can release the full deposit back to the buyer or claim a portion for damages.
                                </p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleReleaseDeposit} 
                                        disabled={isProcessing}
                                        className="clay-button clay-button-primary clay-size-md is-interactive flex-1"
                                    >
                                        Release Full Deposit
                                    </button>
                                    <button 
                                        onClick={() => setIsClaimModalOpen(true)} 
                                        disabled={isProcessing}
                                        className="clay-button clay-button-primary clay-size-md clay-tone-danger is-interactive flex-1"
                                    >
                                        Claim Deposit
                                    </button>
                                </div>
                             </div>
                        )}
                        
                        {/* Deposit Status Display */}
                        {hasDeposit && booking.depositStatus !== 'held' && (
                            <div className={`mt-4 p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${booking.depositStatus === 'released' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                <ShieldCheckIcon />
                                Deposit Status: {booking.depositStatus?.toUpperCase()}
                                {booking.depositStatus === 'claimed' && booking.claimDetails && (
                                    <span className="text-xs font-normal ml-2">(-${booking.claimDetails.amount} for {booking.claimDetails.reason})</span>
                                )}
                            </div>
                        )}
                        
                        {/* Completed State */}
                        {(booking.status === 'completed' || booking.status === 'delivered' || booking.status === 'returned') && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg text-green-800 text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Order/Rental cycle active or completed
                            </div>
                        )}
                    </div>
                    
                    {/* Review System - Only show for buyer if completed and not reviewed */}
                    {isBuyer && (booking.status === 'completed' || booking.status === 'delivered') && !hasReviewed && (
                        <ReviewSystem onSubmit={handleSubmitReview} />
                    )}

                    <FormCard title="Fulfillment Status">
                        {isSeller ? (
                            <>
                                <p className="text-sm">Manage shipping and returns for this order.</p>
                                <div className="flex gap-2">
                                    <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" className="clay-input w-full" />
                                    <button onClick={handleAddTracking} className="clay-button clay-button-primary clay-size-md is-interactive whitespace-nowrap">Save Tracking</button>
                                </div>
                            </>
                        ) : (
                            <div>
                                {booking.status === 'confirmed' || booking.status === 'shipped' ? (
                                     <button 
                                        onClick={() => navigate(`/profile/track-delivery/${booking.id}`)}
                                        className="clay-button clay-button-primary clay-size-lg is-interactive w-full justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                        Track Delivery Live
                                    </button>
                                ) : booking.trackingNumber ? (
                                    <p>Tracking Number: <span className="font-bold text-primary">{booking.trackingNumber}</span></p>
                                ) : (
                                    <p>Tracking information pending.</p>
                                )}
                            </div>
                        )}
                    </FormCard>
                </div>

                <div className="space-y-6">
                    <FormCard title="Order Summary">
                        <div className="flex items-center gap-4">
                            <img src={item.imageUrls[0]} alt={item.title} className="w-16 h-16 rounded-md object-cover" />
                            <div>
                                <Link to={`/item/${item.id}`} className="font-bold hover:underline text-text-primary">{item.title}</Link>
                                <p className="text-lg font-bold">${booking.totalPrice.toFixed(2)}</p>
                            </div>
                        </div>
                         <p className="text-sm"><strong>Order ID:</strong> {booking.id.split('-')[1]}</p>
                         <p className="text-sm"><strong>Date:</strong> {new Date(booking.startDate).toLocaleDateString()}</p>
                         <p className="text-sm"><strong>{isSeller ? 'Buyer' : 'Seller'}:</strong> {otherUser?.name || 'N/A'}</p>
                         <div className="mt-4 pt-4 border-t border-gray-200">
                             <div className="flex justify-between text-sm mb-1">
                                 <span>Subtotal</span>
                                 <span>${booking.totalPrice.toFixed(2)}</span>
                             </div>
                             {hasDeposit && (
                                 <div className="flex justify-between text-sm mb-1 text-blue-600 font-semibold">
                                     <span>Security Deposit (Held)</span>
                                     <span>${booking.securityDeposit?.toFixed(2)}</span>
                                 </div>
                             )}
                             <div className="flex justify-between font-bold text-lg mt-2">
                                 <span>Total Paid</span>
                                 <span>${booking.totalPrice.toFixed(2)}</span>
                             </div>
                         </div>
                    </FormCard>
                </div>
            </div>

            {/* Claim Deposit Modal */}
            {isClaimModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsClaimModalOpen(false)}>
                    <div className="clay-card clay-size-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Claim Security Deposit
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            You are requesting to withhold funds from the ${booking.securityDeposit} deposit due to damages or late fees.
                        </p>
                        
                        <form onSubmit={handleClaimDeposit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Claim Amount ($)</label>
                                <input 
                                    type="number" 
                                    max={booking.securityDeposit}
                                    value={claimAmount}
                                    onChange={e => setClaimAmount(e.target.value)}
                                    className="clay-input"
                                    placeholder={`Max ${booking.securityDeposit}`}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Reason</label>
                                <textarea 
                                    value={claimReason}
                                    onChange={e => setClaimReason(e.target.value)}
                                    className="clay-input"
                                    placeholder="Describe damage or reason..."
                                    rows={3}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Proof of Damage (Required)</label>
                                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
                                    <input type="file" accept="image/*" onChange={handleProofUpload} required className="hidden" id="proof-upload"/>
                                    <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center">
                                        <UploadIcon />
                                        <span className="text-xs mt-1 text-gray-500">Click to upload photo</span>
                                    </label>
                                    {proofImage && <p className="text-xs text-green-600 mt-2">Image uploaded!</p>}
                                </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsClaimModalOpen(false)} className="clay-button clay-button-ghost clay-size-md is-interactive flex-1">Cancel</button>
                                <button type="submit" disabled={isProcessing} className="clay-button clay-button-primary clay-size-md clay-tone-danger is-interactive flex-1">
                                    {isProcessing ? 'Processing...' : 'Submit Claim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetailsPage;

