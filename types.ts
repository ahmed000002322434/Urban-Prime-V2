
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  accountLifecycle?: AccountLifecycle;
  activePersonaId?: string;
  capabilities?: PersonaCapabilities;
  isAdmin?: boolean;
  isServiceProvider?: boolean;
  isAffiliate?: boolean;
  affiliateOnboardingCompleted?: boolean;
  following: string[]; // User IDs
  followers: string[]; // User IDs
  wishlist: string[]; // Item IDs
  cart: string[]; // Item IDs
  themePreference?: Theme;
  purpose?: 'rent' | 'list' | 'both';
  interests?: string[];
  country?: string;
  currencyPreference?: string;
  city?: string;
  verificationLevel?: VerificationLevel;
  verificationDocs?: any[];
  status?: 'active' | 'suspended';
  providerProfile?: ServiceProviderProfile;
  affiliateProfile?: AffiliateProfile;
  walletBalance?: number; // Available Balance
  processingBalance?: number; // Funds in payout request
  heldDeposits?: number; // Funds held in escrow (Security Deposits)
  rewardPoints?: number;
  dailyStreak?: number;
  about?: string;
  businessName?: string;
  businessDescription?: string;
  memberSince: string;
  yearsInBusiness?: number;
  affiliateTier?: 'bronze' | 'silver' | 'gold';
  addresses?: Address[];
  dob?: string;
  gender?: string;
  phone?: string;
  badges: string[]; // Badge IDs
  likedReels?: string[];
  dailyUsage?: { date: string; videos: number; images: number };
  rating?: number; // Added rating to fix usage in directories
  chatSettings?: ChatSettings;
}


export type AccountLifecycle = 'guest' | 'member' | 'restricted';
export type PersonaType = 'consumer' | 'seller' | 'provider' | 'affiliate';
export type PersonaStatus = 'active' | 'pending' | 'suspended' | 'archived';
export type Capability = 'buy' | 'rent' | 'sell' | 'provide_service' | 'affiliate' | 'admin';
export type CapabilityState = 'inactive' | 'pending' | 'active' | 'suspended';

export type PersonaCapabilities = Record<Capability, CapabilityState>;

