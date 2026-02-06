import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="relative block overflow-hidden rounded-xl bg-gray-200">
        <div className="aspect-[4/3] bg-gray-300"></div>
        <div className="p-5">
          <div className="h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-5"></div>
          <div className="flex items-baseline justify-end">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;