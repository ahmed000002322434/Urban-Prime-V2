import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { itemService } from '../../services/itemService';
import type { GameUpload } from '../../types';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';

const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const GamepadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.207a.75.75 0 011.085.67V10.5m0 0h6m-6 0a.75.75 0 001.085.67l.415-.207m-7.252 5.25l-.415-.207a.75.75 0 010-1.34l.415-.207m7.252 5.25l.415-.207a.75.75 0 000-1.34l-.415-.207m0 0l-6 0" /></svg>;

const GameCard: React.FC<{ game: GameUpload, onDownload: (gameId: string) => void }> = ({ game, onDownload }) => {
    const cardRef = useScrollReveal<HTMLDivElement>();
    return (
        <div ref={cardRef} className="animate-reveal group bg-white dark:bg-dark-surface rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="relative aspect-video">
                <img src={game.coverImageUrl} alt={game.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs font-bold rounded-full">{game.category}</div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">{game.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">v{game.version}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3 flex-grow">{game.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-4 pt-2 border-t dark:border-gray-600">
                    <img src={game.uploader.avatar} alt={game.uploader.name} className="w-5 h-5 rounded-full" />
                    <span>by {game.uploader.name}</span>
                </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-surface/50 border-t dark:border-gray-700/50 flex justify-between items-center">
                <div className="text-sm">
                    <span className="font-bold">{game.downloads.toLocaleString()}</span>
                    <span className="text-gray-500"> downloads</span>
                </div>
                <button onClick={() => onDownload(game.id)} className="px-4 py-2 bg-primary text-white font-semibold rounded-md text-sm flex items-center gap-2 hover:opacity-90">
                    <DownloadIcon />
                    <span>{game.fileSize}</span>
                </button>
            </div>
        </div>
    );
};

const GamesHubPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const [games, setGames] = useState<GameUpload[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        setIsLoading(true);
        itemService.getGameUploads()
            .then(data => setGames(data))
            .finally(() => setIsLoading(false));
    }, []);

    const handleDownload = (gameId: string) => {
        itemService.recordGameDownload(gameId);
        // In a real app, you would initiate the download via game.fileUrl
        showNotification("Your download will begin shortly!");
        // Update local state to reflect new download count
        setGames(prev => prev.map(g => g.id === gameId ? {...g, downloads: g.downloads + 1} : g));
    };
    
    const filteredGames = useMemo(() => {
        return games.filter(game => {
            const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) || game.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || game.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [games, searchTerm, categoryFilter]);

    const categories = ['All', 'Indie Game', 'Mod', 'Resource Pack', 'Utility'];

    return (
        <div className="bg-gray-50 dark:bg-dark-background animate-fade-in-up min-h-screen">
            <section ref={heroRef} className="animate-reveal bg-white dark:bg-dark-surface border-b dark:border-gray-700">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <div className="text-5xl inline-block p-4 bg-primary/10 text-primary rounded-full mb-4"><GamepadIcon/></div>
                    <h1 className="text-5xl font-extrabold font-display text-gray-900 dark:text-dark-text">Community Games Hub</h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Discover, download, and share games, mods, and resources created by the Urban Prime community.</p>
                </div>
            </section>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
                    <div className="relative w-full md:max-w-xs">
                        <input
                            type="search"
                            placeholder="Search games..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded-full"
                        />
                         <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 overflow-x-auto p-1 bg-gray-200 dark:bg-dark-surface rounded-full">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap ${categoryFilter === cat ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                    <Link to="/upload-game" className="px-5 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 whitespace-nowrap">
                        + Upload a Game
                    </Link>
                </div>

                {isLoading ? <Spinner size="lg" /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredGames.map(game => <GameCard key={game.id} game={game} onDownload={handleDownload} />)}
                    </div>
                )}
                 {filteredGames.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <p className="text-gray-500">No games found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamesHubPage;