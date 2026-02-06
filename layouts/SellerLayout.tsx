import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SellerHeader from '../components/seller/SellerHeader';
import SellerSidebar from '../components/seller/SellerSidebar';

const SellerLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-sans">
      <SellerSidebar isOpen={isSidebarOpen} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <SellerHeader onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;
