import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { storeBuildService } from '../../services/storeBuildService';
import { affiliateCommissionService } from '../../services/affiliateCommissionService';

const AffiliateOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    commissionRate: 15,
    maxReward: 50,
    platforms: ['instagram', 'tiktok'],
    enableCookies: true,
    cookieDuration: 30,
  });

  // Load existing affiliate settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const store = await storeBuildService.getUserStore(user.uid);
        
        if (!store) {
          setError('No store found. Please create a store first.');
          setIsLoading(false);
          return;
        }

        setStoreId(store.id || null);

        // Try to load existing affiliate program
        const existing = await affiliateCommissionService.getStoreAffiliatePerformance(store.id || '');
        if (existing.affiliates?.length > 0) {
          // Load first affiliate's settings as template
          // In production, you might want to show existing program settings
        }
      } catch (err: any) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user || !storeId) {
      setError('Missing user or store information');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save affiliate program to database
      await affiliateCommissionService.getStoreAffiliates(storeId);
      
      // In a real app, you might want to save the affiliate program settings
      // For now, we'll just navigate back to manager
      navigate('/store/manager');
    } catch (err: any) {
      console.error('Error saving affiliate program:', err);
      setError(err.message || 'Failed to save affiliate program');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Affiliate Program</h2>
              <p className="text-gray-600">Grow your revenue stream with influencers and partners</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {[
                { icon: '💰', title: 'Boost Sales', desc: 'Expand reach through affiliates' },
                { icon: '🌐', title: 'Simple Tracking', desc: 'Real-time affiliate performance' },
                { icon: '🎯', title: 'Custom Rates', desc: 'Set your own commission structure' },
                { icon: '📊', title: 'Analytics', desc: 'Detailed reporting & insights' },
              ].map((feature, i) => (
                <div key={i} className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <h3 className="font-bold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-gray-900">Commission Structure</h2>
            <div className="space-y-6 bg-gray-50 p-8 rounded-xl">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Base Commission Rate (%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-gray-600">5%</span>
                  <span className="text-2xl font-bold text-blue-600">{formData.commissionRate}%</span>
                  <span className="text-sm text-gray-600">50%</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Affiliates earn {formData.commissionRate}% commission on each sale they refer
                </p>
              </div>

              <div className="border-t pt-6">
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Max Reward Per Sale ($)
                </label>
                <input
                  type="number"
                  value={formData.maxReward}
                  onChange={(e) => setFormData({ ...formData, maxReward: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Cap the maximum commission per sale (optional)
                </p>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                <p className="text-sm font-semibold text-blue-900">
                  💡 Example: A $100 sale would earn the affiliate ${(100 * formData.commissionRate / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-gray-900">Affiliate Platforms</h2>
            <p className="text-gray-600">Select which platforms can use your affiliate program</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { id: 'instagram', name: 'Instagram', icon: '📸' },
                { id: 'tiktok', name: 'TikTok', icon: '🎵' },
                { id: 'youtube', name: 'YouTube', icon: '📹' },
                { id: 'pinterest', name: 'Pinterest', icon: '📌' },
                { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
                { id: 'blog', name: 'Blog/Website', icon: '📝' },
              ].map((platform) => (
                <motion.button
                  key={platform.id}
                  onClick={() => {
                    const updated = formData.platforms.includes(platform.id)
                      ? formData.platforms.filter(p => p !== platform.id)
                      : [...formData.platforms, platform.id];
                    setFormData({ ...formData, platforms: updated });
                  }}
                  className={`p-6 rounded-xl border-2 transition-all text-center ${
                    formData.platforms.includes(platform.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-4xl mb-2">{platform.icon}</div>
                  <p className="font-semibold text-gray-900">{platform.name}</p>
                </motion.button>
              ))}
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableCookies}
                  onChange={(e) => setFormData({ ...formData, enableCookies: e.target.checked })}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-gray-900">Enable Tracking Cookies</p>
                  <p className="text-sm text-gray-600">
                    Allow {formData.cookieDuration}-day tracking window for affiliate clicks
                  </p>
                </div>
              </label>
              {formData.enableCookies && (
                <div className="mt-4">
                  <label className="text-sm font-semibold text-gray-900 mb-2 block">
                    Cookie Duration (days)
                  </label>
                  <input
                    type="number"
                    value={formData.cookieDuration}
                    onChange={(e) => setFormData({ ...formData, cookieDuration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-gray-900">Review & Launch</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-semibold">Error: {error}</p>
              </div>
            )}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Commission Rate</p>
                <p className="text-3xl font-bold text-gray-900">{formData.commissionRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Max Reward Per Sale</p>
                <p className="text-2xl font-bold text-gray-900">${formData.maxReward}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Enabled Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {formData.platforms.map((p) => (
                    <span key={p} className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-semibold">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-green-300 pt-4">
                <p className="text-sm text-gray-600">Tracking Window</p>
                <p className="text-xl font-bold text-gray-900">
                  {formData.enableCookies ? `${formData.cookieDuration} days` : 'Disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Launching Affiliate Program...' : 'Launch Affiliate Program →'}
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-semibold">Loading affiliate settings...</p>
        </div>
      </div>
    );
  }

  if (error && !storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-6xl mb-4">🚨</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/seller/setup')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
          >
            Create Store First →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Progress */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 pt-12">
        {/* Stage Indicator */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    s <= step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  animate={{ scale: s === step ? 1.2 : 1 }}
                >
                  {s}
                </motion.div>
                {s < 4 && <div className={`h-1 w-12 mx-2 ${s < step ? 'bg-blue-600' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="bg-white rounded-xl shadow-lg p-8 min-h-[400px]"
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {renderStep()}

          {/* Navigation */}
          <div className="mt-12 flex gap-4 justify-between pt-8 border-t border-gray-200">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Back
            </button>
            {step < 4 && (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700"
              >
                Continue
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AffiliateOnboardingPage;
