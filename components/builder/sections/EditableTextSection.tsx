
import React from 'react';
import { StoreTheme } from '../../../storeTypes';

interface EditableTextSectionProps {
  content: {
    title?: string;
    body?: string;
  };
  theme: StoreTheme;
}

const EditableTextSection: React.FC<EditableTextSectionProps> = ({ content, theme }) => {
  return (
    <section className="py-20 px-6 container mx-auto text-center">
      <h2 
        className="text-4xl font-bold mb-6"
        style={{ fontFamily: theme.font }}
      >
        {content.title || 'Our Story'}
      </h2>
      <div className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
        {content.body || 'Tell your customers about your brand, your values, and what makes you unique. This is where the magic happens.'}
      </div>
    </section>
  );
};

export default EditableTextSection;
