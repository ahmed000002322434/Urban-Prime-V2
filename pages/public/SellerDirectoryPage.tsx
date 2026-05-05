import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../../services/itemService';
import type { User } from '../../types';
import Spinner from '../../components/Spinner';
import StarRating from '../../components/StarRating';
import { buildPublicProfilePath } from '../../utils/profileIdentity';

type DirectoryRole = 'seller' | 'buyer' | 'provider' | 'affiliate';

const directoryRoleMeta: Record<DirectoryRole, { label: string; description: string }> = {
    seller: {
        label: 'Sellers',
        description: 'Browse verified storefront owners and listing creators.'
    },
    buyer: {
        label: 'Buyers',
        description: 'Find active buyers and community shoppers.'
    },
    provider: {
        label: 'Providers',
        description: 'Explore service professionals available for hire.'
    },
    affiliate: {
        label: 'Affiliates',
        description: 'Discover marketing partners and growth collaborators.'
    }
};

const roleBadgeClass: Record<DirectoryRole, string> = {
    seller: 'bg-emerald-100 text-emerald-700',
    buyer: 'bg-sky-100 text-sky-700',
    provider: 'bg-violet-100 text-violet-700',
    affiliate: 'bg-amber-100 text-amber-700'
};

const DirectoryCard: React.FC<{ user: User; role: DirectoryRole }> = ({ user, role }) => (
    <div className="bg-surface rounded-xl shadow-soft border border-border p-5 text-center group hover:-translate-y-1 transition-transform">
        <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full mx-auto border-4 border-gray-100 dark:border-gray-600 object-cover" />
        <h3 className="font-bold mt-4 text-lg text-text-primary">{user.businessName || user.name}</h3>
        <div className="mt-2 flex items-center justify-center gap-2">
            <StarRating rating={user.rating} />
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass[role]}`}>
                {directoryRoleMeta[role].label.slice(0, -1)}
            </span>
        </div>
        <p className="text-xs text-text-secondary mt-2">Member since {new Date(user.memberSince).getFullYear()}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
                to={buildPublicProfilePath(user)}
                className="inline-flex items-center justify-center rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:border-primary"
            >
                View profile
            </Link>
            <Link
                to={`/profile/messages?sellerId=${encodeURIComponent(user.id)}`}
                className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
            >
                Message
            </Link>
        </div>
    </div>
);

const SellerDirectoryPage: React.FC = () => {
    const [directoryData, setDirectoryData] = useState<Record<DirectoryRole, User[]>>({
        seller: [],
        buyer: [],
        provider: [],
        affiliate: []
    });
    const [activeRole, setActiveRole] = useState<DirectoryRole>('seller');
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadDirectory = async () => {
            setIsLoading(true);
            try {
                const [sellers, buyers, providers, affiliates] = await Promise.all([
                    userService.getAllSellers(),
                    userService.getAllBuyers(),
                    userService.getAllProviders(),
                    userService.getAllAffiliates()
                ]);
                if (!mounted) return;
                setDirectoryData({
                    seller: sellers,
                    buyer: buyers,
                    provider: providers,
                    affiliate: affiliates
                });
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        void loadDirectory();
        return () => {
            mounted = false;
        };
    }, []);

    const activeUsers = directoryData[activeRole] || [];
    const filteredUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return activeUsers;
        return activeUsers.filter((entry) => {
            const byName = String(entry.name || '').toLowerCase().includes(query);
            const byBusiness = String(entry.businessName || '').toLowerCase().includes(query);
            const byAbout = String(entry.about || '').toLowerCase().includes(query);
            return byName || byBusiness || byAbout;
        });
    }, [activeUsers, searchTerm]);

    return (
        <div className="bg-background min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold text-text-primary font-display">People Directory</h1>
                    <p className="mt-4 text-xl text-text-secondary">{directoryRoleMeta[activeRole].description}</p>
                </header>

                <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
                    {(Object.keys(directoryRoleMeta) as DirectoryRole[]).map((role) => (
                        <button
                            key={role}
                            type="button"
                            onClick={() => setActiveRole(role)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                activeRole === role
                                    ? 'bg-primary text-white'
                                    : 'border border-border bg-surface text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {directoryRoleMeta[role].label}
                        </button>
                    ))}
                </div>

                <div className="max-w-xl mx-auto mb-10">
                    <input
                        type="search"
                        placeholder={`Search ${directoryRoleMeta[activeRole].label.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full p-4 bg-surface border-2 border-border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary"
                    />
                </div>

                {isLoading ? (
                    <Spinner size="lg" />
                ) : filteredUsers.length === 0 ? (
                    <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface p-8 text-center text-text-secondary">
                        No users found for this segment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {filteredUsers.map((entry) => (
                            <DirectoryCard key={`${activeRole}-${entry.id}`} user={entry} role={activeRole} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerDirectoryPage;
