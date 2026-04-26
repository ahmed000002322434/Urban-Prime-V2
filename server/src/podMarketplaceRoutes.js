import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const PRIVATE_STORAGE_DRIVER = 'private_disk';
const POD_DESIGN_ASSET_TYPE = 'pod_design_source';
const POD_JOB_STATUSES = new Set([
  'queued',
  'reviewing',
  'in_production',
  'printed',
  'packed',
  'shipped',
  'completed',
  'cancelled'
]);
const MAX_DESIGN_BYTES = 25 * 1024 * 1024;
const DESIGN_MIME_EXTENSION_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf'
};

const uuidLike = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );

const asText = (value) => String(value || '').trim();

const parseMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const parseInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => asText(entry))
          .filter(Boolean)
      )
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[,\n|]/g)
          .map((entry) => asText(entry))
          .filter(Boolean)
      )
    );
  }

  return [];
};

const uniqueUrls = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => asText(entry))
        .filter(Boolean)
    )
  );

const nowIso = () => new Date().toISOString();

const ensureDirectory = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const sanitizeBaseName = (fileName = 'asset') =>
  String(fileName)
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'asset';

const createTemplateArt = (label, accents = ['#0f172a', '#6d28d9', '#f97316']) => {
  const [bg, accentOne, accentTwo] = accents;
  const safeLabel = encodeURIComponent(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="55%" stop-color="${accentOne}" />
          <stop offset="100%" stop-color="${accentTwo}" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1200" fill="url(#bg)" rx="48" />
      <circle cx="1240" cy="260" r="240" fill="rgba(255,255,255,0.08)" />
      <circle cx="360" cy="980" r="320" fill="rgba(255,255,255,0.06)" />
      <rect x="112" y="118" width="1376" height="964" rx="42" fill="rgba(15,23,42,0.18)" stroke="rgba(255,255,255,0.24)" />
      <text x="140" y="226" font-size="62" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.64)" letter-spacing="12">URBAN PRIME POD</text>
      <text x="140" y="1028" font-size="168" font-family="Arial Black, Arial, Helvetica, sans-serif" fill="#ffffff">${safeLabel}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const POD_CATALOG = [
  {
    key: 'tee-essential',
    name: 'Essential Tee',
    category: 'Apparel',
    description: 'Heavy cotton fit built for editorial drops and artist storefronts.',
    baseCost: 14,
    leadTimeDays: 4,
    availableColors: ['Black', 'Vintage White', 'Coal', 'Cardinal', 'Olive'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    printAreas: [
      { key: 'front', label: 'Front Chest', width: 12, height: 16, recommendedDpi: 300 },
      { key: 'back', label: 'Full Back', width: 13, height: 18, recommendedDpi: 300 }
    ],
    mockupImageUrls: [
      createTemplateArt('Essential Tee', ['#0f172a', '#ef4444', '#f59e0b'])
    ]
  },
  {
    key: 'hoodie-luxe',
    name: 'Luxe Hoodie',
    category: 'Apparel',
    description: 'Premium fleece blank for heavier collections and elevated drop calendars.',
    baseCost: 28,
    leadTimeDays: 6,
    availableColors: ['Black', 'Stone', 'Heather Grey', 'Forest'],
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    printAreas: [
      { key: 'front', label: 'Front', width: 12, height: 15, recommendedDpi: 300 },
      { key: 'sleeve', label: 'Sleeve', width: 4, height: 14, recommendedDpi: 300 }
    ],
    mockupImageUrls: [
      createTemplateArt('Luxe Hoodie', ['#0f172a', '#4f46e5', '#22c55e'])
    ]
  },
  {
    key: 'mug-studio',
    name: 'Studio Mug',
    category: 'Drinkware',
    description: 'Gloss ceramic for collectible graphics, drops, and fan merch bundles.',
    baseCost: 8,
    leadTimeDays: 3,
    availableColors: ['Gloss White', 'Matte Black', 'Cream'],
    availableSizes: ['11oz', '15oz'],
    printAreas: [{ key: 'wrap', label: 'Wrap Print', width: 8.5, height: 3.5, recommendedDpi: 300 }],
    mockupImageUrls: [
      createTemplateArt('Studio Mug', ['#111827', '#0ea5e9', '#eab308'])
    ]
  },
  {
    key: 'poster-gallery',
    name: 'Gallery Poster',
    category: 'Wall Art',
    description: 'Large-format poster blank for key art, photography, and hero campaign drops.',
    baseCost: 11,
    leadTimeDays: 4,
    availableColors: ['Matte'],
    availableSizes: ['12x18', '18x24', '24x36'],
    printAreas: [{ key: 'full', label: 'Full Canvas', width: 24, height: 36, recommendedDpi: 300 }],
    mockupImageUrls: [
      createTemplateArt('Gallery Poster', ['#111827', '#8b5cf6', '#fb7185'])
    ]
  },
  {
    key: 'tote-city',
    name: 'City Tote',
    category: 'Carry Goods',
    description: 'Structured carry blank for logo systems, poster art, and capsule merch.',
    baseCost: 10,
    leadTimeDays: 4,
    availableColors: ['Natural', 'Black', 'Sand'],
    availableSizes: ['Standard'],
    printAreas: [{ key: 'front', label: 'Front', width: 12, height: 13, recommendedDpi: 300 }],
    mockupImageUrls: [
      createTemplateArt('City Tote', ['#0f172a', '#14b8a6', '#f97316'])
    ]
  }
];

const getCatalogTemplate = (key) =>
  POD_CATALOG.find((template) => template.key === asText(key)) || null;

const isPodItemRow = (row) => {
  const metadata = jsonObject(row?.metadata);
  const productType = asText(metadata.productType || '').toLowerCase();
  return productType === 'pod' || Boolean(metadata.podProfile);
};

const podJobStatusToLineStatus = (status) => {
  const normalized = asText(status).toLowerCase();
  if (normalized === 'shipped') return 'shipped';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled') return 'cancelled';
  return 'confirmed';
};

const computeOrderStatus = (statuses) => {
  const normalized = statuses.map((status) => asText(status).toLowerCase()).filter(Boolean);
  if (!normalized.length) return 'processing';
  if (normalized.every((status) => status === 'cancelled')) return 'cancelled';
  if (normalized.every((status) => status === 'completed' || status === 'cancelled')) return 'completed';
  if (normalized.some((status) => status === 'shipped')) return 'shipped';
  if (normalized.some((status) => status === 'delivered')) return 'delivered';
  if (normalized.some((status) => status === 'confirmed' || status === 'processing')) return 'processing';
  return 'pending';
};

const resolveCategoryId = async (supabase, categoryInput) => {
  const category = asText(categoryInput);
  if (!category) return null;

  if (uuidLike(category)) {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category)
      .maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id,name')
    .ilike('name', category)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data[0]?.id ? data[0].id : null;
};

const resolveImageUrls = (body, existingMetadata = {}, fallbackImageUrls = []) => {
  const coverImageUrl = asText(body.coverImageUrl || existingMetadata.coverImageUrl || fallbackImageUrls[0]);
  const galleryImageUrls = uniqueUrls(
    body.galleryImageUrls ||
      body.mockupImageUrls ||
      existingMetadata.galleryImageUrls ||
      existingMetadata.mockupImageUrls ||
      fallbackImageUrls
  );
  const combined = uniqueUrls([coverImageUrl, ...galleryImageUrls, ...fallbackImageUrls]);
  return {
    coverImageUrl: combined[0] || '',
    galleryImageUrls: combined
  };
};

const normalizeVariantOptions = ({ variantOptions, template, fallbackPrice, fallbackBaseCost }) => {
  const source = Array.isArray(variantOptions) ? variantOptions : [];
  if (!source.length) {
    const defaultColor = template.availableColors[0] || 'Black';
    const defaultSize = template.availableSizes[0] || '';
    return [
      {
        id: `${template.key}-${sanitizeBaseName(defaultColor)}-${sanitizeBaseName(defaultSize || 'default')}`,
        color: defaultColor,
        size: defaultSize || undefined,
        sku: `${template.key}-${sanitizeBaseName(defaultColor)}-${sanitizeBaseName(defaultSize || 'std')}`.toUpperCase(),
        baseCost: fallbackBaseCost,
        salePrice: fallbackPrice,
        compareAtPrice: fallbackPrice > 0 ? Number((fallbackPrice * 1.2).toFixed(2)) : undefined,
        stock: 999,
        isEnabled: true
      }
    ];
  }

  return source
    .map((entry, index) => {
      const color = asText(entry?.color || template.availableColors[0] || 'Black');
      const size = asText(entry?.size || '');
      const baseCost = parseMoney(entry?.baseCost ?? fallbackBaseCost);
      const salePrice = parseMoney(entry?.salePrice ?? fallbackPrice);
      return {
        id:
          asText(entry?.id) ||
          `${template.key}-${sanitizeBaseName(color || `variant-${index + 1}`)}-${sanitizeBaseName(size || 'default')}`,
        color,
        size: size || undefined,
        sku:
          asText(entry?.sku) ||
          `${template.key}-${sanitizeBaseName(color || `variant-${index + 1}`)}-${sanitizeBaseName(size || 'std')}`.toUpperCase(),
        baseCost: baseCost || fallbackBaseCost,
        salePrice: salePrice || fallbackPrice,
        compareAtPrice: parseMoney(entry?.compareAtPrice ?? 0) || undefined,
        stock: parseInteger(entry?.stock, 999),
        isEnabled: entry?.isEnabled !== false
      };
    })
    .filter((entry) => entry.salePrice > 0);
};

const writeItemImages = async (supabase, itemId, imageUrls) => {
  await supabase.from('item_images').delete().eq('item_id', itemId);
  if (!imageUrls.length) return;
  const rows = imageUrls.map((url, index) => ({
    item_id: itemId,
    url,
    sort_order: index
  }));
  const { error } = await supabase.from('item_images').insert(rows);
  if (error) throw error;
};

const loadUsersMap = async (supabase, userIds) => {
  const ids = Array.from(new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean)));
  const map = new Map();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid,name,avatar_url')
    .in('id', ids);
  if (error) throw error;
  (data || []).forEach((row) => {
    map.set(String(row.id), row);
  });
  return map;
};

const loadItemImagesMap = async (supabase, itemIds) => {
  const ids = Array.from(new Set((Array.isArray(itemIds) ? itemIds : []).filter(Boolean)));
  const map = new Map();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from('item_images')
    .select('item_id,url,sort_order')
    .in('item_id', ids)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  (data || []).forEach((row) => {
    const key = String(row.item_id || '');
    if (!key) return;
    const existing = map.get(key) || [];
    existing.push(asText(row.url));
    map.set(key, existing.filter(Boolean));
  });
  return map;
};

const loadOrdersMap = async (supabase, orderIds) => {
  const ids = Array.from(new Set((Array.isArray(orderIds) ? orderIds : []).filter(Boolean)));
  const map = new Map();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from('orders')
    .select('id,buyer_id,status,total,shipping_address_id,created_at')
    .in('id', ids);
  if (error) throw error;
  (data || []).forEach((row) => {
    map.set(String(row.id), row);
  });
  return map;
};

const loadShippingMap = async (supabase, shippingIds) => {
  const ids = Array.from(new Set((Array.isArray(shippingIds) ? shippingIds : []).filter(Boolean)));
  const map = new Map();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from('shipping_addresses')
    .select('id,name,line1,line2,city,state,postal_code,country,phone')
    .in('id', ids);
  if (error) throw error;
  (data || []).forEach((row) => {
    map.set(String(row.id), row);
  });
  return map;
};

const loadPodJobUsageCounts = async ({ supabase, ownerUserId }) => {
  const counts = new Map();
  const { data, error } = await supabase
    .from('items')
    .select('metadata')
    .eq('seller_id', ownerUserId);
  if (error) throw error;
  (data || []).forEach((row) => {
    const metadata = jsonObject(row.metadata);
    if (!metadata.podProfile) return;
    const designIds = toStringArray(metadata.podProfile.designAssetIds);
    designIds.forEach((designId) => {
      counts.set(designId, (counts.get(designId) || 0) + 1);
    });
  });
  return counts;
};

const mapDesignAssetRow = (row, usageCounts = new Map()) => {
  const metadata = jsonObject(row?.metadata);
  const id = String(row?.id || '');
  return {
    id,
    ownerUserId: String(row?.owner_user_id || ''),
    title: asText(metadata.title || row?.file_name || 'Untitled design'),
    fileName: asText(row?.file_name || ''),
    mimeType: asText(row?.mime_type || 'application/octet-stream'),
    sizeBytes: Number(row?.size_bytes || 0),
    previewUrl: asText(metadata.previewUrl || ''),
    tags: toStringArray(metadata.tags),
    notes: asText(metadata.notes || ''),
    status: asText(row?.status || 'active') || 'active',
    usageCount: Number(usageCounts.get(id) || 0),
    createdAt: row?.created_at || nowIso(),
    updatedAt: row?.updated_at || row?.created_at || nowIso()
  };
};

const buildPodSellerListing = ({ itemRow, imageUrls, jobMetrics }) => {
  const metadata = jsonObject(itemRow?.metadata);
  const podProfile = jsonObject(metadata.podProfile);
  const baseCost = parseMoney(podProfile.baseCost || 0);
  const price = parseMoney(itemRow?.sale_price ?? metadata.salePrice ?? 0);
  const marginPercent = price > 0 ? Number((((price - baseCost) / price) * 100).toFixed(1)) : 0;
  const metrics = jobMetrics.get(String(itemRow.id)) || { queuedJobs: 0, completedJobs: 0 };

  return {
    id: String(itemRow.id),
    title: itemRow.title || metadata.title || 'Untitled POD product',
    status: String(itemRow.status || podProfile.status || 'draft'),
    price,
    baseCost,
    marginPercent,
    coverImageUrl: imageUrls[0] || metadata.coverImageUrl || POD_CATALOG[0].mockupImageUrls[0],
    templateKey: asText(podProfile.templateKey || ''),
    templateName: asText(podProfile.templateName || 'POD listing'),
    designCount: toStringArray(podProfile.designAssetIds).length,
    queuedJobs: Number(metrics.queuedJobs || 0),
    turnaroundDays: parseInteger(podProfile.turnaroundDays, 0),
    createdAt: itemRow.created_at || nowIso(),
    updatedAt: itemRow.updated_at || itemRow.created_at || nowIso()
  };
};

const buildDiscoveryCard = ({ itemRow, userRow, imageUrls }) => {
  const metadata = jsonObject(itemRow.metadata);
  const podProfile = jsonObject(metadata.podProfile);
  const template = getCatalogTemplate(podProfile.templateKey) || {
    key: asText(podProfile.templateKey),
    name: asText(podProfile.templateName || 'POD product'),
    category: asText(metadata.category || 'Print on Demand'),
    availableColors: [],
    availableSizes: [],
    mockupImageUrls: []
  };

  return {
    id: String(itemRow.id),
    title: itemRow.title || metadata.title || 'Untitled POD product',
    description: asText(itemRow.description || metadata.description || template.description || '').slice(0, 260),
    price: parseMoney(itemRow.sale_price || metadata.salePrice || 0),
    coverImageUrl:
      imageUrls[0] ||
      metadata.coverImageUrl ||
      template.mockupImageUrls[0] ||
      createTemplateArt(template.name),
    category: asText(metadata.category || template.category || 'Print on Demand'),
    templateKey: asText(podProfile.templateKey || template.key),
    templateName: asText(podProfile.templateName || template.name),
    creatorName: userRow?.name || metadata.ownerName || 'Studio',
    brandName: asText(podProfile.brandName || ''),
    tags: toStringArray(metadata.tags),
    colors: Array.isArray(template.availableColors) ? template.availableColors : [],
    sizes: Array.isArray(template.availableSizes) ? template.availableSizes : []
  };
};

const buildJobMetricsByItemId = (rows) => {
  const metrics = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row.item_id || '');
    if (!key) return;
    const existing = metrics.get(key) || { queuedJobs: 0, completedJobs: 0 };
    const status = asText(row.status).toLowerCase();
    if (status === 'completed') existing.completedJobs += 1;
    if (!['completed', 'cancelled'].includes(status)) existing.queuedJobs += 1;
    metrics.set(key, existing);
  });
  return metrics;
};