export interface AccountPersona {
  id: string;
  userId: string;
  type: PersonaType;
  status: PersonaStatus;
  displayName: string;
  avatar?: string;
  handle?: string;
  bio?: string;
  settings?: Record<string, any>;
  verification?: Record<string, any>;
  capabilities: PersonaCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSessionContext {
  userId: string;
  activePersonaId: string;
  activePersonaType: PersonaType;
}

export interface PersonaLedgerEntry {
  id: string;
  userId: string;
  personaId: string;
  direction: 'credit' | 'debit';
  amount: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
}

export interface OwnerActivitySummary {
  totalEvents: number;
  views: number;
  cartAdds: number;
  purchases: number;
  rentals: number;
  auctionWins: number;
}

export interface UploadAsset {
  id: string;
  ownerUserId: string;
  ownerPersonaId?: string;
  assetType: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl?: string;
  resourceId?: string;
  status: 'active' | 'deleted';
  createdAt: string;
  updatedAt?: string;
}

export interface ProfileUpdatePayload {
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  city?: string;
  country?: string;
  about?: string;
  businessName?: string;
  businessDescription?: string;
  themePreference?: Theme;
}

export interface DataModeConfig {
  mode: 'supabase' | 'firebase' | 'hybrid';
  requireBackend: boolean;
  enableFirestoreFallback: boolean;
  enableLocalMockFallback: boolean;
}

export type OnboardingIntent = 'buy' | 'rent' | 'sell' | 'provide' | 'affiliate';
export type OnboardingStepId = 'intent' | 'identity' | 'preferences' | 'role_setup' | 'review' | 'completed';

export interface RoleSetupDraft {
  displayName?: string;
  handle?: string;
  businessName?: string;
  businessDescription?: string;
  website?: string;
  phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  experienceYears?: string;
  teamSize?: string;
  monthlyVolume?: string;
  about?: string;
  goals?: string;
  channelType?: string;
  sellerHandle?: string;
  providerHandle?: string;
  affiliateHandle?: string;
  handles?: Partial<Record<PersonaType, string>>;
}

export interface OnboardingDraft {
  intent?: {
    selectedIntents?: OnboardingIntent[];
  };
  identity?: {
    name?: string;
    phone?: string;
    country?: string;
    city?: string;
    currencyPreference?: string;
    avatarUrl?: string;
  };
  preferences?: {
    interests?: string[];
  };
  roleSetup?: RoleSetupDraft;
  review?: {
    acceptedTerms?: boolean;
  };
}

export interface OnboardingValidationError {
  field: string;
  step: OnboardingStepId;
  message: string;
}

export interface ProfileCompletion {
  isComplete: boolean;
  missingRequiredFields: string[];
  nextStep: OnboardingStepId;
}

export interface FeatureFlags {
  profileOnboardingV2: boolean;
  chatReliabilityV2?: boolean;
}

export interface UserOnboardingState {
  userId: string;
  currentStep: OnboardingStepId;
  flowVersion: number;
  selectedIntents: OnboardingIntent[];
  draft: OnboardingDraft;
  startedAt: string;
  updatedAt: string;
}

export interface UnifiedProfile {
  user: User;
  profile: Record<string, any>;
  personas: AccountPersona[];
  activePersona: AccountPersona | null;
  completion: ProfileCompletion;
  featureFlags: FeatureFlags;
  onboardingState?: UserOnboardingState | null;
}

// Added ThemePreference to fix context error
export type ThemePreference = Theme;

export type Theme = 'light' | 'navy' | 'earth' | 'emerald' | 'obsidian' | 'sandstone' | 'icy' | 'hydra' | 'parchment' | 'grassy' | 'system';

export type VerificationLevel = 'none' | 'level1' | 'level2';

export type StoreSectionType = 'Hero' | 'FeaturedCollection' | 'AnnouncementBar' | 'AboutUs' | 'Newsletter' | 'BrandingBar';

export interface StoreSection {
  id: string;
  type: StoreSectionType;
  isVisible: boolean;
  props: any;
}

export interface Store {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  tagline: string;
  logo: string;
  category: string;
  city: string;
  products: string[]; // Item IDs
  pixes: string[]; // Reel IDs
  reviews: string[]; // Review IDs
  followers: string[]; // User IDs
  badges: string[];
  brandingKit: BrandingKit;
  layout: string;
  banner: { text: string };
  pages: AIStorePage[];
  sections: StoreSection[]; // New builder sections
  questionnaireAnswers: any[];
  socialLinks?: { instagram: string; twitter: string; website: string };
  policies?: { shipping: string; returns: string };
  storeBannerUrl?: string;
  isVacationMode?: boolean;
  shippingSettings?: ShippingSettings;
  createdAt: string;
}

export interface BrandingKit {
    logoUrl?: string;
    logoDescription?: string;
    palette: { primary: string; secondary: string; accent: string };
    fontPairing: { heading: string; body: string };
    fontSize?: string;
    cornerRadius?: string;
}

export interface AIStorePage {
    slug: string;
    title: string;
    content: PageComponent[];
}

export interface PageComponent {
    component: string;
    props: any;
}

// Fixed missing HeroComponent and other component types used in StorefrontRenderer.tsx
export interface HeroComponent extends PageComponent {
    component: 'Hero';
    props: {
        title: string;
        subtitle: string;
        ctaText?: string;
        ctaLink?: string;
        imageUrl?: string;
    };
}

export interface FeatureListComponent extends PageComponent {
    component: 'FeatureList';
    props: {
        title: string;
        features: Array<{ icon: 'check' | 'star' | 'zap'; title: string; description: string }>;
    };
}

export interface ImageWithTextComponent extends PageComponent {
    component: 'ImageWithText';
    props: {
        title: string;
        text: string;
        imageUrl: string;
        imagePosition: 'left' | 'right';
    };
}

export interface TestimonialsComponent extends PageComponent {
    component: 'Testimonials';
    props: {
        title: string;
        testimonials: Array<{ quote: string; author: string }>;
    };
}

export interface CallToActionComponent extends PageComponent {
    component: 'CallToAction';
    props: {
        title: string;
        text: string;
        ctaText: string;
        ctaLink?: string;
    };
}

export interface ItemListComponent extends PageComponent {
    component: 'ItemList';
    props: {
        title: string;
    };
}

export interface GalleryComponent extends PageComponent {
    component: 'Gallery';
    props: {
        title: string;
        images: Array<{ imageUrl: string; caption: string }>;
    };
}

export interface StatsComponent extends PageComponent {
    component: 'Stats';
    props: {
        stats: Array<{ value: string; label: string }>;
    };
}

export interface ProcessComponent extends PageComponent {
    component: 'Process';
    props: {
        title: string;
        steps: Array<{ icon: 'list' | 'book' | 'earn'; title: string; description: string }>;
    };
}

export interface StoreCreationData {
    questionnaireAnswers: { question: string; answer: string }[];
    logoUrl?: string;
    category?: string;
    city?: string;
    socialLinks?: { instagram: string; twitter: string; website: string };
    policies?: { shipping: string; returns: string };
}

export interface CartItem extends Item {
    quantity: number;
    subscription?: SubscriptionDetails;
    rentalPeriod?: {
        startDate: string;
        endDate: string;
    };
}

export interface CartGroup {
    id: string;
    name: string;
    items: CartItem[];
}

export interface SubscriptionDetails {
    frequency: 'monthly' | 'yearly';
}

export interface Booking {
    id: string;
    engagementId?: string;
    orderId?: string; // New field to link back to main order
    itemId: string;
    itemTitle: string;
    renterId: string;
    renterName: string;
    provider: { id: string };
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'completed' | 'cancelled';
    shippingAddress?: any;
    trackingNumber?: string;
    paymentStatus?: 'escrow' | 'released' | 'refunded';
    type?: 'rent' | 'sale';
    mode?: WorkMode;
    fulfillmentKind?: WorkFulfillmentKind;
    currency?: string;
    timezone?: string;
    riskScore?: number;
    securityDeposit?: number; // Amount held
    depositStatus?: 'held' | 'released' | 'claimed';
    claimDetails?: {
        amount: number;
        reason: string;
        proofImage: string;
    }
    renterPersonaId?: string;
    providerPersonaId?: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number; 
  salePrice?: number;
  rentalPrice?: number; 
  compareAtPrice?: number;
  rentalPriceType?: 'daily' | 'weekly' | 'monthly';
  listingType: 'sale' | 'rent' | 'both' | 'auction';
  rentalRates?: {
    hourly?: number;
    daily?: number;
    weekly?: number;
  };
  minRentalDuration?: number; 
  securityDeposit?: number;
  images: string[]; 
  imageUrls: string[];
  owner: { id: string; name: string; avatar: string; businessName?: string };
  ownerPersonaId?: string;
  activityPreferences?: ListingActivityPreferences;
  avgRating: number;
  reviews: Review[];
  isFeatured?: boolean;
  isVerified?: boolean;
  stock: number;
  brand?: string;
  condition?: string;
  sku?: string;
  bookedDates?: string[];
  videoUrl?: string;
  dueDate?: string;
  shippingOptions?: any[];
  shippingDetails?: any;
  shippingWeightClass?: string;
  whoPaysShipping?: 'seller' | 'buyer';
  shippingEstimates?: ShippingEstimate[];
  returnPolicy?: ReturnPolicy;
  warranty?: WarrantyPolicy;
  marketplaceFees?: MarketplaceFees;
  fulfillmentType?: 'in_house' | 'dropship' | '3pl';
  originCountry?: string;
  originCity?: string;
  dimensionsIn?: { l: number; w: number; h: number };
  weightLbs?: number;
  packageContents?: string[];
  careInstructions?: string[];
  certifications?: string[];
  affiliateEligibility?: AffiliateEligibility;
  automation?: {
    autoReprice?: boolean;
    autoRestock?: boolean;
    autoPromote?: boolean;
    autoFulfill?: boolean;
    minMarginPercent?: number;
  };
  auctionDetails?: {
      startingBid: number;
      currentBid: number;
      endTime: string;
      bidCount: number;
      bids: any[];
  };
  buyNowPrice?: number;
  reservePrice?: number;
  features?: string[];
  specifications?: { key: string; value: string }[];
  isInstantBook?: boolean;
  materials?: { name: string }[];
  status?: 'published' | 'draft' | 'archived' | 'sold';
  boostLevel?: string;
  productType?: 'physical' | 'digital' | 'dropship';
  itemType?: 'physical' | 'digital';
  digitalFileUrl?: string;
  licenseType?: string;
  licenseDescription?: string;
  supplierInfo?: SupplierInfo;
  dropshipProfile?: DropshipProfile;
  dropshipVariants?: DropshipVariant[];
  wholesalePrice?: number;
  enable3dPreview?: boolean;
  battleWins?: number;
  battleAppearances?: number;
  createdAt: string;
  version?: string;
}


export interface ListingActivityPreferences {
  itemView: boolean;
  cartAdd: boolean;
  purchase: boolean;
  rent: boolean;
  auctionWin: boolean;
  instantAlert: boolean;
  dailyDigest: boolean;
}

export interface Category {
  id: string;
  name: string;
  subcategories?: Category[];
}

export interface Review {
  id: string;
  itemId: string;
  itemTitle?: string;
  itemImageUrl?: string;
  author: { id: string; name: string; avatar: string };
  rating: number;
  comment: string;
  date: string;
  imageUrls?: string[];
}

export interface Address {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface ShippingSettings {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    defaultHandlingTime: number;
    preferredCarriers: string[];
}

export interface ShippingEstimate {
    minDays: number;
    maxDays: number;
    carrier?: string;
    serviceLevel?: string;
    cost?: number;
    tracking?: boolean;
}

export interface ReturnPolicy {
    windowDays: number;
    conditions: string[];
    restockingFeePercent?: number;
    returnShippingPaidBy?: 'buyer' | 'seller' | 'platform';
}

export interface WarrantyPolicy {
    coverage: string;
    durationMonths?: number;
    provider?: 'seller' | 'manufacturer' | 'platform';
}

export interface ShippingProfile {
    regions?: string[];
    estimates?: ShippingEstimate[];
    fastestEstimate?: ShippingEstimate;
}

export interface ComplianceProfile {
    certifications?: string[];
    hsCode?: string;
    materials?: string[];
    safetyDocs?: string[];
}

export interface SupplierWarehouse {
    id: string;
    name?: string;
    city?: string;
    country?: string;
    handlingTimeDays?: number;
}

export interface BrandingOptions {
    allowsLogo?: boolean;
    allowsCustomPackaging?: boolean;
    allowsInserts?: boolean;
    notes?: string;
}

export interface CustomsInfo {
    hsCode?: string;
    countryOfOrigin?: string;
    customsValue?: number;
    dutiesPaidBy?: 'buyer' | 'seller' | 'platform';
}

export interface SupplierInfo {
    id: string;
    name: string;
    rating?: number;
    originCountry?: string;
    processingTimeDays?: number;
    contactEmail?: string;
    warehouses?: SupplierWarehouse[];
    shippingProfile?: ShippingProfile;
    returnPolicy?: ReturnPolicy;
    compliance?: ComplianceProfile;
    shippingCost?: number;
}

export interface DropshipVariant {
    id: string;
    supplierSku: string;
    attributes: Record<string, string>;
    cost: number;
    stock: number;
    weightLbs?: number;
    dimensionsIn?: { l: number; w: number; h: number };
    barcode?: string;
}

export interface DropshipProfile {
    supplierId?: string;
    supplierSku?: string;
    fulfillment?: 'auto' | 'manual';
    minOrderQuantity?: number;
    maxDailyCapacity?: number;
    brandingOptions?: BrandingOptions;
    handlingTimeDays?: number;
    estimatedDelivery?: ShippingEstimate;
    customsInfo?: CustomsInfo;
}

export interface MarketplaceFees {
    platformFeeRate?: number;
    paymentProcessingFeeRate?: number;
    flatFee?: number;
    currency?: string;
}

export interface FulfillmentEvent {
    status: string;
    timestamp: string;
    note?: string;
    location?: string;
}

export interface DropshipOrder {
    id: string;
    itemId: string;
    supplierId: string;
    buyerId?: string;
    sellerId?: string;
    status: 'pending' | 'accepted' | 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
    trackingNumber?: string;
    carrier?: string;
    events?: FulfillmentEvent[];
    costBreakdown?: {
        productCost: number;
        shippingCost: number;
        duties: number;
        total: number;
    };
    createdAt: string;
}

export interface WalletTransaction {
    id: string;
    userId: string;
    amount: number;
    type: 'credit' | 'debit' | 'fee' | 'payout' | 'sale'; 
    description: string;
    date: string;
    status?: 'pending' | 'completed';
}

// Added missing Transaction type (which is alias for WalletTransaction in some views)
export type Transaction = WalletTransaction;

export interface PayoutRequest {
    id: string;
    userId: string;
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    method: {
        type: 'bank_account' | 'paypal';
        details: string; 
    };
    createdAt: string;
}

export interface ChatSession {
    id: string;
    title: string;
    lastMessage: string;
    updatedAt: Date;
    messages: Message[];
}

export interface Message {
    id: string;
    sender: 'user' | 'genie' | 'ai';
    type: 'text' | 'image' | 'video' | 'listing-draft';
    content: any;
    timestamp: Date;
    sources?: any[];
}

export interface Question {
    id: string;
    itemId: string;
    author: { id: string; name: string };
    questionText: string;
    date: string;
    answer?: { text: string; date: string; helpfulVotes: number };
}

export interface AffiliateCoupon {
    id: string;
    userId: string;
    code: string;
    discountPercentage: number;
    uses: number;
    commissionRate: number;
}

export interface CreativeAsset {
    id: string;
    title: string;
    imageUrl: string;
    type: 'banner' | 'social';
    size?: string;
    ctaText?: string;
    destinationUrl?: string;
}

export interface Affiliate {
    userId: string;
    referralCode: string;
    clicks: number;
    signups: number;
    commissionRate: number;
    earnings: number;
    balance: number;
    status?: 'active' | 'paused' | 'suspended';
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    lifetimeEarnings?: number;
    pendingEarnings?: number;
    lastClickAt?: string;
    lastPayoutAt?: string;
    country?: string;
    taxFormStatus?: 'not_started' | 'submitted' | 'approved';
}

export interface AffiliateEarning {
    id: string;
    date: string;
    amount: number;
    type: string;
    status: 'pending' | 'approved' | 'paid';
    orderId?: string;
    itemId?: string;
    campaignId?: string;
    attributionId?: string;
}

export interface AffiliateLink {
    id: string;
    userId: string;
    originalUrl: string;
    shortCode: string;
    clicks: number;
    campaignId?: string;
    createdAt?: string;
}

export interface AffiliateEligibility {
    enabled: boolean;
    commissionRate?: number;
    programId?: string;
    cookieWindowDays?: number;
    approvedCreatorsOnly?: boolean;
}

export interface AffiliateProgramSettings {
    id: string;
    name: string;
    status?: 'active' | 'paused';
    cookieWindowDays?: number;
    attributionModel?: 'last_click' | 'first_click' | 'linear' | 'position_based';
    minPayout?: number;
    payoutSchedule?: 'weekly' | 'biweekly' | 'monthly';
    countries?: string[];
}

export interface AffiliateAttribution {
    id: string;
    affiliateId: string;
    clickId: string;
    campaignId?: string;
    itemId?: string;
    createdAt: string;
    expiresAt?: string;
    referrer?: string;
    utm?: Record<string, string>;
}

export interface AffiliateConversion {
    id: string;
    attributionId: string;
    orderId: string;
    amount: number;
    commissionRate: number;
    commissionAmount: number;
    status: 'pending' | 'approved' | 'reversed' | 'paid';
    createdAt: string;
}

export interface AffiliatePayout {
    id: string;
    affiliateId: string;
    amount: number;
    status: 'pending' | 'paid' | 'failed';
    method: string;
    periodStart: string;
    periodEnd: string;
    processedAt?: string;
}

export interface SellerPerformanceStats {
    earnings: { date: string; amount: number }[];
    categorySales: { category: string; value: number }[];
    pendingShipments: number;
    lowStockItems: Item[];
    unreadMessages: number;
    totalViews: number;
    conversionRate: number;
}

export interface BuyerDashboardSummary {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    activeRentals: number;
    upcomingReturns: number;
    totalPurchases: number;
    wishlistItems: number;
    unreadNotifications: number;
    conversations: number;
}

export interface BuyerDashboardOrder {
    id: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    itemCount: number;
    quantityTotal: number;
    rentalItems: number;
    saleItems: number;
}

export interface BuyerDashboardUpcomingReturn {
    orderId: string;
    orderItemId: string;
    itemId: string | null;
    itemTitle: string;
    rentalEnd: string;
    quantity: number;
}

export interface BuyerDashboardSnapshot {
    generatedAt: string;
    summary: BuyerDashboardSummary;
    recentOrders: BuyerDashboardOrder[];
    upcomingReturns: BuyerDashboardUpcomingReturn[];
}

export interface SellerDashboardSummary {
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    totalSalesUnits: number;
    totalViews: number;
    conversionRate: number;
    lowStockCount: number;
    unreadMessages: number;
}

export interface SellerDashboardEarningsPoint {
    month: string;
    earnings: number;
}

export interface SellerDashboardCategoryPoint {
    category: string;
    value: number;
}

export interface SellerDashboardRecentOrder {
    id: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    itemCount: number;
    quantityTotal: number;
}

export interface SellerLowStockItem {
    id: string;
    title: string;
    stock: number;
    status: string;
}

export interface SellerDashboardSetup {
    hasStore: boolean;
    hasProducts: boolean;
    hasContent: boolean;
    hasApps: boolean;
}

export interface SellerDashboardSnapshot {
    generatedAt: string;
    summary: SellerDashboardSummary;
    earningsByMonth: SellerDashboardEarningsPoint[];
    categorySales: SellerDashboardCategoryPoint[];
    recentOrders: SellerDashboardRecentOrder[];
    lowStockItems: SellerLowStockItem[];
    insights: GrowthInsight[];
    setup: SellerDashboardSetup;
}

export interface GrowthInsight {
    id: string;
    type: 'pricing' | 'inventory' | 'marketing';
    message: string;
    actionLabel?: string;
    actionLink?: string;
}

export interface ProjectShowcase {
    id: string;
    projectName: string;
    description: string;
    imageUrl: string;
    authorName: string;
    authorAvatar: string;
}

export interface GameUpload {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    coverImageUrl: string;
    fileSize: string;
    downloads: number;
    uploader: { id: string; name: string; avatar: string };
    fileUrl?: string;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    imageUrl: string;
}

export interface WishlistItem {
    id: string; 
    itemId: string;
    addedAt: string;
    isPublic: boolean;
    likes: string[]; // User IDs
    comments: WishlistItemComment[];
}

// Fixed missing WishlistItemComment
export interface WishlistItemComment {
    name: string;
    avatar: string;
    text: string;
}

export interface Notification {
    id: string;
    userId: string;
    type?: 'SALE' | 'INFO' | 'ORDER';
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export interface DiscountCode {
    id: string;
    userId: string;
    code: string;
    percentage: number;
    isActive: boolean;
    uses: number;
}

export interface ItemBundle {
    id: string;
    userId: string;
    name: string;
    itemTitles: string[];
}

export interface PayoutMethod {
    id: string;
    type: 'bank_account' | 'paypal' | 'crypto';
    bankName?: string;
    last4?: string;
    email?: string;
    isDefault?: boolean;
}

export interface SupplierProduct {
    id: string;
    title: string;
    description: string;
    wholesalePrice: number;
    imageUrls: string[];
    supplierName: string;
    category: string;
    shippingInfo: { cost: number; time: string };
    supplierId?: string;
    variants?: DropshipVariant[];
    processingTimeDays?: number;
    countryOfOrigin?: string;
    hsCode?: string;
    shippingEstimates?: ShippingEstimate[];
    returnPolicy?: ReturnPolicy;
    certifications?: string[];
}

export interface ItemCollection {
    id: string;
    userId: string;
    name: string;
    description: string;
    itemIds: string[];
    items?: Item[];
    isPublic: boolean;
    isShopTheLook: boolean;
    coverImageUrl?: string;
}

export interface Reel {
    id: string;
    creatorId: string;
    videoUrl: string;
    coverImageUrl: string;
    caption: string;
    likes: number;
    shares: number;
    views: number;
    comments: ReelComment[];
    taggedItemIds: string[];
    hashtags: string[];
    status: 'draft' | 'published';
    createdAt: string;
    showShopButton?: boolean;
    startTime?: number;
    endTime?: number;
    scheduledFor?: string;
    visibility?: 'public' | 'followers' | 'private';
    allowComments?: boolean;
}

export interface ReelComment {
    id: string;
    author: { id: string; name: string; avatar: string };
    text: string;
    timestamp: string;
}

export interface SiteSettings {
    siteBanner: { message: string; isActive: boolean };
}

export interface SupportQuery {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    userEmail: string;
    subject: string;
    message: string;
    createdAt: string;
    status: 'open' | 'closed';
    reply?: string;
    repliedAt?: string;
}

export interface AIFeature {
    id: string;
    description: string;
    pseudoCode: string;
}

export interface TrendAnalysis {
    trendingCategories: { category: string; reason: string }[];
    hotProducts: { name: string; reason: string; opportunityScore: number }[];
    hiddenGems: { name: string; reason: string }[];
}

export interface InspirationContent {
    id: string;
    type: 'image' | 'video';
    url: string;
    prompt: string;
    generatedBy: 'user' | 'system';
    likes: number;
}

export interface RentalHistoryItem {
    id: string;
    itemId: string;
    itemTitle: string;
    itemImageUrl: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: string;
    type: 'rent' | 'sale';
    itemType?: string;
    digitalFileUrl?: string;
}

export interface Offer {
    id: string;
    engagementId?: string;
    itemId: string;
    itemTitle: string;
    itemImageUrl: string;
    buyer: { id: string; name: string };
    seller: { id: string; name: string };
    offerPrice: number;
    status: 'pending' | 'accepted' | 'declined';
    mode?: WorkMode;
    fulfillmentKind?: WorkFulfillmentKind;
    currency?: string;
    timezone?: string;
    riskScore?: number;
    createdAt: string;
}

export interface CustomOffer {
    id: string;
    engagementId?: string;
    title: string;
    description: string;
    price: number;
    duration: number;
    status: 'pending' | 'accepted' | 'declined';
    currency?: string;
    mode?: WorkMode;
    fulfillmentKind?: WorkFulfillmentKind;
    riskScore?: number;
    createdAt?: string;
}

export interface ChatThread {
    id: string;
    engagementId?: string;
    itemId: string;
    buyerId: string;
    sellerId: string;
    buyerPersonaId?: string;
    sellerPersonaId?: string;
    lastMessage: string;
    lastUpdated: string;
    messages: ChatMessage[];
}

export interface ChatMessage {
    id: string;
    senderId: string; 
    sender?: string;
    text?: string;
    content?: any; 
    type?: 'text' | 'image' | 'video' | 'voice' | 'listing-draft' | 'offer' | 'contract' | 'milestone';
    timestamp: string | Date;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    audioDurationMs?: number;
    isRead?: boolean;
    offer?: CustomOffer;
    sources?: any[];
}

export type ChatCallMode = 'voice' | 'video';
export type ChatCallStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';

export interface ChatCallSession {
    id: string;
    threadId: string;
    roomName: string;
    mode: ChatCallMode;
    status: ChatCallStatus;
    initiatorId: string;
    receiverId: string;
    acceptedById?: string;
    silentByIds?: string[];
    startedAt: string;
    updatedAt: string;
    endedAt?: string;
    reason?: string;
}

export interface ChatPresenceState {
    userId: string;
    isOnline: boolean;
    lastSeenAt?: string;
    visibility: boolean;
    updatedAt: string;
}

export interface ChatSettings {
    e2eEnabled: boolean;
    presenceVisible: boolean;
    soundEnabled: boolean;
}

export type WorkMode = 'instant' | 'proposal' | 'hybrid';
export type WorkFulfillmentKind = 'local' | 'remote' | 'onsite' | 'hybrid';
export type WorkListingStatus = 'draft' | 'published' | 'archived' | 'paused';
export type WorkRequestStatus = 'open' | 'in_review' | 'matched' | 'cancelled' | 'closed';
export type WorkProposalStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
export type WorkContractStatus = 'draft' | 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'released' | 'rejected';
export type EscrowAction = 'hold' | 'release' | 'refund' | 'adjustment';
export type EngagementStatus = 'created' | 'active' | 'completed' | 'cancelled' | 'disputed';
export type EngagementSourceType = 'order' | 'booking' | 'contract' | 'service_request';

export interface WorkLocation {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    addressLine1?: string;
}

export interface WorkPackage {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    deliveryDays?: number;
    revisions?: number;
    type?: 'hourly' | 'fixed' | 'custom_offer';
}

export interface WorkListing {
    id: string;
    title: string;
    description: string;
    category: string;
    mode: WorkMode;
    fulfillmentKind: WorkFulfillmentKind;
    sellerId: string;
    sellerPersonaId?: string;
    providerSnapshot?: { id: string; name: string; avatar?: string; rating?: number; reviews?: any[] };
    currency: string;
    timezone?: string;
    basePrice?: number;
    packages: WorkPackage[];
    skills?: string[];
    media?: string[];
    availability?: Record<string, any>;
    riskScore?: number;
    status: WorkListingStatus;
    visibility?: 'public' | 'private' | 'unlisted';
    publishedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface WorkRequest {
    id: string;
    requesterId: string;
    requesterPersonaId?: string;
    requesterSnapshot?: { id: string; name: string; avatar?: string };
    title: string;
    brief: string;
    listingId?: string;
    targetProviderId?: string;
    category: string;
    mode: WorkMode;
    fulfillmentKind: WorkFulfillmentKind;
    budgetMin?: number;
    budgetMax?: number;
    currency: string;
    timezone?: string;
    location?: WorkLocation;
    requirements?: string[];
    attachments?: string[];
    riskScore?: number;
    status: WorkRequestStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface Proposal {
    id: string;
    requestId?: string;
    listingId?: string;
    providerId: string;
    providerPersonaId?: string;
    providerSnapshot?: { id: string; name: string; avatar?: string; rating?: number };
    clientId: string;
    clientPersonaId?: string;
    clientSnapshot?: { id: string; name: string; avatar?: string };
    title: string;
    coverLetter?: string;
    priceTotal: number;
    currency: string;
    deliveryDays?: number;
    milestones?: Array<{ title: string; amount: number; dueAt?: string; description?: string }>;
    terms?: Record<string, any>;
    revisionLimit?: number;
    riskScore?: number;
    status: WorkProposalStatus;
    createdAt: string;
    respondedAt?: string;
    updatedAt?: string;
}

export interface Milestone {
    id: string;
    contractId: string;
    title: string;
    description?: string;
    amount: number;
    currency: string;
    dueAt?: string;
    sortOrder: number;
    deliverables?: string[];
    status: MilestoneStatus;
    submittedAt?: string;
    approvedAt?: string;
    releasedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Contract {
    id: string;
    engagementId?: string;
    proposalId?: string;
    requestId?: string;
    listingId?: string;
    clientId: string;
    clientPersonaId?: string;
    providerId: string;
    providerPersonaId?: string;
    scope: string;
    mode: WorkMode;
    fulfillmentKind: WorkFulfillmentKind;
    currency: string;
    timezone?: string;
    totalAmount: number;
    escrowHeld?: number;
    riskScore?: number;
    status: WorkContractStatus;
    terms?: Record<string, any>;
    startAt?: string;
    dueAt?: string;
    completedAt?: string;
    milestones?: Milestone[];
    createdAt: string;
    updatedAt?: string;
}

export interface EscrowTransaction {
    id: string;
    engagementId: string;
    contractId?: string;
    milestoneId?: string;
    payerId?: string;
    payeeId?: string;
    action: EscrowAction;
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed';
    providerRef?: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

export interface Engagement {
    id: string;
    sourceType: EngagementSourceType;
    sourceId: string;
    mode: WorkMode;
    fulfillmentKind: WorkFulfillmentKind;
    buyerId: string;
    buyerPersonaId?: string;
    providerId?: string;
    providerPersonaId?: string;
    currency: string;
    timezone?: string;
    grossAmount?: number;
    escrowStatus?: 'none' | 'held' | 'partial' | 'released' | 'refunded';
    riskScore?: number;
    status: EngagementStatus;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
}

export interface ReputationPassport {
    id: string;
    userId: string;
    personaId?: string;
    score: number;
    jobsCompleted: number;
    completionRate: number;
    disputeRate: number;
    onTimeRate: number;
    responseSlaMinutes: number;
    repeatClientRate: number;
    badges?: string[];
    snapshot?: Record<string, any>;
    updatedAt: string;
    createdAt?: string;
}

export interface AutopilotRun {
    id: string;
    runType: 'scope' | 'pricing' | 'match' | 'delivery' | 'dispute' | 'health';
    actorUserId?: string;
    actorPersonaId?: string;
    requestId?: string;
    listingId?: string;
    contractId?: string;
    inputPayload: Record<string, any>;
    outputPayload: Record<string, any>;
    model?: string;
    status: 'pending' | 'succeeded' | 'failed';
    latencyMs?: number;
    createdAt: string;
}

export interface Service {
    id: string;
    title: string;
    description: string;
    category: string;
    provider: { id: string; name: string; avatar: string; rating: number; reviews: any[] };
    imageUrls: string[];
    pricingModels: ServicePricingModel[];
    avgRating: number;
    reviews: any[];
    engagementId?: string;
    mode?: WorkMode;
    fulfillmentKind?: WorkFulfillmentKind;
    riskScore?: number;
    currency?: string;
    timezone?: string;
    providerPersonaId?: string;
    buyerPersonaId?: string;
    listingSource?: 'legacy' | 'omniwork';
}

export interface ServicePricingModel {
    type: 'hourly' | 'fixed' | 'custom_offer';
    price: number;
    description?: string;
    currency?: string;
    deliveryDays?: number;
    revisions?: number;
}

// Fixed missing AffiliateProfile
export interface AffiliateProfile {
    interestedCategories: string[];
    promotionMethods: ('blog' | 'social' | 'email' | 'youtube' | 'word_of_mouth')[];
    primaryGoal: 'income' | 'business' | 'sharing' | 'exploring';
    experienceLevel: 'beginner' | 'intermediate' | 'pro';
    supportNeeded: ('assets' | 'trends' | 'analytics' | 'guides')[];
    wantsShopTheLook: boolean;
    wantsSellerReferrals: boolean;
}

export interface ServiceProviderProfile {
  bio: string;
  skills: string[];
  portfolioImageUrls?: string[];
  serviceArea: string; 
  availabilityNotes?: string; 
  status: 'pending_approval' | 'approved' | 'rejected';
  serviceCategories: string[];
}

export interface Job {
    id: string;
    service?: Service;
    customer: { id: string; name: string; avatar: string };
    providerId: string;
    price: number;
    scheduledTime: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    engagementId?: string;
    mode?: WorkMode;
    fulfillmentKind?: WorkFulfillmentKind;
    riskScore?: number;
    currency?: string;
    timezone?: string;
    providerPersonaId?: string;
    buyerPersonaId?: string;
}

export interface LiveStream {
    id: string;
    title: string;
    hostName: string;
    hostAvatar: string;
    videoUrl: string;
    thumbnailUrl: string;
    viewers: number;
    featuredItemIds: string[];
}

export interface PaymentMethod {
    id: string;
    type: 'card' | 'paypal' | 'crypto';
    label: string;
    details: any;
    isDefault?: boolean;
}

// Added missing GenieLook and GenieResponse types
export interface GenieLook {
    id: string;
    title: string;
    items: Item[];
    imageUrl: string;
}

export interface GenieDraftListing {
    title: string;
    description: string;
    category: string;
    price: number;
    condition: string;
    listingType: 'sale' | 'rent' | 'both';
    features?: string[];
}

export interface GenieResponse {
    actionType: 'NAVIGATE' | 'SEARCH' | 'DRAFT_LISTING' | 'STYLING' | 'GENERAL_RESPONSE';
    responseText: string;
    navigationPath?: string;
    searchResults?: string[];
    draftListing?: GenieDraftListing;
    looks?: GenieLook[];
}

// Added missing Badge, OnboardingData, DashboardAnalytics, LookbookEntry, StyleGuide types
export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
}

export interface OnboardingData {
    purpose: 'rent' | 'list' | 'both';
    interests: string[];
    country: string;
    currency: 'local' | 'usd';
}

export interface DashboardAnalytics {
    totalEarnings: number;
    rentalCount: number;
    topItem: string;
    earningsByMonth: { month: string; earnings: number }[];
    repeatRenters: number;
    avgRentalDuration: number;
}

export interface LookbookEntry {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    featuredItemIds: string[];
}

export interface StyleGuide {
    id: string;
    title: string;
    author: string;
    date: string;
    excerpt: string;
    imageUrl: string;
    content: string;
}

// Fixed missing Post and other program-related types
export interface Post {
    id?: string;
    creatorId: string;
    imageUrl: string | null;
    caption: string;
    status: 'published' | 'draft' | 'scheduled';
    scheduledFor?: string;
    createdAt?: string;
}

export interface AffiliateCampaign {
    id: string;
    title: string;
    description: string;
    commissionRate: number;
    landingUrl?: string;
    startDate?: string;
    endDate?: string;
    targetCountries?: string[];
    creativeIds?: string[];
}

export interface ExternalProductSubmission {
    id: string;
    userId: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ContentReviewSubmission {
    id: string;
    userId: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
}

