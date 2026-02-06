
import React from 'react';
// FIX: Switched from namespace import for 'react-router-dom' to named imports for 'Outlet' and 'Navigate' to resolve module resolution errors.
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

const AdminRoute: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return isAuthenticated && user?.isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;
