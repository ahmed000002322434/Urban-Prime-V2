import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoreCreationData } from '../../types';
import { CATEGORIES } from '../../constants';

// Icons
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;

const STORE_TEMPLATES = [
  { id: 'modern', name: 'Modern Minimal', colors: 'from-slate-100 to-gray-50', icon: '✨' },
  { id: 'luxury', name: 'Luxury Premium', colors: 'from-yellow-50 to-yellow-100', icon: '👑' },
  { id: 'vibrant', name: 'Vibrant Bold', colors: 'from-purple-100 to-pink-100', icon: '🎨' },
  { id: 'eco', name: 'Eco Friendly', colors: 'from-green-100 to-emerald-100', icon: '🌿' },
  { id: 'playful', name: 'Fun Playful', colors: 'from-blue-100 to-cyan-100', icon: '🎭' },
  { id: 'vintage', name: 'Vintage Classic', colors: 'from-amber-100 to-orange-100', icon: '📚' },
];

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
  { id: 'crypto', name: 'Cryptocurrency', icon: '₿' },
  { id: 'wallet', name: 'Digital Wallet', icon: '📱' },
  { id: 'cash', name: 'Cash on Pickup', icon: '💵' },
];

const SHIPPING_METHODS = [
  { id: 'local', name: 'Local Pickup Only', desc: 'Customers pick up in-person' },
  { id: 'delivery', name: 'Delivery Only', desc: 'You deliver to customers' },
  { id: 'hybrid', name: 'Both Pickup & Delivery', desc: 'Offer both options' },
];

const SETUP_TASKS = [
  { id: 'basics', title: 'Store Basics', description: 'Name, city, category', icon: '🏪', steps: 3 },
  { id: 'theme', title: 'Theme & Design', description: 'Choose your style', icon: '🎨', steps: 2 },
  { id: 'branding', title: 'Logo & Branding', description: 'Logo and colors', icon: '✨', steps: 2 },
  { id: 'about', title: 'About Your Store', description: 'Your story & values', icon: '📖', steps: 3 },
  { id: 'shipping', title: 'Shipping & Delivery', description: 'Shipping methods', icon: '📦', steps: 2 },
  { id: 'payments', title: 'Payments & Policies', description: 'Payment & rental policies', icon: '💳', steps: 3 },
  { id: 'seo', title: 'Social & SEO', description: 'Social media & search', icon: '🔍', steps: 3 },
];

interface FormData {
  storeName: string;
  tagline: string;
  city: string;
  category: string;
  description: string;
  themeTemplate: string;
  primaryColor: string;
  secondaryColor: string;
  logoChoice: 'text' | 'image' | 'emoji';
  logoText: string;
  logoEmoji: string;
  logoImage: string;
  idealCustomer: string;
  story: string;
  mission: string;
  shippingType: string;
  shippingCost: string;
  internationalShipping: boolean;
  pickupInfo: string;
  rentalPeriod: string;
  paymentMethods: string[];
  cancellationPolicy: string;
  refundPolicy: string;
  damageFee: string;
  metaDescription: string;
  websiteUrl: string;
  instagramHandle: string;
  twitterHandle: string;
  facebookUrl: string;
  contactEmail: string;
  contactPhone: string;
  welcomeMessage: string;
  promotions: string;
}

