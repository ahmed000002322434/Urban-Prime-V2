import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

interface ProfileCompletionGateProps {
  children: React.ReactNode;
}

const ProfileCompletionGate: React.FC<ProfileCompletionGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading, profileCompletion, isProfileOnboardingEnabled } = useAuth();
  const location = useLocation();

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

  const isOnboardingRoute = location.pathname === '/auth/onboarding';
  const isMessagingRoute = location.pathname.startsWith('/profile/messages');
  const mustCompleteProfile = Boolean(isProfileOnboardingEnabled && profileCompletion && !profileCompletion.isComplete);
  if (mustCompleteProfile && !isOnboardingRoute && !isMessagingRoute) {
    return <Navigate to="/auth/onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProfileCompletionGate;
