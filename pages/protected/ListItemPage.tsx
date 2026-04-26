
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService';
import commerceService from '../../services/commerceService';
import brandService from '../../services/brandService';
import type { Item, Category, Brand, BrandCatalogNode, RentalBlockDraft, RentalBlockEntry } from '../../types';
import Calendar from '../../components/Calendar';
import { useCategories } from '../../context/CategoryContext';
import CreateCategoryModal from '../../components/CreateCategoryModal';
import AIPostGenerator from '../../components/AIPostGenerator';
import BackgroundRemovalModal from '../../components/BackgroundRemovalModal';
import BackButton from '../../components/BackButton';
import { calculatePayout, formatCurrency } from '../../utils/financeUtils';
import { useUserData } from '../../hooks/useUserData';
import Spinner from '../../components/Spinner';

// --- Icons ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-600"><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 18 1.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" /></svg>;
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 cursor-help"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.662-.629.548-1.941 1.29-1.941 2.868m0 4.618h.01" /></svg>;

const TShirtIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.38 3.4a1.6 1.6 0 0 0-1.58-1.4H5.2a1.6 1.6 0 0 0-1.58 1.4L3 6l4 1 2-2.5 3 2.5 3-2.5 4 1 2-2.5z"/><path d="M4 10h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11z"/></svg>;
const BoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const CrateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>;

// --- WIZARD FORM DATA TYPE ---
type WizardFormData = Omit<Partial<Item>, 'shippingOptions'> & {
    specifications: { key: string; value: string }[];
    features: string[];
    shippingOptions: { type: 'flat' | 'pickup'; cost: number; description: string }[];
    dueDate?: string;
    // Auction fields
    startingBid?: number;
    buyNowPrice?: number;
    reservePrice?: number;
    auctionEndTime?: string;
    // Shipping New Fields
    whoPaysShipping: 'seller' | 'buyer';
    shippingWeightClass: 'small' | 'medium' | 'large' | 'custom';
    // Rental Specifics
    rentalRates: { hourly: number; daily: number; weekly: number };
    minRentalDuration: number;
    securityDeposit: number;
    // Marketplace Enhancements
    returnPolicy?: {
        windowDays: number;
        conditions: string[];
        restockingFeePercent?: number;
        returnShippingPaidBy?: 'buyer' | 'seller' | 'platform';
    };
    warranty?: {
        coverage: string;
        durationMonths?: number;
        provider?: 'seller' | 'manufacturer' | 'platform';
    };
    shippingEstimates?: { minDays: number; maxDays: number; carrier?: string; serviceLevel?: string; cost?: number }[];
    originCountry?: string;
    originCity?: string;
    dimensionsIn?: { l: number; w: number; h: number };
    weightLbs?: number;
    packageContents: string[];
    careInstructions: string[];
    certifications: string[];
    fulfillmentType?: 'in_house' | 'dropship' | '3pl';
    affiliateEligibility?: {
        enabled: boolean;
        commissionRate?: number;
        cookieWindowDays?: number;
        approvedCreatorsOnly?: boolean;
    };
    supplierInfo?: {
        name?: string;
        processingTimeDays?: number;
        originCountry?: string;
        compliance?: { certifications?: string[] };
    };
    automation?: {
        autoReprice?: boolean;
        autoRestock?: boolean;
        autoPromote?: boolean;
        autoFulfill?: boolean;
        minMarginPercent?: number;
    };
};

const initialFormData: WizardFormData = {
    title: '',
    description: '',
    category: '',
    brand: '',
    condition: 'new',
    listingType: 'sale',
    imageUrls: [],
    specifications: [{ key: '', value: '' }],
    features: [''],
    salePrice: 0,
    compareAtPrice: 0,
    stock: 1,
    sku: '',
    rentalPrice: 0, // Deprecated, but keeping for compatibility
    rentalRates: { hourly: 0, daily: 0, weekly: 0 },
    rentalPriceType: 'daily',
    rentalFulfillment: { pickup: true, shipping: true, defaultMode: 'pickup' },
    // Removed non-existent 'rentalDeposit' property to fix TypeScript error.
    securityDeposit: 0,
    isInstantBook: false,
    minRentalDuration: 24, // Default 1 day
    bookedDates: [],
    videoUrl: '',
    shippingOptions: [],
    dueDate: '',
    startingBid: 0,
    buyNowPrice: 0,
    reservePrice: 0,
    auctionEndTime: '',
    whoPaysShipping: 'buyer',
    shippingWeightClass: 'small',
    returnPolicy: {
        windowDays: 14,
        conditions: ['Item must be in original condition.']
    },
    warranty: {
        coverage: 'Standard coverage',
        durationMonths: 6,
        provider: 'seller'
    },
    shippingEstimates: [{ minDays: 3, maxDays: 6, carrier: 'Standard', serviceLevel: 'Ground', cost: 0 }],
    originCountry: '',
    originCity: '',
    dimensionsIn: { l: 0, w: 0, h: 0 },
    weightLbs: 0,
    packageContents: [''],
    careInstructions: [''],
    certifications: [''],
    fulfillmentType: 'in_house',
    affiliateEligibility: {
        enabled: false,
        commissionRate: 10,
        cookieWindowDays: 30,
        approvedCreatorsOnly: false
    },
    supplierInfo: {
        name: '',
        processingTimeDays: 0,
        originCountry: '',
        compliance: { certifications: [] }
    },
    automation: {
        autoReprice: false,
        autoRestock: false,
        autoPromote: false,
        autoFulfill: false,
        minMarginPercent: 20
    }
};

const normalizeRentalFulfillment = (value?: Item['rentalFulfillment']) => {
    if (!value) {
        return {
            pickup: true,
            shipping: true,
            defaultMode: 'pickup'
        } as NonNullable<Item['rentalFulfillment']>;
    }

    const pickup = value?.pickup !== false;
    const shipping = Boolean(value?.shipping);
    const hasAny = pickup || shipping;
    const defaultMode =
        value?.defaultMode === 'shipping' && shipping
            ? 'shipping'
            : pickup || !hasAny
                ? 'pickup'
                : 'shipping';

    return {
        pickup: hasAny ? pickup : true,
        shipping,
        defaultMode
    } as NonNullable<Item['rentalFulfillment']>;
};

const parseUtcDateKey = (value: string) => {
    const [year, month, day] = String(value || '').trim().split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
};

const addUtcDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);

const formatUtcDateKey = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

const expandRentalBlockDates = (blocks: RentalBlockEntry[]) => {
    const dates = new Set<string>();
    blocks.forEach((block) => {
        const start = new Date(block.start);
        const end = new Date(block.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
            return;
        }
        let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        while (cursor.getTime() < end.getTime()) {
            dates.add(formatUtcDateKey(cursor));
            cursor = addUtcDays(cursor, 1);
        }
    });
    return Array.from(dates).sort((left, right) => left.localeCompare(right));
};

const buildRentalBlockDrafts = (bookedDates: string[]): RentalBlockDraft[] => {
    const normalizedDates = Array.from(
        new Set(
            (bookedDates || [])
                .map((value) => String(value || '').trim())
                .filter((value) => Boolean(parseUtcDateKey(value)))
        )
    ).sort((left, right) => left.localeCompare(right));

    if (normalizedDates.length === 0) return [];

    const drafts: RentalBlockDraft[] = [];
    let rangeStart = parseUtcDateKey(normalizedDates[0]);
    let rangeEndExclusive = rangeStart ? addUtcDays(rangeStart, 1) : null;

    for (let index = 1; index < normalizedDates.length; index += 1) {
        const current = parseUtcDateKey(normalizedDates[index]);
        if (!current || !rangeStart || !rangeEndExclusive) continue;
        if (current.getTime() === rangeEndExclusive.getTime()) {
            rangeEndExclusive = addUtcDays(current, 1);
            continue;
        }
        drafts.push({
            start: rangeStart.toISOString(),
            end: rangeEndExclusive.toISOString(),
            type: 'manual_blackout',
            reason: 'seller_calendar_block'
        });
        rangeStart = current;
        rangeEndExclusive = addUtcDays(current, 1);
    }

    if (rangeStart && rangeEndExclusive) {
        drafts.push({
            start: rangeStart.toISOString(),
            end: rangeEndExclusive.toISOString(),
            type: 'manual_blackout',
            reason: 'seller_calendar_block'
        });
    }

    return drafts;
};

// --- UI Components ---
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-background focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm font-medium dark:text-white" />;
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-background focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all text-sm font-medium dark:text-white" />;
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-background focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm font-medium dark:text-white" />;

