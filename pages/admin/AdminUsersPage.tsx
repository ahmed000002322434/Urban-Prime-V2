



import React, { useState, useEffect, useCallback } from 'react';
// FIX: Updated adminService import to point to the consolidated service file.
import { adminService } from '../../services/adminService';
import type { User, VerificationLevel } from '../../types';
import Spinner from '../../components/Spinner';

const AdminUsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'unverified'>('all');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const usersData = await adminService.getAllUsers();
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleToggleVerification = async (userId: string, currentLevel: VerificationLevel | undefined) => {
        const newLevel: VerificationLevel = currentLevel === 'level2' ? 'level1' : 'level2';
        await adminService.updateUser(userId, { verificationLevel: newLevel });
        fetchUsers(); // Refetch to show update
    };
    
    const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'suspended' | undefined) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        await adminService.updateUser(userId, { status: newStatus });
        fetchUsers();
    };


    const handleDeleteUser = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user? This action is irreversible.")) {
            await adminService.deleteUser(userId);
            fetchUsers();
        }
    };

    const verificationRequests = users.filter(u => u.verificationDocs?.some(d => d.status === 'pending'));
    const filteredUsers = activeTab === 'all' ? users : verificationRequests;

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-dark-text">Manage Users</h1>
            
            <div className="border-b mb-4">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>All Users</button>
                <button onClick={() => setActiveTab('unverified')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'unverified' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>
                    Verification Requests ({verificationRequests.length})
                </button>
            </div>

            {isLoading ? <Spinner size="lg" /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3">User</th>
                                <th scope="col" className="px-6 py-3">Verification</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="bg-white dark:bg-dark-surface border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <p>{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleToggleVerification(user.id, user.verificationLevel)} className={`px-2 py-1 text-xs font-semibold rounded-full ${user.verificationLevel === 'level2' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {user.verificationLevel === 'level2' ? 'Verified' : user.verificationDocs?.some(d => d.status === 'pending') ? 'Pending' : 'Not Verified'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleToggleStatus(user.id, user.status)} className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.status}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                        <button onClick={() => alert('View user details functionality coming soon!')} className="font-medium text-indigo-600 hover:underline">View</button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
