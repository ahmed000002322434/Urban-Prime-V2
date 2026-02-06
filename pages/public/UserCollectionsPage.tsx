import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userService } from '../../services/itemService';
import type { ItemCollection, User } from '../../types';
import Spinner from '../../components/Spinner';

const CollectionCard: React.FC<{ collection: ItemCollection }> = ({ collection }) => (
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">{collection.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{collection.itemIds.length} items</p>
        <div className="flex -space-x-2 mt-4">
            {collection.items?.slice(0, 4).map(item => (
                <img key={item.id} src={item.imageUrls[0]} alt={item.title} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-dark-surface" />
            ))}
        </div>
        {/* In a full implementation, this would link to a page for the specific collection */}
        <Link to="#" className="mt-4 inline-block font-semibold text-primary text-sm">View Collection &rarr;</Link>
    </div>
);

const UserCollectionsPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const [user, setUser] = useState<User | null>(null);
    const [collections, setCollections] = useState<ItemCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        
        setIsLoading(true);
        Promise.all([
            userService.getUserById(userId),
            userService.getPublicCollectionsForUser(userId)
        ]).then(([userData, collectionsData]) => {
            setUser(userData || null);
            setCollections(collectionsData);
        }).finally(() => setIsLoading(false));

    }, [userId]);
    
    if (isLoading) {
        return <Spinner size="lg" className="mt-20" />;
    }

    if (!user) {
        return <div className="text-center py-20">User not found.</div>;
    }

    return (
        <div className="bg-gray-50 dark:bg-dark-background min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-dark-text font-display">
                        {user.name}'s Collections
                    </h1>
                    <Link to={`/user/${user.id}`} className="text-lg text-gray-600 dark:text-gray-400 hover:underline">
                        &larr; Back to Profile
                    </Link>
                </header>

                {collections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {collections.map(collection => (
                            <CollectionCard key={collection.id} collection={collection} />
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-20 bg-white dark:bg-dark-surface rounded-lg shadow-sm border">
                        <p className="text-gray-500 dark:text-gray-400">{user.name} has not created any public collections yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserCollectionsPage;