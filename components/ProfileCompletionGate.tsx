import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface ProfileCompletionGateProps {
  children: React.ReactNode;
}

const ProfileCompletionGate: React.FC<ProfileCompletionGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default ProfileCompletionGate;
