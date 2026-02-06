
// pages/admin/AdminSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import type { SiteSettings } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService'; // Import itemService
import { useAuth } from '../../hooks/useAuth'; // Import useAuth

const AdminSettingsPage: React.FC = () => {
    const { user } = useAuth(); // Get current user
    const [settings, setSettings] = useState<SiteSettings>({ siteBanner: { message: '', isActive: false } });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false); // State for seeding
    const { showNotification } = useNotification();

    useEffect(() => {
        setIsLoading(true);
        adminService.getSiteSettings()
            .then(setSettings)
            .finally(() => setIsLoading(false));
    }, []);

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            siteBanner: {
                ...prev.siteBanner,
                [name]: type === 'checkbox' ? checked : value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await adminService.updateSiteSettings({ siteBanner: settings.siteBanner });
            showNotification("Settings saved successfully!");
        } catch (error) {
            showNotification("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSeedData = async () => {
        if (!user) {
            showNotification("You must be logged in to seed data.");
            return;
        }
        if (!window.confirm("This will add 20 dummy products to the database. Continue?")) return;
        
        setIsSeeding(true);
        try {
            await itemService.seedDatabase(user);
            showNotification("20 Dummy products added successfully!");
        } catch (error) {
            console.error(error);
            showNotification("Failed to seed data.");
        } finally {
            setIsSeeding(false);
        }
    };

    if (isLoading) {
        return <Spinner size="lg" />;
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Site Settings</h1>

            <div className="bg-white dark:bg-dark-surface p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl">
                <h2 className="text-xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 font-display text-gray-900 dark:text-dark-text">Site Banner</h2>
                
                <div className="space-y-4">
                     <div>
                        <label htmlFor="bannerMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banner Message</label>
                        <input
                            type="text"
                            id="bannerMessage"
                            name="message"
                            value={settings.siteBanner.message}
                            onChange={handleBannerChange}
                            placeholder="e.g., Free shipping on orders over $50!"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-dark-text"
                        />
                    </div>
                    <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600">
                        <div>
                            <label className="font-medium text-gray-900 dark:text-dark-text">Activate Site Banner</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display this message at the top of all pages.
                            </p>
                        </div>
                        <input 
                            type="checkbox"
                            name="isActive"
                            className="toggle-checkbox"
                            checked={settings.siteBanner.isActive}
                            onChange={handleBannerChange}
                        />
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-dark-surface p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl">
                <h2 className="text-xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 font-display text-gray-900 dark:text-dark-text">Platform Controls</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="commissionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Commission Rate (%)</label>
                        <input
                            type="number"
                            id="commissionRate"
                            name="commissionRate"
                            defaultValue="15"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-dark-text"
                        />
                    </div>
                    <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600">
                        <div>
                            <label className="font-medium text-gray-900 dark:text-dark-text">Enable Auction Feature</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Allow users to list items for auction.
                            </p>
                        </div>
                        <input 
                            type="checkbox"
                            className="toggle-checkbox"
                            defaultChecked={true}
                        />
                    </div>
                     <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600">
                        <div>
                            <label className="font-medium text-gray-900 dark:text-dark-text">Enable Dropshipping (Creator Hub)</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Allow sellers to import products from suppliers.
                            </p>
                        </div>
                        <input 
                            type="checkbox"
                            className="toggle-checkbox"
                            defaultChecked={true}
                        />
                    </div>
                </div>
            </div>

            {/* Developer Tools Section */}
            <div className="bg-white dark:bg-dark-surface p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl">
                <h2 className="text-xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 font-display text-gray-900 dark:text-dark-text">Developer Tools</h2>
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use these tools to populate your database with dummy content for testing purposes.
                    </p>
                    <button 
                        onClick={handleSeedData} 
                        disabled={isSeeding} 
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:bg-indigo-400"
                    >
                        {isSeeding ? <Spinner size="sm" className="text-white"/> : '🌱 Seed Database (20 Items)'}
                    </button>
                </div>
            </div>

            <div className="max-w-2xl flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-black dark:bg-primary text-white font-semibold rounded-lg hover:bg-gray-800 flex items-center justify-center min-w-[100px]">
                    {isSaving ? <Spinner size="sm"/> : "Save All Settings"}
                </button>
            </div>
        </div>
    );
};

export default AdminSettingsPage;
