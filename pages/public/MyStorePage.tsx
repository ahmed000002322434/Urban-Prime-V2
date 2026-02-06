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
                <div className="bg-surface p-6 rounded-lg shadow-md border border-border flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold font-display text-text-primary">My Storefront</h1>
                        <p className="text-gray-500">Manage your public-facing store and view your listed items.</p>
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