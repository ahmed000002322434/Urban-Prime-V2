
import React from 'react';
import type { Review } from '../types';
import StarRating from './StarRating';

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <div className="bg-surface p-4 rounded-xl border border-border/70 flex items-start gap-4">
      <img src={review.author.avatar} alt={review.author.name} className="w-10 h-10 rounded-full object-cover" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-text-primary text-sm">{review.author.name}</p>
            <p className="text-xs text-text-secondary">{new Date(review.date).toLocaleDateString()}</p>
          </div>
          <StarRating rating={review.rating} size="sm" />
        </div>
        <p className="mt-2 text-text-secondary text-sm leading-relaxed">{review.comment}</p>
        {review.imageUrls && review.imageUrls.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {review.imageUrls.map((url, index) => (
              <img key={index} src={url} alt={`Review image ${index + 1}`} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
