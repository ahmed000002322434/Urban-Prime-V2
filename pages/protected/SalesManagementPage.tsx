
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { Booking } from '../../types';
import Spinner from '../../components/Spinner';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';

const statusColors: Record<Booking['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const SalesManagementPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'pending_shipment'>('all');

    // Shipping Modal State
    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [shippingData, setShippingData] = useState({ bookingId: '', carrier: '', trackingNumber: '' });
    const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);

    const fetchBookings = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const bookingsData = await listerService.getBookings(user.id);
            setBookings(bookingsData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const openShippingModal = (bookingId: string) => {
        setShippingData({ bookingId, carrier: '', trackingNumber: '' });
        setIsShippingModalOpen(true);
    };

    const handleConfirmShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shippingData.carrier || !shippingData.trackingNumber) {
            showNotification("Please fill in all fields.");
            return;
        }

        setIsSubmittingShipping(true);
        try {
            await listerService.updateBooking(shippingData.bookingId, { 
                status: 'shipped', 
                trackingNumber: `${shippingData.carrier}: ${shippingData.trackingNumber}` 
            });
            showNotification("Order marked as shipped!");
            setIsShippingModalOpen(false);
            fetchBookings();
        } catch (error) {
            showNotification("Failed to update order status.");
        } finally {
            setIsSubmittingShipping(false);
        }
    };

    const handleUpdateStatus = async (bookingId: string, status: 'delivered') => {
        await listerService.updateBooking(bookingId, { status });
        fetchBookings();
    };
    
    // Filter bookings for the 'Pending Shipment' tab. 
    // In our createOrder logic, new orders start as 'confirmed' (paid).
    const pendingShipments = bookings.filter(b => b.status === 'confirmed');
    
    const displayBookings = activeTab === 'all' ? bookings : pendingShipments;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold font-display text-text-primary">Sales Management</h1>
            
            <div className="flex gap-4 border-b border-border mb-6">
                <button 
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                >
                    All Orders
                </button>
                <button 
                    onClick={() => setActiveTab('pending_shipment')}
                    className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pending_shipment' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                >
                    Pending Shipment
                    {pendingShipments.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingShipments.length}</span>}
                </button>
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                {isLoading ? <Spinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-secondary uppercase bg-surface-soft">
                                <tr>
                                    <th className="px-4 py-3">Order ID</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Buyer & Address</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayBookings.length > 0 ? displayBookings.map(booking => (
                                    <tr key={booking.id} className={`border-b border-border hover:bg-surface-soft ${booking.status === 'confirmed' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{booking.id.split('-')[1] || booking.id.substring(0, 8)}</td>
                                        <td className="px-4 py-3 font-semibold text-text-primary">
                                            {booking.itemTitle}
                                        </td>
                                        <td className="px-4 py-3 text-text-primary">
                                            <p className="font-bold">{booking.renterName}</p>
                                            {booking.shippingAddress && (
                                                <p className="text-xs text-text-secondary max-w-[200px] truncate">
                                                    {booking.shippingAddress.addressLine1}, {booking.shippingAddress.city}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-text-primary">{new Date(booking.startDate).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${statusColors[booking.status]}`}>
                                                {booking.status === 'confirmed' ? 'Ready to Ship' : booking.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            {booking.status === 'confirmed' && (
                                                <button onClick={() => openShippingModal(booking.id)} className="px-3 py-1 text-xs bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 shadow-sm transition-colors">
                                                    Confirm Shipment
                                                </button>
                                            )}
                                            {booking.status === 'shipped' && (
                                                <button onClick={() => handleUpdateStatus(booking.id, 'delivered')} className="px-3 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600">Mark Delivered</button>
                                            )}
                                            <Link to={`/profile/orders/${booking.id}`} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Details</Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-text-secondary">No orders found in this category.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Mark as Shipped Modal */}
            {isShippingModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsShippingModalOpen(false)}>
                    <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Mark as Shipped</h2>
                        <form onSubmit={handleConfirmShipment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Carrier Name</label>
                                <input 
                                    type="text" 
                                    value={shippingData.carrier}
                                    onChange={e => setShippingData({...shippingData, carrier: e.target.value})}
                                    placeholder="e.g. UPS, FedEx, USPS" 
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600 text-gray-900 dark:text-white" 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Tracking Number</label>
                                <input 
                                    type="text" 
                                    value={shippingData.trackingNumber}
                                    onChange={e => setShippingData({...shippingData, trackingNumber: e.target.value})}
                                    placeholder="e.g. 1Z9999999999999999" 
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600 text-gray-900 dark:text-white" 
                                    required 
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsShippingModalOpen(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                                <button type="submit" disabled={isSubmittingShipping} className="flex-1 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                                    {isSubmittingShipping ? <Spinner size="sm" /> : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesManagementPage;
