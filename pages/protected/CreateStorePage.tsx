
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateImageFromPrompt } from '../../services/geminiService';
import type { StoreCreationData } from '../../types';
import Spinner from '../../components/Spinner';
import { CATEGORIES } from '../../constants';
import BackButton from '../../components/BackButton';

const LOCAL_STORAGE_KEY = 'storeCreationProgress';

const steps = [
    { number: 1, title: 'Welcome' },
    { number: 2, title: 'Branding' },
    { number: 3, title: 'AI Logo Generator' },
    { number: 4, title: 'About Your Store' },
    { number: 5, title: 'Style & Appearance' },
    { number: 6, title: 'Policies & Final Touches' },
];

const ProgressBar: React.FC<{currentStep: number}> = ({ currentStep }) => (
    <div className="flex justify-center items-center mb-8">
        {steps.map(({ number, title }) => {
            const isActive = currentStep === number;
            const isCompleted = currentStep > number;
            return (
                <React.Fragment key={number}>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-all duration-300 ${isCompleted ? 'bg-black text-white border-black' : isActive ? 'border-black text-black' : 'border-gray-300 text-gray-400'}`}>
                            {isCompleted ? '✓' : number}
                        </div>
                        <p className={`mt-2 text-xs font-semibold text-center w-20 ${isActive || isCompleted ? 'text-black' : 'text-gray-400'}`}>{title}</p>
                    </div>
                    {number < steps.length && <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${isCompleted ? 'bg-black' : 'bg-gray-200'}`}></div>}
                </React.Fragment>
            );
        })}
    </div>
);


