import React, { useState, useEffect, useCallback } from 'react';
import { itemService } from '../../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import type { Offer } from '../../types';
import Spinner from '../../components/Spinner';
import { Link } from 'react-router-dom';

const OffersPage: React.FC = () => {
    const { user } = useAuth();
    const { currency } = useTranslation();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    const fetchOffers = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const offersData = await itemService.getOffersForUser(user.id);
            setOffers(offersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Failed to fetch offers:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const handleUpdateOffer = async (offerId: string, status: 'accepted' | 'declined') => {
        await itemService.updateOfferStatus(offerId, status);
        fetchOffers(); // Refresh the list
    };
    
    const receivedOffers = offers.filter(o => o.seller.id === user?.id);
    const sentOffers = offers.filter(o => o.buyer.id === user?.id);

    const TabButton: React.FC<{tab: 'received' | 'sent', children: React.ReactNode}> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:border-gray-300'}`}
        >
            {children}
        </button>
    );
    
    const OfferCard: React.FC<{offer: Offer, type: 'received' | 'sent'}> = ({ offer, type }) => {
        const isReceived = type === 'received';
        const otherUser = isReceived ? offer.buyer : offer.seller;
        
        return (
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row items-center gap-4">
                <img src={offer.itemImageUrl} alt={offer.itemTitle} className="w-20 h-20 rounded-md object-cover flex-shrink-0" />
                <div className="flex-grow text-center sm:text-left">
                    <p className="text-sm text-gray-500">
                        {isReceived ? `Offer from ${otherUser.name}` : `Offer to ${otherUser.name}`}
                    </p>
                    <Link to={`/item/${offer.itemId}`} className="font-bold hover:underline">{offer.itemTitle}</Link>
                    <p className="text-lg font-bold text-primary">{currency.symbol}{offer.offerPrice.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                     <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize 
                        ${offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          offer.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          'bg-red-100 text-red-800'}`
                     }>
                        {offer.status}
                    </span>
                    {isReceived && offer.status === 'pending' && (
                        <div className="flex gap-2">
                            <button onClick={() => handleUpdateOffer(offer.id, 'accepted')} className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600">Accept</button>
                            <button onClick={() => handleUpdateOffer(offer.id, 'declined')} className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600">Decline</button>
                        </div>
                    )}
                </div>
            </div>
        )
    };
    
    const renderContent = (offersList: Offer[], type: 'received' | 'sent') => {
        if(isLoading) return <Spinner />;
        if(offersList.length === 0) return <p className="text-center text-gray-500 py-10">No {type} offers found.</p>;
        return (
            <div className="space-y-4">
                {offersList.map(offer => <OfferCard key={offer.id} offer={offer} type={type} />)}
            </div>
        )
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-6">My Offers</h1>
            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                <div className="border-b border-gray-200 mb-6">
                    <TabButton tab="received">Received ({receivedOffers.length})</TabButton>
                    <TabButton tab="sent">Sent ({sentOffers.length})</TabButton>
                </div>
                {activeTab === 'received' ? renderContent(receivedOffers, 'received') : renderContent(sentOffers, 'sent')}
            </div>
        </div>
    );
};

export default OffersPage;
