import React from 'react';
import { Outlet } from 'react-router-dom';
import SettingsSidebar from '../../components/SettingsSidebar';

const SettingsPage: React.FC = () => {
  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="w-full xl:sticky xl:top-6 xl:w-72 xl:flex-shrink-0">
          <SettingsSidebar />
        </div>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
