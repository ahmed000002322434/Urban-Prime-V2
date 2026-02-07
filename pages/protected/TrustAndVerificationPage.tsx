import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { VerificationLevel } from '../../types';

const CheckCircleIcon: React.FC<{isCompleted: boolean}> = ({ isCompleted }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
        className={isCompleted ? 'text-green-500' : 'text-gray-300'}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const TrustAndVerificationPage: React.FC = () => {
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
        <div className="bg-surface p-8 rounded-xl shadow-soft border border-border">
            <h1 className="text-2xl font-bold border-b border-border pb-4 mb-6 font-display">Trust & Verification</h1>
            
            <div className="bg-surface-soft p-6 rounded-lg border border-border">
                <h3 className="font-bold">Your Current Level: <span className="text-primary">{text}</span></h3>
                <div className="mt-4">
                    <div className="w-full bg-background rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`}}></div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="font-bold mb-4">How to increase your trust level:</h3>
                <ul className="space-y-4">
                    <li className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
                        <CheckCircleIcon isCompleted={level >= 1} />
                        <div>
                            <p className="font-semibold">Level 1: Verify your email</p>
                            <p className="text-sm text-text-secondary">A verified email is required for all accounts.</p>
                        </div>
                        {level >= 1 && <span className="ml-auto text-sm font-bold text-green-600">Completed</span>}
                    </li>
                    <li className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
                        <CheckCircleIcon isCompleted={level >= 2} />
                        <div>
                            <p className="font-semibold">Level 2: Verify your Identity</p>
                            <p className="text-sm text-text-secondary">Submit a government-issued ID to get the 'ID Verified' badge.</p>
                        </div>
                         {level < 2 && <button className="ml-auto px-4 py-2 text-sm bg-text-primary text-background font-semibold rounded-md hover:opacity-90">Verify Now</button>}
                         {level >= 2 && <span className="ml-auto text-sm font-bold text-green-600">Completed</span>}
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default TrustAndVerificationPage;
