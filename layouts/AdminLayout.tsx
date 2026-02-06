
import React from 'react';
// FIX: Switched from namespace import for 'react-router-dom' to a named import for 'Outlet' to resolve module resolution error.
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-dark-background font-sans">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
