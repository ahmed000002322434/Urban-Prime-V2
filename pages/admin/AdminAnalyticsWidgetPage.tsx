import React from 'react';
import { useParams } from 'react-router-dom';
import ScopedAnalyticsPage from '../../components/analytics/ScopedAnalyticsPage';

const AdminAnalyticsWidgetPage: React.FC = () => {
  const { pageId, widgetId } = useParams();

  return (
    <ScopedAnalyticsPage
      scopeType="admin"
      scopeId="me"
      pageId={pageId}
      widgetId={widgetId}
      switchHref="/admin/dashboard"
    />
  );
};

export default AdminAnalyticsWidgetPage;
