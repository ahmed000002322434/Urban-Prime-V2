import React from 'react';

const ConstructionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
        <path d="M17 12h.01"></path>
        <path d="M12 12h.01"></path>
        <path d="M7 12h.01"></path>
        <path d="M5 20v-4"></path>
        <path d="M19 20v-4"></path>
    </svg>
);

const HelpPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <div className="max-w-2xl mx-auto text-center py-16">
                <ConstructionIcon />
                <h1 className="text-4xl font-extrabold tracking-tight mt-6">Coming Soon!</h1>
                <p className="mt-4 text-lg text-slate-600">
                    Our Help Center is under construction. We're working hard to bring you a comprehensive support hub.
                </p>
            </div>
        </div>
    );
};

export default HelpPage;