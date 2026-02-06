
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { SellerPerformanceStats } from '../../types';
import Spinner from '../../components/Spinner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

const AdvancedAnalyticsPage: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<SellerPerformanceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            listerService.getSellerPerformanceStats(user.id)
                .then(setStats)
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    if (!stats) return <div className="text-center py-20">No data available.</div>;

    const earningsSeries = Array.isArray(stats.earnings) ? stats.earnings : [];
    const categorySales = Array.isArray(stats.categorySales) ? stats.categorySales : [];

    // Dummy data for extended analytics since we only aggregated basic stats in service
    const viewsData = [
        { day: 'Mon', views: 120, clicks: 45 },
        { day: 'Tue', views: 150, clicks: 55 },
        { day: 'Wed', views: 180, clicks: 70 },
        { day: 'Thu', views: 140, clicks: 50 },
        { day: 'Fri', views: 200, clicks: 85 },
        { day: 'Sat', views: 250, clicks: 110 },
        { day: 'Sun', views: 220, clicks: 95 },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold font-display text-text-primary">Advanced Analytics</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Traffic Chart */}
                <div className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border">
                    <h3 className="text-lg font-bold text-text-primary mb-6">Traffic & Engagement</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={viewsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Page Views" />
                                <Bar dataKey="clicks" fill="#f39c12" radius={[4, 4, 0, 0]} name="Product Clicks" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Trend Line */}
                 <div className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border">
                    <h3 className="text-lg font-bold text-text-primary mb-6">Revenue Trend (6 Months)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={earningsSeries}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [`$${value}`, 'Revenue']} />
                                <Line type="monotone" dataKey="amount" stroke="#0fb9b1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border">
                <h3 className="text-lg font-bold text-text-primary mb-4">Detailed Performance Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="p-4 bg-surface-soft rounded-lg">
                        <p className="text-sm text-text-secondary">Avg. Order Value</p>
                        <p className="text-2xl font-bold text-text-primary">$85.50</p>
                    </div>
                    <div className="p-4 bg-surface-soft rounded-lg">
                        <p className="text-sm text-text-secondary">Conversion Rate</p>
                        <p className="text-2xl font-bold text-text-primary">{stats.conversionRate.toFixed(2)}%</p>
                    </div>
                    <div className="p-4 bg-surface-soft rounded-lg">
                        <p className="text-sm text-text-secondary">Return Customer Rate</p>
                        <p className="text-2xl font-bold text-text-primary">24%</p>
                    </div>
                    <div className="p-4 bg-surface-soft rounded-lg">
                        <p className="text-sm text-text-secondary">Total Products Sold</p>
                        <p className="text-2xl font-bold text-text-primary">{categorySales.reduce((a, b) => a + b.value, 0)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalyticsPage;
