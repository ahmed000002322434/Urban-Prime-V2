
import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor: React.FC = () => {
    const [isHovering, setIsHovering] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    
    const springConfig = { damping: 25, stiffness: 150 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if hovering over clickable elements
            if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a') || target.getAttribute('role') === 'button') {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, [cursorX, cursorY]);

    return (
        <>
            <motion.div 
                className="custom-cursor"
                style={{
                    left: cursorXSpring,
                    top: cursorYSpring,
                    scale: isHovering ? 2.5 : 1,
                    backgroundColor: isHovering ? 'rgba(15, 185, 177, 0.1)' : 'transparent',
                    borderColor: isHovering ? 'transparent' : '#0fb9b1'
                }}
            />
            <div 
                className="custom-cursor-dot"
                style={{
                    left: cursorX.get(), // Use direct value for dot to reduce lag
                    top: cursorY.get(),
                    opacity: isHovering ? 0 : 1
                }}
                ref={(el) => {
                    if (el) {
                         // Manual update for performance
                         const updatePos = () => {
                             el.style.left = cursorX.get() + 'px';
                             el.style.top = cursorY.get() + 'px';
                             requestAnimationFrame(updatePos);
                         }
                         requestAnimationFrame(updatePos);
                    }
                }}
            />
        </>
    );
};

export default CustomCursor;