const mapPodJobRow = ({ jobRow, itemRow, buyerRow, orderRow, shippingRow }) => {
  const variantSnapshot = jsonObject(jobRow?.variant_snapshot);
  const designSnapshot = jsonObject(jobRow?.design_snapshot);
  const shippingSnapshot = jsonObject(jobRow?.shipping_snapshot);
  return {
    id: String(jobRow?.id || ''),
    sellerId: String(jobRow?.seller_id || ''),
    itemId: String(jobRow?.item_id || ''),
    orderId: String(jobRow?.order_id || ''),
    orderItemId: String(jobRow?.order_item_id || ''),
    buyerId: String(jobRow?.buyer_id || ''),
    status: asText(jobRow?.status || 'queued') || 'queued',
    itemTitle: itemRow?.title || designSnapshot.itemTitle || 'POD product',
    buyerName: buyerRow?.name || shippingRow?.name || 'Buyer',
    buyerCity: shippingRow?.city || '',
    variantSnapshot,
    designSnapshot,
    shippingSnapshot,
    trackingNumber: asText(jobRow?.tracking_number || ''),
    carrier: asText(jobRow?.carrier || ''),
    notes: asText(jobRow?.notes || ''),
    totalPrice: parseMoney(orderRow?.total || designSnapshot.totalPrice || 0),
    mockupImageUrl: asText(designSnapshot.mockupImageUrl || designSnapshot.coverImageUrl || ''),
    createdAt: jobRow?.created_at || nowIso(),
    updatedAt: jobRow?.updated_at || jobRow?.created_at || nowIso()
  };
};

