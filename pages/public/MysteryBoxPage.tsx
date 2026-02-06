
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../../components/BackButton';

const MysteryBoxPage: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4 overflow-hidden relative">
            <BackButton className="absolute top-8 left-8 text-white" />
            
            <div className="text-center mb-12 relative z-10">
                <h1 className="text-5xl md:text-7xl font-black text-white font-display tracking-tighter">MYSTERY BOX</h1>
                <p className="text-purple-400 text-lg">Guaranteed value. Infinite surprise.</p>
            </div>

            <motion.div 
                className="relative w-64 h-64 cursor-pointer"
                onClick={() => setIsOpen(true)}
                animate={isOpen ? { scale: 0, opacity: 0 } : { y: [0, -20, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Glowing Cube CSS representation */}
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-900 rounded-3xl shadow-[0_0_100px_rgba(124,58,237,0.5)] border-4 border-purple-400/50 flex items-center justify-center">
                    <span className="text-6xl">🎁</span>
                </div>
            </motion.div>

            {isOpen && (
                <motion.div 
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute z-20 bg-white p-8 rounded-2xl text-center shadow-2xl max-w-md"
                >
                    <h2 className="text-3xl font-bold mb-2">You Found It!</h2>
                    <div className="my-6">
                        <img src="https://picsum.photos/seed/camera/400/400" className="w-full rounded-lg" />
                    </div>
                    <p className="text-xl font-bold mb-4">Sony Alpha a7 III</p>
                    <p className="text-gray-500 text-sm">Value: $1,999</p>
                    <button onClick={() => setIsOpen(false)} className="mt-6 w-full py-3 bg-black text-white font-bold rounded-lg">Claim Item</button>
                </motion.div>
            )}
        </div>
    );
};

export default MysteryBoxPage;
