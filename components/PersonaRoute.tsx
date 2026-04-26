import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Capability, PersonaType } from '../types';
import Spinner from './Spinner';
import { useAuth } from '../hooks/useAuth';

type PersonaRouteProps = {
  requiredCapabilities: Capability[];
  mode?: 'all' | 'any';
  allowGuest?: boolean;
  requiredPersonaTypes?: PersonaType[];
};

const PersonaRoute: React.FC<PersonaRouteProps> = ({
  requiredCapabilities,
  mode = 'all',
  allowGuest = false,
  requiredPersonaTypes
}) => {
  const { isAuthenticated, isLoading, activePersona, hasCapability } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated && !allowGuest) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!activePersona) {
    return <Navigate to="/profile/switch-accounts" replace />;
  }

  if (requiredPersonaTypes?.length && !requiredPersonaTypes.includes(activePersona.type)) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6 text-center shadow-soft">
          <h2 className="text-xl font-bold text-text-primary">Switch Persona Required</h2>
          <p className="mt-2 text-text-secondary">
            This section requires a different persona type. Open account switcher and choose a compatible persona.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              to="/profile/switch-accounts"
              className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary"
            >
              Open Switcher
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const matches = requiredCapabilities.map((capability) => hasCapability(capability));
  const allowed = mode === 'any' ? matches.some(Boolean) : matches.every(Boolean);

  if (!allowed) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6 text-center shadow-soft">
          <h2 className="text-xl font-bold text-text-primary">Capability Required</h2>
          <p className="mt-2 text-text-secondary">
            Your active persona does not have the required capability for this action.
          </p>
          <div className="mt-4 text-xs uppercase tracking-wider text-text-secondary">
            Required: {requiredCapabilities.join(', ')}
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              to="/profile/switch-accounts"
              className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary"
            >
              Switch Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default PersonaRoute;
