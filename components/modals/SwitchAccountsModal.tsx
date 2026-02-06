import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import type { User } from '../../types';
import Spinner from '../Spinner';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

const SwitchAccountsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user: currentUser, switchUser } = useAuth();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        userService.getAllSellers()
            .then(setAllUsers)
            .finally(() => setIsLoading(false));
    }, []);

    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Switch Accounts</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <Spinner /> : (
                        <div className="space-y-2">
                            {otherUsers.map(user => (
                                <div key={user.id} className="p-2 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-background">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{user.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => switchUser(user.id)} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 font-semibold rounded-md">
                                        Switch
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => navigate('/auth')} className="w-full mt-2 p-2 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg text-gray-500 hover:border-primary hover:text-primary">
                                <PlusIcon /> Add Account
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SwitchAccountsModal;
