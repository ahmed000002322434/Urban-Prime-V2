
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/itemService';
import type { ServiceProviderProfile } from '../types';
import Spinner from './Spinner';
import { useNotification } from '../context/NotificationContext';
import { HIERARCHICAL_SERVICE_CATEGORIES } from '../constants';

interface ProviderOnboardingModalProps {
    onClose: () => void;
}

const ProviderOnboardingModal: React.FC<ProviderOnboardingModalProps> = ({ onClose }) => {
    const { user, updateUser } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState<Partial<ServiceProviderProfile>>({
        bio: '',
        skills: [],
        serviceArea: '',
        serviceCategories: [],
        status: 'pending_approval'
    });

    const [skillInput, setSkillInput] = useState('');

    const handleNext = () => setStep(p => p + 1);
    const handleBack = () => setStep(p => p - 1);

    const handleCategoryToggle = (catId: string) => {
        setFormData(prev => ({
            ...prev,
            serviceCategories: prev.serviceCategories?.includes(catId)
                ? prev.serviceCategories.filter(c => c !== catId)
                : [...(prev.serviceCategories || []), catId]
        }));
    };

    const handleAddSkill = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && skillInput.trim()) {
            e.preventDefault();
            setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), skillInput.trim()] }));
            setSkillInput('');
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const updatedUser = await userService.updateUserProfile(user.id, {
                isServiceProvider: true,
                providerProfile: formData as ServiceProviderProfile
            });
            updateUser(updatedUser);
            showNotification("Application submitted successfully!");
            onClose();
            navigate('/profile/provider-dashboard');
        } catch (error) {
            console.error(error);
            showNotification("Failed to submit application.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">What services do you offer?</h3>
                        <p className="text-gray-500 text-sm">Select all that apply.</p>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                            {HIERARCHICAL_SERVICE_CATEGORIES.flatMap(cat => cat.subcategories || []).map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => handleCategoryToggle(sub.id)}
                                    className={`p-3 text-sm rounded-lg border text-left transition-colors ${formData.serviceCategories?.includes(sub.id) ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-dark-background border-gray-200 dark:border-gray-700 hover:border-primary'}`}
                                >
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Details</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Professional Bio</label>
                            <textarea 
                                value={formData.bio} 
                                onChange={e => setFormData({...formData, bio: e.target.value})}
                                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-700"
                                rows={4}
                                placeholder="Tell clients about your experience..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Service Area (City/Region)</label>
                            <input 
                                value={formData.serviceArea} 
                                onChange={e => setFormData({...formData, serviceArea: e.target.value})}
                                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-700"
                                placeholder="e.g. Greater New York Area"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Skills (Press Enter to add)</label>
                            <input 
                                value={skillInput} 
                                onChange={e => setSkillInput(e.target.value)}
                                onKeyDown={handleAddSkill}
                                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-dark-background dark:border-gray-700"
                                placeholder="e.g. Electrical Wiring, Deep Cleaning"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.skills?.map((skill, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs font-bold">{skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 text-2xl">🛡️</div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verification Check</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            To ensure safety, we require all pros to undergo a background check. By clicking "Submit", you agree to our terms of service for providers.
                        </p>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-left text-xs text-yellow-800 dark:text-yellow-200">
                            <strong>Note:</strong> Your profile will be in "Pending" status until an admin reviews your application (usually 24 hours).
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-gray-50 dark:bg-dark-background border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-bold text-lg">Provider Application</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">&times;</button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                    {renderStep()}
                </div>

                <div className="p-6 border-t dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-dark-background">
                    {step > 1 ? (
                        <button onClick={handleBack} className="px-6 py-2 font-semibold text-gray-600 hover:text-black">Back</button>
                    ) : <div></div>}
                    
                    {step < 3 ? (
                        <button onClick={handleNext} className="px-8 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-80">Next</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:opacity-80 flex items-center gap-2">
                            {isLoading ? <Spinner size="sm"/> : "Submit Application"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderOnboardingModal;
