import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { buildAnalyticsPath, getDefaultScopePage } from '../../components/analytics/catalog';

const ProfileAnalyticsRedirectPage: React.FC = () => {
  const { activePersona } = useAuth();

  if (!activePersona) {
    return <Navigate to="/profile/switch-accounts" replace />;
  }

  return <Navigate to={buildAnalyticsPath(activePersona.type, getDefaultScopePage(activePersona.type))} replace />;
};

export default ProfileAnalyticsRedirectPage;
