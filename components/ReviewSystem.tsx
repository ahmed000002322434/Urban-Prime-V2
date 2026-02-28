
import React, { useState } from 'react';
import StarRating from './StarRating';
import Spinner from './Spinner';
import LottieAnimation from './LottieAnimation';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';

interface ReviewSystemProps {
    onSubmit: (rating: number, comment: string) => Promise<void>;
}

const ReviewSystem: React.FC<ReviewSystemProps> = ({ onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;
        setIsSubmitting(true);
        try {
            await onSubmit(rating, comment);
        } catch (error) {
            console.error("Failed to submit review:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 mt-6">
            <div className="flex items-center justify-center gap-2 mb-4">
                <LottieAnimation src={uiLottieAnimations.userReviews} alt="User reviews animation" className="h-24 w-24 object-contain" loop autoplay />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">How was your experience?</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center">
                    <StarRating rating={rating} interactive onRatingChange={setRating} size="lg" />
                </div>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your review here..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-dark-background text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    rows={4}
                />
                <button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
                    className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                >
                    {isSubmitting ? <Spinner size="sm" className="text-white" /> : "Submit Review"}
                </button>
            </form>
        </div>
    );
};

export default ReviewSystem;
