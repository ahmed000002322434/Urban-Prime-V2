
import React, { useState } from 'react';
import { getDisputeSuggestion } from '../../services/geminiService';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

const DisputeCenterPage: React.FC = () => {
  const [renterClaim, setRenterClaim] = useState("The drone's camera was blurry and seemed to be malfunctioning. I couldn't get any usable footage.");
  const [ownerResponse, setOwnerResponse] = useState("It was working perfectly when I tested it before the rental. The renter must have damaged it.");
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetSuggestion = async () => {
    if (!renterClaim || !ownerResponse) {
      alert("Please fill in both fields.");
      return;
    }
    setIsLoading(true);
    setSuggestion('');
    try {
      const result = await getDisputeSuggestion(renterClaim, ownerResponse);
      setSuggestion(result);
    } catch (error) {
      console.error(error);
      alert("Failed to get suggestion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-2">Dispute Resolution Center</h1>
        <p className="text-center text-slate-500 mb-6">Use our AI assistant to get a neutral suggestion for resolving this issue.</p>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="renterClaim" className="block text-sm font-medium text-slate-700">Renter's Claim</label>
            <textarea
              id="renterClaim"
              rows={4}
              value={renterClaim}
              onChange={e => setRenterClaim(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-transparent border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="ownerResponse" className="block text-sm font-medium text-slate-700">Owner's Response</label>
            <textarea
              id="ownerResponse"
              rows={4}
              value={ownerResponse}
              onChange={e => setOwnerResponse(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-transparent border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          
          <button
            onClick={handleGetSuggestion}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary dark:bg-black hover:bg-primary-700 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-white disabled:bg-slate-400"
          >
            {isLoading ? <><Spinner size="sm"/> Getting Suggestion...</> : '✨ Get AI Suggestion'}
          </button>

          {suggestion && (
            <div className="mt-6 p-4 bg-primary/10 dark:bg-gray-800/50 rounded-lg border border-primary/20 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-primary dark:text-white mb-2">AI Mediator Suggestion</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{suggestion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisputeCenterPage;
