import React from 'react';
import { Link } from 'react-router-dom';
import LottieAnimation from '../../components/LottieAnimation';
import { uiLottieAnimations } from '../../utils/uiAnimationAssets';

const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-4 animate-fade-in-up">
            <div className="max-w-md mx-auto">
                <LottieAnimation src={uiLottieAnimations.error404} className="h-64 w-64 mx-auto" loop autoplay />
                <h2 className="text-3xl font-bold mt-4 text-gray-800">Page Not Found</h2>
                <p className="text-gray-500 mt-2">
                    Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
                </p>
                <Link to="/" className="mt-8 inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity">
                    <LottieAnimation src={uiLottieAnimations.home} alt="Home icon" className="h-5 w-5 object-contain" loop autoplay />
                    Return to Homepage
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
