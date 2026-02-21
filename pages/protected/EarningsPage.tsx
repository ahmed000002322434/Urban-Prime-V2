import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
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

const BankIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <path d="M3 21h18"/><path d="M5 21V5l7-4 7 4v16"/><path d="M12 21v-7"/><path d="M12 5v-1"/><path d="M12 14V8"/></svg>
);

const EarningsPage: React.FC = () => {
    const { currency } = useTranslation();
    
    const stats = [
        { label: 'Total Revenue', value: `${currency.symbol}320.00`, icon: '💰', color: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200/50 dark:border-green-/20' },
        { label: 'Pending Payout', value: `${currency.symbol}90.00`, icon: '⏳', color: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50 dark:border-blue-/20' },
        { label: 'Last Payout', value: `${currency.symbol}150.00`, icon: '✓', color: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/50 dark:border-purple-/20' },
    ];
    
    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            {/* Stats Cards */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <motion.div 
                        key={stat.label}
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                        className={`bg-gradient-to-br ${stat.color} p-6 rounded-xl shadow-soft border backdrop-blur-xl transition-all hover:border-primary/50`}
                    >
                        <motion.div 
                            className="text-3xl mb-2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                        >
                            {stat.icon}
                        </motion.div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</h3>
                        <motion.p 
                            className="text-4xl font-extrabold mt-2 text-primary bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.4 + index * 0.1 }}
                        >
                            {stat.value}
                        </motion.p>
                    </motion.div>
                ))}
            </motion.div>
            
            {/* Payout Methods */}
            <motion.div 
                variants={itemVariants}
                whileHover={{ boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border hover:border-primary/50 transition-all"
            >
                <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                    <motion.h2 
                        className="text-xl font-bold font-display text-text-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Payout Methods
                    </motion.h2>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-300 text-white dark:text-black font-semibold rounded-md hover:shadow-lg transition-shadow"
                    >
                        Add Payout Method
                    </motion.button>
                </div>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center py-10"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <BankIcon />
                    </motion.div>
                    <motion.p 
                        className="font-semibold mt-4 text-text-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        No payout method configured.
                    </motion.p>
                    <motion.p 
                        className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        Add your bank account to receive earnings.
                    </motion.p>
                </motion.div>
            </motion.div>

            {/* Transaction History */}
            <motion.div 
                variants={itemVariants}
                whileHover={{ boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border hover:border-primary/50 transition-all"
            >
                <motion.h2 
                    className="text-xl font-bold font-display mb-4 text-text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Transaction History
                </motion.h2>
                <motion.p 
                    className="text-center text-sm text-gray-500 dark:text-gray-400 py-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    No transactions yet.
                </motion.p>
            </motion.div>
        </motion.div>
    );
};

export default EarningsPage;
