import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Store Builder Pages
import BecomeASellerPage from './BecomeASellerPage';
import StoreSetupPage from './StoreSetupPage';
import StoreCustomizer from './StoreCustomizer';
import StorePreviewPage from './StorePreviewPage';
import StoreManagerPage from './StoreManagerPage';
import AffiliateOnboardingPage from './AffiliateOnboardingPage';
import StoreAnalyticsPage from './StoreAnalyticsPage';

/**
 * Store Builder Routing
 * Complete multi-page Shopify-like store creation and management system
 * 
 * Routes:
 * /seller - Marketing landing page to become a seller
 * /store/setup - Multi-step store setup wizard (7 stages)
 * /store/customize - Customize store layout and sections
 * /store/preview - Preview store before publishing
 * /store/manager - Store management dashboard (post-launch)
 * /store/analytics - Analytics & reporting
 * /store/affiliate - Set up affiliate program
 */

export const StoreBuilderRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Seller Landing Page */}
      <Route path="seller" element={<BecomeASellerPage />} />

      {/* Store Setup Wizard */}
      <Route path="store/setup" element={<StoreSetupPage />} />

      {/* Store Customization */}
      <Route path="store/customize" element={<StoreCustomizer />} />

      {/* Store Preview */}
      <Route path="store/preview" element={<StorePreviewPage />} />

      {/* Store Management Dashboard */}
      <Route path="store/manager" element={<StoreManagerPage />} />

      {/* Store Analytics */}
      <Route path="store/analytics" element={<StoreAnalyticsPage />} />

      {/* Affiliate Program Setup */}
      <Route path="store/affiliate" element={<AffiliateOnboardingPage />} />
    </Routes>
  );
};

export default StoreBuilderRoutes;
