
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import BackButton from '../../components/BackButton';

const Card3D: React.FC<{ tier: string; color: string; price: string }> = ({ tier, color, price }) => {
    return (
        <motion.div 
            whileHover={{ rotateY: 15, rotateX: -5, scale: 1.05 }}
            className={`relative w-80 h-[450px] rounded-3xl p-8 flex flex-col justify-between overflow-hidden shadow-2xl ${color}`}
            style={{ perspective: 1000 }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
                <h3 className="text-3xl font-black text-white font-display tracking-widest uppercase">{tier}</h3>
                <p className="text-white/80 text-sm mt-2">NFT Membership</p>
            </div>

            <div className="relative z-10 text-center">
                <div className="text-6xl font-black text-white drop-shadow-md">{price}</div>
                <div className="text-white/80 text-xs uppercase tracking-widest mt-2">ETH</div>
            </div>

            <div className="relative z-10">
                <ul className="text-white/90 text-sm space-y-2 mb-6">
                    <li>✓ 0% Transaction Fees</li>
                    <li>✓ Exclusive Drops</li>
                    <li>✓ Luxury Event Invites</li>
                </ul>
                <button className="w-full py-3 bg-white text-black font-bold rounded-xl shadow-lg hover:bg-gray-100 transition-colors">
                    Mint Pass
                </button>
            </div>
        </motion.div>
    );
};

const PrimePassPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-gold-500 selection:text-black font-sans overflow-hidden">
            <div className="absolute top-8 left-8 z-50">
                <BackButton className="text-white hover:text-yellow-400" />
            </div>

            <div className="relative container mx-auto px-4 py-20 flex flex-col items-center">
                <motion.h1 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 font-display text-center mb-6"
                >
                    PRIME PASS
                </motion.h1>
                <p className="text-xl text-gray-400 max-w-2xl text-center mb-16">
                    Unlock the ultimate Urban Prime experience. Your status, immortalized on the blockchain.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 perspective-1000">
                    <Card3D tier="Silver" color="bg-gradient-to-br from-gray-400 to-gray-600" price="0.5" />
                    <div className="transform md:-translate-y-12">
                         <Card3D tier="Gold" color="bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600" price="1.0" />
                    </div>
                    <Card3D tier="Platinum" color="bg-gradient-to-br from-slate-800 to-black border border-gray-700" price="2.5" />
                </div>
            </div>
        </div>
    );
};

export default PrimePassPage;
