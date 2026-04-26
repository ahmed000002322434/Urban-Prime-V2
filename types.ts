
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
  pendingAffiliateReferral?: AffiliateAttributionSession;
}


export type AccountLifecycle = 'guest' | 'member' | 'restricted';
export type PersonaType = 'consumer' | 'seller' | 'provider' | 'affiliate' | 'shipper';
export type PersonaStatus = 'active' | 'pending' | 'suspended' | 'archived';
export type Capability = 'buy' | 'rent' | 'sell' | 'provide_service' | 'affiliate' | 'ship' | 'admin';
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
  mode: 'supabase' | 'firebase' | 'hybrid' | 'local';
  requireBackend: boolean;
  enableFirestoreFallback: boolean;
  enableLocalMockFallback: boolean;
}

export type OnboardingIntent = 'buy' | 'rent' | 'sell' | 'provide' | 'affiliate' | 'ship';
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
  shippingZone?: string;
  fleetSize?: string;
  vehicleType?: string;
  dispatchMode?: string;
  handles?: Partial<Record<PersonaType, string>>;
}

export type PaymentRail = 'stripe' | 'paypal' | 'razorpay' | 'jazzcash' | 'bank_transfer' | 'local_bank';
export type ShippingRail = 'shippo' | 'easypost' | 'self_managed' | 'local_courier';
export type RuntimeAvailabilityState = 'backend_live' | 'firestore_fallback' | 'local_fallback' | 'offline_blocked';

export interface SpotlightAttribution {
  spotlightContentId: string;
  spotlightProductLinkId?: string | null;
  campaignKey?: string | null;
  expiresAt?: string | null;
}

export interface CheckoutPaymentDetails {
  rail?: PaymentRail | 'legacy_card_entry' | string;
  kind?: 'online' | 'wallet' | 'manual' | string;
  payer_name?: string;
  payer_phone?: string;
  reference?: string | null;
  notes?: string | null;
  provider_label?: string;
  card_last4?: string;
  card_holder_name?: string;
  card_expiry?: string;
  [key: string]: unknown;
}

export interface CheckoutShippingInfo extends Partial<Address> {
  shippingTotal?: number;
  deliveryNote?: string;
  giftWrap?: boolean;
  contactless?: boolean;
  pickupOnly?: boolean;
  shippingGroups?: string[];
  pickupGroups?: string[];
}

export interface CheckoutSubmissionOptions {
  actorPersonaId?: string | null;
  actorName?: string;
  paymentDetails?: CheckoutPaymentDetails | null;
  couponCode?: string | null;
}

export interface RuntimeAvailabilitySnapshot {
  state: RuntimeAvailabilityState;
  backendConfigured: boolean;
  backendAvailable: boolean;
  firestoreFallbackAvailable: boolean;
  localFallbackAvailable: boolean;
  requiresLiveBackend: boolean;
  queuedWriteCount: number;
  dataMode: DataModeConfig['mode'];
  checkedAt: string;
  message: string;
}

export interface PaymentProviderCapability {
  rail: PaymentRail;
  supportsCapture: boolean;
  supportsRefunds: boolean;
  supportsPayouts: boolean;
  supports3DS?: boolean;
  regions?: string[];
}

export interface ShippingProviderCapability {
  rail: ShippingRail;
  supportsRateQuote: boolean;
  supportsLabelPurchase: boolean;
  supportsLiveTracking: boolean;
  regions?: string[];
}

export interface ShipperDashboardSnapshot {
  generatedAt: string;
  summary: {
    activeShipments: number;
    pendingPickup: number;
    deliveredToday: number;
    delayedShipments: number;
  };
  upcoming: Array<{
    shipmentId: string;
    orderId: string;
    buyerName: string;
    eta: string;
    status: string;
    city?: string;
  }>;
}