const CreateStorePage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    // FIX: Added missing fields to form state to match StoreCreationData requirements.
    const [formData, setFormData] = useState({
        storeName: '', tagline: '', city: '', category: '', logoUrl: '', logoPrompt: '', description: '', idealCustomer: '', story: '', style: '', primaryColor: '', rentalPeriod: '', cancellationPolicy: '', contact: '', pickupInstructions: '', delivery: '', finalWords: '', welcomeMessage: '', promotions: '', website: '', instagram: '', twitter: ''
    });
    const [logoIdeas, setLogoIdeas] = useState<string[]>([]);
    const [isGeneratingLogos, setIsGeneratingLogos] = useState(false);

    useEffect(() => {
        const savedProgress = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedProgress) {
            try {
                const { savedStep, savedFormData } = JSON.parse(savedProgress);
                if (savedStep && savedFormData) {
                    setStep(savedStep);
                    setFormData(prev => ({ ...prev, ...savedFormData }));
                }
            } catch (e) { console.error("Could not parse saved store progress", e); }
        }
    }, []);

    useEffect(() => {
        const progress = { savedStep: step, savedFormData: formData };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
    }, [step, formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (step === steps.length) {
            const questionnaireAnswers = [
                { question: "What is the name of your store?", answer: formData.storeName },
                { question: "In one sentence, what is the tagline for your store?", answer: formData.tagline },
                { question: "Briefly describe what you rent out. What makes your items special?", answer: formData.description },
                { question: "Who is your ideal customer or renter?", answer: formData.idealCustomer },
                { question: "What inspired you to start renting your items? Tell us a bit of your story.", answer: formData.story },
                { question: "Describe the visual style or vibe you want for your store.", answer: formData.style },
                { question: "What is the primary color you'd like for your brand?", answer: formData.primaryColor },
                { question: "Do you have a standard rental period?", answer: formData.rentalPeriod },
                { question: "What is your policy on cancellations or late returns?", answer: formData.cancellationPolicy },
                { question: "How should customers contact you for support?", answer: formData.contact },
                { question: "Are there any special instructions for picking up or returning items?", answer: formData.pickupInstructions },
                { question: "Do you offer delivery?", answer: formData.delivery },
                { question: "What's one thing you want every renter to know about your service?", answer: formData.finalWords },
                { question: "Is there a specific welcome message you'd like on your store's homepage?", answer: formData.welcomeMessage },
                { question: "Any special offers or promotions to highlight?", answer: formData.promotions },
                // Include logo prompt as part of the branding context
                { question: "What is the concept for your logo?", answer: formData.logoPrompt}
            ];
            // FIX: Add missing properties to satisfy the StoreCreationData type.
            const finalData: StoreCreationData = { 
                questionnaireAnswers, 
                logoUrl: formData.logoUrl,
                category: formData.category,
                city: formData.city,
                socialLinks: {
                    instagram: formData.instagram,
                    twitter: formData.twitter,
                    website: formData.website
                },
                policies: {
                    shipping: formData.delivery,
                    returns: formData.cancellationPolicy
                }
            };
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            navigate('/store/generating', { state: { creationData: finalData } });
        } else {
            setStep(s => s + 1);
        }
    };

    const handleBack = () => setStep(s => s - 1);

    const handleGenerateLogos = async () => {
        if (!formData.logoPrompt) return;
        setIsGeneratingLogos(true);
        setLogoIdeas([]);
        try {
            const prompts = [
                `a simple, minimalist, vector logo of ${formData.logoPrompt}, clean, simple, on a white background`,
                `a modern, abstract logo mark for ${formData.logoPrompt}, vector, flat design, white background`,
                `an elegant, line art logo of ${formData.logoPrompt}, professional, minimal, on a white background`,
            ];
            const results = await Promise.all(prompts.map(p => generateImageFromPrompt(p)));
            setLogoIdeas(results);
        } catch (error) { console.error("Logo generation failed", error); } 
        finally { setIsGeneratingLogos(false); }
    };

    const handleLetAIDecide = () => {
        const questionnaireAnswers = [
            { question: "What is the name of your store?", answer: formData.storeName },
            { question: "In one sentence, what is the tagline for your store?", answer: formData.tagline },
            { question: "What is the concept for your logo?", answer: formData.logoPrompt },
            { question: "Describe the visual style or vibe you want for your store.", answer: 'AI_CHOICE' },
            { question: "What is the primary color you'd like for your brand?", answer: 'AI_CHOICE' },
        ];
        // FIX: Add missing properties to satisfy the StoreCreationData type.
        const finalData: StoreCreationData = { 
            questionnaireAnswers, 
            logoUrl: formData.logoUrl,
            category: formData.category,
            city: formData.city,
            socialLinks: {
                instagram: formData.instagram,
                twitter: formData.twitter,
                website: formData.website
            },
            policies: {
                shipping: formData.delivery,
                returns: formData.cancellationPolicy
            }
        };
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        navigate('/store/generating', { state: { creationData: finalData } });
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Create Your AI-Powered Storefront</h2>
                    <p className="text-gray-500 mb-6">Let's get started. Answer a few questions and our AI will build a personalized store for you. Your progress is saved automatically.</p>
                </div>
            );
            case 2: return (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">Let's start with the basics.</h2>
                    <div className="space-y-4">
                        <input name="storeName" value={formData.storeName} onChange={handleChange} placeholder="What is the name of your store?" className="w-full p-3 bg-gray-50 border rounded-lg" required />
                        <input name="tagline" value={formData.tagline} onChange={handleChange} placeholder="In one sentence, what is your store's tagline?" className="w-full p-3 bg-gray-50 border rounded-lg" required />
                        {/* FIX: Add city and category inputs to collect required data. */}
                        <input name="city" value={formData.city} onChange={handleChange} placeholder="What city is your store based in?" className="w-full p-3 bg-gray-50 border rounded-lg" required />
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-gray-50 border rounded-lg" required>
                            <option value="" disabled>Select your primary store category</option>
                            {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                </div>
            );
             case 3: return (
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-center">Describe a logo you'd like.</h2>
                    <p className="text-gray-500 mb-4 text-center text-sm">e.g., "a mountain and a sun", "a stylized camera lens"</p>
                    <div className="flex gap-2">
                         <input name="logoPrompt" value={formData.logoPrompt} onChange={handleChange} placeholder="Logo description..." className="w-full p-3 bg-gray-50 border rounded-lg" />
                         <button type="button" onClick={handleGenerateLogos} disabled={isGeneratingLogos} className="px-4 py-2 bg-black text-white font-semibold rounded-lg disabled:bg-gray-400 whitespace-nowrap">{isGeneratingLogos ? <Spinner size="sm" /> : "Generate"}</button>
                    </div>
                    
                    <div className="my-4 text-center text-sm text-gray-400">OR</div>
                    <button
                        type="button"
                        onClick={handleLetAIDecide}
                        className="w-full p-4 mb-4 rounded-lg text-center font-semibold border-2 transition-all duration-300 flex items-center justify-center gap-2 border-purple-500 bg-purple-50 text-purple-700 hover:border-purple-600"
                    >
                        ✨ Let AI Decide Everything & Build My Store Now
                    </button>

                    {isGeneratingLogos && <p className="text-center text-sm text-gray-500 mt-2">AI is creating your logos... (this may take a moment)</p>}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        {logoIdeas.map((url, i) => (
                            <img key={i} src={url} onClick={() => setFormData(p => ({...p, logoUrl: url}))} className={`cursor-pointer rounded-md border-4 ${formData.logoUrl === url ? 'border-black' : 'border-transparent hover:border-gray-300'}`} alt="AI generated logo idea" />
                        ))}
                    </div>
                </div>
            );
            case 4: return (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">Tell us about your store.</h2>
                    <div className="space-y-4">
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Briefly describe what you rent out. What makes your items special?" rows={3} className="w-full p-3 bg-gray-50 border rounded-lg" required />
                        <input name="idealCustomer" value={formData.idealCustomer} onChange={handleChange} placeholder="Who is your ideal customer? (e.g., families, filmmakers)" className="w-full p-3 bg-gray-50 border rounded-lg" required />
                        <textarea name="story" value={formData.story} onChange={handleChange} placeholder="What inspired you to start renting your items?" rows={3} className="w-full p-3 bg-gray-50 border rounded-lg" required />
                    </div>
                </div>
            );
            case 5: 
                const styles = [ { name: "Modern & Clean", colors: "bg-gradient-to-r from-slate-100 to-white" }, { name: "Rugged & Outdoorsy", colors: "bg-gradient-to-r from-green-100 to-yellow-50" }, { name: "Fun & Playful", colors: "bg-gradient-to-r from-blue-100 to-pink-50" }, { name: "Vintage & Classic", colors: "bg-gradient-to-r from-amber-100 to-stone-100" } ];
                return (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-center">Choose a visual style.</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                           {styles.map(s => <button key={s.name} type="button" onClick={() => setFormData(p => ({...p, style: s.name}))} className={`p-8 rounded-lg text-center font-semibold border-4 transition-opacity ${formData.style === s.name ? 'border-black' : 'border-gray-200'} ${s.colors}`}>{s.name}</button>)}
                        </div>
                        <input 
                            name="primaryColor" 
                            value={formData.primaryColor}
                            onChange={handleChange} 
                            placeholder="Or, what is the primary color you'd like? (e.g., a deep forest green)" 
                            className="w-full p-3 bg-gray-50 border rounded-lg"
                            required 
                        />
                    </div>
                );
            case 6: return (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">Policies & Final Touches</h2>
                    <div className="space-y-4">
                        <input name="rentalPeriod" value={formData.rentalPeriod} onChange={handleChange} placeholder="Standard rental period? (e.g., daily, weekly)" className="w-full p-3 bg-gray-50 border rounded-lg" />
                        <textarea name="cancellationPolicy" value={formData.cancellationPolicy} onChange={handleChange} placeholder="What is your cancellation or late return policy?" rows={2} className="w-full p-3 bg-gray-50 border rounded-lg" />
                        {/* FIX: Add missing inputs for policies and social links. */}
                        <textarea name="delivery" value={formData.delivery} onChange={handleChange} placeholder="What are your shipping/delivery options?" rows={2} className="w-full p-3 bg-gray-50 border rounded-lg" />
                        <input name="website" value={formData.website} onChange={handleChange} placeholder="Website URL (optional)" className="w-full p-3 bg-gray-50 border rounded-lg" />
                        <input name="instagram" value={formData.instagram} onChange={handleChange} placeholder="Instagram handle (optional)" className="w-full p-3 bg-gray-50 border rounded-lg" />
                        <input name="twitter" value={formData.twitter} onChange={handleChange} placeholder="Twitter/X handle (optional)" className="w-full p-3 bg-gray-50 border rounded-lg" />
                        <input name="welcomeMessage" value={formData.welcomeMessage} onChange={handleChange} placeholder="A specific welcome message for your homepage?" className="w-full p-3 bg-gray-50 border rounded-lg" />
                         <input name="promotions" value={formData.promotions} onChange={handleChange} placeholder="Any special offers or promotions to highlight?" className="w-full p-3 bg-gray-50 border rounded-lg" />
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="bg-white min-h-screen">
             <div className="absolute top-8 left-8 z-50">
                <BackButton to="/profile" alwaysShowText />
            </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
                <div className="max-w-3xl mx-auto">
                    <ProgressBar currentStep={step} />
                    
                    <div className="mt-8 bg-white p-8 rounded-2xl shadow-soft border border-gray-200 min-h-[400px]">
                         {renderStepContent()}
                    </div>

                    <div className="mt-8 flex justify-between">
                        <button 
                            onClick={handleBack} 
                            disabled={step === 1} 
                            className="px-6 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button 
                            onClick={handleNext} 
                            className="px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            {step === steps.length ? "Finish & Build" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateStorePage;
