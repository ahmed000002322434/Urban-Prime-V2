import React from 'react';
import { useAnimation } from '../hooks/useAnimation';

const AuthTransition: React.FC = () => {
    const { isAuthTransitioning, authAnimationParams } = useAnimation();

    if (!isAuthTransitioning || !authAnimationParams) {
        return null;
    }

    const { startX, startY, translateX, translateY, scale } = authAnimationParams;

    const style = {
        '--start-x': `${startX}px`,
        '--start-y': `${startY}px`,
        '--translate-x': `${translateX}px`,
        '--translate-y': `${translateY}px`,
        '--scale': `${scale}`,
        left: '0px',
        top: '0px',
        transform: `translate(${startX}px, ${startY}px)`
    } as React.CSSProperties;

    return (
        <div 
            style={style}
            className={`animate-fly-out-auth`}
        >
            Login
        </div>
    );
};

export default AuthTransition;