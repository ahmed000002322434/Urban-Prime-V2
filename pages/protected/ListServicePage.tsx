
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { serviceService } from '../../services/itemService';
import { generateProfessionalBio } from '../../services/geminiService';
import type { Service, ServicePricingModel } from '../../types';
import { HIERARCHICAL_SERVICE_CATEGORIES } from '../../constants';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

// --- Icons ---
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-500"><path d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Z"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;

// --- UI Components ---
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full px-4 py-3 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-text-secondary text-sm font-medium text-text-primary" />;
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className="w-full px-4 py-3 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium text-text-primary" />;
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className="w-full px-4 py-3 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-text-secondary text-sm font-medium text-text-primary" />;

const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
    <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i + 1 <= currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
    </div>
);

const ListServicePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<Service>>({
        title: '',
        description: '',
        category: '',
        imageUrls: [],
        pricingModels: [{ type: 'hourly', price: 50, description: 'Standard hourly rate' }],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handlePriceChange = (index: number, field: keyof ServicePricingModel, value: any) => {
        const newModels = [...(formData.pricingModels || [])];
        // @ts-ignore
        newModels[index][field] = field === 'price' ? parseFloat(value) : value;
        setFormData(prev => ({...prev, pricingModels: newModels}));
    };

    const addPricingModel = () => {
        setFormData(prev => ({
            ...prev,
            pricingModels: [...(prev.pricingModels || []), { type: 'fixed', price: 100, description: 'Package Name' }]
        }));
    };

    const removePricingModel = (index: number) => {
        if (formData.pricingModels && formData.pricingModels.length > 1) {
            const newModels = [...formData.pricingModels];
            newModels.splice(index, 1);
            setFormData(prev => ({...prev, pricingModels: newModels}));
        }
    };
    
    const handleGenerateDescription = async () => {
        if (!formData.title) return;
        setIsGeneratingBio(true);
        try {
            const bio = await generateProfessionalBio(formData.title);
            setFormData(prev => ({ ...prev, description: bio }));
        } catch (e) {
            showNotification("AI generation failed.");
        } finally {
            setIsGeneratingBio(false);
        }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                 setFormData(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ev.target?.result as string] }));
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const handlePublish = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await serviceService.addService(formData, user);
            showNotification("Service submitted for approval!");
            navigate('/profile/provider-dashboard');
        } catch(e) {
            showNotification("Failed to submit service.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="text-center mb-8">
                             <h2 className="text-2xl font-bold font-display text-text-primary">Service Basics</h2>
                             <p className="text-text-secondary">What kind of service are you offering?</p>
                        </div>
                        <div>
                             <label className="block text-sm font-bold mb-2 text-text-primary">Service Title</label>
                             <Input name="title" placeholder="e.g. Expert Residential Electrician" value={formData.title} onChange={handleChange} autoFocus />
                        </div>
                        <div>
                             <label className="block text-sm font-bold mb-2 text-text-primary">Category</label>
                             <Select name="category" value={formData.category} onChange={handleChange}>
                                <option value="">Select a category</option>
                                {HIERARCHICAL_SERVICE_CATEGORIES.map(cat => (
                                    <optgroup label={cat.name} key={cat.id}>
                                        {cat.subcategories?.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                                    </optgroup>
                                ))}
                            </Select>
                        </div>
                         <div className="relative">
                             <label className="block text-sm font-bold mb-2 text-text-primary">Description</label>
                             <Textarea name="description" placeholder="Describe your experience and what's included..." value={formData.description} onChange={handleChange} rows={6} />
                             <button 
                                onClick={handleGenerateDescription} 
                                disabled={isGeneratingBio || !formData.title}
                                className="absolute bottom-4 right-4 flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md hover:bg-purple-100 disabled:opacity-50"
                             >
                                 {isGeneratingBio ? <Spinner size="sm" /> : <><SparklesIcon /> AI Write</>}
                             </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-fade-in-up">
                         <div className="text-center mb-8">
                             <h2 className="text-2xl font-bold font-display text-text-primary">Pricing & Packages</h2>
                             <p className="text-text-secondary">How do you want to charge?</p>
                        </div>
                         {formData.pricingModels?.map((model, index) => (
                                <div key={index} className="p-6 bg-surface-soft rounded-xl border border-border relative">
                                    {formData.pricingModels && formData.pricingModels.length > 1 && (
                                        <button onClick={() => removePricingModel(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1 rounded-full">
                                            <TrashIcon />
                                        </button>
                                    )}
                                    <div className="grid gap-4">
                                        <div className="flex gap-4">
                                            <div className="w-1/2">
                                                 <label className="text-xs font-bold uppercase mb-1 block">Type</label>
                                                <Select value={model.type} onChange={e => handlePriceChange(index, 'type', e.target.value)}>
                                                    <option value="hourly">Hourly Rate</option>
                                                    <option value="fixed">Fixed Price</option>
                                                    <option value="custom_offer">Custom Offer</option>
                                                </Select>
                                            </div>
                                             <div className="w-1/2">
                                                 <label className="text-xs font-bold uppercase mb-1 block">Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-bold">$</span>
                                                    <Input type="number" value={model.price} onChange={e => handlePriceChange(index, 'price', e.target.value)} className="pl-8"/>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">Description / Package Name</label>
                                            <Input value={model.description} onChange={e => handlePriceChange(index, 'description', e.target.value)} placeholder="e.g. Standard Cleaning (2 Bed)" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                             <button onClick={addPricingModel} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary font-bold hover:border-primary hover:text-primary transition-colors">
                                + Add Another Pricing Option
                            </button>
                    </div>
                );
            case 3:
                return (
                     <div className="space-y-6 animate-fade-in-up">
                        <div className="text-center mb-8">
                             <h2 className="text-2xl font-bold font-display text-text-primary">Portfolio & Media</h2>
                             <p className="text-text-secondary">Showcase your best work.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                             {formData.imageUrls?.map((url, i) => (
                                 <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                                     <img src={url} alt="Portfolio" className="w-full h-full object-cover" />
                                 </div>
                             ))}
                             <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                 <UploadIcon />
                                 <span className="text-xs font-bold mt-2 text-text-secondary">Upload Photo</span>
                                 <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                             </label>
                        </div>
                     </div>
                );
            default: return null;
        }
    };
    
    return (
         <div className="bg-background min-h-screen py-10 flex items-center justify-center">
            <div className="w-full max-w-2xl px-4">
                <div className="mb-6">
                    <BackButton to="/profile/provider-dashboard" />
                </div>
                
                <div className="bg-surface p-8 rounded-2xl shadow-xl border border-border">
                     <ProgressBar currentStep={step} totalSteps={3} />
                     
                     <div className="min-h-[300px]">
                        {renderStep()}
                     </div>

                     <div className="flex justify-between mt-10 pt-6 border-t border-border">
                         {step > 1 ? (
                             <button onClick={() => setStep(s => s - 1)} className="px-6 py-2.5 font-bold text-text-secondary hover:bg-surface-soft rounded-lg">Back</button>
                         ) : <div></div>}
                         
                         {step < 3 ? (
                             <button onClick={() => setStep(s => s + 1)} className="px-8 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90">Next Step</button>
                         ) : (
                             <button onClick={handlePublish} disabled={isLoading} className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:opacity-90 flex items-center gap-2">
                                 {isLoading ? <Spinner size="sm" /> : "Submit Service"}
                             </button>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ListServicePage;

