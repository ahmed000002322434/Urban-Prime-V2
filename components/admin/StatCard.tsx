
import React from 'react';
import Spinner from '../Spinner';
import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: number | string;
    isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, isLoading }) => {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
            {isLoading ? (
                <div className="mt-2"><Spinner size="sm" /></div>
            ) : (
                <p className="text-3xl font-black text-gray-900 dark:text-dark-text mt-2">{value}</p>
            )}
        </motion.div>
    );
};

export default StatCard;
