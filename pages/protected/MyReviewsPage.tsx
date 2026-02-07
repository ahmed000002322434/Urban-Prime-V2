

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import type { Review } from '../../types';
import Spinner from '../../components/Spinner';
import StarRating from '../../components/StarRating';
import BackButton from '../../components/BackButton';

const ReviewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-700"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="m15 5 3 3"/></svg>;

const MyReviewsPage: React.FC = () => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // In a real app, you'd have a dedicated endpoint for this.
                // Here, we fetch all items and filter.
                // FIX: Added missing page property to the pagination object.
                const { items } = await itemService.getItems({ includeArchived: true }, { page: 1, limit: 1000 });
                const myReviews = items.flatMap(item => item.reviews).filter(review => review.author.id === user.id);
                setReviews(myReviews.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error("Failed to fetch reviews:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReviews();
    }, [user]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold font-display text-text-primary">My Reviews</h1>
            </div>
            <div className="bg-surface/80 backdrop-blur-xl p-6 rounded-xl shadow-soft border border-border">
                {isLoading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : reviews.length > 0 ? (
                    <div className="space-y-6">
                        {reviews.map(review => (
                            <div key={review.id} className="p-4 border-b border-border last:border-b-0 hover:bg-surface-soft/50 rounded-lg transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                                <div className="flex items-start gap-4">
                                    <Link to={`/item/${review.itemId}`}>
                                        <img src={review.itemImageUrl} alt={review.itemTitle} className="w-20 h-20 rounded-md object-cover flex-shrink-0 border border-border" />
                                    </Link>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Link to={`/item/${review.itemId}`} className="font-bold text-text-primary hover:underline">{review.itemTitle}</Link>
                                                <p className="text-xs text-text-secondary">{new Date(review.date).toLocaleDateString()}</p>
                                            </div>
                                            <StarRating rating={review.rating} />
                                        </div>
                                        <p className="mt-2 text-sm text-text-secondary leading-relaxed">{review.comment}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <ReviewIcon />
                        <h2 className="font-bold text-xl mt-4 text-text-primary">You Haven't Written Any Reviews</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Share your thoughts on items you've bought or rented to help the community.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyReviewsPage;
