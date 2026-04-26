
import React, { useState } from 'react';
import { useUserData } from '../../hooks/useUserData';
import ItemCard from '../../components/ItemCard';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import QuickViewModal from '../../components/QuickViewModal';
import type { Item } from '../../types';

const wishlistArtwork = new URL('../../dashboard images/empty wishlist state.png', import.meta.url).href;

const WishlistPage: React.FC = () => {
  const { wishlistItems, isLoading } = useUserData();
  const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);

  return (
    <>
      {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in-up">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight font-display text-text-primary">My Wishlist</h1>
          <p className="mt-4 text-xl text-text-secondary">All your saved items, ready for your next adventure.</p>
        </header>
        
        {isLoading ? (
          <Spinner size="lg" className="mt-16" />
        ) : wishlistItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            {wishlistItems.map((item) => (
              item.title ? <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} /> : null
            ))}
          </div>
        ) : (
          <EmptyState
              title="Your Wishlist is Empty"
              message="Browse items and click the heart icon to save them for later."
              buttonText="Start Browsing"
              buttonLink="/browse"
              imageSrc={wishlistArtwork}
              imageAlt="UrbanPrime wishlist illustration"
              imageClassName="h-56 w-auto max-w-full object-contain"
          />
        )}
      </div>
    </>
  );
};

export default WishlistPage;
