
import React from 'react';
// FIX: Switched from namespace import for 'react-router-dom' to a named import for 'Link' to resolve module resolution error.
import { Link } from 'react-router-dom';

// FIX: Change component to React.FC to correctly handle the 'key' prop.
const GuideCard: React.FC<{ title: string, description: string, link: string }> = ({ title, description, link }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1">
        <h3 className="text-xl font-bold text-primary dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 mb-4">{description}</p>
        <Link to={link} className="font-semibold text-primary dark:text-white hover:underline">Read More &rarr;</Link>
    </div>
);

const GuidesPage: React.FC = () => {
    const guides = [
        { title: "How to Get Started with Drone Photography", description: "A beginner's guide to capturing stunning aerial shots, from basic controls to cinematic movements.", link: "#" },
        { title: "Choosing the Right Gear for Your Camping Trip", description: "Don't get caught in the wild without the essentials. Learn what you need for a safe and comfortable trip.", link: "#" },
        { title: "5 Tips for Creating the Perfect Rental Listing", description: "Learn how to take great photos and write compelling descriptions to make your items stand out.", link: "#" },
        { title: "DIY Home Projects: Tools You Should Rent, Not Buy", description: "Save money and storage space by renting these powerful tools for your next big home improvement project.", link: "#" },
    ];

    return (
        <div className="bg-white min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-primary dark:text-white">Urban Prime Guides</h1>
                    <p className="mt-4 text-xl text-slate-600">Expert tips and tutorials to help you make the most of your rental experience.</p>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* FIX: Changed key from index to a unique string (guide.title) and removed the unnecessary index parameter. */}
                    {guides.map((guide) => (
                        <GuideCard key={guide.title} {...guide} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GuidesPage;
