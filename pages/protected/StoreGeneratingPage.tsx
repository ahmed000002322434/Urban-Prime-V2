
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateStorefront } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import type { Store, StoreCreationData, Item, Review } from '../../types';

const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black animate-float">
        <path d="M12 3c.3 0 .5.2.5.5v3c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-3c0-.3.2-.5.5-.5zM6.4 6.4c.2-.2.5-.2.7 0l2.1 2.1c.2.2.2.5 0 .7s-.5.2-.7 0L6.4 7.1c-.2-.2-.2-.5 0-.7zm11.3 0c.2-.2.5-.2.7 0s.2.5 0 .7l-2.1 2.1c-.2.2-.5.2-.7 0s-.2-.5 0-.7l2.1-2.1zM4 12c0-.3.2-.5.5-.5h3c.3 0 .5.2.5.5s-.2.5-.5.5h-3c-.3 0-.5-.2-.5-.5zm15.5.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-3c-.3 0-.5.2-.5.5s.2.5.5.5h3zM6.4 17.6c.2-.2.5-.2.7 0l2.1 2.1c.2.2.2.5 0 .7s-.5.2-.7 0l-2.1-2.1c-.2-.2-.2-.5 0-.7zm11.3 0c.2-.2.5-.2.7 0s.2.5 0 .7l-2.1 2.1c-.2.2-.5.2-.7 0s-.2-.5 0-.7l2.1-2.1zM12 21c.3 0 .5-.2.5-.5v-3c0-.3-.2-.5-.5-.5s-.5.2-.5-.5v3c0 .3.2-.5.5-.5z" />
    </svg>
);

const generationSteps = [
  { progress: 10, message: "Analyzing your brand identity...", duration: 2000 },
  { progress: 30, message: "Crafting a unique color palette and font pairing...", duration: 3000 },
  { progress: 50, message: "Generating a creative logo concept...", duration: 2500 },
  { progress: 70, message: "Writing compelling copy for your Home and About pages...", duration: 4000 },
  { progress: 90, message: "Assembling the final page layouts...", duration: 3000 },
  { progress: 100, message: "Your new store is ready!", duration: 1000 },
];

const helpfulTips = [
    "Tip: High-quality photos can increase rentals by over 50%.",
    "Tip: A clear and friendly cancellation policy builds trust with renters.",
    "Tip: Respond to messages quickly to secure more bookings.",
    "Tip: Consider offering bundles or discounts for longer rentals.",
    "Tip: Keep your item descriptions detailed and honest.",
];

const StoreGeneratingPage: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const creationData = location.state?.creationData as StoreCreationData | undefined;

    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("Getting things started...");
    const [tip, setTip] = useState(helpfulTips[0]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!creationData || !user) {
            navigate('/create-store');
            return;
        }

        const runGeneration = async () => {
            try {
                // Simulate progress and messages
                let currentStep = 0;
                const progressInterval = setInterval(() => {
                    if (currentStep < generationSteps.length) {
                        const step = generationSteps[currentStep];
                        setProgress(step.progress);
                        setMessage(step.message);
                        currentStep++;
                    } else {
                        clearInterval(progressInterval);
                    }
                }, 2400); // Average time per step

                // Run actual generation in parallel
                const [userItems, userReviews] = await Promise.all([
                    itemService.getItemsByOwner(user.id),
                    itemService.getReviewsForOwner(user.id),
                ]);
                
                const aiResult = await generateStorefront({ 
                    questionnaireAnswers: creationData.questionnaireAnswers, 
                    logoUrl: creationData.logoUrl 
                }, userItems, userReviews);
                
                // Construct the full Store object
                const newStore: Store = {
                    id: '', // Will be set by service on save
                    ownerId: user.id,
                    slug: aiResult.slug,
                    name: creationData.questionnaireAnswers.find(a => a.question.includes("name of your store"))?.answer || 'My Store',
                    tagline: creationData.questionnaireAnswers.find(a => a.question.includes("tagline"))?.answer || '',
                    logo: creationData.logoUrl || '',
                    category: creationData.category,
                    city: creationData.city,
                    products: [],
                    pixes: [],
                    reviews: [],
                    followers: [],
                    badges: ['just-launched'],
                    sections: [], // Fixed missing sections property to resolve TypeScript error
                    socialLinks: creationData.socialLinks,
                    policies: creationData.policies,
                    brandingKit: aiResult.brandingKit,
                    layout: aiResult.layout,
                    banner: aiResult.banner,
                    pages: aiResult.pages,
                    questionnaireAnswers: aiResult.questionnaireAnswers,
                    createdAt: new Date().toISOString(),
                };
                
                // Finalize and navigate
                clearInterval(progressInterval);
                setProgress(100);
                setMessage("Your new store is ready!");
                setTimeout(() => {
                    navigate('/store/preview', { state: { storefront: newStore }, replace: true });
                }, 1500);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred during generation.');
            }
        };

        runGeneration();

        const tipInterval = setInterval(() => {
            setTip(prev => helpfulTips[(helpfulTips.indexOf(prev) + 1) % helpfulTips.length]);
        }, 4000);

        return () => clearInterval(tipInterval);

    }, [creationData, user, navigate]);

    if (error) {
        return (
            <div className="container mx-auto text-center py-20 animate-fade-in-up">
                <h2 className="text-2xl text-red-500 font-bold">Store Generation Failed</h2>
                <p className="mt-2 text-gray-500 max-w-lg mx-auto">{error}</p>
                <button 
                    onClick={() => navigate('/create-store', { state: { creationData }, replace: true })} 
                    className="mt-6 px-6 py-2 bg-black text-white rounded-lg font-semibold"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in-up">
            <div className="max-w-2xl mx-auto text-center">
                <MagicWandIcon />
                <h1 className="text-3xl font-bold mt-6 font-display">Your AI Store is Being Built!</h1>
                <p className="text-lg text-gray-600 mt-2">Please wait a moment, this can take up to a minute.</p>
                
                <div className="w-full bg-gray-200 rounded-full h-4 my-8 overflow-hidden">
                    <div 
                        className="bg-black h-4 rounded-full transition-all duration-500 ease-in-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="min-h-[4rem]">
                    <p className="text-xl font-semibold transition-opacity duration-300" key={message}>{message}</p>
                    <p className="text-gray-500 mt-4 transition-opacity duration-300" key={tip}>{tip}</p>
                </div>
            </div>
        </div>
    );
};

export default StoreGeneratingPage;

