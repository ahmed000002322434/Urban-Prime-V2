
import React, { useEffect } from 'react';

const ContextualThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        const root = document.documentElement;

        // Remove legacy inline accents so each route can inherit from its active theme shell.
        root.style.removeProperty('--color-primary');
        root.style.removeProperty('--color-secondary');
    }, []);

    return <>{children}</>;
};

export default ContextualThemeWrapper;
