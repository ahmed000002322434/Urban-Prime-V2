import React from 'react';

const ConstructionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-slate-300 dark:text-gray-700">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const NotificationsSettingsPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-surface p-8 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 font-display text-light-text dark:text-dark-text">Notifications</h2>
            <div className="text-center py-16">
                <ConstructionIcon />
                <p className="font-semibold mt-6 text-xl">Coming Soon!</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    We're working on giving you more control over your notifications.
                </p>
            </div>
        </div>
    );
};

export default NotificationsSettingsPage;