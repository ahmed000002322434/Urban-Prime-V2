import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import { useNotification } from '../../context/NotificationContext';
import type { Address } from '../../types';
import Spinner from '../Spinner';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

const AddressesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user, updateUser } = useAuth();
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = useState(false);
    const [isFormVisible, setFormVisible] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    const handleSaveAddress = async (addressData: Partial<Address>) => {
        if (!user) return;
        setIsSaving(true);
        const currentAddresses = user.addresses || [];
        let newAddresses;
        if (currentAddresses.some(a => a.id === addressData.id)) {
            newAddresses = currentAddresses.map(a => a.id === addressData.id ? { ...a, ...addressData } : a);
        } else {
            newAddresses = [...currentAddresses, { ...addressData, id: `addr-${Date.now()}` } as Address];
        }

        try {
            const updatedUser = await userService.updateUserProfile(user.id, { addresses: newAddresses });
            updateUser(updatedUser);
            showNotification('Address saved!');
            setFormVisible(false);
            setEditingAddress(null);
        } catch (error) {
            showNotification('Failed to save address.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!user || !window.confirm("Delete this address?")) return;
        const newAddresses = user.addresses?.filter(a => a.id !== addressId) || [];
        try {
            const updatedUser = await userService.updateUserProfile(user.id, { addresses: newAddresses });
            updateUser(updatedUser);
            showNotification('Address deleted.');
        } catch (error) {
            showNotification('Failed to delete address.');
        }
    };
    
    const openForm = (address: Address | null = null) => {
        setEditingAddress(address);
        setFormVisible(true);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Manage Addresses</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-6 max-h-[60vh] overflow-y-auto">
                    {isFormVisible ? (
                        <AddressForm address={editingAddress} onSave={handleSaveAddress} onCancel={() => setFormVisible(false)} isLoading={isSaving} />
                    ) : (
                        <div className="space-y-3">
                            {user?.addresses && user.addresses.length > 0 ? (
                                user.addresses.map(addr => (
                                    <div key={addr.id} className="p-3 border dark:border-gray-600 rounded-lg flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-sm text-light-text dark:text-dark-text">{addr.name}</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{addr.addressLine1}, {addr.city}</p>
                                        </div>
                                        <div className="flex gap-2 text-xs font-semibold">
                                            <button onClick={() => openForm(addr)} className="text-primary hover:underline">Edit</button>
                                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-red-500 hover:underline">Delete</button>
                                        </div>
                                    </div>
                                ))
                            ) : <p className="text-center text-sm text-gray-500">No saved addresses.</p>}
                            <button onClick={() => openForm()} className="w-full mt-2 p-3 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg text-gray-500 hover:border-primary hover:text-primary">
                                <PlusIcon /> Add New Address
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const AddressForm: React.FC<{address: Address | null; onSave: (data: Partial<Address>) => void; onCancel: () => void; isLoading: boolean}> = ({ address, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
        name: address?.name || '',
        addressLine1: address?.addressLine1 || '',
        city: address?.city || '',
        state: address?.state || '',
        zip: address?.zip || '',
        country: address?.country || 'United States',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: address?.id, ...formData });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Label (e.g., Home)" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" required />
            <input name="addressLine1" value={formData.addressLine1} onChange={handleChange} placeholder="Address" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" required />
            <div className="grid grid-cols-2 gap-2">
                <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" required />
                <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <input name="zip" value={formData.zip} onChange={handleChange} placeholder="ZIP Code" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" required />
                <input name="country" value={formData.country} onChange={handleChange} placeholder="Country" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 font-semibold rounded-md">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-black text-white font-bold rounded-md min-w-[80px] flex justify-center">{isLoading ? <Spinner size="sm"/> : 'Save'}</button>
            </div>
        </form>
    );
};

export default AddressesModal;
