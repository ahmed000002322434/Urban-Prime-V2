import React from 'react';
import { Link } from 'react-router-dom';

const PermissionsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-sm animate-fade-in-up text-center p-8" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-light-text dark:text-dark-text">App Permissions</h3>
                <p className="text-sm text-gray-500 mt-2">Manage app permissions from your main dashboard settings.</p>
                <Link to="/profile/settings" onClick={onClose} className="mt-6 inline-block bg-primary text-white font-bold py-2 px-6 rounded-lg text-sm">
                    Go to Settings
                </Link>
            </div>
        </div>
    );
};

export default PermissionsModal;
