import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { storeBuildService } from '../../services/storeBuildService';
import { affiliateCommissionService } from '../../services/affiliateCommissionService';

const StorePreviewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const storeData = location.state?.storeData || {};
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const resolvedStoreId =
        location.state?.storeId ||
        storeData?.id ||
        (user ? (await storeBuildService.getUserStore(user.id))?.id : null);

      if (!resolvedStoreId) {
        throw new Error('Store record not found.');
      }

      await storeBuildService.publishStore(resolvedStoreId);
      if (user?.id) {
        await affiliateCommissionService.processSellerReferralBonus(user.id, resolvedStoreId).catch(() => null);
      }
      showNotification('Store published successfully.');
      navigate('/store/manager');
    } catch (error) {
      console.error('Store publish failed:', error);
      showNotification('Store publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const previewContent = (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.section
        className="relative rounded-2xl overflow-hidden min-h-[400px] flex items-end p-8"
        style={{
          background: `linear-gradient(135deg, ${storeData.primaryColor}20 0%, ${storeData.primaryColor}05 100%)`
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="z-10">
          <div className="text-8xl mb-4">{storeData.logoEmoji}</div>
          <h1 className="text-5xl font-black mb-3">{storeData.storeName}</h1>
          <p className="text-2xl text-gray-600 mb-6">{storeData.tagline}</p>
          <p className="text-lg text-gray-600 max-w-2xl mb-6">{storeData.description}</p>
          <button
            style={{ backgroundColor: storeData.primaryColor }}
            className="px-8 py-4 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Browse Rentals
          </button>
        </div>
      </motion.section>

      {/* Featured Items */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-6">Featured Items</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-gray-200 h-64 flex items-center justify-center text-gray-400">
              <div className="text-5xl">📸</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Categories */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold mb-6">Shop by Category</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {['Clothing', 'Accessories', 'Electronics'].map((cat) => (
            <div
              key={cat}
              className="p-8 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-gray-200 hover:border-gray-400 cursor-pointer transition-all text-center"
            >
              <div className="text-4xl mb-3">📦</div>
              <p className="font-bold text-gray-900">{cat}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Story Section */}
      <motion.section
        className="grid md:grid-cols-2 gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-8 bg-gray-50 rounded-xl">
          <h3 className="text-2xl font-bold mb-4">Our Story</h3>
          <p className="text-gray-700 leading-relaxed">{storeData.story}</p>
        </div>
        <div className="p-8 bg-gray-50 rounded-xl">
          <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
          <p className="text-gray-700 leading-relaxed">{storeData.mission}</p>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold mb-6">Customer Reviews</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Jessica M.', rating: 5, review: 'Excellent quality and fast delivery!' },
            { name: 'Michael T.', rating: 5, review: 'Best rental service in town!' },
            { name: 'Amanda L.', rating: 5, review: 'Highly recommended!' },
          ].map((testimonial, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <span key={j} className="text-yellow-400">⭐</span>
                ))}
              </div>
              <p className="text-gray-700 mb-3 italic">"{testimonial.review}"</p>
              <p className="font-semibold text-gray-900">— {testimonial.name}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <motion.section
        className="border-t pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-gray-900 mb-3">About</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">About Us</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">How it works</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Policies</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Rental Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Return Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Privacy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Contact</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Email</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Phone</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Address</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Follow</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Instagram</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Facebook</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">TikTok</a></li>
            </ul>
          </div>
        </div>
      </motion.section>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <motion.div
        className="bg-white border-b border-gray-200 sticky top-0 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                {storeData.logoEmoji} Store Preview
              </h1>
              <p className="text-gray-600">See how your store will look to customers</p>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'desktop' | 'mobile')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
              <button
                onClick={() => navigate('/store/customize')}
                className="px-6 py-2 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200"
              >
                Edit Layout
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className={`container transition-all duration-300 ${viewMode === 'desktop' ? 'max-w-7xl' : 'max-w-md'} mx-auto px-4 py-8`}>
        <motion.div
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${
            viewMode === 'mobile' ? 'border-8 border-black rounded-3xl' : ''
          }`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className={`bg-gradient-to-br from-white to-gray-50 ${viewMode === 'mobile' ? 'max-w-md mx-auto' : ''}`}>
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{storeData.logoEmoji}</span>
                  <span className="font-bold text-gray-900 hidden sm:inline">{storeData.storeName}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <a href="#" className="text-gray-600 hover:text-gray-900">Browse</a>
                  <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
                  <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
                </div>
              </div>
            </nav>

            {/* Content */}
            <div className="p-6 sm:p-12">
              {previewContent}
            </div>
          </div>
        </motion.div>

        {viewMode === 'mobile' && (
          <div className="text-center mt-4 text-gray-600 text-sm">
            Mobile Preview
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto max-w-7xl px-4 py-6 flex gap-4 justify-between">
          <button
            onClick={() => navigate('/store/customize')}
            className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200"
          >
            Back to Customize
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/store/setup')}
              className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200"
            >
              Make Changes
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700"
            >
              {isPublishing ? 'Publishing...' : 'Publish Store Now →'}
            </button>
          </div>
        </div>
      </motion.div>
      <div className="h-24" />
    </div>
  );
};

export default StorePreviewPage;
