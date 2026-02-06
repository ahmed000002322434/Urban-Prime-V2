
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserData } from '../../hooks/useUserData';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import type { Item } from '../../types';
import QuickViewModal from '../../components/QuickViewModal';

const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M18 6 7 17h8v-4.5Z"/><path d="m8 12.5-5 5"/><path d="m14 4-1.5 1.5"/></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const TwitterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>;

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
            <div className="container mx-auto text-center py-20 animate-fade-in-up">
                <StoreIcon />
                <h1 className="text-2xl font-bold mt-6 text-text-primary">You don't have a store yet.</h1>
                <p className="text-text-secondary mt-2">Create a beautiful, AI-powered storefront to showcase your items.</p>
                <Link 
                    to="/create-store" 
                    className="mt-6 inline-block px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold"
                >
                    Create My Store
                </Link>
            </div>
        );
    }
    
    return (
        <>
            {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
                {/* Store Header Card */}
                <div className="bg-surface rounded-xl shadow-md border border-border overflow-hidden mb-8">
                    {/* Banner */}
                    <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative">
                        {storefront.storeBannerUrl ? (
                            <img src={storefront.storeBannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
                        ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
                                 <span className="text-sm">No banner image set. Go to settings to upload one.</span>
                             </div>
                        )}
                        {storefront.isVacationMode && (
                             <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                 <PlaneIcon /> Vacation Mode ON
                             </div>
                        )}
                    </div>
                    
                    {/* Store Info */}
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold font-display text-text-primary">{storefront.name}</h1>
                                <p className="text-gray-500 mt-1">{storefront.tagline}</p>
                                
                                {/* Social Links */}
                                <div className="flex gap-3 mt-3">
                                    {storefront.socialLinks?.instagram && (
                                        <a href={`https://instagram.com/${storefront.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary"><InstagramIcon /></a>
                                    )}
                                    {storefront.socialLinks?.twitter && (
                                        <a href={`https://twitter.com/${storefront.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary"><TwitterIcon /></a>
                                    )}
                                    {storefront.socialLinks?.website && (
                                        <a href={storefront.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary"><LinkIcon /></a>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <Link to={`/store/${storefront.slug}`} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-md text-sm flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600">
                                    <EyeIcon /> View Public Store
                                </Link>
                                <Link to="/store/preview" state={{ storefront }} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-md text-sm flex items-center gap-2 hover:opacity-90">
                                    <EditIcon /> Open AI Editor
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4 text-text-primary">Items Included in Your Store</h2>
                    {isItemsLoading ? <Spinner /> : myItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {myItems.map(item => <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />)}
                        </div>
                    ) : (
                        <p className="text-center text-text-secondary py-10">You have no items listed yet. Add some to feature them in your store!</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default MyStorePage;
