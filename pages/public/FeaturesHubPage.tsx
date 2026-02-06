
import React from 'react';
import BackButton from '../../components/BackButton';

const FeatureCard: React.FC<{ title: string; icon: string; desc: string }> = ({ title, icon, desc }) => (
    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-cyan-500 transition-colors group">
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const FeaturesHubPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white p-8 md:p-20">
            <BackButton className="text-white mb-12" />
            <h1 className="text-5xl md:text-7xl font-black mb-6 font-display">FUTURE TECH</h1>
            <p className="text-xl text-gray-400 mb-20 max-w-3xl">Urban Prime isn't just a marketplace. It's a technology platform built on the bleeding edge of commerce.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard 
                    title="Blockchain Authenticity" 
                    icon="⛓️" 
                    desc="Every luxury item is minted as an NFT on the Polygon network. Scan the QR code to see the full chain of custody, repair logs, and verified authenticity certificate. Impossible to fake."
                />
                <FeatureCard 
                    title="Smart Lock IoT" 
                    icon="🔓" 
                    desc="Rent bikes and scooters instantly. Our app communicates directly with IoT locks. Payment unlocks the device, and ending the ride locks it back up."
                />
                <FeatureCard 
                    title="Carbon Tracking" 
                    icon="🌿" 
                    desc="We calculate the exact CO2 saved by renting instead of buying new. Track your personal impact and earn eco-badges for hitting sustainability milestones."
                />
                <FeatureCard 
                    title="Dynamic Pricing AI" 
                    icon="📈" 
                    desc="Prices adjust in real-time based on local demand, weather, and time of day. Get cheaper rates on rainy days or during off-peak hours automatically."
                />
                <FeatureCard 
                    title="Voice Commerce" 
                    icon="🎙️" 
                    desc="Just ask. 'Hey Urban, find me a drone for this weekend.' Our natural language engine filters thousands of listings to find your perfect match."
                />
                <FeatureCard 
                    title="Courier Tracking" 
                    icon="🚚" 
                    desc="Watch your item move on a live map from the lender's door to yours. Uber-style tracking for peer-to-peer rentals ensures you never miss a drop-off."
                />
            </div>
        </div>
    );
};

export default FeaturesHubPage;