export interface ShipperDeliveryQueueEntry {
  shipmentId: string;
  orderId: string;
  detailId: string;
  buyerName: string;
  buyerEmail?: string;
  status: string;
  carrier?: string;
  trackingNumber?: string;
  eta: string;
  updatedAt: string;
  itemCount: number;
  delayed: boolean;
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
  brandHubV3?: boolean;
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

export type RentalDeliveryMode = 'pickup' | 'shipping';

export interface RentalQuote {
    itemId: string;
    available: boolean;
    currency: string;
    rentalDays: number;
    quantity: number;
    dailyRate: number;
    subtotal: number;
    securityDeposit: number;
    deliveryMode: RentalDeliveryMode;
    totalDueNow: number;
    rentalStart: string;
    rentalEnd: string;
    availabilityFeedback: string;
    blockedRanges: Array<{
        start: string;
        end: string;
        reason: string;
        type: string;
    }>;
}

export interface RentalBlockEntry {
    id: string;
    itemId: string;
    start: string;
    end: string;
    type: 'manual_blackout' | 'maintenance';
    status: string;
    reason: string;
    createdAt: string;
    createdBy?: string | null;
    metadata?: Record<string, unknown>;
}

export interface RentalBlockDraft {
    start: string;
    end: string;
    type?: 'manual_blackout' | 'maintenance';
    reason?: string;
}

export interface AuctionBidHistoryEntry {
    id: string;
    amount: number;
    status: string;
    counterAmount?: number;
    placedAt: string;
    bidderId: string;
    bidderDisplayName: string;
    sourceThreadId?: string | null;
    metadata?: Record<string, unknown>;
}

export interface AuctionSnapshot {
    itemId: string;
    status: string;
    reserveMet: boolean;
    currentBid: number;
    startingBid: number;
    reservePrice: number;
    buyNowPrice: number;
    endTime: string;
    bidCount: number;
    highestBidId?: string | null;
    winnerId?: string | null;
    winnerCheckoutExpiresAt?: string | null;
    myBidId?: string | null;
    myHighestBid?: number;
    canBid: boolean;
    canBuyNow: boolean;
    canCheckout: boolean;
    history: AuctionBidHistoryEntry[];
}

export interface CommerceDispute {
    id: string;
    orderId?: string | null;
    orderItemId?: string | null;
    rentalBookingId?: string | null;
    openedBy: {
        id: string;
        name: string;
    };
    reasonCode: string;
    details: string;
    status: string;
    resolution?: string;
    adminNotes?: string;
    createdAt: string;
}

export interface CommerceOrderDetail {
    id: string;
    source: 'rental_booking' | 'order_item';
    orderId: string;
    bookingId?: string | null;
    orderItemId: string;
    itemId: string;
    itemTitle: string;
    itemImageUrl: string;
    status: string;
    paymentStatus: string;
    type: 'rent' | 'sale';
    listingMode: 'rent' | 'sale' | 'auction';
    deliveryMode?: RentalDeliveryMode | 'digital';
    rentalStart?: string | null;
    rentalEnd?: string | null;
    trackingNumber?: string | null;
    returnTrackingNumber?: string | null;
    totalPrice: number;
    quantity: number;
    securityDeposit: number;
    depositStatus?: string;
    claimAmount?: number;
    claimReason?: string;
    claimEvidenceUrl?: string;
    buyer?: {
        id: string;
        firebaseUid?: string;
        name: string;
    } | null;
    seller?: {
        id: string;
        firebaseUid?: string;
        name: string;
    } | null;
    digitalDelivery?: {
        available: boolean;
        packageFileName?: string;
        packageSizeBytes?: number;
        packageVersion?: string;
        scanStatus?: string;
    } | null;
    shippingAddress?: any;
    pickupInstructions?: string;
    pickupCode?: string;
    pickupWindowStart?: string | null;
    pickupWindowEnd?: string | null;
    podJob?: PodJob | null;
    dropship?: {
        enabled: boolean;
        status: string;
        approvalState: string;
        routingMode: string;
        carrier?: string | null;
        trackingNumber?: string | null;
        etaLabel?: string | null;
        blindDropship: boolean;
        payableTotal: number;
        marginSnapshot: number;
        trackingSyncState?: string | null;
    } | null;
    legacyBooking?: Booking;
}

export interface PublicTrackedOrderItem {
    id: string;
    orderItemId: string;
    itemId: string;
    itemTitle: string;
    itemImageUrl: string;
    type: 'rent' | 'sale';
    listingMode: 'rent' | 'sale' | 'auction';
    status: string;
    legacyStatus: string;
    quantity: number;
    totalPrice: number;
    trackingNumber?: string | null;
    returnTrackingNumber?: string | null;
    deliveryMode?: RentalDeliveryMode | 'digital' | null;
    rentalStart?: string | null;
    rentalEnd?: string | null;
    pickupInstructions?: string | null;
    pickupWindowStart?: string | null;
    pickupWindowEnd?: string | null;
    sellerName?: string | null;
}

export interface PublicTrackedShipment {
    id: string;
    orderId: string;
    status: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDelivery?: string | null;
    updatedAt?: string | null;
}

export interface PublicOrderTrackingResult {
    orderId: string;
    status: string;
    paymentStatus: string;
    currency: string;
    placedAt: string;
    updatedAt: string;
    subtotal: number;
    shippingTotal: number;
    taxTotal: number;
    total: number;
    note?: string | null;
    shippingAddress?: any;
    items: PublicTrackedOrderItem[];
    shipments: PublicTrackedShipment[];
}

export interface CommerceBidProfileRow {
    id: string;
    itemId: string;
    itemTitle: string;
    amount: number;
    status: string;
    counterAmount?: number;
    placedAt: string;
    sourceThreadId?: string | null;
    currentBid: number;
    canCheckout: boolean;
    canAcceptCounter?: boolean;
    canDeclineCounter?: boolean;
    winnerCheckoutExpiresAt?: string | null;
    auctionStatus: string;
    buyNowPrice: number;
}

export interface CommerceAdminOverview {
    generatedAt: string;
    summary: {
        totalRentals: number;
        openDisputes: number;
        activeAuctions: number;
        totalOrders: number;
    };
    rentals: Array<{
        id: string;
        itemId: string;
        itemTitle: string;
        status: string;
        deliveryMode: string;
        rentalStart: string;
        rentalEnd: string;
        securityDepositStatus: string;
    }>;
    auctions: Array<{
        id: string;
        itemId: string;
        itemTitle: string;
        status: string;
        winnerId?: string | null;
        reserveMet: boolean;
        closedAt?: string | null;
        winnerCheckoutExpiresAt?: string | null;
    }>;
    disputes: Array<{
        id: string;
        status: string;
        reasonCode: string;
        openedBy: string;
        orderId?: string | null;
        rentalBookingId?: string | null;
        createdAt: string;
    }>;
    orders: Array<{
        id: string;
        status: string;
        total: number;
        createdAt: string;
    }>;
}

export interface CommerceProviderSnapshot {
    paymentRails: PaymentRail[];
    shippingRails: ShippingRail[];
    payouts: {
        enabled: boolean;
        rails: PaymentRail[];
    };
    realtime: {
        notifications: boolean;
        analytics: boolean;
    };
}

export interface CartItem extends Item {
    quantity: number;
    subscription?: SubscriptionDetails;
    transactionMode?: 'sale' | 'rent';
    rentalPeriod?: {
        startDate: string;
        endDate: string;
    };
    deliveryMode?: RentalDeliveryMode;
    pickupInstructions?: string;
    pickupCode?: string;
    pickupWindowStart?: string | null;
    pickupWindowEnd?: string | null;
    auctionWinnerCheckout?: boolean;
    auctionBidId?: string;
    podSelection?: PodLineSelection;
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
    source?: 'firestore' | 'commerce';
    engagementId?: string;
    orderId?: string; // New field to link back to main order
    orderItemId?: string;
    canonicalRentalBookingId?: string | null;
    itemId: string;
    itemTitle: string;
    renterId: string;
    renterSupabaseId?: string;
    renterName: string;
    provider: { id: string };
    providerSupabaseId?: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'completed' | 'cancelled';
    shippingAddress?: any;
    trackingNumber?: string;
    paymentStatus?: 'escrow' | 'released' | 'refunded';
    type?: 'rent' | 'sale';
    deliveryMode?: RentalDeliveryMode;
    pickupInstructions?: string | null;
    pickupCode?: string | null;
    pickupWindowStart?: string | null;
    pickupWindowEnd?: string | null;
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
    podJob?: PodJob | null;
    renterPersonaId?: string;
    providerPersonaId?: string;
}

export type BrandVerificationLevel = 'community' | 'verified' | 'official';
export type BrandStatus = 'active' | 'inactive' | 'merged' | 'archived';
export type BrandCatalogNodeType = 'line' | 'series' | 'family' | 'model' | 'collection' | 'other';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  normalizedName: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  story: Record<string, unknown>;
  website?: string;
  country?: string;
  status: BrandStatus;
  verificationLevel: BrandVerificationLevel;
  claimedByUserId?: string | null;
  createdAt: string;
  updatedAt?: string;
  trust?: BrandTrustSignals | null;
  priceSummary?: BrandPriceSummary | null;
  stats?: {
    itemCount: number;
    storeCount: number;
    followerCount: number;
  };
}

