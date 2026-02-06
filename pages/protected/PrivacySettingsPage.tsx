
import React from 'react';

const PrivacySettingsPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-surface p-8 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 font-display text-light-text dark:text-dark-text">Privacy</h2>
            <div className="space-y-6">
                <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600">
                    <div>
                        <label className="font-medium text-gray-900 dark:text-dark-text">Profile Visibility</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Control who can see your profile and activity.
                        </p>
                    </div>
                    <select className="p-2 border rounded-md text-sm dark:bg-dark-surface dark:border-gray-600">
                        <option>Public</option>
                        <option>Followers Only</option>
                        <option>Private</option>
                    </select>
                </div>
                <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-600">
                    <div>
                        <label className="font-medium text-gray-900 dark:text-dark-text">Data Sharing</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Allow Urban Prime to use your data for personalization.
                        </p>
                    </div>
                    <input 
                        type="checkbox"
                        className="toggle-checkbox"
                        defaultChecked={true}
                    />
                </div>
                 <p className="text-center text-sm text-gray-400 pt-4">More privacy settings are coming soon.</p>
            </div>
        </div>
    );
};

export default PrivacySettingsPage;
