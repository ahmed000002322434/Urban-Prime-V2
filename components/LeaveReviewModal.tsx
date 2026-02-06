
import React, { useState } from 'react';
import { itemService } from '../services/itemService';
import type { Item, User } from '../types';
import StarRating from './StarRating';
import Spinner from './Spinner';

interface LeaveReviewModalProps {
    item: Item;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({ item, user, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;
        setIsSubmitting(true);
        try {
             const authorInfo = { id: user.id, name: user.name, avatar: user.avatar };
             await itemService.addReview(item.id, { rating, comment }, authorInfo);
             onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Completed!</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Funds have been released to the seller. How was your experience with <strong>{item.title}</strong>?</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex justify-center">
                            <StarRating rating={rating} onRatingChange={setRating} interactive size="lg" className="gap-2" />
                        </div>
                        
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Write a review (optional)..."
                            className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"
                            rows={3}
                        />

                        <div className="grid grid-cols-2 gap-3 pt-2">
                             <button type="button" onClick={onClose} className="py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                Skip
                            </button>
                            <button type="submit" disabled={isSubmitting || rating === 0} className="py-3 px-4 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center">
                                {isSubmitting ? <Spinner size="sm"/> : 'Submit Review'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeaveReviewModal;
