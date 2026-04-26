
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { CategoryProvider } from './context/CategoryContext';
import { ComparisonProvider } from './context/ComparisonContext';
import { UserDataProvider } from './context/UserDataContext';
import { AnimationProvider } from './context/AnimationContext';
import { LanguageProvider } from './context/LanguageContext';
import { UploadProvider } from './context/UploadContext';
import { OmniProvider } from './context/OmniContext';
import { SpotlightPreferencesProvider } from './components/spotlight/SpotlightPreferencesContext';
import { useTheme } from './hooks/useTheme';
import { HeroStyleProvider } from './context/HeroStyleContext';

import Layout from './components/Layout';
import WelcomeScreen from './components/WelcomeScreen';
import ContextualThemeWrapper from './components/ContextualThemeWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import PersonaRoute from './components/PersonaRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import AutoDraftPersistence from './components/AutoDraftPersistence';
import GlobalNavigationEnhancer from './components/GlobalNavigationEnhancer';
import RouteSkeletonFallback from './components/RouteSkeletonFallback';
import { schedulePrefetchRoutes } from './utils/routePrefetch';

// Layouts
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const HomePage = lazy(() => import('./pages/public/HomePage'));

// Public Pages
const StoreFront = lazy(() => import('./pages/public/StoreFront'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const TermsOfUsePage = lazy(() => import('./pages/public/TermsOfUsePage'));
const ShippingPolicyPage = lazy(() => import('./pages/public/ShippingPolicyPage'));
const ReturnPolicyPage = lazy(() => import('./pages/public/ReturnPolicyPage'));
const PressPage = lazy(() => import('./pages/public/PressPage'));
const CareersPage = lazy(() => import('./pages/public/CareersPage'));
const TrustAndSafetyPage = lazy(() => import('./pages/public/TrustAndSafetyPage'));
const SupportCenterPage = lazy(() => import('./pages/public/SupportCenterPage'));
const PurchaseProtectionPage = lazy(() => import('./pages/public/PurchaseProtectionPage'));
const ChatPage = lazy(() => import('./pages/public/ChatPage'));
const CommunityPage = lazy(() => import('./pages/public/CommunityPage'));
const EventsPage = lazy(() => import('./pages/public/EventsPage'));
const GuidesPage = lazy(() => import('./pages/public/GuidesPage'));
const PerksPage = lazy(() => import('./pages/public/PerksPage'));
const RewardsPage = lazy(() => import('./pages/public/RewardsPage'));
const GiftCardsPage = lazy(() => import('./pages/public/GiftCardsPage'));
const AffiliateLandingPage = lazy(() => import('./pages/public/AffiliateLandingPage'));
const SellerResourceCenterPage = lazy(() => import('./pages/public/SellerResourceCenterPage'));
const StoresDirectoryPage = lazy(() => import('./pages/public/StoresDirectoryPage'));
const BrandsHubPage = lazy(() => import('./pages/public/BrandsHubPage'));
const ExploreBrandsHubPage = lazy(() => import('./pages/public/ExploreBrandsHubPage'));
const BrandDetailPage = lazy(() => import('./pages/public/BrandDetailPage'));
const BrandCatalogPage = lazy(() => import('./pages/public/BrandCatalogPage'));
const SellerDirectoryPage = lazy(() => import('./pages/public/SellerDirectoryPage'));
const RenterDirectoryPage = lazy(() => import('./pages/public/RenterDirectoryPage'));
const BuyerDirectoryPage = lazy(() => import('./pages/public/BuyerDirectoryPage'));
const ExploreHubPage = lazy(() => import('./pages/public/ExploreHubPage'));
const BrowsePage = lazy(() => import('./pages/public/BrowsePage'));
const BrowseServicesPage = lazy(() => import('./pages/public/BrowseServicesPage'));
const ServicesMarketplacePage = lazy(() => import('./pages/public/ServicesMarketplacePage'));
const RentalsPage = lazy(() => import('./pages/public/RentalsPage'));
const AuctionsPage = lazy(() => import('./pages/public/AuctionsPage'));
const ItemDetailPage = lazy(() => import('./pages/public/ItemDetailPage'));
const ServiceDetailPage = lazy(() => import('./pages/public/ServiceDetailPage'));
const ReelsPage = lazy(() => import('./pages/public/ReelsPage'));
const LiveShoppingPage = lazy(() => import('./pages/public/LiveShoppingPage'));
const PixeFeedPage = lazy(() => import('./pages/public/PixeFeedPage'));
const PixeExplorePage = lazy(() => import('./pages/public/PixeExplorePage'));
const PixeCreatorsPage = lazy(() => import('./pages/public/PixeCreatorsPage'));
const PixeWatchPage = lazy(() => import('./pages/public/PixeWatchPage'));
const PixeChannelPage = lazy(() => import('./pages/public/PixeChannelPage'));
const SpotlightPage = lazy(() => import('./pages/public/PrimeSpotlightPage'));
const ProductBattlePage = lazy(() => import('./pages/public/ProductBattlePage'));
const MysteryBoxPage = lazy(() => import('./pages/public/MysteryBoxPage'));
const FeaturesHubPage = lazy(() => import('./pages/public/FeaturesHubPage'));
const PrimePassPage = lazy(() => import('./pages/public/PrimePassPage'));
const GemstoneShowcasePage = lazy(() => import('./pages/public/GemstoneShowcasePage'));
const AuditPage = lazy(() => import('./pages/public/AuditPage'));
const DropshippingPage = lazy(() => import('./pages/public/DropshippingPage'));
const SupabaseTodosPage = lazy(() => import('./pages/public/SupabaseTodosPage'));
const LanguageSelectionPage = lazy(() => import('./pages/public/LanguageSelectionPage'));
const ComparePage = lazy(() => import('./pages/public/ComparePage'));
const NewArrivalsPage = lazy(() => import('./pages/public/NewArrivalsPage'));
const DealsPage = lazy(() => import('./pages/public/DealsPage'));
const TrackOrderPage = lazy(() => import('./pages/public/TrackOrderPage'));
const BlogsPage = lazy(() => import('./pages/public/BlogsPage'));
const UserCollectionsPage = lazy(() => import('./pages/public/UserCollectionsPage'));
const PublicWishlistPage = lazy(() => import('./pages/public/PublicWishlistPage'));
const PublicProfilePage = lazy(() => import('./pages/public/PublicProfilePage'));
const SpotlightProfilePage = lazy(() => import('./pages/public/SpotlightProfilePage'));
const NotificationsPage = lazy(() => import('./pages/public/NotificationsPage'));
const MorePage = lazy(() => import('./pages/public/MorePage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

// Category Pages
const ElectronicsPage = lazy(() => import('./pages/public/ElectronicsPage'));
const LaptopsPage = lazy(() => import('./pages/public/LaptopsPage'));
const MobilesPage = lazy(() => import('./pages/public/MobilesPage'));
const TabletsPage = lazy(() => import('./pages/public/TabletsPage'));
const TVsPage = lazy(() => import('./pages/public/TVsPage'));
const AudioPage = lazy(() => import('./pages/public/AudioPage'));
const CamerasPage = lazy(() => import('./pages/public/CamerasPage'));
const ComputerAccessoriesPage = lazy(() => import('./pages/public/ComputerAccessoriesPage'));
const MobileAccessoriesPage = lazy(() => import('./pages/public/MobileAccessoriesPage'));
const NetworkingPage = lazy(() => import('./pages/public/NetworkingPage'));
const PowerBanksPage = lazy(() => import('./pages/public/PowerBanksPage'));
const StoragePage = lazy(() => import('./pages/public/StoragePage'));
const GamingConsolesPage = lazy(() => import('./pages/public/GamingConsolesPage'));
const GamingAccessoriesPage = lazy(() => import('./pages/public/GamingAccessoriesPage'));
const ClothingPage = lazy(() => import('./pages/public/ClothingPage'));
const WomensClothingPage = lazy(() => import('./pages/public/WomensClothingPage'));
const WomensCollectionPage = lazy(() => import('./pages/public/WomensCollectionPage'));
const MensClothingPage = lazy(() => import('./pages/public/MensClothingPage'));
const MensCollectionPage = lazy(() => import('./pages/public/MensCollectionPage'));
const UnisexFashionPage = lazy(() => import('./pages/public/UnisexFashionPage'));
const KidsCollectionPage = lazy(() => import('./pages/public/KidsCollectionPage'));
const BoysCollectionPage = lazy(() => import('./pages/public/BoysCollectionPage'));
const TeenGirlsCollectionPage = lazy(() => import('./pages/public/TeenGirlsCollectionPage'));
const BabyWearPage = lazy(() => import('./pages/public/BabyWearPage'));
const ShoesPage = lazy(() => import('./pages/public/ShoesPage'));
const MenShoesPage = lazy(() => import('./pages/public/MenShoesPage'));
const WomenShoesPage = lazy(() => import('./pages/public/WomenShoesPage'));
const WomensBagsPage = lazy(() => import('./pages/public/WomensBagsPage'));
const WomensAccessoriesPage = lazy(() => import('./pages/public/WomensAccessoriesPage'));
const MensAccessoriesPage = lazy(() => import('./pages/public/MensAccessoriesPage'));
const SeasonalFashionPage = lazy(() => import('./pages/public/SeasonalFashionPage'));
const TraditionalWearPage = lazy(() => import('./pages/public/TraditionalWearPage'));
const SportswearPage = lazy(() => import('./pages/public/SportswearPage'));
const BeautyPage = lazy(() => import('./pages/public/BeautyPage'));
const SkincarePage = lazy(() => import('./pages/public/SkincarePage'));
const MakeupPage = lazy(() => import('./pages/public/MakeupPage'));
const HairCarePage = lazy(() => import('./pages/public/HairCarePage'));
const FragrancesPage = lazy(() => import('./pages/public/FragrancesPage'));
const BathBodyPage = lazy(() => import('./pages/public/BathBodyPage'));
const NailCarePage = lazy(() => import('./pages/public/NailCarePage'));
const MensGroomingPage = lazy(() => import('./pages/public/MensGroomingPage'));
const HealthWellnessPage = lazy(() => import('./pages/public/HealthWellnessPage'));
const BeautyToolsPage = lazy(() => import('./pages/public/BeautyToolsPage'));
const PersonalHygienePage = lazy(() => import('./pages/public/PersonalHygienePage'));
const HomeAndLivingPage = lazy(() => import('./pages/public/HomeAndLivingPage'));
const FurniturePage = lazy(() => import('./pages/public/FurniturePage'));
const HomeDecorPage = lazy(() => import('./pages/public/HomeDecorPage'));
const KitchenwarePage = lazy(() => import('./pages/public/KitchenwarePage'));
const BeddingPage = lazy(() => import('./pages/public/BeddingPage'));
const BathEssentialsPage = lazy(() => import('./pages/public/BathEssentialsPage'));
const LightingPage = lazy(() => import('./pages/public/LightingPage'));
const StorageOrganizationPage = lazy(() => import('./pages/public/StorageOrganizationPage'));
const CleaningSuppliesPage = lazy(() => import('./pages/public/CleaningSuppliesPage'));
const GardenOutdoorPage = lazy(() => import('./pages/public/GardenOutdoorPage'));
const CarpetsRugsPage = lazy(() => import('./pages/public/CarpetsRugsPage'));
const CurtainsBlindsPage = lazy(() => import('./pages/public/CurtainsBlindsPage'));
const DIYToolsPage = lazy(() => import('./pages/public/DIYToolsPage'));
const PaintHardwarePage = lazy(() => import('./pages/public/PaintHardwarePage'));
const ElectricalAppliancesPage = lazy(() => import('./pages/public/ElectricalAppliancesPage'));
const SmallHomeAppliancesPage = lazy(() => import('./pages/public/SmallHomeAppliancesPage'));
const ToolsPage = lazy(() => import('./pages/public/ToolsPage'));
const PowerToolsPage = lazy(() => import('./pages/public/PowerToolsPage'));
const GroceriesPage = lazy(() => import('./pages/public/GroceriesPage'));
const FreshFoodPage = lazy(() => import('./pages/public/FreshFoodPage'));
const PackagedFoodPage = lazy(() => import('./pages/public/PackagedFoodPage'));
const BeveragesPage = lazy(() => import('./pages/public/BeveragesPage'));
const SnacksPage = lazy(() => import('./pages/public/SnacksPage'));
const CookingEssentialsPage = lazy(() => import('./pages/public/CookingEssentialsPage'));
const BabyFoodPage = lazy(() => import('./pages/public/BabyFoodPage'));
const DairyProductsPage = lazy(() => import('./pages/public/DairyProductsPage'));
const PetFoodPage = lazy(() => import('./pages/public/PetFoodPage'));
const CleaningHouseholdPage = lazy(() => import('./pages/public/CleaningHouseholdPage'));
const PersonalCareEssentialsPage = lazy(() => import('./pages/public/PersonalCareEssentialsPage'));
const SportsAndOutdoorsPage = lazy(() => import('./pages/public/SportsAndOutdoorsPage'));
const ArtCollectiblesPage = lazy(() => import('./pages/public/ArtCollectiblesPage'));
const PaintingsPage = lazy(() => import('./pages/public/PaintingsPage'));
const DigitalProductsPage = lazy(() => import('./pages/public/DigitalProductsPage'));
const JewelryPage = lazy(() => import('./pages/public/JewelryPage'));
const RingsPage = lazy(() => import('./pages/public/RingsPage'));
const EyewearPage = lazy(() => import('./pages/public/EyewearPage'));
const WatchesPage = lazy(() => import('./pages/public/WatchesPage'));
const SmartWatchesPage = lazy(() => import('./pages/public/SmartWatchesPage'));
const LookbookPage = lazy(() => import('./pages/public/LookbookPage'));
const StyleGuidesPage = lazy(() => import('./pages/public/StyleGuidesPage'));
const GamesHubPage = lazy(() => import('./pages/public/GamesHubPage'));
const PrintOnDemandPage = lazy(() => import('./pages/public/PrintOnDemandPage'));

// Protected Pages
const DashboardOverview = lazy(() => import('./pages/protected/DashboardOverview'));
const ActivityPage = lazy(() => import('./pages/protected/ActivityPage'));
const OwnerControlsPage = lazy(() => import('./pages/protected/OwnerControlsPage'));
const MyOrdersPage = lazy(() => import('./pages/protected/MyOrdersPage'));
const MyBidsPage = lazy(() => import('./pages/protected/MyBidsPage'));
const OrderDetailsPage = lazy(() => import('./pages/protected/OrderDetailsPage'));
const MessagesPage = lazy(() => import('./pages/protected/MessagesPage'));
const WishlistPage = lazy(() => import('./pages/protected/WishlistPage'));
const MyReviewsPage = lazy(() => import('./pages/protected/MyReviewsPage'));
const CouponsPage = lazy(() => import('./pages/protected/CouponsPage'));
const FollowedStoresPage = lazy(() => import('./pages/protected/FollowedStoresPage'));
const BrowsingHistoryPage = lazy(() => import('./pages/protected/BrowsingHistoryPage'));
const SettingsPage = lazy(() => import('./pages/protected/SettingsPage'));
const EditProfilePage = lazy(() => import('./pages/protected/EditProfilePage'));
const AddressesPage = lazy(() => import('./pages/protected/AddressesPage'));
const PaymentOptionsPage = lazy(() => import('./pages/protected/PaymentOptionsPage'));
const TrustAndVerificationPage = lazy(() => import('./pages/protected/TrustAndVerificationPage'));
const PermissionsPage = lazy(() => import('./pages/protected/PermissionsPage'));
const NotificationsSettingsPage = lazy(() => import('./pages/protected/NotificationsSettingsPage'));
const ProfileNotificationsPage = lazy(() => import('./pages/protected/ProfileNotificationsPage'));
const PrivacySettingsPage = lazy(() => import('./pages/protected/PrivacySettingsPage'));
const SwitchAccountsPage = lazy(() => import('./pages/protected/SwitchAccountsPage'));
const SwitchGoogleAccountPage = lazy(() => import('./pages/protected/SwitchGoogleAccountPage'));
const MyStorePage = lazy(() => import('./pages/protected/MyStorePage'));
const MyListingsPage = lazy(() => import('./pages/protected/MyListingsPage'));
const ListItemPage = lazy(() => import('./pages/protected/ListItemPage'));
const DigitalListItemPage = lazy(() => import('./pages/protected/DigitalListItemPage'));
const MyCollectionsPage = lazy(() => import('./pages/protected/MyCollectionsPage'));
const SalesManagementPage = lazy(() => import('./pages/protected/SalesManagementPage'));
const OffersPage = lazy(() => import('./pages/protected/OffersPage'));
const CreatorHubPage = lazy(() => import('./pages/protected/CreatorHubPage'));
const AffiliateProgramPage = lazy(() => import('./pages/protected/AffiliateProgramPage'));
const PromotionsManagerPage = lazy(() => import('./pages/protected/PromotionsManagerPage'));
const ProviderDashboardPage = lazy(() => import('./pages/protected/ProviderDashboardPage'));
const ListServicePage = lazy(() => import('./pages/protected/ListServicePage'));
const BecomeProviderPage = lazy(() => import('./pages/protected/BecomeProviderPage'));
const ProviderWorkspaceLayout = lazy(() => import('./pages/protected/provider/ProviderWorkspaceLayout'));
const ProviderOnboardingPage = lazy(() => import('./pages/protected/provider/ProviderOnboardingPage'));
const ProviderWorkspaceOverviewPage = lazy(() => import('./pages/protected/provider/ProviderWorkspaceOverviewPage'));
const ProviderHubProfilePage = lazy(() => import('./pages/protected/provider/ProviderHubProfilePage'));
const ProviderServicesPage = lazy(() => import('./pages/protected/provider/ProviderServicesPage'));
const ProviderServiceEditorPage = lazy(() => import('./pages/protected/provider/ProviderServiceEditorPage'));
const ProviderLeadsPage = lazy(() => import('./pages/protected/provider/ProviderLeadsPage'));
const ProviderProposalsPage = lazy(() => import('./pages/protected/provider/ProviderProposalsPage'));
const ProviderJobsPage = lazy(() => import('./pages/protected/provider/ProviderJobsPage'));
const ProviderCalendarPage = lazy(() => import('./pages/protected/provider/ProviderCalendarPage'));
const ProviderEarningsPage = lazy(() => import('./pages/protected/provider/ProviderEarningsPage'));
const ProviderPayoutsPage = lazy(() => import('./pages/protected/provider/ProviderPayoutsPage'));
const ProviderReviewsPage = lazy(() => import('./pages/protected/provider/ProviderReviewsPage'));
const ProviderSettingsPage = lazy(() => import('./pages/protected/provider/ProviderSettingsPage'));
const PixeStudioShell = lazy(() => import('./components/pixe/PixeStudioShell'));
const PixeStudioDashboardPage = lazy(() => import('./pages/protected/pixe/PixeStudioDashboardPage'));
const PixeStudioUploadPage = lazy(() => import('./pages/protected/pixe/PixeStudioUploadPage'));
const PixeStudioContentPage = lazy(() => import('./pages/protected/pixe/PixeStudioContentPage'));
const PixeStudioVideoDetailsPage = lazy(() => import('./pages/protected/pixe/PixeStudioVideoDetailsPage'));
const PixeStudioCommentsPage = lazy(() => import('./pages/protected/pixe/PixeStudioCommentsPage'));
const PixeStudioAnalyticsPage = lazy(() => import('./pages/protected/pixe/PixeStudioAnalyticsPage'));
const PixeStudioVideoAnalyticsPage = lazy(() => import('./pages/protected/pixe/PixeStudioVideoAnalyticsPage'));
const PixeStudioChannelPage = lazy(() => import('./pages/protected/pixe/PixeStudioChannelPage'));
const PixeStudioSettingsPage = lazy(() => import('./pages/protected/pixe/PixeStudioSettingsPage'));
const PixeSavedPage = lazy(() => import('./pages/protected/pixe/PixeSavedPage'));
const PixeActivityPage = lazy(() => import('./pages/protected/pixe/PixeActivityPage'));
const PixeHelpPage = lazy(() => import('./pages/public/PixeHelpPage'));
const PixeGuidelinesPage = lazy(() => import('./pages/public/PixeGuidelinesPage'));
const PixePoliciesPage = lazy(() => import('./pages/public/PixePoliciesPage'));
const PixeTermsPage = lazy(() => import('./pages/public/PixeTermsPage'));
const CreateLiveStreamPage = lazy(() => import('./pages/protected/CreateLiveStreamPage'));
const CreatePostPage = lazy(() => import('./pages/protected/CreatePostPage'));
const CreateSpotlightPage = lazy(() => import('./pages/protected/CreateSpotlightPage'));
const WalletPage = lazy(() => import('./pages/protected/WalletPage'));
const EarningsPage = lazy(() => import('./pages/protected/EarningsPage'));
const PackagesPage = lazy(() => import('./pages/protected/PackagesPage'));
const ProfileAnalyticsRedirectPage = lazy(() => import('./pages/protected/ProfileAnalyticsRedirectPage'));
const PersonaAnalyticsPage = lazy(() => import('./pages/protected/PersonaAnalyticsPage'));
const PersonaAnalyticsWidgetPage = lazy(() => import('./pages/protected/PersonaAnalyticsWidgetPage'));
const AdvancedAnalyticsPage = lazy(() => import('./pages/protected/AdvancedAnalyticsPage'));
const TrafficAnalyticsPage = lazy(() => import('./pages/protected/TrafficAnalyticsPage'));
const RevenueAnalyticsPage = lazy(() => import('./pages/protected/RevenueAnalyticsPage'));
const SalesUnitsAnalyticsPage = lazy(() => import('./pages/protected/SalesUnitsAnalyticsPage'));
const ConversionAnalyticsPage = lazy(() => import('./pages/protected/ConversionAnalyticsPage'));
const StoreEditorPage = lazy(() => import('./pages/protected/StoreEditorPage'));
const StoreGeneratingPage = lazy(() => import('./pages/protected/StoreGeneratingPage'));
const CreateStorePage = lazy(() => import('./pages/protected/CreateStorePage'));
const TrackDeliveryPage = lazy(() => import('./pages/protected/TrackDeliveryPage'));
const OrderConfirmationPage = lazy(() => import('./pages/protected/OrderConfirmationPage'));
const UploadGamePage = lazy(() => import('./pages/protected/UploadGamePage'));
const UrbanGeniePage = lazy(() => import('./pages/public/UrbanGeniePage'));
const CartPage = lazy(() => import('./pages/protected/CartPage'));
const CheckoutPage = lazy(() => import('./pages/protected/CheckoutPage'));
const DisputeCenterPage = lazy(() => import('./pages/protected/DisputeCenterPage'));
const HelpPage = lazy(() => import('./pages/protected/HelpPage'));
const WorkflowHubPage = lazy(() => import('./pages/protected/WorkflowHubPage'));
const ShipperDashboardPage = lazy(() => import('./pages/protected/ShipperDashboardPage'));
const ShipperDeliveryQueuePage = lazy(() => import('./pages/protected/ShipperDeliveryQueuePage'));
const PODStudioDashboardPage = lazy(() => import('./pages/protected/pod/PODStudioDashboardPage'));
const PODCatalogPage = lazy(() => import('./pages/protected/pod/PODCatalogPage'));
const PODDesignLibraryPage = lazy(() => import('./pages/protected/pod/PODDesignLibraryPage'));
const PODProductsPage = lazy(() => import('./pages/protected/pod/PODProductsPage'));
const PODOrdersPage = lazy(() => import('./pages/protected/pod/PODOrdersPage'));
const PODProductEditorPage = lazy(() => import('./pages/protected/pod/PODProductEditorPage'));
const GameStudioPage = lazy(() => import('./pages/protected/GameStudioPage'));
const DigitalLibraryPage = lazy(() => import('./pages/protected/DigitalLibraryPage'));

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminAnalyticsWidgetPage = lazy(() => import('./pages/admin/AdminAnalyticsWidgetPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminListingsPage = lazy(() => import('./pages/admin/AdminListingsPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayoutsPage'));
const AdminCustomerQueriesPage = lazy(() => import('./pages/admin/AdminCustomerQueriesPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminProvidersPage = lazy(() => import('./pages/admin/AdminProvidersPage'));
const AdminDropshippingPage = lazy(() => import('./pages/admin/AdminDropshippingPage'));
const AdminPixePage = lazy(() => import('./pages/admin/AdminPixePage'));
const ProviderPublicProfilePage = lazy(() => import('./pages/public/ProviderPublicProfilePage'));


// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'));
const ProfileHubPage = lazy(() => import('./pages/protected/ProfileHubPage'));
const StarryBackground = lazy(() => import('./components/StarryBackground'));

const SpotlightRouteFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <SpotlightPreferencesProvider>{children}</SpotlightPreferencesProvider>;
};

const AppContent: React.FC = () => {
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    return schedulePrefetchRoutes([
      '/browse',
      '/stores',
      '/brands',
      '/reels',
      '/spotlight',
      '/pixe',
      '/messages',
      '/cart'
    ]);
  }, []);

  return (
    <ContextualThemeWrapper>
      <GlobalNavigationEnhancer />
      {resolvedTheme === 'obsidian' ? (
        <Suspense fallback={null}>
          <StarryBackground />
        </Suspense>
      ) : null}
      {showWelcomeScreen ? <WelcomeScreen onComplete={() => setShowWelcomeScreen(false)} /> : null}
      <Suspense fallback={<RouteSkeletonFallback />}>
        <Routes>
          {/* Standalone Store Pages */}
          <Route path="/s/:storeSlug" element={<StoreFront />} />
          <Route path="/store/preview" element={<StoreEditorPage />} />
          <Route path="/store/generating" element={<StoreGeneratingPage />} />

          {/* Auth Routes */}
          <Route path="/auth" element={<LoginPage />} />
          <Route path="/auth/onboarding" element={<OnboardingPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="analytics" element={<Navigate to="/admin/analytics/overview" replace />} />
              <Route path="analytics/:pageId" element={<AdminAnalyticsPage />} />
              <Route path="analytics/:pageId/card/:widgetId" element={<AdminAnalyticsWidgetPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="providers" element={<AdminProvidersPage />} />
              <Route path="dropshipping" element={<AdminDropshippingPage />} />
              <Route path="pixe" element={<AdminPixePage />} />
              <Route path="listings" element={<AdminListingsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="payouts" element={<AdminPayoutsPage />} />
              <Route path="queries" element={<AdminCustomerQueriesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          <Route path="/pixe" element={<PixeFeedPage mode="for_you" />} />
          <Route path="/pixe/following" element={<PixeFeedPage mode="following" />} />
          <Route path="/pixe/explore" element={<PixeExplorePage />} />
          <Route path="/pixe/search" element={<PixeExplorePage />} />
          <Route path="/pixe/creators" element={<PixeCreatorsPage />} />
          <Route path="/pixe/watch/:videoId" element={<PixeWatchPage />} />
          <Route path="/pixe/channel/:handle" element={<PixeChannelPage />} />
          <Route path="/pixe/help" element={<PixeHelpPage />} />
          <Route path="/pixe/guidelines" element={<PixeGuidelinesPage />} />
          <Route path="/pixe/policies" element={<PixePoliciesPage />} />
          <Route path="/pixe/terms" element={<PixeTermsPage />} />
          <Route path="/pixe/saved" element={<ProtectedRoute />}>
            <Route index element={<PixeSavedPage />} />
          </Route>
          <Route path="/pixe/activity" element={<ProtectedRoute />}>
            <Route index element={<PixeActivityPage />} />
            <Route path="watched" element={<PixeActivityPage />} />
            <Route path="likes" element={<PixeActivityPage />} />
            <Route path="comments" element={<PixeActivityPage />} />
          </Route>

          <Route path="/pixe-studio" element={<ProtectedRoute />}>
            <Route element={<PixeStudioShell />}>
              <Route index element={<Navigate to="/pixe-studio/dashboard" replace />} />
              <Route path="dashboard" element={<PixeStudioDashboardPage />} />
              <Route path="upload" element={<PixeStudioUploadPage />} />
              <Route path="content" element={<PixeStudioContentPage />} />
              <Route path="content/:videoId" element={<PixeStudioVideoDetailsPage />} />
              <Route path="comments" element={<PixeStudioCommentsPage />} />
              <Route path="analytics" element={<PixeStudioAnalyticsPage />} />
              <Route path="analytics/:videoId" element={<PixeStudioVideoAnalyticsPage />} />
              <Route path="monetization" element={<Navigate to="/pixe-studio/analytics" replace />} />
              <Route path="channel" element={<PixeStudioChannelPage />} />
              <Route path="settings" element={<PixeStudioSettingsPage />} />
            </Route>
          </Route>

          {/* Main Layout Routes - Wraps all site pages */}
          <Route element={<Layout />}>
            {/* Dynamic Routes - Must be before catch-all */}
            <Route path="item/:id" element={<ItemDetailPage />} />
            <Route path="auctions/:itemId" element={<ItemDetailPage />} />
            <Route path="service/:id" element={<ServiceDetailPage />} />
            <Route path="providers/:providerId" element={<ProviderPublicProfilePage />} />
            <Route path="user/:id" element={<PublicProfilePage />} />
            <Route path="profile/:username" element={<SpotlightRouteFrame><SpotlightProfilePage /></SpotlightRouteFrame>} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:threadId" element={<MessagesPage />} />
            <Route path="wishlist/:id" element={<PublicWishlistPage />} />
            <Route path="collections/:userId" element={<UserCollectionsPage />} />
            <Route index element={<HomePage />} />
            
            {/* Public Pages */}
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="terms-of-use" element={<TermsOfUsePage />} />
            <Route path="shipping-policy" element={<ShippingPolicyPage />} />
            <Route path="return-policy" element={<ReturnPolicyPage />} />
            <Route path="press" element={<PressPage />} />
            <Route path="careers" element={<CareersPage />} />
            <Route path="safety-center" element={<TrustAndSafetyPage />} />
            <Route path="support-center" element={<SupportCenterPage />} />
            <Route path="purchase-protection" element={<PurchaseProtectionPage />} />
            <Route path="chat-with-us" element={<ChatPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="guides" element={<GuidesPage />} />
            <Route path="perks" element={<PerksPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="gift-cards" element={<GiftCardsPage />} />
            <Route path="affiliate-program" element={<AffiliateLandingPage />} />
            <Route path="seller-resource-center" element={<SellerResourceCenterPage />} />
            <Route path="stores" element={<StoresDirectoryPage />} />
            <Route path="brands" element={<BrandsHubPage />} />
            <Route path="brands/explore" element={<ExploreBrandsHubPage />} />
            <Route path="brands/:brandSlug" element={<BrandDetailPage />} />
            <Route path="brands/:brandSlug/*" element={<BrandCatalogPage />} />
            <Route path="sellers" element={<SellerDirectoryPage />} />
            <Route path="renters" element={<RenterDirectoryPage />} />
            <Route path="buyers" element={<BuyerDirectoryPage />} />
            <Route path="explore" element={<ExploreHubPage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="rentals" element={<RentalsPage />} />
            <Route path="auctions" element={<AuctionsPage />} />
            <Route path="browse/services" element={<BrowseServicesPage />} />
                <Route path="services/marketplace" element={<ServicesMarketplacePage />} />
                <Route path="reels" element={<ReelsPage />} />
                <Route path="spotlight" element={<SpotlightRouteFrame><SpotlightPage /></SpotlightRouteFrame>} />
                <Route path="spotlight/post/:id" element={<SpotlightRouteFrame><SpotlightPage /></SpotlightRouteFrame>} />
                <Route path="live" element={<LiveShoppingPage />} />
            <Route path="battles" element={<ProductBattlePage />} />
            <Route path="mystery-box" element={<MysteryBoxPage />} />
            <Route path="features" element={<FeaturesHubPage />} />
            <Route path="prime-pass" element={<PrimePassPage />} />
            <Route path="luxury" element={<GemstoneShowcasePage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="dropshipping" element={<DropshippingPage />} />
            <Route path="supabase-todos" element={<SupabaseTodosPage />} />
            <Route path="languages" element={<LanguageSelectionPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="new-arrivals" element={<NewArrivalsPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="track-order" element={<TrackOrderPage />} />
            <Route path="blog" element={<BlogsPage />} />
            <Route path="genie" element={<UrbanGeniePage />} />
            <Route path="games" element={<GamesHubPage />} />

            {/* Category Landing Pages */}
            <Route path="electronics" element={<ElectronicsPage />} />
            <Route path="laptops-computers" element={<LaptopsPage />} />
            <Route path="mobile-phones" element={<MobilesPage />} />
            <Route path="tablets" element={<TabletsPage />} />
            <Route path="tvs-home-entertainment" element={<TVsPage />} />
            <Route path="audio-equipment" element={<AudioPage />} />
            <Route path="cameras-lenses" element={<CamerasPage />} />
            <Route path="computer-accessories" element={<ComputerAccessoriesPage />} />
            <Route path="mobile-accessories" element={<MobileAccessoriesPage />} />
            <Route path="networking-devices" element={<NetworkingPage />} />
            <Route path="power-banks-chargers" element={<PowerBanksPage />} />
            <Route path="storage-devices" element={<StoragePage />} />
            <Route path="gaming-consoles" element={<GamingConsolesPage />} />
            <Route path="gaming-accessories" element={<GamingAccessoriesPage />} />
            
            <Route path="clothing" element={<ClothingPage />} />
            <Route path="womens-clothing" element={<WomensClothingPage />} />
            <Route path="clothing/women" element={<WomensCollectionPage />} />
            <Route path="mens-clothing" element={<MensClothingPage />} />
            <Route path="clothing/men" element={<MensCollectionPage />} />
            <Route path="unisex-fashion" element={<UnisexFashionPage />} />
            <Route path="clothing/kids" element={<KidsCollectionPage />} />
            <Route path="clothing/boys" element={<BoysCollectionPage />} />
            <Route path="clothing/teen-girls" element={<TeenGirlsCollectionPage />} />
            <Route path="clothing/baby" element={<BabyWearPage />} />
            
            <Route path="shoes" element={<ShoesPage />} />
            <Route path="shoes/men" element={<MenShoesPage />} />
            <Route path="shoes/women" element={<WomenShoesPage />} />
            <Route path="womens-bags" element={<WomensBagsPage />} />
            <Route path="womens-accessories" element={<WomensAccessoriesPage />} />
            <Route path="mens-accessories" element={<MensAccessoriesPage />} />
            <Route path="seasonal-fashion" element={<SeasonalFashionPage />} />
            <Route path="traditional-wear" element={<TraditionalWearPage />} />
            <Route path="sportswear" element={<SportswearPage />} />
            
            <Route path="beauty-personal-care" element={<BeautyPage />} />
            <Route path="skincare" element={<SkincarePage />} />
            <Route path="makeup" element={<MakeupPage />} />
            <Route path="hair-care" element={<HairCarePage />} />
            <Route path="fragrances" element={<FragrancesPage />} />
            <Route path="bath-body" element={<BathBodyPage />} />
            <Route path="nail-care" element={<NailCarePage />} />
            <Route path="mens-grooming" element={<MensGroomingPage />} />
            <Route path="health-wellness" element={<HealthWellnessPage />} />
            <Route path="beauty-tools" element={<BeautyToolsPage />} />
            <Route path="personal-hygiene" element={<PersonalHygienePage />} />
            
            <Route path="home-living" element={<HomeAndLivingPage />} />
            <Route path="furniture" element={<FurniturePage />} />
            <Route path="home-decor" element={<HomeDecorPage />} />
            <Route path="kitchenware" element={<KitchenwarePage />} />
            <Route path="bedding" element={<BeddingPage />} />
            <Route path="bath-essentials" element={<BathEssentialsPage />} />
            <Route path="lighting" element={<LightingPage />} />
            <Route path="storage-organization" element={<StorageOrganizationPage />} />
            <Route path="cleaning-supplies" element={<CleaningSuppliesPage />} />
            <Route path="garden-outdoor" element={<GardenOutdoorPage />} />
            <Route path="carpets-rugs" element={<CarpetsRugsPage />} />
            <Route path="curtains-blinds" element={<CurtainsBlindsPage />} />
            <Route path="diy-tools" element={<DIYToolsPage />} />
            <Route path="paint-hardware" element={<PaintHardwarePage />} />
            <Route path="electrical-appliances" element={<ElectricalAppliancesPage />} />
            <Route path="small-home-appliances" element={<SmallHomeAppliancesPage />} />
            
            <Route path="tools" element={<ToolsPage />} />
            <Route path="power-tools" element={<PowerToolsPage />} />
            
            <Route path="groceries-essentials" element={<GroceriesPage />} />
            <Route path="fresh-food" element={<FreshFoodPage />} />
            <Route path="packaged-food" element={<PackagedFoodPage />} />
            <Route path="beverages" element={<BeveragesPage />} />
            <Route path="snacks" element={<SnacksPage />} />
            <Route path="cooking-essentials" element={<CookingEssentialsPage />} />
            <Route path="baby-food" element={<BabyFoodPage />} />
            <Route path="dairy-products" element={<DairyProductsPage />} />
            <Route path="pet-food" element={<PetFoodPage />} />
            <Route path="cleaning-household" element={<CleaningHouseholdPage />} />
            <Route path="personal-care-essentials" element={<PersonalCareEssentialsPage />} />
            
            <Route path="sports-outdoors" element={<SportsAndOutdoorsPage />} />
            <Route path="art-collectibles" element={<ArtCollectiblesPage />} />
            <Route path="paintings" element={<PaintingsPage />} />
            <Route path="digital-products" element={<DigitalProductsPage />} />
            <Route path="jewelry" element={<JewelryPage />} />
            <Route path="rings" element={<RingsPage />} />
            <Route path="eyewear" element={<EyewearPage />} />
            <Route path="watches" element={<WatchesPage />} />
            <Route path="smart-watches" element={<SmartWatchesPage />} />
            <Route path="lookbook" element={<LookbookPage />} />
            <Route path="style-guides" element={<StyleGuidesPage />} />
            <Route path="games" element={<GamesHubPage />} />
            <Route path="print-on-demand" element={<PrintOnDemandPage />} />
            <Route path="seller/listings" element={<Navigate to="/profile/products" replace />} />

            {/* Protected User Routes */}
            <Route path="profile" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="orders" element={<MyOrdersPage />} />
                    <Route path="orders/:bookingId" element={<OrderDetailsPage />} />
                    <Route path="bids" element={<MyBidsPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="messages/:threadId" element={<MessagesPage />} />
                    <Route path="workflows" element={<WorkflowHubPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="reviews" element={<MyReviewsPage />} />
                    <Route path="coupons" element={<CouponsPage />} />
                    <Route path="followed-stores" element={<FollowedStoresPage />} />
                    <Route path="history" element={<BrowsingHistoryPage />} />
                    <Route path="activity" element={<ActivityPage />} />
                    <Route path="notifications" element={<ProfileNotificationsPage />} />
                    <Route path="edit" element={<Navigate to="/profile/settings" replace />} />
                    <Route path="settings" element={<SettingsPage />}>
                        <Route index element={<ProfileHubPage />} />
                        <Route path="edit" element={<Navigate to="/profile/settings" replace />} />
                        <Route path="legacy-edit" element={<EditProfilePage />} />
                        <Route path="addresses" element={<AddressesPage />} />
                        <Route path="trust-and-verification" element={<TrustAndVerificationPage />} />
                        <Route path="privacy" element={<PrivacySettingsPage />} />
                        <Route path="notifications" element={<NotificationsSettingsPage />} />
                    </Route>
                    <Route path="addresses" element={<Navigate to="/profile/settings/addresses" replace />} />
                    <Route path="notifications-settings" element={<Navigate to="/profile/settings/notifications" replace />} />
                    <Route path="payment-options" element={<Navigate to="/payment-options" replace />} />
                    <Route path="analytics" element={<ProfileAnalyticsRedirectPage />} />
                    <Route path="analytics/traffic" element={<Navigate to="/profile/analytics/seller/traffic" replace />} />
                    <Route path="analytics/revenue" element={<Navigate to="/profile/analytics/seller/revenue" replace />} />
                    <Route path="analytics/conversion" element={<Navigate to="/profile/analytics/seller/conversion" replace />} />
                    <Route path="analytics/sales-units" element={<Navigate to="/profile/analytics/seller/sales-units" replace />} />
                      <Route path="wallet" element={<WalletPage />} />
                      <Route path="permissions" element={<PermissionsPage />} />
                      <Route path="switch-accounts" element={<SwitchAccountsPage />} />
                      <Route path="switch-google-account" element={<SwitchGoogleAccountPage />} />
                      <Route path="provider/onboarding" element={<ProviderOnboardingPage />} />
                    <Route path="provider/status" element={<ProviderOnboardingPage />} />
                    <Route path="provider-dashboard" element={<Navigate to="/profile/provider" replace />} />
                    <Route path="services/new" element={<Navigate to="/profile/provider/services/new" replace />} />
                    <Route path="become-a-provider" element={<Navigate to="/profile/provider/onboarding" replace />} />

                    <Route element={<PersonaRoute requiredCapabilities={['buy', 'rent']} requiredPersonaTypes={['consumer']} mode="any" />}>
                        <Route path="analytics/consumer" element={<Navigate to="/profile/analytics/consumer/overview" replace />} />
                        <Route path="analytics/consumer/:pageId" element={<PersonaAnalyticsPage scopeType="consumer" />} />
                        <Route path="analytics/consumer/:pageId/card/:widgetId" element={<PersonaAnalyticsWidgetPage scopeType="consumer" />} />
                    </Route>

                    <Route element={<PersonaRoute requiredCapabilities={['sell']} requiredPersonaTypes={['seller']} mode="all" />}>
                        <Route path="store" element={<MyStorePage />} />
                    <Route path="products" element={<MyListingsPage />} />
                    <Route path="products/new" element={<ListItemPage />} />
                    <Route path="products/new-digital" element={<DigitalListItemPage />} />
                    <Route path="game-studio" element={<GameStudioPage />} />
                    <Route path="pod-studio" element={<PODStudioDashboardPage />} />
                    <Route path="pod-studio/catalog" element={<PODCatalogPage />} />
                    <Route path="pod-studio/designs" element={<PODDesignLibraryPage />} />
                    <Route path="pod-studio/products" element={<PODProductsPage />} />
                    <Route path="pod-studio/orders" element={<PODOrdersPage />} />
                    <Route path="pod-studio/new" element={<PODProductEditorPage />} />
                    <Route path="sales" element={<SalesManagementPage />} />
                        <Route path="owner-controls" element={<OwnerControlsPage />} />
                        <Route path="offers" element={<OffersPage />} />
                        <Route path="promotions" element={<PromotionsManagerPage />} />
                        <Route path="earnings" element={<EarningsPage />} />
                        <Route path="analytics/seller" element={<Navigate to="/profile/analytics/seller/overview" replace />} />
                        <Route path="analytics/seller/:pageId" element={<PersonaAnalyticsPage scopeType="seller" />} />
                        <Route path="analytics/seller/:pageId/card/:widgetId" element={<PersonaAnalyticsWidgetPage scopeType="seller" />} />
                    </Route>

                    <Route element={<PersonaRoute requiredCapabilities={['provide_service']} requiredPersonaTypes={['provider']} mode="all" />}>
                        <Route path="provider" element={<ProviderWorkspaceLayout />}>
                            <Route index element={<ProviderWorkspaceOverviewPage />} />
                            <Route path="hub-profile" element={<ProviderHubProfilePage />} />
                            <Route path="services" element={<ProviderServicesPage />} />
                            <Route path="services/new" element={<ProviderServiceEditorPage />} />
                            <Route path="services/:serviceId/edit" element={<ProviderServiceEditorPage />} />
                            <Route path="leads" element={<ProviderLeadsPage />} />
                            <Route path="proposals" element={<ProviderProposalsPage />} />
                            <Route path="jobs" element={<ProviderJobsPage />} />
                            <Route path="calendar" element={<ProviderCalendarPage />} />
                            <Route path="earnings" element={<ProviderEarningsPage />} />
                            <Route path="payouts" element={<ProviderPayoutsPage />} />
                            <Route path="reviews" element={<ProviderReviewsPage />} />
                            <Route path="settings" element={<ProviderSettingsPage />} />
                        </Route>
                        <Route path="analytics/provider" element={<Navigate to="/profile/analytics/provider/overview" replace />} />
                        <Route path="analytics/provider/:pageId" element={<PersonaAnalyticsPage scopeType="provider" />} />
                        <Route path="analytics/provider/:pageId/card/:widgetId" element={<PersonaAnalyticsWidgetPage scopeType="provider" />} />
                    </Route>

                    <Route element={<PersonaRoute requiredCapabilities={['affiliate']} requiredPersonaTypes={['affiliate']} mode="all" />}>
                        <Route path="affiliate" element={<AffiliateProgramPage />} />
                        <Route path="analytics/affiliate" element={<Navigate to="/profile/analytics/affiliate/overview" replace />} />
                        <Route path="analytics/affiliate/:pageId" element={<PersonaAnalyticsPage scopeType="affiliate" />} />
                        <Route path="analytics/affiliate/:pageId/card/:widgetId" element={<PersonaAnalyticsWidgetPage scopeType="affiliate" />} />
                    </Route>

                    <Route element={<PersonaRoute requiredCapabilities={['ship']} requiredPersonaTypes={['shipper']} mode="all" />}>
                        <Route path="shipper" element={<Navigate to="/profile/shipper-dashboard" replace />} />
                        <Route path="shipper-dashboard" element={<ShipperDashboardPage />} />
                        <Route path="shipper/queue" element={<ShipperDeliveryQueuePage />} />
                        <Route path="analytics/shipper" element={<Navigate to="/profile/analytics/shipper/overview" replace />} />
                        <Route path="analytics/shipper/:pageId" element={<PersonaAnalyticsPage scopeType="shipper" />} />
                        <Route path="analytics/shipper/:pageId/card/:widgetId" element={<PersonaAnalyticsWidgetPage scopeType="shipper" />} />
                    </Route>

                    <Route element={<PersonaRoute requiredCapabilities={['sell', 'provide_service']} requiredPersonaTypes={['seller', 'provider']} mode="any" />}>
                        <Route path="creator-hub" element={<CreatorHubPage />} />
                    </Route>

                    <Route path="collections" element={<MyCollectionsPage />} />
                    <Route path="go-live" element={<CreateLiveStreamPage />} />
                <Route path="add-post" element={<CreatePostPage />} />
                <Route path="spotlight/create" element={<Navigate to="/spotlight/create" replace />} />
                <Route path="track-delivery/:bookingId" element={<TrackDeliveryPage />} />
                    <Route path="disputes" element={<DisputeCenterPage />} />
                    <Route path="digital-library" element={<DigitalLibraryPage />} />
                    <Route path="analytics/advanced" element={<Navigate to="/profile/analytics/seller/intelligence" replace />} />
                </Route>
            </Route>

            <Route path="activity" element={<ProtectedRoute />}>
                <Route index element={<Navigate to="/profile/activity" replace />} />
            </Route>

            <Route path="switch-accounts" element={<ProtectedRoute />}>
                <Route index element={<Navigate to="/profile/switch-accounts" replace />} />
            </Route>

            <Route path="cart" element={<ProtectedRoute />}>
                <Route index element={<CartPage />} />
            </Route>

            <Route path="checkout" element={<ProtectedRoute />}>
                <Route element={<PersonaRoute requiredCapabilities={['buy', 'rent']} mode="any" />}>
                    <Route index element={<CheckoutPage />} />
                </Route>
            </Route>

            <Route path="order-confirmation" element={<ProtectedRoute />}>
                <Route index element={<OrderConfirmationPage />} />
            </Route>

            <Route path="spotlight/create" element={<ProtectedRoute />}>
                <Route index element={<SpotlightRouteFrame><CreateSpotlightPage /></SpotlightRouteFrame>} />
            </Route>

            <Route path="create-store" element={<ProtectedRoute />}>
                <Route element={<PersonaRoute requiredCapabilities={['sell']} requiredPersonaTypes={['seller']} mode="all" />}>
                    <Route index element={<CreateStorePage />} />
                </Route>
            </Route>

            <Route path="store/edit" element={<ProtectedRoute />}>
                <Route element={<PersonaRoute requiredCapabilities={['sell']} requiredPersonaTypes={['seller']} mode="all" />}>
                    <Route index element={<StoreEditorPage />} />
                </Route>
            </Route>

            <Route path="store/manager" element={<ProtectedRoute />}>
                <Route element={<PersonaRoute requiredCapabilities={['sell']} requiredPersonaTypes={['seller']} mode="all" />}>
                    <Route path="analytics" element={<Navigate to="/profile/analytics/seller/overview" replace />} />
                    <Route path="analytics/traffic" element={<Navigate to="/profile/analytics/seller/traffic" replace />} />
                    <Route path="analytics/revenue" element={<Navigate to="/profile/analytics/seller/revenue" replace />} />
                    <Route path="analytics/sales-units" element={<Navigate to="/profile/analytics/seller/sales-units" replace />} />
                    <Route path="analytics/conversion" element={<Navigate to="/profile/analytics/seller/conversion" replace />} />
                </Route>
            </Route>

             <Route path="upload-game" element={<ProtectedRoute />}>
                <Route index element={<UploadGamePage />} />
            </Route>

            <Route path="payment-options" element={<ProtectedRoute />}>
                <Route index element={<PaymentOptionsPage />} />
            </Route>

            <Route path="packages" element={<ProtectedRoute />}>
                 <Route index element={<PackagesPage />} />
            </Route>

             <Route path="help" element={<ProtectedRoute />}>
                <Route index element={<HelpPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <AutoDraftPersistence />
    </ContextualThemeWrapper>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <LanguageProvider>
          <AuthProvider>
            <ThemeProvider>
              <CategoryProvider>
                <ComparisonProvider>
                  <UserDataProvider>
                    <CartProvider>
                      <UploadProvider>
                        <AnimationProvider>
                          <OmniProvider>
                            <HeroStyleProvider>
                              <ErrorBoundary>
                                <AppContent />
                              </ErrorBoundary>
                            </HeroStyleProvider>
                          </OmniProvider>
                        </AnimationProvider>
                      </UploadProvider>
                    </CartProvider>
                  </UserDataProvider>
                </ComparisonProvider>
              </CategoryProvider>
            </ThemeProvider>
          </AuthProvider>
        </LanguageProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;


