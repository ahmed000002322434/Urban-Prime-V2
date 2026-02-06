import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const ChatPage: React.FC = () => {
  const heroRef = useScrollReveal<HTMLDivElement>();
  const featuresRef = useScrollReveal<HTMLDivElement>();

  return (
    <div className="bg-white dark:bg-dark-background animate-fade-in-up">
      <section ref={heroRef} className="animate-reveal bg-gray-50 dark:bg-dark-surface">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
            Chat with Urban Prime
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get instant help and inspiration from our AI-powered assistants, available 24/7.
          </p>
        </div>
      </section>

      <section ref={featuresRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div className="text-center p-8 bg-white dark:bg-dark-surface rounded-lg shadow-soft border border-gray-200 dark:border-gray-700">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-dark-text mb-2">AI Rental Concierge</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Looking for something specific? Tell our concierge what you need, and it will search the marketplace to find the perfect item for you.
            </p>
          </div>
          <div className="text-center p-8 bg-white dark:bg-dark-surface rounded-lg shadow-soft border border-gray-200 dark:border-gray-700">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-dark-text mb-2">AI Project Planner</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Planning a project? Describe what you're doing, and our planner will generate a checklist of rental items you might need to get the job done.
            </p>
          </div>
        </div>
        <div className="text-center mt-16">
            <p className="text-lg text-gray-700 dark:text-gray-300">
                Ready to try it? Click the chat icon in the bottom right corner of your screen to get started!
            </p>
        </div>
      </section>
    </div>
  );
};

export default ChatPage;
