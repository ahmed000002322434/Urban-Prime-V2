import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { itemService } from '../../services/itemService';
import type { Event } from '../../types';
import Spinner from '../../components/Spinner';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const EventCard: React.FC<{ event: Event, delay: number }> = ({ event, delay }) => {
    const cardRef = useScrollReveal<HTMLDivElement>();
    const eventDate = new Date(event.date);

    return (
        <div ref={cardRef} className="animate-reveal bg-white dark:bg-dark-surface rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row overflow-hidden" style={{ transitionDelay: `${delay}ms` }}>
            <div className="md:w-1/3">
                <img src={event.imageUrl} alt={event.title} className="w-full h-48 md:h-full object-cover" />
            </div>
            <div className="md:w-2/3 p-6 flex flex-col">
                <div className="flex-grow">
                    <p className="text-sm font-semibold text-primary">{event.location}</p>
                    <h3 className="text-2xl font-bold font-display my-2 text-gray-900 dark:text-dark-text">{event.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{event.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-600 flex justify-between items-center">
                    <div>
                        <p className="font-bold text-gray-800 dark:text-dark-text">{eventDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button className="px-6 py-2 bg-black text-white font-semibold rounded-full text-sm hover:bg-gray-800">
                        RSVP
                    </button>
                </div>
            </div>
        </div>
    );
};


const EventsPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const heroRef = useScrollReveal<HTMLDivElement>();

    useEffect(() => {
        setIsLoading(true);
        itemService.getEvents()
            .then(data => setEvents(data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="bg-gray-50 dark:bg-dark-background min-h-screen animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                    Events & Workshops
                </h1>
                <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Connect with the community, learn new skills, and get inspired.
                </p>
            </section>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <h2 className="text-3xl font-bold font-display mb-8 dark:text-dark-text">Upcoming Events</h2>
                {isLoading ? (
                    <Spinner size="lg" />
                ) : (
                    <div className="space-y-8">
                        {events.map((event, index) => (
                            <EventCard key={event.id} event={event} delay={index * 100} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventsPage;