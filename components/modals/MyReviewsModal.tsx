

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { itemService } from '../../services/itemService';
import type { Review } from '../../types';
import Spinner from '../Spinner';
import StarRating from '../StarRating';
import { Link } from 'react-router-dom';

const MyReviewsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            // FIX: Added missing page property to the pagination object.
            itemService.getItems({}, { page: 1, limit: 1000 }).then(({ items }) => {
                const myReviews = items.flatMap(item => item.reviews).filter(review => review.author.id === user.id);
                setReviews(myReviews.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
                setIsLoading(false);
            });
        }
    }, [user]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-light-text dark:text-dark-text">My Recent Reviews</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </header>
                <main className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map(review => (
                                <div key={review.id} className="p-3 border-b dark:border-gray-700 last:border-b-0">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm text-light-text dark:text-dark-text">{review.itemTitle}</p>
                                        <StarRating rating={review.rating} size="sm" />
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">"{review.comment}"</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-gray-500 py-10">You haven't written any reviews yet.</p>}
                </main>
                 <footer className="p-4 bg-gray-50 dark:bg-dark-surface/50 border-t dark:border-gray-700 text-center">
                    <Link to="/profile/reviews" onClick={onClose} className="text-sm font-semibold text-primary hover:underline">View All Reviews</Link>
                </footer>
            </div>
        </div>
    );
};

export default MyReviewsModal;