import React from 'react';

// FIX: Change component to React.FC to correctly handle the 'key' prop.
const PerkCard: React.FC<{ title: string, partner: string, description: string }> = ({ title, partner, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-slate-500">{partner}</p>
        <h3 className="text-xl font-bold text-primary dark:text-white my-1">{title}</h3>
        <p className="text-slate-600">{description}</p>
    </div>
);

const PerksPage: React.FC = () => {
    const perks = [
        { partner: "Oakland Coffee Co.", title: "15% Off Your Order", description: "Rent any item in Oakland and show your rental confirmation for a discount on artisan coffee." },
        { partner: "SF Printworks", title: "20% Off Photo Prints", description: "Renting camera or video gear? Get a special discount on high-quality prints for your projects." },
        { partner: "Bay Area Adventures", title: "10% Off Guided Tours", description: "After renting outdoor gear from Urban Prime, book a guided kayak or hiking tour and save." },
        { partner: "The Tool Shed", title: "$10 Off Your Next Purchase", description: "Rented a tool for a DIY project? Get a voucher for materials at our partner hardware store." },
    ];

    return (
        <div className="bg-white min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-primary dark:text-white">Local Perks</h1>
                    <p className="mt-4 text-xl text-slate-600">Exclusive deals for the Urban Prime community from our local partners.</p>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* FIX: Changed key from index to a unique string (perk.title) and removed the unnecessary index parameter. */}
                    {perks.map((perk) => (
                        <PerkCard key={perk.title} {...perk} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PerksPage;
