import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { listingsService } from '../services/listingsService';
import ListingForm from './ListingForm';
import type { Item } from '../types';

interface ListingState {
  listings: Item[];
  isLoading: boolean;
  error: string | null;
}

const ListingsManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ListingState>({
    listings: [],
    isLoading: true,
    error: null
  });

  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState<Item | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [stats, setStats] = useState({
    totalListings: 0,
    publishedListings: 0,
    draftListings: 0,
    totalStock: 0,
    totalValue: 0
  });
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadListings();
    loadStats();
  }, [user?.id]);

  const loadListings = async () => {
    if (!user?.id) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const listings = await listingsService.getSellerListings(user.id, {
        includeArchived: filter === 'archived' || filter === 'all'
      });

      const filtered = listings.filter((l) => {
        if (filter === 'all') return true;
        return l.status === filter;
      });

      setState({
        listings: filtered,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load listings';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const listingStats = await listingsService.getListingStats(user.id);
      setStats(listingStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateSuccess = (listing: Item) => {
    setFormSuccess(`Listing "${listing.title}" created successfully!`);
    setShowForm(false);
    setEditingListing(null);
    loadListings();
    loadStats();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleUpdateSuccess = (listing: Item) => {
    setFormSuccess(`Listing "${listing.title}" updated successfully!`);
    setEditingListing(null);
    loadListings();
    loadStats();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleFormError = (error: string) => {
    setFormError(error);
    setTimeout(() => setFormError(null), 3000);
  };

  const handlePublish = async (listingId: string) => {
    try {
      await listingsService.publishListing(listingId);
      setFormSuccess('Listing published successfully!');
      loadListings();
      loadStats();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish';
      setFormError(message);
      setTimeout(() => setFormError(null), 3000);
    }
  };

  const handleUnpublish = async (listingId: string) => {
    try {
      await listingsService.unpublishListing(listingId);
      setFormSuccess('Listing unpublished successfully!');
      loadListings();
      loadStats();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unpublish';
      setFormError(message);
      setTimeout(() => setFormError(null), 3000);
    }
  };

  const handleArchive = async (listingId: string) => {
    try {
      await listingsService.archiveListing(listingId);
      setFormSuccess('Listing archived successfully!');
      loadListings();
      loadStats();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive';
      setFormError(message);
      setTimeout(() => setFormError(null), 3000);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
      return;
    }

    try {
      await listingsService.deleteListing(listingId);
      setFormSuccess('Listing deleted successfully!');
      loadListings();
      loadStats();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      setFormError(message);
      setTimeout(() => setFormError(null), 3000);
    }
  };

  const toggleSelectListing = (id: string) => {
    const newSelected = new Set(selectedListings);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedListings(newSelected);
  };

  const handleBulkPublish = async () => {
    if (selectedListings.size === 0) return;
    try {
      await listingsService.bulkUpdateStatus(Array.from(selectedListings), 'published');
      setFormSuccess(`${selectedListings.size} listings published!`);
      setSelectedListings(new Set());
      loadListings();
      loadStats();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk publish';
      setFormError(message);
      setTimeout(() => setFormError(null), 3000);
    }
  };

  const displayListings = state.listings;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Message */}
      {formSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2"
        >
          <span className="text-xl">✓</span>
          {formSuccess}
        </motion.div>
      )}

      {/* Error Message */}
      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2"
        >
          <span className="text-xl">✕</span>
          {formError}
        </motion.div>
      )}

      {/* Form Modal */}
      {(showForm || editingListing) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center overflow-y-auto"
          onClick={() => {
            setShowForm(false);
            setEditingListing(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg w-full max-w-2xl m-4"
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingListing ? 'Edit Listing' : 'Create New Listing'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingListing(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <ListingForm
                initialData={editingListing}
                onSuccess={editingListing ? handleUpdateSuccess : handleCreateSuccess}
                onError={handleFormError}
                sellerId={user?.id || ''}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Listings</h1>
              <p className="text-gray-600 mt-2">Manage your rental and sale items</p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingListing(null);
              }}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Create Listing
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: stats.totalListings, color: 'bg-blue-50 text-blue-900' },
              { label: 'Published', value: stats.publishedListings, color: 'bg-green-50 text-green-900' },
              { label: 'Drafts', value: stats.draftListings, color: 'bg-yellow-50 text-yellow-900' },
              { label: 'Total Stock', value: stats.totalStock, color: 'bg-purple-50 text-purple-900' },
              {
                label: 'Total Value',
                value: `$${stats.totalValue.toFixed(2)}`,
                color: 'bg-indigo-50 text-indigo-900'
              }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-lg ${stat.color}`}
              >
                <p className="text-sm font-medium opacity-75">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter & Bulk Actions */}
        <div className="mb-6 flex justify-between items-center gap-4">
          <div className="flex gap-2">
            {(['all', 'published', 'draft', 'archived'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setSelectedListings(new Set());
                }}
                className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {selectedListings.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-2"
            >
              <p className="text-sm text-gray-600 py-2">{selectedListings.size} selected</p>
              <button
                onClick={handleBulkPublish}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
              >
                Publish All
              </button>
            </motion.div>
          )}
        </div>

        {/* Loading State */}
        {state.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : state.error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg"
          >
            <p>⚠️ {state.error}</p>
            <button
              onClick={loadListings}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </motion.div>
        ) : displayListings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No listings yet' : `No ${filter} listings`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Create your first listing to get started'
                : `Create or filter your listings`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingListing(null);
                }}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Create Your First Listing
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {displayListings.map((listing, idx) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 overflow-hidden transition"
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedListings.has(listing.id)}
                    onChange={() => toggleSelectListing(listing.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                  />

                  {/* Image */}
                  <div className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {listing.images?.[0] ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                        🖼️
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {listing.description}
                        </p>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          {/* Status Badge */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              listing.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : listing.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : listing.status === 'archived'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {listing.status}
                          </span>

                          {/* Listing Type */}
                          <span className="text-sm text-gray-600">
                            {listing.listingType === 'both'
                              ? '🔄 Sale & Rent'
                              : listing.listingType === 'rent'
                                ? '📅 Rental'
                                : listing.listingType === 'sale'
                                  ? '🛍️ For Sale'
                                  : '🏷️ Auction'}
                          </span>

                          {/* Price */}
                          <span className="text-sm font-semibold text-gray-900">
                            {listing.price && `$${listing.price.toFixed(2)}`}
                            {listing.rentalPrice && (
                              <span className="ml-2 text-gray-600">
                                ${listing.rentalPrice.toFixed(2)}/{listing.rentalPriceType}
                              </span>
                            )}
                          </span>

                          {/* Stock */}
                          <span className="text-sm text-gray-600">
                            Stock: <strong>{listing.stock}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingListing(listing)}
                          className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit listing"
                        >
                          ✏️
                        </button>

                        {listing.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(listing.id)}
                            className="px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Publish listing"
                          >
                            📤
                          </button>
                        )}

                        {listing.status === 'published' && (
                          <button
                            onClick={() => handleUnpublish(listing.id)}
                            className="px-3 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                            title="Unpublish listing"
                          >
                            📥
                          </button>
                        )}

                        {listing.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(listing.id)}
                            className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            title="Archive listing"
                          >
                            📦
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(listing.id)}
                          className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete listing"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ListingsManagementPage;
