
import React, { useState } from 'react';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';
import { motion } from 'framer-motion';

const VersusPage: React.FC = () => {
    const [itemA, setItemA] = useState<Item | null>(null);
    const [itemB, setItemB] = useState<Item | null>(null);
    const [winner, setWinner] = useState<Item | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Mock items for demo if none selected
    const handleSimulate = async () => {
        setAnalyzing(true);
        setWinner(null);
        // Simulate AI Analysis
        setTimeout(() => {
            setAnalyzing(false);
            setWinner(Math.random() > 0.5 ? itemA : itemB);
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
            <BackButton className="self-start text-white mb-8" />
            
            <h1 className="text-5xl font-black font-display italic mb-12 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500">
                VERSUS ARENA
            </h1>

            <div className="flex flex-col md:flex-row gap-12 items-center w-full max-w-6xl">
                {/* Fighter A */}
                <div className="flex-1 bg-gray-800 p-6 rounded-2xl border-2 border-red-500/50 w-full text-center min-h-[400px] flex flex-col items-center justify-center">
                    {itemA ? (
                        <>
                            <img src={itemA.imageUrls[0]} className="w-full h-64 object-cover rounded-xl mb-4" />
                            <h2 className="text-2xl font-bold">{itemA.title}</h2>
                            <p className="text-xl font-mono text-red-400">${itemA.salePrice}</p>
                        </>
                    ) : (
                        <button className="px-6 py-3 bg-red-600 rounded-full font-bold hover:bg-red-500">Select Challenger A</button>
                    )}
                </div>

                {/* VS Badge */}
                <div className="relative z-10">
                    <div className="text-6xl font-black italic bg-white text-black px-6 py-2 rounded-lg transform -skew-x-12 shadow-[0_0_50px_rgba(255,255,255,0.5)]">
                        VS
                    </div>
                </div>

                {/* Fighter B */}
                <div className="flex-1 bg-gray-800 p-6 rounded-2xl border-2 border-blue-500/50 w-full text-center min-h-[400px] flex flex-col items-center justify-center">
                     {itemB ? (
                        <>
                             <img src={itemB.imageUrls[0]} className="w-full h-64 object-cover rounded-xl mb-4" />
                             <h2 className="text-2xl font-bold">{itemB.title}</h2>
                             <p className="text-xl font-mono text-blue-400">${itemB.salePrice}</p>
                        </>
                    ) : (
                        <button className="px-6 py-3 bg-blue-600 rounded-full font-bold hover:bg-blue-500">Select Challenger B</button>
                    )}
                </div>
            </div>

            <button 
                onClick={handleSimulate}
                className="mt-16 px-12 py-6 bg-gradient-to-r from-red-600 to-blue-600 rounded-full font-black text-2xl tracking-widest hover:scale-105 transition-transform shadow-2xl"
            >
                {analyzing ? "AI ANALYZING..." : "FIGHT!"}
            </button>

            {winner && (
                <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                >
                    <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 p-1 rounded-2xl">
                        <div className="bg-gray-900 p-12 rounded-xl text-center">
                            <h2 className="text-4xl font-black text-yellow-400 mb-4">WINNER!</h2>
                            <h3 className="text-2xl text-white">{winner.title}</h3>
                            <p className="text-gray-400 mt-4">AI chose this for better value & specs.</p>
                            <button onClick={() => setWinner(null)} className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full">Close</button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default VersusPage;
