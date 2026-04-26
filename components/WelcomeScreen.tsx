
import React, { useEffect, useRef } from 'react';

interface WelcomeScreenProps {
    onComplete?: () => void;
}

const UrbanPrimeLogo: React.FC = () => (
    <svg 
        width="100" 
        height="100" 
        viewBox="0 0 100 100" 
        className="opacity-0" 
        style={{ animation: 'logo-fade-in 0.5s ease-out 0.2s forwards' }}
    >
        {/* Bag shape (body and handle combined) */}
        <path
            d="M 25 90 L 35 30 H 65 L 75 90 Z M 40 30 C 40 10, 60 10, 60 30"
            fill="transparent"
            stroke="var(--color-text-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                strokeDasharray: 285,
                strokeDashoffset: 285,
                animation: `svg-draw 2s ease-out 0.5s forwards`,
            }}
        />
        {/* Star shape */}
        <path
            d="M 65 35 L 67 40 L 72 40 L 68 43 L 70 48 L 65 45 L 60 48 L 62 43 L 58 40 L 63 40 Z"
            fill="transparent"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                strokeDasharray: 150,
                strokeDashoffset: 150,
                animation: `svg-draw 0.8s ease-out 2.0s forwards, svg-fill-in-primary 0.4s ease-out 2.6s forwards`,
            }}
        />
    </svg>
);


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
    const tagline = "Experience Luxury On Demand";
    const completedRef = useRef(false);

    const finish = () => {
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete?.();
    };

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            finish();
        }, 5200);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        finish();
    };

    return (
        <div 
            className="pointer-events-none fixed inset-0 bg-background z-[100] flex flex-col justify-center items-center text-text-primary transition-colors duration-300" 
            style={{ animation: 'welcome-fade-out 0.5s ease-in-out 4.5s forwards' }}
            onAnimationEnd={handleAnimationEnd}
            aria-hidden="true"
        >
            <UrbanPrimeLogo />
            
            <h1 
                className="text-4xl md:text-5xl font-serif-display font-bold tracking-wider mt-6 opacity-0"
                style={{ animation: `subtle-fade-in-up 1s ease-out 2.8s forwards` }}
            >
                URBAN <span className="text-primary">PRIME</span>
            </h1>

            <p 
                className="mt-3 text-sm md:text-base text-text-secondary tracking-widest uppercase opacity-0"
                style={{ animation: 'subtle-fade-in-up 1s ease-out 3.1s forwards' }}
            >
                {tagline}
            </p>
        </div>
    );
};

export default WelcomeScreen;
