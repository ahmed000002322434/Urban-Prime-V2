
import React from 'react';
import { Link } from 'react-router-dom';

interface BrandingBarProps {
  logoText: string;
  primaryColor: string;
  navItems: string[];
}

const BrandingBar: React.FC<BrandingBarProps> = ({ logoText, primaryColor, navItems }) => {
  return (
    <header className="w-full bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-black font-display tracking-tight" style={{ color: primaryColor }}>
          {logoText || "STORE LOGO"}
        </h1>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item, idx) => (
            <span key={idx} className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white cursor-pointer transition-colors">
              {item}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-500">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        <button className="relative">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </button>
      </div>
    </header>
  );
};

export default BrandingBar;
