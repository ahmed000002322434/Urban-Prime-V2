import React from 'react';
import { Link } from 'react-router-dom';
import LottieAnimation from './LottieAnimation';
import { uiLottieAnimations } from '../utils/uiAnimationAssets';

const icons: Record<string, React.ReactNode> = {
    cart: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-gray-300 dark:text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.328 1.125-.824l2.857-9.643A.75.75 0 0020.25 3H6.088a.75.75 0 00-.744.824l.643 3.963M7.5 14.25L5.106 5.162" /></svg>,
    heart: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-gray-300 dark:text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
    list: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-gray-300 dark:text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08H4.875c-.413 0-.823.06-1.223.185a2.25 2.25 0 00-1.976 2.192v12.092A2.25 2.25 0 004.5 21h10.512m-9.75-3.375h9.75" /></svg>,
    draft: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-gray-300 dark:text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
};


interface EmptyStateProps {
  title: string;
  message: string;
  buttonText: string;
  buttonLink: string;
  icon?: keyof typeof icons;
  animation?: keyof typeof uiLottieAnimations;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, buttonText, buttonLink, icon, animation }) => {
  const resolvedAnimation = animation || (icon === 'cart' ? 'nothing' : undefined);
  return (
    <div className="flex items-center justify-center py-10">
      <div className="bg-white dark:bg-dark-surface p-12 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 text-center max-w-lg mx-auto">
        {resolvedAnimation ? (
          <div className="flex justify-center mb-4">
            <LottieAnimation src={uiLottieAnimations[resolvedAnimation]} className="h-40 w-40" loop autoplay />
          </div>
        ) : (
          icon && icons[icon] && <div className="flex justify-center mb-6">{icons[icon]}</div>
        )}
        <h2 className="text-3xl font-extrabold font-display text-gray-800 dark:text-dark-text">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
        <Link
          to={buttonLink}
          className="mt-8 inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity"
        >
          {buttonLink === '/' && <LottieAnimation src={uiLottieAnimations.home} alt="Home icon" className="h-5 w-5 object-contain" loop autoplay />}
          {buttonText}
        </Link>
      </div>
    </div>
  );
};

export default EmptyState;
