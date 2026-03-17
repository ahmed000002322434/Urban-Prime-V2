

import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';

const AdminLayout: React.FC = () => {
  return (
    <div className="admin-shell dashboard-shell dashboard-monochrome-theme min-h-screen flex font-sans">
      <AdminSidebar />
      <main className="dashboard-main flex-1 p-6 sm:p-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
