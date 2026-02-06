
import React, { useState, useEffect, useCallback } from 'react';
// FIX: Updated adminService import to point to the new consolidated service file.
import { adminService } from '../../services/adminService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';

const AdminListingsPage: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const itemsData = await adminService.getAllItems();
            setItems(itemsData);
        } catch (error) {
            console.error("Failed to fetch items:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);
    
    const handleToggleVerification = async (itemId: string, currentStatus: boolean) => {
        await adminService.updateItem(itemId, { isVerified: !currentStatus });
        fetchItems();
    };
    
    const handleToggleFeatured = async (itemId: string, currentStatus: boolean) => {
        await adminService.updateItem(itemId, { isFeatured: !currentStatus });
        fetchItems();
    };


    const handleDeleteItem = async (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this listing?")) {
            await adminService.deleteItem(itemId);
            fetchItems();
        }
    };

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-dark-text">Manage Listings</h1>
            {isLoading ? <Spinner size="lg" /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3">Title</th>
                                <th scope="col" className="px-6 py-3">Owner</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Featured</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="bg-white dark:bg-dark-surface border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.title}</td>
                                    <td className="px-6 py-4">{item.owner.name}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleToggleVerification(item.id, !!item.isVerified)} className={`px-2 py-1 text-xs font-semibold rounded-full ${item.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {item.isVerified ? 'Verified' : 'Not Verified'}
                                        </button>
                                    </td>
                                     <td className="px-6 py-4">
                                        <button onClick={() => handleToggleFeatured(item.id, !!item.isFeatured)} className={`px-2 py-1 text-xs font-semibold rounded-full ${item.isFeatured ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {item.isFeatured ? 'Featured' : 'Not Featured'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                        <button onClick={() => alert('Edit item functionality coming soon!')} className="font-medium text-indigo-600 hover:underline">Edit</button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
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

export default AdminListingsPage;