const listSellerJobs = async ({ supabase, ownerUserId }) => {
  const { data: jobs, error } = await supabase
    .from('pod_jobs')
    .select('*')
    .eq('seller_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) throw error;

  const jobRows = Array.isArray(jobs) ? jobs : [];
  const itemMap = new Map();
  const orderMap = await loadOrdersMap(
    supabase,
    jobRows.map((row) => row.order_id)
  );
  const shippingMap = await loadShippingMap(
    supabase,
    Array.from(orderMap.values()).map((row) => row.shipping_address_id)
  );

  const itemIds = Array.from(new Set(jobRows.map((row) => row.item_id).filter(Boolean)));
  if (itemIds.length) {
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id,title,metadata')
      .in('id', itemIds);
    if (itemsError) throw itemsError;
    (items || []).forEach((row) => itemMap.set(String(row.id), row));
  }

  const buyerMap = await loadUsersMap(
    supabase,
    jobRows.map((row) => row.buyer_id)
  );

  return jobRows.map((jobRow) =>
    mapPodJobRow({
      jobRow,
      itemRow: itemMap.get(String(jobRow.item_id)),
      buyerRow: buyerMap.get(String(jobRow.buyer_id)),
      orderRow: orderMap.get(String(jobRow.order_id)),
      shippingRow: shippingMap.get(String(orderMap.get(String(jobRow.order_id))?.shipping_address_id || ''))
    })
  );
};

const recalculateOrderStatus = async (supabase, orderId) => {
  const { data, error } = await supabase
    .from('order_items')
    .select('metadata')
    .eq('order_id', orderId);
  if (error) throw error;
  const statuses = (data || []).map((row) => jsonObject(row.metadata).fulfillmentStatus || 'processing');
  const nextStatus = computeOrderStatus(statuses);
  await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
  return nextStatus;
};

const updateOrderItemMetadata = async ({ supabase, orderItemId, patch }) => {
  const { data: orderItem, error: lookupError } = await supabase
    .from('order_items')
    .select('id,metadata')
    .eq('id', orderItemId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!orderItem) throw new Error('Order item not found.');
  const metadata = {
    ...jsonObject(orderItem.metadata),
    ...patch
  };
  const { error } = await supabase
    .from('order_items')
    .update({ metadata })
    .eq('id', orderItemId);
  if (error) throw error;
  return metadata;
};

const syncShipmentForPodJob = async ({ supabase, orderId, status, trackingNumber, carrier, notes }) => {
  const normalized = asText(status).toLowerCase();
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();
  if (shipmentError) throw shipmentError;

  const patch = {};
  if (trackingNumber) patch.tracking_number = trackingNumber;
  if (carrier) patch.carrier = carrier;
  if (notes !== undefined) patch.note = notes || null;

  if (normalized === 'shipped') {
    patch.status = 'shipped';
    patch.shipped_at = nowIso();
  } else if (normalized === 'completed') {
    patch.status = 'delivered';
    patch.delivered_at = nowIso();
  } else if (normalized === 'cancelled') {
    patch.status = 'cancelled';
  }

  if (shipment) {
    const { error } = await supabase.from('shipments').update(patch).eq('id', shipment.id);
    if (error) throw error;
    return;
  }

  if (!Object.keys(patch).length) return;
  const { error } = await supabase.from('shipments').insert({
    order_id: orderId,
    status: patch.status || 'pending',
    tracking_number: patch.tracking_number || null,
    carrier: patch.carrier || null,
    shipped_at: patch.shipped_at || null,
    delivered_at: patch.delivered_at || null,
    note: patch.note || null
  });
  if (error) throw error;
};

const createPrivateDesignAsset = async ({
  supabase,
  privateUploadsRoot,
  ownerUserId,
  fileName,
  mimeType,
  base64Data,
  title,
  tags,
  notes
}) => {
  const normalizedMimeType = asText(mimeType).toLowerCase().split(';')[0];
  const extension = DESIGN_MIME_EXTENSION_MAP[normalizedMimeType];
  if (!extension) {
    throw new Error('Design assets must be PNG, JPG, WEBP, SVG, or PDF.');
  }

  let binary;
  try {
    binary = Buffer.from(String(base64Data || ''), 'base64');
  } catch {
    throw new Error('Design asset is not valid base64.');
  }

  if (!binary.length) {
    throw new Error('Design asset is empty.');
  }
  if (binary.length > MAX_DESIGN_BYTES) {
    throw new Error(`Design asset exceeds the ${Math.round(MAX_DESIGN_BYTES / (1024 * 1024))}MB limit.`);
  }

  const assetId = randomUUID();
  const safeBase = sanitizeBaseName(fileName || title || 'design');
  const relativeDir = path.join('designs', ownerUserId);
  const relativePath = path.join(relativeDir, `${safeBase}-${assetId}.${extension}`);
  const fullDir = ensureDirectory(path.join(privateUploadsRoot, relativeDir));
  const fullPath = path.join(fullDir, `${safeBase}-${assetId}.${extension}`);
  fs.writeFileSync(fullPath, binary);

  const payload = {
    id: assetId,
    owner_user_id: ownerUserId,
    asset_type: POD_DESIGN_ASSET_TYPE,
    file_name: fileName || `${safeBase}.${extension}`,
    mime_type: normalizedMimeType,
    size_bytes: binary.length,
    storage_driver: PRIVATE_STORAGE_DRIVER,
    storage_path: relativePath.replace(/\\/g, '/'),
    resource_id: null,
    is_public: false,
    metadata: {
      title: asText(title || fileName || 'Untitled design'),
      tags: toStringArray(tags),
      notes: asText(notes || '')
    }
  };

  const { data, error } = await supabase.from('uploaded_assets').insert(payload).select('*').maybeSingle();
  if (error) {
    fs.rmSync(fullPath, { force: true });
    throw error;
  }
  return data || payload;
};

const ensureDesignAssetsOwnedByUser = async ({ supabase, ownerUserId, designAssetIds }) => {
  const ids = Array.from(new Set((Array.isArray(designAssetIds) ? designAssetIds : []).map((entry) => asText(entry)).filter(Boolean)));
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('uploaded_assets')
    .select('id,owner_user_id,asset_type,status')
    .in('id', ids);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const rowIds = new Set();
  rows.forEach((row) => {
    if (String(row.owner_user_id || '') !== String(ownerUserId)) {
      throw new Error('You can only attach your own design assets.');
    }
    if (asText(row.asset_type) !== POD_DESIGN_ASSET_TYPE) {
      throw new Error('Only POD design assets can be attached.');
    }
    if (asText(row.status || 'active') === 'deleted') {
      throw new Error('Deleted design assets cannot be attached.');
    }
    rowIds.add(String(row.id));
  });
  if (rowIds.size !== ids.length) {
    throw new Error('One or more design assets could not be found.');
  }
  return rows;
};

const upsertPodListing = async ({
  supabase,
  ownerUserId,
  body,
  existingItem
}) => {
  const existingMetadata = jsonObject(existingItem?.metadata);
  const existingPodProfile = jsonObject(existingMetadata.podProfile);
  const requestedTemplateKey = asText(body.templateKey || existingPodProfile.templateKey);
  const template = getCatalogTemplate(requestedTemplateKey);
  if (!template) {
    throw new Error('A valid POD starter template is required.');
  }

  const requestedStatus = asText(body.status || existingItem?.status || existingPodProfile.status || 'draft').toLowerCase();
  const listingStatus = requestedStatus === 'published' ? 'published' : 'draft';

  const title = asText(body.title || existingItem?.title);
  if (!title) throw new Error('Title is required.');
  const description = asText(body.description || existingItem?.description);
  if (!description) throw new Error('Description is required.');

  const category = asText(body.category || existingMetadata.category || template.category || 'Print on Demand');
  const categoryId = await resolveCategoryId(supabase, category);

  const fallbackPrice = parseMoney(body.salePrice ?? existingItem?.sale_price ?? existingMetadata.salePrice ?? template.baseCost * 2.4);
  if (fallbackPrice <= 0) {
    throw new Error('POD listings require a sale price greater than zero.');
  }
  const baseCost = parseMoney(body.baseCost ?? existingPodProfile.baseCost ?? template.baseCost);
  const turnaroundDays = Math.max(1, parseInteger(body.turnaroundDays ?? existingPodProfile.turnaroundDays ?? template.leadTimeDays, template.leadTimeDays));
  const brandName = asText(body.brandName || existingPodProfile.brandName || 'Urban Prime Studio');
  const providerLabel = asText(body.providerLabel || existingPodProfile.providerLabel || 'Urban Prime POD');
  const variantOptions = normalizeVariantOptions({
    variantOptions: body.variantOptions || existingPodProfile.variantOptions,
    template,
    fallbackPrice,
    fallbackBaseCost: baseCost
  });
  if (!variantOptions.length) {
    throw new Error('At least one POD variant is required.');
  }

  const designAssetIds = Array.from(
    new Set(
      (Array.isArray(body.designAssetIds) ? body.designAssetIds : existingPodProfile.designAssetIds || [])
        .map((entry) => asText(entry))
        .filter(Boolean)
    )
  );
  await ensureDesignAssetsOwnedByUser({ supabase, ownerUserId, designAssetIds });

  const defaultMockups = Array.isArray(template.mockupImageUrls) ? template.mockupImageUrls : [];
  const { coverImageUrl, galleryImageUrls } = resolveImageUrls(body, existingMetadata, defaultMockups);
  const tags = toStringArray(body.tags || existingMetadata.tags || [template.category, template.name, brandName]);
  const stock = Math.max(
    1,
    variantOptions.reduce((sum, option) => sum + Math.max(0, parseInteger(option.stock, 0)), 0) || 999
  );
  const marginFloorPercent = parseMoney(body.marginFloorPercent ?? existingPodProfile.marginFloorPercent ?? 24);

  const metadata = {
    ...existingMetadata,
    title,
    description,
    category,
    coverImageUrl,
    galleryImageUrls,
    imageUrls: galleryImageUrls,
    images: galleryImageUrls,
    productType: 'pod',
    itemType: 'physical',
    fulfillmentType: 'pod',
    salePrice: fallbackPrice,
    tags,
    features: [
      `${template.name} starter blank`,
      `${turnaroundDays}-day production target`,
      `${template.availableColors.length} curated colors`,
      `${variantOptions.filter((option) => option.isEnabled !== false).length} live variants`
    ],
    specifications: [
      { key: 'Template', value: template.name },
      { key: 'Category', value: template.category },
      { key: 'Fulfillment', value: 'Manual POD' },
      { key: 'Turnaround', value: `${turnaroundDays} days` }
    ],
    podProfile: {
      templateKey: template.key,
      templateName: template.name,
      category: template.category,
      brandName,
      providerLabel,
      variantOptions,
      designAssetIds,
      mockupImageUrls: galleryImageUrls,
      printAreas: template.printAreas,
      baseCost,
      turnaroundDays,
      fulfillmentMode: 'manual',
      status: listingStatus === 'published' ? 'published' : 'draft',
      marginFloorPercent
    },
    avgRating: existingMetadata.avgRating ?? 0,
    reviews: Array.isArray(existingMetadata.reviews) ? existingMetadata.reviews : []
  };

  const payload = {
    seller_id: ownerUserId,
    category_id: categoryId,
    title,
    description,
    listing_type: 'sale',
    status: listingStatus,
    currency: 'USD',
    sale_price: fallbackPrice,
    stock,
    metadata
  };

  let itemRow = existingItem || null;
  if (itemRow?.id) {
    const { data, error } = await supabase
      .from('items')
      .update(payload)
      .eq('id', itemRow.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    itemRow = data || { ...itemRow, ...payload };
  } else {
    const { data, error } = await supabase
      .from('items')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    itemRow = data || payload;
  }

  await writeItemImages(supabase, itemRow.id, galleryImageUrls);

  return {
    item: itemRow,
    listing: buildPodSellerListing({
      itemRow,
      imageUrls: galleryImageUrls,
      jobMetrics: new Map()
    })
  };
};

const collectDashboard = async ({ supabase, ownerUserId }) => {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('seller_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw error;

  const podItems = (Array.isArray(items) ? items : []).filter(isPodItemRow);
  const imageMap = await loadItemImagesMap(
    supabase,
    podItems.map((row) => row.id)
  );
  const { data: podJobs, error: podJobsError } = await supabase
    .from('pod_jobs')
    .select('*')
    .eq('seller_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(120);
  if (podJobsError) throw podJobsError;

  const jobRows = Array.isArray(podJobs) ? podJobs : [];
  const jobMetrics = buildJobMetricsByItemId(jobRows);
  const listings = podItems.map((itemRow) =>
    buildPodSellerListing({
      itemRow,
      imageUrls: imageMap.get(String(itemRow.id)) || [],
      jobMetrics
    })
  );

  const revenue = jobRows
    .filter((job) => asText(job.status).toLowerCase() === 'completed')
    .reduce((sum, job) => sum + parseMoney(jsonObject(job.metadata).lineTotal || 0), 0);
  const lowMarginAlerts = listings.filter((listing) => listing.marginPercent < 20).length;
  const avgTurnaroundDays =
    listings.length > 0
      ? Number(
          (
            listings.reduce((sum, listing) => sum + Math.max(0, parseInteger(listing.turnaroundDays, 0)), 0) /
            listings.length
          ).toFixed(1)
        )
      : 0;

  return {
    summary: {
      revenue,
      activeListings: listings.filter((listing) => listing.status === 'published').length,
      queuedJobs: jobRows.filter((job) => !['completed', 'cancelled'].includes(asText(job.status).toLowerCase())).length,
      lowMarginAlerts,
      avgTurnaroundDays
    },
    listings,
    jobs: await listSellerJobs({ supabase, ownerUserId })
  };
};

const collectDiscoveryPayload = async ({ supabase }) => {
  const { data: items, error } = await supabase
    .from('items')
    .select('id,seller_id,title,description,sale_price,status,metadata,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw error;

  const podItems = (Array.isArray(items) ? items : []).filter(isPodItemRow);
  const imageMap = await loadItemImagesMap(
    supabase,
    podItems.map((row) => row.id)
  );
  const userMap = await loadUsersMap(
    supabase,
    podItems.map((row) => row.seller_id)
  );
  const cards = podItems.map((itemRow) =>
    buildDiscoveryCard({
      itemRow,
      userRow: userMap.get(String(itemRow.seller_id)),
      imageUrls: imageMap.get(String(itemRow.id)) || []
    })
  );

  const featured = cards.slice(0, 6);
  const hero = featured[0] || cards[0] || null;

  const byCategoryMap = new Map();
  cards.forEach((card) => {
    const key = sanitizeBaseName(card.category || 'print-on-demand');
    const existing = byCategoryMap.get(key) || {
      slug: key,
      title: card.category || 'Print on Demand',
      items: []
    };
    existing.items.push(card);
    byCategoryMap.set(key, existing);
  });

  const collectionMap = new Map();
  cards.forEach((card) => {
    const key = sanitizeBaseName(card.templateName || 'collection');
    const existing = collectionMap.get(key) || {
      slug: key,
      title: card.templateName || 'Collection',
      items: []
    };
    existing.items.push(card);
    collectionMap.set(key, existing);
  });

  return {
    hero,
    featured,
    collections: Array.from(collectionMap.values()).slice(0, 4),
    byCategory: Array.from(byCategoryMap.values()).slice(0, 6),
    total: cards.length
  };
};

export default function registerPodMarketplaceRoutes({
  app,
  supabase,
  requireAuth,
  getUserContext,
  uploadsRoot
}) {
  const privateUploadsRoot = ensureDirectory(path.resolve(uploadsRoot, '..', 'private-pod'));

  app.get('/marketplace/pod/catalog', async (_req, res) => {
    return res.json({ templates: POD_CATALOG });
  });

  app.get('/marketplace/pod/discovery', async (_req, res) => {
    try {
      const payload = await collectDiscoveryPayload({ supabase });
      return res.json(payload);
    } catch (error) {
      console.error('pod discovery failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load POD discovery.' });
    }
  });

  app.get('/marketplace/pod/me/dashboard', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const dashboard = await collectDashboard({
        supabase,
        ownerUserId: context.user.id
      });
      return res.json(dashboard);
    } catch (error) {
      console.error('pod dashboard failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load POD dashboard.' });
    }
  });

  app.get('/marketplace/pod/me/designs', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const usageCounts = await loadPodJobUsageCounts({ supabase, ownerUserId: context.user.id });
      const { data, error } = await supabase
        .from('uploaded_assets')
        .select('*')
        .eq('owner_user_id', context.user.id)
        .eq('asset_type', POD_DESIGN_ASSET_TYPE)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return res.json({
        assets: (data || []).map((row) => mapDesignAssetRow(row, usageCounts))
      });
    } catch (error) {
      console.error('pod designs failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load POD designs.' });
    }
  });

  app.post('/marketplace/pod/designs', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const asset = await createPrivateDesignAsset({
        supabase,
        privateUploadsRoot,
        ownerUserId: context.user.id,
        fileName: req.body?.fileName,
        mimeType: req.body?.mimeType,
        base64Data: req.body?.base64Data,
        title: req.body?.title,
        tags: req.body?.tags,
        notes: req.body?.notes
      });

      const usageCounts = new Map();
      return res.status(201).json({
        asset: mapDesignAssetRow(asset, usageCounts)
      });
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Unable to upload POD design asset.' });
    }
  });

  app.delete('/marketplace/pod/designs/:id', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const assetId = asText(req.params.id);
      if (!uuidLike(assetId)) {
        return res.status(400).json({ error: 'Design id must be a UUID.' });
      }

      const { data: asset, error } = await supabase
        .from('uploaded_assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();
      if (error) throw error;
      if (!asset || String(asset.owner_user_id || '') !== String(context.user.id)) {
        return res.status(404).json({ error: 'Design asset not found.' });
      }

      const { error: updateError } = await supabase
        .from('uploaded_assets')
        .update({
          status: 'deleted',
          metadata: {
            ...jsonObject(asset.metadata),
            deletedAt: nowIso()
          }
        })
        .eq('id', assetId);
      if (updateError) throw updateError;

      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Unable to delete POD design asset.' });
    }
  });

  app.post('/marketplace/pod/listings', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const result = await upsertPodListing({
        supabase,
        ownerUserId: context.user.id,
        body: req.body || {}
      });
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Unable to create POD listing.' });
    }
  });

  app.patch('/marketplace/pod/listings/:id', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const listingId = asText(req.params.id);
      if (!uuidLike(listingId)) {
        return res.status(400).json({ error: 'Listing id must be a UUID.' });
      }

      const { data: existingItem, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();
      if (error) throw error;
      if (!existingItem || String(existingItem.seller_id || '') !== String(context.user.id) || !isPodItemRow(existingItem)) {
        return res.status(404).json({ error: 'POD listing not found.' });
      }

      const result = await upsertPodListing({
        supabase,
        ownerUserId: context.user.id,
        body: req.body || {},
        existingItem
      });
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Unable to update POD listing.' });
    }
  });

  app.get('/marketplace/pod/jobs', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      return res.json({
        jobs: await listSellerJobs({ supabase, ownerUserId: context.user.id })
      });
    } catch (error) {
      console.error('pod jobs failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load POD jobs.' });
    }
  });

  app.patch('/marketplace/pod/jobs/:id', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const jobId = asText(req.params.id);
      if (!uuidLike(jobId)) {
        return res.status(400).json({ error: 'Job id must be a UUID.' });
      }

      const { data: jobRow, error } = await supabase
        .from('pod_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (error) throw error;
      if (!jobRow || String(jobRow.seller_id || '') !== String(context.user.id)) {
        return res.status(404).json({ error: 'POD job not found.' });
      }

      const nextStatus = asText(req.body?.status || jobRow.status).toLowerCase();
      if (!POD_JOB_STATUSES.has(nextStatus)) {
        return res.status(400).json({ error: 'Invalid POD job status.' });
      }

      const trackingNumber = asText(req.body?.trackingNumber || jobRow.tracking_number);
      const carrier = asText(req.body?.carrier || jobRow.carrier);
      const notes = asText(req.body?.notes || jobRow.notes);

      const { data: updatedJob, error: updateError } = await supabase
        .from('pod_jobs')
        .update({
          status: nextStatus,
          tracking_number: trackingNumber || null,
          carrier: carrier || null,
          notes: notes || null,
          metadata: {
            ...jsonObject(jobRow.metadata),
            lastUpdatedAt: nowIso(),
            lineStatus: podJobStatusToLineStatus(nextStatus)
          }
        })
        .eq('id', jobId)
        .select('*')
        .maybeSingle();
      if (updateError) throw updateError;

      await updateOrderItemMetadata({
        supabase,
        orderItemId: jobRow.order_item_id,
        patch: {
          podJobStatus: nextStatus,
          fulfillmentStatus: podJobStatusToLineStatus(nextStatus),
          trackingNumber: trackingNumber || null,
          carrier: carrier || null
        }
      });

      await syncShipmentForPodJob({
        supabase,
        orderId: jobRow.order_id,
        status: nextStatus,
        trackingNumber,
        carrier,
        notes
      });

      await recalculateOrderStatus(supabase, jobRow.order_id);

      const jobs = await listSellerJobs({ supabase, ownerUserId: context.user.id });
      const job = jobs.find((entry) => entry.id === String(updatedJob?.id || jobId)) || null;
      return res.json({ ok: true, job });
    } catch (error) {
      console.error('pod job update failed:', error);
      return res.status(400).json({ error: error?.message || 'Unable to update POD job.' });
    }
  });
}
