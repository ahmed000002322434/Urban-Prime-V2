import React from 'react';
import Spinner from '../Spinner';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

interface StatCardProps {
    title: string;
    value: number | string;
    isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, isLoading }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <motion.div 
            whileHover={{ y: -8, boxShadow: isDark ? '0 20px 40px rgba(0, 0, 0, 0.5)' : '0 20px 40px rgba(0, 0, 0, 0.1)' }}
            className={`p-7 rounded-2xl shadow-lg border-2 transition-all duration-300 ${
              isDark
                ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-primary/40'
                : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-primary/40'
            }`}
        >
            <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h3>
            {isLoading ? (
                <div className="mt-3"><Spinner size="sm" /></div>
            ) : (
                <p className={`text-4xl font-black mt-3 bg-gradient-to-r ${
                  isDark
                    ? 'from-blue-300 to-indigo-300 dark:from-blue-200 dark:to-indigo-200'
                    : 'from-slate-900 to-slate-700'
                } bg-clip-text text-transparent`}>{value}</p>
            )}
        </motion.div>
    );
};

export default StatCard;