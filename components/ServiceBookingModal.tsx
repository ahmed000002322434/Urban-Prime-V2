
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import type { Service, Address, RuntimeAvailabilitySnapshot, ServicePricingModel } from '../types';
import Calendar from './Calendar';
import Spinner from './Spinner';
import RuntimeModeNotice from './RuntimeModeNotice';
import providerWorkspaceService from '../services/providerWorkspaceService';
import { useNotification } from '../context/NotificationContext';
import { ensureCriticalBackendReady, getRuntimeAvailabilitySnapshot } from '../services/runtimeService';

// Icons
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;

interface ServiceBookingModalProps {
    service: Service;
    onClose: () => void;
}

const createEmptyAddress = (country = ''): Address => ({
    id: 'manual-address',
    name: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    country,
});

const mapAddressToWorkLocation = (address: Address) => ({
    label: address.name,
    addressLine1: address.addressLine1,
    city: address.city,
    region: address.state,
    country: address.country,
    postalCode: address.zip,
});

const steps = [
    { id: 1, title: 'Job Details', icon: <FileTextIcon /> },
    { id: 2, title: 'Date & Time', icon: <CalendarIcon /> },
    { id: 3, title: 'Location', icon: <MapPinIcon /> },
    { id: 4, title: 'Review', icon: <CreditCardIcon /> },
];

