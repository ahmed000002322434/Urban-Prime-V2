import { randomUUID } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';

const PAYMENT_RAILS = ['stripe', 'paypal', 'razorpay', 'jazzcash', 'bank_transfer', 'local_bank'];
const SHIPPING_RAILS = ['shippo', 'easypost', 'self_managed', 'local_courier'];
const DEFAULT_CURRENCY = 'USD';
const PAYMENT_READY_STATUSES = ['authorized', 'paid', 'completed', 'succeeded'];
const DROPSHIP_ROUTING_MODES = ['manual_review', 'seller_approve', 'auto_submit'];
const DROPSHIP_APPROVAL_STATES = ['pending', 'approved', 'rejected', 'cancelled', 'not_required'];
const DROPSHIP_SETTLEMENT_STATUSES = ['draft', 'ready', 'settled', 'reversed'];
const DROPSHIP_SELLER_STATUSES = ['draft', 'pending', 'approved', 'suspended', 'rejected'];
const DROPSHIP_PRODUCT_VISIBILITY = ['approved_only', 'all_sellers', 'hidden'];
const DROPSHIP_PRODUCT_STATUSES = ['draft', 'active', 'paused', 'archived'];
const SUPPLIER_STATUSES = ['draft', 'active', 'paused', 'blocked'];
const SUPPLIER_FULFILLMENT_MODES = ['manual_email', 'manual_panel', 'api'];
const DROPSHIP_ORDER_ACTIVE_STATUSES = [
  'pending_review',
  'approved',
  'submitted',
  'accepted',
  'processing',
  'shipped'
];
const ACTIVE_RENTAL_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'ready_for_handoff',
  'in_transit',
  'active',
  'return_in_transit'
];
const ACTIVE_BLOCK_STATUSES = ['active'];
const WINNER_WINDOW_MINUTES = Math.max(
  15,
  Number.parseInt(String(process.env.COMMERCE_AUCTION_WINNER_WINDOW_MINUTES || '120'), 10) || 120
);
const RENTAL_STATUS_TO_LEGACY = {
  pending_confirmation: 'pending',
  confirmed: 'confirmed',
  ready_for_handoff: 'confirmed',
  in_transit: 'shipped',
  active: 'delivered',
  return_in_transit: 'returned',
  returned: 'returned',
  completed: 'completed',
  cancelled: 'cancelled'
};

const nowIso = () => new Date().toISOString();
const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );
const normalizeText = (value) => String(value || '').trim();
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
const uniqueStrings = (values) =>
  [...new Set((values || []).map((value) => normalizeText(value)).filter(Boolean))];
const parseMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
};
const jsonObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};
const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const toIso = (value, fallback = nowIso()) => parseDate(value)?.toISOString() || fallback;
const computeRentalDays = (startDate, endDate) => {
  const diff = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / 86400000));
};
const formatMoney = (amount, currency = DEFAULT_CURRENCY) =>
  `${parseMoney(amount).toFixed(2)} ${String(currency || DEFAULT_CURRENCY).toUpperCase()}`;
const normalizeDisputeStatusForDb = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'reviewing') return 'under_review';
  if (
    ['open', 'under_review', 'awaiting_response', 'resolved', 'rejected', 'closed'].includes(
      normalized
    )
  ) {
    return normalized;
  }
  return 'open';
};
const normalizeDisputeStatusForUi = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'under_review' ? 'reviewing' : normalized || 'open';
};
const list = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
const pickEnabledRails = (value, fallback) => {
  const parsed = list(value);
  if (!parsed.length) return fallback;
  const allowed = parsed.filter((entry) => fallback.includes(entry));
  return allowed.length ? allowed : fallback;
};
const isEmailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value).toLowerCase());
const deriveItemImages = (itemRow) => {
  const metadata = jsonObject(itemRow?.metadata);
  const pools = [metadata.imageUrls, metadata.images, metadata.galleryImageUrls];
  for (const pool of pools) {
    if (Array.isArray(pool) && pool.length) {
      return pool.map((entry) => String(entry || '')).filter(Boolean);
    }
  }
  return ['/icons/urbanprime.svg'];
};
const deriveItemImage = (itemRow) => deriveItemImages(itemRow)[0] || '/icons/urbanprime.svg';
const deriveCurrency = (itemRow, line = {}) =>
  normalizeText(firstDefined(line.currency, itemRow?.currency, jsonObject(itemRow?.metadata).currency)) ||
  DEFAULT_CURRENCY;
const deriveRentalRates = (itemRow, line = {}) => {
  const metadata = jsonObject(itemRow?.metadata);
  const lineRates = jsonObject(line.rentalRates);
  const metaRates = jsonObject(metadata.rentalRates);
  return {
    hourly: parseMoney(firstDefined(lineRates.hourly, metaRates.hourly, 0)),
    daily: parseMoney(
      firstDefined(lineRates.daily, metaRates.daily, line.rentalPrice, itemRow?.rental_price, 0)
    ),
    weekly: parseMoney(firstDefined(lineRates.weekly, metaRates.weekly, 0))
  };
};
const deriveRentalDeposit = (itemRow, line = {}) =>
  parseMoney(firstDefined(line.securityDeposit, jsonObject(itemRow?.metadata).securityDeposit, 0));
const deriveRentalFulfillment = (itemRow) => {
  const config = jsonObject(jsonObject(itemRow?.metadata).rentalFulfillment);
  return {
    pickup: Boolean(config.pickup),
    shipping: config.shipping !== false,
    defaultMode: config.defaultMode === 'pickup' ? 'pickup' : 'shipping'
  };
};
const deriveDeliveryMode = (itemRow, payload = {}) => {
  const requested = normalizeText(firstDefined(payload.deliveryMode, payload.delivery_mode)).toLowerCase();
  const fulfillment = deriveRentalFulfillment(itemRow);
  if (requested === 'pickup' && fulfillment.pickup) return 'pickup';
  if (requested === 'shipping' && fulfillment.shipping) return 'shipping';
  if (fulfillment.pickup && !fulfillment.shipping) return 'pickup';
  return 'shipping';
};
const deriveAuctionEndTime = (itemRow) => {
  const metadata = jsonObject(itemRow?.metadata);
  return normalizeText(firstDefined(itemRow?.auction_end_at, metadata.auctionDetails?.endTime));
};
const deriveStartingBid = (itemRow) => {
  const metadata = jsonObject(itemRow?.metadata);
  return parseMoney(
    firstDefined(itemRow?.auction_start_price, metadata.auctionDetails?.startingBid, 0)
  );
};
const deriveReservePrice = (itemRow) => {
  const metadata = jsonObject(itemRow?.metadata);
  return parseMoney(firstDefined(itemRow?.auction_reserve_price, metadata.reservePrice, 0));
};
const deriveBuyNowPrice = (itemRow) => {
  const metadata = jsonObject(itemRow?.metadata);
  return parseMoney(firstDefined(metadata.buyNowPrice, metadata.buy_now_price, 0));
};
const deriveInstantBook = (itemRow) => Boolean(jsonObject(itemRow?.metadata).isInstantBook);
const mapPaymentProvider = (method) => {
  const normalized = normalizeText(method).toLowerCase();
  if (!normalized) return 'stripe';
  if (normalized.includes('paypal')) return 'paypal';
  if (normalized.includes('razorpay')) return 'razorpay';
  if (normalized.includes('jazz')) return 'jazzcash';
  if (normalized.includes('bank')) return 'bank_transfer';
  if (normalized.includes('local_bank')) return 'local_bank';
  if (normalized.startsWith('pm_') || normalized.includes('card') || normalized === 'stripe') {
    return 'stripe';
  }
  return normalized;
};
const mapCheckoutPaymentStatus = (method) => {
  const provider = mapPaymentProvider(method);
  return ['stripe', 'paypal', 'razorpay'].includes(provider) ? 'authorized' : 'pending';
};
const mapLegacyStatus = (status) => RENTAL_STATUS_TO_LEGACY[String(status || '').toLowerCase()] || 'pending';
const normalizeAuctionProfileStatus = (status) => {
  const normalized = normalizeText(status).toLowerCase();
  if (normalized === 'counter_offer') return 'countered';
  return normalized || 'placed';
};

