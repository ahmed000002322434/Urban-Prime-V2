import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { listerService } from '../../services/itemService';
import type { DashboardAnalytics, Booking, DiscountCode, ItemBundle } from '../../types';
import Spinner from '../../components/Spinner';

const BarChart: React.FC<{ data: { month: string; earnings: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.earnings), 1); // Avoid division by zero
    const chartHeight = 200;
    const barWidthPercent = 100 / (data.length || 1);
  
    return (
      <div className="w-full" style={{ height: `${chartHeight}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none">
          {data.map((d, i) => {
            const barHeight = (d.earnings / maxValue) * (chartHeight - 20); // 20px for labels
            return (
              <g key={d.month} transform={`translate(${i * barWidthPercent}, 0)`}>
                <rect
                  width={`${barWidthPercent * 0.7}`}
                  x={`${barWidthPercent * 0.15}`}
                  height={barHeight}
                  y={chartHeight - barHeight - 15}
                  fill="currentColor"
                  className="text-primary/70 hover:text-primary transition-colors"
                />
                 <text 
                    x={`${barWidthPercent / 2}`}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-current text-gray-500 font-semibold"
                >
                    {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
};

const statusColors: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-100',
    confirmed: 'text-green-600 bg-green-100',
    completed: 'text-blue-600 bg-blue-100',
    cancelled: 'text-red-600 bg-red-100',
};

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { currency } = useTranslation();
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
    const [bundles, setBundles] = useState<ItemBundle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = () => {
        if (!user) return;
        setIsLoading(true);
        Promise.all([
            listerService.getDashboardAnalytics(user.id),
            listerService.getBookings(user.id),
            listerService.getDiscountCodes(user.id),
            listerService.getBundles(user.id),
        ]).then(([analyticsData, bookingsData, discountsData, bundlesData]) => {
            setAnalytics(analyticsData);
            setBookings(bookingsData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
            setDiscounts(discountsData);
            setBundles(bundlesData);
            setIsLoading(false);
        }).catch(console.error);
    }

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const handleUpdateBooking = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
        await listerService.updateBookingStatus(bookingId, status);
        fetchDashboardData(); // Refetch to update UI
    };


    if (isLoading) return <Spinner size="lg" className="mt-20" />;
    if (!analytics) return <div className="text-center py-20">Could not load dashboard data.</div>;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-6">Lister Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Analytics */}
                    <div className="bg-white p-6 rounded-lg shadow-soft">
                        <h2 className="text-xl font-bold mb-4">Performance Overview</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
                            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-primary">{currency.symbol}{analytics.totalEarnings.toLocaleString()}</p><p className="text-sm text-slate-500">Total Earnings</p></div>
                            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-primary">{analytics.rentalCount}</p><p className="text-sm text-slate-500">Completed Rentals/Sales</p></div>
                            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-lg font-bold text-primary truncate">{analytics.topItem}</p><p className="text-sm text-slate-500">Top Performing Item</p></div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Monthly Earnings</h3>
                        <BarChart data={analytics.earningsByMonth} />
                    </div>
                    {/* Booking Management */}
                    <div className="bg-white p-6 rounded-lg shadow-soft">
                        <h2 className="text-xl font-bold mb-4">Manage Bookings</h2>
                        <div className="space-y-4">
                            {bookings.length > 0 ? bookings.map(booking => (
                                <div key={booking.id} className="p-3 bg-slate-50 rounded-md flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <p className="font-bold">{booking.itemTitle}</p>
                                        <p className="text-sm text-slate-500">Renter: {booking.renterName}</p>
                                        <p className="text-sm text-slate-500">Dates: {new Date(booking.startDate).toLocaleDateString()} to {new Date(booking.endDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[booking.status]}`}>{booking.status.toUpperCase()}</span>
                                        {booking.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleUpdateBooking(booking.id, 'confirmed')} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600">Approve</button>
                                                <button onClick={() => handleUpdateBooking(booking.id, 'cancelled')} className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600">Deny</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )) : <p className="text-center text-slate-500 py-4">No bookings found.</p>}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow-soft">
                        <h2 className="text-xl font-bold mb-4">Renter Insights</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline"><span className="text-sm text-slate-500">Repeat Renters</span><span className="font-bold text-lg">{analytics.repeatRenters}%</span></div>
                            <div className="flex justify-between items-baseline"><span className="text-sm text-slate-500">Avg. Rental Duration</span><span className="font-bold text-lg">{analytics.avgRentalDuration} days</span></div>
                        </div>
                    </div>
                    {/* Discount Codes */}
                    <div className="bg-white p-6 rounded-lg shadow-soft">
                        <h2 className="text-xl font-bold mb-4">Discount Codes</h2>
                        {discounts.map(d => <div key={d.id} className="text-sm flex justify-between items-center"><span className="font-mono bg-slate-200 px-2 py-1 rounded">{d.code}</span><span>{d.percentage}% Off</span><span className={`text-xs font-bold ${d.isActive ? 'text-green-500' : 'text-slate-400'}`}>{d.isActive ? 'ACTIVE' : 'INACTIVE'}</span></div>)}
                        <button className="mt-4 w-full text-sm py-2 bg-primary/20 text-primary rounded-md hover:bg-primary/30">Create New Code</button>
                    </div>
                    {/* Item Bundles */}
                    <div className="bg-white p-6 rounded-lg shadow-soft">
                        <h2 className="text-xl font-bold mb-4">Item Bundles</h2>
                        {bundles.map(b => <div key={b.id} className="p-2 border-b"><p className="font-semibold text-sm">{b.name}</p><p className="text-xs text-slate-500">{b.itemTitles.join(', ')}</p></div>)}
                        <button className="mt-4 w-full text-sm py-2 bg-primary/20 text-primary rounded-md hover:bg-primary/30">Create New Bundle</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
