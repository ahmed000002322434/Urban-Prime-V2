
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import AdminSidebar from '../components/admin/AdminSidebar';

const AdminLayout: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`min-h-screen flex font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900'
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      }`}
    >
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
