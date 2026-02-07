import React, { createContext, useState, useCallback, useMemo, useContext } from 'react';
import { AuthContext } from './AuthContext';

interface AnimationParams {
    startX: number;
    startY: number;
    translateX: number;
    translateY: number;
    scale: number;
}

interface AnimationContextType {
    isAuthTransitioning: boolean;
    authAnimationParams: AnimationParams | null;
    startAuthTransition: (element: HTMLElement) => void;
}

export const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const authContext = useContext(AuthContext);
    const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
    const [authAnimationParams, setAuthAnimationParams] = useState<AnimationParams | null>(null);

    const startAuthTransition = useCallback((element: HTMLElement) => {
        const startRect = element.getBoundingClientRect();

        // Approximate end position and size of the modal title
        const modalWidth = 448; // max-w-md
        const modalPadding = 40; // p-10
        const modalTopMargin = window.innerHeight * 0.15; // Rough vertical position
        const titleFontSize = 24; // text-2xl
        const titleHeight = 32; // Estimated height for a text-2xl title
        
        const endRect = {
            width: 55, // Estimated width of "Login" at 2xl
            height: titleHeight,
            left: (window.innerWidth - modalWidth) / 2 + modalPadding,
            top: modalTopMargin + modalPadding
        };

        const startX = startRect.left;
        const startY = startRect.top;
        
        // Translate from the center of the start element to the center of the end element
        const translateX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
        const translateY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);
        
        // Scale based on font size change (text-lg to text-2xl)
        const scale = 1.33;

        setAuthAnimationParams({ startX, startY, translateX, translateY, scale });
        setIsAuthTransitioning(true);

        setTimeout(() => {
            if (authContext?.openAuthModal) {
                authContext.openAuthModal('login');
            } else {
                // Fallback if AuthProvider isn't mounted for any reason.
                window.location.hash = '#/auth';
            }
        }, 100);

        setTimeout(() => {
            setIsAuthTransitioning(false);
            setAuthAnimationParams(null);
        }, 500);
    }, [authContext]);

    const value = useMemo(() => ({
        isAuthTransitioning,
        authAnimationParams,
        startAuthTransition,
    }), [isAuthTransitioning, authAnimationParams, startAuthTransition]);

    return (
        <AnimationContext.Provider value={value}>
            {children}
        </AnimationContext.Provider>
    );
};
