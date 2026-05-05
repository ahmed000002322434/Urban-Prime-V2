import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../../services/itemService';
import type { User } from '../../types';
import Spinner from '../../components/Spinner';
import StarRating from '../../components/StarRating';
import { buildPublicProfilePath } from '../../utils/profileIdentity';

const UserCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-surface rounded-lg shadow-soft border border-border p-6 text-center group hover:-translate-y-1 transition-transform">
        <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full mx-auto border-4 border-gray-100 dark:border-gray-600" />
        <h3 className="font-bold mt-4 text-lg text-text-primary">{user.businessName || user.name}</h3>
        <div className="flex justify-center mt-1">
            <StarRating rating={user.rating} />
        </div>
        <p className="text-xs text-text-secondary mt-2">Member since {new Date(user.memberSince).getFullYear()}</p>
        <Link to={buildPublicProfilePath(user)} className="mt-4 inline-block bg-primary text-white font-semibold text-sm px-6 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            View Profile
        </Link>
    </div>
);

const BuyerDirectoryPage: React.FC = () => {
    const [buyers, setBuyers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setIsLoading(true);
        userService.getAllBuyers()
            .then(allUsers => {
                const filtered = allUsers.filter(user => !user.purpose || user.purpose === 'rent' || user.purpose === 'both');
                setBuyers(filtered);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filteredBuyers = useMemo(() => {
        if (!searchTerm) return buyers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return buyers.filter(buyer =>
            (buyer.name.toLowerCase().includes(lowercasedFilter)) ||
            (buyer.businessName && buyer.businessName.toLowerCase().includes(lowercasedFilter)) ||
            (buyer.about && buyer.about.toLowerCase().includes(lowercasedFilter))
        );
    }, [buyers, searchTerm]);

    return (
        <div className="bg-background min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-text-primary font-display">Buyer Directory</h1>
                    <p className="mt-4 text-xl text-text-secondary">Discover and connect with our community of buyers and shoppers.</p>
                </header>

                <div className="max-w-xl mx-auto mb-12">
                    <input
                        type="search"
                        placeholder="Search for buyers, profiles, or keywords..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-4 bg-surface border-2 border-border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary"
                    />
                </div>
                
                {isLoading ? (
                    <Spinner size="lg" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {filteredBuyers.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuyerDirectoryPage;
