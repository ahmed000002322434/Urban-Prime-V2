
import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';

interface VirtualTryOnModalProps {
    imageUrl: string;
    onClose: () => void;
}

const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({ imageUrl, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionError, setPermissionError] = useState(false);
    
    // Simple positioning state for the overlay
    const [position, setPosition] = useState({ x: 50, y: 50, scale: 1 });

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsLoading(false);
            } catch (err) {
                console.error("Camera access denied", err);
                setPermissionError(true);
                setIsLoading(false);
            }
        };
        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>, prop: 'x' | 'y' | 'scale') => {
        setPosition(prev => ({ ...prev, [prop]: parseFloat(e.target.value) }));
    };

    return (
        <div className="fixed inset-0 z-[102] bg-black flex flex-col animate-fade-in-up">
             <div className="absolute top-4 right-4 z-50">
                <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white backdrop-blur-md">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
                {isLoading && <div className="absolute z-20 text-white flex flex-col items-center"><Spinner /> <p className="mt-2">Starting Camera...</p></div>}
                
                {permissionError ? (
                    <div className="text-center text-white p-8">
                        <p className="text-xl font-bold mb-2">Camera Access Needed</p>
                        <p className="text-gray-400">Please allow camera access to use Virtual Try-On.</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 bg-white text-black rounded-full font-bold">Close</button>
                    </div>
                ) : (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover transform scale-x-[-1]" 
                        />
                        {/* Simulated AR Overlay */}
                        {!isLoading && (
                            <div 
                                className="absolute pointer-events-none"
                                style={{
                                    left: `${position.x}%`,
                                    top: `${position.y}%`,
                                    transform: `translate(-50%, -50%) scale(${position.scale})`,
                                    width: '40%', 
                                }}
                            >
                                <img src={imageUrl} alt="Try On Item" className="w-full h-auto drop-shadow-2xl" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Controls */}
            {!permissionError && (
                <div className="bg-white dark:bg-dark-surface p-6 pb-8 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-40">
                    <h3 className="text-center font-bold mb-4 dark:text-white">Adjust Position</h3>
                    <div className="space-y-4 max-w-md mx-auto">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold w-12 dark:text-gray-400">Size</span>
                            <input type="range" min="0.5" max="2" step="0.1" value={position.scale} onChange={e => handleRangeChange(e, 'scale')} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold w-12 dark:text-gray-400">Horizontal</span>
                            <input type="range" min="0" max="100" value={position.x} onChange={e => handleRangeChange(e, 'x')} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold w-12 dark:text-gray-400">Vertical</span>
                            <input type="range" min="0" max="100" value={position.y} onChange={e => handleRangeChange(e, 'y')} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                        </div>
                        <button className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
                            📸 Snap Photo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualTryOnModal;