export interface BrandAlias {
  id: string;
  brandId: string;
  alias: string;
  normalizedAlias: string;
  source: string;
  confidence: number;
  createdAt: string;
}

export interface BrandCatalogNode {
  id: string;
  brandId: string;
  parentNodeId?: string | null;
  name: string;
  slug: string;
  normalizedName: string;
  nodeType: BrandCatalogNodeType;
  depth: number;
  path: string;
  sortOrder: number;
  status: string;
  source: string;
  createdAt: string;
  updatedAt?: string;
  children?: BrandCatalogNode[];
}

export interface BrandCatalogPath {
  name: string;
  path: string;
}

export interface BrandTrustSignals {
  brandId: string;
  authenticityRiskScore: number;
  priceIntegrityScore: number;
  sellerQualityScore: number;
  overallTrustScore: number;
  explainability: Record<string, unknown>;
  updatedAt: string;
}

export interface BrandCatalogTrustSignals {
  nodeId: string;
  authenticityRiskScore: number;
  priceIntegrityScore: number;
  sellerQualityScore: number;
  overallTrustScore: number;
  explainability: Record<string, unknown>;
  updatedAt: string;
}

export interface BrandPriceSummary {
  min: number;
  median: number;
  max: number;
  sampleSize: number;
  currency: string;
  dealBandLow: number;
  dealBandHigh: number;
}

export interface BrandCatalogPriceSummary extends BrandPriceSummary {
  nodeId?: string | null;
}

