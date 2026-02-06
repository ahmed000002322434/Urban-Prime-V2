
import React, { useEffect, useState } from 'react';

interface PremiumLoaderProps {
    isLoading: boolean;
}

const PremiumLoader: React.FC<PremiumLoaderProps> = ({ isLoading }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!isLoading) {
            // Allow animation to finish before unmounting
            const timer = setTimeout(() => setIsVisible(false), 1500);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(true);
        }
    }, [isLoading]);

    if (!isVisible) return null;

    return (
        <div className={`curtain-loader ${!isLoading ? 'loaded' : ''}`}>
            <div className="curtain-panel curtain-left flex items-center justify-end pr-4">
                <div className="h-32 w-1 bg-white/20 rounded-full opacity-50"></div>
            </div>
            <div className="curtain-panel curtain-right flex items-center justify-start pl-4">
                 <div className="h-32 w-1 bg-white/20 rounded-full opacity-50"></div>
            </div>
            
            {/* Centered Logo/Text that fades out */}
            <div className={`fixed inset-0 flex flex-col items-center justify-center z-[10000] transition-opacity duration-500 ${!isLoading ? 'opacity-0' : 'opacity-100'}`}>
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter font-display mb-2">
                    URBAN <span className="text-[#0fb9b1]">PRIME</span>
                </h1>
                <p className="text-gray-400 text-sm tracking-[0.5em] uppercase">Luxury Marketplace</p>
            </div>
        </div>
    );
};

export default PremiumLoader;
