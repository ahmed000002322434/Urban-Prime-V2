import React from 'react';
import { useParams } from 'react-router-dom';
import ScopedAnalyticsPage from '../../components/analytics/ScopedAnalyticsPage';

const AdminAnalyticsPage: React.FC = () => {
  const { pageId } = useParams();

  return <ScopedAnalyticsPage scopeType="admin" scopeId="me" pageId={pageId} switchHref="/admin/dashboard" />;
};

export default AdminAnalyticsPage;
