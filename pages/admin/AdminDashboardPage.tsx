
// pages/admin/AdminDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import type { User, Item, AIFeature } from '../../types';
import StatCard from '../../components/admin/StatCard';
import Spinner from '../../components/Spinner';
import { useTranslation } from '../../hooks/useTranslation';
import { useNotification } from '../../context/NotificationContext';
import { motion } from 'framer-motion';

const AdminDashboardPage: React.FC = () => {
    const [stats, setStats] = useState({ users: 0, items: 0, bookings: 0, totalRevenue: 0, totalPendingPayouts: 0, unverifiedItems: 0, unverifiedUsers: 0 });
    const [unverifiedUsers, setUnverifiedUsers] = useState<User[]>([]);
    const [unverifiedItems, setUnverifiedItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currency } = useTranslation();
    const { showNotification } = useNotification();

    // New AI Feature State
    const [features, setFeatures] = useState<AIFeature[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiResponse, setAiResponse] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [statsData, usersData, itemsData] = await Promise.all([
                    adminService.getSiteStats(),
                    adminService.getAllUsers(),
                    adminService.getAllItems()
                ]);
                setStats(statsData);
                setUnverifiedUsers(usersData.filter(u => u.verificationLevel !== 'level2'));
                setUnverifiedItems(itemsData.filter(i => !i.isVerified));
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const handleGenerateFeature = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt) return;
        setIsLoadingAI(true);
        setAiResponse('');
        try {
            const result = await adminService.generateFeatureWithAI(prompt);
            const newFeature: AIFeature = {
                id: `feat-${Date.now()}`,
                description: prompt,
                // FIX: Add type assertion for AI result
                pseudoCode: (result as any).pseudoCode,
            };
            setFeatures(prev => [newFeature, ...prev]);
            // FIX: Add type assertion for AI result
            setAiResponse(`✅ Success: ${(result as any).message}`);
            setPrompt('');
        } catch (error) {
            setAiResponse(`❌ Error: Could not generate feature.`);
        } finally {
            setIsLoadingAI(false);
        }
    };
    
    const handleUndoFeature = (featureId: string) => {
        setFeatures(prev => prev.filter(f => f.id !== featureId));
        showNotification("Feature has been 'undone'.");
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };


    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <motion.h1 variants={itemVariants} className="text-3xl font-black text-gray-900 dark:text-dark-text tracking-tight">Admin Overview</motion.h1>

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={stats.users} isLoading={isLoading} />
                <StatCard title="Total Listings" value={stats.items} isLoading={isLoading} />
                <StatCard title="Total Bookings" value={stats.bookings} isLoading={isLoading} />
                 <StatCard title="Total Revenue" value={`${currency.symbol}${stats.totalRevenue.toLocaleString()}`} isLoading={isLoading} />
            </motion.div>
            
            {/* AI Assistant */}
            <motion.div variants={itemVariants} className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-dark-surface dark:to-black p-8 rounded-2xl shadow-xl border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">✨ Admin AI Assistant</h2>
                    <form onSubmit={handleGenerateFeature} className="flex gap-3">
                        <input 
                            type="text"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Describe a feature to generate (e.g., 'Add a banner for summer sale')..."
                            className="flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-md"
                            disabled={isLoadingAI}
                        />
                        <button type="submit" className="px-6 py-3 bg-white text-black font-bold rounded-xl whitespace-nowrap disabled:bg-gray-400 hover:bg-gray-200 transition-colors" disabled={isLoadingAI}>
                            {isLoadingAI ? <Spinner size="sm" /> : 'Generate'}
                        </button>
                    </form>
                    {aiResponse && <p className="text-sm mt-3 text-green-400 font-mono">{aiResponse}</p>}

                    {features.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Generated Features</h3>
                            <div className="space-y-2">
                                {features.map(feature => (
                                     <motion.details initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={feature.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <summary className="font-medium text-sm text-gray-200 cursor-pointer flex justify-between items-center select-none">
                                            <span>{feature.description}</span>
                                            <button onClick={() => handleUndoFeature(feature.id)} className="text-xs font-bold text-red-400 hover:text-red-300">UNDO</button>
                                        </summary>
                                        <pre className="mt-3 text-xs bg-black/50 text-green-400 p-4 rounded-lg overflow-x-auto font-mono border border-white/5">
                                            <code>{feature.pseudoCode}</code>
                                        </pre>
                                    </motion.details>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Users Awaiting Verification */}
                <motion.div variants={itemVariants} className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">Pending Verifications</h2>
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{stats.unverifiedUsers}</span>
                    </div>
                    {isLoading ? <div className="flex-1 flex items-center justify-center"><Spinner /></div> : (
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {unverifiedUsers.length > 0 ? unverifiedUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-background rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-gray-200" />
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <Link to="/admin/users" className="text-xs font-bold bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg hover:opacity-80">Review</Link>
                                </div>
                            )) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">All users verified!</div>}
                        </div>
                    )}
                </motion.div>

                {/* Listings Awaiting Verification */}
                <motion.div variants={itemVariants} className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">Item Approvals</h2>
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{stats.unverifiedItems}</span>
                    </div>
                    {isLoading ? <div className="flex-1 flex items-center justify-center"><Spinner /></div> : (
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {unverifiedItems.length > 0 ? unverifiedItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-background rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <img src={item.imageUrls[0]} alt={item.title} className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[150px]">{item.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">by {item.owner.name}</p>
                                        </div>
                                    </div>
                                    <Link to="/admin/listings" className="text-xs font-bold bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg hover:opacity-80">Inspect</Link>
                                </div>
                            )) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No pending items.</div>}
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default AdminDashboardPage;
