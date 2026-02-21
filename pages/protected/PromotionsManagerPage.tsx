import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { DiscountCode } from '../../types';
import Spinner from '../../components/Spinner';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const PromotionsManagerPage: React.FC = () => {
    const { user } = useAuth();
    const [codes, setCodes] = useState<DiscountCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCode, setNewCode] = useState({ code: '', percentage: 10 });

    const fetchCodes = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const codesData = await listerService.getDiscountCodes(user.id);
            setCodes(codesData);
        } catch (error) {
            console.error("Failed to fetch codes:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newCode.code || newCode.percentage <= 0) return;
        await listerService.createDiscountCode(user.id, newCode.code, newCode.percentage);
        setNewCode({ code: '', percentage: 10 });
        setShowCreateForm(false);
        fetchCodes();
    };

    const handleToggleActive = async (code: DiscountCode) => {
        await listerService.updateDiscountCode(code.id, { isActive: !code.isActive });
        fetchCodes();
    };
    
    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            {/* Header */}
            <motion.div 
                variants={itemVariants}
                className="flex justify-between items-center"
            >
                <motion.h1 
                    className="text-3xl font-bold font-display text-text-primary"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    Promotions Manager
                </motion.h1>
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${showCreateForm ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg'} text-white`}
                >
                    {showCreateForm ? '✕ Cancel' : '+ New Discount'}
                </motion.button>
            </motion.div>
            
            {/* Create Form */}
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: showCreateForm ? 1 : 0, height: showCreateForm ? 'auto' : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
            >
                <motion.div 
                    className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border"
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                >
                    <motion.form 
                        onSubmit={handleCreateCode} 
                        className="flex flex-col sm:flex-row gap-4 items-end"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        <motion.div 
                            variants={itemVariants}
                            className="flex-1"
                        >
                            <label className="text-xs font-semibold text-text-secondary block mb-2">Discount Code</label>
                            <input
                                type="text"
                                value={newCode.code}
                                onChange={e => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                placeholder="e.g., FALL20"
                                required
                                className="w-full p-2 border border-border rounded-md bg-surface/50 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </motion.div>
                        <motion.div 
                            variants={itemVariants}
                            className="flex-1"
                        >
                            <label className="text-xs font-semibold text-text-secondary block mb-2">Percentage Off</label>
                            <input
                                type="number"
                                value={newCode.percentage}
                                onChange={e => setNewCode(p => ({ ...p, percentage: Number(e.target.value) }))}
                                min="1" max="100"
                                required
                                className="w-full p-2 border border-border rounded-md bg-surface/50 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </motion.div>
                        <motion.button 
                            type="submit" 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md font-semibold text-sm hover:shadow-lg transition-shadow"
                        >
                            Create
                        </motion.button>
                    </motion.form>
                </motion.div>
            </motion.div>

            {/* Codes Table */}
            <motion.div 
                variants={itemVariants}
                className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border"
            >
                {isLoading ? (
                    <div className="flex justify-center py-10"><Spinner /></div>
                ) : codes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-10"
                    >
                        <p className="text-text-secondary">No discount codes created yet.</p>
                        <p className="text-text-secondary text-sm mt-1">Create your first discount code to get started.</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        className="overflow-x-auto"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-secondary uppercase bg-surface/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Discount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map((code, index) => (
                                    <motion.tr 
                                        key={code.id} 
                                        variants={itemVariants}
                                        whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                                        className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono font-semibold text-text-primary">{code.code}</td>
                                        <td className="px-4 py-3 text-text-primary">{code.percentage}% off</td>
                                        <td className="px-4 py-3">
                                            <motion.span 
                                                whileHover={{ scale: 1.05 }}
                                                className={`inline-block px-2 py-1 text-xs font-bold rounded-full transition-all ${code.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30'}`}
                                            >
                                                {code.isActive ? '✓ Active' : '○ Inactive'}
                                            </motion.span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleToggleActive(code)} 
                                                className="font-semibold text-sm text-primary hover:text-primary/80 transition-colors"
                                            >
                                                {code.isActive ? 'Deactivate' : 'Activate'}
                                            </motion.button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default PromotionsManagerPage;