
import React from 'react';
import { Link } from 'react-router-dom';
import type { Item } from '../../types';
import { motion } from 'framer-motion';

interface SellerActionCenterProps {
    pendingShipments: number;
    lowStockItems: Item[];
    unreadMessages: number;
}

const BoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;

const ActionCard: React.FC<{ title: string; count: number; icon: React.ReactNode; colorClass: string; link: string; subtext: string; index: number }> = ({ title, count, icon, colorClass, link, subtext, index }) => (
    <Link to={link} className="flex-1">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="h-full bg-surface/80 backdrop-blur-xl p-4 rounded-xl shadow-soft border border-border hover:bg-surface transition-colors group flex flex-col justify-between"
        >
            <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${colorClass} text-white shadow-lg`}>
                    {icon}
                </div>
                {count > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">{count}</span>}
            </div>
            <div>
                <h4 className="mt-4 font-bold text-lg text-text-primary">{title}</h4>
                <p className="text-xs font-bold text-text-secondary group-hover:text-primary transition-colors uppercase tracking-wide mt-1">{subtext} &rarr;</p>
            </div>
        </motion.div>
    </Link>
);

const SellerActionCenter: React.FC<SellerActionCenterProps> = ({ pendingShipments, lowStockItems, unreadMessages }) => {
    return (
        <div className="w-full">
            <h3 className="text-lg font-bold text-text-primary mb-4">Action Center</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ActionCard 
                    title="Pending Orders" 
                    count={pendingShipments} 
                    icon={<BoxIcon />} 
                    colorClass="bg-blue-500" 
                    link="/profile/sales" 
                    subtext="Ship orders"
                    index={0}
                />
                <ActionCard 
                    title="Low Stock" 
                    count={lowStockItems.length} 
                    icon={<AlertIcon />} 
                    colorClass="bg-orange-500" 
                    link="/profile/products" 
                    subtext="Restock items"
                    index={1}
                />
                <ActionCard 
                    title="Unread Messages" 
                    count={unreadMessages} 
                    icon={<MailIcon />} 
                    colorClass="bg-purple-500" 
                    link="/profile/messages" 
                    subtext="View inbox"
                    index={2}
                />
            </div>
        </div>
    );
};

export default SellerActionCenter;

