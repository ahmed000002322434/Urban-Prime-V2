import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { VerificationLevel } from '../../types';

const CheckCircleIcon: React.FC<{isCompleted: boolean}> = ({ isCompleted }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
        className={isCompleted ? 'text-green-500' : 'text-gray-300'}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const TrustAndVerificationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useAuth();
    if (!user) return null;

    const levelMap: Record<VerificationLevel, { level: number; text: string; progress: number }> = {
        'none': { level: 0, text: 'Unverified', progress: 10 },
        'level1': { level: 1, text: 'Level 1: Email Verified', progress: 50 },
        'level2': { level: 2, text: 'Level 2: ID Verified', progress: 100 },
    };

    const currentLevel = user.verificationLevel || 'none';
    const { level, text, progress } = levelMap[currentLevel];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Trust & Verification</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-6">
                    <div className="bg-gray-50 dark:bg-dark-background p-4 rounded-lg border dark:border-gray-600">
                        <h4 className="font-semibold text-sm">Your Current Level: <span className="text-primary">{text}</span></h4>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%`}}></div>
                        </div>
                    </div>
                     <ul className="space-y-3 mt-4">
                        <li className="flex items-center gap-3 p-3 bg-white dark:bg-dark-surface rounded-lg border dark:border-gray-600">
                            <CheckCircleIcon isCompleted={level >= 1} />
                            <div>
                                <p className="font-semibold text-sm">Level 1: Verify your email</p>
                            </div>
                            {level >= 1 && <span className="ml-auto text-xs font-bold text-green-600">COMPLETED</span>}
                        </li>
                        <li className="flex items-center gap-3 p-3 bg-white dark:bg-dark-surface rounded-lg border dark:border-gray-600">
                            <CheckCircleIcon isCompleted={level >= 2} />
                            <div>
                                <p className="font-semibold text-sm">Level 2: Verify your Identity</p>
                            </div>
                            {level < 2 && <button className="ml-auto px-3 py-1 text-xs bg-black text-white font-semibold rounded-md">Verify Now</button>}
                            {level >= 2 && <span className="ml-auto text-xs font-bold text-green-600">COMPLETED</span>}
                        </li>
                    </ul>
                </main>
            </div>
        </div>
    );
};

export default TrustAndVerificationModal;

