
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { userService } from '../../services/itemService';
import { spotlightService } from '../../services/spotlightService';
import { storefrontService } from '../../services/storefrontService';
import { useUserData } from '../../hooks/useUserData';
import Spinner from '../../components/Spinner';
import EmailInput from '../../components/EmailInput';
import ShippingSettingsSection from '../../components/ShippingSettingsSection';
import type { ShippingSettings } from '../../types';
import { buildPublicProfilePath, deriveUsernameFromIdentity, sanitizeUsername } from '../../utils/profileIdentity';

const FormCard: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-surface p-8 rounded-xl shadow-soft border border-border">
        <h2 className="text-xl font-bold border-b border-border pb-4 mb-6 font-display text-text-primary">{title}</h2>
        {children}
    </div>
);

const FormField: React.FC<{label: string, children: React.ReactNode, helpText?: string}> = ({label, children, helpText}) => (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <label className="font-medium text-sm pt-2 text-text-secondary">{label}</label>
        <div className="md:col-span-2">
            {children}
            {helpText && <p className="text-xs text-text-secondary mt-1">{helpText}</p>}
        </div>
    </div>
);

const EditProfilePage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { storefront } = useUserData(); // Access store data context
    const { showNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    
    // User Profile Data
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || deriveUsernameFromIdentity(user),
        dob: user?.dob || '',
        gender: user?.gender || 'prefer_not_to_say',
        about: user?.about || '',
        businessName: user?.businessName || '',
        businessDescription: user?.businessDescription || '',
        phone: user?.phone || '',
        email: user?.email || '',
        avatar: user?.avatar || '',
        city: user?.city || '',
        country: user?.country || ''
    });

    // Store Settings Data
    const [storeSettings, setStoreSettings] = useState({
        slug: '',
        storeBannerUrl: '',
        isVacationMode: false,
        instagram: '',
        twitter: '',
        website: ''
    });

    const [shippingSettings, setShippingSettings] = useState<ShippingSettings | undefined>(undefined);
    
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameMessage, setUsernameMessage] = useState('');

    useEffect(() => {
        if (storefront) {
            setStoreSettings({
                slug: storefront.slug || '',
                storeBannerUrl: storefront.storeBannerUrl || '',
                isVacationMode: storefront.isVacationMode || false,
                instagram: storefront.socialLinks?.instagram || '',
                twitter: storefront.socialLinks?.twitter || '',
                website: storefront.socialLinks?.website || ''
            });
            setShippingSettings(storefront.shippingSettings);
        }
    }, [storefront]);

    useEffect(() => {
        if (!user) return;
        setFormData(prev => ({
            ...prev,
            name: user.name || '',
            username: user.username || deriveUsernameFromIdentity(user),
            dob: user.dob || '',
            gender: user.gender || 'prefer_not_to_say',
            about: user.about || '',
            businessName: user.businessName || '',
            businessDescription: user.businessDescription || '',
            phone: user.phone || '',
            email: user.email || '',
            avatar: user.avatar || '',
            city: user.city || '',
            country: user.country || ''
        }));
    }, [user]);

    if (!user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'username' ? sanitizeUsername(value) : value }));
        if (name === 'username') {
            setUsernameAvailable(null);
            setUsernameMessage('');
        }
    };

    const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setStoreSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (name === 'slug') {
            setSlugAvailable(null); // Reset status on type
        }
    };

    const checkSlug = async () => {
        if (!storeSettings.slug || storeSettings.slug === storefront?.slug) return;
        setCheckingSlug(true);
        try {
            const isAvailable = await storefrontService.checkStoreSlugAvailability(storeSettings.slug);
            setSlugAvailable(isAvailable);
        } catch (error) {
            console.error(error);
        } finally {
            setCheckingSlug(false);
        }
    };

    const checkUsername = async () => {
        const normalizedUsername = sanitizeUsername(formData.username);
        const currentUsername = sanitizeUsername(user?.username || deriveUsernameFromIdentity(user));
        if (!normalizedUsername) {
            setUsernameAvailable(false);
            setUsernameMessage('Username is required.');
            return false;
        }
        if (normalizedUsername.length < 3) {
            setUsernameAvailable(false);
            setUsernameMessage('Username must be at least 3 characters.');
            return false;
        }
        if (normalizedUsername === currentUsername) {
            setUsernameAvailable(true);
            setUsernameMessage('This is your current public username.');
            return true;
        }

        setCheckingUsername(true);
        try {
            const availability = await spotlightService.checkUsernameAvailability(normalizedUsername);
            const isAvailable = Boolean(availability?.available);
            setUsernameAvailable(isAvailable);
            setUsernameMessage(availability?.reason || (isAvailable ? 'Username is available.' : 'This username is already taken.'));
            return isAvailable;
        } catch (error) {
            console.error(error);
            setUsernameAvailable(false);
            setUsernameMessage('Unable to validate username right now.');
            return false;
        } finally {
            setCheckingUsername(false);
        }
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setStoreSettings(prev => ({ ...prev, storeBannerUrl: ev.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData(prev => ({ ...prev, avatar: ev.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setIsLoading(true);

        if (storefront && storeSettings.slug !== storefront.slug && slugAvailable === false) {
            showNotification('Store URL is unavailable.');
            setIsLoading(false);
            return;
        }

        let profileSaved = false;
        let storeSaved = !storefront;

        try {
            const usernameOk = await checkUsername();
            if (!usernameOk) {
                showNotification('Choose an available username first.');
                setIsLoading(false);
                return;
            }
            const { email, ...profileUpdates } = formData;
            const updatedProfile = await userService.updateUserProfile(user.id, profileUpdates);
            updateUser?.(updatedProfile);
            setFormData(prev => ({ ...prev, username: updatedProfile.username || prev.username }));
            profileSaved = true;
        } catch (error) {
            console.error('Profile update failed:', error);
        }

        if (storefront) {
            try {
                await storefrontService.updateStoreBranding(storefront.id, {
                    slug: storeSettings.slug,
                    storeBannerUrl: storeSettings.storeBannerUrl,
                    isVacationMode: storeSettings.isVacationMode,
                    socialLinks: {
                        instagram: storeSettings.instagram,
                        twitter: storeSettings.twitter,
                        website: storeSettings.website
                    },
                    shippingSettings
                });
                storeSaved = true;
            } catch (error) {
                console.error('Store update failed:', error);
            }
        }

        if (profileSaved && storeSaved) {
            showNotification('Profile and store updated successfully!');
        } else if (profileSaved) {
            showNotification('Profile updated, but store settings could not be saved.');
        } else if (storeSaved) {
            showNotification('Store settings updated, but profile could not be saved.');
        } else {
            showNotification('Failed to update settings.');
        }

        setIsLoading(false);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-display text-text-primary">Edit Profile & Store</h1>

            {/* Profile Section */}
            <FormCard title="Profile Photo">
                <div className="flex items-center gap-6">
                    <img src={formData.avatar || user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
                    <div>
                        <label className="px-4 py-2 bg-text-primary text-background font-semibold rounded-md text-sm cursor-pointer inline-block">
                            Upload Photo
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                        <p className="text-xs text-text-secondary mt-2">JPG, JPEG, PNG Min: 400px, Max: 1024px</p>
                    </div>
                </div>
            </FormCard>

            <FormCard title="Basic Information">
                <div className="space-y-6">
                    <FormField label="Name">
                       <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />
                    </FormField>
                    <FormField label="Username" helpText={`Public profile link: urbanprime.tech${buildPublicProfilePath({ username: formData.username, id: user.id })}`}>
                       <div className="space-y-2">
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">@</span>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    onBlur={() => void checkUsername()}
                                    className={`w-full rounded-lg border bg-background py-2 pl-8 pr-24 text-text-primary ${
                                        usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : 'border-border'
                                    }`}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold">
                                    {checkingUsername ? <Spinner size="sm" /> : usernameAvailable === true ? <span className="text-green-600">Available</span> : usernameAvailable === false ? <span className="text-red-500">Taken</span> : null}
                                </div>
                            </div>
                            <p className={`text-xs ${usernameAvailable === false ? 'text-red-500' : 'text-text-secondary'}`}>
                                {usernameMessage || 'Use a unique username for your public profile and creator identity.'}
                            </p>
                       </div>
                    </FormField>
                     <FormField label="Date of birth">
                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />
                    </FormField>
                     <FormField label="Gender">
                       <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary">
                            <option value="">Select your gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                       </select>
                    </FormField>
                    <FormField label="About me (optional)">
                       <textarea name="about" value={formData.about} onChange={handleChange} rows={4} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" maxLength={200}></textarea>
                       <p className="text-xs text-text-secondary text-right">{formData.about.length}/200</p>
                    </FormField>
                    <FormField label="Business name">
                       <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />
                    </FormField>
                    <FormField label="Business description">
                       <textarea name="businessDescription" value={formData.businessDescription} onChange={handleChange} rows={3} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" maxLength={200}></textarea>
                       <p className="text-xs text-text-secondary text-right">{formData.businessDescription.length}/200</p>
                    </FormField>
                    <FormField label="City">
                       <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />
                    </FormField>
                    <FormField label="Country">
                       <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />
                    </FormField>
                </div>
            </FormCard>

             <FormCard title="Contact Information">
                <div className="space-y-6">
                    <FormField label="Phone number" helpText="This is the number for buyers contacts, reminders, and other notifications.">
                       <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />
                    </FormField>
                    <FormField label="Email" helpText="We won't reveal your email to anyone else nor use it to send you spam.">
                        <EmailInput name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" disabled />
                    </FormField>
                </div>
            </FormCard>

            {/* Store Settings Section - Only visible if user has a store */}
            {storefront && (
                <>
                    <FormCard title="Store Settings">
                        <div className="space-y-6">
                            <FormField label="Store URL Slug" helpText="Your unique store address: urbanprime.com/store/your-slug">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        name="slug" 
                                        value={storeSettings.slug} 
                                        onChange={handleStoreChange} 
                                        onBlur={checkSlug}
                                        className={`w-full p-2 border rounded-lg bg-background text-text-primary ${slugAvailable === false ? 'border-red-500' : slugAvailable === true ? 'border-green-500' : 'border-border'}`} 
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {checkingSlug && <Spinner size="sm" />}
                                        {!checkingSlug && slugAvailable === true && <span className="text-green-500">✓</span>}
                                        {!checkingSlug && slugAvailable === false && <span className="text-red-500">✕ Taken</span>}
                                    </div>
                                </div>
                            </FormField>

                            <FormField label="Store Banner" helpText="Upload a wide banner image (1200x300 recommended)">
                                <div className="space-y-2">
                                    {storeSettings.storeBannerUrl && (
                                        <div className="h-32 w-full rounded-lg overflow-hidden border border-border">
                                            <img src={storeSettings.storeBannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <label className="cursor-pointer inline-block px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-soft">
                                        Choose Image
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                                    </label>
                                </div>
                            </FormField>

                            <FormField label="Social Links">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm w-20 text-text-secondary">Instagram</span>
                                        <input type="text" name="instagram" value={storeSettings.instagram} onChange={handleStoreChange} placeholder="username" className="flex-1 p-2 border border-border rounded-lg bg-background text-text-primary" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm w-20 text-text-secondary">Twitter</span>
                                        <input type="text" name="twitter" value={storeSettings.twitter} onChange={handleStoreChange} placeholder="username" className="flex-1 p-2 border border-border rounded-lg bg-background text-text-primary" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm w-20 text-text-secondary">Website</span>
                                        <input type="url" name="website" value={storeSettings.website} onChange={handleStoreChange} placeholder="https://..." className="flex-1 p-2 border border-border rounded-lg bg-background text-text-primary" />
                                    </div>
                                </div>
                            </FormField>

                            <FormField label="Vacation Mode" helpText="When enabled, your items will remain visible but buyers will be notified of shipping delays.">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="isVacationMode" 
                                        checked={storeSettings.isVacationMode} 
                                        onChange={handleStoreChange} 
                                        className="toggle-checkbox" 
                                    />
                                    <span className={`text-sm font-semibold ${storeSettings.isVacationMode ? 'text-green-600' : 'text-text-secondary'}`}>
                                        {storeSettings.isVacationMode ? 'Enabled' : 'Disabled'}
                                    </span>
                                </label>
                            </FormField>
                        </div>
                    </FormCard>
                    
                    <FormCard title="Shipping Infrastructure">
                        <ShippingSettingsSection settings={shippingSettings} onUpdate={setShippingSettings} />
                    </FormCard>
                </>
            )}
            
            <div className="flex justify-end gap-4">
                <button className="px-6 py-2 border border-border text-text-primary font-semibold rounded-lg hover:bg-surface-soft">Discard</button>
                <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-text-primary text-background font-semibold rounded-lg flex items-center justify-center min-w-[120px] hover:opacity-90">
                    {isLoading ? <Spinner size="sm" /> : "Save changes"}
                </button>
            </div>
        </div>
    );
};

export default EditProfilePage;

