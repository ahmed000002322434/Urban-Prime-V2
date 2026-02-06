
import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;

interface BackButtonProps {
  className?: string;
  to?: string;
  text?: string;
  alwaysShowText?: boolean; // Kept for compatibility but 'text' is preferred
}

const BackButton: React.FC<BackButtonProps> = ({ className, to, text, alwaysShowText = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };
  
  const buttonText = text || (alwaysShowText ? 'Back' : null);

  return (
    <button 
        onClick={handleClick} 
        className={`group flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold hover:text-black dark:hover:text-white transition-colors ${className}`}
        aria-label="Go back"
    >
        <div className="transition-transform duration-300 ease-out group-hover:-translate-x-1.5">
            <BackIcon />
        </div>
        {buttonText && <span>{buttonText}</span>}
    </button>
  );
};

export default BackButton;
