
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { reelService } from '../../services/itemService';
import type { Reel } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

const LikedReelsPage: React.FC = () => {
    const { user } = useAuth();
    const [reels, setReels] = useState<Reel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLikedReels = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // In a real app, optimize this to fetch only liked IDs
                const allReels = await reelService.getReelsForFeed(user.id);
                const liked = allReels.filter(r => user.likedReels?.includes(r.id));
                setReels(liked);
            } catch (error) {
                console.error("Failed to fetch liked reels", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLikedReels();
    }, [user]);

    return (
        <div className="bg-gray-50 dark:bg-dark-background min-h-screen">
             <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <BackButton />
                    <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Liked Pixes</h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Spinner size="lg"/></div>
                ) : reels.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {reels.map(reel => (
                            <Link to="/reels" key={reel.id} className="relative aspect-[9/16] rounded-xl overflow-hidden group shadow-md hover:shadow-xl transition-all">
                                <img src={reel.coverImageUrl} alt={reel.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                                    <span>{reel.views}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't liked any Pixes yet.</p>
                        <Link to="/reels" className="mt-4 inline-block px-6 py-2 bg-primary text-white font-bold rounded-full">Explore Pixes</Link>
                    </div>
                )}
             </div>
        </div>
    );
};

export default LikedReelsPage;
