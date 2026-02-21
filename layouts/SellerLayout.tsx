import React, { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import SellerHeader from '../components/seller/SellerHeader';
import SellerSidebar from '../components/seller/SellerSidebar';

const SellerLayout: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarHover = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(true);
    }, 999);
  };

  const handleSidebarLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      <div
        onMouseEnter={handleSidebarHover}
        onMouseLeave={handleSidebarLeave}
        className="relative"
      >
        <SellerSidebar isOpen={isSidebarOpen} />
      </div>
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <SellerHeader onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;
