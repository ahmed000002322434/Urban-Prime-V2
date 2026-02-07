
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { serviceService } from '../../services/itemService';
import type { Service } from '../../types';
import Spinner from '../../components/Spinner';
import StarRating from '../../components/StarRating';
import VerifiedBadge from '../../components/VerifiedBadge';
import ServiceBookingModal from '../../components/ServiceBookingModal';
import BackButton from '../../components/BackButton';
import { useAuth } from '../../hooks/useAuth';

// Icons
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;

const ServiceDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, openAuthModal } = useAuth();
    const navigate = useNavigate();
    const [service, setService] = useState<Service | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            setIsLoading(true);
            serviceService.getServiceById(id)
                .then(setService)
                .finally(() => setIsLoading(false));
        }
    }, [id]);

    const handleBookNow = () => {
        if (!user) {
            openAuthModal('login');
            return;
        }
        setIsBookingModalOpen(true);
    };

    const handleMessageProvider = () => {
         if (!user) {
            openAuthModal('login');
            return;
        }
        // Redirect to messages with context (in a real app, this would create a thread)
        navigate(`/profile/messages?sellerId=${service?.provider.id}&serviceId=${service?.id}`);
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
    if (!service) return <div className="text-center py-20">Service not found.</div>;

    return (
        <>
            {isBookingModalOpen && <ServiceBookingModal service={service} onClose={() => setIsBookingModalOpen(false)} />}
            
            <div className="bg-gray-50 dark:bg-dark-background min-h-screen pb-20">
                {/* Hero Image */}
                <div className="h-[40vh] md:h-[50vh] relative">
                     <div className="absolute top-8 left-8 z-20">
                        <BackButton className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-lg !text-black" />
                    </div>
                    <img src={service.imageUrls[0]} alt={service.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white container mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">{service.category}</span>
                             <VerifiedBadge type="item" className="text-white bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-bold" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold font-display leading-tight">{service.title}</h1>
                        <div className="flex items-center gap-4 mt-4 text-sm md:text-base font-medium">
                             <div className="flex items-center gap-1"><StarRating rating={service.avgRating} size="sm" /> <span>{service.avgRating} ({service.reviews.length} reviews)</span></div>
                             <div className="flex items-center gap-1"><MapPinIcon /> <span>San Francisco, CA (Mock)</span></div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold font-display mb-4 text-gray-900 dark:text-white">About This Service</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{service.description}</p>
                            
                            <h3 className="text-lg font-bold font-display mt-8 mb-4 text-gray-900 dark:text-white">Service Features</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <CheckCircleIcon /> <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Certified Professional</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <ShieldIcon /> <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Satisfaction Guaranteed</span>
                                </div>
                                {/* Mock features */}
                                <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px]">✓</div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Bring own tools</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px]">✓</div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Cleanup included</span>
                                </div>
                            </div>
                        </div>

                        {/* Provider Bio */}
                        <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                             <h2 className="text-xl font-bold font-display mb-6 text-gray-900 dark:text-white">Meet the Pro</h2>
                             <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                 <img src={service.provider.avatar} alt={service.provider.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 dark:border-gray-600" />
                                 <div className="text-center sm:text-left flex-1">
                                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">{service.provider.name}</h3>
                                     <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 mb-3">
                                         <StarRating rating={service.provider.rating} size="sm" />
                                         <span className="text-sm text-gray-500 dark:text-gray-400">48 Jobs Completed</span>
                                     </div>
                                     <p className="text-sm text-gray-600 dark:text-gray-300">
                                         "Hi, I'm {service.provider.name.split(' ')[0]}. I've been a professional in this field for over 5 years. I take pride in my work and ensure every client is 100% satisfied."
                                     </p>
                                     <button onClick={handleMessageProvider} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                                         <MessageIcon /> Contact {service.provider.name.split(' ')[0]}
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Booking Sidebar */}
                    <div className="lg:col-span-1">
                         <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-24">
                             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select a Package</h3>
                             <div className="space-y-3 mb-6">
                                 {service.pricingModels.map((model, index) => (
                                     <div key={index} className="p-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl hover:border-black dark:hover:border-white transition-colors cursor-pointer group">
                                         <div className="flex justify-between items-center mb-1">
                                             <span className="font-bold text-gray-900 dark:text-white capitalize">{model.type}</span>
                                             <span className="text-lg font-black text-primary">${model.price}</span>
                                         </div>
                                         <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">{model.description}</p>
                                     </div>
                                 ))}
                             </div>
                             
                             <button onClick={handleBookNow} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95">
                                 Check Availability & Book
                             </button>
                             <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
                                 <ShieldIcon /> 100% Secure Payment Protection
                             </p>
                         </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ServiceDetailPage;

