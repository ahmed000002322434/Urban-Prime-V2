
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import type { User } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

const SwitchAccountsPage: React.FC = () => {
    const { user: currentUser, switchUser } = useAuth();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setIsLoading(true);
        userService.getAllSellers() // Using getAllSellers as a proxy for all users
            .then(setAllUsers)
            .finally(() => setIsLoading(false));
    }, []);

    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);

    if (isLoading) {
        return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold font-display text-text-primary">Switch Accounts</h1>
            </div>
            
            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                <h2 className="font-bold text-lg text-text-primary mb-4">Current Account</h2>
                {currentUser && (
                    <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-4 border-l-4 border-primary">
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-12 h-12 rounded-full" />
                        <div>
                            <p className="font-bold text-text-primary">{currentUser.name}</p>
                            <p className="text-sm text-text-secondary">{currentUser.email}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-soft border border-border">
                <h2 className="font-bold text-lg text-text-primary mb-4">Other Available Accounts</h2>
                <div className="space-y-3">
                    {otherUsers.map(user => (
                        <div key={user.id} className="p-3 rounded-lg flex items-center justify-between hover:bg-surface-soft transition-colors">
                            <div className="flex items-center gap-4">
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-semibold text-text-primary">{user.name}</p>
                                    <p className="text-xs text-text-secondary">{user.email}</p>
                                </div>
                            </div>
                            <button onClick={() => switchUser(user.id)} className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                Switch
                            </button>
                        </div>
                    ))}
                    <button onClick={() => navigate('/auth')} className="w-full p-3 mt-4 rounded-lg flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary hover:text-primary transition-colors text-text-secondary font-semibold">
                        <PlusIcon /> Add another account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SwitchAccountsPage;
