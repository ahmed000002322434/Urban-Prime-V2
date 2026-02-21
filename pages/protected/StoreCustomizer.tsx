import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const StoreCustomizer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'layout' | 'preview'>('layout');
  const storeData = location.state?.storeData || {};

  const [sections, setSections] = useState([
    { id: 1, type: 'hero', title: 'Hero Banner', enabled: true },
    { id: 2, type: 'featured', title: 'Featured Items', enabled: true },
    { id: 3, type: 'categories', title: 'Shop by Category', enabled: true },
    { id: 4, type: 'testimonials', title: 'Customer Reviews', enabled: true },
  ]);

  const toggleSection = (id: number) => {
    setSections(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const moveSection = (id: number, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sections.length - 1)) return;
    
    const newSections = [...sections];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [newSections[idx], newSections[swap]] = [newSections[swap], newSections[idx]];
    setSections(newSections);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <motion.div
        className="bg-white border-b border-gray-200"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                {storeData.logoEmoji} {storeData.storeName}
              </h1>
              <p className="text-gray-600">{storeData.tagline}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('layout')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  mode === 'layout'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Edit Layout
              </button>
              <button
                onClick={() => setMode('preview')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  mode === 'preview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {mode === 'layout' ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Editor Panel */}
            <motion.div
              className="lg:col-span-1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <div className="bg-white rounded-xl shadow p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Store Sections</h2>
                <div className="space-y-3">
                  {sections.map((section, idx) => (
                    <motion.div
                      key={section.id}
                      className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                      layout
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={section.enabled}
                            onChange={() => toggleSection(section.id)}
                            className="w-4 h-4"
                          />
                          <label className="font-semibold text-gray-900 cursor-pointer flex-1">
                            {section.title}
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => moveSection(section.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSection(section.id, 'down')}
                          disabled={idx === sections.length - 1}
                          className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Preview Panel */}
            <motion.div
              className="lg:col-span-2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <div className="bg-white rounded-xl shadow p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Layout Preview</h2>
                <div className="space-y-6">
                  {sections.map(section => section.enabled && (
                    <motion.div
                      key={section.id}
                      className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      <p className="font-bold text-gray-900">{section.title}</p>
                      <p className="text-sm text-gray-600 mt-1">This section will be visible on your store</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-lg p-12"
          >
            <div
              className="prose max-w-none"
              style={{ color: storeData.primaryColor }}
            >
              <div className="text-6xl mb-4">{storeData.logoEmoji}</div>
              <h1 className="text-4xl font-black mb-2">{storeData.storeName}</h1>
              <p className="text-xl text-gray-600 mb-6">{storeData.tagline}</p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Our Story</h3>
                  <p className="text-gray-700">{storeData.story}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Our Mission</h3>
                  <p className="text-gray-700">{storeData.mission}</p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Featured Items Coming Soon</h3>
                <p className="text-gray-600">Add your first rental items to start attracting customers</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer Actions */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto max-w-7xl px-4 py-6 flex gap-4 justify-between">
          <button
            onClick={() => navigate('/store/setup')}
            className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200"
          >
            Back to Setup
          </button>
          <button
            onClick={() => navigate('/store/preview')}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700"
          >
            Customize More & Publish
          </button>
        </div>
      </motion.div>
      <div className="h-24" />
    </div>
  );
};

export default StoreCustomizer;
