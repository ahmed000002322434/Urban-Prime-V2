
import React, { useState, useEffect } from 'react';
import { serviceService } from '../../services/itemService';
import type { Service } from '../../types';
import Spinner from '../../components/Spinner';
import ServiceCard from '../../components/ServiceCard';

const BrowseServicesPage: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            setIsLoading(true);
            try {
                const servicesData = await serviceService.getServices();
                setServices(servicesData);
            } catch (error) {
                console.error("Failed to fetch services:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchServices();
    }, []);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <header className="text-center mb-12">
                <h1 className="text-5xl font-extrabold tracking-tight font-display text-text-primary">Browse Services</h1>
                <p className="mt-4 text-xl text-text-secondary">Find professionals for any task, from home repairs to personal coaching.</p>
            </header>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {services.map(service => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <h3 className="text-2xl font-semibold text-text-primary">No Services Found</h3>
                    <p className="text-text-secondary mt-2">There are currently no services listed. Check back soon!</p>
                </div>
            )}
        </div>
    );
};

export default BrowseServicesPage;