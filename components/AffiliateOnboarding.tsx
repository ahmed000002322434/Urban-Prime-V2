import React, { useState } from 'react';
import type { AffiliateProfile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import { userService } from '../services/itemService';
import { useCategories } from '../context/CategoryContext';
import ProgressBar from './ProgressBar';
import Spinner from './Spinner';

interface AffiliateOnboardingProps {
  onComplete: () => void;
}

const steps = [
    { title: 'Welcome' },
    { title: 'Your Goal' },
    { title: 'Promotion' },
    { title: 'Interests' },
    { title: 'Experience' },
    { title: 'Support' },
    { title: 'Features' },
];

const AffiliateOnboarding: React.FC<AffiliateOnboardingProps> = ({ onComplete }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const { categories } = useCategories();
    const [step, setStep] = useState(1);
    const [animationClass, setAnimationClass] = useState('animate-slide-in-right');
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState<Partial<AffiliateProfile>>({
        primaryGoal: 'exploring',
        promotionMethods: [],
        interestedCategories: [],
        experienceLevel: 'beginner',
        supportNeeded: [],
        wantsShopTheLook: true,
        wantsSellerReferrals: true,
    });

    const changeStep = (nextStep: number) => {
        setAnimationClass('animate-slide-out-left');
        setTimeout(() => {
            setStep(nextStep);
            setAnimationClass('animate-slide-in-right');
        }, 400);
    };

    const handleNext = () => {
        if (step < steps.length) {
            changeStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) changeStep(step - 1);
    };
    
    const handleMultiSelect = (field: keyof AffiliateProfile, value: any) => {
        setFormData(prev => {
            const currentValues = (prev[field] as any[]) || [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [field]: newValues };
        });
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await userService.completeAffiliateOnboarding(user.id, formData as AffiliateProfile);
            showNotification("Your affiliate profile is set up!");
            onComplete();
        } catch (error) {
            console.error(error);
            showNotification("Could not save your preferences.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderStepContent = () => {
        switch (step) {
            case 1: return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Welcome to the Affiliate Program!</h2>
                    <p className="text-gray-500 mb-6">Let's personalize your experience. Answer a few quick questions to help us tailor the dashboard to your needs.</p>
                </div>
            );
            case 2: return (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">What is your primary goal?</h2>
                    <div className="space-y-3">
                        {(['income', 'business', 'sharing', 'exploring'] as const).map(goal => (
                             <button key={goal} onClick={() => setFormData(p => ({...p, primaryGoal: goal}))} className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${formData.primaryGoal === goal ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}>
                                {goal === 'income' && 'Earn supplemental income'}
                                {goal === 'business' && 'Build a full-time business'}
                                {goal === 'sharing' && 'Share products I love'}
                                {goal === 'exploring' && 'Just exploring for now'}
                             </button>
                        ))}
                    </div>
                </div>
            );
            case 3: return (
                 <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">How do you plan to promote products?</h2>
                     <p className="text-sm text-gray-500 mb-4 text-center">Select all that apply.</p>
                    <div className="space-y-3">
                        {(['blog', 'social', 'email', 'youtube', 'word_of_mouth'] as const).map(method => (
                             <button key={method} onClick={() => handleMultiSelect('promotionMethods', method)} className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${formData.promotionMethods?.includes(method) ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}>
                                {method === 'blog' && 'On my blog or website'}
                                {method === 'social' && 'Social Media (Instagram, TikTok, etc.)'}
                                {method === 'email' && 'Email Newsletters'}
                                {method === 'youtube' && 'YouTube Videos'}
                                {method === 'word_of_mouth' && 'Word of mouth / With friends'}
                             </button>
                        ))}
                    </div>
                </div>
            );
            case 4: return (
                 <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">Which categories are you most interested in?</h2>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => handleMultiSelect('interestedCategories', cat.id)} className={`px-4 py-2 rounded-full font-semibold border-2 transition-colors ${formData.interestedCategories?.includes(cat.id) ? 'bg-primary text-white border-primary' : 'hover:border-gray-400'}`}>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                 </div>
            );
            case 5: return (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">What's your affiliate marketing experience?</h2>
                     <div className="space-y-3">
                        {(['beginner', 'intermediate', 'pro'] as const).map(level => (
                             <button key={level} onClick={() => setFormData(p => ({...p, experienceLevel: level}))} className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${formData.experienceLevel === level ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}>
                                {level === 'beginner' && "I'm a complete beginner"}
                                {level === 'intermediate' && "I have some experience"}
                                {level === 'pro' && "I'm a seasoned pro"}
                             </button>
                        ))}
                    </div>
                </div>
            );
            case 6: return (
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">What kind of support would be most helpful?</h2>
                     <div className="space-y-3">
                        {(['assets', 'trends', 'analytics', 'guides'] as const).map(support => (
                             <button key={support} onClick={() => handleMultiSelect('supportNeeded', support)} className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${formData.supportNeeded?.includes(support) ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}>
                                {support === 'assets' && "Pre-made marketing materials (banners, etc.)"}
                                {support === 'trends' && "Tips on what's trending"}
                                {support === 'analytics' && "Advanced analytics to track performance"}
                                {support === 'guides' && "Guides on how to promote effectively"}
                             </button>
                        ))}
                    </div>
                </div>
            );
            case 7: return (
                 <div>
                    <h2 className="text-xl font-semibold mb-4 text-center">Which features are you interested in?</h2>
                     <div className="space-y-3">
                        <button onClick={() => setFormData(p=>({...p, wantsShopTheLook: !p.wantsShopTheLook}))} className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${formData.wantsShopTheLook ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}>
                            Creating curated "Shop the Look" collections
                        </button>
                        <button onClick={() => setFormData(p=>({...p, wantsSellerReferrals: !p.wantsSellerReferrals}))} className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${formData.wantsSellerReferrals ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}>
                            Referring new sellers to earn bonuses
                        </button>
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <div className="max-w-3xl mx-auto">
                <ProgressBar steps={steps} currentStep={step} />
                <div className="mt-8 bg-white p-8 rounded-2xl shadow-soft border border-gray-200 overflow-hidden min-h-[400px]">
                    <div className={animationClass}>
                        {renderStepContent()}
                    </div>
                </div>
                 <div className="mt-6 flex justify-between items-center">
                    <button type="button" onClick={handleBack} disabled={step === 1 || isLoading} className="px-6 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50">Back</button>
                    <button type="button" onClick={handleNext} disabled={isLoading} className="px-10 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 disabled:bg-primary/70 flex items-center min-w-[120px] justify-center">
                        {isLoading ? <Spinner size="sm"/> : (step === steps.length ? 'Finish Setup' : 'Next')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AffiliateOnboarding;