const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({ service, onClose }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form State
    const [description, setDescription] = useState('');
    const [selectedModel, setSelectedModel] = useState<ServicePricingModel>(
        service.pricingModels?.[0] || {
            type: 'custom_offer',
            price: 0,
            currency: service.currency || 'USD',
            description: 'Custom scope'
        }
    );
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(user?.addresses?.[0] || null);
    const [isManualAddressOpen, setIsManualAddressOpen] = useState((user?.addresses?.length || 0) === 0);
    const [manualAddress, setManualAddress] = useState<Address>(createEmptyAddress(user?.country || ''));
    const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeAvailabilitySnapshot | null>(null);
    const [runtimeLoading, setRuntimeLoading] = useState(false);
    const isBookingBlocked = runtimeSnapshot !== null && !runtimeSnapshot.backendAvailable;
    const isOwnService = Boolean(user?.id && String(user.id) === String(service.provider?.id || ''));

    useEffect(() => {
        let cancelled = false;
        setRuntimeLoading(true);
        getRuntimeAvailabilitySnapshot({ forceRefresh: true, requiresLiveBackend: true })
            .then((snapshot) => {
                if (!cancelled) setRuntimeSnapshot(snapshot);
            })
            .catch((error) => {
                if (cancelled) return;
                console.warn('Unable to resolve booking runtime snapshot:', error);
                setRuntimeSnapshot(null);
            })
            .finally(() => {
                if (!cancelled) setRuntimeLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const resolveManualAddress = (): Address | null => {
        const candidate = {
            ...manualAddress,
            name: manualAddress.name.trim(),
            addressLine1: manualAddress.addressLine1.trim(),
            city: manualAddress.city.trim(),
            state: manualAddress.state.trim(),
            zip: manualAddress.zip.trim(),
            country: manualAddress.country.trim()
        };
        if (!candidate.name || !candidate.addressLine1 || !candidate.city || !candidate.country) {
            return null;
        }
        return candidate;
    };

    const handleNext = () => {
        if (isOwnService) {
            showNotification("You cannot book your own service.");
            return;
        }
        if (step === 1 && !description.trim()) { showNotification("Please describe the job."); return; }
        if (step === 2 && (!selectedDate || !selectedTime)) { showNotification("Please select a date and time."); return; }
        if (step === 3) {
            const manualSelection = resolveManualAddress();
            if (!selectedAddress && !manualSelection) {
                showNotification("Please select or enter a service address.");
                return;
            }
            if (!selectedAddress && manualSelection) {
                setSelectedAddress(manualSelection);
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleConfirmBooking = async () => {
        if (!user) return;
        if (isOwnService) {
            showNotification("You cannot book your own service.");
            return;
        }
        const bookingAddress = selectedAddress || resolveManualAddress();
        if (!bookingAddress) {
            showNotification("Please confirm a service address.");
            setStep(3);
            return;
        }
        try {
            const snapshot = await ensureCriticalBackendReady('Service booking');
            setRuntimeSnapshot(snapshot);
        } catch (error: any) {
            setRuntimeSnapshot(await getRuntimeAvailabilitySnapshot({ forceRefresh: true, requiresLiveBackend: true }).catch(() => null));
            showNotification(error?.message || 'Live service-booking backend unavailable.');
            return;
        }
        setIsLoading(true);
        try {
            await providerWorkspaceService.createServiceBooking(service, {
                title: `${service.title} booking`,
                brief: description,
                notes: description,
                packageId: selectedModel.description || `${selectedModel.type}-${selectedModel.price}`,
                amount: Number(selectedModel.price || 0),
                desiredDate: selectedDate,
                desiredTime: selectedTime,
                scheduledAt: `${selectedDate}T${selectedTime}:00`,
                requirements: description
                    .split('\n')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                serviceAddress: mapAddressToWorkLocation(bookingAddress)
            }, user);
            
            showNotification("Booking request sent. Funds will stay in escrow until the provider completes the job.");
            onClose();
        } catch (error: any) {
            console.error(error);
            showNotification(error?.message || "Failed to book service.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Pricing Option</label>
                            <div className="grid gap-3">
                                {service.pricingModels.map((model, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setSelectedModel(model)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${selectedModel === model ? 'border-black dark:border-white bg-gray-50 dark:bg-white/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-900 dark:text-white capitalize">{model.type} Rate</span>
                                            <span className="text-lg font-bold">${model.price}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{model.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Describe the Job</label>
                            <textarea 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="E.g. I need three ceiling fans installed in my living room..."
                                className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black focus:ring-2 focus:ring-primary outline-none min-h-[120px]"
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                         <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Date</label>
                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <Calendar 
                                    startDate={selectedDate} 
                                    endDate="" 
                                    setStartDate={setSelectedDate} 
                                    setEndDate={() => {}} 
                                    onClose={() => {}} 
                                />
                            </div>
                         </div>
                         <div>
                             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Time</label>
                             <div className="grid grid-cols-4 gap-2">
                                 {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                                     <button 
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`py-2 rounded-lg text-sm font-semibold transition-colors ${selectedTime === time ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20'}`}
                                     >
                                         {time}
                                     </button>
                                 ))}
                             </div>
                         </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Service Location</label>
                        {(user?.addresses || []).map(addr => (
                            <button
                                key={addr.id}
                                onClick={() => {
                                    setSelectedAddress(addr);
                                    setIsManualAddressOpen(false);
                                }}
                                className={`w-full p-4 rounded-xl border-2 flex items-start gap-3 transition-all ${selectedAddress?.id === addr.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <div className={`mt-1 ${selectedAddress?.id === addr.id ? 'text-primary' : 'text-gray-400'}`}><MapPinIcon /></div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 dark:text-white">{addr.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{addr.addressLine1}, {addr.city}</p>
                                </div>
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setIsManualAddressOpen((value) => !value);
                                setSelectedAddress(null);
                            }}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:border-primary hover:text-primary transition-colors"
                        >
                            {isManualAddressOpen ? 'Hide manual address form' : '+ Add New Address'}
                        </button>
                        {isManualAddressOpen ? (
                            <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/5 md:grid-cols-2">
                                <input
                                    value={manualAddress.name}
                                    onChange={(e) => setManualAddress((current) => ({ ...current, name: e.target.value }))}
                                    placeholder="Address label"
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black"
                                />
                                <input
                                    value={manualAddress.country}
                                    onChange={(e) => setManualAddress((current) => ({ ...current, country: e.target.value }))}
                                    placeholder="Country"
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black"
                                />
                                <input
                                    value={manualAddress.addressLine1}
                                    onChange={(e) => setManualAddress((current) => ({ ...current, addressLine1: e.target.value }))}
                                    placeholder="Street address"
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black md:col-span-2"
                                />
                                <input
                                    value={manualAddress.city}
                                    onChange={(e) => setManualAddress((current) => ({ ...current, city: e.target.value }))}
                                    placeholder="City"
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black"
                                />
                                <input
                                    value={manualAddress.state}
                                    onChange={(e) => setManualAddress((current) => ({ ...current, state: e.target.value }))}
                                    placeholder="State / region"
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black"
                                />
                                <input
                                    value={manualAddress.zip}
                                    onChange={(e) => setManualAddress((current) => ({ ...current, zip: e.target.value }))}
                                    placeholder="Postal code"
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black"
                                />
                                <button
                                    onClick={() => {
                                        const manualSelection = resolveManualAddress();
                                        if (!manualSelection) {
                                            showNotification('Enter a label, street address, city, and country to continue.');
                                            return;
                                        }
                                        setSelectedAddress(manualSelection);
                                        showNotification('Manual address selected for this booking.');
                                    }}
                                    className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary"
                                >
                                    Use this address
                                </button>
                            </div>
                        ) : null}
                    </div>
                );
            case 4: 
                return (
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Booking Summary</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Service</span>
                                    <span className="font-semibold">{service.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Provider</span>
                                    <span className="font-semibold">{service.provider?.name || 'Provider'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Date & Time</span>
                                    <span className="font-semibold">{selectedDate} at {selectedTime}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Location</span>
                                    <span className="font-semibold">{(selectedAddress || resolveManualAddress())?.addressLine1}</span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between text-lg font-bold">
                                    <span>Total Estimated</span>
                                    <span className="text-primary">${selectedModel.price}{selectedModel.type === 'hourly' ? '/hr' : ''}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-center text-gray-500">Payment will be held in secure escrow until the job is completed.</p>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[101] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white">Book Service</h2>
                        <p className="text-xs text-gray-500">Step {step} of 4</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><span className="text-xl">&times;</span></button>
                </div>

                {/* Progress Bar */}
                <div className="flex px-6 pt-6 gap-2">
                    {steps.map(s => (
                        <div key={s.id} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s.id <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    ))}
                </div>

                <div className="px-6 pt-4">
                    {runtimeLoading ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Checking live booking availability...
                        </div>
                    ) : (
                        <RuntimeModeNotice snapshot={runtimeSnapshot} title="Booking runtime" />
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {isOwnService ? (
                        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                            This is your own service. Open the provider hub to manage it instead of placing a booking.
                        </div>
                    ) : null}
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                    <button 
                        onClick={handleBack} 
                        disabled={step === 1}
                        className="px-6 py-3 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Back
                    </button>
                    <button 
                        onClick={step === 4 ? handleConfirmBooking : handleNext}
                        disabled={isLoading || isOwnService || (step === 4 && isBookingBlocked)}
                        className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2"
                    >
                        {isLoading ? <Spinner size="sm" className={step === 4 ? "text-white dark:text-black" : ""} /> : (isOwnService ? 'Own service' : step === 4 ? (isBookingBlocked ? 'Booking blocked' : 'Confirm Booking') : 'Next Step')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ServiceBookingModal;

