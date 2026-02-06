

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { OnboardingData } from '../types';
import { CATEGORIES, COUNTRIES } from '../constants';

const OnboardingModal: React.FC = () => {
  const { completeOnboarding, closeOnboarding, onboardingPreset } = useAuth();
  const [step, setStep] = useState(onboardingPreset ? 2 : 1);
  const [data, setData] = useState<OnboardingData>({
    purpose: onboardingPreset || 'rent',
    interests: [],
    country: '',
    currency: 'local'
  });

  useEffect(() => {
    if (onboardingPreset) {
      setData(prev => ({ ...prev, purpose: onboardingPreset }));
      setStep(2);
    }
  }, [onboardingPreset]);

  const handleInterestToggle = (interestId: string) => {
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleSubmit = () => {
    if (!data.country) {
        alert("Please select your country.");
        return;
    }
    completeOnboarding(data);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col justify-center items-center p-4">
      <div key={step} className="w-full max-w-2xl text-center animate-fade-in-up">
        {step === 1 && (
          <div>
            <h1 className="text-4xl font-bold mb-4 font-display">Welcome to Urban Prime!</h1>
            <p className="text-lg text-gray-600 mb-8">What brings you here today?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { setData({...data, purpose: 'rent'}); setStep(2); }} className="px-8 py-4 bg-gray-100 text-black font-bold rounded-lg text-xl hover:bg-gray-200 transition-colors">I want to Rent</button>
              <button onClick={() => { setData({...data, purpose: 'list'}); setStep(2); }} className="px-8 py-4 bg-gray-100 text-black font-bold rounded-lg text-xl hover:bg-gray-200 transition-colors">I want to List</button>
              <button onClick={() => { setData({...data, purpose: 'both'}); setStep(2); }} className="px-8 py-4 bg-gray-100 text-black font-bold rounded-lg text-xl hover:bg-gray-200 transition-colors">Both!</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-4xl font-bold mb-4 font-display">What are you interested in?</h1>
            <p className="text-lg text-gray-600 mb-8">Select a few to help us personalize your experience.</p>
            <div className="flex flex-wrap justify-center gap-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleInterestToggle(cat.id)}
                  className={`px-6 py-3 border-2 rounded-full font-semibold transition-colors ${data.interests.includes(cat.id) ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="mt-12 flex justify-between">
                <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-600">Back</button>
                <button onClick={() => setStep(3)} className="px-8 py-3 bg-black text-white font-bold rounded-lg text-lg hover:bg-gray-800 transition-colors">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-4xl font-bold mb-4 font-display">Just a couple more things...</h1>
            <p className="text-lg text-gray-600 mb-8">This helps us tailor your experience.</p>
            <div className="space-y-6 text-left">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Which country do you live in?</label>
                    <select
                      value={data.country}
                      onChange={(e) => setData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:border-black"
                      required
                    >
                      <option value="" disabled>Select your country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Which currency will you prefer?</label>
                    <div className="flex gap-4">
                         <button
                            type="button"
                            onClick={() => setData(prev => ({ ...prev, currency: 'local' }))}
                            className={`flex-1 p-4 border-2 rounded-lg font-semibold transition-colors ${data.currency === 'local' ? 'border-black bg-gray-100' : 'border-gray-300 hover:border-black'}`}
                         >
                            My Country's Currency
                         </button>
                         <button
                             type="button"
                            onClick={() => setData(prev => ({ ...prev, currency: 'usd' }))}
                            className={`flex-1 p-4 border-2 rounded-lg font-semibold transition-colors ${data.currency === 'usd' ? 'border-black bg-gray-100' : 'border-gray-300 hover:border-black'}`}
                         >
                            US Dollars ($)
                         </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 flex justify-between">
                <button onClick={() => setStep(2)} className="px-6 py-2 text-gray-600">Back</button>
                <button onClick={handleSubmit} disabled={!data.country} className="px-8 py-3 bg-black text-white font-bold rounded-lg text-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400">Let's Go!</button>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={closeOnboarding}
        className="mt-6 text-xs uppercase tracking-[0.3em] text-gray-400 hover:text-gray-600"
      >
        Skip for now
      </button>
    </div>
  );
};

export default OnboardingModal;
