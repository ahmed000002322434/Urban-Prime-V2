import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES } from '../../constants';
import { storeBuildService } from '../../services/storeBuildService';
import { storeTemplateService, type StoreTemplate } from '../../services/storeTemplateService';
import { AuthContext } from '../../context/AuthContext';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09l-.813 2.846zm6.5-12.75l.363-1.088a1.5 1.5 0 011.033-1.033l1.088-.363 1.088.363c.454.12.856.522.976.976l.363 1.088-.363 1.088a1.5 1.5 0 01-1.033 1.033l-1.088.363-1.088-.363a1.5 1.5 0 01-.976-.976l-.363-1.088zm6 6l.363-1.088a1.5 1.5 0 011.033-1.033l1.088-.363 1.088.363c.454.12.856.522.976.976l.363 1.088-.363 1.088a1.5 1.5 0 01-1.033 1.033l-1.088.363-1.088-.363a1.5 1.5 0 01-.976-.976l-.363-1.088z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;

interface StoreData {
  storeName: string;
  tagline: string;
  city: string;
  category: string;
  description: string;
  idealCustomer: string;
  theme: string;
  primaryColor: string;
  logoEmoji: string;
  story: string;
  mission: string;
}

const SETUP_STAGES = [
  { id: 1, title: 'Templates', description: 'Choose your template' },
  { id: 2, title: 'Basics', description: 'Store name & location' },
  { id: 3, title: 'Theme', description: 'Design your look' },
  { id: 4, title: 'Branding', description: 'Logo & colors' },
  { id: 5, title: 'Story', description: 'Your narrative' },
  { id: 6, title: 'AI Helper', description: 'Content generation' },
  { id: 7, title: 'Settings', description: 'Policies & shipping' },
  { id: 8, title: 'Preview', description: 'Review & launch' },
];

const THEME_TEMPLATES = [
  { id: 'modern', name: 'Modern', icon: '✨' },
  { id: 'luxury', name: 'Luxury', icon: '👑' },
  { id: 'eco', name: 'Eco', icon: '🌿' },
  { id: 'playful', name: 'Playful', icon: '🎨' },
];

const StoreSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [currentStage, setCurrentStage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplate | null>(null);
  const [storeData, setStoreData] = useState<StoreData>({
    storeName: '', tagline: '', city: '', category: '', description: '',
    idealCustomer: '', theme: 'modern', primaryColor: '#3B82F6', logoEmoji: '🏪',
    story: '', mission: ''
  });
  const [storeId, setStoreId] = useState<string | null>(null);
  const [allTemplates] = useState<StoreTemplate[]>(storeTemplateService.getTemplates());
  const [templateFilter, setTemplateFilter] = useState<'all' | 'featured' | string>('featured');
  const [storeNameError, setStoreNameError] = useState<string | null>(null);

  // Load existing store data on mount
  useEffect(() => {
    const loadStore = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const existing = await storeBuildService.getUserStore(user.id);
        
        if (existing) {
          setStoreId(existing.id || null);
          setStoreData({
            storeName: existing.storeName,
            tagline: existing.tagline,
            city: existing.city,
            category: existing.category,
            description: existing.description,
            idealCustomer: existing.idealCustomer || '',
            theme: existing.theme as 'modern' | 'luxury' | 'eco' | 'playful',
            primaryColor: existing.primaryColor,
            logoEmoji: existing.logoEmoji,
            story: existing.story,
            mission: existing.mission,
          });
        }
      } catch (err) {
        console.error('Error loading store:', err);
        setError('Failed to load store data');
      } finally {
        setIsLoading(false);
      }
    };

    loadStore();
  }, [user]);

  const handleInputChange = (field: keyof StoreData, value: string) => {
    setStoreData(prev => ({ ...prev, [field]: value }));
    setError(null);
    
    // Validate store name on change
    if (field === 'storeName') {
      const validation = storeTemplateService.isValidStoreName(value);
      setStoreNameError(validation.error || null);
    }
  };

  const handleApplyTemplate = (template: StoreTemplate) => {
    setSelectedTemplate(template);
    
    // Merge template data with current store data
    const merged = storeTemplateService.mergeTemplateWithUserData(template, {});
    setStoreData(merged as any);
    setCurrentStage(2); // Move to basics step
  };

  const getFilteredTemplates = (): StoreTemplate[] => {
    if (templateFilter === 'featured') {
      return storeTemplateService.getFeaturedTemplates();
    }
    if (templateFilter === 'all') {
      return allTemplates;
    }
    return storeTemplateService.getTemplatesByCategory(templateFilter);
  };

  const handleNext = () => {
    if (currentStage < 8) setCurrentStage(currentStage + 1);
  };

  const handlePrev = () => {
    if (currentStage > 1) setCurrentStage(currentStage - 1);
  };

  const handleSkipToAI = () => {
    setCurrentStage(6);
  };

  const handleLaunch = async () => {
    if (!user) {
      setError('You must be logged in');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save store to database
      const savedStore = await storeBuildService.saveStoreSetup(user.id, {
        ...storeData,
        userId: user.id,
      });

      setStoreId(savedStore.id || null);

      // Navigate to customizer with real store ID
      navigate('/store/customizer', {
        state: {
          storeData: savedStore,
          storeId: savedStore.id || storeId,
        }
      });
    } catch (err: any) {
      console.error('Error launching store:', err);
      setError(err.message || 'Failed to launch store');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStage = () => {
    const motion_style = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

    switch (currentStage) {
      case 1:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Let's Start With Basics</h2>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Store Name *</label>
              <input
                type="text"
                value={storeData.storeName}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                placeholder="Urban Rentals, Luxury Essentials, etc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Tagline *</label>
                <input
                  type="text"
                  value={storeData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Premium fashion rentals"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Your City *</label>
                <input
                  type="text"
                  value={storeData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="New York"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Category *</label>
              <select
                value={storeData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Store Description *</label>
              <textarea
                value={storeData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="What do you rent? What makes you special?"
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Choose Your Theme</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {THEME_TEMPLATES.map(template => (
                <motion.button
                  key={template.id}
                  onClick={() => handleInputChange('theme', template.id)}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    storeData.theme === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-4xl mb-2">{template.icon}</div>
                  <p className="font-semibold text-gray-900">{template.name}</p>
                </motion.button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Primary Color</label>
              <div className="flex gap-2 mb-3">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                  <button
                    key={color}
                    onClick={() => handleInputChange('primaryColor', color)}
                    className={`w-12 h-12 rounded-lg border-4 transition-all`}
                    style={{
                      backgroundColor: color,
                      borderColor: storeData.primaryColor === color ? '#000' : '#ddd'
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Your Brand Logo</h2>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Choose Emoji Logo</label>
              <input
                type="text"
                value={storeData.logoEmoji}
                onChange={(e) => handleInputChange('logoEmoji', e.target.value)}
                maxLength={2}
                placeholder="🏪"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-4xl text-center"
              />
              <p className="text-xs text-gray-500 mt-2">Popular: 🏪 🎁 👗 ✨ 💎 🛍️ 👜 🎉 📸</p>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Tell Your Story</h2>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Your Story *</label>
              <textarea
                value={storeData.story}
                onChange={(e) => handleInputChange('story', e.target.value)}
                placeholder="Why did you start this business? What inspired you?"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Your Mission *</label>
              <textarea
                value={storeData.mission}
                onChange={(e) => handleInputChange('mission', e.target.value)}
                placeholder="What's your purpose? Make it inspiring!"
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Ideal Customer Profile</label>
              <input
                type="text"
                value={storeData.idealCustomer}
                onChange={(e) => handleInputChange('idealCustomer', e.target.value)}
                placeholder="Young professionals, fashion enthusiasts, etc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon />
              <h2 className="text-3xl font-bold text-gray-900">AI Content Assistant (Optional)</h2>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Let AI help you create professional content for your store. You can always edit and customize everything.
              </p>
              <div className="space-y-3">
                <button className="w-full p-4 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 text-left">
                  <p className="font-bold text-gray-900">Generate Store Description</p>
                  <p className="text-sm text-gray-600">AI will write a compelling description for your store</p>
                </button>
                <button className="w-full p-4 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 text-left">
                  <p className="font-bold text-gray-900">Generate Social Media Content</p>
                  <p className="text-sm text-gray-600">AI will create posts and captions for your store</p>
                </button>
                <button className="w-full p-4 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 text-left">
                  <p className="font-bold text-gray-900">Generate Product Listings</p>
                  <p className="text-sm text-gray-600">AI will help you write product descriptions</p>
                </button>
              </div>
              <button
                onClick={() => handleNext()}
                className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
              >
                Continue Without AI
              </button>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Store Settings</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Rental Period</label>
                <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Flexible</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm font-semibold text-gray-900">Accept local pickup</span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm font-semibold text-gray-900">Provide delivery</span>
                </label>
              </div>
            </div>
          </motion.div>
        );

      case 7:
        return (
          <motion.div {...motion_style} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Review & Launch</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-semibold">Error: {error}</p>
              </div>
            )}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-2">
                <CheckIcon />
                <p className="text-gray-700"><span className="font-bold">Store Name:</span> {storeData.storeName || '(Not set)'}</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <p className="text-gray-700"><span className="font-bold">Category:</span> {storeData.category || '(Not set)'}</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <p className="text-gray-700"><span className="font-bold">Location:</span> {storeData.city || '(Not set)'}</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <p className="text-gray-700"><span className="font-bold">Theme:</span> {storeData.theme}</p>
              </div>
            </div>
            <button
              onClick={handleLaunch}
              disabled={isSaving}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Launching Your Store...' : 'Launch Your Store →'}
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
          <p className="text-gray-600 font-semibold">Loading your store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStage / 7) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 pt-12">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-black text-gray-900 mb-2">Set Up Your Store</h1>
          <p className="text-lg text-gray-600">Step {currentStage} of 7 • {SETUP_STAGES[currentStage - 1]?.title}</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-6 sticky top-20">
              <h3 className="font-bold text-gray-900 mb-4">Progress</h3>
              <div className="space-y-3">
                {SETUP_STAGES.map((stage) => (
                  <motion.button
                    key={stage.id}
                    onClick={() => setCurrentStage(stage.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      currentStage === stage.id
                        ? 'bg-blue-500 text-white shadow'
                        : currentStage > stage.id
                        ? 'bg-green-100 text-gray-900'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="font-semibold">{stage.title}</p>
                    <p className="text-xs opacity-75">{stage.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white rounded-xl shadow-lg p-8 min-h-[500px]">
              <AnimatePresence mode="wait">
                {renderStage()}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-12 flex gap-4 justify-between pt-8 border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={handlePrev}
                    disabled={currentStage === 1}
                    className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    Back
                  </button>
                  {currentStage < 5 && (
                    <button
                      onClick={handleSkipToAI}
                      className="px-6 py-3 text-gray-600 font-semibold hover:text-blue-600"
                    >
                      Skip to AI
                    </button>
                  )}
                </div>
                <button
                  onClick={handleNext}
                  disabled={currentStage === 7}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700"
                >
                  {currentStage === 7 ? 'Launch' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StoreSetupPage;
