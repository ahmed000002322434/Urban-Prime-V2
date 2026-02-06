import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { itemService } from '../services/itemService';
import StarRating from './StarRating';
import Spinner from './Spinner';
import type { Item, User } from '../types';

interface ReviewFormProps {
  itemId: string;
  onReviewSubmit: (updatedItem: Item) => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ itemId, onReviewSubmit }) => {
  const { user, openAuthModal } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        openAuthModal('login');
        return;
    }
    if (rating === 0 || !comment.trim()) {
      alert("Please provide a rating and a comment.");
      return;
    }
    setIsSubmitting(true);
    try {
      const authorInfo: Pick<User, 'id' | 'name' | 'avatar'> = { id: user.id, name: user.name, avatar: user.avatar };
      const updatedItem = await itemService.addReview(itemId, { rating, comment }, authorInfo);
      onReviewSubmit(updatedItem);
      // Reset form
      setRating(0);
      setComment('');
    } catch (error) {
      console.error("Failed to submit review", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
        <div className="mt-8 text-center p-6 bg-surface-soft rounded-lg">
            <p className="text-sm text-text-secondary">
                <button onClick={() => openAuthModal('login')} className="font-semibold text-primary hover:underline">Log in</button> to leave a review.
            </p>
        </div>
    );
  }

  return (
    <div className="mt-8 bg-surface-soft p-8 rounded-lg">
      <h3 className="text-xl font-bold text-text-primary">Write a Review</h3>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="font-semibold text-sm text-text-secondary">Your Rating</label>
          <StarRating rating={rating} onRatingChange={setRating} interactive />
        </div>
        <div>
          <label className="font-semibold text-sm text-text-secondary" htmlFor="comment">Your Review</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full p-3 mt-1 border rounded-md text-sm bg-surface border-border focus:ring-2 focus:ring-primary outline-none"
            placeholder="Share your thoughts about the item..."
            required
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-primary text-primary-text font-bold rounded-md disabled:bg-primary/70 min-w-[120px] flex justify-center">
            {isSubmitting ? <Spinner size="sm" /> : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
