import React from 'react';
import { useParams } from 'react-router-dom';
import type { PersonaType } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import ScopedAnalyticsPage from '../../components/analytics/ScopedAnalyticsPage';

type PersonaAnalyticsPageProps = {
  scopeType: PersonaType;
};

const PersonaAnalyticsPage: React.FC<PersonaAnalyticsPageProps> = ({ scopeType }) => {
  const { pageId } = useParams();
  const { activePersona } = useAuth();

  return (
    <ScopedAnalyticsPage
      scopeType={scopeType}
      scopeId={activePersona?.type === scopeType ? activePersona.id : ''}
      pageId={pageId}
    />
  );
};

export default PersonaAnalyticsPage;
