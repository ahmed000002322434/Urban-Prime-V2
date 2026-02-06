import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ThreeDPreviewProps {
  imageUrl: string;
  alt: string;
  is3dEnabled?: boolean;
}

const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({ imageUrl, alt, is3dEnabled = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: -10, y: 20 }); // Start with a slight angle
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    if(containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();

    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    
    const newRotation = {
        y: rotation.y + dx * 0.5, // Sensitivity adjustment
        x: rotation.x - dy * 0.5,
    };
    
    containerRef.current.style.transform = `perspective(1000px) rotateX(${newRotation.x}deg) rotateY(${newRotation.y}deg)`;
  }, [isDragging, startPos, rotation]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    if(containerRef.current) containerRef.current.style.cursor = 'grab';

    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    setRotation(prev => ({
        y: prev.y + dx * 0.5,
        x: prev.x - dy * 0.5,
    }));
  }, [isDragging, startPos]);

  useEffect(() => {
    if (is3dEnabled) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    } else {
        // If 3D is turned off, reset the transform
        if (containerRef.current) {
            containerRef.current.style.transform = '';
        }
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [is3dEnabled, handleMouseMove, handleMouseUp]);


  return (
    <div
      ref={containerRef}
      onMouseDown={is3dEnabled ? handleMouseDown : undefined}
      className="w-full h-full rounded-lg shadow-lg overflow-hidden transition-transform duration-300"
      style={{ 
          cursor: is3dEnabled ? 'grab' : 'default',
          transform: is3dEnabled ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` : '',
          willChange: 'transform' 
      }}
    >
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover pointer-events-none" // Prevents default image drag behavior
        data-item-image
      />
    </div>
  );
};

export default ThreeDPreview;