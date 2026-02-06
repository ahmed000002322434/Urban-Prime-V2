
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/itemService';
import { useNotification } from '../../context/NotificationContext';
import type { Address } from '../../types';
import Spinner from '../../components/Spinner';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

interface AddressFormModalProps {
  address?: Address | null;
  onClose: () => void;
  onSave: (address: Partial<Address>) => void;
  isLoading: boolean;
}

const AddressFormModal: React.FC<AddressFormModalProps> = ({ address, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    id: address?.id || `addr-${Date.now()}`,
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
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <header className="p-4 border-b dark:border-gray-700">
            <h3 className="font-bold text-lg text-light-text dark:text-dark-text">{address ? 'Edit Address' : 'Add New Address'}</h3>
          </header>
          <main className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Label (e.g., Home, Work)" className="sm:col-span-2 w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-text-primary" required />
            <input name="addressLine1" value={formData.addressLine1} onChange={handleChange} placeholder="Address Line 1" className="sm:col-span-2 w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-text-primary" required />
            <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-text-primary" required />
            <input name="state" value={formData.state} onChange={handleChange} placeholder="State / Province" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-text-primary" required />
            <input name="zip" value={formData.zip} onChange={handleChange} placeholder="ZIP / Postal Code" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-text-primary" required />
            <input name="country" value={formData.country} onChange={handleChange} placeholder="Country" className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-text-primary" required />
          </main>
          <footer className="p-4 bg-gray-50 dark:bg-dark-surface/50 border-t dark:border-gray-700 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 font-semibold rounded-md">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-black text-white font-bold rounded-md min-w-[80px] flex justify-center">
              {isLoading ? <Spinner size="sm" /> : 'Save'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

const AddressesPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = useState(false);
    const [modalAddress, setModalAddress] = useState<Address | null | 'new'>(null);

    const handleSaveAddress = async (addressData: Partial<Address>) => {
        if (!user) return;
        setIsSaving(true);
        const currentAddresses = user.addresses || [];
        let newAddresses;
        if (currentAddresses.some(a => a.id === addressData.id)) {
            // Update existing
            newAddresses = currentAddresses.map(a => a.id === addressData.id ? { ...a, ...addressData } : a);
        } else {
            // Add new
            newAddresses = [...currentAddresses, addressData as Address];
        }

        try {
            const updatedUser = await userService.updateUserProfile(user.id, { addresses: newAddresses });
            updateUser(updatedUser);
            showNotification('Address saved successfully!');
            setModalAddress(null);
        } catch (error) {
            showNotification('Failed to save address.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteAddress = async (addressId: string) => {
        if (!user || !window.confirm("Are you sure you want to delete this address?")) return;
        
        const newAddresses = user.addresses?.filter(a => a.id !== addressId) || [];
        try {
            const updatedUser = await userService.updateUserProfile(user.id, { addresses: newAddresses });
            updateUser(updatedUser);
            showNotification('Address deleted.');
        } catch (error) {
             showNotification('Failed to delete address.');
        }
    };

    return (
        <>
            {modalAddress && (
                <AddressFormModal
                    address={modalAddress === 'new' ? null : modalAddress}
                    onClose={() => setModalAddress(null)}
                    onSave={handleSaveAddress}
                    isLoading={isSaving}
                />
            )}
            <div className="bg-surface p-8 rounded-xl shadow-soft border border-border">
                <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                    <h2 className="text-xl font-bold font-display text-text-primary">Addresses</h2>
                    <button onClick={() => setModalAddress('new')} className="px-4 py-2 text-sm bg-primary text-white font-bold rounded-md flex items-center gap-1">
                        <PlusIcon /> Add New
                    </button>
                </div>
                
                <div className="space-y-4">
                    {user?.addresses && user.addresses.length > 0 ? (
                        user.addresses.map(addr => (
                            <div key={addr.id} className="p-4 border border-border rounded-lg flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-text-primary">{addr.name}</p>
                                    <p className="text-sm text-text-secondary">{addr.addressLine1}, {addr.city}, {addr.state} {addr.zip}</p>
                                </div>
                                <div className="flex gap-2 text-sm font-semibold">
                                    <button onClick={() => setModalAddress(addr)} className="text-primary hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-red-500 hover:underline">Delete</button>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-10">
                            <p className="text-text-secondary">You have no saved addresses.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AddressesPage;
