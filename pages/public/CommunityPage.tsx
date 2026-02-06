
import React, { useState, useEffect } from 'react';
import { generateCommunityPrompt } from '../../services/geminiService';
import { itemService } from '../../services/itemService';
import Spinner from '../../components/Spinner';
import type { ProjectShowcase } from '../../types';

const CommunityPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [showcases, setShowcases] = useState<ProjectShowcase[]>([]);

  useEffect(() => {
    generateCommunityPrompt()
      .then(setPrompt)
      .catch(err => {
        console.error(err);
        setPrompt("Share a story about your favorite rental experience!");
      })
      .finally(() => setIsLoadingPrompt(false));

    itemService.getProjectShowcases().then(setShowcases);
  }, []);


  return (
    <div className="bg-white dark:bg-dark-background animate-fade-in-up">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <header className="text-center mb-20">
          <h1 className="text-6xl font-extrabold text-gray-900 dark:text-dark-text font-display">Our Community</h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Built on trust, respect, and a shared passion for sustainability.</p>
        </header>
        
        <section className="mb-20 bg-gray-50 dark:bg-dark-surface p-12 rounded-xl text-center border border-gray-100 dark:border-gray-800">
            <h2 className="text-4xl font-bold mb-4 font-display text-gray-900 dark:text-dark-text">Share Your Story!</h2>
            {isLoadingPrompt ? <Spinner /> : <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">{prompt}</p>}
             <textarea rows={3} className="w-full max-w-lg p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-background focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black outline-none" placeholder="Write your story here..."/>
            <button className="mt-6 inline-block bg-black text-white font-bold py-3 px-8 rounded-full hover:bg-gray-800 transition-colors">Post Story</button>
        </section>

        <section className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 font-display text-gray-900 dark:text-dark-text">Project Showcase</h2>
          <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {showcases.map(showcase => (
              <div key={showcase.id} className="bg-white dark:bg-dark-surface rounded-xl overflow-hidden shadow-soft border border-gray-100 dark:border-gray-800">
                <img src={showcase.imageUrl} alt={showcase.projectName} className="w-full h-56 object-cover" />
                <div className="p-8">
                  <h3 className="text-xl font-bold mb-2 font-display text-gray-900 dark:text-dark-text">{showcase.projectName}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">"{showcase.description}"</p>
                  <div className="flex items-center">
                    <img src={showcase.authorAvatar} alt={showcase.authorName} className="w-10 h-10 rounded-full object-cover mr-3" />
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{showcase.authorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 font-display text-gray-900 dark:text-dark-text">Community Stories</h2>
          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-dark-surface p-8 rounded-xl border border-gray-100 dark:border-gray-800">
              <blockquote className="border-l-4 border-black dark:border-white pl-6 italic text-gray-700 dark:text-gray-300">"I listed my old power tools on Urban Prime and was amazed. Not only did I make some extra cash, but I also met a neighbor who was starting a DIY project. It's more than just renting; it's about connecting."</blockquote>
              <p className="mt-4 font-semibold text-right text-gray-800 dark:text-gray-200">- Sarah K., Oakland</p>
            </div>
             <div className="bg-white dark:bg-dark-surface p-8 rounded-xl border border-gray-100 dark:border-gray-800">
              <blockquote className="border-l-4 border-black dark:border-white pl-6 italic text-gray-700 dark:text-gray-300">"As a film student, I need access to expensive camera gear for short periods. Urban Prime has been a lifesaver. I can rent professional equipment for a fraction of the cost, directly from creatives in my city."</blockquote>
              <p className="mt-4 font-semibold text-right text-gray-800 dark:text-gray-200">- David L., San Francisco</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default CommunityPage;
