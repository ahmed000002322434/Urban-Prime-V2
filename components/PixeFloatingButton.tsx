
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ReelsIcon = () => <img src="https://i.ibb.co/jkyfqdFV/Gemini-Generated-Image-gqj0u3gqj0u3gqj0.png" alt="Pixe Logo" className="w-6 h-6 object-contain" />;

const PixeFloatingButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Visible when scrolled down 300px, similar to back-to-top button
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    // Trigger on mount in case user refreshes mid-page
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <Link
      to="/reels"
      className={`pixe-floating-btn ${isVisible ? 'is-visible' : ''}`}
      aria-label="Go to Pixe feed"
    >
      <ReelsIcon />
    </Link>
  );
};

export default PixeFloatingButton;
