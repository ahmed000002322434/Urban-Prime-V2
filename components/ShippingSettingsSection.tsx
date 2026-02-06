
import React, { useState, useEffect } from 'react';
import type { ShippingSettings } from '../types';

interface ShippingSettingsSectionProps {
    settings: ShippingSettings | undefined;
    onUpdate: (settings: ShippingSettings) => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full p-2 border border-border rounded-lg bg-background text-text-primary" />;

const ShippingSettingsSection: React.FC<ShippingSettingsSectionProps> = ({ settings, onUpdate }) => {
    const [formData, setFormData] = useState<ShippingSettings>({
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        defaultHandlingTime: 2,
        preferredCarriers: [],
        ...settings
    });

    useEffect(() => {
        if (settings) {
            setFormData(prev => ({ ...prev, ...settings }));
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newSettings = { ...formData, [name]: value };
        setFormData(newSettings);
        onUpdate(newSettings);
    };

    const handleHandlingTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = parseInt(e.target.value);
        const newSettings = { ...formData, defaultHandlingTime: val };
        setFormData(newSettings);
        onUpdate(newSettings);
    };

    const toggleCarrier = (carrier: string) => {
        const current = formData.preferredCarriers || [];
        const newCarriers = current.includes(carrier)
            ? current.filter(c => c !== carrier)
            : [...current, carrier];
        const newSettings = { ...formData, preferredCarriers: newCarriers };
        setFormData(newSettings);
        onUpdate(newSettings);
    };

    const carriers = ['USPS', 'UPS', 'FedEx', 'DHL'];

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-lg text-text-primary">Ship-From Address</h3>
            <div className="grid gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Street Address</label>
                    <Input name="street" value={formData.street} onChange={handleChange} placeholder="123 Warehouse St" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-text-secondary">City</label>
                        <Input name="city" value={formData.city} onChange={handleChange} placeholder="New York" />
                    </div>
                    <div>
                         <label className="block text-sm font-medium mb-1 text-text-secondary">State / Province</label>
                         <Input name="state" value={formData.state} onChange={handleChange} placeholder="NY" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1 text-text-secondary">ZIP / Postal Code</label>
                        <Input name="zip" value={formData.zip} onChange={handleChange} placeholder="10001" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1 text-text-secondary">Country</label>
                        <Input name="country" value={formData.country} onChange={handleChange} placeholder="United States" />
                    </div>
                </div>
            </div>

            <h3 className="font-bold text-lg text-text-primary pt-4 border-t border-border">Preferences</h3>
            <div className="grid gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Default Handling Time</label>
                    <select 
                        value={formData.defaultHandlingTime} 
                        onChange={handleHandlingTimeChange}
                        className="w-full p-2 border border-border rounded-lg bg-background text-text-primary"
                    >
                        <option value={1}>1 Business Day</option>
                        <option value={2}>2 Business Days</option>
                        <option value={3}>3 Business Days</option>
                        <option value={5}>4-5 Business Days</option>
                        <option value={7}>1 Week+</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-text-secondary">Preferred Carriers</label>
                    <div className="flex gap-2 flex-wrap">
                        {carriers.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => toggleCarrier(c)}
                                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${formData.preferredCarriers.includes(c) ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary hover:border-gray-400'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShippingSettingsSection;
