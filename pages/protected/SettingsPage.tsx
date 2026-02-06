
import React from 'react';
import { Outlet } from 'react-router-dom';
import SettingsSidebar from '../../components/SettingsSidebar';

const SettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-start animate-fade-in-up">
      <SettingsSidebar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsPage;
