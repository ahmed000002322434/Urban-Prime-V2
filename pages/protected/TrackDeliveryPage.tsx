
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import BackButton from '../../components/BackButton';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner';

// --- Icons ---
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const CarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" className="text-black dark:text-white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 drop-shadow-md"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
const NavigationArrow = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-primary drop-shadow-lg filter"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>;

const mockDriver = {
    name: "Alex Rivera",
    rating: 4.9,
    trips: 1842,
    vehicle: "Tesla Model 3",
    plate: "UP-8821",
    avatar: "https://i.pravatar.cc/150?img=11",
    phone: "+1234567890"
};

const TrackDeliveryPage: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [eta, setEta] = useState(15);
    const [status, setStatus] = useState("Heading to pickup");
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Simulate real-time progress
    useEffect(() => {
        setIsLoaded(true);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setStatus("Arrived at destination");
                    return 100;
                }
                
                // Dynamic ETA and Status
                const newProgress = prev + 0.2; // Move slowly
                
                if (newProgress < 20) setStatus("Heading to pickup point");
                else if (newProgress < 30) setStatus("Picking up package");
                else if (newProgress < 80) setStatus("On the way to you");
                else if (newProgress < 95) setStatus("Arriving soon");
                else setStatus("Arriving now");
                
                const remaining = Math.max(1, Math.ceil(15 * (1 - newProgress / 100)));
                setEta(remaining);
                
                return newProgress;
            });
        }, 100); // Update every 100ms
        
        return () => clearInterval(interval);
    }, []);

    // --- MAP DRAWING CONSTANTS ---
    // A simplified S-curve path for the "map"
    // ViewBox: 0 0 400 600
    const startPoint = { x: 50, y: 100 }; // Pickup (Top Leftish)
    const endPoint = { x: 350, y: 500 };   // Dropoff (Bottom Rightish)
    const controlPoint1 = { x: 350, y: 100 };
    const controlPoint2 = { x: 50, y: 500 };
    
    const pathD = `M ${startPoint.x} ${startPoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPoint.x} ${endPoint.y}`;

    // Calculate current position along the path
    // Simplified cubic bezier interpolation for visual representation (not mathematically perfect but visually sufficient for a demo)
    const getPointOnBezier = (t: number) => {
        // t is 0 to 1
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        const x = uuu * startPoint.x + 3 * uu * t * controlPoint1.x + 3 * u * tt * controlPoint2.x + ttt * endPoint.x;
        const y = uuu * startPoint.y + 3 * uu * t * controlPoint1.y + 3 * u * tt * controlPoint2.y + ttt * endPoint.y;
        
        // Very basic rotation estimation (angle between current and next point)
        const nextT = Math.min(1, t + 0.01);
        const nextX = (1 - nextT) ** 3 * startPoint.x + 3 * (1 - nextT) ** 2 * nextT * controlPoint1.x + 3 * (1 - nextT) * nextT ** 2 * controlPoint2.x + nextT ** 3 * endPoint.x;
        const nextY = (1 - nextT) ** 3 * startPoint.y + 3 * (1 - nextT) ** 2 * nextT * controlPoint1.y + 3 * (1 - nextT) * nextT ** 2 * controlPoint2.y + nextT ** 3 * endPoint.y;
        
        const rotation = Math.atan2(nextY - y, nextX - x) * (180 / Math.PI) + 90; // +90 because icon points up by default

        return { x, y, rotation };
    };

    const currentPos = getPointOnBezier(progress / 100);

    if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><Spinner size="lg" /></div>;

    return (
        <div className="relative h-screen w-full bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent pb-12">
                <BackButton className="bg-white/90 dark:bg-black/50 p-2 rounded-full shadow-lg backdrop-blur-md !text-black dark:!text-white" />
            </div>

            {/* MAP AREA */}
            <div className="absolute inset-0 z-0 bg-[#e5e7eb] dark:bg-[#1a1a1a]">
                 {/* Map Grid Pattern */}
                <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ 
                    backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                    backgroundSize: '40px 40px' 
                }}></div>

                <svg viewBox="0 0 400 600" className="w-full h-full preserve-3d">
                    {/* Route Line Shadow */}
                    <path d={pathD} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="8" strokeLinecap="round" />
                    {/* Active Route Line */}
                    <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 10" className="animate-pulse" />
                    
                    {/* Pickup Point */}
                    <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
                         <circle r="12" fill="var(--color-primary)" fillOpacity="0.2" className="animate-ping" />
                         <circle r="6" fill="var(--color-primary)" />
                    </g>
                    
                     {/* Dropoff Point */}
                    <g transform={`translate(${endPoint.x}, ${endPoint.y})`}>
                         <circle r="12" fill="#ef4444" fillOpacity="0.2" className="animate-ping" style={{animationDuration: '2s'}} />
                         <circle r="6" fill="#ef4444" />
                    </g>

                    {/* Moving Vehicle */}
                    <g 
                        transform={`translate(${currentPos.x}, ${currentPos.y}) rotate(${currentPos.rotation})`} 
                        className="drop-shadow-xl transition-transform duration-100 ease-linear"
                    >
                        <circle r="16" fill="white" className="dark:fill-black" stroke="var(--color-primary)" strokeWidth="3" />
                         <NavigationArrow />
                    </g>
                </svg>
            </div>

            {/* BOTTOM SHEET */}
            <div className="absolute bottom-0 left-0 right-0 z-30">
                {/* Status Card */}
                <div className="mx-4 mb-4 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{status}</h2>
                        <div className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 rounded-full text-xs font-bold">
                            {eta} min
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear", duration: 0.1 }}
                        />
                    </div>
                </div>

                {/* Driver Info Panel */}
                <div className="bg-white dark:bg-[#121212] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-8 border-t border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <img src={mockDriver.avatar} alt={mockDriver.name} className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md" />
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-0.5 border border-gray-100 dark:border-gray-700">
                                <StarIcon />
                                <span className="text-xs font-bold dark:text-white">{mockDriver.rating}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{mockDriver.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{mockDriver.vehicle} • {mockDriver.plate}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{mockDriver.trips} trips</p>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-xl">
                            <CarIcon />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <button className="flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-colors">
                            <MessageIcon /> Message
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <PhoneIcon /> Call
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackDeliveryPage;

