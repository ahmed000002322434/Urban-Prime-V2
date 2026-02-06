
import React from 'react';
import { Link } from 'react-router-dom';
import type { GrowthInsight } from '../../types';
import { motion } from 'framer-motion';

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
    </svg>
);

const BulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

const AIGrowthInsights: React.FC<{ insights: GrowthInsight[] }> = ({ insights }) => {
    if (insights.length === 0) return null;

    return (
        <div className="w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-600 dark:text-purple-400 animate-pulse"><SparklesIcon /></span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">AI Growth Insights</h3>
            </div>
            
            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-4 relative z-10"
            >
                {insights.map(insight => (
                    <motion.div 
                        key={insight.id} 
                        variants={item}
                        className="bg-white/60 dark:bg-black/40 backdrop-blur-sm p-4 rounded-xl flex gap-4 items-start border border-white/20 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/60 transition-colors"
                    >
                        <div className="mt-1 text-indigo-500 dark:text-indigo-400 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><BulbIcon /></div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">{insight.message}</p>
                            {insight.actionLabel && insight.actionLink && (
                                <Link to={insight.actionLink} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 inline-block hover:underline uppercase tracking-wide">
                                    {insight.actionLabel} &rarr;
                                </Link>
                            )}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default AIGrowthInsights;
