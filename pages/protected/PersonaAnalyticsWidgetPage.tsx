import React from 'react';
import { useParams } from 'react-router-dom';
import type { PersonaType } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import ScopedAnalyticsPage from '../../components/analytics/ScopedAnalyticsPage';

type PersonaAnalyticsWidgetPageProps = {
  scopeType: PersonaType;
};

const PersonaAnalyticsWidgetPage: React.FC<PersonaAnalyticsWidgetPageProps> = ({ scopeType }) => {
  const { pageId, widgetId } = useParams();
  const { activePersona } = useAuth();

  return (
    <ScopedAnalyticsPage
      scopeType={scopeType}
      scopeId={activePersona?.type === scopeType ? activePersona.id : ''}
      pageId={pageId}
      widgetId={widgetId}
    />
  );
};

export default PersonaAnalyticsWidgetPage;
