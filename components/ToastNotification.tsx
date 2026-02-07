import React from 'react';

interface ToastNotificationProps {
  message: string;
}

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[101] animate-fade-in-up">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
            <CheckCircleIcon />
            <p className="font-semibold text-gray-800 dark:text-white">{message}</p>
        </div>
    </div>
  );
};

export default ToastNotification;

