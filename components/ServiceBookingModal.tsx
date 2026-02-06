
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import type { Service, Address, ServicePricingModel } from '../types';
import Calendar from './Calendar';
import Spinner from './Spinner';
import { listerService } from '../services/itemService';
import { useNotification } from '../context/NotificationContext';

// Icons
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;

interface ServiceBookingModalProps {
    service: Service;
    onClose: () => void;
}

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
    const [selectedModel, setSelectedModel] = useState<ServicePricingModel>(service.pricingModels[0]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(user?.addresses?.[0] || null);

    const handleNext = () => {
        if (step === 1 && !description.trim()) { showNotification("Please describe the job."); return; }
        if (step === 2 && (!selectedDate || !selectedTime)) { showNotification("Please select a date and time."); return; }
        if (step === 3 && !selectedAddress) { showNotification("Please select an address."); return; }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleConfirmBooking = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Construct booking object
            // In a real app, this would use a dedicated 'createServiceBooking' endpoint
            // We reuse addBooking for simulation but with service-specific metadata
            await listerService.addBooking(
                { ...service, id: service.id } as any, // Mock Item-Service compatibility
                user,
                `${selectedDate}T${selectedTime}:00`,
                `${selectedDate}T${parseInt(selectedTime)+1}:00`, // Default 1 hour duration mock
                selectedModel.price,
                selectedAddress
            );
            
            showNotification("Booking request sent successfully!");
            onClose();
        } catch (error) {
            console.error(error);
            showNotification("Failed to book service.");
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
                        {user?.addresses?.map(addr => (
                            <button
                                key={addr.id}
                                onClick={() => setSelectedAddress(addr)}
                                className={`w-full p-4 rounded-xl border-2 flex items-start gap-3 transition-all ${selectedAddress?.id === addr.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <div className={`mt-1 ${selectedAddress?.id === addr.id ? 'text-primary' : 'text-gray-400'}`}><MapPinIcon /></div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 dark:text-white">{addr.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{addr.addressLine1}, {addr.city}</p>
                                </div>
                            </button>
                        ))}
                        <button className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:border-primary hover:text-primary transition-colors">
                            + Add New Address
                        </button>
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
                                    <span className="font-semibold">{service.provider.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Date & Time</span>
                                    <span className="font-semibold">{selectedDate} at {selectedTime}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Location</span>
                                    <span className="font-semibold">{selectedAddress?.addressLine1}</span>
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

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
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
                        disabled={isLoading}
                        className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2"
                    >
                        {isLoading ? <Spinner size="sm" className={step === 4 ? "text-white dark:text-black" : ""} /> : (step === 4 ? 'Confirm Booking' : 'Next Step')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ServiceBookingModal;