const FormCard: React.FC<{title: string, subtitle?: string, children: React.ReactNode}> = ({title, subtitle, children}) => (
    <div className="bg-white dark:bg-dark-surface p-4 sm:p-6 md:p-8 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg sm:text-xl font-bold mb-1 text-gray-900 dark:text-dark-text font-display">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{subtitle}</p>}
        <div className="space-y-5 sm:space-y-6 mt-4">{children}</div>
    </div>
);

const flattenCatalogNodes = (
    nodes: BrandCatalogNode[],
    parentLabel = ''
): Array<{ id: string; label: string; path: string }> => {
    const output: Array<{ id: string; label: string; path: string }> = [];
    nodes.forEach((node) => {
        const currentLabel = parentLabel ? `${parentLabel} / ${node.name}` : node.name;
        output.push({ id: node.id, label: currentLabel, path: node.path });
        if (Array.isArray(node.children) && node.children.length > 0) {
            output.push(...flattenCatalogNodes(node.children, currentLabel));
        }
    });
    return output;
};

// --- Main Page ---
const ListItemPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { storefront } = useUserData();
    const { showNotification } = useNotification();
    const { categories, isLoading: isLoadingCategories, addCategory } = useCategories();
    const [formData, setFormData] = useState<WizardFormData>(initialFormData);
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isAIPostModalOpen, setIsAIPostModalOpen] = useState(false);
    const [isBgModalOpen, setIsBgModalOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<{ url: string; index: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brandOptions, setBrandOptions] = useState<Brand[]>([]);
    const [brandSearch, setBrandSearch] = useState('');
    const [isBrandLoading, setIsBrandLoading] = useState(false);
    const [brandLineOptions, setBrandLineOptions] = useState<Array<{ id: string; label: string; path: string }>>([]);
    const [brandLineMode, setBrandLineMode] = useState<'catalog' | 'other'>('catalog');
    const [showBrandSuggestion, setShowBrandSuggestion] = useState(false);
    const [brandSuggestionNotes, setBrandSuggestionNotes] = useState('');
    const [isBrandSuggesting, setIsBrandSuggesting] = useState(false);
    const [formMode, setFormMode] = useState<'new' | 'edit' | 'duplicate'>('new');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isHydratingListing, setIsHydratingListing] = useState(false);
    const [sourceItemSnapshot, setSourceItemSnapshot] = useState<Item | null>(null);
    const [isLoadingRentalBlocks, setIsLoadingRentalBlocks] = useState(false);
    const [isSyncingRentalBlocks, setIsSyncingRentalBlocks] = useState(false);
    const [rentalBlockNotice, setRentalBlockNotice] = useState<string | null>(null);

    // Derived state for earnings
    const currentPrice = formData.listingType === 'rent' ? formData.rentalRates.daily : formData.salePrice;
    const { fee, payout } = calculatePayout(currentPrice || 0);
    const withTimeout = <T,>(promise: Promise<T>, ms = 15000) =>
        Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out. Check your connection.')), ms))
        ]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const editId = String(params.get('edit') || '').trim();
        const duplicateId = String(params.get('duplicate') || '').trim();
        const sourceId = editId || duplicateId;
        const mode: 'new' | 'edit' | 'duplicate' = editId ? 'edit' : duplicateId ? 'duplicate' : 'new';

        if (!sourceId) {
            setFormMode('new');
            setEditingItemId(null);
            setSourceItemSnapshot(null);
            return;
        }

        let cancelled = false;
        const hydrateFromExistingItem = async () => {
            setIsHydratingListing(true);
            try {
                const sourceItem = await itemService.getItemById(sourceId);
                if (!sourceItem) {
                    if (!cancelled) {
                        showNotification('Listing not found. Starting a new listing.');
                        setFormMode('new');
                        setEditingItemId(null);
                        setSourceItemSnapshot(null);
                    }
                    return;
                }

                const nextFormData: WizardFormData = {
                    ...initialFormData,
                    ...sourceItem,
                    listingType: sourceItem.listingType || 'sale',
                    imageUrls: sourceItem.imageUrls?.length ? sourceItem.imageUrls : sourceItem.images || [],
                    specifications: Array.isArray(sourceItem.specifications) && sourceItem.specifications.length > 0
                        ? sourceItem.specifications
                        : [{ key: '', value: '' }],
                    features: Array.isArray(sourceItem.features) && sourceItem.features.length > 0 ? sourceItem.features : [''],
                    shippingOptions: Array.isArray(sourceItem.shippingOptions) ? (sourceItem.shippingOptions as any) : [],
                    rentalRates: {
                        hourly: sourceItem.rentalRates?.hourly || 0,
                        daily: sourceItem.rentalRates?.daily || sourceItem.rentalPrice || 0,
                        weekly: sourceItem.rentalRates?.weekly || 0
                    },
                    rentalFulfillment: normalizeRentalFulfillment(sourceItem.rentalFulfillment),
                    minRentalDuration: sourceItem.minRentalDuration || 24,
                    securityDeposit: sourceItem.securityDeposit || 0,
                    isInstantBook: Boolean(sourceItem.isInstantBook),
                    whoPaysShipping: sourceItem.whoPaysShipping === 'seller' ? 'seller' : 'buyer',
                    shippingWeightClass: (
                        sourceItem.shippingWeightClass === 'small' ||
                        sourceItem.shippingWeightClass === 'medium' ||
                        sourceItem.shippingWeightClass === 'large' ||
                        sourceItem.shippingWeightClass === 'custom'
                            ? sourceItem.shippingWeightClass
                            : 'small'
                    ) as 'small' | 'medium' | 'large' | 'custom',
                    packageContents: Array.isArray(sourceItem.packageContents) && sourceItem.packageContents.length > 0
                        ? sourceItem.packageContents
                        : [''],
                    careInstructions: Array.isArray(sourceItem.careInstructions) && sourceItem.careInstructions.length > 0
                        ? sourceItem.careInstructions
                        : [''],
                    certifications: Array.isArray(sourceItem.certifications) && sourceItem.certifications.length > 0
                        ? sourceItem.certifications
                        : [''],
                    shippingEstimates: Array.isArray(sourceItem.shippingEstimates) && sourceItem.shippingEstimates.length > 0
                        ? (sourceItem.shippingEstimates as any)
                        : [{ minDays: 3, maxDays: 6, carrier: 'Standard', serviceLevel: 'Ground', cost: 0 }],
                    returnPolicy: sourceItem.returnPolicy || initialFormData.returnPolicy,
                    warranty: sourceItem.warranty || initialFormData.warranty,
                    startingBid: sourceItem.auctionDetails?.startingBid || 0,
                    buyNowPrice: sourceItem.buyNowPrice || 0,
                    reservePrice: sourceItem.reservePrice || 0,
                    auctionEndTime: sourceItem.auctionDetails?.endTime || '',
                    bookedDates: Array.isArray(sourceItem.bookedDates) ? sourceItem.bookedDates : []
                };

                if (!cancelled) {
                    setFormData(nextFormData);
                    setFormMode(mode);
                    setEditingItemId(mode === 'edit' ? sourceItem.id : null);
                    setSourceItemSnapshot(sourceItem);
                }
            } catch (error) {
                console.error('Listing hydration failed:', error);
                if (!cancelled) {
                    showNotification('Unable to load listing data. Starting a new listing.');
                    setFormMode('new');
                    setEditingItemId(null);
                    setSourceItemSnapshot(null);
                }
            } finally {
                if (!cancelled) setIsHydratingListing(false);
            }
        };

        void hydrateFromExistingItem();
        return () => {
            cancelled = true;
        };
    }, [location.search, showNotification]);

    useEffect(() => {
        let ignore = false;
        const timer = setTimeout(async () => {
            setIsBrandLoading(true);
            try {
                const payload = await brandService.getBrands({
                    search: brandSearch || undefined,
                    sort: 'name',
                    limit: 50,
                    offset: 0,
                    status: 'active'
                });
                if (!ignore) {
                    setBrandOptions(payload.data);
                }
            } catch {
                if (!ignore) setBrandOptions([]);
            } finally {
                if (!ignore) setIsBrandLoading(false);
            }
        }, 220);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [brandSearch]);

    useEffect(() => {
        let ignore = false;
        const loadCatalog = async () => {
            const selectedBrandId = String((formData as any).brandId || '').trim();
            if (!selectedBrandId) {
                setBrandLineOptions([]);
                setBrandLineMode('catalog');
                setFormData((prev) => ({
                    ...prev,
                    brandCatalogNodeId: null,
                    brandCatalogPath: ''
                }));
                return;
            }

            const selectedBrand = brandOptions.find((entry) => entry.id === selectedBrandId);
            if (selectedBrand?.name && selectedBrand.name !== formData.brand) {
                setFormData((prev) => ({ ...prev, brand: selectedBrand.name || prev.brand }));
            }

            const slug = selectedBrand?.slug;
            if (!slug) return;

            setIsBrandLoading(true);
            try {
                const treePayload = await brandService.getBrandTree(slug);
                if (ignore) return;
                const flattened = flattenCatalogNodes(treePayload.tree || []);
                setBrandLineOptions(flattened);
            } catch {
                if (!ignore) setBrandLineOptions([]);
            } finally {
                if (!ignore) setIsBrandLoading(false);
            }
        };

        void loadCatalog();
        return () => {
            ignore = true;
        };
    }, [(formData as any).brandId, brandOptions, formData.brand]);

    useEffect(() => {
        let cancelled = false;
        const sourceListingType = sourceItemSnapshot?.listingType;
        const shouldLoadCanonicalBlocks =
            formMode === 'edit' &&
            Boolean(editingItemId) &&
            Boolean(sourceItemSnapshot?.id) &&
            commerceService.enabled() &&
            (sourceListingType === 'rent' || sourceListingType === 'both');

        if (!shouldLoadCanonicalBlocks || !editingItemId) {
            setIsLoadingRentalBlocks(false);
            if (formMode !== 'edit') {
                setRentalBlockNotice('Manual blackout dates will sync to the live calendar after the listing is created.');
            } else if (sourceListingType !== 'rent' && sourceListingType !== 'both') {
                setRentalBlockNotice(null);
            }
            return;
        }

        const loadRentalBlocks = async () => {
            setIsLoadingRentalBlocks(true);
            try {
                const payload = await commerceService.getRentalBlocks(editingItemId);
                if (cancelled) return;
                const nextBookedDates = expandRentalBlockDates(payload.blocks || []);
                setFormData((prev) => ({ ...prev, bookedDates: nextBookedDates }));
                setRentalBlockNotice(
                    nextBookedDates.length > 0
                        ? `${nextBookedDates.length} blocked day${nextBookedDates.length === 1 ? '' : 's'} synced from the live calendar.`
                        : 'No manual blackout windows are saved in the live calendar yet.'
                );
            } catch (error) {
                console.warn('Unable to load canonical rental blocks:', error);
                if (!cancelled) {
                    setRentalBlockNotice('Unable to load live blackout windows. Local draft dates remain editable until the next successful save.');
                }
            } finally {
                if (!cancelled) setIsLoadingRentalBlocks(false);
            }
        };

        void loadRentalBlocks();
        return () => {
            cancelled = true;
        };
    }, [editingItemId, formMode, sourceItemSnapshot]);

    const handlePublish = async (status: 'published' | 'draft') => {
        if (isSubmitting) return;
        if (!user) {
            showNotification("Please sign in to save or publish your listing.");
            navigate('/login');
            return;
        }
        const { shippingOptions, startingBid, buyNowPrice, reservePrice, auctionEndTime, rentalRates, ...restOfFormData } = formData;
        const rentalFulfillment = normalizeRentalFulfillment(formData.rentalFulfillment);
        const existingAuction =
            formMode === 'edit' &&
            sourceItemSnapshot &&
            sourceItemSnapshot.id === editingItemId
                ? sourceItemSnapshot.auctionDetails
                : undefined;
        const existingCurrentBid = Number(existingAuction?.currentBid || 0);
        const existingBidCount = Number(existingAuction?.bidCount || 0);
        const existingStartingBid = Number(existingAuction?.startingBid || 0);
        const existingBids = Array.isArray(existingAuction?.bids) ? existingAuction.bids : [];
        const hasLiveBids = existingBidCount > 0 || existingCurrentBid > 0;
        const isDraft = status === 'draft';
        
        if (!isDraft) {
            // Validation check
            if (!formData.title || !formData.category) {
                 showNotification("Please fill in required fields (Title, Category).");
                 return;
            }

            if (formData.listingType === 'auction') {
                if (!startingBid || !auctionEndTime) {
                    showNotification("Please provide a starting bid and end time for the auction.");
                    return;
                }
                if (startingBid < 0) {
                    showNotification("Starting bid cannot be negative.");
                    return;
                }
                if (buyNowPrice < 0 || reservePrice < 0) {
                    showNotification("Buy now and reserve prices cannot be negative.");
                    return;
                }
                const auctionEndAt = Date.parse(String(auctionEndTime || ''));
                if (!Number.isFinite(auctionEndAt)) {
                    showNotification("Auction end time is invalid.");
                    return;
                }
                if (auctionEndAt <= Date.now()) {
                    showNotification("Auction end time must be in the future.");
                    return;
                }
                const buyNowFloor = Math.max(startingBid, hasLiveBids ? existingCurrentBid : 0);
                if (buyNowPrice && buyNowPrice < buyNowFloor) {
                    showNotification(`Buy now price must be at least ${formatCurrency(buyNowFloor)}.`);
                    return;
                }
                if (reservePrice && reservePrice < startingBid) {
                    showNotification("Reserve price must be greater than or equal to the starting bid.");
                    return;
                }
                if (
                    formMode === 'edit' &&
                    hasLiveBids &&
                    Math.abs(startingBid - existingStartingBid) > 0.0001
                ) {
                    showNotification('Starting bid cannot be changed after bids are placed.');
                    return;
                }
            } else if (formData.listingType === 'rent') {
                 if (!rentalRates.daily && !rentalRates.hourly && !rentalRates.weekly) {
                     showNotification("Please set at least one rental rate (Hourly, Daily, or Weekly).");
                     return;
                 }
                 if (!rentalFulfillment.pickup && !rentalFulfillment.shipping) {
                    showNotification("Enable pickup, shipping, or both for rental fulfillment.");
                    return;
                 }
                 if (
                    rentalRates.hourly < 0 ||
                    rentalRates.daily < 0 ||
                    rentalRates.weekly < 0 ||
                    formData.securityDeposit < 0 ||
                    formData.minRentalDuration <= 0
                 ) {
                    showNotification("Rental rates, deposit, and minimum duration must be valid positive values.");
                    return;
                 }
            } else if (formData.listingType === 'both') {
                if (!formData.salePrice) {
                    showNotification("Please set a sale price for a Sale + Rent listing.");
                    return;
                }
                if (!rentalRates.daily && !rentalRates.hourly && !rentalRates.weekly) {
                    showNotification("Please set at least one rental rate for a Sale + Rent listing.");
                    return;
                }
                if (!rentalFulfillment.pickup && !rentalFulfillment.shipping) {
                    showNotification("Enable pickup, shipping, or both for rental fulfillment.");
                    return;
                }
                if (
                    rentalRates.hourly < 0 ||
                    rentalRates.daily < 0 ||
                    rentalRates.weekly < 0 ||
                    formData.securityDeposit < 0 ||
                    formData.minRentalDuration <= 0
                ) {
                    showNotification("Rental rates, deposit, and minimum duration must be valid positive values.");
                    return;
                }
            } else if (!formData.salePrice) {
                showNotification("Please set a sale price.");
                return;
            }

            if ((formData as any).brandId && !(formData as any).brandCatalogNodeId && !String((formData as any).brandCatalogPath || '').trim()) {
                showNotification('Select a product line for the chosen brand, or choose \"Other under this brand\" and provide it.');
                return;
            }
        }

        // Construct Shipping Details based on simplified options
        let finalShippingDetails = {
            shippingOptions: shippingOptions
        };

        const finalData: Partial<Item> = { 
          ...restOfFormData,
          ...(isDraft && !formData.title ? { title: 'Untitled Draft' } : {}),
          status,
          brandId: (formData as any).brandId || null,
          brandCatalogNodeId: (formData as any).brandCatalogNodeId || null,
          brandCatalogPath: (formData as any).brandCatalogPath || '',
          shippingDetails: finalShippingDetails,
          shippingWeightClass: formData.shippingWeightClass,
          whoPaysShipping: formData.whoPaysShipping,
          automation: formData.automation,
          isInstantBook: formData.listingType === 'rent' || formData.listingType === 'both' ? Boolean(formData.isInstantBook) : false
        };

        // Add Rental specific fields
        if (formData.listingType === 'rent' || formData.listingType === 'both') {
            finalData.rentalRates = rentalRates;
            finalData.rentalPrice = rentalRates.daily || 0; // Fallback for legacy
            finalData.securityDeposit = formData.securityDeposit;
            finalData.minRentalDuration = formData.minRentalDuration;
            finalData.bookedDates = formData.bookedDates; // Save manually blocked dates
            finalData.rentalFulfillment = rentalFulfillment;
        }

        if (formData.listingType === 'auction') {
            const lockedStartingBid = hasLiveBids ? existingStartingBid : (startingBid || 0);
            finalData.auctionDetails = {
                startingBid: lockedStartingBid,
                currentBid: hasLiveBids ? existingCurrentBid : Math.max(existingCurrentBid, lockedStartingBid),
                endTime: auctionEndTime || '',
                bidCount: existingBidCount,
                bids: existingBids
            };
            finalData.buyNowPrice = buyNowPrice;
            finalData.reservePrice = reservePrice;
        }

        try {
            setIsSubmitting(true);
            let savedItem: Item;
            let rentalBlockSyncFailed = false;
            let rentalBlockSyncMessage = '';
            if (formMode === 'edit' && editingItemId) {
                await withTimeout(itemService.updateItem(editingItemId, finalData));
                const refreshed = await withTimeout(itemService.getItemById(editingItemId));
                savedItem = refreshed || ({ id: editingItemId, ...finalData } as Item);
            } else {
                savedItem = await withTimeout(itemService.addItem(finalData, user));
            }
            try {
                const selectedBrandId = (finalData as any).brandId as string | null;
                const selectedPath = String((finalData as any).brandCatalogPath || '').trim();
                if (!selectedBrandId && finalData.brand) {
                    const classification = await brandService.classifyItemBrand({
                        itemId: savedItem.id,
                        brand: finalData.brand
                    });
                    if (classification?.brand?.id && selectedPath) {
                        await brandService.classifyItemCatalog({
                            itemId: savedItem.id,
                            brandId: classification.brand.id,
                            path: selectedPath
                        });
                    }
                } else if (selectedBrandId && !(finalData as any).brandCatalogNodeId && selectedPath) {
                    await brandService.classifyItemCatalog({
                        itemId: savedItem.id,
                        brandId: selectedBrandId,
                        path: selectedPath
                    });
                }
            } catch (classificationError) {
                console.warn('Brand classification enqueue failed:', classificationError);
            }

            const shouldSyncRentalBlocks =
                commerceService.enabled() &&
                isUuidLike(savedItem.id) &&
                (
                    formData.listingType === 'rent' ||
                    formData.listingType === 'both' ||
                    sourceItemSnapshot?.listingType === 'rent' ||
                    sourceItemSnapshot?.listingType === 'both'
                );

            if (shouldSyncRentalBlocks) {
                setIsSyncingRentalBlocks(true);
                try {
                    const payload =
                        formData.listingType === 'rent' || formData.listingType === 'both'
                            ? buildRentalBlockDrafts(formData.bookedDates || [])
                            : [];
                    const synced = await commerceService.replaceRentalBlocks(savedItem.id, payload);
                    const syncedDates = expandRentalBlockDates(synced.blocks || []);
                    setFormData((prev) => ({ ...prev, bookedDates: syncedDates }));
                    setRentalBlockNotice(
                        formData.listingType === 'rent' || formData.listingType === 'both'
                            ? syncedDates.length > 0
                                ? `Live calendar synced across ${syncedDates.length} blocked day${syncedDates.length === 1 ? '' : 's'}.`
                                : 'Live calendar synced with no manual blackout windows.'
                            : 'Manual blackout windows were cleared from the live rental calendar.'
                    );
                } catch (syncError) {
                    console.error('Rental block sync failed:', syncError);
                    rentalBlockSyncFailed = true;
                    rentalBlockSyncMessage = 'Listing saved, but the live availability calendar could not sync. Review the calendar and save again.';
                    setRentalBlockNotice(rentalBlockSyncMessage);
                } finally {
                    setIsSyncingRentalBlocks(false);
                }
            }

            if (rentalBlockSyncFailed) {
                setFormMode('edit');
                setEditingItemId(savedItem.id);
                setSourceItemSnapshot(savedItem);
                showNotification(rentalBlockSyncMessage);
                navigate(`/profile/products/new?edit=${savedItem.id}`, { replace: true });
                return;
            }

            if (formMode === 'edit') {
                showNotification(status === 'published' ? 'Listing updated and published.' : 'Listing updated and saved to drafts.');
            } else if (formMode === 'duplicate') {
                showNotification(status === 'published' ? 'Duplicate listing published.' : 'Duplicate saved to drafts.');
            } else {
                showNotification(status === 'published' ? "Your product is listed!" : "Saved to drafts!");
            }
            if (status === 'published') {
                navigate(`/item/${savedItem.id}`);
            } else {
                navigate('/profile/products');
            }
        } catch (e) {
            console.error('Failed to save product:', e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            showNotification(`Failed to save product. ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
             // @ts-ignore
             setFormData(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked}));
             return;
        }
        
        if (type === 'number') {
            setFormData(prev => ({...prev, [name]: value === '' ? 0 : parseFloat(value)}));
            return;
        }

        setFormData(prev => ({...prev, [name]: value}));
    }

    const handleBrandSelectChange = (value: string) => {
        if (!value) {
            setFormData((prev) => ({
                ...prev,
                brandId: null,
                brandCatalogNodeId: null,
                brandCatalogPath: '',
                brand: prev.brand || ''
            }));
            setBrandLineOptions([]);
            setBrandLineMode('catalog');
            return;
        }

        const selected = brandOptions.find((entry) => entry.id === value);
        setFormData((prev) => ({
            ...prev,
            brandId: value,
            brand: selected?.name || prev.brand,
            brandCatalogNodeId: null,
            brandCatalogPath: ''
        }));
        setBrandLineMode('catalog');
    };

    const handleBrandLineSelectChange = (value: string) => {
        if (!value) {
            setFormData((prev) => ({ ...prev, brandCatalogNodeId: null, brandCatalogPath: '' }));
            setBrandLineMode('catalog');
            return;
        }
        if (value === '__other__') {
            setBrandLineMode('other');
            setFormData((prev) => ({ ...prev, brandCatalogNodeId: null }));
            return;
        }
        const selected = brandLineOptions.find((entry) => entry.id === value);
        setBrandLineMode('catalog');
        setFormData((prev) => ({
            ...prev,
            brandCatalogNodeId: value,
            brandCatalogPath: selected?.path || prev.brandCatalogPath || ''
        }));
    };

    const handleSuggestBrand = async () => {
        const rawBrand = String(formData.brand || '').trim();
        if (!rawBrand) {
            showNotification('Enter a brand name first, then submit suggestion.');
            return;
        }
        if (!user) {
            showNotification('Sign in is required to submit a brand suggestion.');
            return;
        }

        setIsBrandSuggesting(true);
        try {
            await brandService.suggestBrand({
                brand: rawBrand,
                line: String((formData as any).brandCatalogPath || '').trim() || undefined,
                notes: String(brandSuggestionNotes || '').trim() || undefined
            });
            setShowBrandSuggestion(false);
            setBrandSuggestionNotes('');
            showNotification('Brand suggestion submitted for moderation review.');
        } catch (error: any) {
            showNotification(error?.message || 'Unable to submit brand suggestion.');
        } finally {
            setIsBrandSuggesting(false);
        }
    };

    const handleRentalRateChange = (rateType: 'hourly' | 'daily' | 'weekly', value: string) => {
        const numVal = parseFloat(value) || 0;
        setFormData(prev => ({
            ...prev,
            rentalRates: {
                ...prev.rentalRates,
                [rateType]: numVal
            },
            // Update legacy field for backward compat if daily is changed
            ...(rateType === 'daily' && { rentalPrice: numVal })
        }));
    };

    const handleRentalFulfillmentToggle = (mode: 'pickup' | 'shipping') => {
        setFormData((prev) => {
            const current = normalizeRentalFulfillment(prev.rentalFulfillment);
            const next = { ...current, [mode]: !current[mode] };
            const hasAny = next.pickup || next.shipping;
            const defaultMode =
                current.defaultMode === mode && !next[mode]
                    ? next.pickup
                        ? 'pickup'
                        : 'shipping'
                    : current.defaultMode;

            return {
                ...prev,
                rentalFulfillment: {
                    pickup: hasAny ? next.pickup : true,
                    shipping: hasAny ? next.shipping : false,
                    defaultMode: hasAny ? defaultMode : 'pickup'
                }
            };
        });
    };

    const handleRentalDefaultModeChange = (mode: 'pickup' | 'shipping') => {
        setFormData((prev) => ({
            ...prev,
            rentalFulfillment: {
                ...normalizeRentalFulfillment(prev.rentalFulfillment),
                defaultMode: mode
            }
        }));
    };
    
    // Handler for manual blackout dates (Seller Mode)
    const handleBlackoutDate = (date: string) => {
        setFormData(prev => {
            const currentBooked = prev.bookedDates || [];
            const newBooked = currentBooked.includes(date)
                ? currentBooked.filter(d => d !== date)
                : [...currentBooked, date];
            return { ...prev, bookedDates: newBooked };
        });
    };

    const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
        const newSpecs = [...formData.specifications];
        newSpecs[index][field] = value;
        setFormData(prev => ({...prev, specifications: newSpecs}));
    };
    const addSpec = () => setFormData(prev => ({...prev, specifications: [...prev.specifications, { key: '', value: '' }]}));

    const updateStringList = (field: 'features' | 'packageContents' | 'careInstructions' | 'certifications', index: number, value: string) => {
        const current = [...(formData[field] || [])];
        current[index] = value;
        setFormData(prev => ({ ...prev, [field]: current }));
    };

    const addStringListItem = (field: 'features' | 'packageContents' | 'careInstructions' | 'certifications') => {
        setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), ''] }));
    };

    const removeStringListItem = (field: 'features' | 'packageContents' | 'careInstructions' | 'certifications', index: number) => {
        setFormData(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
    };

    const updateReturnPolicy = (patch: Partial<NonNullable<WizardFormData['returnPolicy']>>) => {
        setFormData(prev => ({
            ...prev,
            returnPolicy: {
                windowDays: prev.returnPolicy?.windowDays ?? 14,
                conditions: prev.returnPolicy?.conditions || [],
                ...patch
            }
        }));
    };

    const updateWarranty = (patch: Partial<NonNullable<WizardFormData['warranty']>>) => {
        setFormData(prev => ({
            ...prev,
            warranty: {
                coverage: prev.warranty?.coverage || '',
                ...patch
            }
        }));
    };

    const updateShippingEstimate = (index: number, field: 'minDays' | 'maxDays' | 'carrier' | 'serviceLevel' | 'cost', value: string) => {
        const next = [...(formData.shippingEstimates || [])];
        const current = next[index] || { minDays: 0, maxDays: 0 };
        next[index] = {
            ...current,
            [field]: field === 'minDays' || field === 'maxDays' || field === 'cost' ? parseFloat(value) || 0 : value
        };
        setFormData(prev => ({ ...prev, shippingEstimates: next }));
    };

    const addShippingEstimate = () => {
        setFormData(prev => ({
            ...prev,
            shippingEstimates: [...(prev.shippingEstimates || []), { minDays: 0, maxDays: 0, carrier: '', serviceLevel: '', cost: 0 }]
        }));
    };

    const removeShippingEstimate = (index: number) => {
        setFormData(prev => ({
            ...prev,
            shippingEstimates: (prev.shippingEstimates || []).filter((_, i) => i !== index)
        }));
    };

    const handleMouseEnterCategory = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setShowCreateCategory(true);
        }, 1000);
    };

    const handleMouseLeaveCategory = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    const handleCategoryCreated = async (parentCategoryId: string, newCategoryName: string) => {
        try {
            const newCategory = await addCategory(newCategoryName, parentCategoryId);
            setFormData(prev => ({ ...prev, category: newCategory.id }));
            setShowCreateCategory(false);
        } catch (error) {
            console.error(error);
            showNotification(error instanceof Error ? error.message : "Failed to create category.");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newImageUrls = [...formData.imageUrls || []];
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    newImageUrls.push(reader.result);
                    if (newImageUrls.length === (formData.imageUrls?.length || 0) + files.length) {
                        setFormData(prev => ({ ...prev, imageUrls: newImageUrls }));
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls?.filter((_, i) => i !== index) }));
    };

    const openBgModal = (url: string, index: number) => {
        setImageToEdit({ url, index });
        setIsBgModalOpen(true);
    };

    const handleImageUpdate = (newImageUrl: string) => {
        if (imageToEdit) {
            const updatedUrls = [...formData.imageUrls!];
            updatedUrls[imageToEdit.index] = newImageUrl;
            setFormData(prev => ({ ...prev, imageUrls: updatedUrls }));
        }
        setIsBgModalOpen(false);
        setImageToEdit(null);
    };
    
    const handleAIPostApply = (data: any) => {
        setFormData(prev => ({
            ...prev,
            title: data.title,
            description: data.description,
            category: data.category,
            salePrice: data.price,
            imageUrls: [data.imageUrl, ...(prev.imageUrls || [])],
        }));
        setIsAIPostModalOpen(false);
    };

    const handleWeightSelect = (cls: 'small' | 'medium' | 'large' | 'custom') => {
        setFormData(prev => ({ ...prev, shippingWeightClass: cls }));
    };

    const listingModeTitle =
        formMode === 'edit' ? 'Editing Listing' : formMode === 'duplicate' ? 'Duplicating Listing' : 'New Listing';
    const listingModeSubtitle =
        formMode === 'edit'
            ? 'Update your listing details and lifecycle status.'
            : formMode === 'duplicate'
                ? 'Using an existing listing as a template for a new draft.'
                : 'List an item for sale, rent, or both.';

    if (isHydratingListing) {
        return (
            <div className="bg-gray-50/50 dark:bg-dark-background min-h-screen py-20">
                <div className="container mx-auto flex items-center justify-center">
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
                        <Spinner size="sm" />
                        <p className="text-sm font-semibold text-text-primary">Loading listing data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50/50 dark:bg-dark-background min-h-screen py-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                     <div className="flex items-center gap-4">
                         <BackButton />
                         <div>
                            <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-dark-text">{listingModeTitle}</h1>
                            <p className="text-gray-500 dark:text-gray-400">{listingModeSubtitle}</p>
                         </div>
                     </div>
                     <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setIsAIPostModalOpen(true)} className="px-4 py-2 text-xs sm:text-sm bg-purple-50 text-purple-700 font-bold rounded-lg flex items-center gap-2 hover:bg-purple-100 border border-purple-200 transition-colors shadow-sm">
                            <SparklesIcon /> Generate with AI
                        </button>
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
                        <button
                            type="button"
                            onClick={() => handlePublish('draft')}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs sm:text-sm bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 font-bold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePublish('published')}
                            disabled={isSubmitting}
                            className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-black/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? <Spinner size="sm" className="w-4 h-4" /> : null}
                            {isSubmitting ? 'Publishing...' : 'Publish Now'}
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <FormCard title="Product Details" subtitle="Accurate information helps buyers find your item.">
                            <Input name="title" placeholder="Product Title" value={formData.title} onChange={handleChange} />
                            <Textarea name="description" placeholder="Product Description... Include key details about condition and features." value={formData.description} onChange={handleChange} rows={6} />
                            
                            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-background rounded-xl border border-gray-200 dark:border-gray-700">
                                 <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Key Features & Highlights</h4>
                                 <div className="space-y-2">
                                    {formData.features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="text-green-500 flex-shrink-0">✓</div>
                                            <Input value={feature} onChange={e => {
                                                const newFeatures = [...formData.features];
                                                newFeatures[index] = e.target.value;
                                                setFormData(prev => ({...prev, features: newFeatures}));
                                            }} placeholder={`Feature ${index + 1}`} />
                                        </div>
                                    ))}
                                 </div>
                                <button onClick={() => setFormData(prev => ({...prev, features: [...prev.features, '']}))} className="text-sm font-bold text-primary hover:underline mt-3 inline-block">+ Add another feature</button>
                            </div>

                             <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-background rounded-xl border border-gray-200 dark:border-gray-700">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Technical Specifications</h4>
                                <div className="space-y-2">
                                    {formData.specifications.map((spec, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                            <div className="w-full sm:w-1/3">
                                                <Input value={spec.key} onChange={e => handleSpecChange(index, 'key', e.target.value)} placeholder="Label (e.g. Weight)" />
                                            </div>
                                            <div className="flex-1">
                                                <Input value={spec.value} onChange={e => handleSpecChange(index, 'value', e.target.value)} placeholder="Value (e.g. 5kg)" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addSpec} className="text-sm font-bold text-primary hover:underline mt-3 inline-block">+ Add specification row</button>
                            </div>
                        </FormCard>
                        
                         <FormCard title="Media" subtitle="Upload high-quality images. The first image will be the cover.">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {formData.imageUrls?.map((url, index) => (
                                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                                        <img src={url} alt={`upload preview ${index + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button type="button" onClick={() => openBgModal(url, index)} className="text-white text-xs font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded backdrop-blur-md">Edit</button>
                                            <button type="button" onClick={() => handleRemoveImage(index)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon /></button>
                                        </div>
                                        {index === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-bold text-center py-1">COVER</span>}
                                    </div>
                                ))}
                                <label className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group">
                                    <div className="text-gray-400 group-hover:text-primary transition-colors"><UploadIcon /></div>
                                    <span className="text-xs mt-2 font-bold text-gray-500 group-hover:text-primary">Upload</span>
                                    <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </label>
                            </div>
                            <div className="mt-4">
                                <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Video URL (Optional)</label>
                                <Input name="videoUrl" placeholder="YouTube or Vimeo link" value={formData.videoUrl} onChange={handleChange} />
                            </div>
                        </FormCard>

                        {/* --- PRICING & TYPE SECTION (REFACTORED) --- */}
                        <FormCard title="Pricing & Listing Type">
                            {/* Tabs for Type */}
                            <div className="flex bg-gray-100 dark:bg-dark-background p-1 rounded-lg mb-6">
                                <button
                                    onClick={() => setFormData(p => ({ ...p, listingType: 'sale' }))}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.listingType === 'sale' ? 'bg-white dark:bg-dark-surface shadow text-black dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    For Sale
                                </button>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, listingType: 'rent' }))}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.listingType === 'rent' ? 'bg-white dark:bg-dark-surface shadow text-black dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    For Rent
                                </button>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, listingType: 'both' }))}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.listingType === 'both' ? 'bg-white dark:bg-dark-surface shadow text-black dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Sale + Rent
                                </button>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, listingType: 'auction' }))}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.listingType === 'auction' ? 'bg-white dark:bg-dark-surface shadow text-black dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Auction
                                </button>
                            </div>

                            {/* SALE INPUTS */}
                            {(formData.listingType === 'sale' || formData.listingType === 'both') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in-up">
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                                            Sale Price {formData.listingType === 'both' ? '(required)' : ''}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <Input name="salePrice" type="number" placeholder="0.00" value={formData.salePrice} onChange={handleChange} className="pl-8" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Original Price (optional)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <Input name="compareAtPrice" type="number" placeholder="0.00" value={formData.compareAtPrice} onChange={handleChange} className="pl-8" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RENT INPUTS */}
                            {(formData.listingType === 'rent' || formData.listingType === 'both') && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Hourly Rate</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <Input type="number" placeholder="0.00" value={formData.rentalRates.hourly || ''} onChange={e => handleRentalRateChange('hourly', e.target.value)} className="pl-8" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Daily Rate</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <Input type="number" placeholder="0.00" value={formData.rentalRates.daily || ''} onChange={e => handleRentalRateChange('daily', e.target.value)} className="pl-8" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Weekly Rate</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <Input type="number" placeholder="0.00" value={formData.rentalRates.weekly || ''} onChange={e => handleRentalRateChange('weekly', e.target.value)} className="pl-8" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="relative group">
                                            <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block flex items-center gap-1">
                                                Security Deposit
                                                <div className="relative group cursor-pointer">
                                                    <HelpIcon />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black text-white text-xs p-2 rounded shadow-lg z-10 text-center">
                                                        This amount is held and returned after the item is returned safely.
                                                    </div>
                                                </div>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <Input name="securityDeposit" type="number" placeholder="0.00" value={formData.securityDeposit} onChange={handleChange} className="pl-8" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Min Duration (Hours)</label>
                                            <Input name="minRentalDuration" type="number" placeholder="24" value={formData.minRentalDuration} onChange={handleChange} />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-dark-background/60">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Rental fulfillment</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Choose how buyers can receive the rental and whether it can auto-confirm.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRentalFulfillmentToggle('pickup')}
                                                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                                                        formData.rentalFulfillment?.pickup
                                                            ? 'bg-black text-white dark:bg-white dark:text-black'
                                                            : 'bg-white text-gray-600 shadow-sm dark:bg-dark-surface dark:text-gray-300'
                                                    }`}
                                                >
                                                    Pickup
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRentalFulfillmentToggle('shipping')}
                                                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                                                        formData.rentalFulfillment?.shipping
                                                            ? 'bg-black text-white dark:bg-white dark:text-black'
                                                            : 'bg-white text-gray-600 shadow-sm dark:bg-dark-surface dark:text-gray-300'
                                                    }`}
                                                >
                                                    Shipping
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300">Default delivery mode</label>
                                                <Select
                                                    value={normalizeRentalFulfillment(formData.rentalFulfillment).defaultMode}
                                                    onChange={(event) => handleRentalDefaultModeChange(event.target.value as 'pickup' | 'shipping')}
                                                >
                                                    {normalizeRentalFulfillment(formData.rentalFulfillment).pickup ? <option value="pickup">Pickup</option> : null}
                                                    {normalizeRentalFulfillment(formData.rentalFulfillment).shipping ? <option value="shipping">Shipping</option> : null}
                                                </Select>
                                            </div>
                                            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-dark-surface">
                                                <input
                                                    name="isInstantBook"
                                                    type="checkbox"
                                                    checked={Boolean(formData.isInstantBook)}
                                                    onChange={handleChange}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300"
                                                />
                                                <span>
                                                    <span className="block font-bold text-gray-900 dark:text-white">Instant book</span>
                                                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">If off, the seller confirms each rental before handoff. This setting only applies to rentals.</span>
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="rounded-2xl border border-gray-200 bg-gray-50/90 p-4 dark:border-gray-700 dark:bg-dark-background/60">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Server-enforced availability</p>
                                                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                        {isLoadingRentalBlocks
                                                            ? 'Loading blackout windows from the live rental calendar...'
                                                            : isSyncingRentalBlocks
                                                                ? 'Syncing manual blackout windows to the live rental calendar...'
                                                                : rentalBlockNotice || 'Manual blackout dates are validated again on the backend during rental checkout.'}
                                                    </p>
                                                </div>
                                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-700 shadow-sm dark:bg-dark-surface dark:text-gray-200">
                                                    {formData.bookedDates?.length || 0} blocked days
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCalendarOpen((prev) => !prev)}
                                                disabled={isLoadingRentalBlocks || isSyncingRentalBlocks}
                                                className="mt-4 w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-bold text-gray-600 transition-colors hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-400 dark:hover:border-white dark:hover:text-white"
                                            >
                                                {isLoadingRentalBlocks ? 'Loading availability...' : isSyncingRentalBlocks ? 'Syncing availability...' : 'Manage Availability Calendar'}
                                            </button>
                                        </div>
                                        {formMode === 'duplicate' ? (
                                            <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                Duplicated listings keep their own live availability. Review blocked dates before publishing the copy.
                                            </p>
                                        ) : null}
                                        {isCalendarOpen && (
                                            <div className="mt-2 p-4 bg-white dark:bg-dark-surface shadow-lg rounded-lg border dark:border-gray-700 relative z-10">
                                                <Calendar 
                                                    onClose={() => setCalendarOpen(false)} 
                                                    bookedDates={formData.bookedDates}
                                                    mode="multi"
                                                    onBlackoutDate={handleBlackoutDate}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                             {/* AUCTION INPUTS */}
                            {formData.listingType === 'auction' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in-up">
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Starting Bid</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <Input name="startingBid" type="number" placeholder="0.00" value={formData.startingBid} onChange={handleChange} className="pl-8" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Buy Now Price (Optional)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <Input name="buyNowPrice" type="number" placeholder="0.00" value={formData.buyNowPrice} onChange={handleChange} className="pl-8" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Reserve Price (Hidden)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <Input name="reservePrice" type="number" placeholder="0.00" value={formData.reservePrice} onChange={handleChange} className="pl-8" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">End Date & Time</label>
                                        <Input name="auctionEndTime" type="datetime-local" value={formData.auctionEndTime} onChange={handleChange} />
                                    </div>
                                </div>
                            )}

                             {/* Earnings Preview */}
                             <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-background border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Earnings Preview</h4>
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span>Listing Price:</span>
                                        <span>{formatCurrency(currentPrice || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        <span>Platform Fee (10%):</span>
                                        <span className="text-red-500">-{formatCurrency(fee)}</span>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                                    <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                                        <span>Estimated Payout:</span>
                                        <span className="text-green-600">{formatCurrency(payout)}</span>
                                    </div>
                                </div>
                        </FormCard>

                        <FormCard title="Shipping & Delivery">
                             {(!storefront?.shippingSettings && (formData.listingType === 'sale' || formData.listingType === 'both' || formData.listingType === 'auction')) && (
                                <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>No Shipping Address Found.</strong> You need to set a ship-from address in your profile settings before listing physical items for sale.
                                </div>
                             )}

                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Who pays for shipping?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <button 
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, whoPaysShipping: 'buyer' }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${formData.whoPaysShipping === 'buyer' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                     >
                                         <div className="font-bold">Buyer Pays</div>
                                         <div className="text-xs opacity-70">Added to checkout total</div>
                                     </button>
                                      <button 
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, whoPaysShipping: 'seller' }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${formData.whoPaysShipping === 'seller' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                     >
                                         <div className="font-bold">Free Shipping</div>
                                         <div className="text-xs opacity-70">You cover the cost</div>
                                     </button>
                                </div>
                            </div>

                             {formData.whoPaysShipping === 'buyer' && (
                                 <div className="space-y-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Package Weight</label>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                         {[
                                             { id: 'small', label: '< 1 lb', sub: 'T-shirt, Phone', icon: <TShirtIcon /> },
                                             { id: 'medium', label: '1-5 lbs', sub: 'Shoes, Laptop', icon: <BoxIcon /> },
                                             { id: 'large', label: '5-20 lbs', sub: 'Monitor, Coat', icon: <CrateIcon /> },
                                             { id: 'custom', label: 'Custom', sub: 'Enter manually', icon: <EditIcon /> },
                                         ].map((option) => (
                                             <button 
                                                 key={option.id}
                                                 type="button"
                                                 onClick={() => handleWeightSelect(option.id as any)}
                                                 className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formData.shippingWeightClass === option.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-500'}`}
                                             >
                                                 {option.icon}
                                                 <div className="text-center">
                                                     <div className="font-bold text-sm">{option.label}</div>
                                                     <div className="text-[10px] opacity-70">{option.sub}</div>
                                                 </div>
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             )}

                             {formData.shippingWeightClass === 'custom' && (
                                 <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-background rounded-lg border border-gray-200 dark:border-gray-700">
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                         <div>
                                             <label className="text-xs font-bold uppercase mb-1 block">Weight (lbs)</label>
                                             <Input type="number" placeholder="0.0" />
                                         </div>
                                         <div>
                                              <label className="text-xs font-bold uppercase mb-1 block">Dimensions (LxWxH)</label>
                                              <div className="flex gap-2">
                                                  <Input type="number" placeholder="L" />
                                                  <Input type="number" placeholder="W" />
                                                  <Input type="number" placeholder="H" />
                                              </div>
                                         </div>
                                     </div>
                                 </div>
                             )}
                        </FormCard>

                        <FormCard title="Fulfillment & Compliance" subtitle="Power your dropship, 3PL, or in-house flow.">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Fulfillment Type</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { id: 'in_house', label: 'In-House' },
                                        { id: 'dropship', label: 'Dropship' },
                                        { id: '3pl', label: '3PL' }
                                    ].map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, fulfillmentType: option.id as any }))}
                                            className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${formData.fulfillmentType === option.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(formData.fulfillmentType === 'dropship' || formData.fulfillmentType === '3pl') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Supplier / Partner</label>
                                        <Input
                                            value={formData.supplierInfo?.name || ''}
                                            onChange={e => setFormData(p => ({ ...p, supplierInfo: { ...p.supplierInfo, name: e.target.value } }))}
                                            placeholder="e.g. Prime Supplier Co."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Processing Time (days)</label>
                                        <Input
                                            type="number"
                                            value={formData.supplierInfo?.processingTimeDays || 0}
                                            onChange={e => setFormData(p => ({ ...p, supplierInfo: { ...p.supplierInfo, processingTimeDays: parseFloat(e.target.value) || 0 } }))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Origin Country</label>
                                    <Input name="originCountry" placeholder="Country of origin" value={formData.originCountry} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Origin City</label>
                                    <Input name="originCity" placeholder="City" value={formData.originCity} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Length (in)</label>
                                    <Input
                                        type="number"
                                        value={formData.dimensionsIn?.l || 0}
                                        onChange={e => setFormData(p => ({ ...p, dimensionsIn: { ...(p.dimensionsIn || { l: 0, w: 0, h: 0 }), l: parseFloat(e.target.value) || 0 } }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Width (in)</label>
                                    <Input
                                        type="number"
                                        value={formData.dimensionsIn?.w || 0}
                                        onChange={e => setFormData(p => ({ ...p, dimensionsIn: { ...(p.dimensionsIn || { l: 0, w: 0, h: 0 }), w: parseFloat(e.target.value) || 0 } }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Height (in)</label>
                                    <Input
                                        type="number"
                                        value={formData.dimensionsIn?.h || 0}
                                        onChange={e => setFormData(p => ({ ...p, dimensionsIn: { ...(p.dimensionsIn || { l: 0, w: 0, h: 0 }), h: parseFloat(e.target.value) || 0 } }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Weight (lbs)</label>
                                <Input
                                    type="number"
                                    value={formData.weightLbs || 0}
                                    onChange={e => setFormData(p => ({ ...p, weightLbs: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Certifications</label>
                                <div className="space-y-2">
                                    {formData.certifications.map((cert, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={cert}
                                                placeholder="e.g. CE, FCC, Fair Trade"
                                                onChange={e => updateStringList('certifications', index, e.target.value)}
                                            />
                                            <button type="button" onClick={() => removeStringListItem('certifications', index)} className="p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addStringListItem('certifications')} className="text-sm font-semibold text-primary">+ Add certification</button>
                                </div>
                            </div>
                        </FormCard>

                        <FormCard title="Policies & Protection" subtitle="Set return and warranty expectations.">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Return Window (days)</label>
                                    <Input
                                        type="number"
                                        value={formData.returnPolicy?.windowDays || 0}
                                        onChange={e => updateReturnPolicy({ windowDays: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Restocking Fee (%)</label>
                                    <Input
                                        type="number"
                                        value={formData.returnPolicy?.restockingFeePercent || 0}
                                        onChange={e => updateReturnPolicy({ restockingFeePercent: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Return Shipping Paid By</label>
                                <Select
                                    value={formData.returnPolicy?.returnShippingPaidBy || 'buyer'}
                                    onChange={e => updateReturnPolicy({ returnShippingPaidBy: e.target.value as any })}
                                >
                                    <option value="buyer">Buyer</option>
                                    <option value="seller">Seller</option>
                                    <option value="platform">Platform</option>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Return Conditions</label>
                                <div className="space-y-2">
                                    {(formData.returnPolicy?.conditions || []).map((condition, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={condition}
                                                placeholder="e.g. Original packaging required"
                                                onChange={e => updateReturnPolicy({ conditions: (formData.returnPolicy?.conditions || []).map((c, i) => i === index ? e.target.value : c) })}
                                            />
                                            <button type="button" onClick={() => updateReturnPolicy({ conditions: (formData.returnPolicy?.conditions || []).filter((_, i) => i !== index) })} className="p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => updateReturnPolicy({ conditions: [...(formData.returnPolicy?.conditions || []), ''] })} className="text-sm font-semibold text-primary">+ Add condition</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Warranty Coverage</label>
                                    <Input
                                        value={formData.warranty?.coverage || ''}
                                        onChange={e => updateWarranty({ coverage: e.target.value })}
                                        placeholder="e.g. Manufacturer defects"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Warranty Duration (months)</label>
                                    <Input
                                        type="number"
                                        value={formData.warranty?.durationMonths || 0}
                                        onChange={e => updateWarranty({ durationMonths: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Warranty Provider</label>
                                <Select
                                    value={formData.warranty?.provider || 'seller'}
                                    onChange={e => updateWarranty({ provider: e.target.value as any })}
                                >
                                    <option value="seller">Seller</option>
                                    <option value="manufacturer">Manufacturer</option>
                                    <option value="platform">Platform</option>
                                </Select>
                            </div>
                        </FormCard>

                        <FormCard title="Packaging & Care" subtitle="Show exactly what customers receive.">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Package Contents</label>
                                <div className="space-y-2">
                                    {formData.packageContents.map((content, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input value={content} onChange={e => updateStringList('packageContents', index, e.target.value)} placeholder="e.g. Charger, Manual" />
                                            <button type="button" onClick={() => removeStringListItem('packageContents', index)} className="p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addStringListItem('packageContents')} className="text-sm font-semibold text-primary">+ Add item</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Care Instructions</label>
                                <div className="space-y-2">
                                    {formData.careInstructions.map((care, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input value={care} onChange={e => updateStringList('careInstructions', index, e.target.value)} placeholder="e.g. Hand wash only" />
                                            <button type="button" onClick={() => removeStringListItem('careInstructions', index)} className="p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addStringListItem('careInstructions')} className="text-sm font-semibold text-primary">+ Add instruction</button>
                                </div>
                            </div>
                        </FormCard>

                        <FormCard title="Delivery Options" subtitle="Give customers precise ETA windows.">
                            <div className="space-y-4">
                                {(formData.shippingEstimates || []).map((estimate, index) => (
                                    <div key={index} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 items-end">
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">Min Days</label>
                                            <Input type="number" value={estimate.minDays} onChange={e => updateShippingEstimate(index, 'minDays', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">Max Days</label>
                                            <Input type="number" value={estimate.maxDays} onChange={e => updateShippingEstimate(index, 'maxDays', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">Carrier</label>
                                            <Input value={estimate.carrier || ''} onChange={e => updateShippingEstimate(index, 'carrier', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">Service</label>
                                            <Input value={estimate.serviceLevel || ''} onChange={e => updateShippingEstimate(index, 'serviceLevel', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-1 block">Cost</label>
                                            <Input type="number" value={estimate.cost || 0} onChange={e => updateShippingEstimate(index, 'cost', e.target.value)} />
                                        </div>
                                        <div className="col-span-5 flex justify-end">
                                            <button type="button" onClick={() => removeShippingEstimate(index)} className="text-sm font-semibold text-red-600">Remove</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addShippingEstimate} className="text-sm font-semibold text-primary">+ Add delivery option</button>
                            </div>
                        </FormCard>

                        <FormCard title="Affiliate & Creator Program" subtitle="Let creators promote your listing.">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">Enable Affiliate Commissions</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Creators earn a share of each sale they drive.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.affiliateEligibility?.enabled || false}
                                    onChange={e => setFormData(p => ({ ...p, affiliateEligibility: { ...p.affiliateEligibility, enabled: e.target.checked } }))}
                                />
                            </div>
                            {formData.affiliateEligibility?.enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Commission (%)</label>
                                        <Input
                                            type="number"
                                            value={formData.affiliateEligibility?.commissionRate || 0}
                                            onChange={e => setFormData(p => ({ ...p, affiliateEligibility: { ...p.affiliateEligibility, commissionRate: parseFloat(e.target.value) || 0 } }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Cookie Window (days)</label>
                                        <Input
                                            type="number"
                                            value={formData.affiliateEligibility?.cookieWindowDays || 0}
                                            onChange={e => setFormData(p => ({ ...p, affiliateEligibility: { ...p.affiliateEligibility, cookieWindowDays: parseFloat(e.target.value) || 0 } }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Creators</label>
                                        <Select
                                            value={formData.affiliateEligibility?.approvedCreatorsOnly ? 'approved' : 'open'}
                                            onChange={e => setFormData(p => ({ ...p, affiliateEligibility: { ...p.affiliateEligibility, approvedCreatorsOnly: e.target.value === 'approved' } }))}
                                        >
                                            <option value="open">Open to all</option>
                                            <option value="approved">Approved only</option>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </FormCard>

                        <FormCard title="Automation" subtitle="Let Urban Prime optimize pricing, restock, and promotions.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={formData.automation?.autoReprice || false}
                                        onChange={e => setFormData(p => ({ ...p, automation: { ...p.automation, autoReprice: e.target.checked } }))}
                                    />
                                    <div>
                                        <p className="font-bold text-text-primary">Auto‑Reprice</p>
                                        <p className="text-xs text-text-secondary">Match market demand to stay competitive.</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={formData.automation?.autoRestock || false}
                                        onChange={e => setFormData(p => ({ ...p, automation: { ...p.automation, autoRestock: e.target.checked } }))}
                                    />
                                    <div>
                                        <p className="font-bold text-text-primary">Auto‑Restock</p>
                                        <p className="text-xs text-text-secondary">Low stock alerts + supplier sync.</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={formData.automation?.autoPromote || false}
                                        onChange={e => setFormData(p => ({ ...p, automation: { ...p.automation, autoPromote: e.target.checked } }))}
                                    />
                                    <div>
                                        <p className="font-bold text-text-primary">Auto‑Promote</p>
                                        <p className="text-xs text-text-secondary">Boost listings that are trending.</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={formData.automation?.autoFulfill || false}
                                        onChange={e => setFormData(p => ({ ...p, automation: { ...p.automation, autoFulfill: e.target.checked } }))}
                                    />
                                    <div>
                                        <p className="font-bold text-text-primary">Auto‑Fulfill</p>
                                        <p className="text-xs text-text-secondary">Send orders to suppliers instantly.</p>
                                    </div>
                                </label>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-text-secondary mb-2">Minimum Margin Guardrail (%)</label>
                                <Input
                                    type="number"
                                    value={formData.automation?.minMarginPercent || 0}
                                    onChange={e => setFormData(p => ({ ...p, automation: { ...p.automation, minMarginPercent: parseFloat(e.target.value) || 0 } }))}
                                />
                            </div>
                        </FormCard>
                    </div>

                    <div className="lg:col-span-1 space-y-8">
                        <div onMouseEnter={handleMouseEnterCategory} onMouseLeave={handleMouseLeaveCategory} className="relative">
                            <FormCard title="Organization">
                                <div>
                                    <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Category</label>
                                    <Select name="category" value={formData.category} onChange={handleChange} disabled={isLoadingCategories}>
                                        <option value="">{isLoadingCategories ? "Loading..." : "Select a category"}</option>
                                        {categories.map(cat => (
                                            <optgroup label={cat.name} key={cat.id}>
                                                {cat.subcategories?.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                                            </optgroup>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Brand</label>
                                    <div className="space-y-2">
                                        <Input
                                            name="brandSearch"
                                            placeholder="Search canonical brands"
                                            value={brandSearch}
                                            onChange={(event) => setBrandSearch(event.target.value)}
                                        />
                                        <Select
                                            value={String((formData as any).brandId || '')}
                                            onChange={(event) => handleBrandSelectChange(event.target.value)}
                                        >
                                            <option value="">{isBrandLoading ? 'Loading brands...' : 'Select canonical brand (optional)'}</option>
                                            {brandOptions.map((brand) => (
                                                <option key={brand.id} value={brand.id}>{brand.name}</option>
                                            ))}
                                        </Select>
                                        <Input
                                            name="brand"
                                            placeholder="Raw brand text (kept for compatibility)"
                                            value={formData.brand}
                                            onChange={handleChange}
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowBrandSuggestion((value) => !value)}
                                                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary hover:border-primary/60 hover:text-primary"
                                            >
                                                {showBrandSuggestion ? 'Close suggestion' : "Can't find brand?"}
                                            </button>
                                            <span className="text-[11px] text-text-secondary">Suggest a canonical brand for review.</span>
                                        </div>
                                        {showBrandSuggestion ? (
                                            <div className="rounded-xl border border-border bg-surface-soft p-3 space-y-2">
                                                <Input
                                                    value={brandSuggestionNotes}
                                                    onChange={(event) => setBrandSuggestionNotes(event.target.value)}
                                                    placeholder="Optional context: official website, category, alias..."
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isBrandSuggesting}
                                                    onClick={handleSuggestBrand}
                                                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-primary hover:border-primary/60 disabled:opacity-60"
                                                >
                                                    {isBrandSuggesting ? 'Submitting...' : 'Submit brand suggestion'}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                {(formData as any).brandId ? (
                                    <div>
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Brand Line / Subcategory</label>
                                        <div className="space-y-2">
                                            <Select
                                                value={brandLineMode === 'other' ? '__other__' : String((formData as any).brandCatalogNodeId || '')}
                                                onChange={(event) => handleBrandLineSelectChange(event.target.value)}
                                            >
                                                <option value="">Select brand line</option>
                                                {brandLineOptions.map((line) => (
                                                    <option key={line.id} value={line.id}>{line.label}</option>
                                                ))}
                                                <option value="__other__">Other under this brand</option>
                                            </Select>
                                            {brandLineMode === 'other' ? (
                                                <Input
                                                    name="brandCatalogPath"
                                                    placeholder="e.g. iphone/pro/iphone-15-pro"
                                                    value={String((formData as any).brandCatalogPath || '')}
                                                    onChange={handleChange}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                                 <div>
                                    <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Condition</label>
                                    <Select name="condition" value={formData.condition} onChange={handleChange}>
                                        <option value="new">New</option>
                                        <option value="used-like-new">Used - Like New</option>
                                        <option value="used-good">Used - Good</option>
                                        <option value="refurbished">Refurbished</option>
                                    </Select>
                                </div>
                                <div className="mt-4">
                                     <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Stock</label>
                                     <Input name="stock" type="number" placeholder="1" value={formData.stock} onChange={handleChange}/>
                                 </div>
                                 <div className="mt-4">
                                     <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">SKU (Optional)</label>
                                     <Input name="sku" placeholder="SKU-123" value={formData.sku} onChange={handleChange}/>
                                 </div>
                                {formData.listingType !== 'rent' && (
                                    <div className="mt-4">
                                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1 block">Due Date (For limited time items)</label>
                                        <Input name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} />
                                    </div>
                                )}
                            </FormCard>
                            {showCreateCategory && (
                                <CreateCategoryModal 
                                    onClose={() => setShowCreateCategory(false)}
                                    onCategoryCreated={handleCategoryCreated}
                                    parentCategories={categories.filter(c => c.subcategories)} // Only allow adding to parents with subcategories
                                />
                            )}
                        </div>
                    </div>
                </div>
                {isAIPostModalOpen && <AIPostGenerator onClose={() => setIsAIPostModalOpen(false)} onApply={handleAIPostApply} />}
                {isBgModalOpen && imageToEdit && <BackgroundRemovalModal imageUrl={imageToEdit.url} onClose={() => setIsBgModalOpen(false)} onImageUpdate={handleImageUpdate} />}
            </div>
        </div>
    );
};

export default ListItemPage;

