
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserData } from '../../hooks/useUserData';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import type { Item } from '../../types';
import QuickViewModal from '../../components/QuickViewModal';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const slideInVariants = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0, transition: { duration: 0.6 } },
};

const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const TwitterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>;

const MyStorePage: React.FC = () => {
    const { storefront, isLoading: isStoreLoading } = useUserData();
    const { user } = useAuth();
    const [myItems, setMyItems] = React.useState<Item[]>([]);
    const [isItemsLoading, setIsItemsLoading] = React.useState(true);
    const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

    React.useEffect(() => {
        if (user) {
            setIsItemsLoading(true);
            itemService.getItemsByOwner(user.id)
                .then(setMyItems)
                .finally(() => setIsItemsLoading(false));
        }
    }, [user]);

    if (isStoreLoading) {
        return <div className="h-screen w-full flex items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (!storefront) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="container mx-auto text-center py-20"
            >
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                >
                    <StoreIcon />
                </motion.div>
                <motion.h1 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold mt-6 text-text-primary"
                >
                    You don't have a store yet.
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-text-secondary mt-2"
                >
                    Create a beautiful, AI-powered storefront to showcase your items.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link 
                        to="/create-store" 
                        className="mt-6 inline-block px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold"
                    >
                        Create My Store
                    </Link>
                </motion.div>
            </motion.div>
        );
    }
    
    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="container mx-auto px-4 sm:px-6 lg:px-8 py-10"
            >
                {/* Store Header Card */}
                <motion.div 
                    variants={slideInVariants}
                    initial="hidden"
                    animate="show"
                    className="bg-surface rounded-xl shadow-md border border-border overflow-hidden mb-8"
                >
                    {/* Banner */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative overflow-hidden group"
                    >
                        {storefront.storeBannerUrl ? (
                            <motion.img 
                                src={storefront.storeBannerUrl} 
                                alt="Store Banner" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                whileHover={{ scale: 1.05 }}
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center text-text-secondary"
                            >
                                <span className="text-sm">No banner image set. Go to settings to upload one.</span>
                            </motion.div>
                        )}
                        {storefront.isVacationMode && (
                            <motion.div 
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg"
                            >
                                <PlaneIcon /> Vacation Mode ON
                            </motion.div>
                        )}
                    </motion.div>
                    
                    {/* Store Info */}
                    <div className="p-6">
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                            <motion.div variants={itemVariants}>
                                <motion.h1 
                                    className="text-3xl font-bold font-display text-text-primary"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {storefront.name}
                                </motion.h1>
                                <motion.p 
                                    className="text-gray-500 dark:text-gray-400 mt-1"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {storefront.tagline}
                                </motion.p>
                                
                                {/* Social Links */}
                                <motion.div 
                                    className="flex gap-3 mt-3"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                >
                                    {storefront.socialLinks?.instagram && (
                                        <motion.a 
                                            href={`https://instagram.com/${storefront.socialLinks.instagram}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-text-secondary hover:text-primary transition-colors"
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.2, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <InstagramIcon />
                                        </motion.a>
                                    )}
                                    {storefront.socialLinks?.twitter && (
                                        <motion.a 
                                            href={`https://twitter.com/${storefront.socialLinks.twitter}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-text-secondary hover:text-primary transition-colors"
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.2, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <TwitterIcon />
                                        </motion.a>
                                    )}
                                    {storefront.socialLinks?.website && (
                                        <motion.a 
                                            href={storefront.socialLinks.website} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-text-secondary hover:text-primary transition-colors"
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.2, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <LinkIcon />
                                        </motion.a>
                                    )}
                                </motion.div>
                            </motion.div>
                            
                            <motion.div 
                                variants={itemVariants}
                                className="flex gap-2"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Link to={`/store/${storefront.slug}`} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-md text-sm flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                        <EyeIcon /> View Public Store
                                    </Link>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Link to="/store/preview" state={{ storefront }} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-md text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                                        <EditIcon /> Open AI Editor
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Items Section */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    <motion.h2 
                        variants={itemVariants}
                        className="text-xl font-bold mb-4 text-text-primary"
                    >
                        Items Included in Your Store
                    </motion.h2>
                    {isItemsLoading ? (
                        <div className="flex justify-center py-20"><Spinner /></div>
                    ) : myItems.length > 0 ? (
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                            {myItems.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <ItemCard item={item} onQuickView={setQuickViewItem} />
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-text-secondary py-10"
                        >
                            You have no items listed yet. Add some to feature them in your store!
                        </motion.p>
                    )}
                </motion.div>
            </motion.div>
        </>
    );
};

export default MyStorePage;

