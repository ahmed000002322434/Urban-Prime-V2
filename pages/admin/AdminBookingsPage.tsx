
import React, { useState, useEffect, useCallback } from 'react';
// FIX: Updated adminService import to point to the new consolidated service file.
import { adminService } from '../../services/adminService';
import type { Booking } from '../../types';
import Spinner from '../../components/Spinner';
import { useTranslation } from '../../hooks/useTranslation';

const statusColors: Record<string, string> = {
    pending: 'text-amber-800 bg-amber-100',
    confirmed: 'text-green-800 bg-green-100',
    completed: 'text-gray-800 bg-gray-100',
    cancelled: 'text-red-800 bg-red-100',
};

const AdminBookingsPage: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currency } = useTranslation();

    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const bookingsData = await adminService.getAllBookings();
            setBookings(bookingsData);
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-dark-text">Manage All Bookings</h1>
            {isLoading ? <Spinner size="lg" /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3">Item</th>
                                <th scope="col" className="px-6 py-3">Renter</th>
                                <th scope="col" className="px-6 py-3">Dates</th>
                                <th scope="col" className="px-6 py-3">Total Price</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.id} className="bg-white dark:bg-dark-surface border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{booking.itemTitle}</td>
                                    <td className="px-6 py-4">{booking.renterName}</td>
                                    <td className="px-6 py-4">{booking.startDate} to {booking.endDate}</td>
                                    <td className="px-6 py-4">{currency.symbol}{booking.totalPrice.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                                            {booking.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminBookingsPage;