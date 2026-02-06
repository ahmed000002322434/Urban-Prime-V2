
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
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

import Layout from './components/Layout';
import Spinner from './components/Spinner';
import { useAuth } from './hooks/useAuth';
import OnboardingModal from './components/OnboardingModal';
import WelcomeScreen from './components/WelcomeScreen';
import StarryBackground from './components/StarryBackground';
import ContextualThemeWrapper from './components/ContextualThemeWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));

// Public Pages
const StoreFront = lazy(() => import('./pages/public/StoreFront'));
const HomePage = lazy(() => import('./pages/public/HomePage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const TermsOfUsePage = lazy(() => import('./pages/public/TermsOfUsePage'));
const ShippingPolicyPage = lazy(() => import('./pages/public/ShippingPolicyPage'));
const ReturnPolicyPage = lazy(() => import('./pages/public/ReturnPolicyPage'));
const PressPage = lazy(() => import('./pages/public/PressPage'));
const CareersPage = lazy(() => import('./pages/public/CareersPage'));
const TrustAndSafetyPage = lazy(() => import('./pages/public/TrustAndSafetyPage'));
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
const SellerDirectoryPage = lazy(() => import('./pages/public/SellerDirectoryPage'));
const BrowsePage = lazy(() => import('./pages/public/BrowsePage'));
const BrowseServicesPage = lazy(() => import('./pages/public/BrowseServicesPage'));
const ItemDetailPage = lazy(() => import('./pages/public/ItemDetailPage'));
const ServiceDetailPage = lazy(() => import('./pages/public/ServiceDetailPage'));
const ReelsPage = lazy(() => import('./pages/public/ReelsPage'));
const LiveShoppingPage = lazy(() => import('./pages/public/LiveShoppingPage'));
const PixePage = lazy(() => import('./pages/public/PixePage'));
const ProductBattlePage = lazy(() => import('./pages/public/ProductBattlePage'));
const MysteryBoxPage = lazy(() => import('./pages/public/MysteryBoxPage'));
const FeaturesHubPage = lazy(() => import('./pages/public/FeaturesHubPage'));
const PrimePassPage = lazy(() => import('./pages/public/PrimePassPage'));
const GemstoneShowcasePage = lazy(() => import('./pages/public/GemstoneShowcasePage'));
const AuditPage = lazy(() => import('./pages/public/AuditPage'));
const DropshippingPage = lazy(() => import('./pages/public/DropshippingPage'));
const LanguageSelectionPage = lazy(() => import('./pages/public/LanguageSelectionPage'));
const ComparePage = lazy(() => import('./pages/public/ComparePage'));
const NewArrivalsPage = lazy(() => import('./pages/public/NewArrivalsPage'));
const DealsPage = lazy(() => import('./pages/public/DealsPage'));
const TrackOrderPage = lazy(() => import('./pages/public/TrackOrderPage'));
const BlogsPage = lazy(() => import('./pages/public/BlogsPage'));
const UserCollectionsPage = lazy(() => import('./pages/public/UserCollectionsPage'));
const PublicWishlistPage = lazy(() => import('./pages/public/PublicWishlistPage'));
const PublicProfilePage = lazy(() => import('./pages/public/PublicProfilePage'));
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

// Protected Pages
const DashboardOverview = lazy(() => import('./pages/protected/DashboardOverview'));
const MyOrdersPage = lazy(() => import('./pages/protected/MyOrdersPage'));
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
const PrivacySettingsPage = lazy(() => import('./pages/protected/PrivacySettingsPage'));
const SwitchAccountsPage = lazy(() => import('./pages/protected/SwitchAccountsPage'));
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
const PixeStudio = lazy(() => import('./pages/protected/PixeStudio'));
const CreateLiveStreamPage = lazy(() => import('./pages/protected/CreateLiveStreamPage'));
const CreatePostPage = lazy(() => import('./pages/protected/CreatePostPage'));
const WalletPage = lazy(() => import('./pages/protected/WalletPage'));
const EarningsPage = lazy(() => import('./pages/protected/EarningsPage'));
const PackagesPage = lazy(() => import('./pages/protected/PackagesPage'));
const AdvancedAnalyticsPage = lazy(() => import('./pages/protected/AdvancedAnalyticsPage'));
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

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminListingsPage = lazy(() => import('./pages/admin/AdminListingsPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayoutsPage'));
const AdminCustomerQueriesPage = lazy(() => import('./pages/admin/AdminCustomerQueriesPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'));

const AppContent: React.FC = () => {
  const { showOnboarding } = useAuth();
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);

  useEffect(() => {
      const timer = setTimeout(() => setShowWelcomeScreen(false), 5000);
      return () => clearTimeout(timer);
  }, []);

  return (
    <ContextualThemeWrapper>
      <StarryBackground />
      {showWelcomeScreen && <WelcomeScreen />}
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-white dark:bg-dark-background"><Spinner size="lg" /></div>}>
        <Routes>
          {/* Standalone Store Pages */}
          <Route path="/s/:storeSlug" element={<StoreFront />} />
          <Route path="/store/preview" element={<StoreEditorPage />} />
          <Route path="/store/generating" element={<StoreGeneratingPage />} />

          {/* Auth Routes */}
          <Route path="/auth" element={<LoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="listings" element={<AdminListingsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="payouts" element={<AdminPayoutsPage />} />
              <Route path="queries" element={<AdminCustomerQueriesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* Main Layout Routes */}
          <Route path="/" element={<Layout />}>
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
            <Route path="purchase-protection" element={<PurchaseProtectionPage />} />
            <Route path="chat-with-us" element={<ChatPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="guides" element={<GuidesPage />} />
            <Route path="perks" element={<PerksPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="gift-cards" element={<GiftCardsPage />} />
            <Route path="affiliate-program" element={<AffiliateLandingPage />} />
            <Route path="seller-resource-center" element={<SellerResourceCenterPage />} />
            <Route path="stores" element={<StoresDirectoryPage />} />
            <Route path="sellers" element={<SellerDirectoryPage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="browse/services" element={<BrowseServicesPage />} />
            <Route path="item/:id" element={<ItemDetailPage />} />
            <Route path="service/:id" element={<ServiceDetailPage />} />
            <Route path="user/:id" element={<PublicProfilePage />} />
            <Route path="wishlist/:id" element={<PublicWishlistPage />} />
            <Route path="collections/:userId" element={<UserCollectionsPage />} />
            <Route path="reels" element={<ReelsPage />} />
            <Route path="live" element={<LiveShoppingPage />} />
            <Route path="pixe" element={<PixePage />} />
            <Route path="battles" element={<ProductBattlePage />} />
            <Route path="mystery-box" element={<MysteryBoxPage />} />
            <Route path="features" element={<FeaturesHubPage />} />
            <Route path="prime-pass" element={<PrimePassPage />} />
            <Route path="luxury" element={<GemstoneShowcasePage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="dropshipping" element={<DropshippingPage />} />
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

            {/* Protected User Routes */}
            <Route path="profile" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="orders" element={<MyOrdersPage />} />
                    <Route path="orders/:bookingId" element={<OrderDetailsPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="messages/:threadId" element={<MessagesPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="reviews" element={<MyReviewsPage />} />
                    <Route path="coupons" element={<CouponsPage />} />
                    <Route path="followed-stores" element={<FollowedStoresPage />} />
                    <Route path="history" element={<BrowsingHistoryPage />} />
                    <Route path="settings" element={<SettingsPage />}>
                        <Route index element={<EditProfilePage />} />
                        <Route path="addresses" element={<AddressesPage />} />
                        <Route path="trust-and-verification" element={<TrustAndVerificationPage />} />
                        <Route path="privacy" element={<PrivacySettingsPage />} />
                        <Route path="notifications" element={<NotificationsSettingsPage />} />
                    </Route>
                    <Route path="wallet" element={<WalletPage />} />
                    <Route path="permissions" element={<PermissionsPage />} />
                    <Route path="switch-accounts" element={<SwitchAccountsPage />} />
                    <Route path="store" element={<MyStorePage />} />
                    <Route path="products" element={<MyListingsPage />} />
                    <Route path="products/new" element={<ListItemPage />} />
                    <Route path="products/new-digital" element={<DigitalListItemPage />} />
                    <Route path="collections" element={<MyCollectionsPage />} />
                    <Route path="sales" element={<SalesManagementPage />} />
                    <Route path="offers" element={<OffersPage />} />
                    <Route path="creator-hub" element={<CreatorHubPage />} />
                    <Route path="affiliate" element={<AffiliateProgramPage />} />
                    <Route path="promotions" element={<PromotionsManagerPage />} />
                    <Route path="provider-dashboard" element={<ProviderDashboardPage />} />
                    <Route path="services/new" element={<ListServicePage />} />
                    <Route path="become-a-provider" element={<BecomeProviderPage />} />
                    <Route path="go-live" element={<CreateLiveStreamPage />} />
                    <Route path="add-post" element={<CreatePostPage />} />
                    <Route path="earnings" element={<EarningsPage />} />
                    <Route path="track-delivery/:bookingId" element={<TrackDeliveryPage />} />
                    <Route path="disputes" element={<DisputeCenterPage />} />
                    <Route path="analytics/advanced" element={<AdvancedAnalyticsPage />} />
                </Route>
            </Route>

            <Route path="/cart" element={<ProtectedRoute />}>
                <Route index element={<CartPage />} />
            </Route>
            
            <Route path="/checkout" element={<ProtectedRoute />}>
                 <Route index element={<CheckoutPage />} />
            </Route>

            <Route path="/order-confirmation" element={<ProtectedRoute />}>
                <Route index element={<OrderConfirmationPage />} />
            </Route>

            <Route path="/pixe-studio" element={<ProtectedRoute />}>
                <Route index element={<PixeStudio />} />
            </Route>
            
            <Route path="/create-store" element={<ProtectedRoute />}>
                <Route index element={<CreateStorePage />} />
            </Route>

            <Route path="/store/edit" element={<ProtectedRoute />}>
                 <Route index element={<StoreEditorPage />} />
            </Route>

             <Route path="/upload-game" element={<ProtectedRoute />}>
                <Route index element={<UploadGamePage />} />
            </Route>
            
            <Route path="/payment-options" element={<ProtectedRoute />}>
                <Route index element={<PaymentOptionsPage />} />
            </Route>
            
            <Route path="/packages" element={<ProtectedRoute />}>
                 <Route index element={<PackagesPage />} />
            </Route>

             <Route path="/help" element={<ProtectedRoute />}>
                <Route index element={<HelpPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      {showOnboarding && <OnboardingModal />}
    </ContextualThemeWrapper>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
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
                            <ErrorBoundary>
                              <AppContent />
                            </ErrorBoundary>
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
    </HashRouter>
  );
};

export default App;