export interface BrandMatchQueueItem {
  id: string;
  itemId: string;
  rawBrand?: string;
  normalizedBrand?: string;
  proposedBrandId?: string | null;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface BrandCatalogMatchQueueItem {
  id: string;
  itemId: string;
  brandId?: string | null;
  rawPath?: string;
  normalizedPath?: string;
  proposedNodeId?: string | null;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface BrandHubFilters {
  search?: string;
  country?: string;
  status?: string;
  sort?: 'name' | 'newest' | 'trust' | 'followers';
  limit?: number;
  offset?: number;
}

export interface BrandCatalogFilters {
  path?: string;
  nodeId?: string;
  limit?: number;
  offset?: number;
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
  rentalFulfillment?: {
    pickup?: boolean;
    shipping?: boolean;
    defaultMode?: RentalDeliveryMode;
  };
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
  brandId?: string | null;
  brandCatalogNodeId?: string | null;
  brandMatchConfidence?: number | null;
  brandCatalogMatchConfidence?: number | null;
  brandMatchSource?: 'manual' | 'auto' | 'reviewed' | null;
  brandCatalogPath?: string | null;
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
  fulfillmentType?: 'in_house' | 'dropship' | '3pl' | 'pod';
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
      bids: AuctionBidHistoryEntry[];
  };
  buyNowPrice?: number;
  reservePrice?: number;
  features?: string[];
  specifications?: { key: string; value: string }[];
  isInstantBook?: boolean;
  materials?: { name: string }[];
  status?: 'published' | 'draft' | 'archived' | 'sold';
  boostLevel?: string;
  productType?: 'physical' | 'digital' | 'dropship' | 'pod';
  itemType?: 'physical' | 'digital';
  spotlightAttribution?: SpotlightAttribution;
  digitalDelivery?: DigitalDeliveryProfile;
  gameDetails?: GameDetailsProfile;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  developer?: string;
  publisher?: string;
  tagline?: string;
  releaseDate?: string;
  trailerUrl?: string;
  genres?: string[];
  platforms?: string[];
  modes?: string[];
  tags?: string[];
  digitalFileUrl?: string;
  licenseType?: string;
  licenseDescription?: string;
  supplierInfo?: SupplierInfo;
  dropshipProfile?: DropshipProfile;
  dropshipVariants?: DropshipVariant[];
  podProfile?: PodProfile;
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
    supplierId?: string;
    supplierProductId?: string;
    rating?: number;
    originCountry?: string;
    processingTimeDays?: number;
    contactEmail?: string;
    warehouses?: SupplierWarehouse[];
    shippingProfile?: ShippingProfile;
    returnPolicy?: ReturnPolicy;
    compliance?: ComplianceProfile;
    shippingCost?: number;
    blindDropship?: boolean;
    sellerVisibility?: 'approved_only' | 'all_sellers' | 'hidden';
}

export interface Supplier {
    id: string;
    name: string;
    contactEmail?: string;
    apiUrl?: string;
    status: 'draft' | 'active' | 'paused' | 'blocked';
    fulfillmentMode: 'manual_email' | 'manual_panel' | 'api';
    defaultRoutingMode: 'manual_review' | 'seller_approve' | 'auto_submit';
    slaDays?: number;
    blindDropship: boolean;
    shippingProfile?: ShippingProfile;
    returnPolicy?: ReturnPolicy;
    brandingOptions?: BrandingOptions;
    settlementTerms?: Record<string, unknown>;
    contactChannels?: Record<string, unknown>;
    apiConfig?: Record<string, unknown>;
    adminNotes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt?: string;
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
    supplierProductId?: string;
    supplierSku?: string;
    fulfillment?: 'auto' | 'manual';
    routingMode?: 'manual_review' | 'seller_approve' | 'auto_submit';
    blindDropship?: boolean;
    autoFulfill?: boolean;
    manualSupplierLinkRequired?: boolean;
    supplierName?: string;
    supplierStatus?: string;
    minOrderQuantity?: number;
    minMarginPercent?: number;
    maxDailyCapacity?: number;
    brandingOptions?: BrandingOptions;
    handlingTimeDays?: number;
    processingTimeDays?: number;
    estimatedDelivery?: ShippingEstimate;
    customsInfo?: CustomsInfo;
    lastSupplierSyncAt?: string;
    payableExposure?: number;
    metadata?: Record<string, unknown>;
}

export type PodFulfillmentMode = 'manual';
export type PodProfileStatus = 'draft' | 'published' | 'needs_attention';
export type PodDesignAssetStatus = 'active' | 'archived' | 'flagged';
export type PodJobStatus =
    | 'queued'
    | 'reviewing'
    | 'in_production'
    | 'printed'
    | 'packed'
    | 'shipped'
    | 'completed'
    | 'cancelled';

export interface PodPrintArea {
    key: string;
    label: string;
    width: number;
    height: number;
    recommendedDpi?: number;
    bleedInches?: number;
}

export interface PodVariantOption {
    id: string;
    color: string;
    size?: string;
    sku?: string;
    baseCost: number;
    salePrice: number;
    compareAtPrice?: number;
    stock?: number;
    isEnabled?: boolean;
}

export interface PodCatalogTemplate {
    key: string;
    name: string;
    category: string;
    description?: string;
    baseCost: number;
    leadTimeDays: number;
    availableColors: string[];
    availableSizes: string[];
    printAreas: PodPrintArea[];
    mockupImageUrls: string[];
}

export interface PodDesignAsset {
    id: string;
    ownerUserId?: string;
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    previewUrl?: string;
    tags: string[];
    notes?: string;
    status: PodDesignAssetStatus;
    usageCount?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface PodProfile {
    templateKey: string;
    templateName?: string;
    category?: string;
    brandName: string;
    providerLabel?: string;
    variantOptions: PodVariantOption[];
    designAssetIds: string[];
    mockupImageUrls: string[];
    printAreas?: PodPrintArea[];
    baseCost: number;
    turnaroundDays: number;
    fulfillmentMode: PodFulfillmentMode;
    status: PodProfileStatus;
    marginFloorPercent?: number;
}

export interface PodJob {
    id: string;
    sellerId: string;
    itemId: string;
    orderId: string;
    orderItemId: string;
    buyerId: string;
    status: PodJobStatus;
    itemTitle?: string;
    buyerName?: string;
    buyerCity?: string;
    variantSnapshot: Record<string, any>;
    designSnapshot: Record<string, any>;
    shippingSnapshot: Record<string, any>;
    trackingNumber?: string | null;
    carrier?: string | null;
    notes?: string | null;
    totalPrice?: number;
    mockupImageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PodLineSelection {
    variantId: string;
    color: string;
    size?: string;
    unitPrice: number;
    templateKey: string;
    templateName?: string;
    mockupImageUrl?: string;
}

export interface PodStudioListing {
    id: string;
    title: string;
    status: string;
    price: number;
    baseCost: number;
    marginPercent: number;
    coverImageUrl: string;
    templateKey: string;
    templateName: string;
    designCount: number;
    queuedJobs: number;
    turnaroundDays: number;
    createdAt: string;
    updatedAt: string;
}

export interface PodStudioDashboard {
    summary: {
        revenue: number;
        activeListings: number;
        queuedJobs: number;
        lowMarginAlerts: number;
        avgTurnaroundDays: number;
    };
    listings: PodStudioListing[];
    jobs: PodJob[];
}

export interface PodDiscoveryCard {
    id: string;
    title: string;
    description: string;
    price: number;
    coverImageUrl: string;
    category: string;
    templateKey: string;
    templateName: string;
    creatorName: string;
    brandName?: string;
    tags: string[];
    colors: string[];
    sizes: string[];
}

export interface PodDiscoveryShelf {
    slug: string;
    title: string;
    items: PodDiscoveryCard[];
}

export interface PodDiscoveryPayload {
    hero: PodDiscoveryCard | null;
    featured: PodDiscoveryCard[];
    collections: PodDiscoveryShelf[];
    byCategory: PodDiscoveryShelf[];
    total: number;
}

export interface MarketplaceFees {
    platformFeeRate?: number;
    paymentProcessingFeeRate?: number;
    flatFee?: number;
    currency?: string;
}

export interface DigitalPackageScanReport {
    status: 'clean' | 'warning' | 'blocked' | 'pending';
    summary: string;
    blocked?: string[];
    warnings?: string[];
    antivirusEngine?: string;
    antivirusStatus?: 'clean' | 'warning' | 'blocked' | 'pending';
    antivirusSummary?: string;
    scannedAt?: string;
    packageSha256?: string;
    zipSizeBytes?: number;
    totalUncompressedBytes?: number;
    entryCount?: number;
    compressionRatio?: number;
    sampleEntries?: string[];
}

export interface DigitalDeliveryProfile {
    experienceType?: 'game' | 'digital';
    packageAssetId?: string | null;
    packageFileName?: string;
    packageMimeType?: string;
    packageSizeBytes?: number;
    packageVersion?: string;
    supportedPlatforms?: string[];
    scan?: DigitalPackageScanReport | null;
    zipOnly?: boolean;
    downloadCount?: number;
}

export interface GameDetailsProfile {
    experienceType: 'game';
    tagline?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    trailerUrl?: string;
    genres?: string[];
    platforms?: string[];
    modes?: string[];
    tags?: string[];
}

export interface DigitalMarketplaceSellerListing {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    price: number;
    version?: string;
    coverImageUrl: string;
    creatorName: string;
    experienceType: 'game' | 'digital';
    genres: string[];
    platforms: string[];
    purchases: number;
    unitsSold: number;
    grossRevenue: number;
    downloads: number;
    scanStatus: string;
    scanSummary?: string;
    licenseType?: string;
}

export interface DigitalMarketplaceDashboard {
    summary: {
        totalListings: number;
        published: number;
        drafts: number;
        games: number;
        downloads: number;
        purchases: number;
        revenue: number;
        scanWarnings: number;
    };
    listings: DigitalMarketplaceSellerListing[];
}

export interface GameDiscoveryCard {
    id: string;
    title: string;
    tagline: string;
    description: string;
    coverImageUrl: string;
    heroImageUrl: string;
    price: number;
    version?: string;
    creatorName: string;
    releaseDate?: string;
    genres: string[];
    platforms: string[];
    modes: string[];
    tags: string[];
    scanStatus: string;
    purchases: number;
    downloads: number;
}

export interface GameDiscoveryShelf {
    slug: string;
    title: string;
    items: GameDiscoveryCard[];
}

export interface GameDiscoveryPayload {
    hero: GameDiscoveryCard | null;
    featured: GameDiscoveryCard[];
    newReleases: GameDiscoveryCard[];
    topSellers: GameDiscoveryCard[];
    genreShelves: GameDiscoveryShelf[];
    total: number;
}

export interface DigitalLibraryEntry {
    id: string;
    orderId: string;
    itemId: string;
    title: string;
    coverImageUrl: string;
    purchasedAt: string;
    version?: string;
    pricePaid: number;
    creatorName: string;
    experienceType: 'game' | 'digital';
    packageFileName: string;
    packageSizeBytes: number;
    licenseType?: string;
    licenseDescription?: string;
    platforms: string[];
    genres: string[];
    scanStatus: string;
    scanSummary?: string;
    downloadCount: number;
}

export interface FulfillmentEvent {
    status: string;
    timestamp: string;
    note?: string;
    location?: string;
}

export interface DropshipOrder {
    id: string;
    orderId?: string | null;
    orderItemId?: string | null;
    itemId?: string | null;
    itemTitle?: string;
    itemImageUrl?: string;
    supplierId?: string | null;
    supplierName?: string;
    supplierProductId?: string | null;
    supplierProductTitle?: string;
    buyerId?: string | null;
    buyerName?: string;
    sellerId?: string | null;
    sellerName?: string;
    status:
        | 'pending_review'
        | 'approved'
        | 'submitted'
        | 'accepted'
        | 'processing'
        | 'shipped'
        | 'delivered'
        | 'cancelled'
        | 'failed'
        | 'returned';
    approvalState?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'not_required';
    routingMode?: 'manual_review' | 'seller_approve' | 'auto_submit';
    trackingNumber?: string | null;
    carrier?: string | null;
    externalOrderRef?: string | null;
    externalStatus?: string | null;
    labelUrl?: string | null;
    etaLabel?: string | null;
    blindDropship?: boolean;
    trackingSyncState?: string | null;
    supplierCostSnapshot?: number;
    shippingCostSnapshot?: number;
    sellerSalePriceSnapshot?: number;
    payableTotal?: number;
    marginSnapshot?: number;
    currency?: string;
    failureReason?: string | null;
    cancelReason?: string | null;
    settlementId?: string | null;
    settlementStatus?: string | null;
    metadata?: Record<string, unknown>;
    events?: FulfillmentEvent[];
    createdAt: string;
    approvedAt?: string | null;
    submittedAt?: string | null;
    acceptedAt?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    cancelledAt?: string | null;
    failedAt?: string | null;
    returnedAt?: string | null;
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
    walletTransactionId?: string;
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
    affiliateId?: string;
    storeId?: string | null;
    code: string;
    discountPercentage: number;
    uses: number;
    commissionRate: number;
    status?: 'active' | 'paused' | 'archived';
    createdAt?: string;
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
    minPayout?: number;
    approvalMode?: AffiliateApprovalMode;
    supportedSurfaces?: AffiliateSourceSurface[];
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
    affiliateId?: string;
    storeId?: string | null;
    itemId?: string | null;
    destinationUrl?: string;
    sourceSurface?: AffiliateSourceSurface;
    status?: 'active' | 'paused';
    campaignId?: string;
    createdAt?: string;
}

export type AffiliateApprovalMode = 'manual' | 'automatic';
export type AffiliateSourceSurface = 'link' | 'coupon' | 'spotlight' | 'pixe' | 'seller_referral';
export type AffiliateEventType = 'sale_conversion' | 'rental_conversion' | 'seller_bonus';

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
    approvalMode?: AffiliateApprovalMode;
    supportedSurfaces?: AffiliateSourceSurface[];
    sellerBonusAmount?: number;
}

export interface AffiliateAttribution {
    id: string;
    affiliateId: string;
    clickId: string;
    campaignId?: string;
    itemId?: string;
    storeId?: string | null;
    programId?: string | null;
    trackingCode?: string;
    sourceSurface?: AffiliateSourceSurface;
    createdAt: string;
    expiresAt?: string;
    referrer?: string;
    utm?: Record<string, string>;
}

export interface AffiliateAttributionSession {
    affiliateId?: string;
    affiliateUserId: string;
    clickId?: string;
    linkId?: string;
    couponId?: string;
    trackingCode?: string;
    storeId?: string | null;
    itemId?: string | null;
    sourceSurface: AffiliateSourceSurface;
    destinationUrl?: string;
    createdAt: string;
    expiresAt?: string;
}

export interface AffiliateConversion {
    id: string;
    attributionId: string;
    orderId: string;
    orderItemId?: string;
    bookingId?: string;
    storeId?: string | null;
    programId?: string | null;
    itemId?: string | null;
    affiliateUserId?: string;
    sourceSurface?: AffiliateSourceSurface;
    eventType?: AffiliateEventType;
    amount: number;
    commissionRate: number;
    commissionAmount: number;
    status: 'pending' | 'approved' | 'reversed' | 'paid';
    createdAt: string;
    releasedAt?: string;
    reversalReason?: string;
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

export type AnalyticsScopeType = PersonaType | 'admin';
export type AnalyticsTimeRange = '24h' | '7d' | '30d' | '90d' | '180d';
export type AnalyticsConnectionState = 'live' | 'reconnecting' | 'delayed';
export type AnalyticsPageId =
  | 'overview'
  | 'spend'
  | 'rentals'
  | 'discovery'
  | 'traffic'
  | 'revenue'
  | 'sales-units'
  | 'conversion'
  | 'products'
  | 'intelligence'
  | 'pipeline'
  | 'earnings'
  | 'clients'
  | 'campaigns'
  | 'payouts'
  | 'sla'
  | 'regions'
  | 'exceptions'
  | 'commerce'
  | 'operations'
  | 'trust';

export interface SeriesPoint {
  id?: string;
  date?: string;
  label: string;
  value: number;
  secondaryValue?: number;
  meta?: Record<string, any>;
}

export interface BreakdownRow {
  id: string;
  label: string;
  value: number;
  secondaryValue?: number;
  change?: number;
  href?: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
  meta?: string;
}

export interface LeaderboardRow {
  id: string;
  label: string;
  primary: string | number;
  secondary?: string;
  value?: number;
  href?: string;
  trend?: 'up' | 'down' | 'stable';
  badge?: string;
}

export interface AnalyticsAlert {
  id: string;
  tone: 'info' | 'positive' | 'warning' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface AnalyticsWidgetColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'number' | 'percent' | 'text';
}

export interface AnalyticsWidgetPayload {
  id: string;
  kind:
    | 'timeseries'
    | 'bar-list'
    | 'donut'
    | 'funnel'
    | 'table'
    | 'leaderboard'
    | 'timeline'
    | 'heatmap'
    | 'ticker'
    | 'stat-list';
  title: string;
  description?: string;
  accent?: string;
  aggregateMode?: 'event' | 'aggregate';
  footer?: string;
  emptyMessage?: string;
  series?: SeriesPoint[];
  comparisonSeries?: SeriesPoint[];
  breakdown?: BreakdownRow[];
  leaderboard?: LeaderboardRow[];
  columns?: AnalyticsWidgetColumn[];
  rows?: Array<Record<string, string | number | null>>;
  stages?: Array<{
    id?: string;
    label: string;
    value: number;
    percentage?: number;
    description?: string;
  }>;
  timeline?: Array<{
    id: string;
    label: string;
    timestamp?: string;
    status?: string;
    description?: string;
  }>;
  heatmap?: Array<{
    x: string;
    y: string;
    value: number;
  }>;
  ticker?: string[];
}

export interface PersonaAnalyticsHeroMetric {
  id: string;
  label: string;
  value: string | number;
  changeText?: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
  href?: string;
}

export interface PersonaAnalyticsPagePayload {
  scopeType: AnalyticsScopeType;
  scopeId: string;
  pageId: AnalyticsPageId;
  range: AnalyticsTimeRange;
  generatedAt: string;
  staleAfterMs: number;
  timezone: string;
  title: string;
  subtitle: string;
  personaLabel: string;
  aggregateFallback?: boolean;
  exportFormats?: Array<'csv' | 'json'>;
  alerts: AnalyticsAlert[];
  heroMetrics: PersonaAnalyticsHeroMetric[];
  widgets: AnalyticsWidgetPayload[];
}

export interface LiveAnalyticsEnvelope {
  type: 'analytics.connected' | 'analytics.update' | 'analytics.page' | 'analytics.delay';
  scopeType: AnalyticsScopeType;
  scopeId: string;
  pageId?: AnalyticsPageId;
  range?: AnalyticsTimeRange;
  generatedAt: string;
  connectionState?: AnalyticsConnectionState;
  pages?: AnalyticsPageId[];
  summary?: Record<string, any>;
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
    supplierSku?: string;
    variants?: DropshipVariant[];
    processingTimeDays?: number;
    countryOfOrigin?: string;
    hsCode?: string;
    shippingEstimates?: ShippingEstimate[];
    returnPolicy?: ReturnPolicy;
    certifications?: string[];
    currency?: string;
    status?: 'draft' | 'active' | 'paused' | 'archived';
    stock?: number;
    minOrderQuantity?: number;
    attributes?: Record<string, unknown>;
    sellerVisibility?: 'approved_only' | 'all_sellers' | 'hidden';
    syncMode?: 'managed' | 'api' | 'csv' | string;
    legacySourceRef?: string;
    lastSyncedAt?: string | null;
    supplier?: Supplier;
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
    dropshipping?: {
        enabled: boolean;
        requireApproval: boolean;
        allowAutoSubmit: boolean;
        catalogMode: string;
        buyerRelationship: string;
    };
}

export interface SellerDropshipProfile {
    id: string;
    sellerId: string;
    sellerPersonaId?: string | null;
    status: 'draft' | 'pending' | 'approved' | 'suspended' | 'rejected';
    approvedBy?: string | null;
    approvedAt?: string | null;
    riskNotes?: string;
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    sellerName?: string;
}

export interface SupplierSettlementLine {
    id: string;
    supplierOrderId: string;
    amount: number;
    createdAt: string;
}

export interface SupplierSettlement {
    id: string;
    supplierId: string;
    supplierName: string;
    status: 'draft' | 'ready' | 'settled' | 'reversed';
    amountTotal: number;
    currency: string;
    externalRef?: string | null;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
    settledAt?: string | null;
    createdAt: string;
    updatedAt?: string;
    lines: SupplierSettlementLine[];
}

export interface DropshipCatalogFilters {
    q?: string;
    supplierId?: string;
    category?: string;
    status?: string;
    sellerVisibility?: string;
    limit?: number;
}

export interface DropshipWorkspaceSnapshot {
    profile: SellerDropshipProfile;
    platform: {
        enabled: boolean;
        requireApproval: boolean;
        allowAutoSubmit: boolean;
        catalogMode: string;
        buyerRelationship: string;
    };
    canAccessCatalog: boolean;
    requirements: string[];
}

export type DropshipOrderDetail = DropshipOrder;

export interface DropshipAdminOverview {
    generatedAt: string;
    settings: {
        enabled: boolean;
        requireApproval: boolean;
        allowAutoSubmit: boolean;
        catalogMode: string;
        buyerRelationship: string;
    };
    summary: {
        suppliers: number;
        activeProducts: number;
        pendingSellerApprovals: number;
        ordersNeedingAttention: number;
        unsettledPayables: number;
    };
    suppliers: Supplier[];
    products: SupplierProduct[];
    sellers: SellerDropshipProfile[];
    orders: DropshipOrder[];
    settlements: SupplierSettlement[];
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
    /** Canonical Supabase-backed line (vs legacy Firestore booking) */
    source?: 'firestore' | 'commerce';
    orderId?: string;
    podJobStatus?: PodJobStatus;
    podVariantLabel?: string;
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
    inboxLabel?: 'primary' | 'general' | null;
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
    replyToMessageId?: string;
    reactions?: Record<string, string[]>;
    editedAt?: string;
    deletedAt?: string;
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
export type WorkListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'paused';
export type WorkRequestStatus = 'open' | 'in_review' | 'matched' | 'cancelled' | 'closed';
export type WorkProposalStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
export type WorkContractStatus = 'draft' | 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'released' | 'rejected';
export type EscrowAction = 'hold' | 'release' | 'refund' | 'adjustment';
export type EngagementStatus = 'created' | 'active' | 'completed' | 'cancelled' | 'disputed';
export type EngagementSourceType = 'order' | 'booking' | 'contract' | 'service_request';
export type WorkRequestType = 'booking' | 'quote';
export type ProviderApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resubmission_requested';
export type WorkAvailabilityDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface WorkLocation {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    addressLine1?: string;
}

export interface WorkAvailabilityWindow {
    start: string;
    end: string;
    label?: string;
}

export interface WorkAvailabilityDay {
    enabled: boolean;
    windows: WorkAvailabilityWindow[];
}

export interface WorkServiceAreaCoverage {
    kind?: 'city' | 'region' | 'country' | 'radius' | 'custom';
    label: string;
    radiusKm?: number;
}

export interface WorkAvailability {
    timezone?: string;
    weeklySchedule?: Partial<Record<WorkAvailabilityDayKey, WorkAvailabilityDay>>;
    blackoutDates?: string[];
    leadTimeHours?: number;
    serviceArea?: WorkServiceAreaCoverage[];
    notes?: string;
}

export interface WorkPortfolioItem {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    link?: string;
}

export interface WorkFaq {
    question: string;
    answer: string;
}

export interface WorkPolicySet {
    cancellation?: string;
    revisions?: string;
    reschedule?: string;
    delivery?: string;
    custom?: string[];
}

export interface WorkListingDetails {
    summary?: string;
    languages?: string[];
    responseSlaHours?: number;
    serviceAreaLabel?: string;
    trustBadges?: string[];
    portfolio?: WorkPortfolioItem[];
    faqs?: WorkFaq[];
    policies?: WorkPolicySet;
    documents?: string[];
    instantBookingEnabled?: boolean;
    quoteEnabled?: boolean;
}

export interface WorkRequestAnswer {
    label: string;
    value: string;
}

export interface WorkRequestDetails {
    requestType?: WorkRequestType;
    packageId?: string;
    packageName?: string;
    packageType?: ServicePricingModel['type'];
    desiredDate?: string;
    desiredTime?: string;
    schedulingNotes?: string;
    answers?: WorkRequestAnswer[];
    policyAcknowledged?: boolean;
    serviceAddress?: WorkLocation & {
        label?: string;
        postalCode?: string;
        addressLine2?: string;
    };
}

export interface ProviderApplicationDocument {
    id: string;
    label: string;
    url: string;
    type?: string;
    status?: 'submitted' | 'verified' | 'rejected';
}

export interface ProviderApplication {
    id: string;
    userId: string;
    userSupabaseId?: string;
    applicantName?: string;
    applicantEmail?: string;
    applicantAvatar?: string;
    providerPersonaId?: string;
    businessName?: string;
    businessType?: string;
    bio?: string;
    serviceCategories: string[];
    languages?: string[];
    yearsExperience?: number;
    serviceArea?: WorkServiceAreaCoverage[];
    responseSlaHours?: number;
    payoutReady?: boolean;
    website?: string;
    documents?: ProviderApplicationDocument[];
    portfolio?: WorkPortfolioItem[];
    onboardingProgress?: number;
    status: ProviderApplicationStatus;
    notes?: string;
    reviewerNotes?: string;
    submittedAt?: string;
    reviewedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface ProviderWorkspaceSummary {
    stats: {
        earnings: number;
        activeJobs: number;
        jobsCompleted: number;
        averageRating: number;
        responseRate: number;
    };
    queues: {
        leads: number;
        proposals: number;
        activeContracts: number;
        pendingListings: number;
        pendingApplication: number;
    };
    calendar: {
        upcomingBookings: number;
        nextBookingAt?: string;
        timezone?: string;
    };
    escrow: {
        held: number;
        released: number;
        refunded: number;
    };
    payouts: {
        available: number;
        processing: number;
        pendingRequests: number;
        totalPaidOut: number;
    };
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
    availability?: WorkAvailability;
    details?: WorkListingDetails;
    riskScore?: number;
    status: WorkListingStatus;
    visibility?: 'public' | 'private' | 'unlisted';
    reviewNotes?: string;
    submittedAt?: string;
    reviewedAt?: string;
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
    requestType?: WorkRequestType;
    details?: WorkRequestDetails;
    riskScore?: number;
    status: WorkRequestStatus;
    scheduledAt?: string;
    acceptedAt?: string;
    declinedAt?: string;
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
    availability?: WorkAvailability;
    details?: WorkListingDetails;
    providerProfile?: ServiceProviderProfile;
    status?: WorkListingStatus;
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
  applicationId?: string;
  applicationStatus?: ProviderApplicationStatus;
  businessName?: string;
  businessType?: string;
  website?: string;
  yearsExperience?: number;
  responseSlaHours?: number;
  payoutReady?: boolean;
  verificationLevel?: 'none' | 'basic' | 'enhanced' | 'verified';
  languages?: string[];
  portfolio?: WorkPortfolioItem[];
  documents?: ProviderApplicationDocument[];
  serviceAreaCoverage?: WorkServiceAreaCoverage[];
  weeklyAvailability?: WorkAvailability;
  trustBadges?: string[];
  onboardingProgress?: number;
  onboardingChecklist?: string[];
  notes?: string;
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
    storeId?: string | null;
    status?: 'new' | 'active' | 'paused' | 'suspended';
    supportedSurfaces?: AffiliateSourceSurface[];
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