const createLocalRateLimiter = ({ windowMs, maxRequests, namespace }) => {
  const hitMap = new Map();
  const sweepMs = Math.max(10000, Number(windowMs || 60000));
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hitMap.entries()) {
      if (value.resetAt <= now) hitMap.delete(key);
    }
  }, sweepMs).unref?.();

  return (req, res, next) => {
    const key = `${namespace}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    const now = Date.now();
    const current = hitMap.get(key);
    if (!current || current.resetAt <= now) {
      hitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
    }
    current.count += 1;
    return next();
  };
};

const requireResolvedUser = async (req, res, getUserContext) => {
  const context = await getUserContext(req);
  if (context?.error || !context?.user?.id) {
    res.status(401).json({ error: context?.error?.message || 'Authentication required.' });
    return null;
  }
  return context;
};

const requireResolvedAdmin = async (req, res, resolveAdminContext) => {
  const context = await resolveAdminContext(req);
  if (context?.error || !context?.user?.id) {
    res.status(403).json({ error: context?.error?.message || 'Admin access is required.' });
    return null;
  }
  return context;
};

const fetchRowsByIds = async (supabase, table, ids, select) => {
  const cleanIds = uniqueStrings(ids).filter(isUuid);
  if (!cleanIds.length) return [];
  const { data, error } = await supabase.from(table).select(select).in('id', cleanIds);
  if (error) throw error;
  return data || [];
};

const fetchUserMap = async (supabase, ids) => {
  const rows = await fetchRowsByIds(supabase, 'users', ids, 'id,firebase_uid,name,email,avatar_url');
  return new Map(rows.map((row) => [String(row.id), row]));
};

const fetchItemMap = async (supabase, ids) => {
  const rows = await fetchRowsByIds(
    supabase,
    'items',
    ids,
    'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
  );
  return new Map(rows.map((row) => [String(row.id), row]));
};

const fetchShippingAddressMap = async (supabase, ids) => {
  const rows = await fetchRowsByIds(
    supabase,
    'shipping_addresses',
    ids,
    'id,user_id,name,line1,line2,city,state,postal_code,country,phone,is_default'
  );
  return new Map(rows.map((row) => [String(row.id), row]));
};

const insertNotification = async (
  supabase,
  userId,
  title,
  body,
  link = '/profile/orders',
  type = 'order'
) => {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId || !isUuid(normalizedUserId)) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: normalizedUserId,
    title: String(title || 'Commerce update'),
    body: String(body || ''),
    link: String(link || '/profile/orders'),
    type: String(type || 'order'),
    created_at: nowIso()
  });
  if (error) {
    console.warn('commerce notification insert failed:', error.message || error);
  }
};

const writeAudit = async (writeAuditLog, payload) => {
  if (typeof writeAuditLog !== 'function') return;
  try {
    await writeAuditLog(payload);
  } catch (error) {
    console.warn('commerce audit failed:', error?.message || error);
  }
};

const getFirestoreDb = (firebaseApp) => {
  if (!firebaseApp) return null;
  try {
    return getFirestore(firebaseApp);
  } catch {
    return null;
  }
};

const defaultDropshippingPlatformSettings = {
  enabled: true,
  requireApproval: true,
  allowAutoSubmit: true,
  catalogMode: 'managed',
  buyerRelationship: 'seller_only'
};

const normalizeDropshippingPlatformSettings = (value) => {
  const current = jsonObject(value);
  return {
    enabled: firstDefined(current.enabled, defaultDropshippingPlatformSettings.enabled) !== false,
    requireApproval:
      firstDefined(current.requireApproval, defaultDropshippingPlatformSettings.requireApproval) !== false,
    allowAutoSubmit:
      firstDefined(current.allowAutoSubmit, defaultDropshippingPlatformSettings.allowAutoSubmit) !== false,
    catalogMode: normalizeText(firstDefined(current.catalogMode, defaultDropshippingPlatformSettings.catalogMode)) || 'managed',
    buyerRelationship:
      normalizeText(firstDefined(current.buyerRelationship, defaultDropshippingPlatformSettings.buyerRelationship)) ||
      'seller_only'
  };
};

const normalizeDropshipRoutingMode = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return DROPSHIP_ROUTING_MODES.includes(normalized) ? normalized : 'seller_approve';
};

const normalizeDropshipApprovalState = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return DROPSHIP_APPROVAL_STATES.includes(normalized) ? normalized : 'pending';
};

const normalizeSellerDropshipStatus = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return DROPSHIP_SELLER_STATUSES.includes(normalized) ? normalized : 'draft';
};

const normalizeSupplierStatus = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return SUPPLIER_STATUSES.includes(normalized) ? normalized : 'draft';
};

const normalizeSupplierFulfillmentMode = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return SUPPLIER_FULFILLMENT_MODES.includes(normalized) ? normalized : 'manual_panel';
};

const normalizeProductVisibility = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return DROPSHIP_PRODUCT_VISIBILITY.includes(normalized) ? normalized : 'approved_only';
};

const normalizeProductStatus = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return DROPSHIP_PRODUCT_STATUSES.includes(normalized) ? normalized : 'active';
};

const normalizeSettlementStatus = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return DROPSHIP_SETTLEMENT_STATUSES.includes(normalized) ? normalized : 'draft';
};

const getDropshippingPlatformSettings = async (supabase) => {
  const { data, error } = await supabase.from('site_settings').select('*').eq('key', 'platform').maybeSingle();
  if (error) throw error;
  const value = jsonObject(data?.value);
  return {
    id: data?.id ? String(data.id) : null,
    key: 'platform',
    value,
    dropshipping: normalizeDropshippingPlatformSettings(value.dropshipping)
  };
};

const updateDropshippingPlatformSettings = async (supabase, patch) => {
  const current = await getDropshippingPlatformSettings(supabase);
  const nextDropshipping = normalizeDropshippingPlatformSettings({
    ...current.dropshipping,
    ...jsonObject(patch)
  });
  const nextValue = {
    ...current.value,
    dropshipping: nextDropshipping
  };
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ key: 'platform', value: nextValue }, { onConflict: 'key' })
    .select('*')
    .single();
  if (error) throw error;
  return {
    id: String(data.id),
    key: 'platform',
    value: jsonObject(data.value),
    dropshipping: nextDropshipping
  };
};

const mapSellerDropshipProfileRow = (row) => {
  const settings = jsonObject(row?.settings);
  return {
    id: String(row?.id || ''),
    sellerId: String(row?.seller_id || ''),
    sellerPersonaId: row?.seller_persona_id ? String(row.seller_persona_id) : null,
    status: normalizeSellerDropshipStatus(row?.status),
    approvedBy: row?.approved_by ? String(row.approved_by) : null,
    approvedAt: row?.approved_at ? toIso(row.approved_at) : null,
    riskNotes: row?.risk_notes ? String(row.risk_notes) : '',
    settings,
    createdAt: toIso(row?.created_at),
    updatedAt: toIso(row?.updated_at)
  };
};

const ensureSellerDropshipProfile = async (supabase, sellerId, payload = {}) => {
  const normalizedSellerId = normalizeText(sellerId);
  if (!isUuid(normalizedSellerId)) throw new Error('Invalid seller id.');
  const { data: existing, error } = await supabase
    .from('seller_dropship_profiles')
    .select('*')
    .eq('seller_id', normalizedSellerId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;
  const insertPayload = {
    seller_id: normalizedSellerId,
    seller_persona_id: payload.seller_persona_id || null,
    status: normalizeSellerDropshipStatus(payload.status || 'draft'),
    settings: jsonObject(payload.settings)
  };
  const { data, error: insertError } = await supabase
    .from('seller_dropship_profiles')
    .insert(insertPayload)
    .select('*')
    .single();
  if (insertError) throw insertError;
  return data;
};

const requireApprovedSellerDropshipProfile = async (supabase, sellerId, settings) => {
  const profileRow = await ensureSellerDropshipProfile(supabase, sellerId);
  const profile = mapSellerDropshipProfileRow(profileRow);
  if (settings?.requireApproval && profile.status !== 'approved') {
    throw new Error('Dropshipping access is pending approval for this seller.');
  }
  if (profile.status === 'suspended' || profile.status === 'rejected') {
    throw new Error('Dropshipping access is not active for this seller.');
  }
  return profileRow;
};

const mapSupplierRow = (row) => ({
  id: String(row?.id || ''),
  name: String(row?.name || 'Supplier'),
  contactEmail: normalizeText(row?.contact_email) || '',
  apiUrl: normalizeText(row?.api_url) || '',
  status: normalizeSupplierStatus(row?.status),
  fulfillmentMode: normalizeSupplierFulfillmentMode(row?.fulfillment_mode),
  defaultRoutingMode: normalizeDropshipRoutingMode(row?.default_routing_mode),
  slaDays: Number(row?.sla_days || 0) || 0,
  blindDropship: firstDefined(row?.blind_dropship, true) !== false,
  shippingProfile: jsonObject(row?.shipping_profile),
  returnPolicy: jsonObject(row?.return_policy),
  brandingOptions: jsonObject(row?.branding_options),
  settlementTerms: jsonObject(row?.settlement_terms),
  contactChannels: jsonObject(row?.contact_channels),
  apiConfig: jsonObject(row?.api_config),
  adminNotes: normalizeText(row?.admin_notes),
  metadata: jsonObject(row?.metadata),
  createdAt: toIso(row?.created_at),
  updatedAt: toIso(row?.updated_at)
});

const mapSupplierProductRow = (row, supplierRow) => {
  const data = jsonObject(row?.data);
  const imageUrls = Array.isArray(row?.image_urls)
    ? row.image_urls.map((entry) => String(entry || '')).filter(Boolean)
    : Array.isArray(data?.imageUrls)
      ? data.imageUrls.map((entry) => String(entry || '')).filter(Boolean)
      : [];
  return {
    id: String(row?.id || ''),
    title: String(row?.title || data?.title || 'Supplier Product'),
    description: String(row?.description || data?.description || ''),
    wholesalePrice: parseMoney(firstDefined(row?.wholesale_price, row?.price, 0)),
    imageUrls,
    supplierName: String(supplierRow?.name || data?.supplierName || 'Supplier'),
    category: String(firstDefined(row?.category, data?.category, 'General')),
    shippingInfo: {
      cost: parseMoney(firstDefined(row?.shipping_cost, data?.shippingInfo?.cost, 0)),
      time: String(firstDefined(data?.shippingInfo?.time, data?.shippingTime, row?.processing_time_days ? `${row.processing_time_days} days` : '')) || 'TBD'
    },
    supplierId: row?.supplier_id ? String(row.supplier_id) : supplierRow?.id || '',
    supplierSku: normalizeText(firstDefined(row?.sku, data?.supplierSku)),
    processingTimeDays: Number(firstDefined(row?.processing_time_days, supplierRow?.slaDays, 0)) || 0,
    countryOfOrigin: normalizeText(firstDefined(data?.countryOfOrigin, data?.originCountry)),
    hsCode: normalizeText(firstDefined(data?.hsCode, data?.compliance?.hsCode)),
    shippingEstimates: Array.isArray(data?.shippingEstimates) ? data.shippingEstimates : [],
    returnPolicy: jsonObject(firstDefined(row?.return_policy, supplierRow?.returnPolicy, data?.returnPolicy)),
    certifications: Array.isArray(data?.certifications)
      ? data.certifications.map((entry) => String(entry || '')).filter(Boolean)
      : [],
    currency: String(firstDefined(row?.currency, data?.currency, DEFAULT_CURRENCY) || DEFAULT_CURRENCY).toUpperCase(),
    status: normalizeProductStatus(row?.status),
    stock: Number(row?.stock || 0) || 0,
    minOrderQuantity: Number(row?.min_order_quantity || 1) || 1,
    sellerVisibility: normalizeProductVisibility(row?.seller_visibility),
    attributes: jsonObject(row?.attributes),
    syncMode: normalizeText(firstDefined(row?.sync_mode, 'managed')) || 'managed',
    legacySourceRef: normalizeText(row?.legacy_source_ref),
    lastSyncedAt: row?.last_synced_at ? toIso(row.last_synced_at) : null,
    supplier: supplierRow ? mapSupplierRow(supplierRow) : undefined
  };
};

const buildItemDropshipProfile = (itemRow) => {
  const metadata = jsonObject(itemRow?.metadata);
  const profile = jsonObject(metadata.dropshipProfile);
  const supplierInfo = jsonObject(metadata.supplierInfo);
  const automation = jsonObject(metadata.automation);
  const fulfillmentType = normalizeText(metadata.fulfillmentType).toLowerCase();
  const productType = normalizeText(metadata.productType).toLowerCase();
  const supplierId = normalizeText(firstDefined(profile.supplierId, supplierInfo.supplierId));
  const supplierProductId = normalizeText(
    firstDefined(profile.supplierProductId, supplierInfo.supplierProductId, supplierInfo.id)
  );
  return {
    enabled:
      fulfillmentType === 'dropship' ||
      productType === 'dropship' ||
      Boolean(supplierId && supplierProductId),
    supplierId,
    supplierProductId,
    supplierName: normalizeText(firstDefined(profile.supplierName, supplierInfo.name)),
    supplierSku: normalizeText(firstDefined(profile.supplierSku, supplierInfo.sku)),
    routingMode: normalizeDropshipRoutingMode(
      firstDefined(profile.routingMode, automation.autoFulfill ? 'auto_submit' : null, 'seller_approve')
    ),
    blindDropship: firstDefined(profile.blindDropship, supplierInfo.blindDropship, true) !== false,
    autoFulfill: Boolean(firstDefined(profile.autoFulfill, automation.autoFulfill, false)),
    minMarginPercent: Number(firstDefined(profile.minMarginPercent, automation.minMarginPercent, 20)) || 0,
    processingTimeDays: Number(firstDefined(profile.processingTimeDays, supplierInfo.processingTimeDays, 0)) || 0,
    manualSupplierLinkRequired: Boolean(profile.manualSupplierLinkRequired),
    metadata: profile
  };
};

const isDropshipItem = (itemRow) => Boolean(buildItemDropshipProfile(itemRow).enabled);

const fetchDropshipSupplierContext = async (supabase, itemRow, quantity, platformSettings) => {
  const profile = buildItemDropshipProfile(itemRow);
  if (!profile.enabled) return null;
  if (platformSettings && platformSettings.enabled === false) {
    throw new Error('Dropshipping is currently paused by platform operations.');
  }
  if (profile.manualSupplierLinkRequired) {
    throw new Error('This dropship listing requires supplier relinking before it can be sold.');
  }
  if (!isUuid(profile.supplierId) || !isUuid(profile.supplierProductId)) {
    throw new Error('This dropship listing is missing its supplier catalog link.');
  }

  if (platformSettings?.requireApproval) {
    await requireApprovedSellerDropshipProfile(supabase, itemRow.seller_id, platformSettings);
  }

  const [{ data: supplierRow, error: supplierError }, { data: productRow, error: productError }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', profile.supplierId).maybeSingle(),
    supabase.from('supplier_products').select('*').eq('id', profile.supplierProductId).maybeSingle()
  ]);
  if (supplierError) throw supplierError;
  if (productError) throw productError;
  if (!supplierRow || !productRow) {
    throw new Error('Supplier catalog record could not be loaded for this listing.');
  }
  if (String(productRow.supplier_id || '') !== profile.supplierId) {
    throw new Error('Supplier catalog link is inconsistent.');
  }
  const supplier = mapSupplierRow(supplierRow);
  const product = mapSupplierProductRow(productRow, supplierRow);
  if (supplier.status !== 'active') throw new Error('Supplier is currently unavailable.');
  if (product.status !== 'active') throw new Error('Supplier product is not active.');
  if (product.sellerVisibility === 'hidden') throw new Error('Supplier product is not available for new orders.');
  if (product.stock > 0 && product.stock < quantity) {
    throw new Error('Supplier product stock changed before checkout.');
  }
  if (quantity < Math.max(1, Number(product.minOrderQuantity || 1))) {
    throw new Error(`Supplier minimum order quantity is ${product.minOrderQuantity}.`);
  }

  const salePrice = parseMoney(firstDefined(itemRow?.sale_price, jsonObject(itemRow?.metadata).salePrice, 0));
  const supplierCost = parseMoney(product.wholesalePrice);
  const shippingCost = parseMoney(product.shippingInfo?.cost || 0);
  const unitInternalCost = parseMoney(supplierCost + shippingCost);
  const marginPercent = salePrice > 0 ? Number((((salePrice - unitInternalCost) / salePrice) * 100).toFixed(2)) : -999;
  if (salePrice <= 0) throw new Error('Dropship listings must carry a valid sale price.');
  if (marginPercent < Number(profile.minMarginPercent || 0)) {
    throw new Error('Dropship margin guardrail failed after supplier cost revalidation.');
  }

  return {
    profile,
    supplierRow,
    productRow,
    supplier,
    product,
    routingMode: normalizeDropshipRoutingMode(firstDefined(profile.routingMode, supplier.defaultRoutingMode)),
    blindDropship: firstDefined(profile.blindDropship, supplier.blindDropship, true) !== false,
    supplierCost,
    shippingCost,
    currency: String(firstDefined(product.currency, DEFAULT_CURRENCY) || DEFAULT_CURRENCY).toUpperCase(),
    payableTotal: parseMoney((supplierCost + shippingCost) * quantity),
    marginSnapshot: parseMoney((salePrice - unitInternalCost) * quantity),
    marginPercent,
    etaLabel:
      product.processingTimeDays > 0
        ? `${product.processingTimeDays}-${Math.max(product.processingTimeDays + 3, product.processingTimeDays)} days`
        : 'TBD'
  };
};

const syncDropshipShipmentState = async (supabase, orderId, supplierOrderRow, dropshipContext, options = {}) => {
  if (!orderId) return null;
  const { data: shipmentRow, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!shipmentRow) return null;

  const shipmentMeta = jsonObject(shipmentRow.metadata);
  const existingDropship = jsonObject(shipmentMeta.dropship);
  const existingSupplierOrders = Array.isArray(existingDropship.supplierOrders)
    ? existingDropship.supplierOrders.filter((entry) => entry && typeof entry === 'object')
    : [];
  const supplierOrderSummary = {
    id: String(supplierOrderRow.id),
    supplierId: String(supplierOrderRow.supplier_id || dropshipContext?.profile?.supplierId || ''),
    supplierProductId: String(
      supplierOrderRow.supplier_product_id || dropshipContext?.profile?.supplierProductId || ''
    ),
    status: String(supplierOrderRow.status || 'pending_review'),
    externalStatus: normalizeText(supplierOrderRow.external_status),
    carrier: normalizeText(firstDefined(options.carrier, supplierOrderRow.carrier)),
    trackingNumber: normalizeText(
      firstDefined(options.trackingNumber, supplierOrderRow.tracking_number, shipmentRow.tracking_number)
    ),
    etaLabel: normalizeText(dropshipContext?.etaLabel),
    blindDropship: firstDefined(dropshipContext?.blindDropship, true) !== false
  };
  const supplierOrders = [
    ...existingSupplierOrders.filter((entry) => String(entry.id || '') !== supplierOrderSummary.id),
    supplierOrderSummary
  ];

  const patch = {
    metadata: {
      ...shipmentMeta,
      dropship: {
        ...existingDropship,
        supplierOrders,
        trackingSyncState: supplierOrderSummary.trackingNumber ? 'synced' : 'pending',
        updatedAt: nowIso()
      }
    }
  };

  const nextStatus = normalizeText(String(options.status || '')).toLowerCase();
  if (supplierOrderSummary.carrier) patch.carrier = supplierOrderSummary.carrier;
  if (supplierOrderSummary.trackingNumber) patch.tracking_number = supplierOrderSummary.trackingNumber;
  if (['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(nextStatus)) {
    patch.status = nextStatus;
  }

  const { data, error: updateError } = await supabase
    .from('shipments')
    .update(patch)
    .eq('id', shipmentRow.id)
    .select('*')
    .single();
  if (updateError) throw updateError;
  return data;
};

const updatePaymentsDropshipMetadata = async (supabase, paymentId, patch) => {
  if (!paymentId) return null;
  const { data: paymentRow, error } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle();
  if (error) throw error;
  if (!paymentRow) return null;
  const currentDropship = jsonObject(jsonObject(paymentRow.metadata).dropship);
  const nextDropship = {
    ...currentDropship,
    ...jsonObject(patch)
  };
  if (Array.isArray(patch?.supplierOrderIds)) {
    nextDropship.supplierOrderIds = uniqueStrings([
      ...(Array.isArray(currentDropship.supplierOrderIds) ? currentDropship.supplierOrderIds : []),
      ...patch.supplierOrderIds
    ]);
  }
  if (patch?.payableTotalDelta !== undefined) {
    nextDropship.payableTotal = parseMoney(
      firstDefined(currentDropship.payableTotal, 0) + parseMoney(patch.payableTotalDelta)
    );
    delete nextDropship.payableTotalDelta;
  } else if (patch?.payableTotal !== undefined) {
    nextDropship.payableTotal = parseMoney(patch.payableTotal);
  }
  const nextMetadata = {
    ...jsonObject(paymentRow.metadata),
    dropship: nextDropship
  };
  const { data, error: updateError } = await supabase
    .from('payments')
    .update({ metadata: nextMetadata })
    .eq('id', paymentId)
    .select('*')
    .single();
  if (updateError) throw updateError;
  return data;
};

const mapSupplierOrderRow = ({ row, itemMap, orderMap, supplierMap, productMap, sellerMap, buyerMap, settlementLineMap }) => {
  const supplierRow = supplierMap.get(String(row.supplier_id || ''));
  const productRow = productMap.get(String(row.supplier_product_id || ''));
  const itemRow = itemMap.get(String(row.item_id || ''));
  const orderRow = orderMap.get(String(row.order_id || ''));
  const sellerRow = sellerMap.get(String(row.seller_id || ''));
  const buyerRow = buyerMap.get(String(row.buyer_id || ''));
  const settlementLine = settlementLineMap?.get(String(row.id));
  return {
    id: String(row.id),
    orderId: row.order_id ? String(row.order_id) : null,
    orderItemId: row.order_item_id ? String(row.order_item_id) : null,
    itemId: row.item_id ? String(row.item_id) : null,
    itemTitle: String(itemRow?.title || 'Dropship item'),
    itemImageUrl: deriveItemImage(itemRow),
    supplierId: row.supplier_id ? String(row.supplier_id) : null,
    supplierName: String(supplierRow?.name || productRow?.supplierName || 'Supplier'),
    supplierProductId: row.supplier_product_id ? String(row.supplier_product_id) : null,
    supplierProductTitle: String(productRow?.title || 'Supplier product'),
    sellerId: row.seller_id ? String(row.seller_id) : null,
    sellerName: String(sellerRow?.name || 'Seller'),
    buyerId: row.buyer_id ? String(row.buyer_id) : null,
    buyerName: String(buyerRow?.name || 'Buyer'),
    status: String(row.status || 'pending_review'),
    routingMode: normalizeDropshipRoutingMode(row.routing_mode),
    approvalState: normalizeDropshipApprovalState(row.approval_state),
    supplierCostSnapshot: parseMoney(row.supplier_cost_snapshot || 0),
    shippingCostSnapshot: parseMoney(row.shipping_cost_snapshot || 0),
    sellerSalePriceSnapshot: parseMoney(row.seller_sale_price_snapshot || 0),
    payableTotal: parseMoney(row.payable_total || 0),
    marginSnapshot: parseMoney(row.margin_snapshot || 0),
    currency: String(row.currency || DEFAULT_CURRENCY).toUpperCase(),
    externalOrderRef: normalizeText(row.external_order_ref) || null,
    externalStatus: normalizeText(row.external_status) || null,
    carrier: normalizeText(row.carrier) || null,
    trackingNumber: normalizeText(row.tracking_number) || null,
    labelUrl: normalizeText(row.label_url) || null,
    failureReason: normalizeText(row.failure_reason) || null,
    cancelReason: normalizeText(row.cancel_reason) || null,
    blindDropship: firstDefined(jsonObject(row.metadata).blindDropship, true) !== false,
    etaLabel: normalizeText(jsonObject(row.metadata).etaLabel) || null,
    trackingSyncState: normalizeText(jsonObject(row.metadata).trackingSyncState) || 'pending',
    createdAt: toIso(row.created_at),
    approvedAt: row.approved_at ? toIso(row.approved_at) : null,
    submittedAt: row.submitted_at ? toIso(row.submitted_at) : null,
    acceptedAt: row.accepted_at ? toIso(row.accepted_at) : null,
    shippedAt: row.shipped_at ? toIso(row.shipped_at) : null,
    deliveredAt: row.delivered_at ? toIso(row.delivered_at) : null,
    cancelledAt: row.cancelled_at ? toIso(row.cancelled_at) : null,
    failedAt: row.failed_at ? toIso(row.failed_at) : null,
    returnedAt: row.returned_at ? toIso(row.returned_at) : null,
    settlementId: settlementLine?.settlementId || null,
    settlementStatus: settlementLine?.settlementStatus || null,
    buyerFacingStatus: String(
      firstDefined(
        row.status === 'delivered'
          ? 'delivered'
          : row.status === 'shipped'
            ? 'shipped'
            : orderRow?.status,
        'processing'
      )
    ),
    metadata: jsonObject(row.metadata)
  };
};

const mapSettlementRow = (row, supplierMap, lines = []) => ({
  id: String(row.id),
  supplierId: String(row.supplier_id || ''),
  supplierName: String(supplierMap.get(String(row.supplier_id || ''))?.name || 'Supplier'),
  status: normalizeSettlementStatus(row.status),
  amountTotal: parseMoney(row.amount_total || 0),
  currency: String(row.currency || DEFAULT_CURRENCY).toUpperCase(),
  externalRef: normalizeText(row.external_ref) || null,
  notes: normalizeText(row.notes) || '',
  metadata: jsonObject(row.metadata),
  createdBy: row.created_by ? String(row.created_by) : null,
  settledAt: row.settled_at ? toIso(row.settled_at) : null,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  lines
});

const syncLegacyRentalBookingMirror = async ({
  firebaseApp,
  bookingRow,
  orderItemRow,
  itemRow,
  buyerRow,
  sellerRow,
  shippingAddress,
  totalPrice
}) => {
  const firestore = getFirestoreDb(firebaseApp);
  if (!firestore || !bookingRow?.id) return;

  const depositAmount = parseMoney(bookingRow.security_deposit_amount || 0);
  const payload = {
    id: String(bookingRow.id),
    source: 'commerce',
    orderId: bookingRow.order_id ? String(bookingRow.order_id) : null,
    orderItemId: bookingRow.order_item_id ? String(bookingRow.order_item_id) : null,
    canonicalRentalBookingId: String(bookingRow.id),
    itemId: String(bookingRow.item_id || ''),
    itemTitle: String(itemRow?.title || 'Rental item'),
    renterId: String(buyerRow?.firebase_uid || buyerRow?.id || ''),
    renterSupabaseId: String(buyerRow?.id || ''),
    renterName: String(buyerRow?.name || 'Buyer'),
    provider: { id: String(sellerRow?.firebase_uid || sellerRow?.id || '') },
    providerSupabaseId: String(sellerRow?.id || ''),
    startDate: toIso(bookingRow.rental_start),
    endDate: toIso(bookingRow.rental_end),
    totalPrice: parseMoney(totalPrice),
    status: mapLegacyStatus(bookingRow.status),
    shippingAddress: shippingAddress || null,
    trackingNumber: normalizeText(bookingRow.tracking_number) || null,
    paymentStatus: bookingRow.security_deposit_status === 'released' ? 'released' : 'escrow',
    type: 'rent',
    deliveryMode: String(bookingRow.delivery_mode || 'shipping'),
    pickupInstructions: bookingRow.pickup_instructions || null,
    pickupCode: bookingRow.pickup_code || null,
    pickupWindowStart: bookingRow.pickup_window_start ? toIso(bookingRow.pickup_window_start) : null,
    pickupWindowEnd: bookingRow.pickup_window_end ? toIso(bookingRow.pickup_window_end) : null,
    currency: deriveCurrency(itemRow, orderItemRow || {}),
    securityDeposit: depositAmount,
    depositStatus:
      bookingRow.security_deposit_status === 'held'
        ? 'held'
        : bookingRow.security_deposit_status === 'released'
          ? 'released'
          : bookingRow.security_deposit_status === 'claimed'
            ? 'claimed'
            : undefined,
    claimDetails:
      bookingRow.security_deposit_status === 'claimed'
        ? {
            amount: parseMoney(bookingRow.claim_amount || 0),
            reason: String(bookingRow.claim_reason || ''),
            proofImage: String(bookingRow.claim_evidence_url || '')
          }
        : null,
    createdAt: toIso(bookingRow.created_at),
    updatedAt: nowIso()
  };

  await firestore.collection('bookings').doc(String(bookingRow.id)).set(payload, { merge: true });
};

const syncRentalHoldBlock = async (supabase, bookingRow) => {
  if (!bookingRow?.id || !bookingRow?.item_id) return;
  const active = ACTIVE_RENTAL_STATUSES.includes(String(bookingRow.status || '').toLowerCase());
  const payload = {
    item_id: bookingRow.item_id,
    rental_booking_id: bookingRow.id,
    block_start: bookingRow.rental_start,
    block_end: bookingRow.rental_end,
    block_type: 'booking_hold',
    status: active ? 'active' : 'released',
    reason: 'Booking held availability',
    created_by: bookingRow.seller_id || bookingRow.buyer_id || null,
    metadata: jsonObject(bookingRow.metadata)
  };
  const { data: existingRow, error: existingError } = await supabase
    .from('rental_blocks')
    .select('id')
    .eq('rental_booking_id', bookingRow.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existingRow?.id) {
    const { error } = await supabase.from('rental_blocks').update(payload).eq('id', existingRow.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('rental_blocks').insert(payload);
  if (error) throw error;
};

const syncBookingDepositPaymentState = async (supabase, bookingRow, depositState, extraMetadata = {}) => {
  if (!bookingRow?.order_id) return null;

  const bookingMetadata = jsonObject(bookingRow.metadata);
  const paymentId = normalizeText(bookingMetadata.payment_id);
  let paymentRow = null;

  if (isUuid(paymentId)) {
    const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle();
    if (error) throw error;
    paymentRow = data || null;
  }

  if (!paymentRow) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', bookingRow.order_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    paymentRow = data || null;
  }

  if (!paymentRow?.id) return null;

  const currentMetadata = jsonObject(paymentRow.metadata);
  const nextMetadata = {
    ...currentMetadata,
    deposit_provider_state: normalizeText(depositState) || currentMetadata.deposit_provider_state || 'not_applicable',
    deposit_state_updated_at: nowIso(),
    ...extraMetadata
  };

  const { data, error } = await supabase
    .from('payments')
    .update({ metadata: nextMetadata })
    .eq('id', paymentRow.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const loadRentalConflicts = async (supabase, itemId, startIso, endIso) => {
  const [blocksRes, bookingsRes] = await Promise.all([
    supabase
      .from('rental_blocks')
      .select('*')
      .eq('item_id', itemId)
      .in('status', ACTIVE_BLOCK_STATUSES)
      .lt('block_start', endIso)
      .gt('block_end', startIso),
    supabase
      .from('rental_bookings')
      .select('*')
      .eq('item_id', itemId)
      .in('status', ACTIVE_RENTAL_STATUSES)
      .lt('rental_start', endIso)
      .gt('rental_end', startIso)
  ]);

  if (blocksRes.error) throw blocksRes.error;
  if (bookingsRes.error) throw bookingsRes.error;

  const blockedRanges = [];
  for (const row of blocksRes.data || []) {
    blockedRanges.push({
      start: toIso(row.block_start),
      end: toIso(row.block_end),
      reason: String(row.reason || 'Unavailable'),
      type: String(row.block_type || 'manual_blackout')
    });
  }
  for (const row of bookingsRes.data || []) {
    blockedRanges.push({
      start: toIso(row.rental_start),
      end: toIso(row.rental_end),
      reason: 'Booked',
      type: 'booking_hold'
    });
  }
  return blockedRanges;
};

const buildRentalQuote = async ({ supabase, itemRow, payload }) => {
  if (!itemRow) throw new Error('Item not found.');
  const listingType = String(itemRow.listing_type || '').toLowerCase();
  if (!['rent', 'both'].includes(listingType)) {
    throw new Error('This item is not configured for rentals.');
  }

  const startDate = parseDate(firstDefined(payload.rentalStart, payload.rental_start));
  const endDate = parseDate(firstDefined(payload.rentalEnd, payload.rental_end));
  if (!startDate || !endDate || endDate <= startDate) {
    throw new Error('A valid rental window is required.');
  }

  const quantity = Math.max(1, Number.parseInt(String(payload.quantity || '1'), 10) || 1);
  const deliveryMode = deriveDeliveryMode(itemRow, payload);
  const rates = deriveRentalRates(itemRow, payload);
  const rentalDays = computeRentalDays(startDate, endDate);
  if (rentalDays < 1) throw new Error('A valid rental window is required.');

  const subtotal = parseMoney(rates.daily * rentalDays * quantity);
  const securityDeposit = parseMoney(deriveRentalDeposit(itemRow, payload) * quantity);
  const blockedRanges = await loadRentalConflicts(
    supabase,
    itemRow.id,
    startDate.toISOString(),
    endDate.toISOString()
  );

  return {
    itemId: String(itemRow.id),
    available: blockedRanges.length === 0,
    currency: deriveCurrency(itemRow, payload),
    rentalDays,
    quantity,
    dailyRate: rates.daily,
    subtotal,
    securityDeposit,
    deliveryMode,
    totalDueNow: parseMoney(subtotal + securityDeposit),
    rentalStart: startDate.toISOString(),
    rentalEnd: endDate.toISOString(),
    availabilityFeedback:
      blockedRanges.length === 0
        ? 'Dates are available.'
        : 'Selected dates overlap with an existing booking or blackout window.',
    blockedRanges
  };
};

const sortBids = (rows) =>
  [...(rows || [])].sort((left, right) => {
    const amountDiff = parseMoney(right.amount || 0) - parseMoney(left.amount || 0);
    if (amountDiff !== 0) return amountDiff;
    return new Date(left.placed_at || left.created_at || 0).getTime() - new Date(right.placed_at || right.created_at || 0).getTime();
  });

const isBidEligibleForSelection = (bid) => {
  const status = normalizeText(bid?.status).toLowerCase();
  return !['declined', 'counter_declined', 'invalidated', 'withdrawn', 'payment_expired'].includes(
    status
  );
};

const loadAuctionBids = async (supabase, itemId) => {
  const { data, error } = await supabase
    .from('auction_bids')
    .select('*')
    .eq('item_id', itemId)
    .order('amount', { ascending: false })
    .order('placed_at', { ascending: true });
  if (error) throw error;
  return sortBids(data || []);
};

const getEffectiveBidAmount = (bid) => {
  const metadata = jsonObject(bid?.metadata);
  if (metadata.counterAcceptedAt || metadata.counter_accepted_at) {
    return parseMoney(firstDefined(metadata.counterAmount, metadata.counter_amount, bid?.amount));
  }
  return parseMoney(bid?.amount || 0);
};

const getWinningCandidate = (bids) =>
  sortBids((bids || []).filter((row) => isBidEligibleForSelection(row))).find(Boolean) || null;

const upsertAuctionSessionForItem = async (supabase, itemRow) => {
  const { data: existing, error } = await supabase
    .from('auction_sessions')
    .select('*')
    .eq('item_id', itemRow.id)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const payload = {
    item_id: itemRow.id,
    status: String(itemRow.status || '').toLowerCase() === 'draft' ? 'draft' : 'live',
    reserve_met: false,
    metadata: {
      created_from_item: true
    }
  };
  const { data: created, error: createError } = await supabase
    .from('auction_sessions')
    .insert(payload)
    .select('*')
    .single();
  if (createError) throw createError;
  return created;
};

const updateAuctionSession = async (supabase, sessionId, patch) => {
  const { data, error } = await supabase
    .from('auction_sessions')
    .update(patch)
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const updateBid = async (supabase, bidId, patch) => {
  const { data, error } = await supabase
    .from('auction_bids')
    .update(patch)
    .eq('id', bidId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const buildAuctionSnapshot = async ({ supabase, itemRow, sessionRow, viewerId = null }) => {
  const bids = await loadAuctionBids(supabase, itemRow.id);
  const userMap = await fetchUserMap(supabase, bids.map((row) => row.bidder_id));
  const currentBidRow = getWinningCandidate(bids);
  const currentBid = currentBidRow ? getEffectiveBidAmount(currentBidRow) : deriveStartingBid(itemRow);
  const reservePrice = deriveReservePrice(itemRow);
  const buyNowPrice = deriveBuyNowPrice(itemRow);
  const endTime = deriveAuctionEndTime(itemRow);
  const status = String(sessionRow?.status || 'live');
  const winnerBid = bids.find((row) => String(row.id) === String(sessionRow?.highest_bid_id || '')) || currentBidRow;
  const myBidRows = viewerId ? bids.filter((row) => String(row.bidder_id) === String(viewerId)) : [];
  const myTopBid = getWinningCandidate(myBidRows);
  const endsAt = parseDate(endTime);
  const ended = Boolean(endsAt && endsAt.getTime() <= Date.now());

  return {
    itemId: String(itemRow.id),
    status,
    reserveMet: Boolean(
      sessionRow?.reserve_met || (winnerBid ? getEffectiveBidAmount(winnerBid) >= reservePrice : false)
    ),
    currentBid,
    startingBid: deriveStartingBid(itemRow),
    reservePrice,
    buyNowPrice,
    endTime,
    bidCount: bids.length,
    highestBidId: sessionRow?.highest_bid_id ? String(sessionRow.highest_bid_id) : null,
    winnerId: sessionRow?.winner_id ? String(sessionRow.winner_id) : null,
    winnerCheckoutExpiresAt: sessionRow?.winner_checkout_expires_at
      ? toIso(sessionRow.winner_checkout_expires_at)
      : null,
    myBidId: myTopBid?.id ? String(myTopBid.id) : null,
    myHighestBid: myTopBid ? getEffectiveBidAmount(myTopBid) : undefined,
    canBid: status === 'live' && !ended,
    canBuyNow: status === 'live' && !ended && buyNowPrice > 0,
    canCheckout:
      Boolean(viewerId) &&
      status === 'winner_pending_payment' &&
      String(sessionRow?.winner_id || '') === String(viewerId || '') &&
      (!sessionRow?.winner_checkout_expires_at ||
        new Date(sessionRow.winner_checkout_expires_at).getTime() > Date.now()),
    history: bids.map((row) => {
      const metadata = jsonObject(row.metadata);
      return {
        id: String(row.id),
        amount: parseMoney(row.amount),
        status: normalizeAuctionProfileStatus(row.status),
        counterAmount: parseMoney(firstDefined(metadata.counterAmount, metadata.counter_amount, 0)),
        placedAt: toIso(firstDefined(row.placed_at, row.created_at)),
        bidderId: String(row.bidder_id || ''),
        bidderDisplayName: String(userMap.get(String(row.bidder_id || ''))?.name || 'Bidder'),
        sourceThreadId: normalizeText(row.source_thread_id) || null,
        metadata
      };
    })
  };
};

const resolveAuctionOutcome = async ({
  supabase,
  itemRow,
  sessionRow,
  forcePromoteNext = false,
  writeAuditLog,
  actorUserId
}) => {
  const bids = await loadAuctionBids(supabase, itemRow.id);
  const reservePrice = deriveReservePrice(itemRow);
  const validBids = sortBids(bids.filter((row) => isBidEligibleForSelection(row)));

  if (forcePromoteNext && sessionRow?.highest_bid_id) {
    const currentWinner = bids.find((row) => String(row.id) === String(sessionRow.highest_bid_id));
    if (currentWinner) {
      await updateBid(supabase, currentWinner.id, { status: 'payment_expired' });
      await writeAudit(writeAuditLog, {
        actorUserId: actorUserId || currentWinner.bidder_id || null,
        action: 'auction_winner_payment_expired',
        entityType: 'auction_bid',
        entityId: String(currentWinner.id),
        details: { itemId: String(itemRow.id) }
      });
    }
  }

  const eligible = sortBids(
    (await loadAuctionBids(supabase, itemRow.id)).filter((row) => isBidEligibleForSelection(row))
  );
  const topBid = eligible[0];
  if (!topBid) {
    const closed = await updateAuctionSession(supabase, sessionRow.id, {
      status: 'closed_no_sale',
      highest_bid_id: null,
      winner_id: null,
      winner_checkout_expires_at: null,
      reserve_met: false,
      closed_at: nowIso()
    });
    return buildAuctionSnapshot({ supabase, itemRow, sessionRow: closed });
  }

  const reserveMet = forcePromoteNext ? true : getEffectiveBidAmount(topBid) >= reservePrice || reservePrice <= 0;
  if (!reserveMet) {
    const closed = await updateAuctionSession(supabase, sessionRow.id, {
      status: 'closed_no_sale',
      highest_bid_id: topBid.id,
      winner_id: null,
      winner_checkout_expires_at: null,
      reserve_met: false,
      closed_at: nowIso()
    });
    return buildAuctionSnapshot({ supabase, itemRow, sessionRow: closed });
  }

  const winnerExpiry = new Date(Date.now() + WINNER_WINDOW_MINUTES * 60_000).toISOString();
  await updateBid(supabase, topBid.id, {
    status: 'winner',
    metadata: {
      ...jsonObject(topBid.metadata),
      winnerAssignedAt: nowIso()
    }
  });

  const updated = await updateAuctionSession(supabase, sessionRow.id, {
    status: 'winner_pending_payment',
    highest_bid_id: topBid.id,
    winner_id: topBid.bidder_id,
    winner_checkout_expires_at: winnerExpiry,
    reserve_met: true,
    closed_at: parseDate(deriveAuctionEndTime(itemRow))?.getTime() <= Date.now() ? nowIso() : null
  });

  await writeAudit(writeAuditLog, {
    actorUserId: actorUserId || topBid.bidder_id || null,
    action: forcePromoteNext ? 'auction_winner_promoted' : 'auction_winner_assigned',
    entityType: 'auction_session',
    entityId: String(updated.id),
    details: { itemId: String(itemRow.id), bidId: String(topBid.id), winnerId: String(topBid.bidder_id) }
  });

  await insertNotification(
    supabase,
    topBid.bidder_id,
    'Auction winner selected',
    `You have the current payment window for ${itemRow.title || 'an auction item'}.`,
    '/profile/bids',
    'order'
  );

  return buildAuctionSnapshot({ supabase, itemRow, sessionRow: updated, viewerId: topBid.bidder_id });
};

export const runAuctionLifecycleSweep = async (supabase, writeAuditLog) => {
  const { data: sessionRows, error } = await supabase
    .from('auction_sessions')
    .select('*')
    .in('status', ['live', 'winner_pending_payment']);
  if (error) throw error;

  for (const sessionRow of sessionRows || []) {
    const { data: itemRow, error: itemError } = await supabase
      .from('items')
      .select(
        'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
      )
      .eq('id', sessionRow.item_id)
      .maybeSingle();
    if (itemError || !itemRow) continue;

    const endTime = parseDate(deriveAuctionEndTime(itemRow));
    const status = String(sessionRow.status || '').toLowerCase();
    if (status === 'live' && endTime && endTime.getTime() <= Date.now()) {
      await resolveAuctionOutcome({
        supabase,
        itemRow,
        sessionRow,
        writeAuditLog,
        actorUserId: itemRow.seller_id
      });
      continue;
    }

    if (
      status === 'winner_pending_payment' &&
      sessionRow.winner_checkout_expires_at &&
      new Date(sessionRow.winner_checkout_expires_at).getTime() <= Date.now()
    ) {
      await resolveAuctionOutcome({
        supabase,
        itemRow,
        sessionRow,
        forcePromoteNext: true,
        writeAuditLog,
        actorUserId: itemRow.seller_id
      });
    }
  }
};

let inlineAuctionWorkerStarted = false;
const ensureInlineAuctionWorker = (supabase, writeAuditLog) => {
  if (inlineAuctionWorkerStarted) return;
  inlineAuctionWorkerStarted = true;
  const tick = () => runAuctionLifecycleSweep(supabase, writeAuditLog).catch((error) => {
    console.error('commerce auction lifecycle', error);
  });
  tick();
  setInterval(tick, 60_000).unref?.();
};

const createShippingAddress = async (supabase, userId, shippingInfo) => {
  const normalizedLine1 = normalizeText(firstDefined(shippingInfo?.line1, shippingInfo?.addressLine1));
  if (!normalizedLine1) return null;
  const payload = {
    user_id: userId,
    name: normalizeText(shippingInfo?.name) || 'Customer',
    line1: normalizedLine1,
    line2: normalizeText(shippingInfo?.line2) || null,
    city: normalizeText(shippingInfo?.city) || null,
    state: normalizeText(shippingInfo?.state) || null,
    postal_code: normalizeText(firstDefined(shippingInfo?.postal_code, shippingInfo?.zip)) || null,
    country: normalizeText(shippingInfo?.country) || 'PK',
    phone: normalizeText(shippingInfo?.phone) || null
  };
  const { data, error } = await supabase.from('shipping_addresses').insert(payload).select('*').single();
  if (error) throw error;
  return data;
};

const createShipment = async (supabase, orderId, shippingAddressId) => {
  if (!shippingAddressId) return null;
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      order_id: orderId,
      carrier: 'pending',
      tracking_number: null,
      status: 'pending'
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const resolveLineMode = (line, itemRow) => {
  const listingType = normalizeText(firstDefined(line.listingType, line.listing_type, itemRow?.listing_type)).toLowerCase();
  const transactionMode = normalizeText(firstDefined(line.transactionMode, line.transaction_mode)).toLowerCase();
  if (listingType === 'auction' || line.auctionWinnerCheckout || line.auctionBidId) return 'auction';
  if (listingType === 'rent' || (listingType === 'both' && transactionMode === 'rent')) return 'rent';
  return 'sale';
};

const buildHistoryLine = (detail, createdAt) => ({
  id: detail.id,
  orderId: detail.orderId,
  orderItemId: detail.orderItemId,
  itemId: detail.itemId,
  itemTitle: detail.itemTitle,
  itemImageUrl: detail.itemImageUrl || '/icons/urbanprime.svg',
  type: detail.type,
  source: 'commerce',
  startDate: detail.rentalStart || createdAt,
  endDate: detail.rentalEnd || detail.rentalStart || createdAt,
  totalPrice: detail.totalPrice,
  status: detail.status,
  legacyStatus: detail.type === 'rent' ? mapLegacyStatus(detail.status) : detail.status,
  deliveryMode: detail.deliveryMode || null,
  itemType: detail.digitalDelivery?.available ? 'digital' : null,
  podJobStatus: detail.podJob?.status || null,
  podSelection: detail.podJob?.variantSnapshot || null
});

const mapShippingAddress = (row) =>
  row
    ? {
        id: String(row.id),
        name: String(row.name || ''),
        addressLine1: String(row.line1 || ''),
        line1: String(row.line1 || ''),
        line2: row.line2 ? String(row.line2) : '',
        city: String(row.city || ''),
        state: String(row.state || ''),
        zip: String(row.postal_code || ''),
        postal_code: String(row.postal_code || ''),
        country: String(row.country || ''),
        phone: String(row.phone || '')
      }
    : null;

const buildCommerceOrderDetail = async (supabase, target) => {
  const orderId = String(target.order.id);
  const paymentPromise = supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const shipmentPromise = supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const usersPromise = fetchUserMap(supabase, [
    target.order.buyer_id,
    target.booking?.seller_id || target.orderItem?.seller_id
  ]);
  const itemPromise = supabase
    .from('items')
    .select(
      'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
    )
    .eq('id', target.booking?.item_id || target.orderItem.item_id)
    .maybeSingle();
  const addressPromise = target.order.shipping_address_id
    ? supabase
        .from('shipping_addresses')
        .select('id,user_id,name,line1,line2,city,state,postal_code,country,phone,is_default')
        .eq('id', target.order.shipping_address_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const supplierOrderPromise = target.booking
    ? Promise.resolve({ data: null, error: null })
    : supabase
        .from('supplier_orders')
        .select('*')
        .eq('order_item_id', target.orderItem.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  const [paymentRes, shipmentRes, userMap, itemRes, addressRes, supplierOrderRes] = await Promise.all([
    paymentPromise,
    shipmentPromise,
    usersPromise,
    itemPromise,
    addressPromise,
    supplierOrderPromise
  ]);

  if (paymentRes.error) throw paymentRes.error;
  if (shipmentRes.error) throw shipmentRes.error;
  if (itemRes.error) throw itemRes.error;
  if (addressRes.error) throw addressRes.error;
  if (supplierOrderRes.error) throw supplierOrderRes.error;

  const itemRow = itemRes.data;
  const buyerRow = userMap.get(String(target.order.buyer_id || ''));
  const sellerRow = userMap.get(String(target.booking?.seller_id || target.orderItem?.seller_id || ''));
  const paymentRow = paymentRes.data || null;
  const shipmentRow = shipmentRes.data || null;
  const supplierOrderRow = supplierOrderRes.data || null;
  const orderItemMeta = jsonObject(target.orderItem?.metadata);
  const bookingMeta = jsonObject(target.booking?.metadata);
  const source = target.booking ? 'rental_booking' : 'order_item';
  const listingMode =
    source === 'rental_booking'
      ? 'rent'
      : String(target.orderItem?.listing_type || itemRow?.listing_type || 'sale').toLowerCase() === 'auction'
        ? 'auction'
        : String(target.orderItem?.listing_type || itemRow?.listing_type || 'sale').toLowerCase() === 'rent'
          ? 'rent'
          : 'sale';
  const type = listingMode === 'rent' ? 'rent' : 'sale';
  const securityDeposit = target.booking
    ? parseMoney(target.booking.security_deposit_amount || 0)
    : parseMoney(firstDefined(orderItemMeta.securityDeposit, 0));
  const status = target.booking
    ? String(target.booking.status || 'pending_confirmation')
    : String(
        firstDefined(
          shipmentRow?.status === 'shipped'
            ? 'shipped'
            : shipmentRow?.status === 'delivered'
              ? 'delivered'
              : null,
          target.order.status,
          'processing'
        )
      );
  const totalPrice = target.booking
    ? parseMoney(firstDefined(bookingMeta.subtotal, orderItemMeta.totalPrice, target.orderItem?.unit_price))
    : parseMoney(firstDefined(orderItemMeta.totalPrice, target.orderItem?.unit_price) * Number(target.orderItem?.quantity || 1));
  const dropshipMetadata = supplierOrderRow ? jsonObject(supplierOrderRow.metadata) : jsonObject(orderItemMeta.dropship);

  return {
    id: String(target.booking?.id || target.orderItem.id),
    source,
    orderId,
    bookingId: target.booking?.id ? String(target.booking.id) : null,
    orderItemId: String(target.orderItem.id),
    itemId: String(target.orderItem.item_id || ''),
    itemTitle: String(itemRow?.title || 'Item'),
    itemImageUrl: deriveItemImage(itemRow),
    status,
    paymentStatus: String(paymentRow?.status || 'pending'),
    type,
    listingMode,
    deliveryMode:
      source === 'rental_booking'
        ? String(target.booking.delivery_mode || 'shipping')
        : shipmentRow
          ? 'shipping'
          : itemRow && jsonObject(itemRow.metadata).digitalDelivery
            ? 'digital'
            : undefined,
    rentalStart: target.booking?.rental_start ? toIso(target.booking.rental_start) : null,
    rentalEnd: target.booking?.rental_end ? toIso(target.booking.rental_end) : null,
    trackingNumber: normalizeText(firstDefined(target.booking?.tracking_number, shipmentRow?.tracking_number)) || null,
    returnTrackingNumber: normalizeText(target.booking?.return_tracking_number) || null,
    totalPrice,
    quantity: Number(target.orderItem.quantity || 1),
    securityDeposit,
    depositStatus: target.booking?.security_deposit_status
      ? String(target.booking.security_deposit_status)
      : undefined,
    claimAmount: target.booking ? parseMoney(target.booking.claim_amount || 0) : undefined,
    claimReason: target.booking?.claim_reason ? String(target.booking.claim_reason) : undefined,
    claimEvidenceUrl: target.booking?.claim_evidence_url
      ? String(target.booking.claim_evidence_url)
      : undefined,
    buyer: buyerRow
      ? {
          id: String(buyerRow.id),
          firebaseUid: buyerRow.firebase_uid ? String(buyerRow.firebase_uid) : undefined,
          name: String(buyerRow.name || 'Buyer')
        }
      : null,
    seller: sellerRow
      ? {
          id: String(sellerRow.id),
          firebaseUid: sellerRow.firebase_uid ? String(sellerRow.firebase_uid) : undefined,
          name: String(sellerRow.name || 'Seller')
        }
      : null,
    digitalDelivery: null,
    shippingAddress: mapShippingAddress(addressRes.data || null),
    pickupInstructions: target.booking?.pickup_instructions
      ? String(target.booking.pickup_instructions)
      : undefined,
    pickupCode: target.booking?.pickup_code ? String(target.booking.pickup_code) : undefined,
    pickupWindowStart: target.booking?.pickup_window_start
      ? toIso(target.booking.pickup_window_start)
      : null,
    pickupWindowEnd: target.booking?.pickup_window_end ? toIso(target.booking.pickup_window_end) : null,
    podJob: null,
    dropship: supplierOrderRow
      ? {
          enabled: true,
          status: String(supplierOrderRow.status || 'pending_review'),
          approvalState: normalizeDropshipApprovalState(supplierOrderRow.approval_state),
          routingMode: normalizeDropshipRoutingMode(supplierOrderRow.routing_mode),
          carrier: normalizeText(firstDefined(supplierOrderRow.carrier, shipmentRow?.carrier)) || null,
          trackingNumber:
            normalizeText(firstDefined(supplierOrderRow.tracking_number, shipmentRow?.tracking_number)) || null,
          etaLabel: normalizeText(dropshipMetadata.etaLabel) || null,
          blindDropship: firstDefined(dropshipMetadata.blindDropship, true) !== false,
          payableTotal: parseMoney(supplierOrderRow.payable_total || 0),
          marginSnapshot: parseMoney(supplierOrderRow.margin_snapshot || 0),
          trackingSyncState: normalizeText(dropshipMetadata.trackingSyncState) || 'pending'
        }
      : orderItemMeta.dropship
        ? {
            enabled: true,
            status: 'pending_review',
            approvalState: 'pending',
            routingMode: normalizeDropshipRoutingMode(orderItemMeta.dropship.routingMode),
            carrier: normalizeText(shipmentRow?.carrier) || null,
            trackingNumber: normalizeText(shipmentRow?.tracking_number) || null,
            etaLabel: normalizeText(orderItemMeta.dropship.etaLabel) || null,
            blindDropship: firstDefined(orderItemMeta.dropship.blindDropship, true) !== false,
            payableTotal: parseMoney(orderItemMeta.dropship.supplierCost || 0) + parseMoney(orderItemMeta.dropship.shippingCost || 0),
            marginSnapshot: parseMoney(orderItemMeta.dropship.marginSnapshot || 0),
            trackingSyncState: 'pending'
          }
        : null
  };
};

const resolveDetailTarget = async (supabase, rawId) => {
  const id = normalizeText(rawId);
  if (!isUuid(id)) return null;

  const { data: bookingRow, error: bookingError } = await supabase
    .from('rental_bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (bookingRow) {
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', bookingRow.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    const { data: orderItemRow, error: orderItemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', bookingRow.order_item_id)
      .maybeSingle();
    if (orderItemError) throw orderItemError;
    if (!orderRow || !orderItemRow) return null;
    return { order: orderRow, orderItem: orderItemRow, booking: bookingRow };
  }

  const { data: orderItemRow, error: orderItemError } = await supabase
    .from('order_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (orderItemError) throw orderItemError;
  if (orderItemRow) {
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderItemRow.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!orderRow) return null;
    return { order: orderRow, orderItem: orderItemRow, booking: null };
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!orderRow) return null;

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderRow.id)
    .order('created_at', { ascending: true })
    .limit(1);
  if (orderItemsError) throw orderItemsError;
  if (!(orderItems || []).length) return null;
  const orderItem = orderItems[0];

  const { data: bookingRows, error: bookingRowsError } = await supabase
    .from('rental_bookings')
    .select('*')
    .eq('order_item_id', orderItem.id)
    .limit(1);
  if (bookingRowsError) throw bookingRowsError;

  return {
    order: orderRow,
    orderItem,
    booking: (bookingRows || [])[0] || null
  };
};

const mapDetailToBooking = (detail) => ({
  id: detail.id,
  source: 'commerce',
  orderId: detail.orderId,
  orderItemId: detail.orderItemId,
  canonicalRentalBookingId: detail.bookingId || null,
  itemId: detail.itemId,
  itemTitle: detail.itemTitle,
  renterId: detail.buyer?.firebaseUid || detail.buyer?.id || '',
  renterSupabaseId: detail.buyer?.id || '',
  renterName: detail.buyer?.name || 'Buyer',
  provider: { id: detail.seller?.firebaseUid || detail.seller?.id || '' },
  providerSupabaseId: detail.seller?.id || '',
  startDate: detail.rentalStart || nowIso(),
  endDate: detail.rentalEnd || detail.rentalStart || detail.trackingNumber || nowIso(),
  totalPrice: parseMoney(detail.totalPrice || 0),
  status:
    detail.type === 'rent'
      ? mapLegacyStatus(detail.status)
      : ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'].includes(
            String(detail.status || '').toLowerCase()
          )
        ? String(detail.status || 'processing').toLowerCase()
        : 'processing',
  shippingAddress: detail.shippingAddress || undefined,
  trackingNumber: detail.trackingNumber || undefined,
  paymentStatus: detail.depositStatus === 'released' ? 'released' : 'escrow',
  type: detail.type,
  deliveryMode:
    detail.deliveryMode === 'pickup' || detail.deliveryMode === 'shipping'
      ? detail.deliveryMode
      : undefined,
  pickupInstructions: detail.pickupInstructions || null,
  pickupCode: detail.pickupCode || null,
  pickupWindowStart: detail.pickupWindowStart || null,
  pickupWindowEnd: detail.pickupWindowEnd || null,
  securityDeposit: parseMoney(detail.securityDeposit || 0),
  depositStatus:
    detail.depositStatus === 'released'
      ? 'released'
      : detail.depositStatus === 'claimed'
        ? 'claimed'
        : parseMoney(detail.securityDeposit || 0) > 0
          ? 'held'
          : undefined,
  claimDetails:
    detail.depositStatus === 'claimed'
      ? {
          amount: parseMoney(detail.claimAmount || 0),
          reason: String(detail.claimReason || ''),
          proofImage: String(detail.claimEvidenceUrl || '')
        }
      : undefined,
  currency: DEFAULT_CURRENCY,
  podJob: detail.podJob || null
});

const buildOrderTrackingPayload = async (supabase, orderRow) => {
  const orderId = String(orderRow.id || '');
  const noteText = normalizeText(orderRow.note);
  const noteMeta = jsonObject(orderRow.note);
  const [orderItemsRes, rentalRes, shipmentRes, paymentRes] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    supabase.from('rental_bookings').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    supabase
      .from('shipments')
      .select('id,order_id,status,carrier,tracking_number,estimated_delivery,updated_at,created_at')
      .eq('order_id', orderId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);
  if (orderItemsRes.error) throw orderItemsRes.error;
  if (rentalRes.error) throw rentalRes.error;
  if (shipmentRes.error) throw shipmentRes.error;
  if (paymentRes.error) throw paymentRes.error;

  const rentalByOrderItem = new Map(
    (rentalRes.data || []).map((row) => [String(row.order_item_id || ''), row])
  );

  const details = [];
  for (const orderItem of orderItemsRes.data || []) {
    details.push(
      await buildCommerceOrderDetail(supabase, {
        order: orderRow,
        orderItem,
        booking: rentalByOrderItem.get(String(orderItem.id || '')) || null
      })
    );
  }

  return {
    orderId,
    status: String(orderRow.status || 'processing'),
    paymentStatus: String(paymentRes.data?.status || 'pending'),
    currency: normalizeText(orderRow.currency) || DEFAULT_CURRENCY,
    placedAt: toIso(orderRow.created_at, nowIso()),
    updatedAt: toIso(orderRow.updated_at || orderRow.created_at, nowIso()),
    subtotal: parseMoney(orderRow.subtotal || 0),
    shippingTotal: parseMoney(orderRow.shipping_total || 0),
    taxTotal: parseMoney(orderRow.tax_total || 0),
    total: parseMoney(orderRow.total || 0),
    note:
      normalizeText(firstDefined(noteMeta.delivery_note, noteMeta.note, noteText.startsWith('{') ? '' : noteText)) ||
      null,
    shippingAddress: details[0]?.shippingAddress || null,
    items: details.map((detail) => ({
      id: detail.id,
      orderItemId: detail.orderItemId,
      itemId: detail.itemId,
      itemTitle: detail.itemTitle,
      itemImageUrl: detail.itemImageUrl,
      type: detail.type,
      listingMode: detail.listingMode,
      status: detail.status,
      legacyStatus: detail.type === 'rent' ? mapLegacyStatus(detail.status) : detail.status,
      quantity: detail.quantity,
      totalPrice: detail.totalPrice,
      trackingNumber: detail.trackingNumber || null,
      returnTrackingNumber: detail.returnTrackingNumber || null,
      deliveryMode: detail.deliveryMode || null,
      rentalStart: detail.rentalStart || null,
      rentalEnd: detail.rentalEnd || null,
      pickupInstructions: detail.pickupInstructions || null,
      pickupWindowStart: detail.pickupWindowStart || null,
      pickupWindowEnd: detail.pickupWindowEnd || null,
      sellerName: detail.seller?.name || null
    })),
    shipments: (shipmentRes.data || []).map((shipment) => ({
      id: String(shipment.id || ''),
      orderId,
      status: String(shipment.status || 'processing'),
      carrier: normalizeText(shipment.carrier) || null,
      trackingNumber: normalizeText(shipment.tracking_number) || null,
      estimatedDelivery: shipment.estimated_delivery ? toIso(shipment.estimated_delivery, null) : null,
      updatedAt: shipment.updated_at
        ? toIso(shipment.updated_at, nowIso())
        : shipment.created_at
          ? toIso(shipment.created_at, nowIso())
          : null
    }))
  };
};

const createCommerceOrder = async ({
  supabase,
  firebaseApp,
  buyerContext,
  payload,
  writeAuditLog
}) => {
  const buyerId = String(buyerContext.user.id);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length) {
    throw new Error('At least one cart item is required.');
  }

  const lineIds = uniqueStrings(rawItems.map((line) => line.id));
  if (lineIds.some((id) => !isUuid(id))) {
    throw new Error('Canonical checkout requires valid item ids.');
  }

  const itemMap = await fetchItemMap(supabase, lineIds);
  const shippingAddressRow = await createShippingAddress(supabase, buyerId, payload.shipping_info || {});
  const dropshippingPlatform = (await getDropshippingPlatformSettings(supabase)).dropshipping;
  const orderNote = {
    legacy_display_ref: normalizeText(payload.legacy_display_ref) || `UP-${Math.floor(100000 + Math.random() * 900000)}`,
    delivery_note: normalizeText(payload.shipping_info?.deliveryNote || payload.shipping_info?.delivery_note) || null,
    gift_wrap: Boolean(payload.shipping_info?.giftWrap),
    contactless: Boolean(payload.shipping_info?.contactless),
    payment_details: jsonObject(payload.payment_details),
    actor_persona_id: payload.actor_persona_id || null,
    actor_name: normalizeText(payload.actor_name) || buyerContext.user.name || 'Customer',
    coupon_code: normalizeText(payload.coupon_code) || null
  };

  const preparedLines = [];
  let subtotal = 0;
  let totalDeposit = 0;
  let shippingTotal = 0;

  for (const rawLine of rawItems) {
    const itemRow = itemMap.get(String(rawLine.id));
    if (!itemRow) throw new Error('One or more cart items could not be loaded.');
    const mode = resolveLineMode(rawLine, itemRow);
    const quantity = Math.max(1, Number.parseInt(String(rawLine.quantity || '1'), 10) || 1);
    const metadata = jsonObject(itemRow.metadata);
    const sellerId = String(itemRow.seller_id || '');
    if (!sellerId || sellerId === buyerId) {
      throw new Error('You cannot checkout your own listing.');
    }

    if (mode === 'rent') {
      const quote = await buildRentalQuote({ supabase, itemRow, payload: rawLine });
      if (!quote.available) {
        throw new Error(quote.availabilityFeedback || 'Selected rental dates are no longer available.');
      }
      subtotal += quote.subtotal;
      totalDeposit += quote.securityDeposit;
      preparedLines.push({
        mode,
        itemRow,
        quantity: quote.quantity,
        unitPrice: quote.dailyRate,
        totalPrice: quote.subtotal,
        securityDeposit: quote.securityDeposit,
        deliveryMode: quote.deliveryMode,
        rentalStart: quote.rentalStart,
        rentalEnd: quote.rentalEnd,
        pickupInstructions: normalizeText(rawLine.pickupInstructions) || null,
        pickupCode: normalizeText(rawLine.pickupCode) || null,
        pickupWindowStart: rawLine.pickupWindowStart ? toIso(rawLine.pickupWindowStart) : null,
        pickupWindowEnd: rawLine.pickupWindowEnd ? toIso(rawLine.pickupWindowEnd) : null,
        instantBook: deriveInstantBook(itemRow),
        metadata: {
          ...jsonObject(rawLine),
          rentalQuote: quote,
          totalPrice: quote.subtotal
        }
      });
      continue;
    }

    if (mode === 'auction') {
      const session = await upsertAuctionSessionForItem(supabase, itemRow);
      const snapshot = await buildAuctionSnapshot({ supabase, itemRow, sessionRow: session, viewerId: buyerId });
      if (rawLine.auctionWinnerCheckout) {
        const bidId = normalizeText(rawLine.auctionBidId);
        if (!isUuid(bidId)) throw new Error('Winner checkout requires a valid bid.');
        const { data: bidRow, error: bidError } = await supabase
          .from('auction_bids')
          .select('*')
          .eq('id', bidId)
          .maybeSingle();
        if (bidError) throw bidError;
        if (!bidRow || String(bidRow.bidder_id) !== buyerId) {
          throw new Error('Winner checkout is only available to the assigned bidder.');
        }
        if (String(session.winner_id || '') !== buyerId || String(session.status || '') !== 'winner_pending_payment') {
          throw new Error('This auction is not awaiting your payment.');
        }
        if (
          session.winner_checkout_expires_at &&
          new Date(session.winner_checkout_expires_at).getTime() <= Date.now()
        ) {
          throw new Error('The winner checkout window has expired.');
        }
        const effectiveAmount = getEffectiveBidAmount(bidRow);
        subtotal += effectiveAmount * quantity;
        preparedLines.push({
          mode,
          itemRow,
          quantity,
          unitPrice: effectiveAmount,
          totalPrice: parseMoney(effectiveAmount * quantity),
          auctionBidId: bidRow.id,
          sessionId: session.id,
          metadata: {
            ...jsonObject(rawLine),
            auctionSnapshot: snapshot,
            totalPrice: parseMoney(effectiveAmount * quantity)
          }
        });
        continue;
      }

      if (!snapshot.canBuyNow || snapshot.buyNowPrice <= 0) {
        throw new Error('Auction items require winner checkout or a configured buy-now price.');
      }
      subtotal += snapshot.buyNowPrice * quantity;
      preparedLines.push({
        mode,
        itemRow,
        quantity,
        unitPrice: snapshot.buyNowPrice,
        totalPrice: parseMoney(snapshot.buyNowPrice * quantity),
        sessionId: session.id,
        metadata: {
          ...jsonObject(rawLine),
          auctionSnapshot: snapshot,
          buyNow: true,
          totalPrice: parseMoney(snapshot.buyNowPrice * quantity)
        }
      });
      continue;
    }

    const salePrice = parseMoney(firstDefined(itemRow.sale_price, metadata.salePrice, 0));
    if (salePrice <= 0) throw new Error('A sale price is required for checkout.');
    let dropshipContext = null;
    if (isDropshipItem(itemRow)) {
      dropshipContext = await fetchDropshipSupplierContext(supabase, itemRow, quantity, dropshippingPlatform);
    }
    subtotal += salePrice * quantity;
    preparedLines.push({
      mode,
      itemRow,
      quantity,
      unitPrice: salePrice,
      totalPrice: parseMoney(salePrice * quantity),
      dropshipContext,
      metadata: {
        ...jsonObject(rawLine),
        ...(dropshipContext
          ? {
              dropship: {
                enabled: true,
                supplierId: dropshipContext.profile.supplierId,
                supplierProductId: dropshipContext.profile.supplierProductId,
                routingMode: dropshipContext.routingMode,
                supplierCost: dropshipContext.supplierCost,
                shippingCost: dropshipContext.shippingCost,
                marginSnapshot: dropshipContext.marginSnapshot,
                blindDropship: dropshipContext.blindDropship,
                minMarginPercent: dropshipContext.profile.minMarginPercent,
                etaLabel: dropshipContext.etaLabel
              }
            }
          : {}),
        totalPrice: parseMoney(salePrice * quantity)
      }
    });
  }

  const paymentProvider = mapPaymentProvider(payload.payment_method);
  const paymentStatus = mapCheckoutPaymentStatus(payload.payment_method);
  const grandTotal = parseMoney(subtotal + shippingTotal + totalDeposit);

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      status: 'processing',
      currency: DEFAULT_CURRENCY,
      subtotal: parseMoney(subtotal),
      shipping_total: parseMoney(shippingTotal),
      tax_total: 0,
      total: grandTotal,
      shipping_address_id: shippingAddressRow?.id || null,
      billing_address_id: shippingAddressRow?.id || null,
      note: JSON.stringify(orderNote),
      buyer_persona_id: payload.actor_persona_id || null,
      seller_persona_id: null
    })
    .select('*')
    .single();
  if (orderError) throw orderError;

  const { data: paymentRow, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderRow.id,
      provider: paymentProvider,
      status: paymentStatus,
      amount: grandTotal,
      currency: DEFAULT_CURRENCY,
      provider_ref: null,
      metadata: {
        payment_details: jsonObject(payload.payment_details),
        deposit_provider_state: totalDeposit > 0 ? 'held' : 'not_applicable'
      }
    })
    .select('*')
    .single();
  if (paymentError) throw paymentError;

  const shipmentRow = await createShipment(supabase, orderRow.id, shippingAddressRow?.id || null);
  const buyerMap = await fetchUserMap(supabase, [buyerId]);
  const sellerIds = uniqueStrings(preparedLines.map((line) => line.itemRow.seller_id));
  const sellerMap = await fetchUserMap(supabase, sellerIds);
  const createdLineRefs = [];

  for (const line of preparedLines) {
    const sellerId = String(line.itemRow.seller_id || '');
    const { data: orderItemRow, error: orderItemError } = await supabase
      .from('order_items')
      .insert({
        order_id: orderRow.id,
        item_id: line.itemRow.id,
        seller_id: sellerId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        listing_type: line.mode === 'sale' ? 'sale' : line.mode,
        rental_start: line.rentalStart || null,
        rental_end: line.rentalEnd || null,
        metadata: line.metadata
      })
      .select('*')
      .single();
    if (orderItemError) throw orderItemError;

    if (line.mode === 'rent') {
      const { data: bookingRow, error: bookingError } = await supabase
        .from('rental_bookings')
        .insert({
          order_id: orderRow.id,
          order_item_id: orderItemRow.id,
          item_id: line.itemRow.id,
          buyer_id: buyerId,
          seller_id: sellerId,
          delivery_mode: line.deliveryMode,
          pickup_instructions: line.pickupInstructions,
          pickup_code: line.pickupCode,
          pickup_window_start: line.pickupWindowStart,
          pickup_window_end: line.pickupWindowEnd,
          rental_start: line.rentalStart,
          rental_end: line.rentalEnd,
          status: line.instantBook ? 'confirmed' : 'pending_confirmation',
          security_deposit_amount: line.securityDeposit,
          security_deposit_status: line.securityDeposit > 0 ? 'held' : 'not_applicable',
          metadata: {
            subtotal: line.totalPrice,
            payment_id: paymentRow.id
          }
        })
        .select('*')
        .single();
      if (bookingError) throw bookingError;

      await syncRentalHoldBlock(supabase, bookingRow);
      await syncLegacyRentalBookingMirror({
        firebaseApp,
        bookingRow,
        orderItemRow,
        itemRow: line.itemRow,
        buyerRow: buyerMap.get(buyerId),
        sellerRow: sellerMap.get(sellerId),
        shippingAddress: mapShippingAddress(shippingAddressRow),
        totalPrice: line.totalPrice
      });

      createdLineRefs.push({ bookingId: bookingRow.id, orderItemId: orderItemRow.id, sellerId, mode: line.mode });
      continue;
    }

    if (line.mode === 'auction') {
      if (line.auctionBidId) {
        const { data: bidRow } = await supabase
          .from('auction_bids')
          .update({
            status: 'winner',
            metadata: {
              ...jsonObject(line.metadata),
              purchasedAt: nowIso(),
              orderId: orderRow.id
            }
          })
          .eq('id', line.auctionBidId)
          .select('*')
          .single();

        await updateAuctionSession(supabase, line.sessionId, {
          status: 'sold',
          highest_bid_id: bidRow?.id || line.auctionBidId,
          winner_id: buyerId,
          winner_checkout_expires_at: null,
          reserve_met: true,
          closed_at: nowIso()
        });
      } else if (line.sessionId) {
        await updateAuctionSession(supabase, line.sessionId, {
          status: 'sold',
          highest_bid_id: null,
          winner_id: buyerId,
          winner_checkout_expires_at: null,
          reserve_met: true,
          closed_at: nowIso()
        });
      }

      await supabase
        .from('items')
        .update({ status: 'sold' })
        .eq('id', line.itemRow.id);
    }

    if (line.mode === 'sale' || line.mode === 'auction') {
      const nextStock = Number(line.itemRow.stock || 0) - Number(line.quantity || 0);
      if (Number.isFinite(nextStock)) {
        const patch = { stock: Math.max(0, nextStock) };
        if (nextStock <= 0) patch.status = 'sold';
        await supabase.from('items').update(patch).eq('id', line.itemRow.id);
      }
    }

    if (line.mode === 'sale' && line.dropshipContext) {
      const paymentReady = PAYMENT_READY_STATUSES.includes(String(paymentRow.status || '').toLowerCase());
      const requestedRoutingMode = normalizeDropshipRoutingMode(line.dropshipContext.routingMode);
      const resolvedRoutingMode =
        requestedRoutingMode === 'auto_submit' && (!dropshippingPlatform.allowAutoSubmit || !paymentReady)
          ? 'seller_approve'
          : requestedRoutingMode;
      const supplierOrderPayload = {
        order_id: orderRow.id,
        order_item_id: orderItemRow.id,
        item_id: line.itemRow.id,
        seller_id: sellerId,
        buyer_id: buyerId,
        supplier_id: line.dropshipContext.profile.supplierId,
        supplier_product_id: line.dropshipContext.profile.supplierProductId,
        routing_mode: resolvedRoutingMode,
        approval_state:
          resolvedRoutingMode === 'auto_submit' && paymentReady ? 'approved' : 'pending',
        status:
          resolvedRoutingMode === 'auto_submit' && paymentReady ? 'submitted' : 'pending_review',
        supplier_cost_snapshot: line.dropshipContext.supplierCost,
        shipping_cost_snapshot: line.dropshipContext.shippingCost,
        seller_sale_price_snapshot: parseMoney(line.unitPrice),
        payable_total: line.dropshipContext.payableTotal,
        margin_snapshot: line.dropshipContext.marginSnapshot,
        currency: line.dropshipContext.currency,
        external_order_ref:
          resolvedRoutingMode === 'auto_submit' && paymentReady
            ? `UPDS-${String(orderRow.id).slice(0, 8)}-${String(orderItemRow.id).slice(0, 6)}`
            : null,
        external_status:
          resolvedRoutingMode === 'auto_submit' && paymentReady ? 'queued' : 'pending_submission',
        approved_at:
          resolvedRoutingMode === 'auto_submit' && paymentReady ? nowIso() : null,
        submitted_at:
          resolvedRoutingMode === 'auto_submit' && paymentReady ? nowIso() : null,
        metadata: {
          blindDropship: line.dropshipContext.blindDropship,
          etaLabel: line.dropshipContext.etaLabel,
          trackingSyncState: 'pending',
          supplierName: line.dropshipContext.supplier.name,
          sellerApprovalRequired: resolvedRoutingMode === 'seller_approve'
        }
      };
      const { data: supplierOrderRow, error: supplierOrderError } = await supabase
        .from('supplier_orders')
        .insert(supplierOrderPayload)
        .select('*')
        .single();
      if (supplierOrderError) throw supplierOrderError;

      await syncDropshipShipmentState(
        supabase,
        orderRow.id,
        supplierOrderRow,
        line.dropshipContext,
        {
          status:
            resolvedRoutingMode === 'auto_submit' && paymentReady ? 'processing' : 'pending'
        }
      );
      await updatePaymentsDropshipMetadata(supabase, paymentRow.id, {
        supplierOrderIds: [String(supplierOrderRow.id)],
        payableTotalDelta: supplierOrderPayload.payable_total
      });
      await writeAudit(writeAuditLog, {
        actorUserId: buyerId,
        action: 'dropship_supplier_order_created',
        entityType: 'supplier_order',
        entityId: String(supplierOrderRow.id),
        details: {
          orderId: orderRow.id,
          orderItemId: orderItemRow.id,
          routingMode: supplierOrderPayload.routing_mode,
          payableTotal: supplierOrderPayload.payable_total
        }
      });
    }

    createdLineRefs.push({ bookingId: null, orderItemId: orderItemRow.id, sellerId, mode: line.mode });
  }

  await insertNotification(
    supabase,
    buyerId,
    'Order placed',
    `Order ${orderNote.legacy_display_ref} has been created.`,
    '/profile/orders',
    'order'
  );
  for (const lineRef of createdLineRefs) {
    await insertNotification(
      supabase,
      lineRef.sellerId,
      'New order received',
      `A new ${lineRef.mode === 'rent' ? 'rental' : 'order'} is ready for review.`,
      lineRef.bookingId ? `/profile/orders/${lineRef.bookingId}` : '/profile/sales',
      'order'
    );
  }

  await writeAudit(writeAuditLog, {
    actorUserId: buyerId,
    action: 'commerce_order_created',
    entityType: 'order',
    entityId: String(orderRow.id),
    details: {
      legacyDisplayRef: orderNote.legacy_display_ref,
      itemCount: preparedLines.length,
      total: grandTotal
    }
  });

  return {
    ok: true,
    order_id: orderRow.id,
    legacy_order_ref: String(orderNote.legacy_display_ref),
    payment_id: paymentRow.id,
    shipment_id: shipmentRow?.id || null
  };
};

export default function registerCommerceRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  createRateLimiter,
  resolveAdminContext,
  writeAuditLog,
  firebaseApp
}) {
  const limiterFactory =
    typeof createRateLimiter === 'function' ? createRateLimiter : createLocalRateLimiter;
  const bidLimiter = limiterFactory({
    windowMs: 30_000,
    maxRequests: 12,
    namespace: 'commerce-bids'
  });
  const disputeLimiter = limiterFactory({
    windowMs: 60_000,
    maxRequests: 8,
    namespace: 'commerce-disputes'
  });
  const adminActionLimiter = limiterFactory({
    windowMs: 30_000,
    maxRequests: 20,
    namespace: 'commerce-admin'
  });
  const rentalBlockLimiter = limiterFactory({
    windowMs: 60_000,
    maxRequests: 20,
    namespace: 'commerce-rental-blocks'
  });
  const dropshipActionLimiter = limiterFactory({
    windowMs: 30_000,
    maxRequests: 18,
    namespace: 'commerce-dropship'
  });
  const publicTrackingLimiter = limiterFactory({
    windowMs: 60_000,
    maxRequests: 10,
    namespace: 'commerce-public-tracking'
  });

  if (String(process.env.COMMERCE_INLINE_AUCTION_WORKER || 'true').toLowerCase() !== 'false') {
    ensureInlineAuctionWorker(supabase, writeAuditLog);
  }

  const loadMappedSupplierOrders = async (rows) => {
    const orderRows = rows || [];
    const [itemMap, orderMap, supplierRows, productRows, sellerMap, buyerMap, settlementLineRows] =
      await Promise.all([
        fetchItemMap(supabase, orderRows.map((row) => row.item_id)),
        fetchRowsByIds(supabase, 'orders', orderRows.map((row) => row.order_id), '*').then(
          (loadedRows) => new Map(loadedRows.map((row) => [String(row.id), row]))
        ),
        fetchRowsByIds(supabase, 'suppliers', orderRows.map((row) => row.supplier_id), '*'),
        fetchRowsByIds(
          supabase,
          'supplier_products',
          orderRows.map((row) => row.supplier_product_id),
          '*'
        ),
        fetchUserMap(supabase, orderRows.map((row) => row.seller_id)),
        fetchUserMap(supabase, orderRows.map((row) => row.buyer_id)),
        supabase
          .from('supplier_settlement_lines')
          .select('settlement_id,supplier_order_id,amount,supplier_settlements(id,status)')
          .in('supplier_order_id', uniqueStrings(orderRows.map((row) => row.id)).filter(isUuid))
          .then((res) => {
            if (res.error) throw res.error;
            return res.data || [];
          })
      ]);

    const supplierMap = new Map(supplierRows.map((row) => [String(row.id), row]));
    const productMap = new Map(
      productRows.map((row) => [
        String(row.id),
        mapSupplierProductRow(row, supplierMap.get(String(row.supplier_id || '')))
      ])
    );
    const settlementLineMap = new Map(
      settlementLineRows.map((row) => [
        String(row.supplier_order_id || ''),
        {
          settlementId: row.settlement_id ? String(row.settlement_id) : null,
          settlementStatus: normalizeSettlementStatus(row.supplier_settlements?.status)
        }
      ])
    );

    return orderRows.map((row) =>
      mapSupplierOrderRow({
        row,
        itemMap,
        orderMap,
        supplierMap,
        productMap,
        sellerMap,
        buyerMap,
        settlementLineMap
      })
    );
  };

  const loadSupplierOrderContext = async (supplierOrderId) => {
    const { data: row, error } = await supabase
      .from('supplier_orders')
      .select('*')
      .eq('id', supplierOrderId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const mapped = (await loadMappedSupplierOrders([row]))[0];
    return { row, mapped };
  };

  app.get('/commerce/providers', requireAuth, async (_req, res) => {
    res.json({
      paymentRails: pickEnabledRails(process.env.COMMERCE_PAYMENT_RAILS, PAYMENT_RAILS),
      shippingRails: pickEnabledRails(process.env.COMMERCE_SHIPPING_RAILS, SHIPPING_RAILS),
      payouts: {
        enabled: true,
        rails: ['bank_transfer', 'local_bank']
      },
      realtime: {
        notifications: true,
        analytics: true
      }
    });
  });

  app.get('/commerce/shipper/snapshot', requireAuth, async (_req, res) => {
    res.json({
      shippingRails: pickEnabledRails(process.env.COMMERCE_SHIPPING_RAILS, SHIPPING_RAILS),
      managed: true,
      generatedAt: nowIso()
    });
  });

  app.post('/commerce/rentals/quote', async (req, res) => {
    try {
      const itemId = normalizeText(req.body?.itemId || req.body?.item_id);
      if (!isUuid(itemId)) return res.status(400).json({ error: 'A valid item id is required.' });
      const { data: itemRow, error } = await supabase
        .from('items')
        .select(
          'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
        )
        .eq('id', itemId)
        .maybeSingle();
      if (error) throw error;
      if (!itemRow) return res.status(404).json({ error: 'Item not found.' });
      const quote = await buildRentalQuote({ supabase, itemRow, payload: req.body || {} });
      res.json(quote);
    } catch (error) {
      console.error('commerce rental quote failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to calculate rental quote.' });
    }
  });

  app.post('/commerce/rentals/book', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const itemId = normalizeText(req.body?.itemId || req.body?.item_id);
      if (!isUuid(itemId)) return res.status(400).json({ error: 'A valid item id is required.' });
      const payload = {
        items: [
          {
            id: itemId,
            quantity: Number(req.body?.quantity || 1),
            listingType: 'rent',
            rentalStart: req.body?.rentalStart,
            rentalEnd: req.body?.rentalEnd,
            rentalPeriod: {
              startDate: req.body?.rentalStart,
              endDate: req.body?.rentalEnd
            },
            deliveryMode: req.body?.deliveryMode,
            pickupInstructions: req.body?.pickupInstructions,
            pickupCode: req.body?.pickupCode,
            pickupWindowStart: req.body?.pickupWindowStart,
            pickupWindowEnd: req.body?.pickupWindowEnd
          }
        ],
        shipping_info: req.body?.shippingInfo || {},
        payment_method: req.body?.paymentMethod || 'bank_transfer',
        payment_details: req.body?.paymentDetails || {},
        actor_persona_id: req.body?.actorPersonaId || null,
        actor_name: req.body?.actorName || userCtx.user.name || 'Customer',
        legacy_display_ref: req.body?.legacyDisplayRef || null
      };
      const result = await createCommerceOrder({
        supabase,
        firebaseApp,
        buyerContext: userCtx,
        payload,
        writeAuditLog
      });
      res.status(201).json(result);
    } catch (error) {
      console.error('commerce rental booking failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to book rental.' });
    }
  });

  app.get('/commerce/items/:itemId/rental-blocks', requireAuth, rentalBlockLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const itemId = normalizeText(req.params.itemId);
      if (!isUuid(itemId)) return res.status(400).json({ error: 'Invalid item id.' });
      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select('id,seller_id')
        .eq('id', itemId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!itemRow) return res.status(404).json({ error: 'Item not found.' });
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(itemRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the listing owner can manage rental blocks.' });
      }
      const { data, error } = await supabase
        .from('rental_blocks')
        .select('*')
        .eq('item_id', itemId)
        .in('block_type', ['manual_blackout', 'maintenance'])
        .order('block_start', { ascending: true });
      if (error) throw error;
      res.json({
        itemId,
        blocks: (data || []).map((row) => ({
          id: String(row.id),
          itemId: String(row.item_id || ''),
          start: toIso(row.block_start),
          end: toIso(row.block_end),
          type: row.block_type,
          status: String(row.status || 'active'),
          reason: String(row.reason || ''),
          createdAt: toIso(row.created_at),
          createdBy: row.created_by ? String(row.created_by) : null,
          metadata: jsonObject(row.metadata)
        }))
      });
    } catch (error) {
      console.error('commerce rental blocks get failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load rental blocks.' });
    }
  });

  app.put('/commerce/items/:itemId/rental-blocks', requireAuth, rentalBlockLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const itemId = normalizeText(req.params.itemId);
      if (!isUuid(itemId)) return res.status(400).json({ error: 'Invalid item id.' });
      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select('id,seller_id')
        .eq('id', itemId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!itemRow) return res.status(404).json({ error: 'Item not found.' });
      if (String(itemRow.seller_id || '') !== String(userCtx.user.id || '')) {
        return res.status(403).json({ error: 'Only the listing owner can replace rental blocks.' });
      }

      const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
      const sanitizedBlocks = blocks.map((row) => {
        const start = parseDate(row?.start);
        const end = parseDate(row?.end);
        if (!start || !end || end <= start) {
          throw new Error('Every rental block requires a valid start and end.');
        }
        const type = normalizeText(row?.type || 'manual_blackout');
        if (!['manual_blackout', 'maintenance'].includes(type)) {
          throw new Error('Unsupported rental block type.');
        }
        return {
          item_id: itemId,
          rental_booking_id: null,
          block_start: start.toISOString(),
          block_end: end.toISOString(),
          block_type: type,
          status: 'active',
          reason: normalizeText(row?.reason) || null,
          created_by: userCtx.user.id,
          metadata: {}
        };
      });

      const { error: clearError } = await supabase
        .from('rental_blocks')
        .delete()
        .eq('item_id', itemId)
        .in('block_type', ['manual_blackout', 'maintenance']);
      if (clearError) throw clearError;
      if (sanitizedBlocks.length) {
        const { error: insertError } = await supabase.from('rental_blocks').insert(sanitizedBlocks);
        if (insertError) throw insertError;
      }

      const { data, error } = await supabase
        .from('rental_blocks')
        .select('*')
        .eq('item_id', itemId)
        .in('block_type', ['manual_blackout', 'maintenance'])
        .order('block_start', { ascending: true });
      if (error) throw error;

      res.json({
        ok: true,
        itemId,
        blocks: (data || []).map((row) => ({
          id: String(row.id),
          itemId: String(row.item_id || ''),
          start: toIso(row.block_start),
          end: toIso(row.block_end),
          type: row.block_type,
          status: String(row.status || 'active'),
          reason: String(row.reason || ''),
          createdAt: toIso(row.created_at),
          createdBy: row.created_by ? String(row.created_by) : null,
          metadata: jsonObject(row.metadata)
        }))
      });
    } catch (error) {
      console.error('commerce rental blocks replace failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to replace rental blocks.' });
    }
  });

  app.get('/commerce/auctions/:itemId', async (req, res) => {
    try {
      const itemId = normalizeText(req.params.itemId);
      if (!isUuid(itemId)) return res.status(400).json({ error: 'Invalid item id.' });
      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select(
          'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
        )
        .eq('id', itemId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!itemRow) return res.status(404).json({ error: 'Item not found.' });
      const sessionRow = await upsertAuctionSessionForItem(supabase, itemRow);
      const snapshot = await buildAuctionSnapshot({ supabase, itemRow, sessionRow });
      res.json(snapshot);
    } catch (error) {
      console.error('commerce auction snapshot failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load auction snapshot.' });
    }
  });

  app.post('/commerce/auctions/:itemId/bids', requireAuth, bidLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const itemId = normalizeText(req.params.itemId);
      const amount = parseMoney(req.body?.amount);
      if (!isUuid(itemId) || amount <= 0) {
        return res.status(400).json({ error: 'A valid item id and bid amount are required.' });
      }
      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select(
          'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
        )
        .eq('id', itemId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!itemRow) return res.status(404).json({ error: 'Auction item not found.' });
      if (String(itemRow.seller_id || '') === String(userCtx.user.id || '')) {
        return res.status(403).json({ error: 'You cannot bid on your own listing.' });
      }
      const sessionRow = await upsertAuctionSessionForItem(supabase, itemRow);
      const endTime = parseDate(deriveAuctionEndTime(itemRow));
      if (String(sessionRow.status || '') !== 'live' || (endTime && endTime.getTime() <= Date.now())) {
        return res.status(400).json({ error: 'This auction is no longer accepting bids.' });
      }
      const snapshot = await buildAuctionSnapshot({ supabase, itemRow, sessionRow });
      const minimumBid = Math.max(snapshot.currentBid + 1, deriveStartingBid(itemRow));
      if (amount < minimumBid) {
        return res.status(400).json({ error: `Bid must be at least ${formatMoney(minimumBid)}.` });
      }

      const { data: bidRow, error: bidError } = await supabase
        .from('auction_bids')
        .insert({
          item_id: itemId,
          bidder_id: userCtx.user.id,
          bidder_persona_id: req.body?.bidderPersonaId || req.body?.bidder_persona_id || null,
          amount,
          status: 'placed',
          placed_at: nowIso(),
          source_thread_id: normalizeText(req.body?.sourceThreadId || req.body?.source_thread_id) || null,
          metadata: {
            bidder_name: normalizeText(req.body?.bidder?.name) || userCtx.user.name || 'Bidder'
          }
        })
        .select('*')
        .single();
      if (bidError) throw bidError;

      const { data: freshBids } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('item_id', itemId)
        .neq('id', bidRow.id)
        .eq('status', 'placed');
      for (const stale of freshBids || []) {
        if (parseMoney(stale.amount) < amount) {
          await supabase.from('auction_bids').update({ status: 'outbid' }).eq('id', stale.id);
        }
      }

      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'auction_bid_placed',
        entityType: 'auction_bid',
        entityId: String(bidRow.id),
        details: { itemId, amount }
      });

      const refreshedSession = await upsertAuctionSessionForItem(supabase, itemRow);
      const auction = await buildAuctionSnapshot({
        supabase,
        itemRow,
        sessionRow: refreshedSession,
        viewerId: userCtx.user.id
      });
      res.status(201).json({ bid: bidRow, auction });
    } catch (error) {
      console.error('commerce bid placement failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to place bid.' });
    }
  });

  app.post('/commerce/auctions/:itemId/respond', requireAuth, bidLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const itemId = normalizeText(req.params.itemId);
      const action = normalizeText(req.body?.action).toLowerCase();
      const bidId = normalizeText(req.body?.bidId || req.body?.bid_id);
      if (!isUuid(itemId) || !isUuid(bidId)) {
        return res.status(400).json({ error: 'A valid item and bid id are required.' });
      }
      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select(
          'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
        )
        .eq('id', itemId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!itemRow) return res.status(404).json({ error: 'Auction item not found.' });

      const sessionRow = await upsertAuctionSessionForItem(supabase, itemRow);
      const { data: bidRow, error: bidError } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('id', bidId)
        .maybeSingle();
      if (bidError) throw bidError;
      if (!bidRow || String(bidRow.item_id) !== itemId) {
        return res.status(404).json({ error: 'Bid not found.' });
      }

      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);

      if (['accept', 'decline', 'counter', 'close'].includes(action)) {
        if (String(itemRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
          return res.status(403).json({ error: 'Only the seller or an admin can respond to this bid.' });
        }
      } else if (['accept_counter', 'decline_counter'].includes(action)) {
        if (String(bidRow.bidder_id || '') !== String(userCtx.user.id || '')) {
          return res.status(403).json({ error: 'Only the bidder can respond to this counter offer.' });
        }
      } else {
        return res.status(400).json({ error: 'Unsupported auction action.' });
      }

      if (action === 'accept') {
        await updateBid(supabase, bidRow.id, { status: 'winner' });
        const winnerExpiry = new Date(Date.now() + WINNER_WINDOW_MINUTES * 60_000).toISOString();
        const updatedSession = await updateAuctionSession(supabase, sessionRow.id, {
          status: 'winner_pending_payment',
          highest_bid_id: bidRow.id,
          winner_id: bidRow.bidder_id,
          winner_checkout_expires_at: winnerExpiry,
          reserve_met: true
        });
        await writeAudit(writeAuditLog, {
          actorUserId: userCtx.user.id,
          action: 'auction_bid_accepted',
          entityType: 'auction_bid',
          entityId: String(bidRow.id),
          details: { itemId }
        });
        const auction = await buildAuctionSnapshot({
          supabase,
          itemRow,
          sessionRow: updatedSession,
          viewerId: bidRow.bidder_id
        });
        return res.json({ ok: true, auction });
      }

      if (action === 'decline') {
        await updateBid(supabase, bidRow.id, { status: 'declined' });
        await writeAudit(writeAuditLog, {
          actorUserId: userCtx.user.id,
          action: 'auction_bid_declined',
          entityType: 'auction_bid',
          entityId: String(bidRow.id),
          details: { itemId }
        });
        const auction = await buildAuctionSnapshot({ supabase, itemRow, sessionRow });
        return res.json({ ok: true, auction });
      }

      if (action === 'counter') {
        const counterAmount = parseMoney(req.body?.counterAmount || req.body?.counter_amount);
        if (counterAmount <= parseMoney(bidRow.amount || 0)) {
          return res.status(400).json({ error: 'Counter amount must be higher than the bid.' });
        }
        await updateBid(supabase, bidRow.id, {
          status: 'countered',
          metadata: {
            ...jsonObject(bidRow.metadata),
            counterAmount,
            counterIssuedAt: nowIso(),
            counterIssuedBy: userCtx.user.id
          }
        });
        await writeAudit(writeAuditLog, {
          actorUserId: userCtx.user.id,
          action: 'auction_bid_countered',
          entityType: 'auction_bid',
          entityId: String(bidRow.id),
          details: { itemId, counterAmount }
        });
        const auction = await buildAuctionSnapshot({ supabase, itemRow, sessionRow });
        return res.json({ ok: true, auction });
      }

      if (action === 'accept_counter') {
        const metadata = jsonObject(bidRow.metadata);
        const counterAmount = parseMoney(firstDefined(metadata.counterAmount, metadata.counter_amount, 0));
        if (counterAmount <= parseMoney(bidRow.amount || 0)) {
          return res.status(400).json({ error: 'This bid does not have an active counter offer.' });
        }
        await updateBid(supabase, bidRow.id, {
          status: 'winner',
          metadata: {
            ...metadata,
            counterAcceptedAt: nowIso()
          }
        });
        const winnerExpiry = new Date(Date.now() + WINNER_WINDOW_MINUTES * 60_000).toISOString();
        const updatedSession = await updateAuctionSession(supabase, sessionRow.id, {
          status: 'winner_pending_payment',
          highest_bid_id: bidRow.id,
          winner_id: bidRow.bidder_id,
          winner_checkout_expires_at: winnerExpiry,
          reserve_met: true
        });
        await writeAudit(writeAuditLog, {
          actorUserId: userCtx.user.id,
          action: 'auction_counter_accepted',
          entityType: 'auction_bid',
          entityId: String(bidRow.id),
          details: { itemId, counterAmount }
        });
        const auction = await buildAuctionSnapshot({
          supabase,
          itemRow,
          sessionRow: updatedSession,
          viewerId: userCtx.user.id
        });
        return res.json({ ok: true, auction });
      }

      if (action === 'decline_counter') {
        await updateBid(supabase, bidRow.id, { status: 'counter_declined' });
        await writeAudit(writeAuditLog, {
          actorUserId: userCtx.user.id,
          action: 'auction_counter_declined',
          entityType: 'auction_bid',
          entityId: String(bidRow.id),
          details: { itemId }
        });
        const auction = await buildAuctionSnapshot({
          supabase,
          itemRow,
          sessionRow,
          viewerId: userCtx.user.id
        });
        return res.json({ ok: true, auction });
      }
    } catch (error) {
      console.error('commerce auction response failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update auction response.' });
    }
  });

  app.post('/commerce/auctions/:itemId/close', requireAuth, adminActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const itemId = normalizeText(req.params.itemId);
      if (!isUuid(itemId)) return res.status(400).json({ error: 'Invalid item id.' });
      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .select(
          'id,seller_id,title,description,listing_type,status,sale_price,rental_price,auction_start_price,auction_reserve_price,auction_end_at,stock,currency,metadata,owner_persona_id'
        )
        .eq('id', itemId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!itemRow) return res.status(404).json({ error: 'Auction item not found.' });
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(itemRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the seller or an admin can close this auction.' });
      }
      const sessionRow = await upsertAuctionSessionForItem(supabase, itemRow);
      const auction = await resolveAuctionOutcome({
        supabase,
        itemRow,
        sessionRow,
        forcePromoteNext: Boolean(req.body?.promoteNext),
        writeAuditLog,
        actorUserId: userCtx.user.id
      });
      res.json({ ok: true, auction });
    } catch (error) {
      console.error('commerce auction close failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to close auction.' });
    }
  });

  app.post('/commerce/orders/track', publicTrackingLimiter, async (req, res) => {
    try {
      const lookupId = normalizeText(req.body?.orderId || req.body?.order_id || req.body?.id);
      const email = normalizeText(req.body?.email || req.body?.billingEmail || req.body?.billing_email).toLowerCase();
      if (!isUuid(lookupId)) return res.status(400).json({ error: 'A valid order id is required.' });
      if (!isEmailLike(email)) return res.status(400).json({ error: 'A valid billing email is required.' });

      let orderRow = null;
      const { data: directOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', lookupId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (directOrder) {
        orderRow = directOrder;
      } else {
        const target = await resolveDetailTarget(supabase, lookupId);
        orderRow = target?.order || null;
      }

      if (!orderRow?.id) {
        return res.status(404).json({ error: 'Tracking details not found.' });
      }

      const { data: buyerRow, error: buyerError } = await supabase
        .from('users')
        .select('id,email')
        .eq('id', orderRow.buyer_id)
        .maybeSingle();
      if (buyerError) throw buyerError;
      if (!buyerRow || normalizeText(buyerRow.email).toLowerCase() !== email) {
        return res.status(404).json({ error: 'Tracking details not found.' });
      }

      const tracking = await buildOrderTrackingPayload(supabase, orderRow);
      res.json(tracking);
    } catch (error) {
      console.error('commerce public tracking failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to load tracking details.' });
    }
  });

  app.get('/commerce/orders/history', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const limit = Math.min(120, Math.max(1, Number.parseInt(String(req.query.limit || '80'), 10) || 80));
      const { data: orderRows, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', userCtx.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (orderError) throw orderError;
      const orderIds = (orderRows || []).map((row) => row.id);
      if (!orderIds.length) return res.json({ lines: [] });
      const [orderItemsRes, rentalRes] = await Promise.all([
        supabase.from('order_items').select('*').in('order_id', orderIds),
        supabase.from('rental_bookings').select('*').in('order_id', orderIds)
      ]);
      if (orderItemsRes.error) throw orderItemsRes.error;
      if (rentalRes.error) throw rentalRes.error;

      const orderMap = new Map((orderRows || []).map((row) => [String(row.id), row]));
      const rentalByOrderItem = new Map(
        (rentalRes.data || []).map((row) => [String(row.order_item_id || ''), row])
      );
      const lines = [];
      for (const orderItem of orderItemsRes.data || []) {
        const order = orderMap.get(String(orderItem.order_id || ''));
        if (!order) continue;
        const detail = await buildCommerceOrderDetail(supabase, {
          order,
          orderItem,
          booking: rentalByOrderItem.get(String(orderItem.id || '')) || null
        });
        lines.push(buildHistoryLine(detail, order.created_at || nowIso()));
      }
      res.json({ lines });
    } catch (error) {
      console.error('commerce order history failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load order history.' });
    }
  });

  app.post('/commerce/orders/checkout', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const result = await createCommerceOrder({
        supabase,
        firebaseApp,
        buyerContext: userCtx,
        payload: req.body || {},
        writeAuditLog
      });
      res.status(201).json(result);
    } catch (error) {
      console.error('commerce checkout failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to complete checkout.' });
    }
  });

  app.get('/commerce/orders/details/:id', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const target = await resolveDetailTarget(supabase, req.params.id);
      if (!target) return res.status(404).json({ error: 'Order detail not found.' });
      if (String(target.order.buyer_id || '') !== String(userCtx.user.id || '')) {
        return res.status(403).json({ error: 'You cannot access this order.' });
      }
      const detail = await buildCommerceOrderDetail(supabase, target);
      res.json(detail);
    } catch (error) {
      console.error('commerce order detail failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load order detail.' });
    }
  });

  app.get('/commerce/seller/bookings', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const [rentalRes, orderItemRes] = await Promise.all([
        supabase
          .from('rental_bookings')
          .select('*')
          .eq('seller_id', userCtx.user.id)
          .order('created_at', { ascending: false })
          .limit(120),
        supabase
          .from('order_items')
          .select('*')
          .eq('seller_id', userCtx.user.id)
          .neq('listing_type', 'rent')
          .order('created_at', { ascending: false })
          .limit(120)
      ]);
      if (rentalRes.error) throw rentalRes.error;
      if (orderItemRes.error) throw orderItemRes.error;

      const orderIds = uniqueStrings([
        ...(rentalRes.data || []).map((row) => row.order_id),
        ...(orderItemRes.data || []).map((row) => row.order_id)
      ]);
      const [orderRows, itemMap] = await Promise.all([
        fetchRowsByIds(supabase, 'orders', orderIds, '*'),
        fetchItemMap(supabase, [
          ...(rentalRes.data || []).map((row) => row.item_id),
          ...(orderItemRes.data || []).map((row) => row.item_id)
        ])
      ]);
      const orderMap = new Map(orderRows.map((row) => [String(row.id), row]));
      const details = [];
      for (const rental of rentalRes.data || []) {
        const orderItem = { id: rental.order_item_id, item_id: rental.item_id, order_id: rental.order_id, seller_id: rental.seller_id, quantity: 1, unit_price: 0, listing_type: 'rent', metadata: {} };
        const order = orderMap.get(String(rental.order_id || ''));
        if (!order) continue;
        details.push(await buildCommerceOrderDetail(supabase, { order, orderItem, booking: rental }));
      }
      for (const orderItem of orderItemRes.data || []) {
        const order = orderMap.get(String(orderItem.order_id || ''));
        if (!order) continue;
        details.push(await buildCommerceOrderDetail(supabase, { order, orderItem, booking: null }));
      }
      const bookings = details
        .map(mapDetailToBooking)
        .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());
      res.json({ bookings, itemMapSize: itemMap.size });
    } catch (error) {
      console.error('commerce seller bookings failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load seller bookings.' });
    }
  });

  app.get('/commerce/seller/bookings/:id', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const target = await resolveDetailTarget(supabase, req.params.id);
      if (!target) return res.status(404).json({ error: 'Booking detail not found.' });
      const sellerId = String(target.booking?.seller_id || target.orderItem?.seller_id || '');
      if (sellerId !== String(userCtx.user.id || '')) {
        const adminCtx = await resolveAdminContext(req).catch(() => null);
        if (!adminCtx || adminCtx.error) {
          return res.status(403).json({ error: 'You cannot access this booking.' });
        }
      }
      const detail = await buildCommerceOrderDetail(supabase, target);
      res.json(detail);
    } catch (error) {
      console.error('commerce seller booking detail failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load seller booking detail.' });
    }
  });

  app.post('/commerce/orders/:id/confirm-receipt', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const target = await resolveDetailTarget(supabase, req.params.id);
      if (!target) return res.status(404).json({ error: 'Order detail not found.' });
      if (String(target.order.buyer_id || '') !== String(userCtx.user.id || '')) {
        return res.status(403).json({ error: 'Only the buyer can confirm receipt.' });
      }

      if (target.booking) {
        const nextStatus =
          String(target.booking.delivery_mode || '') === 'pickup' &&
          String(target.booking.status || '') === 'ready_for_handoff'
            ? 'active'
            : 'active';
        const { data: bookingRow, error } = await supabase
          .from('rental_bookings')
          .update({ status: nextStatus })
          .eq('id', target.booking.id)
          .select('*')
          .single();
        if (error) throw error;
        await syncRentalHoldBlock(supabase, bookingRow);
        const detail = await buildCommerceOrderDetail(supabase, {
          ...target,
          booking: bookingRow
        });
        await insertNotification(
          supabase,
          target.orderItem.seller_id,
          'Rental handoff confirmed',
          `${detail.itemTitle} is now active.`,
          `/profile/orders/${detail.id}`,
          'order'
        );
        return res.json({ ok: true, detail });
      }

      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({
          status: 'delivered',
          delivered_at: nowIso()
        })
        .eq('order_id', target.order.id);
      if (shipmentError) throw shipmentError;
      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', target.order.id)
        .select('*')
        .single();
      if (orderError) throw orderError;
      const detail = await buildCommerceOrderDetail(supabase, { ...target, order: orderRow });
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce confirm receipt failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to confirm receipt.' });
    }
  });

  app.post('/commerce/orders/:id/fulfillment', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const target = await resolveDetailTarget(supabase, req.params.id);
      if (!target) return res.status(404).json({ error: 'Order detail not found.' });
      const sellerId = String(target.orderItem.seller_id || '');
      if (sellerId !== String(userCtx.user.id || '')) {
        return res.status(403).json({ error: 'Only the seller can update fulfillment.' });
      }
      if (target.booking) {
        return res.status(400).json({ error: 'Use rental lifecycle endpoints for rental bookings.' });
      }

      const action = normalizeText(req.body?.action).toLowerCase();
      const trackingNumber = normalizeText(req.body?.trackingNumber || req.body?.tracking_number) || null;
      const carrier = normalizeText(req.body?.carrier) || null;
      if (!['ship', 'deliver', 'complete'].includes(action)) {
        return res.status(400).json({ error: 'Unsupported fulfillment action.' });
      }

      if (action === 'ship') {
        const { error } = await supabase
          .from('shipments')
          .update({
            carrier: carrier || 'self_managed',
            tracking_number: trackingNumber,
            status: 'shipped',
            shipped_at: nowIso()
          })
          .eq('order_id', target.order.id);
        if (error) throw error;
        await supabase.from('orders').update({ status: 'shipped' }).eq('id', target.order.id);
      } else if (action === 'deliver') {
        await supabase
          .from('shipments')
          .update({
            tracking_number: trackingNumber || undefined,
            status: 'delivered',
            delivered_at: nowIso()
          })
          .eq('order_id', target.order.id);
        await supabase.from('orders').update({ status: 'delivered' }).eq('id', target.order.id);
      } else if (action === 'complete') {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', target.order.id);
      }

      const refreshedTarget = await resolveDetailTarget(supabase, req.params.id);
      const detail = await buildCommerceOrderDetail(supabase, refreshedTarget);
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce fulfillment update failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update fulfillment.' });
    }
  });

  app.post('/commerce/rentals/:id/confirm', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const bookingId = normalizeText(req.params.id);
      if (!isUuid(bookingId)) return res.status(400).json({ error: 'Invalid rental booking id.' });
      const { data: bookingRow, error: bookingError } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      if (bookingError) throw bookingError;
      if (!bookingRow) return res.status(404).json({ error: 'Rental booking not found.' });

      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(bookingRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the seller can confirm this rental.' });
      }

      const cancel = Boolean(req.body?.cancel);
      const patch = {
        status: cancel ? 'cancelled' : 'confirmed',
        pickup_instructions:
          req.body?.pickupInstructions !== undefined
            ? normalizeText(req.body.pickupInstructions) || null
            : bookingRow.pickup_instructions,
        pickup_code:
          req.body?.pickupCode !== undefined ? normalizeText(req.body.pickupCode) || null : bookingRow.pickup_code,
        pickup_window_start:
          req.body?.pickupWindowStart !== undefined
            ? (req.body.pickupWindowStart ? toIso(req.body.pickupWindowStart) : null)
            : bookingRow.pickup_window_start,
        pickup_window_end:
          req.body?.pickupWindowEnd !== undefined
            ? (req.body.pickupWindowEnd ? toIso(req.body.pickupWindowEnd) : null)
            : bookingRow.pickup_window_end
      };
      const { data: updated, error } = await supabase
        .from('rental_bookings')
        .update(patch)
        .eq('id', bookingId)
        .select('*')
        .single();
      if (error) throw error;

      await syncRentalHoldBlock(supabase, updated);
      const target = await resolveDetailTarget(supabase, bookingId);
      const detail = await buildCommerceOrderDetail(supabase, target);
      await syncLegacyRentalBookingMirror({
        firebaseApp,
        bookingRow: updated,
        orderItemRow: target.orderItem,
        itemRow: (await fetchItemMap(supabase, [updated.item_id])).get(String(updated.item_id || '')),
        buyerRow: (await fetchUserMap(supabase, [updated.buyer_id])).get(String(updated.buyer_id || '')),
        sellerRow: (await fetchUserMap(supabase, [updated.seller_id])).get(String(updated.seller_id || '')),
        shippingAddress: detail.shippingAddress,
        totalPrice: detail.totalPrice
      });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: cancel ? 'rental_booking_cancelled' : 'rental_booking_confirmed',
        entityType: 'rental_booking',
        entityId: bookingId,
        details: { orderId: updated.order_id }
      });
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce rental confirm failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to confirm rental.' });
    }
  });

  app.post('/commerce/rentals/:id/handoff', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const bookingId = normalizeText(req.params.id);
      const action = normalizeText(req.body?.action).toLowerCase();
      if (!isUuid(bookingId)) return res.status(400).json({ error: 'Invalid rental booking id.' });
      const { data: bookingRow, error: bookingError } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      if (bookingError) throw bookingError;
      if (!bookingRow) return res.status(404).json({ error: 'Rental booking not found.' });
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(bookingRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the seller can update rental handoff.' });
      }

      let nextStatus = bookingRow.status;
      if (action === 'ship') nextStatus = 'in_transit';
      else if (action === 'activate') nextStatus = 'active';
      else if (String(bookingRow.delivery_mode || '') === 'pickup') nextStatus = 'ready_for_handoff';
      else nextStatus = 'in_transit';

      const patch = {
        status: nextStatus,
        tracking_number:
          req.body?.trackingNumber !== undefined
            ? normalizeText(req.body.trackingNumber) || null
            : bookingRow.tracking_number,
        pickup_instructions:
          req.body?.pickupInstructions !== undefined
            ? normalizeText(req.body.pickupInstructions) || null
            : bookingRow.pickup_instructions,
        pickup_code:
          req.body?.pickupCode !== undefined ? normalizeText(req.body.pickupCode) || null : bookingRow.pickup_code,
        pickup_window_start:
          req.body?.pickupWindowStart !== undefined
            ? (req.body.pickupWindowStart ? toIso(req.body.pickupWindowStart) : null)
            : bookingRow.pickup_window_start,
        pickup_window_end:
          req.body?.pickupWindowEnd !== undefined
            ? (req.body.pickupWindowEnd ? toIso(req.body.pickupWindowEnd) : null)
            : bookingRow.pickup_window_end
      };

      const { data: updated, error } = await supabase
        .from('rental_bookings')
        .update(patch)
        .eq('id', bookingId)
        .select('*')
        .single();
      if (error) throw error;
      await syncRentalHoldBlock(supabase, updated);
      const target = await resolveDetailTarget(supabase, bookingId);
      const detail = await buildCommerceOrderDetail(supabase, target);
      await syncLegacyRentalBookingMirror({
        firebaseApp,
        bookingRow: updated,
        orderItemRow: target.orderItem,
        itemRow: (await fetchItemMap(supabase, [updated.item_id])).get(String(updated.item_id || '')),
        buyerRow: (await fetchUserMap(supabase, [updated.buyer_id])).get(String(updated.buyer_id || '')),
        sellerRow: (await fetchUserMap(supabase, [updated.seller_id])).get(String(updated.seller_id || '')),
        shippingAddress: detail.shippingAddress,
        totalPrice: detail.totalPrice
      });
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce rental handoff failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update rental handoff.' });
    }
  });

  app.post('/commerce/rentals/:id/return', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const bookingId = normalizeText(req.params.id);
      const action = normalizeText(req.body?.action).toLowerCase();
      if (!isUuid(bookingId)) return res.status(400).json({ error: 'Invalid rental booking id.' });
      const { data: bookingRow, error: bookingError } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      if (bookingError) throw bookingError;
      if (!bookingRow) return res.status(404).json({ error: 'Rental booking not found.' });
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(bookingRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the seller can update rental returns.' });
      }

      let nextStatus = bookingRow.status;
      if (action === 'start') nextStatus = 'return_in_transit';
      else if (action === 'complete') nextStatus = 'completed';
      else nextStatus = 'returned';

      const { data: updated, error } = await supabase
        .from('rental_bookings')
        .update({
          status: nextStatus,
          return_tracking_number:
            req.body?.returnTrackingNumber !== undefined
              ? normalizeText(req.body.returnTrackingNumber) || null
              : bookingRow.return_tracking_number
        })
        .eq('id', bookingId)
        .select('*')
        .single();
      if (error) throw error;
      await syncRentalHoldBlock(supabase, updated);
      const target = await resolveDetailTarget(supabase, bookingId);
      const detail = await buildCommerceOrderDetail(supabase, target);
      await syncLegacyRentalBookingMirror({
        firebaseApp,
        bookingRow: updated,
        orderItemRow: target.orderItem,
        itemRow: (await fetchItemMap(supabase, [updated.item_id])).get(String(updated.item_id || '')),
        buyerRow: (await fetchUserMap(supabase, [updated.buyer_id])).get(String(updated.buyer_id || '')),
        sellerRow: (await fetchUserMap(supabase, [updated.seller_id])).get(String(updated.seller_id || '')),
        shippingAddress: detail.shippingAddress,
        totalPrice: detail.totalPrice
      });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action:
          nextStatus === 'completed'
            ? 'rental_booking_completed'
            : nextStatus === 'return_in_transit'
              ? 'rental_return_started'
              : 'rental_return_received',
        entityType: 'rental_booking',
        entityId: bookingId,
        details: { orderId: updated.order_id }
      });
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce rental return failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update rental return.' });
    }
  });

  app.post('/commerce/rentals/:id/deposit/release', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const bookingId = normalizeText(req.params.id);
      if (!isUuid(bookingId)) return res.status(400).json({ error: 'Invalid rental booking id.' });
      const { data: bookingRow, error: bookingError } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      if (bookingError) throw bookingError;
      if (!bookingRow) return res.status(404).json({ error: 'Rental booking not found.' });
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(bookingRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the seller can release the deposit.' });
      }
      const { data: updated, error } = await supabase
        .from('rental_bookings')
        .update({ security_deposit_status: 'released' })
        .eq('id', bookingId)
        .select('*')
        .single();
      if (error) throw error;
      await syncBookingDepositPaymentState(supabase, updated, 'released', {
        deposit_claim_amount: null,
        deposit_claim_reason: null,
        deposit_claim_evidence_url: null
      });
      const target = await resolveDetailTarget(supabase, bookingId);
      const detail = await buildCommerceOrderDetail(supabase, { ...target, booking: updated });
      await syncLegacyRentalBookingMirror({
        firebaseApp,
        bookingRow: updated,
        orderItemRow: target.orderItem,
        itemRow: (await fetchItemMap(supabase, [updated.item_id])).get(String(updated.item_id || '')),
        buyerRow: (await fetchUserMap(supabase, [updated.buyer_id])).get(String(updated.buyer_id || '')),
        sellerRow: (await fetchUserMap(supabase, [updated.seller_id])).get(String(updated.seller_id || '')),
        shippingAddress: detail.shippingAddress,
        totalPrice: detail.totalPrice
      });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'rental_deposit_released',
        entityType: 'rental_booking',
        entityId: bookingId,
        details: { amount: parseMoney(updated.security_deposit_amount || 0) }
      });
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce rental deposit release failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to release deposit.' });
    }
  });

  app.post('/commerce/rentals/:id/deposit/claim', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const bookingId = normalizeText(req.params.id);
      const claimAmount = parseMoney(req.body?.amount);
      if (!isUuid(bookingId) || claimAmount <= 0) {
        return res.status(400).json({ error: 'A valid rental booking id and claim amount are required.' });
      }
      const { data: bookingRow, error: bookingError } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      if (bookingError) throw bookingError;
      if (!bookingRow) return res.status(404).json({ error: 'Rental booking not found.' });
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      if (String(bookingRow.seller_id || '') !== String(userCtx.user.id || '') && !isAdmin) {
        return res.status(403).json({ error: 'Only the seller can claim the deposit.' });
      }
      const heldDeposit = parseMoney(bookingRow.security_deposit_amount || 0);
      if (claimAmount > heldDeposit) {
        return res.status(400).json({ error: 'Claim amount cannot exceed the held deposit.' });
      }
      const { data: updated, error } = await supabase
        .from('rental_bookings')
        .update({
          security_deposit_status: 'claimed',
          claim_amount: claimAmount,
          claim_reason: normalizeText(req.body?.reason) || 'Damage claim',
          claim_evidence_url: normalizeText(req.body?.evidenceUrl || req.body?.evidence_url) || null
        })
        .eq('id', bookingId)
        .select('*')
        .single();
      if (error) throw error;
      await syncBookingDepositPaymentState(supabase, updated, 'claimed', {
        deposit_claim_amount: claimAmount,
        deposit_claim_reason: normalizeText(req.body?.reason) || 'Damage claim',
        deposit_claim_evidence_url: normalizeText(req.body?.evidenceUrl || req.body?.evidence_url) || null
      });
      const target = await resolveDetailTarget(supabase, bookingId);
      const detail = await buildCommerceOrderDetail(supabase, { ...target, booking: updated });
      await syncLegacyRentalBookingMirror({
        firebaseApp,
        bookingRow: updated,
        orderItemRow: target.orderItem,
        itemRow: (await fetchItemMap(supabase, [updated.item_id])).get(String(updated.item_id || '')),
        buyerRow: (await fetchUserMap(supabase, [updated.buyer_id])).get(String(updated.buyer_id || '')),
        sellerRow: (await fetchUserMap(supabase, [updated.seller_id])).get(String(updated.seller_id || '')),
        shippingAddress: detail.shippingAddress,
        totalPrice: detail.totalPrice
      });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'rental_deposit_claimed',
        entityType: 'rental_booking',
        entityId: bookingId,
        details: { amount: claimAmount }
      });
      res.json({ ok: true, detail });
    } catch (error) {
      console.error('commerce rental deposit claim failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to claim deposit.' });
    }
  });

  app.get('/commerce/profile/bids', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const { data: bidRows, error } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('bidder_id', userCtx.user.id)
        .order('placed_at', { ascending: false })
        .limit(120);
      if (error) throw error;
      const itemMap = await fetchItemMap(supabase, (bidRows || []).map((row) => row.item_id));
      const sessionRows = [];
      for (const itemId of uniqueStrings((bidRows || []).map((row) => row.item_id))) {
        const itemRow = itemMap.get(itemId);
        if (!itemRow) continue;
        sessionRows.push(await upsertAuctionSessionForItem(supabase, itemRow));
      }
      const sessionMap = new Map(sessionRows.map((row) => [String(row.item_id), row]));
      const rows = [];
      for (const bidRow of bidRows || []) {
        const itemRow = itemMap.get(String(bidRow.item_id || ''));
        if (!itemRow) continue;
        const sessionRow = sessionMap.get(String(bidRow.item_id || ''));
        const snapshot = await buildAuctionSnapshot({
          supabase,
          itemRow,
          sessionRow,
          viewerId: userCtx.user.id
        });
        const metadata = jsonObject(bidRow.metadata);
        const counterAmount = parseMoney(firstDefined(metadata.counterAmount, metadata.counter_amount, 0));
        const amount =
          metadata.counterAcceptedAt || metadata.counter_accepted_at ? counterAmount || parseMoney(bidRow.amount) : parseMoney(bidRow.amount);
        rows.push({
          id: String(bidRow.id),
          itemId: String(itemRow.id),
          itemTitle: String(itemRow.title || 'Auction item'),
          amount,
          status:
            String(sessionRow?.winner_id || '') === String(userCtx.user.id || '') &&
            String(sessionRow?.status || '') === 'winner_pending_payment'
              ? 'winner'
              : normalizeAuctionProfileStatus(bidRow.status),
          counterAmount: counterAmount > 0 ? counterAmount : undefined,
          placedAt: toIso(firstDefined(bidRow.placed_at, bidRow.created_at)),
          sourceThreadId: normalizeText(bidRow.source_thread_id) || null,
          currentBid: snapshot.currentBid,
          canCheckout: Boolean(snapshot.canCheckout && String(sessionRow?.highest_bid_id || '') === String(bidRow.id)),
          canAcceptCounter:
            normalizeAuctionProfileStatus(bidRow.status) === 'countered' && counterAmount > parseMoney(bidRow.amount),
          canDeclineCounter:
            normalizeAuctionProfileStatus(bidRow.status) === 'countered' && counterAmount > parseMoney(bidRow.amount),
          winnerCheckoutExpiresAt: sessionRow?.winner_checkout_expires_at
            ? toIso(sessionRow.winner_checkout_expires_at)
            : null,
          auctionStatus: String(sessionRow?.status || 'live'),
          buyNowPrice: snapshot.buyNowPrice
        });
      }
      res.json({ bids: rows });
    } catch (error) {
      console.error('commerce profile bids failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load bids.' });
    }
  });

  app.get('/commerce/disputes', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const adminCtx = await resolveAdminContext(req).catch(() => null);
      const isAdmin = Boolean(adminCtx && !adminCtx.error);
      const { data: disputes, error } = await supabase
        .from('commerce_disputes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      let visible = disputes || [];
      if (!isAdmin) {
        const [buyerOrders, buyerRentals, sellerOrderItems, sellerRentals] = await Promise.all([
          supabase.from('orders').select('id').eq('buyer_id', userCtx.user.id),
          supabase.from('rental_bookings').select('id,order_id').eq('buyer_id', userCtx.user.id),
          supabase.from('order_items').select('id').eq('seller_id', userCtx.user.id),
          supabase.from('rental_bookings').select('id,order_id').eq('seller_id', userCtx.user.id)
        ]);
        const orderIds = new Set([
          ...((buyerOrders.data || []).map((row) => String(row.id || ''))),
          ...((buyerRentals.data || []).map((row) => String(row.order_id || ''))),
          ...((sellerRentals.data || []).map((row) => String(row.order_id || '')))
        ]);
        const orderItemIds = new Set((sellerOrderItems.data || []).map((row) => String(row.id || '')));
        const rentalIds = new Set([
          ...((buyerRentals.data || []).map((row) => String(row.id || ''))),
          ...((sellerRentals.data || []).map((row) => String(row.id || '')))
        ]);
        visible = visible.filter(
          (row) =>
            String(row.opened_by || '') === String(userCtx.user.id || '') ||
            orderIds.has(String(row.order_id || '')) ||
            orderItemIds.has(String(row.order_item_id || '')) ||
            rentalIds.has(String(row.rental_booking_id || ''))
        );
      }

      const userMap = await fetchUserMap(supabase, visible.map((row) => row.opened_by));
      res.json({
        disputes: visible.map((row) => ({
          id: String(row.id),
          orderId: row.order_id ? String(row.order_id) : null,
          orderItemId: row.order_item_id ? String(row.order_item_id) : null,
          rentalBookingId: row.rental_booking_id ? String(row.rental_booking_id) : null,
          openedBy: {
            id: String(row.opened_by || ''),
            name: String(userMap.get(String(row.opened_by || ''))?.name || 'User')
          },
          reasonCode: String(row.reason_code || 'dispute'),
          details: String(row.details || ''),
          status: normalizeDisputeStatusForUi(row.status),
          resolution: row.resolution ? String(row.resolution) : undefined,
          adminNotes: row.admin_notes ? String(row.admin_notes) : undefined,
          createdAt: toIso(row.created_at)
        }))
      });
    } catch (error) {
      console.error('commerce disputes failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load disputes.' });
    }
  });

  app.post('/commerce/disputes', requireAuth, disputeLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const orderId = normalizeText(req.body?.orderId || req.body?.order_id) || null;
      const orderItemId = normalizeText(req.body?.orderItemId || req.body?.order_item_id) || null;
      const rentalBookingId = normalizeText(req.body?.rentalBookingId || req.body?.rental_booking_id) || null;
      if (!orderId && !orderItemId && !rentalBookingId) {
        return res.status(400).json({ error: 'A dispute must reference an order, line item, or rental booking.' });
      }

      let permitted = false;
      if (orderId && isUuid(orderId)) {
        const { data: orderRow } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        permitted = permitted || String(orderRow?.buyer_id || '') === String(userCtx.user.id || '');
      }
      if (orderItemId && isUuid(orderItemId)) {
        const { data: orderItemRow } = await supabase
          .from('order_items')
          .select('*')
          .eq('id', orderItemId)
          .maybeSingle();
        permitted = permitted || String(orderItemRow?.seller_id || '') === String(userCtx.user.id || '');
      }
      if (rentalBookingId && isUuid(rentalBookingId)) {
        const { data: bookingRow } = await supabase
          .from('rental_bookings')
          .select('*')
          .eq('id', rentalBookingId)
          .maybeSingle();
        permitted =
          permitted ||
          [String(bookingRow?.buyer_id || ''), String(bookingRow?.seller_id || '')].includes(
            String(userCtx.user.id || '')
          );
      }
      if (!permitted) {
        return res.status(403).json({ error: 'Only the buyer or seller on the order can open a dispute.' });
      }

      const { data: disputeRow, error } = await supabase
        .from('commerce_disputes')
        .insert({
          order_id: orderId || null,
          order_item_id: orderItemId || null,
          rental_booking_id: rentalBookingId || null,
          opened_by: userCtx.user.id,
          reason_code: normalizeText(req.body?.reasonCode || req.body?.reason_code) || 'dispute',
          details: normalizeText(req.body?.details) || '',
          status: 'open'
        })
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'commerce_dispute_opened',
        entityType: 'commerce_dispute',
        entityId: String(disputeRow.id),
        details: { orderId, orderItemId, rentalBookingId }
      });
      res.status(201).json({ ok: true, id: disputeRow.id });
    } catch (error) {
      console.error('commerce dispute create failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to create dispute.' });
    }
  });

  app.patch('/commerce/disputes/:id', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const disputeId = normalizeText(req.params.id);
      if (!isUuid(disputeId)) return res.status(400).json({ error: 'Invalid dispute id.' });
      const patch = {
        status: normalizeDisputeStatusForDb(req.body?.status),
        resolution: normalizeText(req.body?.resolution) || null,
        admin_notes: normalizeText(req.body?.adminNotes || req.body?.admin_notes) || null
      };
      const { error } = await supabase.from('commerce_disputes').update(patch).eq('id', disputeId);
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'commerce_dispute_updated',
        entityType: 'commerce_dispute',
        entityId: disputeId,
        details: { status: patch.status }
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('commerce dispute update failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to update dispute.' });
    }
  });

  app.get('/commerce/dropship/profile', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const [platform, profileRow] = await Promise.all([
        getDropshippingPlatformSettings(supabase),
        ensureSellerDropshipProfile(supabase, userCtx.user.id)
      ]);
      const profile = mapSellerDropshipProfileRow(profileRow);
      res.json({
        profile,
        platform: platform.dropshipping,
        canAccessCatalog:
          platform.dropshipping.enabled &&
          (!platform.dropshipping.requireApproval || profile.status === 'approved'),
        requirements: [
          'Approved seller account',
          'Verified store identity',
          'Margin guardrail compliance',
          'Blind dropship buyer experience'
        ]
      });
    } catch (error) {
      console.error('dropship profile load failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load dropshipping profile.' });
    }
  });

  app.post('/commerce/dropship/profile', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const current = await ensureSellerDropshipProfile(supabase, userCtx.user.id);
      const currentProfile = mapSellerDropshipProfileRow(current);
      const nextSettings = {
        ...currentProfile.settings,
        ...jsonObject(req.body?.settings),
        application: {
          ...(jsonObject(currentProfile.settings).application || {}),
          ...(jsonObject(req.body?.application) || {})
        }
      };
      const patch = {
        seller_persona_id: req.body?.sellerPersonaId || current.seller_persona_id || null,
        status:
          currentProfile.status === 'approved' && !Boolean(req.body?.resubmit)
            ? 'approved'
            : 'pending',
        risk_notes: current.risk_notes || null,
        settings: nextSettings
      };
      const { data, error } = await supabase
        .from('seller_dropship_profiles')
        .update(patch)
        .eq('id', current.id)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_profile_submitted',
        entityType: 'seller_dropship_profile',
        entityId: String(data.id),
        details: { status: patch.status }
      });
      res.status(201).json({ profile: mapSellerDropshipProfileRow(data) });
    } catch (error) {
      console.error('dropship profile submit failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to submit dropshipping profile.' });
    }
  });

  app.patch('/commerce/dropship/profile', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const current = await ensureSellerDropshipProfile(supabase, userCtx.user.id);
      const currentProfile = mapSellerDropshipProfileRow(current);
      const nextSettings = {
        ...currentProfile.settings,
        ...jsonObject(req.body?.settings)
      };
      const patch = {
        seller_persona_id: firstDefined(req.body?.sellerPersonaId, current.seller_persona_id, null),
        settings: nextSettings
      };
      if (req.body?.status && ['draft', 'pending'].includes(normalizeSellerDropshipStatus(req.body.status))) {
        patch.status = normalizeSellerDropshipStatus(req.body.status);
      }
      const { data, error } = await supabase
        .from('seller_dropship_profiles')
        .update(patch)
        .eq('id', current.id)
        .select('*')
        .single();
      if (error) throw error;
      res.json({ profile: mapSellerDropshipProfileRow(data) });
    } catch (error) {
      console.error('dropship profile patch failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update dropshipping profile.' });
    }
  });

  app.get('/commerce/dropship/catalog', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const platform = (await getDropshippingPlatformSettings(supabase)).dropshipping;
      if (!platform.enabled) {
        return res.status(403).json({ error: 'Dropshipping is currently disabled.' });
      }
      await requireApprovedSellerDropshipProfile(supabase, userCtx.user.id, platform);
      let queryBuilder = supabase
        .from('supplier_products')
        .select('*')
        .in('status', ['active', 'draft'])
        .neq('seller_visibility', 'hidden')
        .order('updated_at', { ascending: false })
        .limit(Math.min(200, Number(req.query.limit || 80) || 80));
      const supplierId = normalizeText(req.query.supplierId);
      const category = normalizeText(req.query.category);
      const search = normalizeText(req.query.q);
      if (supplierId && isUuid(supplierId)) queryBuilder = queryBuilder.eq('supplier_id', supplierId);
      if (category) queryBuilder = queryBuilder.ilike('category', `%${category}%`);
      if (search) queryBuilder = queryBuilder.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      const { data: rows, error } = await queryBuilder;
      if (error) throw error;
      const supplierRows = await fetchRowsByIds(
        supabase,
        'suppliers',
        (rows || []).map((row) => row.supplier_id),
        '*'
      );
      const supplierMap = new Map(supplierRows.map((row) => [String(row.id), row]));
      res.json({
        products: (rows || []).map((row) => mapSupplierProductRow(row, supplierMap.get(String(row.supplier_id || ''))))
      });
    } catch (error) {
      console.error('dropship catalog failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to load dropshipping catalog.' });
    }
  });

  app.get('/commerce/dropship/catalog/:productId', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const platform = (await getDropshippingPlatformSettings(supabase)).dropshipping;
      await requireApprovedSellerDropshipProfile(supabase, userCtx.user.id, platform);
      const productId = normalizeText(req.params.productId);
      if (!isUuid(productId)) return res.status(400).json({ error: 'Invalid supplier product id.' });
      const { data: row, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return res.status(404).json({ error: 'Supplier product not found.' });
      const { data: supplierRow, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', row.supplier_id)
        .maybeSingle();
      if (supplierError) throw supplierError;
      res.json({ product: mapSupplierProductRow(row, supplierRow) });
    } catch (error) {
      console.error('dropship catalog detail failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to load supplier product.' });
    }
  });

  app.post('/commerce/dropship/import', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const platform = (await getDropshippingPlatformSettings(supabase)).dropshipping;
      if (!platform.enabled) return res.status(403).json({ error: 'Dropshipping is currently disabled.' });
      await requireApprovedSellerDropshipProfile(supabase, userCtx.user.id, platform);
      const supplierProductId = normalizeText(req.body?.supplierProductId || req.body?.productId);
      if (!isUuid(supplierProductId)) {
        return res.status(400).json({ error: 'A valid supplier product id is required.' });
      }
      const { data: productRow, error: productError } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('id', supplierProductId)
        .maybeSingle();
      if (productError) throw productError;
      if (!productRow) return res.status(404).json({ error: 'Supplier product not found.' });
      const { data: supplierRow, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', productRow.supplier_id)
        .maybeSingle();
      if (supplierError) throw supplierError;
      if (!supplierRow) return res.status(404).json({ error: 'Supplier not found.' });

      const supplier = mapSupplierRow(supplierRow);
      const product = mapSupplierProductRow(productRow, supplierRow);
      if (supplier.status !== 'active' || product.status !== 'active') {
        return res.status(400).json({ error: 'Only active supplier products can be imported.' });
      }

      const salePrice = parseMoney(req.body?.salePrice || req.body?.price);
      if (salePrice <= 0) return res.status(400).json({ error: 'A sale price is required.' });
      const routingMode = normalizeDropshipRoutingMode(
        firstDefined(req.body?.routingMode, supplier.defaultRoutingMode)
      );
      const minMarginPercent =
        Number.parseFloat(String(firstDefined(req.body?.minMarginPercent, 20))) || 0;
      const unitInternalCost = parseMoney(product.wholesalePrice + product.shippingInfo.cost);
      const marginPercent = salePrice > 0 ? ((salePrice - unitInternalCost) / salePrice) * 100 : -999;
      if (marginPercent < minMarginPercent) {
        return res.status(400).json({ error: 'Sale price falls below the configured margin floor.' });
      }

      const itemStatus = ['draft', 'published'].includes(String(req.body?.status || '').toLowerCase())
        ? String(req.body.status).toLowerCase()
        : 'published';
      const imageUrls = Array.isArray(req.body?.imageUrls) && req.body.imageUrls.length
        ? req.body.imageUrls.map((entry) => String(entry || '')).filter(Boolean)
        : product.imageUrls;
      const metadata = {
        title: normalizeText(req.body?.title) || product.title,
        description: normalizeText(req.body?.description) || product.description,
        category: normalizeText(req.body?.category) || product.category,
        imageUrls,
        images: imageUrls,
        productType: 'dropship',
        fulfillmentType: 'dropship',
        originCountry: product.countryOfOrigin || '',
        supplierInfo: {
          id: product.id,
          supplierId: supplier.id,
          supplierProductId: product.id,
          name: supplier.name,
          shippingCost: product.shippingInfo.cost,
          processingTimeDays: product.processingTimeDays
        },
        dropshipProfile: {
          supplierId: supplier.id,
          supplierProductId: product.id,
          supplierSku: product.supplierSku || '',
          supplierName: supplier.name,
          routingMode,
          blindDropship: firstDefined(req.body?.blindDropship, supplier.blindDropship, true) !== false,
          minMarginPercent,
          autoFulfill: Boolean(firstDefined(req.body?.autoFulfill, routingMode === 'auto_submit')),
          processingTimeDays: product.processingTimeDays,
          manualSupplierLinkRequired: false
        },
        automation: {
          autoFulfill: Boolean(firstDefined(req.body?.autoFulfill, routingMode === 'auto_submit')),
          minMarginPercent
        },
        shippingEstimates: Array.isArray(product.shippingEstimates) ? product.shippingEstimates : [],
        returnPolicy: product.returnPolicy || supplier.returnPolicy || {},
        certifications: Array.isArray(product.certifications) ? product.certifications : []
      };

      const { data: itemRow, error: itemError } = await supabase
        .from('items')
        .insert({
          seller_id: userCtx.user.id,
          title: metadata.title,
          description: metadata.description,
          listing_type: 'sale',
          status: itemStatus,
          condition: 'new',
          currency: product.currency || DEFAULT_CURRENCY,
          sale_price: salePrice,
          stock: Math.max(1, Number(product.stock || 999) || 999),
          metadata
        })
        .select('*')
        .single();
      if (itemError) throw itemError;

      if (imageUrls.length) {
        const imageRows = imageUrls.map((url, index) => ({
          item_id: itemRow.id,
          url,
          sort_order: index
        }));
        const { error: imageError } = await supabase.from('item_images').insert(imageRows);
        if (imageError) {
          console.warn('dropship import image insert failed:', imageError.message || imageError);
        }
      }

      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_item_imported',
        entityType: 'item',
        entityId: String(itemRow.id),
        details: {
          supplierId: supplier.id,
          supplierProductId: product.id,
          routingMode
        }
      });

      res.status(201).json({
        ok: true,
        item: {
          id: String(itemRow.id),
          title: String(itemRow.title),
          status: String(itemRow.status),
          salePrice: parseMoney(itemRow.sale_price || 0),
          supplierProductId: product.id
        }
      });
    } catch (error) {
      console.error('dropship import failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to import supplier product.' });
    }
  });

  app.get('/commerce/dropship/orders', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      let queryBuilder = supabase
        .from('supplier_orders')
        .select('*')
        .eq('seller_id', userCtx.user.id)
        .order('created_at', { ascending: false })
        .limit(Math.min(200, Number(req.query.limit || 80) || 80));
      const status = normalizeText(req.query.status);
      if (status) queryBuilder = queryBuilder.eq('status', status);
      const { data: rows, error } = await queryBuilder;
      if (error) throw error;
      res.json({ orders: await loadMappedSupplierOrders(rows || []) });
    } catch (error) {
      console.error('dropship seller orders failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load dropship orders.' });
    }
  });

  app.get('/commerce/dropship/orders/:id', requireAuth, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      if (!isUuid(supplierOrderId)) return res.status(400).json({ error: 'Invalid supplier order id.' });
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context || String(context.row.seller_id || '') !== String(userCtx.user.id)) {
        return res.status(404).json({ error: 'Supplier order not found.' });
      }
      res.json({ order: context.mapped });
    } catch (error) {
      console.error('dropship seller order detail failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load supplier order.' });
    }
  });

  app.post('/commerce/dropship/orders/:id/approve', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context || String(context.row.seller_id || '') !== String(userCtx.user.id)) {
        return res.status(404).json({ error: 'Supplier order not found.' });
      }
      if (normalizeDropshipRoutingMode(context.row.routing_mode) !== 'seller_approve') {
        return res.status(400).json({ error: 'This supplier order does not require seller approval.' });
      }
      const { data, error } = await supabase
        .from('supplier_orders')
        .update({
          approval_state: 'approved',
          status: 'approved',
          approved_at: nowIso(),
          metadata: {
            ...jsonObject(context.row.metadata),
            approvedBySellerAt: nowIso()
          }
        })
        .eq('id', supplierOrderId)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_order_approved',
        entityType: 'supplier_order',
        entityId: supplierOrderId,
        details: { orderId: data.order_id }
      });
      res.json({ order: (await loadMappedSupplierOrders([data]))[0] });
    } catch (error) {
      console.error('dropship seller approve failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to approve supplier order.' });
    }
  });

  app.post('/commerce/dropship/orders/:id/submit', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context || String(context.row.seller_id || '') !== String(userCtx.user.id)) {
        return res.status(404).json({ error: 'Supplier order not found.' });
      }
      const platform = (await getDropshippingPlatformSettings(supabase)).dropshipping;
      await requireApprovedSellerDropshipProfile(supabase, userCtx.user.id, platform);
      const metadata = jsonObject(context.row.metadata);
      const idempotencyKey = normalizeText(req.body?.idempotencyKey || req.body?.requestId || '');
      if (idempotencyKey && metadata.lastSubmitIdempotencyKey === idempotencyKey) {
        return res.json({ order: context.mapped });
      }
      if (
        normalizeDropshipRoutingMode(context.row.routing_mode) === 'seller_approve' &&
        normalizeDropshipApprovalState(context.row.approval_state) !== 'approved'
      ) {
        return res.status(400).json({ error: 'Approve this supplier order before submitting it.' });
      }
      const patch = {
        approval_state:
          normalizeDropshipApprovalState(context.row.approval_state) === 'pending' ? 'approved' : context.row.approval_state,
        status: 'submitted',
        approved_at: context.row.approved_at || nowIso(),
        submitted_at: nowIso(),
        external_order_ref:
          normalizeText(context.row.external_order_ref) ||
          `UPDS-${String(context.row.order_id || '').slice(0, 8)}-${String(context.row.id).slice(0, 6)}`,
        external_status: 'queued',
        metadata: {
          ...metadata,
          lastSubmitIdempotencyKey: idempotencyKey || null,
          trackingSyncState: 'pending'
        }
      };
      const { data, error } = await supabase
        .from('supplier_orders')
        .update(patch)
        .eq('id', supplierOrderId)
        .select('*')
        .single();
      if (error) throw error;
      await syncDropshipShipmentState(supabase, data.order_id, data, null, { status: 'processing' });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_order_submitted',
        entityType: 'supplier_order',
        entityId: supplierOrderId,
        details: { externalOrderRef: patch.external_order_ref }
      });
      res.json({ order: (await loadMappedSupplierOrders([data]))[0] });
    } catch (error) {
      console.error('dropship seller submit failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to submit supplier order.' });
    }
  });

  app.post('/commerce/dropship/orders/:id/cancel', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context || String(context.row.seller_id || '') !== String(userCtx.user.id)) {
        return res.status(404).json({ error: 'Supplier order not found.' });
      }
      const patch = {
        status: 'cancelled',
        approval_state: 'cancelled',
        cancel_reason: normalizeText(req.body?.reason || req.body?.cancelReason) || 'Seller cancelled order',
        cancelled_at: nowIso(),
        metadata: {
          ...jsonObject(context.row.metadata),
          trackingSyncState: 'cancelled'
        }
      };
      const { data, error } = await supabase
        .from('supplier_orders')
        .update(patch)
        .eq('id', supplierOrderId)
        .select('*')
        .single();
      if (error) throw error;
      await syncDropshipShipmentState(supabase, data.order_id, data, null, { status: 'cancelled' });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_order_cancelled',
        entityType: 'supplier_order',
        entityId: supplierOrderId,
        details: { reason: patch.cancel_reason }
      });
      res.json({ order: (await loadMappedSupplierOrders([data]))[0] });
    } catch (error) {
      console.error('dropship seller cancel failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to cancel supplier order.' });
    }
  });

  app.post('/commerce/dropship/orders/:id/tracking', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context || String(context.row.seller_id || '') !== String(userCtx.user.id)) {
        return res.status(404).json({ error: 'Supplier order not found.' });
      }
      const metadata = jsonObject(context.row.metadata);
      const idempotencyKey = normalizeText(req.body?.idempotencyKey || req.body?.requestId);
      if (idempotencyKey && metadata.lastTrackingIdempotencyKey === idempotencyKey) {
        return res.json({ order: context.mapped });
      }
      const trackingNumber = normalizeText(req.body?.trackingNumber || req.body?.tracking_number);
      const carrier = normalizeText(req.body?.carrier);
      const requestedStatus = normalizeText(req.body?.status).toLowerCase();
      const nextStatus =
        requestedStatus === 'delivered'
          ? 'delivered'
          : requestedStatus === 'processing'
            ? 'processing'
            : 'shipped';
      const patch = {
        carrier: carrier || context.row.carrier || null,
        tracking_number: trackingNumber || context.row.tracking_number || null,
        external_status: normalizeText(req.body?.externalStatus || nextStatus) || nextStatus,
        status: nextStatus,
        shipped_at: context.row.shipped_at || nowIso(),
        delivered_at: nextStatus === 'delivered' ? nowIso() : context.row.delivered_at || null,
        metadata: {
          ...metadata,
          lastTrackingIdempotencyKey: idempotencyKey || null,
          trackingSyncState: 'synced'
        }
      };
      const { data, error } = await supabase
        .from('supplier_orders')
        .update(patch)
        .eq('id', supplierOrderId)
        .select('*')
        .single();
      if (error) throw error;
      await syncDropshipShipmentState(supabase, data.order_id, data, null, {
        carrier: patch.carrier,
        trackingNumber: patch.tracking_number,
        status: nextStatus === 'delivered' ? 'delivered' : 'shipped'
      });
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_tracking_updated',
        entityType: 'supplier_order',
        entityId: supplierOrderId,
        details: { trackingNumber: patch.tracking_number, status: nextStatus }
      });
      res.json({ order: (await loadMappedSupplierOrders([data]))[0] });
    } catch (error) {
      console.error('dropship seller tracking failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update supplier tracking.' });
    }
  });

  app.post('/commerce/dropship/orders/:id/retry', requireAuth, dropshipActionLimiter, async (req, res) => {
    const userCtx = await requireResolvedUser(req, res, getUserContext);
    if (!userCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context || String(context.row.seller_id || '') !== String(userCtx.user.id)) {
        return res.status(404).json({ error: 'Supplier order not found.' });
      }
      const currentStatus = normalizeText(context.row.status).toLowerCase();
      if (!['failed', 'cancelled', 'pending_review', 'approved'].includes(currentStatus)) {
        return res.status(400).json({ error: 'This supplier order cannot be retried right now.' });
      }
      const metadata = jsonObject(context.row.metadata);
      const patch = {
        status: normalizeDropshipRoutingMode(context.row.routing_mode) === 'seller_approve' ? 'approved' : 'pending_review',
        approval_state:
          normalizeDropshipRoutingMode(context.row.routing_mode) === 'seller_approve' ? 'approved' : 'pending',
        cancel_reason: null,
        failure_reason: null,
        failed_at: null,
        cancelled_at: null,
        metadata: {
          ...metadata,
          retriedAt: nowIso(),
          trackingSyncState: 'pending'
        }
      };
      const { data, error } = await supabase
        .from('supplier_orders')
        .update(patch)
        .eq('id', supplierOrderId)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: userCtx.user.id,
        action: 'dropship_order_retried',
        entityType: 'supplier_order',
        entityId: supplierOrderId,
        details: { previousStatus: currentStatus }
      });
      res.json({ order: (await loadMappedSupplierOrders([data]))[0] });
    } catch (error) {
      console.error('dropship seller retry failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to retry supplier order.' });
    }
  });

  app.get('/commerce/dropship/admin/overview', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const [platform, supplierRes, productRes, sellerRes, orderRes, settlementRes] = await Promise.all([
        getDropshippingPlatformSettings(supabase),
        supabase.from('suppliers').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(20),
        supabase
          .from('supplier_products')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('seller_dropship_profiles')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('supplier_orders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('supplier_settlements')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(20)
      ]);
      if (supplierRes.error) throw supplierRes.error;
      if (productRes.error) throw productRes.error;
      if (sellerRes.error) throw sellerRes.error;
      if (orderRes.error) throw orderRes.error;
      if (settlementRes.error) throw settlementRes.error;

      const suppliers = supplierRes.data || [];
      const products = productRes.data || [];
      const sellers = sellerRes.data || [];
      const orders = orderRes.data || [];
      const settlements = settlementRes.data || [];
      const supplierMap = new Map(suppliers.map((row) => [String(row.id), row]));
      const sellerUserMap = await fetchUserMap(supabase, sellers.map((row) => row.seller_id));

      res.json({
        generatedAt: nowIso(),
        settings: platform.dropshipping,
        summary: {
          suppliers: Number(supplierRes.count || suppliers.length || 0),
          activeProducts: products.filter((row) => normalizeProductStatus(row.status) === 'active').length,
          pendingSellerApprovals: sellers.filter((row) => normalizeSellerDropshipStatus(row.status) === 'pending').length,
          ordersNeedingAttention: orders.filter((row) =>
            ['pending_review', 'failed', 'cancelled'].includes(String(row.status || '').toLowerCase())
          ).length,
          unsettledPayables: parseMoney(
            settlements
              .filter((row) => normalizeSettlementStatus(row.status) !== 'settled')
              .reduce((sum, row) => sum + parseMoney(row.amount_total || 0), 0)
          )
        },
        suppliers: suppliers.map(mapSupplierRow),
        products: products.map((row) => mapSupplierProductRow(row, supplierMap.get(String(row.supplier_id || '')))),
        sellers: sellers.map((row) => ({
          ...mapSellerDropshipProfileRow(row),
          sellerName: String(sellerUserMap.get(String(row.seller_id || ''))?.name || 'Seller')
        })),
        orders: await loadMappedSupplierOrders(orders),
        settlements: await (async () => {
          const linesRes = await supabase
            .from('supplier_settlement_lines')
            .select('*')
            .in('settlement_id', uniqueStrings(settlements.map((row) => row.id)).filter(isUuid));
          if (linesRes.error) throw linesRes.error;
          const linesBySettlement = new Map();
          (linesRes.data || []).forEach((line) => {
            const key = String(line.settlement_id || '');
            if (!linesBySettlement.has(key)) linesBySettlement.set(key, []);
            linesBySettlement.get(key).push({
              id: String(line.id),
              supplierOrderId: String(line.supplier_order_id || ''),
              amount: parseMoney(line.amount || 0),
              createdAt: toIso(line.created_at)
            });
          });
          return settlements.map((row) =>
            mapSettlementRow(row, supplierMap, linesBySettlement.get(String(row.id)) || [])
          );
        })()
      });
    } catch (error) {
      console.error('dropship admin overview failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load dropshipping overview.' });
    }
  });

  app.patch('/commerce/dropship/admin/settings', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const updated = await updateDropshippingPlatformSettings(supabase, req.body || {});
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_settings_updated',
        entityType: 'site_settings',
        entityId: String(updated.id || 'platform'),
        details: updated.dropshipping
      });
      res.json({ settings: updated.dropshipping });
    } catch (error) {
      console.error('dropship admin settings failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update dropshipping settings.' });
    }
  });

  app.get('/commerce/dropship/admin/suppliers', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const status = normalizeText(req.query.status);
      let queryBuilder = supabase.from('suppliers').select('*').order('updated_at', { ascending: false }).limit(200);
      if (status) queryBuilder = queryBuilder.eq('status', status);
      const { data, error } = await queryBuilder;
      if (error) throw error;
      res.json({ suppliers: (data || []).map(mapSupplierRow) });
    } catch (error) {
      console.error('dropship admin suppliers failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load suppliers.' });
    }
  });

  app.post('/commerce/dropship/admin/suppliers', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const payload = {
        name: normalizeText(req.body?.name),
        contact_email: normalizeText(req.body?.contactEmail) || null,
        api_url: normalizeText(req.body?.apiUrl) || null,
        status: normalizeSupplierStatus(req.body?.status),
        fulfillment_mode: normalizeSupplierFulfillmentMode(req.body?.fulfillmentMode),
        default_routing_mode: normalizeDropshipRoutingMode(req.body?.defaultRoutingMode),
        sla_days: Number(req.body?.slaDays || 0) || 0,
        blind_dropship: firstDefined(req.body?.blindDropship, true) !== false,
        shipping_profile: jsonObject(req.body?.shippingProfile),
        return_policy: jsonObject(req.body?.returnPolicy),
        branding_options: jsonObject(req.body?.brandingOptions),
        settlement_terms: jsonObject(req.body?.settlementTerms),
        contact_channels: jsonObject(req.body?.contactChannels),
        api_config: jsonObject(req.body?.apiConfig),
        admin_notes: normalizeText(req.body?.adminNotes) || null,
        metadata: jsonObject(req.body?.metadata)
      };
      if (!payload.name) return res.status(400).json({ error: 'Supplier name is required.' });
      const { data, error } = await supabase.from('suppliers').insert(payload).select('*').single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_supplier_created',
        entityType: 'supplier',
        entityId: String(data.id),
        details: { name: payload.name }
      });
      res.status(201).json({ supplier: mapSupplierRow(data) });
    } catch (error) {
      console.error('dropship admin supplier create failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to create supplier.' });
    }
  });

  app.patch('/commerce/dropship/admin/suppliers/:id', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const supplierId = normalizeText(req.params.id);
      if (!isUuid(supplierId)) return res.status(400).json({ error: 'Invalid supplier id.' });
      const patch = {
        ...(req.body?.name ? { name: normalizeText(req.body.name) } : {}),
        ...(req.body?.contactEmail !== undefined ? { contact_email: normalizeText(req.body.contactEmail) || null } : {}),
        ...(req.body?.apiUrl !== undefined ? { api_url: normalizeText(req.body.apiUrl) || null } : {}),
        ...(req.body?.status !== undefined ? { status: normalizeSupplierStatus(req.body.status) } : {}),
        ...(req.body?.fulfillmentMode !== undefined
          ? { fulfillment_mode: normalizeSupplierFulfillmentMode(req.body.fulfillmentMode) }
          : {}),
        ...(req.body?.defaultRoutingMode !== undefined
          ? { default_routing_mode: normalizeDropshipRoutingMode(req.body.defaultRoutingMode) }
          : {}),
        ...(req.body?.slaDays !== undefined ? { sla_days: Number(req.body.slaDays || 0) || 0 } : {}),
        ...(req.body?.blindDropship !== undefined ? { blind_dropship: Boolean(req.body.blindDropship) } : {}),
        ...(req.body?.shippingProfile !== undefined ? { shipping_profile: jsonObject(req.body.shippingProfile) } : {}),
        ...(req.body?.returnPolicy !== undefined ? { return_policy: jsonObject(req.body.returnPolicy) } : {}),
        ...(req.body?.brandingOptions !== undefined ? { branding_options: jsonObject(req.body.brandingOptions) } : {}),
        ...(req.body?.settlementTerms !== undefined ? { settlement_terms: jsonObject(req.body.settlementTerms) } : {}),
        ...(req.body?.contactChannels !== undefined ? { contact_channels: jsonObject(req.body.contactChannels) } : {}),
        ...(req.body?.apiConfig !== undefined ? { api_config: jsonObject(req.body.apiConfig) } : {}),
        ...(req.body?.adminNotes !== undefined ? { admin_notes: normalizeText(req.body.adminNotes) || null } : {})
      };
      const { data, error } = await supabase
        .from('suppliers')
        .update(patch)
        .eq('id', supplierId)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_supplier_updated',
        entityType: 'supplier',
        entityId: supplierId,
        details: patch
      });
      res.json({ supplier: mapSupplierRow(data) });
    } catch (error) {
      console.error('dropship admin supplier patch failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update supplier.' });
    }
  });

  app.get('/commerce/dropship/admin/products', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      let queryBuilder = supabase
        .from('supplier_products')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(Math.min(250, Number(req.query.limit || 120) || 120));
      const supplierId = normalizeText(req.query.supplierId);
      const status = normalizeText(req.query.status);
      if (supplierId && isUuid(supplierId)) queryBuilder = queryBuilder.eq('supplier_id', supplierId);
      if (status) queryBuilder = queryBuilder.eq('status', status);
      const { data, error } = await queryBuilder;
      if (error) throw error;
      const supplierRows = await fetchRowsByIds(
        supabase,
        'suppliers',
        (data || []).map((row) => row.supplier_id),
        '*'
      );
      const supplierMap = new Map(supplierRows.map((row) => [String(row.id), row]));
      res.json({
        products: (data || []).map((row) => mapSupplierProductRow(row, supplierMap.get(String(row.supplier_id || ''))))
      });
    } catch (error) {
      console.error('dropship admin products failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load supplier products.' });
    }
  });

  app.post('/commerce/dropship/admin/products', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const supplierId = normalizeText(req.body?.supplierId);
      if (!isUuid(supplierId)) return res.status(400).json({ error: 'A valid supplier id is required.' });
      const payload = {
        supplier_id: supplierId,
        external_id: normalizeText(req.body?.externalId) || null,
        sku: normalizeText(req.body?.sku) || null,
        title: normalizeText(req.body?.title) || 'Supplier Product',
        description: normalizeText(req.body?.description) || null,
        price: parseMoney(req.body?.wholesalePrice || req.body?.price),
        stock: Number(req.body?.stock || 0) || 0,
        status: normalizeProductStatus(req.body?.status),
        currency: String(req.body?.currency || DEFAULT_CURRENCY).toUpperCase(),
        wholesale_price: parseMoney(req.body?.wholesalePrice || req.body?.price),
        shipping_cost: parseMoney(req.body?.shippingCost || 0),
        min_order_quantity: Math.max(1, Number(req.body?.minOrderQuantity || 1) || 1),
        processing_time_days: Math.max(0, Number(req.body?.processingTimeDays || 0) || 0),
        attributes: jsonObject(req.body?.attributes),
        image_urls: Array.isArray(req.body?.imageUrls) ? req.body.imageUrls.filter(Boolean) : [],
        category: normalizeText(req.body?.category) || null,
        seller_visibility: normalizeProductVisibility(req.body?.sellerVisibility),
        sync_mode: normalizeText(req.body?.syncMode) || 'managed',
        legacy_source_ref: normalizeText(req.body?.legacySourceRef) || null,
        data: jsonObject(req.body?.data)
      };
      const { data, error } = await supabase.from('supplier_products').insert(payload).select('*').single();
      if (error) throw error;
      const { data: supplierRow } = await supabase.from('suppliers').select('*').eq('id', supplierId).maybeSingle();
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_product_created',
        entityType: 'supplier_product',
        entityId: String(data.id),
        details: { supplierId, title: payload.title }
      });
      res.status(201).json({ product: mapSupplierProductRow(data, supplierRow) });
    } catch (error) {
      console.error('dropship admin product create failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to create supplier product.' });
    }
  });

  app.patch('/commerce/dropship/admin/products/:id', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const productId = normalizeText(req.params.id);
      if (!isUuid(productId)) return res.status(400).json({ error: 'Invalid supplier product id.' });
      const patch = {
        ...(req.body?.title !== undefined ? { title: normalizeText(req.body.title) || 'Supplier Product' } : {}),
        ...(req.body?.description !== undefined ? { description: normalizeText(req.body.description) || null } : {}),
        ...(req.body?.externalId !== undefined ? { external_id: normalizeText(req.body.externalId) || null } : {}),
        ...(req.body?.sku !== undefined ? { sku: normalizeText(req.body.sku) || null } : {}),
        ...(req.body?.status !== undefined ? { status: normalizeProductStatus(req.body.status) } : {}),
        ...(req.body?.currency !== undefined ? { currency: String(req.body.currency || DEFAULT_CURRENCY).toUpperCase() } : {}),
        ...(req.body?.wholesalePrice !== undefined ? { wholesale_price: parseMoney(req.body.wholesalePrice) } : {}),
        ...(req.body?.price !== undefined ? { price: parseMoney(req.body.price) } : {}),
        ...(req.body?.shippingCost !== undefined ? { shipping_cost: parseMoney(req.body.shippingCost) } : {}),
        ...(req.body?.stock !== undefined ? { stock: Number(req.body.stock || 0) || 0 } : {}),
        ...(req.body?.minOrderQuantity !== undefined ? { min_order_quantity: Math.max(1, Number(req.body.minOrderQuantity || 1) || 1) } : {}),
        ...(req.body?.processingTimeDays !== undefined ? { processing_time_days: Math.max(0, Number(req.body.processingTimeDays || 0) || 0) } : {}),
        ...(req.body?.attributes !== undefined ? { attributes: jsonObject(req.body.attributes) } : {}),
        ...(req.body?.imageUrls !== undefined ? { image_urls: Array.isArray(req.body.imageUrls) ? req.body.imageUrls.filter(Boolean) : [] } : {}),
        ...(req.body?.category !== undefined ? { category: normalizeText(req.body.category) || null } : {}),
        ...(req.body?.sellerVisibility !== undefined ? { seller_visibility: normalizeProductVisibility(req.body.sellerVisibility) } : {}),
        ...(req.body?.syncMode !== undefined ? { sync_mode: normalizeText(req.body.syncMode) || 'managed' } : {}),
        ...(req.body?.legacySourceRef !== undefined ? { legacy_source_ref: normalizeText(req.body.legacySourceRef) || null } : {}),
        ...(req.body?.data !== undefined ? { data: jsonObject(req.body.data) } : {})
      };
      const { data, error } = await supabase
        .from('supplier_products')
        .update(patch)
        .eq('id', productId)
        .select('*')
        .single();
      if (error) throw error;
      const { data: supplierRow } = await supabase.from('suppliers').select('*').eq('id', data.supplier_id).maybeSingle();
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_product_updated',
        entityType: 'supplier_product',
        entityId: productId,
        details: patch
      });
      res.json({ product: mapSupplierProductRow(data, supplierRow) });
    } catch (error) {
      console.error('dropship admin product patch failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update supplier product.' });
    }
  });

  app.post('/commerce/dropship/admin/products/import-legacy', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const firestore = getFirestoreDb(firebaseApp);
      if (!firestore) {
        return res.status(400).json({ error: 'Firebase admin is not configured for legacy import.' });
      }
      const snapshot = await firestore.collection('supplierProducts').get();
      let imported = 0;
      const legacyProductMap = new Map();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() || {};
        const supplierName =
          normalizeText(data.supplierName || data.supplier?.name || data.supplier || 'Legacy Supplier') ||
          'Legacy Supplier';
        let { data: supplierRow } = await supabase
          .from('suppliers')
          .select('*')
          .eq('name', supplierName)
          .maybeSingle();
        if (!supplierRow) {
          const created = await supabase
            .from('suppliers')
            .insert({
              name: supplierName,
              status: 'active',
              fulfillment_mode: 'manual_panel',
              default_routing_mode: 'seller_approve',
              blind_dropship: true,
              contact_email: normalizeText(data.contactEmail) || null,
              metadata: { importedFromLegacy: true }
            })
            .select('*')
            .single();
          if (created.error) throw created.error;
          supplierRow = created.data;
        }

        const productPayload = {
          supplier_id: supplierRow.id,
          external_id: normalizeText(data.externalId) || null,
          sku: normalizeText(data.sku) || null,
          title: normalizeText(data.title) || 'Legacy Supplier Product',
          description: normalizeText(data.description) || null,
          price: parseMoney(data.wholesalePrice || data.price || 0),
          stock: Number(data.stock || 0) || 0,
          status: 'active',
          currency: String(data.currency || DEFAULT_CURRENCY).toUpperCase(),
          wholesale_price: parseMoney(data.wholesalePrice || data.price || 0),
          shipping_cost: parseMoney(data.shippingInfo?.cost || data.shippingCost || 0),
          min_order_quantity: Math.max(1, Number(data.minOrderQuantity || 1) || 1),
          processing_time_days: Math.max(0, Number(data.processingTimeDays || 0) || 0),
          attributes: jsonObject(data.attributes),
          image_urls: Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : [],
          category: normalizeText(data.category) || null,
          seller_visibility: 'approved_only',
          sync_mode: 'managed',
          legacy_source_ref: String(docSnap.id),
          data
        };

        const existing = await supabase
          .from('supplier_products')
          .select('*')
          .eq('legacy_source_ref', String(docSnap.id))
          .maybeSingle();
        if (existing.error) throw existing.error;
        let savedProduct = existing.data;
        if (savedProduct) {
          const updated = await supabase
            .from('supplier_products')
            .update(productPayload)
            .eq('id', savedProduct.id)
            .select('*')
            .single();
          if (updated.error) throw updated.error;
          savedProduct = updated.data;
        } else {
          const created = await supabase
            .from('supplier_products')
            .insert(productPayload)
            .select('*')
            .single();
          if (created.error) throw created.error;
          savedProduct = created.data;
        }
        legacyProductMap.set(String(docSnap.id), savedProduct);
        imported += 1;
      }

      if (firstDefined(req.body?.backfillListings, true) !== false) {
        const { data: itemRows, error: itemError } = await supabase.from('items').select('id,metadata');
        if (itemError) throw itemError;
        for (const itemRow of itemRows || []) {
          const metadata = jsonObject(itemRow.metadata);
          const supplierInfo = jsonObject(metadata.supplierInfo);
          if (normalizeText(metadata.productType).toLowerCase() !== 'dropship') continue;
          const legacyRef = normalizeText(firstDefined(supplierInfo.id, supplierInfo.legacySourceRef));
          const linkedProduct = legacyProductMap.get(legacyRef);
          if (!linkedProduct) continue;
          const nextMetadata = {
            ...metadata,
            fulfillmentType: 'dropship',
            supplierInfo: {
              ...supplierInfo,
              supplierId: String(linkedProduct.supplier_id),
              supplierProductId: String(linkedProduct.id),
              id: legacyRef
            },
            dropshipProfile: {
              ...jsonObject(metadata.dropshipProfile),
              supplierId: String(linkedProduct.supplier_id),
              supplierProductId: String(linkedProduct.id),
              supplierName: normalizeText(firstDefined(supplierInfo.name, linkedProduct.title)),
              manualSupplierLinkRequired: false
            }
          };
          await supabase.from('items').update({ metadata: nextMetadata }).eq('id', itemRow.id);
        }
      }

      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_legacy_catalog_imported',
        entityType: 'supplier_product',
        entityId: 'legacy-import',
        details: { imported }
      });
      res.json({ ok: true, imported });
    } catch (error) {
      console.error('dropship legacy import failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to import legacy supplier catalog.' });
    }
  });

  app.get('/commerce/dropship/admin/sellers', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const { data: rows, error } = await supabase
        .from('seller_dropship_profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const userMap = await fetchUserMap(supabase, (rows || []).map((row) => row.seller_id));
      res.json({
        sellers: (rows || []).map((row) => ({
          ...mapSellerDropshipProfileRow(row),
          sellerName: String(userMap.get(String(row.seller_id || ''))?.name || 'Seller')
        }))
      });
    } catch (error) {
      console.error('dropship admin sellers failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load seller approvals.' });
    }
  });

  app.post('/commerce/dropship/admin/sellers/:sellerId/approve', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const sellerId = normalizeText(req.params.sellerId);
      const profileRow = await ensureSellerDropshipProfile(supabase, sellerId);
      const { data, error } = await supabase
        .from('seller_dropship_profiles')
        .update({
          status: 'approved',
          approved_by: adminCtx.user.id,
          approved_at: nowIso(),
          risk_notes: normalizeText(req.body?.riskNotes) || profileRow.risk_notes || null,
          settings: {
            ...jsonObject(profileRow.settings),
            ...jsonObject(req.body?.settings)
          }
        })
        .eq('id', profileRow.id)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_seller_approved',
        entityType: 'seller_dropship_profile',
        entityId: String(data.id),
        details: { sellerId }
      });
      res.json({ profile: mapSellerDropshipProfileRow(data) });
    } catch (error) {
      console.error('dropship admin seller approve failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to approve seller.' });
    }
  });

  app.post('/commerce/dropship/admin/sellers/:sellerId/suspend', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const sellerId = normalizeText(req.params.sellerId);
      const profileRow = await ensureSellerDropshipProfile(supabase, sellerId);
      const { data, error } = await supabase
        .from('seller_dropship_profiles')
        .update({
          status: 'suspended',
          risk_notes: normalizeText(req.body?.riskNotes || req.body?.reason) || profileRow.risk_notes || null
        })
        .eq('id', profileRow.id)
        .select('*')
        .single();
      if (error) throw error;
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_seller_suspended',
        entityType: 'seller_dropship_profile',
        entityId: String(data.id),
        details: { sellerId }
      });
      res.json({ profile: mapSellerDropshipProfileRow(data) });
    } catch (error) {
      console.error('dropship admin seller suspend failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to suspend seller.' });
    }
  });

  app.post('/commerce/dropship/admin/orders/:id/override', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const supplierOrderId = normalizeText(req.params.id);
      const context = await loadSupplierOrderContext(supplierOrderId);
      if (!context) return res.status(404).json({ error: 'Supplier order not found.' });
      const metadata = jsonObject(context.row.metadata);
      const patch = {
        ...(req.body?.status !== undefined ? { status: normalizeText(req.body.status).toLowerCase() } : {}),
        ...(req.body?.approvalState !== undefined
          ? { approval_state: normalizeDropshipApprovalState(req.body.approvalState) }
          : {}),
        ...(req.body?.externalStatus !== undefined
          ? { external_status: normalizeText(req.body.externalStatus) || null }
          : {}),
        ...(req.body?.carrier !== undefined ? { carrier: normalizeText(req.body.carrier) || null } : {}),
        ...(req.body?.trackingNumber !== undefined
          ? { tracking_number: normalizeText(req.body.trackingNumber) || null }
          : {}),
        ...(req.body?.failureReason !== undefined
          ? { failure_reason: normalizeText(req.body.failureReason) || null }
          : {}),
        ...(req.body?.cancelReason !== undefined
          ? { cancel_reason: normalizeText(req.body.cancelReason) || null }
          : {}),
        metadata: {
          ...metadata,
          adminOverrideAt: nowIso(),
          adminOverrideBy: adminCtx.user.id,
          ...(jsonObject(req.body?.metadata) || {})
        }
      };
      if (patch.status === 'submitted' && !context.row.submitted_at) patch.submitted_at = nowIso();
      if (patch.status === 'delivered' && !context.row.delivered_at) patch.delivered_at = nowIso();
      if (patch.status === 'shipped' && !context.row.shipped_at) patch.shipped_at = nowIso();
      if (patch.status === 'cancelled' && !context.row.cancelled_at) patch.cancelled_at = nowIso();
      if (patch.status === 'failed' && !context.row.failed_at) patch.failed_at = nowIso();
      const { data, error } = await supabase
        .from('supplier_orders')
        .update(patch)
        .eq('id', supplierOrderId)
        .select('*')
        .single();
      if (error) throw error;
      await syncDropshipShipmentState(supabase, data.order_id, data, null, {
        carrier: data.carrier,
        trackingNumber: data.tracking_number,
        status:
          data.status === 'delivered'
            ? 'delivered'
            : data.status === 'cancelled'
              ? 'cancelled'
              : data.status === 'shipped'
                ? 'shipped'
                : 'processing'
      });
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_order_overridden',
        entityType: 'supplier_order',
        entityId: supplierOrderId,
        details: patch
      });
      res.json({ order: (await loadMappedSupplierOrders([data]))[0] });
    } catch (error) {
      console.error('dropship admin order override failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to override supplier order.' });
    }
  });

  app.get('/commerce/dropship/admin/settlements', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const { data: rows, error } = await supabase
        .from('supplier_settlements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const supplierMap = new Map(
        (await fetchRowsByIds(supabase, 'suppliers', (rows || []).map((row) => row.supplier_id), '*')).map((row) => [
          String(row.id),
          row
        ])
      );
      const { data: lineRows, error: lineError } = await supabase
        .from('supplier_settlement_lines')
        .select('*')
        .in('settlement_id', uniqueStrings((rows || []).map((row) => row.id)).filter(isUuid));
      if (lineError) throw lineError;
      const linesBySettlement = new Map();
      (lineRows || []).forEach((line) => {
        const key = String(line.settlement_id || '');
        if (!linesBySettlement.has(key)) linesBySettlement.set(key, []);
        linesBySettlement.get(key).push({
          id: String(line.id),
          supplierOrderId: String(line.supplier_order_id || ''),
          amount: parseMoney(line.amount || 0),
          createdAt: toIso(line.created_at)
        });
      });
      res.json({
        settlements: (rows || []).map((row) =>
          mapSettlementRow(row, supplierMap, linesBySettlement.get(String(row.id)) || [])
        )
      });
    } catch (error) {
      console.error('dropship admin settlements failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load settlements.' });
    }
  });

  app.post('/commerce/dropship/admin/settlements', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const supplierId = normalizeText(req.body?.supplierId);
      const supplierOrderIds = uniqueStrings(req.body?.supplierOrderIds || []).filter(isUuid);
      if (!isUuid(supplierId) || !supplierOrderIds.length) {
        return res.status(400).json({ error: 'Supplier and supplier orders are required.' });
      }
      const { data: orderRows, error: orderError } = await supabase
        .from('supplier_orders')
        .select('*')
        .in('id', supplierOrderIds);
      if (orderError) throw orderError;
      if ((orderRows || []).some((row) => String(row.supplier_id || '') !== supplierId)) {
        return res.status(400).json({ error: 'All supplier orders in a settlement must belong to one supplier.' });
      }
      const amountTotal = parseMoney(
        (orderRows || []).reduce((sum, row) => sum + parseMoney(row.payable_total || 0), 0)
      );
      const { data: settlementRow, error: settlementError } = await supabase
        .from('supplier_settlements')
        .insert({
          supplier_id: supplierId,
          status: normalizeSettlementStatus(req.body?.status || 'draft'),
          amount_total: amountTotal,
          currency: String(req.body?.currency || DEFAULT_CURRENCY).toUpperCase(),
          external_ref: normalizeText(req.body?.externalRef) || null,
          notes: normalizeText(req.body?.notes) || null,
          created_by: adminCtx.user.id,
          metadata: jsonObject(req.body?.metadata)
        })
        .select('*')
        .single();
      if (settlementError) throw settlementError;
      const linePayload = (orderRows || []).map((row) => ({
        settlement_id: settlementRow.id,
        supplier_order_id: row.id,
        amount: parseMoney(row.payable_total || 0)
      }));
      const { data: createdLines, error: lineError } = await supabase
        .from('supplier_settlement_lines')
        .insert(linePayload)
        .select('*');
      if (lineError) throw lineError;

      const paymentsRes = await supabase
        .from('payments')
        .select('*')
        .in('order_id', uniqueStrings((orderRows || []).map((row) => row.order_id)).filter(isUuid));
      if (paymentsRes.error) throw paymentsRes.error;
      for (const paymentRow of paymentsRes.data || []) {
        await updatePaymentsDropshipMetadata(supabase, paymentRow.id, {
          settlementIds: uniqueStrings([
            ...(jsonObject(paymentRow.metadata).dropship?.settlementIds || []),
            String(settlementRow.id)
          ])
        });
      }

      const supplierRows = await fetchRowsByIds(supabase, 'suppliers', [supplierId], '*');
      const supplierMap = new Map(supplierRows.map((row) => [String(row.id), row]));
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_settlement_created',
        entityType: 'supplier_settlement',
        entityId: String(settlementRow.id),
        details: { supplierId, supplierOrderCount: supplierOrderIds.length, amountTotal }
      });
      res.status(201).json({
        settlement: mapSettlementRow(
          settlementRow,
          supplierMap,
          (createdLines || []).map((line) => ({
            id: String(line.id),
            supplierOrderId: String(line.supplier_order_id || ''),
            amount: parseMoney(line.amount || 0),
            createdAt: toIso(line.created_at)
          }))
        )
      });
    } catch (error) {
      console.error('dropship admin settlement create failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to create settlement.' });
    }
  });

  app.patch('/commerce/dropship/admin/settlements/:id', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const settlementId = normalizeText(req.params.id);
      if (!isUuid(settlementId)) return res.status(400).json({ error: 'Invalid settlement id.' });
      const patch = {
        ...(req.body?.status !== undefined ? { status: normalizeSettlementStatus(req.body.status) } : {}),
        ...(req.body?.externalRef !== undefined ? { external_ref: normalizeText(req.body.externalRef) || null } : {}),
        ...(req.body?.notes !== undefined ? { notes: normalizeText(req.body.notes) || null } : {}),
        ...(req.body?.metadata !== undefined ? { metadata: jsonObject(req.body.metadata) } : {})
      };
      if (patch.status === 'settled') patch.settled_at = nowIso();
      const { data, error } = await supabase
        .from('supplier_settlements')
        .update(patch)
        .eq('id', settlementId)
        .select('*')
        .single();
      if (error) throw error;
      const supplierRows = await fetchRowsByIds(supabase, 'suppliers', [data.supplier_id], '*');
      const supplierMap = new Map(supplierRows.map((row) => [String(row.id), row]));
      const { data: lines, error: linesError } = await supabase
        .from('supplier_settlement_lines')
        .select('*')
        .eq('settlement_id', settlementId);
      if (linesError) throw linesError;
      await writeAudit(writeAuditLog, {
        actorUserId: adminCtx.user.id,
        action: 'dropship_settlement_updated',
        entityType: 'supplier_settlement',
        entityId: settlementId,
        details: patch
      });
      res.json({
        settlement: mapSettlementRow(
          data,
          supplierMap,
          (lines || []).map((line) => ({
            id: String(line.id),
            supplierOrderId: String(line.supplier_order_id || ''),
            amount: parseMoney(line.amount || 0),
            createdAt: toIso(line.created_at)
          }))
        )
      });
    } catch (error) {
      console.error('dropship admin settlement patch failed:', error);
      res.status(400).json({ error: error?.message || 'Unable to update settlement.' });
    }
  });

  app.get('/commerce/admin/overview', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      const [rentalsRes, auctionsRes, disputesRes, ordersRes] = await Promise.all([
        supabase
          .from('rental_bookings')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(60),
        supabase
          .from('auction_sessions')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(60),
        supabase
          .from('commerce_disputes')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('orders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(60)
      ]);
      if (rentalsRes.error) throw rentalsRes.error;
      if (auctionsRes.error) throw auctionsRes.error;
      if (disputesRes.error) throw disputesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const rentalRows = rentalsRes.data || [];
      const auctionRows = auctionsRes.data || [];
      const disputeRows = disputesRes.data || [];
      const orderRows = ordersRes.data || [];
      const itemMap = await fetchItemMap(supabase, [
        ...rentalRows.map((row) => row.item_id),
        ...auctionRows.map((row) => row.item_id)
      ]);
      const userMap = await fetchUserMap(supabase, disputeRows.map((row) => row.opened_by));

      res.json({
        generatedAt: nowIso(),
        summary: {
          totalRentals: Number(rentalsRes.count || rentalRows.length || 0),
          openDisputes: disputeRows.filter((row) =>
            ['open', 'under_review', 'awaiting_response'].includes(String(row.status || '').toLowerCase())
          ).length,
          activeAuctions: auctionRows.filter((row) =>
            ['live', 'winner_pending_payment'].includes(String(row.status || '').toLowerCase())
          ).length,
          totalOrders: Number(ordersRes.count || orderRows.length || 0)
        },
        rentals: rentalRows.map((row) => ({
          id: String(row.id),
          itemId: String(row.item_id || ''),
          itemTitle: String(itemMap.get(String(row.item_id || ''))?.title || 'Rental item'),
          status: String(row.status || 'pending_confirmation'),
          deliveryMode: String(row.delivery_mode || 'shipping'),
          rentalStart: toIso(row.rental_start),
          rentalEnd: toIso(row.rental_end),
          securityDepositStatus: String(row.security_deposit_status || 'not_applicable')
        })),
        auctions: auctionRows.map((row) => ({
          id: String(row.id),
          itemId: String(row.item_id || ''),
          itemTitle: String(itemMap.get(String(row.item_id || ''))?.title || 'Auction item'),
          status: String(row.status || 'live'),
          winnerId: row.winner_id ? String(row.winner_id) : null,
          reserveMet: Boolean(row.reserve_met),
          closedAt: row.closed_at ? toIso(row.closed_at) : null,
          winnerCheckoutExpiresAt: row.winner_checkout_expires_at ? toIso(row.winner_checkout_expires_at) : null
        })),
        disputes: disputeRows.map((row) => ({
          id: String(row.id),
          status: normalizeDisputeStatusForUi(row.status),
          reasonCode: String(row.reason_code || 'dispute'),
          openedBy: String(userMap.get(String(row.opened_by || ''))?.name || 'User'),
          orderId: row.order_id ? String(row.order_id) : null,
          rentalBookingId: row.rental_booking_id ? String(row.rental_booking_id) : null,
          createdAt: toIso(row.created_at)
        })),
        orders: orderRows.map((row) => ({
          id: String(row.id),
          status: String(row.status || 'processing'),
          total: parseMoney(row.total || 0),
          createdAt: toIso(row.created_at)
        }))
      });
    } catch (error) {
      console.error('commerce admin overview failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to load admin overview.' });
    }
  });

  app.post('/commerce/admin/auction-lifecycle/sweep', requireAuth, adminActionLimiter, async (req, res) => {
    const adminCtx = await requireResolvedAdmin(req, res, resolveAdminContext);
    if (!adminCtx) return;
    try {
      await runAuctionLifecycleSweep(supabase, writeAuditLog);
      res.json({ ok: true, ranAt: nowIso() });
    } catch (error) {
      console.error('commerce admin auction sweep failed:', error);
      res.status(500).json({ error: error?.message || 'Unable to sweep auction lifecycle.' });
    }
  });
}
