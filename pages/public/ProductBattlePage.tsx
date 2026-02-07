

import React, { useState, useEffect, useCallback } from 'react';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../hooks/useTheme';

const ProductCard: React.FC<{ item: Item; onVote: () => void; wins: number; appearances: number; showStats: boolean; }> = ({ item, onVote, wins, appearances, showStats }) => {
    const winRate = appearances > 0 ? ((wins / appearances) * 100).toFixed(0) : 50;
    const imageUrl = item.imageUrls?.[0] || item.images?.[0] || `https://picsum.photos/seed/${item.id}/600/600`;
    
    return (
        <div 
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer group relative"
            onClick={onVote}
        >
            <div className={`absolute inset-0 transition-all duration-500 ${showStats ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute top-0 left-0 h-full bg-primary/20" style={{width: `${winRate}%`}}></div>
            </div>

            <div className="relative z-10 p-4 w-full h-full flex flex-col justify-between">
                <img 
                    src={imageUrl} 
                    alt={item.title} 
                    className="w-full aspect-square object-cover rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
                <h3 className="font-bold text-center mt-4 text-white drop-shadow-lg">{item.title}</h3>
                {showStats && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-5xl font-black text-white drop-shadow-2xl">{winRate}%</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const ProductBattlePage: React.FC = () => {
    const [pair, setPair] = useState<[Item, Item] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [key, setKey] = useState(0);
    const { resolvedTheme } = useTheme();

    const fetchNewPair = useCallback(async () => {
        setIsLoading(true);
        setShowStats(false);
        try {
            // This is a simplified fetch, a real app would have a dedicated endpoint
            // FIX: Added missing page property to the pagination object.
            const { items } = await itemService.getItems({}, { page: 1, limit: 100 });
            if (items.length < 2) return;
            const item1Index = Math.floor(Math.random() * items.length);
            let item2Index = Math.floor(Math.random() * items.length);
            while (item1Index === item2Index) {
                item2Index = Math.floor(Math.random() * items.length);
            }
            setPair([items[item1Index], items[item2Index]]);
            setKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to fetch battle pair", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNewPair();
    }, [fetchNewPair]);

    const handleVote = async (winner: Item, loser: Item) => {
        if (showStats) return;
        setShowStats(true);
        await itemService.recordBattleVote(winner.id, loser.id);
        setTimeout(() => {
            fetchNewPair();
        }, 2000); // Show stats for 2 seconds
    };
    
    // In elite theme, use transparency. Otherwise default dark background.
    const bgClass = resolvedTheme === 'obsidian' || resolvedTheme === 'hydra' ? 'bg-transparent' : 'bg-gray-900';

    return (
        <div className={`h-screen w-full ${bgClass} flex flex-col items-center justify-center p-4 relative`}>
            <BackButton alwaysShowText className="absolute top-8 left-8 !text-white" />
            <h1 className="text-4xl font-extrabold text-white font-display mb-2">Product Battles</h1>
            <p className="text-gray-400 mb-8">Which one would you choose?</p>

            {isLoading && !pair ? <Spinner size="lg" /> : pair ? (
                <div key={key} className="w-full max-w-4xl h-3/5 grid grid-cols-2 gap-4 md:gap-8 animate-fade-in-up">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/50">
                        <ProductCard 
                            item={pair[0]} 
                            onVote={() => handleVote(pair[0], pair[1])}
                            wins={pair[0].battleWins || 0}
                            appearances={pair[0].battleAppearances || 0}
                            showStats={showStats}
                        />
                    </div>
                    <div className="bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/50">
                        <ProductCard 
                            item={pair[1]} 
                            onVote={() => handleVote(pair[1], pair[0])}
                            wins={pair[1].battleWins || 0}
                            appearances={pair[1].battleAppearances || 0}
                            showStats={showStats}
                        />
                    </div>
                </div>
            ) : <p className="text-gray-500">Could not load items for battle.</p>}
        </div>
    );
};

export default ProductBattlePage;
