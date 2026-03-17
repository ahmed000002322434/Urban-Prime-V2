import React from 'react';
import { Link } from 'react-router-dom';
import type { Service } from '../types';
import StarRating from './StarRating';
import { useTranslation } from '../hooks/useTranslation';

const ServiceCard: React.FC<{ service: Service }> = ({ service }) => {
    const { currency } = useTranslation();

    const startingPrice = service.pricingModels.reduce((min, p) => p.price < min ? p.price : min, Infinity);
    const hasHourly = service.pricingModels.some(p => p.type === 'hourly');

    return (
        <div className="relative group flex flex-col glass-panel glass-panel-hover h-full overflow-hidden">
            <Link to={`/service/${service.id}`} className="block">
                <div className="relative overflow-hidden aspect-video bg-gray-100/10">
                    <img src={service.imageUrls[0]} alt={service.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
            </Link>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="font-bold text-base text-text-primary line-clamp-2 leading-snug font-display">
                        <Link to={`/service/${service.id}`} className="hover:text-primary transition-colors">{service.title}</Link>
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <img src={service.provider.avatar} alt={service.provider.name} className="w-6 h-6 rounded-full" />
                        <span className="text-xs font-semibold text-text-secondary">{service.provider.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 mt-2 mb-3">
                    <StarRating rating={service.avgRating} size="sm" />
                    <span className="text-[10px] text-text-secondary font-medium">({service.reviews.length})</span>
                </div>
                <div className="flex justify-between items-end border-t pt-3 border-white/10">
                    <div>
                        <p className="text-xs text-text-secondary">Starting from</p>
                        <p className="font-extrabold text-lg text-text-primary tracking-tight">
                            {isFinite(startingPrice) ? `${currency.symbol}${startingPrice.toFixed(2)}` : 'Custom'}
                            {hasHourly && isFinite(startingPrice) && <span className="text-xs font-normal text-text-secondary capitalize ml-0.5">/hr</span>}
                        </p>
                    </div>
                    <Link to={`/service/${service.id}`} className="px-4 py-2 glass-button rounded-lg text-xs font-bold hover:opacity-80 transition-colors shadow-md">
                        View
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
