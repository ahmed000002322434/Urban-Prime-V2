import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService';
import { useCategories } from '../../context/CategoryContext';
import { editImageWithPrompt } from '../../services/geminiService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';

// --- Icons ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const MagicWandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-2.3 2.3a4 4 0 0 0 0 5.6L12 13l2.3-2.3a4 4 0 0 0 0-5.6Zm0 0L9.7 5.3a4 4 0 0 0 5.6 0L12 3Z"/><path d="M21 12c-2.3 2.3-4.8 3.3-6.4 2.9-.8-.2-1.2-.6-1.5-1.3L12 12l-1.1-1.6c-.3-.7-.7-1-1.5-1.3-1.6-.4-4.1.6-6.4 2.9"/><path d="M3 21c2.3-2.3 3.3-4.8 2.9-6.4-.2-.8-.6-1.2-1.3-1.5L6 12l-1.6-1.1c-.7-.3-1-.7-1.3-1.5-.4-1.6.6-4.1 2.9-6.4"/></svg>;

// --- UI Components ---
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none" />;
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none" />;
const FormCard: React.FC<{title: string; subtitle?: string; children: React.ReactNode}> = ({title, subtitle, children}) => (
    <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
        <h3 className="text-xl font-bold mb-1 text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
        <div className="space-y-4">{children}</div>
    </div>
);

// --- Main Page ---
const DigitalListItemPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const { categories, isLoading: isLoadingCategories } = useCategories();
    
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<Item>>({
        itemType: 'digital',
        imageUrls: [],
        licenseType: 'personal',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [mockupPrompt, setMockupPrompt] = useState('');
    const [isGeneratingMockups, setIsGeneratingMockups] = useState(false);
    
    const digitalCategories = categories.find(c => c.id === 'digital-products')?.subcategories || [];

    const handlePublish = async (status: 'published' | 'draft') => {
        if (!user) return;
        const finalData: Partial<Item> = { ...formData, status };
        setIsLoading(true);
        try {
            const newItem = await itemService.addItem(finalData, user);
            showNotification(status === 'published' ? "Digital product published!" : "Saved to drafts!");
            navigate(status === 'published' ? `/item/${newItem.id}` : '/profile/products');
        } catch (e) {
            showNotification("Failed to save product.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'number') {
            setFormData(prev => ({...prev, [name]: value === '' ? 0 : parseFloat(value)}));
            return;
        }

        setFormData(prev => ({...prev, [name]: value}));
    }
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                     setFormData(prev => ({ ...prev, digitalFileUrl: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateMockups = async () => {
        if (!formData.digitalFileUrl || !mockupPrompt) return;
        setIsGeneratingMockups(true);
        try {
            const base64 = formData.digitalFileUrl.split(',')[1];
            const mimeType = formData.digitalFileUrl.match(/data:(.*?);/)![1];
            // Use the original file as the base for all mockups
            const newImage = await editImageWithPrompt(base64, mimeType, `Place this image in a photorealistic mockup scene of: ${mockupPrompt}`);
            setFormData(prev => ({...prev, imageUrls: [...(prev.imageUrls || []), newImage]}));
            showNotification('Mockup generated!');
        } catch (error) {
            console.error(error);
            showNotification('AI mockup generation failed. Please try a different prompt.');
        } finally {
            setIsGeneratingMockups(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-bold font-display">List a Digital Product</h1>
                <div className="flex gap-2">
                    <button onClick={() => handlePublish('draft')} className="px-4 py-2 text-sm bg-gray-200 font-semibold rounded-md">Save as Draft</button>
                    <button onClick={() => handlePublish('published')} className="px-4 py-2 text-sm bg-primary text-white font-bold rounded-md">Publish Product</button>
                </div>
            </div>
            
            <FormCard title="Core Files" subtitle="Upload the primary file for your digital product. This is what your customers will receive.">
                <input type="file" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                {formData.digitalFileUrl && <p className="text-xs text-green-600">File uploaded successfully!</p>}
            </FormCard>
            
            <FormCard title="Details & Description" subtitle="Describe your item so buyers can find it. Be clear and creative.">
                <Input name="title" placeholder="Product Title" value={formData.title} onChange={handleChange} />
                <Textarea name="description" placeholder="Product Description..." value={formData.description} onChange={handleChange} rows={6} />
                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                    <option value="">Select a category...</option>
                    {digitalCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <Input name="version" placeholder="Version (e.g., 1.0, 2023 Edition)" value={formData.version} onChange={handleChange} />
            </FormCard>

            <FormCard title="Visuals & Mockups" subtitle="Showcase your product. Generate mockups with AI or upload your own images.">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                     <h4 className="font-semibold flex items-center gap-2"><MagicWandIcon /> AI Mockup Generator</h4>
                     <p className="text-xs text-gray-500 my-2">Describe a scene to place your product in. Be descriptive!</p>
                     <div className="flex gap-2">
                        <Input value={mockupPrompt} onChange={e => setMockupPrompt(e.target.value)} placeholder="e.g., 'A framed print on a minimalist wall'"/>
                        <button onClick={handleGenerateMockups} disabled={isGeneratingMockups || !formData.digitalFileUrl} className="px-4 py-2 bg-black text-white font-semibold rounded-lg disabled:bg-gray-400 whitespace-nowrap">
                            {isGeneratingMockups ? <Spinner size="sm"/> : 'Generate'}
                        </button>
                     </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {formData.imageUrls?.map((url, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={url} alt={`mockup ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                        </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary text-gray-500 hover:text-primary">
                        <UploadIcon />
                        <span className="text-xs mt-1 font-semibold">Upload</span>
                        <input type="file" multiple onChange={(e) => { /* Logic to upload additional images */ }} className="hidden" accept="image/*" />
                    </label>
                </div>
                 <div className="flex items-center gap-2">
                    <input type="checkbox" id="enable3d" checked={!!formData.enable3dPreview} onChange={e => setFormData(p => ({...p, enable3dPreview: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <label htmlFor="enable3d" className="text-sm font-medium">Enable 3D interactive preview (for 3D models)</label>
                 </div>
            </FormCard>

            <FormCard title="Pricing & Licensing" subtitle="Set your price and define how customers can use your product.">
                <Input name="salePrice" type="number" placeholder="Price" value={formData.salePrice} onChange={handleChange} />
                <select name="licenseType" value={formData.licenseType} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                    <option value="personal">Personal Use License</option>
                    <option value="commercial">Commercial Use License</option>
                    <option value="extended">Extended Commercial License</option>
                </select>
                <Textarea name="licenseDescription" placeholder="Briefly describe what's allowed (e.g., 'Use in unlimited personal projects. Not for resale.')" value={formData.licenseDescription} onChange={handleChange} rows={3} />
            </FormCard>
        </div>
    );
};

export default DigitalListItemPage;
