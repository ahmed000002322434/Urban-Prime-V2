
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ContextualThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();

    useEffect(() => {
        const root = document.documentElement;
        
        // Reset base variables
        root.style.setProperty('--color-primary', '#0fb9b1');
        root.style.setProperty('--color-secondary', '#f39c12');

        if (location.pathname.includes('/clothing')) {
            // Pastel/Soft for Fashion
            root.style.setProperty('--color-primary', '#ec4899'); // Pink
            root.style.setProperty('--color-secondary', '#8b5cf6'); // Purple
        } else if (location.pathname.includes('/electronics') || location.pathname.includes('/tech')) {
             // Cyber/Dark for Tech
             root.style.setProperty('--color-primary', '#3b82f6'); // Blue
             root.style.setProperty('--color-secondary', '#06b6d4'); // Cyan
        } else if (location.pathname.includes('/garden') || location.pathname.includes('/nature')) {
             // Earthy for Nature
             root.style.setProperty('--color-primary', '#22c55e'); // Green
             root.style.setProperty('--color-secondary', '#854d0e'); // Brown
        }
    }, [location]);

    return <>{children}</>;
};

export default ContextualThemeWrapper;
