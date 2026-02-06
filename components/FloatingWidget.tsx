


import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../hooks/useAuth';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const VideoIcon = () => <img src="https://i.ibb.co/jkyfqdFV/Gemini-Generated_Image-gqj0u3gqj0u3gqj0.png" alt="Pixe Logo" className="w-6 h-6 object-contain" />;
const PostIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SparkleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.573L16.5 21.75l-.398-1.177a3.375 3.375 0 00-2.495-2.495L12 17.25l1.177-.398a3.375 3.375 0 002.495-2.495L16.5 13.5l.398 1.177a3.375 3.375 0 002.495 2.495L20.25 18l-1.177.398a3.375 3.375 0 00-2.495 2.495z" /></svg>;
const BroadcastIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12z" /></svg>;
const ServiceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08H4.875c-.413 0-.823.06-1.223.185a2.25 2.25 0 00-1.976 2.192v12.092A2.25 2.25 0 004.5 21h10.512m-9.75-3.375h9.75" /></svg>;


const FloatingWidget: React.FC = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const { showNotification } = useNotification();
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isApprovedProvider = user?.isServiceProvider && user.providerProfile?.status === 'approved';
  // FIX: Changed link for non-providers to /profile to leverage existing onboarding flow in DashboardOverview, avoiding a broken route.
  const serviceLink = isApprovedProvider ? "/profile/services/new" : "/profile";

  const openMenu = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsMenuOpen(true);
  };
  
  const closeMenu = () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
          setIsMenuOpen(false);
      }, 300);
  }

  const handleMouseEnterButton = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    openMenu();
  };

  const handleMouseLeaveContainer = () => {
    closeMenu();
  };
  
  const handleMouseEnterMenu = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };
  
  const handleToggle = () => {
      setIsMenuOpen(prev => !prev);
  }
  
  const handlePixeExtraClick = () => {
    showNotification('Pixe Extra features are coming soon!');
  };

  return (
    <div 
        className="fixed right-6 bottom-24 z-40 flex items-end gap-4"
        onMouseLeave={handleMouseLeaveContainer}
    >
      {isMenuOpen && (
          <div 
            onMouseEnter={handleMouseEnterMenu}
            className="bg-surface rounded-xl shadow-2xl border border-border w-72 animate-fade-in-up overflow-hidden"
          >
              <div className="p-4 border-b border-border">
                  <h3 className="font-bold text-lg text-text-primary">Create New</h3>
              </div>
              <ul className="divide-y divide-border">
                   <li>
                      <Link to={serviceLink} className="flex items-center gap-4 p-4 hover:bg-surface-soft transition-colors group">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <ServiceIcon />
                          </div>
                          <div>
                              <p className="font-semibold text-text-primary">List a Service</p>
                              <p className="text-xs text-text-secondary">Offer your professional skills.</p>
                          </div>
                      </Link>
                  </li>
                  <li>
                      <Link to="/profile/go-live" className="flex items-center gap-4 p-4 hover:bg-surface-soft transition-colors group">
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <BroadcastIcon />
                          </div>
                          <div>
                              <p className="font-semibold text-text-primary">Go Live</p>
                              <p className="text-xs text-text-secondary">Sell products or just chat.</p>
                          </div>
                      </Link>
                  </li>
                  <li>
                      <Link to="/pixe-studio" className="flex items-center gap-4 p-4 hover:bg-surface-soft transition-colors group">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <VideoIcon />
                          </div>
                          <div>
                              <p className="font-semibold text-text-primary">Add New Pixe</p>
                              <p className="text-xs text-text-secondary">Share a short, shoppable video.</p>
                          </div>
                      </Link>
                  </li>
                  <li>
                      <Link to="/profile/products/new" className="flex items-center gap-4 p-4 hover:bg-surface-soft transition-colors group">
                          <div className="w-10 h-10 bg-secondary/20 text-secondary rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <PostIcon />
                          </div>
                          <div>
                              {/* FIX: Changed "Add Post" to "List a Product" for better clarity and UX. */}
                              <p className="font-semibold text-text-primary">List a Product</p>
                              <p className="text-xs text-text-secondary">List a physical or digital product.</p>
                          </div>
                      </Link>
                  </li>
                  <li>
                      <button onClick={handlePixeExtraClick} className="w-full text-left flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 transition-opacity">
                          <div className="w-10 h-10 bg-white/20 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                              <SparkleIcon />
                          </div>
                          <div>
                              <p className="font-semibold text-white">Add Pixe Extra</p>
                              <p className="text-xs text-purple-200">Boost your post with AI features.</p>
                          </div>
                      </button>
                  </li>
              </ul>
          </div>
      )}
      <button 
          onClick={handleToggle}
          onMouseEnter={handleMouseEnterButton}
          className="w-16 h-16 bg-surface text-text-primary rounded-full shadow-lg border border-border flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 flex-shrink-0 hover:bg-surface-soft"
      >
          <div className={`transition-transform duration-300 ease-in-out ${isMenuOpen ? 'rotate-45' : ''}`}>
            <PlusIcon />
          </div>
          {cartCount > 0 && !isMenuOpen && <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center ring-2 ring-surface font-bold">{cartCount}</span>}
      </button>
    </div>
  );
};
export default FloatingWidget;