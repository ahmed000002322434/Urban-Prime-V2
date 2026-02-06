import React, { useState, useEffect } from 'react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-red-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsMounted(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  };

  const handleConfirm = () => {
    setIsMounted(false);
    setTimeout(onConfirm, 300);
  };

  if (!isOpen) {
    return null;
  }

  const backdropClasses = isMounted ? 'opacity-100' : 'opacity-0';
  const modalClasses = isMounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0';

  return (
    <div
      className={`fixed inset-0 z-[101] flex items-center justify-center p-4 transition-opacity duration-300 ${backdropClasses}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60"></div>
      <div
        className={`relative bg-white dark:bg-dark-surface w-full max-w-sm p-8 rounded-2xl shadow-2xl text-center transition-all duration-300 ${modalClasses}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
            <LogoutIcon />
        </div>
        <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-dark-text">Sign Out?</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Are you sure you want to sign out of your account?</p>
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-dark-text font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;