interface TaskCardProps {
  task: typeof SETUP_TASKS[0];
  isCompleted: boolean;
  isActive: boolean;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isCompleted, isActive, onClick }) => (
  <motion.button
    onClick={onClick}
    className={`relative p-4 rounded-xl transition-all text-left group w-full ${
      isActive 
        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 shadow-lg' 
        : isCompleted
        ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400'
        : 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}
    whileHover={{ scale: isCompleted ? 1 : 1.02 }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{task.icon}</span>
          <h3 className="font-bold text-gray-900 text-sm">{task.title}</h3>
        </div>
        <p className="text-xs text-gray-600">{task.description}</p>
      </div>
      {isCompleted && (
        <motion.div className="flex-shrink-0 p-1.5 bg-green-500 text-white rounded-full" initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <CheckIcon />
        </motion.div>
      )}
    </div>
  </motion.button>
);

const StoreSetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTask, setCurrentTask] = useState<string>('basics');
  const [internalStep, setInternalStep] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<FormData>({
    storeName: '', tagline: '', city: '', category: '', description: '',
    themeTemplate: 'modern', primaryColor: '#3B82F6', secondaryColor: '#1F2937',
    logoChoice: 'emoji', logoText: '', logoEmoji: '🏪', logoImage: '',
    idealCustomer: '', story: '', mission: '',
    shippingType: 'hybrid', shippingCost: '', internationalShipping: false, pickupInfo: '',
    rentalPeriod: 'daily', paymentMethods: ['card'], cancellationPolicy: '', refundPolicy: '', damageFee: '0',
    metaDescription: '', websiteUrl: '', instagramHandle: '', twitterHandle: '', facebookUrl: '', 
    contactEmail: '', contactPhone: '', welcomeMessage: '', promotions: ''
  });

  const LOCAL_STORAGE_KEY = 'storeSetupV3';

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const { formData: savedForm, currentTask: savedTask, completedTasks: savedCompleted } = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...savedForm }));
        setCurrentTask(savedTask);
        setCompletedTasks(new Set(savedCompleted));
      } catch (e) {
        console.error("Could not restore progress", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      formData,
      currentTask,
      completedTasks: Array.from(completedTasks)
    }));
  }, [formData, currentTask, completedTasks]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    const taskMaxSteps = { basics: 3, theme: 2, branding: 2, about: 3, shipping: 2, payments: 3, seo: 3 };
    const maxSteps = taskMaxSteps[currentTask as keyof typeof taskMaxSteps] || 3;
    
    if (internalStep < maxSteps) {
      setInternalStep(s => s + 1);
    } else {
      setCompletedTasks(prev => new Set([...prev, currentTask]));
      setInternalStep(1);
      const nextTask = SETUP_TASKS.find(t => !completedTasks.has(t.id) && t.id !== currentTask);
      if (nextTask) setCurrentTask(nextTask.id);
    }
  };

  const handlePrev = () => {
    if (internalStep > 1) {
      setInternalStep(s => s - 1);
    } else {
      const currentIndex = SETUP_TASKS.findIndex(t => t.id === currentTask);
      if (currentIndex > 0) {
        setCurrentTask(SETUP_TASKS[currentIndex - 1].id);
        setInternalStep(1);
      }
    }
  };

  const handleSkipTask = () => {
    setCompletedTasks(prev => new Set([...prev, currentTask]));
    setInternalStep(1);
    const nextTask = SETUP_TASKS.find(t => !completedTasks.has(t.id) && t.id !== currentTask);
    if (nextTask) setCurrentTask(nextTask.id);
  };

  const handleFinish = () => {
    const questionnaireAnswers = [
      { question: "Store Name", answer: formData.storeName },
      { question: "Tagline", answer: formData.tagline },
      { question: "Description", answer: formData.description },
      { question: "Ideal Customer", answer: formData.idealCustomer },
      { question: "Store Story", answer: formData.story },
      { question: "Mission", answer: formData.mission },
      { question: "Theme Template", answer: formData.themeTemplate },
      { question: "Brand Colors", answer: `${formData.primaryColor} / ${formData.secondaryColor}` },
      { question: "Logo Style", answer: formData.logoChoice },
      { question: "Shipping Type", answer: formData.shippingType },
      { question: "Payment Methods", answer: formData.paymentMethods.join(', ') },
      { question: "Rental Period", answer: formData.rentalPeriod },
      { question: "Cancellation Policy", answer: formData.cancellationPolicy },
    ];

    const finalData: StoreCreationData = {
      questionnaireAnswers,
      logoUrl: formData.logoImage || formData.logoEmoji,
      category: formData.category,
      city: formData.city,
      socialLinks: {
        instagram: formData.instagramHandle,
        twitter: formData.twitterHandle,
        website: formData.websiteUrl,
        facebook: formData.facebookUrl,
      },
      policies: {
        shipping: formData.shippingType,
        returns: formData.cancellationPolicy,
        refund: formData.refundPolicy,
      }
    };

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    navigate('/store/generating', { state: { creationData: finalData } });
  };

  const renderTaskContent = () => {
    const motion_style = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

    switch (currentTask) {
      case 'basics':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Store Name *</label>
                  <input type="text" name="storeName" value={formData.storeName} onChange={handleInputChange} placeholder="Urban Rentals, Luxury Essentials, etc." className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                  <p className="text-xs text-gray-500 mt-1">Your unique store identity on the platform.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Store Tagline *</label>
                  <input type="text" name="tagline" value={formData.tagline} onChange={handleInputChange} placeholder="E.g., Premium fashion rentals for every occasion" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Your City *</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="New York, London, Tokyo, etc." className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
            {internalStep === 3 && (
              <motion.div {...motion_style} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Primary Category *</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white">
                    <option value="">Select category...</option>
                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Store Description *</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="What do you rent? What makes your inventory special?" rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

      case 'theme':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-4">Choose Your Store Theme</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {STORE_TEMPLATES.map(template => (
                      <motion.button key={template.id} onClick={() => setFormData(p => ({...p, themeTemplate: template.id}))} className={`p-4 rounded-lg border-2 transition-all ${formData.themeTemplate === template.id ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`} whileHover={{ scale: 1.05 }}>
                        <div className={`bg-gradient-to-br ${template.colors} h-16 rounded mb-2 flex items-center justify-center text-2xl`}>{template.icon}</div>
                        <p className="text-xs font-semibold text-gray-900">{template.name}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Primary Brand Color</label>
                  <div className="flex gap-2 mb-3">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                      <motion.button key={color} onClick={() => setFormData(p => ({...p, primaryColor: color}))} className={`w-12 h-12 rounded-lg border-4 transition-all`} style={{backgroundColor: color, borderColor: formData.primaryColor === color ? '#000' : '#ddd'}} whileHover={{scale: 1.1}} />
                    ))}
                  </div>
                  <input type="text" name="primaryColor" value={formData.primaryColor} onChange={handleInputChange} placeholder="#3B82F6" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

      case 'branding':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">Logo Style</label>
                  <div className="space-y-3">
                    <motion.button onClick={() => setFormData(p => ({...p, logoChoice: 'emoji'}))} className={`w-full p-4 rounded-lg border-2 transition-all text-left ${formData.logoChoice === 'emoji' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <p className="font-semibold text-gray-900">Emoji Logo 😊</p>
                      <p className="text-sm text-gray-600">Simple & playful (recommended)</p>
                    </motion.button>
                    <motion.button onClick={() => setFormData(p => ({...p, logoChoice: 'text'}))} className={`w-full p-4 rounded-lg border-2 transition-all text-left ${formData.logoChoice === 'text' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <p className="font-semibold text-gray-900">Text Logo</p>
                      <p className="text-sm text-gray-600">Your store name styled</p>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-5">
                {formData.logoChoice === 'emoji' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Choose Emoji Logo</label>
                    <input type="text" name="logoEmoji" value={formData.logoEmoji} onChange={handleInputChange} placeholder="🏪" maxLength={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-4xl text-center" />
                    <p className="text-xs text-gray-500 mt-2">Popular: 🏪 🎁 👗 ✨ 💎 🛍️ 👜</p>
                  </div>
                )}
                {formData.logoChoice === 'text' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Logo Text</label>
                    <input type="text" name="logoText" value={formData.logoText} onChange={handleInputChange} placeholder={formData.storeName} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                    <p className="text-xs text-gray-500 mt-2">Usually your store name or initials</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        );

      case 'about':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Tell Your Story *</label>
                  <textarea name="story" value={formData.story} onChange={handleInputChange} placeholder="Why did you start this rental business? What inspired you?" rows={4} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Your Store Mission *</label>
                  <textarea name="mission" value={formData.mission} onChange={handleInputChange} placeholder="What's your purpose? E.g., 'Make luxury fashion affordable and sustainable'" rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
            {internalStep === 3 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Ideal Customer Profile *</label>
                  <input type="text" name="idealCustomer" value={formData.idealCustomer} onChange={handleInputChange} placeholder="E.g., Young professionals, party-goers, film production companies" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

      case 'shipping':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">How Do Customers Get Items?</label>
                  {SHIPPING_METHODS.map(method => (
                    <motion.button key={method.id} onClick={() => setFormData(p => ({...p, shippingType: method.id}))} className={`w-full p-4 rounded-lg border-2 mb-2 transition-all text-left ${formData.shippingType === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <p className="font-semibold text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-600">{method.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input type="checkbox" checked={formData.internationalShipping} onChange={(e) => setFormData(p => ({...p, internationalShipping: e.target.checked}))} className="w-4 h-4 rounded" />
                    <span className="text-sm font-bold text-gray-900">Do you ship internationally?</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Pickup/Shipping Info</label>
                  <textarea name="pickupInfo" value={formData.pickupInfo} onChange={handleInputChange} placeholder="E.g., 'Free pickup in Manhattan. Delivery available for $15 within NYC. International shipping: $50+'" rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

      case 'payments':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">Standard Rental Period</label>
                  <select name="rentalPeriod" value={formData.rentalPeriod} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">Accepted Payment Methods *</label>
                  <div className="space-y-2">
                    {PAYMENT_METHODS.map(method => (
                      <motion.button key={method.id} onClick={() => setFormData(p => ({...p, paymentMethods: p.paymentMethods.includes(method.id) ? p.paymentMethods.filter(m => m !== method.id) : [...p.paymentMethods, method.id]}))} className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${formData.paymentMethods.includes(method.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input type="checkbox" checked={formData.paymentMethods.includes(method.id)} readOnly className="w-4 h-4" />
                        <span className="text-lg">{method.icon}</span>
                        <span className="font-semibold text-gray-900">{method.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {internalStep === 3 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Cancellation Policy *</label>
                  <textarea name="cancellationPolicy" value={formData.cancellationPolicy} onChange={handleInputChange} placeholder="E.g., 'Free cancellation up to 7 days before rental. 50% charge if cancelled 1-7 days before.'" rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Damage Fee Policy *</label>
                  <input type="text" name="damageFee" value={formData.damageFee} onChange={handleInputChange} placeholder="E.g., '10% of rental price' or 'Varies by item'" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

      case 'seo':
        return (
          <AnimatePresence mode="wait">
            {internalStep === 1 && (
              <motion.div {...motion_style} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Meta Description (for search engines)</label>
                  <textarea name="metaDescription" value={formData.metaDescription} onChange={handleInputChange} placeholder="Brief description that appears in Google results (50-160 characters)" rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Welcome Message</label>
                  <textarea name="welcomeMessage" value={formData.welcomeMessage} onChange={handleInputChange} placeholder="What do you want to say to visitors? E.g., 'Welcome! Browse our collection of premium rental items.'" rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                </div>
              </motion.div>
            )}
            {internalStep === 2 && (
              <motion.div {...motion_style} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Instagram Handle</label>
                    <input type="text" name="instagramHandle" value={formData.instagramHandle} onChange={handleInputChange} placeholder="@yourhandle" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Twitter/X Handle</label>
                    <input type="text" name="twitterHandle" value={formData.twitterHandle} onChange={handleInputChange} placeholder="@yourhandle" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
              </motion.div>
            )}
            {internalStep === 3 && (
              <motion.div {...motion_style} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Email Address *</label>
                    <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} placeholder="hello@yourstore.com" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Phone Number</label>
                    <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

      default:
        return null;
    }
  };

  const currentTaskObj = SETUP_TASKS.find(t => t.id === currentTask);
  const taskMaxSteps = { basics: 3, theme: 2, branding: 2, about: 3, shipping: 2, payments: 3, seo: 3 };
  const maxSteps = taskMaxSteps[currentTask as keyof typeof taskMaxSteps] || 3;
  const progressPercentage = (completedTasks.size / SETUP_TASKS.length) * 100;
  const allTasksCompleted = completedTasks.size === SETUP_TASKS.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 pt-12">
        <motion.div className="mb-12 text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Launch Your Rental Store</h1>
          <p className="text-lg text-gray-600">{Math.round(progressPercentage)}% Complete • {completedTasks.size} of {SETUP_TASKS.length} sections finished</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task List */}
          <motion.div className="lg:col-span-1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Setup Checklist</h2>
              <div className="space-y-2">
                {SETUP_TASKS.map(task => (
                  <TaskCard key={task.id} task={task} isCompleted={completedTasks.has(task.id)} isActive={currentTask === task.id} onClick={() => { setCurrentTask(task.id); setInternalStep(1); }} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{currentTaskObj?.icon}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{currentTaskObj?.title}</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold">Step {internalStep} of {maxSteps}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${(internalStep / maxSteps) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              </div>

              <div className="mb-8 min-h-[280px]">{renderTaskContent()}</div>

              <div className="flex gap-4 justify-between pt-8 border-t border-gray-200">
                <div className="flex gap-3">
                  <button onClick={handlePrev} disabled={internalStep === 1 && currentTask === SETUP_TASKS[0].id} className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50">Back</button>
                  <button onClick={handleSkipTask} className="px-6 py-3 text-gray-600 font-semibold hover:text-gray-900">Skip</button>
                </div>
                <div className="flex gap-3">
                  {allTasksCompleted ? (
                    <motion.button onClick={handleFinish} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition flex items-center gap-2 shadow-lg" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <CheckIcon /> Launch My Store
                    </motion.button>
                  ) : (
                    <motion.button onClick={handleNext} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      {internalStep === maxSteps ? 'Complete' : 'Next'}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {currentTask === 'basics' && (
              <motion.div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg flex gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <InfoIcon />
                <div>
                  <p className="font-semibold text-blue-900">Pro Tip:</p>
                  <p className="text-sm text-blue-800">A clear store name helps customers find you. Make it memorable and descriptive!</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StoreSetupWizard;
