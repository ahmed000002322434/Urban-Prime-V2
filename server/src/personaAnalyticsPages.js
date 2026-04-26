const PAGE_CACHE_COLLECTION = 'analytics_page_cache';
const EVENT_ARCHIVE_COLLECTION = 'analytics_event_queue_archive';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const PAGE_CACHE_TTL_MS = 5000;

const RANGE_TO_DAYS = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180
};

const SCOPE_LABELS = {
  consumer: 'Consumer',
  seller: 'Seller',
  provider: 'Provider',
  affiliate: 'Affiliate',
  shipper: 'Shipper',
  admin: 'Platform'
};

const PAGE_META = {
  consumer: {
    overview: { title: 'Consumer Overview', subtitle: 'Orders, rentals, saved items, and buyer activity in one live workspace.' },
    spend: { title: 'Spend Intelligence', subtitle: 'Track spend velocity, order mix, and where your budget is flowing.' },
    rentals: { title: 'Rental Activity', subtitle: 'Monitor live rentals, return windows, and fulfillment status.' },
    discovery: { title: 'Discovery Signals', subtitle: 'See what you save, revisit, and respond to across the marketplace.' }
  },
  seller: {
    overview: { title: 'Seller Overview', subtitle: 'Revenue, demand, conversion, and fulfillment health for your storefront.' },
    traffic: { title: 'Traffic Analytics', subtitle: 'Track views, sources, and short-term momentum across product discovery.' },
    revenue: { title: 'Revenue Analytics', subtitle: 'Understand sales volume, order value, and revenue pacing over time.' },
    'sales-units': { title: 'Sales Units', subtitle: 'Follow sell-through, units moved, and product-level volume leaders.' },
    conversion: { title: 'Conversion Funnel', subtitle: 'Watch the path from view to checkout and pinpoint where buyers drop.' },
    products: { title: 'Product Intelligence', subtitle: 'Rank products by demand, sell-through, and commercial contribution.' },
    intelligence: { title: 'Seller Intelligence', subtitle: 'Surface recommendations, anomalies, cohorts, and trust signals.' }
  },
  provider: {
    overview: { title: 'Provider Overview', subtitle: 'Pipeline, contracts, client demand, and earnings in one command surface.' },
    pipeline: { title: 'Pipeline Analytics', subtitle: 'See request flow, proposal output, and contract progression in real time.' },
    earnings: { title: 'Provider Earnings', subtitle: 'Measure contract revenue, completion pace, and client value.' },
    clients: { title: 'Client Analytics', subtitle: 'Understand repeat clients, revenue concentration, and relationship health.' }
  },
  affiliate: {
    overview: { title: 'Affiliate Overview', subtitle: 'Clicks, conversions, campaign throughput, and payout readiness.' },
    traffic: { title: 'Affiliate Traffic', subtitle: 'Inspect click volume, attribution trends, and referral quality.' },
    campaigns: { title: 'Campaign Performance', subtitle: 'Compare links, campaigns, and creative surfaces that convert.' },
    payouts: { title: 'Affiliate Payouts', subtitle: 'Track approved commissions, payout queue, and settlement history.' }
  },
  shipper: {
    overview: { title: 'Shipper Overview', subtitle: 'Shipment flow, delivery progress, and exception pressure across the network.' },
    sla: { title: 'SLA Performance', subtitle: 'Monitor on-time delivery, delayed shipments, and service-level adherence.' },
    regions: { title: 'Regional Coverage', subtitle: 'Compare shipment flow by city, route, and carrier mix.' },
    exceptions: { title: 'Exception Desk', subtitle: 'Focus on delayed, at-risk, and broken fulfillment runs.' }
  },
  admin: {
    overview: { title: 'Platform Overview', subtitle: 'Unified marketplace health across commerce, operations, trust, and payouts.' },
    commerce: { title: 'Commerce Control', subtitle: 'Orders, rentals, disputes, and GMV signals across the platform.' },
    operations: { title: 'Operations Control', subtitle: 'Workflows, shipments, uploads, and operational pressure points.' },
    trust: { title: 'Trust & Risk', subtitle: 'Moderation, low-trust analytics signals, and marketplace enforcement posture.' },
    payouts: { title: 'Payout Operations', subtitle: 'Monitor payout queue, approval status, and settlement exposure.' }
  }
};

const ACTIVE_RENTAL_STATUSES = new Set([
  'pending_confirmation',
  'confirmed',
  'ready_for_handoff',
  'in_transit',
  'active',
  'return_in_transit',
  'returned'
]);
const ACTIVE_CONTRACT_STATUSES = new Set(['pending', 'active', 'disputed']);
const COMPLETED_CONTRACT_STATUSES = new Set(['completed']);
const ACTIVE_SHIPMENT_STATUSES = new Set(['processing', 'shipped', 'in_transit', 'out_for_delivery', 'picked_up']);
const SHIPMENT_EXCEPTION_STATUSES = new Set(['delayed', 'exception', 'failed_delivery', 'returned']);
const PENDING_PAYOUT_STATUSES = new Set(['pending', 'requested', 'queued', 'processing']);
const ORDER_EXCLUDED_STATUSES = new Set(['cancelled', 'canceled', 'refunded']);

const formatterCache = new Map();

const toText = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toObject = (value) => {
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

const toArray = (value) => (Array.isArray(value) ? value : []);

const unique = (values) => Array.from(new Set(values.map((value) => toText(value)).filter(Boolean)));

const sum = (values) => values.reduce((total, entry) => total + toNumber(entry, 0), 0);

const titleCase = (value) =>
  toText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Unknown';

const formatMetricNumber = (value) => {
  const numeric = toNumber(value, 0);
  return numeric >= 1000 ? numeric.toLocaleString('en-US') : numeric;
};

const formatPercent = (value, digits = 1) => `${toNumber(value, 0).toFixed(digits)}%`;

const buildChangeText = (current, previous, suffix = 'vs previous window') => {
  const baseline = toNumber(previous, 0);
  const next = toNumber(current, 0);
  if (baseline === 0) {
    return next > 0 ? `New activity ${suffix}` : undefined;
  }
  const delta = ((next - baseline) / baseline) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}% ${suffix}`;
};

const getCurrencyFormatter = (currency = 'USD') => {
  const key = toText(currency, 'USD').toUpperCase();
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: key,
        maximumFractionDigits: 0
      })
    );
  }
  return formatterCache.get(key);
};

const formatCurrency = (value, currency = 'USD') => {
  try {
    return getCurrencyFormatter(currency).format(toNumber(value, 0));
  } catch {
    return `$${toNumber(value, 0).toFixed(0)}`;
  }
};

const toDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateParts = (date, timeZone, opts = {}) => {
  const formatterKey = `${timeZone}:${JSON.stringify(opts)}`;
  if (!formatterCache.has(formatterKey)) {
    formatterCache.set(
      formatterKey,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: opts.hour ? '2-digit' : undefined,
        hourCycle: opts.hour ? 'h23' : undefined
      })
    );
  }
  return formatterCache.get(formatterKey).formatToParts(date);
};

const getDayKey = (value, timeZone) => {
  const date = toDate(value) || new Date();
  const parts = getDateParts(date, timeZone);
  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
};

const getHourKey = (value, timeZone) => {
  const date = toDate(value) || new Date();
  const parts = getDateParts(date, timeZone, { hour: true });
  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  return `${year}-${month}-${day}-${hour}`;
};

const formatDayLabel = (date, timeZone) =>
  date.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric' });

const formatHourLabel = (date, timeZone) =>
  date.toLocaleTimeString('en-US', { timeZone, hour: 'numeric' });

const buildSeriesSkeleton = (range, timeZone) => {
  const now = Date.now();
  if (range === '24h') {
    return Array.from({ length: 24 }, (_, index) => {
      const stamp = new Date(now - (23 - index) * HOUR_MS);
      return {
        key: getHourKey(stamp, timeZone),
        label: formatHourLabel(stamp, timeZone),
        value: 0
      };
    });
  }

  const days = RANGE_TO_DAYS[range] || 30;
  return Array.from({ length: days }, (_, index) => {
    const stamp = new Date(now - (days - 1 - index) * DAY_MS);
    return {
      key: getDayKey(stamp, timeZone),
      label: formatDayLabel(stamp, timeZone),
      value: 0
    };
  });
};

const accumulateSeries = (rows, { range, timeZone, timestampGetter, valueGetter }) => {
  const skeleton = buildSeriesSkeleton(range, timeZone);
  const lookup = new Map(skeleton.map((entry) => [entry.key, entry]));
  rows.forEach((row) => {
    const key = range === '24h'
      ? getHourKey(timestampGetter(row), timeZone)
      : getDayKey(timestampGetter(row), timeZone);
    const current = lookup.get(key);
    if (!current) return;
    current.value += toNumber(valueGetter(row), 0);
  });
  return skeleton.map(({ key, ...entry }) => entry);
};

const buildHeatmap = (rows, timestampGetter) => {
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayPartLabels = ['Night', 'Morning', 'Afternoon', 'Evening'];
  const matrix = new Map();

  rows.forEach((row) => {
    const date = toDate(timestampGetter(row));
    if (!date) return;
    const hour = date.getHours();
    const dayPart = hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    const weekday = weekdayLabels[date.getDay()];
    const key = `${weekday}:${dayPart}`;
    matrix.set(key, (matrix.get(key) || 0) + 1);
  });

  const heatmap = [];
  weekdayLabels.forEach((weekday) => {
    dayPartLabels.forEach((dayPart) => {
      heatmap.push({
        x: dayPart,
        y: weekday,
        value: matrix.get(`${weekday}:${dayPart}`) || 0
      });
    });
  });

  return heatmap;
};

const buildStatusBreakdown = (rows, statusGetter, limit = 8) => {
  const totals = new Map();
  rows.forEach((row) => {
    const status = titleCase(statusGetter(row));
    totals.set(status, (totals.get(status) || 0) + 1);
  });
  return Array.from(totals.entries())
    .map(([label, value]) => ({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      value
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

const buildValueBreakdown = (rows, labelGetter, valueGetter, limit = 8) => {
  const totals = new Map();
  rows.forEach((row) => {
    const label = toText(labelGetter(row), 'Unknown');
    totals.set(label, (totals.get(label) || 0) + toNumber(valueGetter(row), 0));
  });
  return Array.from(totals.entries())
    .map(([label, value]) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      value
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

const buildTimeline = (rows, { idGetter, labelGetter, timestampGetter, statusGetter, descriptionGetter, limit = 10 }) =>
  rows
    .slice()
    .sort((left, right) => (toDate(timestampGetter(right))?.getTime() || 0) - (toDate(timestampGetter(left))?.getTime() || 0))
    .slice(0, limit)
    .map((row, index) => ({
      id: toText(idGetter(row), `timeline-${index}`),
      label: toText(labelGetter(row), 'Activity'),
      timestamp: toText(timestampGetter(row)),
      status: toText(statusGetter(row)),
      description: toText(descriptionGetter(row))
    }));

const buildTicker = (rows, formatter, limit = 8) =>
  rows
    .slice()
    .sort((left, right) => (toDate(formatter(right).timestamp)?.getTime() || 0) - (toDate(formatter(left).timestamp)?.getTime() || 0))
    .slice(0, limit)
    .map((row) => formatter(row).label)
    .filter(Boolean);

const buildLeaderboard = (rows, { idGetter, labelGetter, primaryGetter, secondaryGetter, badgeGetter, hrefGetter, valueGetter, limit = 8 }) =>
  rows
    .slice()
    .sort((left, right) => toNumber(valueGetter(right), 0) - toNumber(valueGetter(left), 0))
    .slice(0, limit)
    .map((row, index) => ({
      id: toText(idGetter(row), `leaderboard-${index}`),
      label: toText(labelGetter(row), 'Item'),
      primary: primaryGetter(row),
      secondary: secondaryGetter ? toText(secondaryGetter(row)) : undefined,
      badge: badgeGetter ? toText(badgeGetter(row)) : undefined,
      href: hrefGetter ? toText(hrefGetter(row)) : undefined,
      value: toNumber(valueGetter(row), 0)
    }));

const fetchRows = async (supabase, table, { apply, limit = 500, orderKey = 'updated_at' } = {}) => {
  let query = supabase.from(table).select('*');
  if (apply) query = apply(query);
  if (orderKey) query = query.order(orderKey, { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) return { data: [], error };
  return { data: Array.isArray(data) ? data : [], error: null };
};

const fetchRowsSafe = async (supabase, table, options = {}) => {
  const attempt = await fetchRows(supabase, table, options);
  return attempt.error ? [] : attempt.data;
};

const fetchRowsWithFallbacks = async (supabase, table, fallbacks = [], options = {}) => {
  for (const apply of fallbacks) {
    const attempt = await fetchRows(supabase, table, { ...options, apply });
    if (!attempt.error) return attempt.data;
  }
  return fetchRowsSafe(supabase, table, options);
};

const fetchTableCount = async (supabase, table) => {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  return error ? 0 : count || 0;
};

const fetchMirrorCollectionRows = async (supabase, collection, limit = 1000) => {
  const { data, error } = await supabase
    .from('mirror_documents')
    .select('doc_id,data,updated_at')
    .eq('collection', collection)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return error ? [] : Array.isArray(data) ? data : [];
};

const loadUsersMap = async (supabase, ids) => {
  const uniqueIds = unique(ids);
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase.from('users').select('*').in('id', uniqueIds);
  if (error) return new Map();
  return new Map((data || []).map((row) => [toText(row.id), row]));
};

const loadItemsMap = async (supabase, ids) => {
  const uniqueIds = unique(ids);
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase.from('items').select('*').in('id', uniqueIds);
  if (error) return new Map();
  return new Map((data || []).map((row) => [toText(row.id), row]));
};

const loadCategoriesMap = async (supabase, ids) => {
  const uniqueIds = unique(ids);
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase.from('categories').select('id,name').in('id', uniqueIds);
  if (error) return new Map();
  return new Map((data || []).map((row) => [toText(row.id), row]));
};

const loadAddressesMap = async (supabase, ids) => {
  const uniqueIds = unique(ids);
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase.from('shipping_addresses').select('*').in('id', uniqueIds);
  if (error) return new Map();
  return new Map((data || []).map((row) => [toText(row.id), row]));
};

const loadPersonaContext = async (supabase, scopeId) => {
  const { data: persona, error } = await supabase.from('personas').select('*').eq('id', scopeId).maybeSingle();
  if (error || !persona) return null;
  const { data: user } = await supabase.from('users').select('*').eq('id', persona.user_id).maybeSingle();
  return {
    persona,
    user: user || null
  };
};

const buildPageCacheKey = (scopeType, scopeId, pageId, range, timezone) =>
  `${scopeType}:${scopeId}:${pageId}:${range}:${timezone}`;

const readPageCache = async (supabase, scopeType, scopeId, pageId, range, timezone) => {
  const cacheKey = buildPageCacheKey(scopeType, scopeId, pageId, range, timezone);
  const { data, error } = await supabase
    .from('mirror_documents')
    .select('data,updated_at')
    .eq('collection', PAGE_CACHE_COLLECTION)
    .eq('doc_id', cacheKey)
    .maybeSingle();

  if (error || !data?.data?.payload) return null;
  const age = Date.now() - (toDate(data.updated_at)?.getTime() || 0);
  if (age > PAGE_CACHE_TTL_MS) return null;
  return data.data.payload;
};

const writePageCache = async (supabase, scopeType, scopeId, pageId, range, timezone, payload) => {
  const now = new Date().toISOString();
  const cacheKey = buildPageCacheKey(scopeType, scopeId, pageId, range, timezone);
  await supabase.from('mirror_documents').upsert(
    {
      collection: PAGE_CACHE_COLLECTION,
      doc_id: cacheKey,
      data: { payload, generatedAt: now },
      updated_at: now
    },
    { onConflict: 'collection,doc_id', ignoreDuplicates: false }
  );
};

const createPayload = ({ scopeType, scopeId, pageId, range, timezone, personaLabel, title, subtitle, aggregateFallback = false, alerts = [], heroMetrics = [], widgets = [] }) => ({
  scopeType,
  scopeId,
  pageId,
  range,
  generatedAt: new Date().toISOString(),
  staleAfterMs: PAGE_CACHE_TTL_MS,
  timezone,
  title,
  subtitle,
  personaLabel,
  aggregateFallback,
  exportFormats: ['json', 'csv'],
  alerts,
  heroMetrics,
  widgets
});

const scopePageMeta = (scopeType, pageId) => PAGE_META?.[scopeType]?.[pageId] || { title: `${SCOPE_LABELS[scopeType]} Analytics`, subtitle: 'Live marketplace analytics.' };

const getScopeValue = (row, keys = []) => {
  for (const key of keys) {
    const value = row?.[key];
    const text = toText(value);
    if (text) return text;
  }
  return '';
};

const buildConsumerPage = async ({ supabase, scope, pageId, range, timezone }) => {
  const user = scope.user || {};
  const userId = toText(user.id);
  const currency = toText(user.currency_preference || user.currencyPreference, 'USD');

  const orders = await fetchRowsWithFallbacks(supabase, 'orders', [query => query.eq('buyer_id', userId)], {
    orderKey: 'created_at',
    limit: 1000
  });
  const orderIds = unique(orders.map((row) => row.id));
  const orderItems = orderIds.length
    ? await fetchRowsSafe(supabase, 'order_items', {
        apply: (query) => query.in('order_id', orderIds),
        orderKey: 'created_at',
        limit: 4000
      })
    : [];
  const rentals = await fetchRowsWithFallbacks(supabase, 'rental_bookings', [query => query.eq('buyer_id', userId)], {
    orderKey: 'created_at',
    limit: 1000
  });
  const wishlists = await fetchRowsWithFallbacks(supabase, 'wishlists', [query => query.eq('user_id', userId)], {
    orderKey: 'created_at',
    limit: 40
  });
  const wishlistIds = unique(wishlists.map((row) => row.id));
  const wishlistItems = wishlistIds.length
    ? await fetchRowsSafe(supabase, 'wishlist_items', {
        apply: (query) => query.in('wishlist_id', wishlistIds),
        orderKey: 'created_at',
        limit: 2000
      })
    : [];
  const notifications = await fetchRowsWithFallbacks(supabase, 'notifications', [query => query.eq('user_id', userId)], {
    orderKey: 'created_at',
    limit: 400
  });

  const itemIds = unique(orderItems.map((row) => row.item_id).concat(wishlistItems.map((row) => row.item_id)));
  const itemsMap = await loadItemsMap(supabase, itemIds);
  const categoryMap = await loadCategoriesMap(
    supabase,
    Array.from(itemsMap.values()).map((item) => item.category_id)
  );

  const orderItemCountByOrderId = new Map();
  orderItems.forEach((row) => {
    const orderId = toText(row.order_id);
    orderItemCountByOrderId.set(orderId, (orderItemCountByOrderId.get(orderId) || 0) + 1);
  });

  const totalSpend = sum(orders.map((row) => row.total));
  const activeRentals = rentals.filter((row) => ACTIVE_RENTAL_STATUSES.has(toText(row.status).toLowerCase())).length;
  const wishlistCount = wishlistItems.length;
  const unreadNotifications = notifications.filter((row) => !row.read_at).length;
  const upcomingReturns = rentals.filter((row) => {
    const rentalEnd = toDate(row.rental_end);
    if (!rentalEnd) return false;
    const status = toText(row.status).toLowerCase();
    return ACTIVE_RENTAL_STATUSES.has(status) && rentalEnd.getTime() >= Date.now() && rentalEnd.getTime() <= Date.now() + 7 * DAY_MS;
  });

  const spendSeries = accumulateSeries(orders, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.created_at,
    valueGetter: (row) => row.total
  });
  const orderSeries = accumulateSeries(orders, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.created_at,
    valueGetter: () => 1
  });
  const rentalSeries = accumulateSeries(rentals, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.created_at || row.rental_start,
    valueGetter: () => 1
  });
  const wishlistSeries = accumulateSeries(wishlistItems, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.created_at || row.added_at,
    valueGetter: () => 1
  });

  const orderStatusBreakdown = buildStatusBreakdown(orders, (row) => row.status);
  const rentalStatusBreakdown = buildStatusBreakdown(rentals, (row) => row.status);
  const categorySpendBreakdown = buildValueBreakdown(
    orderItems,
    (row) => {
      const item = itemsMap.get(toText(row.item_id));
      const category = categoryMap.get(toText(item?.category_id));
      return category?.name || 'Uncategorized';
    },
    (row) => toNumber(row.unit_price, 0) * Math.max(1, toNumber(row.quantity, 1))
  );

  const savedItemBreakdown = buildValueBreakdown(
    wishlistItems,
    (row) => itemsMap.get(toText(row.item_id))?.title || 'Saved item',
    () => 1
  );

  const alerts = [];
  if (unreadNotifications > 0) {
    alerts.push({
      id: 'consumer-unread',
      tone: 'warning',
      title: `${unreadNotifications} unread notifications`,
      description: 'You have buyer updates waiting for review across orders, returns, or saved items.',
      actionLabel: 'Open Inbox',
      actionHref: '/profile/messages'
    });
  }
  if (upcomingReturns.length > 0) {
    alerts.push({
      id: 'consumer-returns',
      tone: 'info',
      title: `${upcomingReturns.length} rental returns due soon`,
      description: 'Rental windows are closing inside the next seven days.',
      actionLabel: 'View Rentals',
      actionHref: '/profile/analytics/consumer/rentals'
    });
  }

  const heroMetrics = [
    { id: 'spend', label: 'Total Spend', value: formatCurrency(totalSpend, currency) },
    { id: 'orders', label: 'Orders', value: formatMetricNumber(orders.length) },
    { id: 'rentals', label: 'Active Rentals', value: formatMetricNumber(activeRentals) },
    { id: 'saved', label: 'Saved Items', value: formatMetricNumber(wishlistCount) }
  ];

  const recentOrdersRows = orders.slice(0, 10).map((row) => ({
    id: toText(row.id),
    status: titleCase(row.status),
    total: formatCurrency(row.total, row.currency || currency),
    items: orderItemCountByOrderId.get(toText(row.id)) || 0,
    createdAt: toText(row.created_at)
  }));

  const page = scopePageMeta('consumer', pageId);
  const widgetsByPage = {
    overview: [
      {
        id: 'consumer-overview-spend',
        kind: 'timeseries',
        title: 'Spend Velocity',
        description: 'Buyer spend across the selected range.',
        aggregateMode: 'aggregate',
        series: spendSeries
      },
      {
        id: 'consumer-overview-status',
        kind: 'donut',
        title: 'Order Status Mix',
        description: 'Current order mix across recent buyer activity.',
        aggregateMode: 'aggregate',
        breakdown: orderStatusBreakdown
      },
      {
        id: 'consumer-overview-orders',
        kind: 'table',
        title: 'Recent Orders',
        description: 'Latest orders tied to the current consumer persona.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'items', label: 'Items', align: 'center' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: recentOrdersRows
      },
      {
        id: 'consumer-overview-ticker',
        kind: 'ticker',
        title: 'Live Buyer Feed',
        description: 'Latest notifications and order events.',
        aggregateMode: 'aggregate',
        ticker: notifications
          .slice(0, 8)
          .map((row) => toText(row.title || row.message || row.type, 'Buyer update'))
      }
    ],
    spend: [
      {
        id: 'consumer-spend-series',
        kind: 'timeseries',
        title: 'Order Spend',
        description: 'Total order value over time.',
        aggregateMode: 'aggregate',
        series: spendSeries
      },
      {
        id: 'consumer-spend-categories',
        kind: 'stat-list',
        title: 'Spend by Category',
        description: 'Product categories consuming the most budget.',
        aggregateMode: 'aggregate',
        breakdown: categorySpendBreakdown
      },
      {
        id: 'consumer-spend-orders',
        kind: 'bar-list',
        title: 'Order Volume',
        description: 'Order count trend across the selected range.',
        aggregateMode: 'aggregate',
        series: orderSeries
      },
      {
        id: 'consumer-spend-table',
        kind: 'table',
        title: 'Recent High-Value Orders',
        description: 'Top recent orders sorted by recency.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: recentOrdersRows
      }
    ],
    rentals: [
      {
        id: 'consumer-rentals-series',
        kind: 'timeseries',
        title: 'Rental Flow',
        description: 'New rental activity entering the system.',
        aggregateMode: 'aggregate',
        series: rentalSeries
      },
      {
        id: 'consumer-rentals-status',
        kind: 'donut',
        title: 'Rental Status Mix',
        description: 'Track where current rentals are in the lifecycle.',
        aggregateMode: 'aggregate',
        breakdown: rentalStatusBreakdown
      },
      {
        id: 'consumer-rentals-timeline',
        kind: 'timeline',
        title: 'Rental Timeline',
        description: 'Most recent rental and return events.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(rentals, {
          idGetter: (row) => row.id,
          labelGetter: (row) => itemsMap.get(toText(row.item_id))?.title || 'Rental',
          timestampGetter: (row) => row.updated_at || row.created_at || row.rental_start,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => {
            const end = toText(row.rental_end);
            return end ? `Return window ends ${end}` : 'Rental booking active.';
          }
        })
      },
      {
        id: 'consumer-rentals-upcoming',
        kind: 'table',
        title: 'Upcoming Returns',
        description: 'Return windows closing within the next seven days.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'item', label: 'Item' },
          { key: 'status', label: 'Status' },
          { key: 'returnBy', label: 'Return By' }
        ],
        rows: upcomingReturns.slice(0, 10).map((row) => ({
          id: toText(row.id),
          item: itemsMap.get(toText(row.item_id))?.title || 'Rental item',
          status: titleCase(row.status),
          returnBy: toText(row.rental_end)
        }))
      }
    ],
    discovery: [
      {
        id: 'consumer-discovery-saves',
        kind: 'timeseries',
        title: 'Saved Item Activity',
        description: 'How often items are being saved into wishlist collections.',
        aggregateMode: 'aggregate',
        series: wishlistSeries
      },
      {
        id: 'consumer-discovery-leaders',
        kind: 'leaderboard',
        title: 'Most Saved Items',
        description: 'Items appearing most often inside current wishlists.',
        aggregateMode: 'aggregate',
        leaderboard: savedItemBreakdown.map((entry) => ({
          id: entry.id,
          label: entry.label,
          primary: entry.value,
          secondary: 'Wishlist saves',
          value: entry.value
        }))
      },
      {
        id: 'consumer-discovery-heatmap',
        kind: 'heatmap',
        title: 'Save Timing Heatmap',
        description: 'When discovery activity tends to happen.',
        aggregateMode: 'aggregate',
        heatmap: buildHeatmap(wishlistItems.length ? wishlistItems : orders, (row) => row.created_at || row.added_at)
      },
      {
        id: 'consumer-discovery-feed',
        kind: 'ticker',
        title: 'Notification Feed',
        description: 'Recent buyer-side notifications and updates.',
        aggregateMode: 'aggregate',
        ticker: notifications
          .slice(0, 8)
          .map((row) => `${titleCase(row.type || 'update')}: ${toText(row.title || row.message, 'Buyer update')}`)
      }
    ]
  };

  return createPayload({
    scopeType: 'consumer',
    scopeId: scope.scopeId,
    pageId,
    range,
    timezone,
    personaLabel: toText(scope.persona?.display_name || scope.persona?.displayName, SCOPE_LABELS.consumer),
    title: page.title,
    subtitle: page.subtitle,
    aggregateFallback: true,
    alerts,
    heroMetrics,
    widgets: widgetsByPage[pageId] || widgetsByPage.overview
  });
};

const buildSellerPage = async ({ scope, pageId, range, timezone, getSellerSnapshot }) => {
  const daysBack = RANGE_TO_DAYS[range] || 30;
  const snapshot = await getSellerSnapshot(scope.scopeId, daysBack, timezone);
  const revenueSeries = toArray(snapshot.revenueTrend).map((entry) => ({ label: toText(entry.label), value: toNumber(entry.value, 0) }));
  const viewsSeries = toArray(snapshot.viewsTrend).map((entry) => ({ label: toText(entry.label), value: toNumber(entry.value, 0) }));
  const unitsSeries = toArray(snapshot.unitsTrend).map((entry) => ({ label: toText(entry.label), value: toNumber(entry.value, 0) }));
  const orderSeries = toArray(snapshot.ordersTrend).map((entry) => ({ label: toText(entry.label), value: toNumber(entry.value, 0) }));
  const currency = toText(snapshot.recentOrders?.[0]?.currency, 'USD');

  const heroMetrics = [
    {
      id: 'revenue',
      label: 'Revenue',
      value: formatCurrency(snapshot.totalRevenue, currency),
      changeText: buildChangeText(snapshot.realtimeMetrics?.[3]?.value, snapshot.realtimeMetrics?.[3]?.value - snapshot.realtimeMetrics?.[3]?.change)
    },
    {
      id: 'views',
      label: 'Views',
      value: formatMetricNumber(snapshot.totalViews),
      changeText: buildChangeText(snapshot.realtimeMetrics?.[0]?.value, snapshot.realtimeMetrics?.[0]?.value - snapshot.realtimeMetrics?.[0]?.change)
    },
    {
      id: 'orders',
      label: 'Orders',
      value: formatMetricNumber(snapshot.totalOrders),
      changeText: buildChangeText(snapshot.realtimeMetrics?.[2]?.value, snapshot.realtimeMetrics?.[2]?.value - snapshot.realtimeMetrics?.[2]?.change)
    },
    {
      id: 'conversion',
      label: 'Conversion',
      value: formatPercent(snapshot.conversionRate, 1),
      changeText: `Cart abandonment ${formatPercent(snapshot.cartAbandonmentRate, 1)}`,
      tone: snapshot.cartAbandonmentRate > 40 ? 'warning' : 'positive'
    }
  ];

  const alerts = [];
  if (toNumber(snapshot.trust?.lowTrustRate, 0) > 12) {
    alerts.push({
      id: 'seller-trust',
      tone: 'warning',
      title: 'Low-trust traffic is rising',
      description: `${formatPercent(snapshot.trust.lowTrustRate, 1)} of tracked seller events are flagged as low trust.`,
      actionLabel: 'Open Intelligence',
      actionHref: '/profile/analytics/seller/intelligence'
    });
  }
  if (toArray(snapshot.anomalies).length > 0) {
    alerts.push({
      id: 'seller-anomalies',
      tone: 'critical',
      title: `${toArray(snapshot.anomalies).length} anomalies detected`,
      description: 'Sales or traffic patterns moved outside the normal band inside the selected range.',
      actionLabel: 'Review Anomalies',
      actionHref: '/profile/analytics/seller/intelligence'
    });
  }
  if (toArray(snapshot.recommendations).length > 0) {
    alerts.push({
      id: 'seller-recommendations',
      tone: 'positive',
      title: `${toArray(snapshot.recommendations).length} recommendations ready`,
      description: 'The analytics engine has surfaced actions to improve conversion or revenue.',
      actionLabel: 'View Recommendations',
      actionHref: '/profile/analytics/seller/intelligence'
    });
  }

  const funnelStages = toArray(snapshot.funnel?.stages).map((stage) => ({
    id: toText(stage.stage).toLowerCase().replace(/\s+/g, '-'),
    label: toText(stage.stage),
    value: toNumber(stage.count, 0),
    percentage: toNumber(stage.percentage, 0)
  }));

  const recentOrdersRows = toArray(snapshot.recentOrders).slice(0, 12).map((row) => ({
    id: toText(row.id),
    status: titleCase(row.status),
    total: formatCurrency(row.total, row.currency || currency),
    items: toNumber(row.itemCount, 0),
    quantity: toNumber(row.quantityTotal, 0),
    createdAt: toText(row.createdAt)
  }));

  const topProductsRows = toArray(snapshot.topProducts || []).map((row) => ({
    ...row,
    revenueLabel: formatCurrency(row.revenue, currency),
    viewsLabel: formatMetricNumber(row.totalViews)
  }));

  const attributionBreakdown = toArray(snapshot.attribution || []).slice(0, 8).map((row, index) => ({
    id: `${toText(row.channel, 'channel')}-${index}`,
    label: `${titleCase(row.channel)} / ${titleCase(row.deviceType || 'unknown')}`,
    value: toNumber(row.views, 0),
    meta: `${formatPercent(row.conversionRate, 1)} conversion`
  }));

  const intelligenceTimeline = buildTimeline(
    toArray(snapshot.anomalies || []).concat(toArray(snapshot.recommendations || [])),
    {
      idGetter: (row) => row.id || row.type || row.title,
      labelGetter: (row) => row.title || row.type || 'Insight',
      timestampGetter: (row) => row.detectedAt || row.generatedAt || snapshot.generatedAt,
      statusGetter: (row) => row.severity || row.priority || row.type || 'info',
      descriptionGetter: (row) => row.summary || row.description || row.message || ''
    }
  );

  const cohortHeatmap = toArray(snapshot.cohorts || []).slice(0, 24).map((row) => ({
    x: `D${toNumber(row.dayOffset, 0)}`,
    y: toText(row.cohortLabel || row.cohort || row.period, 'Cohort'),
    value: toNumber(row.retentionRate || row.retainedUsers || row.users, 0)
  }));

  const page = scopePageMeta('seller', pageId);
  const widgetsByPage = {
    overview: [
      {
        id: 'seller-overview-revenue',
        kind: 'timeseries',
        title: 'Revenue Trend',
        description: 'Revenue generated over the selected range.',
        aggregateMode: 'event',
        series: revenueSeries
      },
      {
        id: 'seller-overview-funnel',
        kind: 'funnel',
        title: 'Commerce Funnel',
        description: 'Track progression from view to completed checkout.',
        aggregateMode: 'event',
        stages: funnelStages
      },
      {
        id: 'seller-overview-products',
        kind: 'leaderboard',
        title: 'Top Products',
        description: 'Products driving the strongest commercial contribution.',
        aggregateMode: 'event',
        leaderboard: topProductsRows.slice(0, 8).map((row) => ({
          id: toText(row.itemId),
          label: toText(row.itemTitle),
          primary: row.revenueLabel,
          secondary: `${formatMetricNumber(row.unitsSold)} units sold`,
          badge: `${formatPercent(row.conversionRate, 1)} CVR`,
          value: toNumber(row.revenue, 0),
          href: `/item/${row.itemId}`
        }))
      },
      {
        id: 'seller-overview-orders',
        kind: 'table',
        title: 'Recent Orders',
        description: 'Latest order flow across the seller persona.',
        aggregateMode: 'event',
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'items', label: 'Items', align: 'center' },
          { key: 'quantity', label: 'Qty', align: 'center' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: recentOrdersRows
      }
    ],
    traffic: [
      {
        id: 'seller-traffic-views',
        kind: 'timeseries',
        title: 'View Trend',
        description: 'Visibility trend across the selected range.',
        aggregateMode: 'event',
        series: viewsSeries
      },
      {
        id: 'seller-traffic-attribution',
        kind: 'donut',
        title: 'Traffic Attribution',
        description: 'Source and device combinations contributing the most views.',
        aggregateMode: 'event',
        breakdown: attributionBreakdown
      },
      {
        id: 'seller-traffic-realtime',
        kind: 'table',
        title: 'Realtime Metrics',
        description: 'Current 24-hour seller momentum compared with the previous 24-hour window.',
        aggregateMode: 'event',
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value', align: 'right' },
          { key: 'changePercent', label: 'Change', align: 'right' },
          { key: 'trend', label: 'Trend', align: 'center' }
        ],
        rows: toArray(snapshot.realtimeMetrics).map((row) => ({
          metric: toText(row.metric),
          value: formatMetricNumber(row.value),
          changePercent: formatPercent(row.changePercent, 1),
          trend: titleCase(row.trend)
        }))
      },
      {
        id: 'seller-traffic-feed',
        kind: 'ticker',
        title: 'Traffic Feed',
        description: 'Live traffic deltas for the seller workspace.',
        aggregateMode: 'event',
        ticker: toArray(snapshot.realtimeMetrics).map((row) => `${toText(row.metric)}: ${formatMetricNumber(row.value)} (${formatPercent(row.changePercent, 1)})`)
      }
    ],
    revenue: [
      {
        id: 'seller-revenue-series',
        kind: 'timeseries',
        title: 'Revenue Series',
        description: 'Gross seller revenue over the selected range.',
        aggregateMode: 'event',
        series: revenueSeries
      },
      {
        id: 'seller-revenue-orders',
        kind: 'bar-list',
        title: 'Order Trend',
        description: 'Order count per period.',
        aggregateMode: 'event',
        series: orderSeries
      },
      {
        id: 'seller-revenue-aov',
        kind: 'stat-list',
        title: 'Revenue Quality',
        description: 'Key seller revenue quality metrics.',
        aggregateMode: 'event',
        breakdown: [
          { id: 'aov', label: 'Average Order Value', value: toNumber(snapshot.averageOrderValue, 0), meta: formatCurrency(snapshot.averageOrderValue, currency) },
          { id: 'completed', label: 'Completed Orders', value: toNumber(snapshot.completedOrders, 0), meta: `${formatPercent(snapshot.conversionRate, 1)} conversion` },
          { id: 'returned', label: 'Returned Orders', value: toNumber(snapshot.returnedOrders, 0), meta: 'Needs monitoring' }
        ]
      },
      {
        id: 'seller-revenue-recent',
        kind: 'table',
        title: 'Revenue Orders',
        description: 'Recent orders contributing to current revenue.',
        aggregateMode: 'event',
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: recentOrdersRows
      }
    ],
    'sales-units': [
      {
        id: 'seller-units-series',
        kind: 'timeseries',
        title: 'Units Sold Trend',
        description: 'Units sold across the selected range.',
        aggregateMode: 'event',
        series: unitsSeries
      },
      {
        id: 'seller-units-products',
        kind: 'leaderboard',
        title: 'Units Leaders',
        description: 'Products leading unit volume.',
        aggregateMode: 'event',
        leaderboard: topProductsRows.slice(0, 8).map((row) => ({
          id: toText(row.itemId),
          label: toText(row.itemTitle),
          primary: formatMetricNumber(row.unitsSold),
          secondary: row.viewsLabel,
          badge: row.revenueLabel,
          value: toNumber(row.unitsSold, 0),
          href: `/item/${row.itemId}`
        }))
      },
      {
        id: 'seller-units-breakdown',
        kind: 'stat-list',
        title: 'Demand Support Metrics',
        description: 'Views, carts, and checkouts supporting unit volume.',
        aggregateMode: 'event',
        breakdown: topProductsRows.slice(0, 6).map((row) => ({
          id: toText(row.itemId),
          label: toText(row.itemTitle),
          value: toNumber(row.totalViews, 0),
          meta: `${formatMetricNumber(row.totalCartAdds)} carts • ${formatMetricNumber(row.totalCheckouts)} checkouts`
        }))
      },
      {
        id: 'seller-units-orders',
        kind: 'table',
        title: 'Recent Orders',
        description: 'Order rows contributing to unit movement.',
        aggregateMode: 'event',
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'quantity', label: 'Qty', align: 'center' },
          { key: 'status', label: 'Status' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: recentOrdersRows
      }
    ],
    conversion: [
      {
        id: 'seller-conversion-funnel',
        kind: 'funnel',
        title: 'Conversion Funnel',
        description: 'View-to-checkout funnel with stage percentages.',
        aggregateMode: 'event',
        stages: funnelStages
      },
      {
        id: 'seller-conversion-attribution',
        kind: 'stat-list',
        title: 'Channel Conversion',
        description: 'Conversion efficiency by source and device.',
        aggregateMode: 'event',
        breakdown: attributionBreakdown
      },
      {
        id: 'seller-conversion-journeys',
        kind: 'leaderboard',
        title: 'Journey Paths',
        description: 'Top successful and drop-off paths seen in the journey model.',
        aggregateMode: 'event',
        leaderboard: toArray(snapshot.journeys?.topSuccessfulPaths || [])
          .slice(0, 4)
          .map((row, index) => ({
            id: `success-${index}`,
            label: toText(row.path || row.label, 'Successful path'),
            primary: formatMetricNumber(row.count || row.value || 0),
            secondary: 'Successful path',
            badge: 'Won',
            value: toNumber(row.count || row.value, 0)
          }))
          .concat(
            toArray(snapshot.journeys?.topDropOffPaths || []).slice(0, 4).map((row, index) => ({
              id: `drop-${index}`,
              label: toText(row.path || row.label, 'Drop-off path'),
              primary: formatMetricNumber(row.count || row.value || 0),
              secondary: 'Drop-off path',
              badge: 'Drop-off',
              value: toNumber(row.count || row.value, 0)
            }))
          )
      },
      {
        id: 'seller-conversion-products',
        kind: 'table',
        title: 'Product Conversion Table',
        description: 'Compare conversion performance across top products.',
        aggregateMode: 'event',
        columns: [
          { key: 'title', label: 'Product' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'checkouts', label: 'Checkouts', align: 'right' },
          { key: 'conversion', label: 'CVR', align: 'right' }
        ],
        rows: topProductsRows.slice(0, 10).map((row) => ({
          id: toText(row.itemId),
          title: toText(row.itemTitle),
          views: formatMetricNumber(row.totalViews),
          checkouts: formatMetricNumber(row.totalCheckouts),
          conversion: formatPercent(row.conversionRate, 1)
        }))
      }
    ],
    products: [
      {
        id: 'seller-products-table',
        kind: 'table',
        title: 'Product Performance',
        description: 'Top products ranked by revenue and view support.',
        aggregateMode: 'event',
        columns: [
          { key: 'title', label: 'Product' },
          { key: 'revenue', label: 'Revenue', align: 'right' },
          { key: 'units', label: 'Units', align: 'right' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'conversion', label: 'CVR', align: 'right' }
        ],
        rows: topProductsRows.slice(0, 12).map((row) => ({
          id: toText(row.itemId),
          title: toText(row.itemTitle),
          revenue: row.revenueLabel,
          units: formatMetricNumber(row.unitsSold),
          views: row.viewsLabel,
          conversion: formatPercent(row.conversionRate, 1)
        }))
      },
      {
        id: 'seller-products-leaders',
        kind: 'leaderboard',
        title: 'Revenue Leaders',
        description: 'Products leading current seller revenue.',
        aggregateMode: 'event',
        leaderboard: topProductsRows.slice(0, 8).map((row) => ({
          id: toText(row.itemId),
          label: toText(row.itemTitle),
          primary: row.revenueLabel,
          secondary: `${formatMetricNumber(row.totalViews)} views`,
          badge: `${formatMetricNumber(row.unitsSold)} units`,
          value: toNumber(row.revenue, 0),
          href: `/item/${row.itemId}`
        }))
      },
      {
        id: 'seller-products-demand',
        kind: 'stat-list',
        title: 'Demand Support',
        description: 'View and cart activity supporting current leaders.',
        aggregateMode: 'event',
        breakdown: topProductsRows.slice(0, 6).map((row) => ({
          id: toText(row.itemId),
          label: toText(row.itemTitle),
          value: toNumber(row.totalCartAdds, 0),
          meta: `${formatMetricNumber(row.totalViews)} views`
        }))
      },
      {
        id: 'seller-products-ticker',
        kind: 'ticker',
        title: 'Product Feed',
        description: 'High-signal product movements.',
        aggregateMode: 'event',
        ticker: topProductsRows.slice(0, 8).map((row) => `${toText(row.itemTitle)} is converting at ${formatPercent(row.conversionRate, 1)} with ${row.revenueLabel} revenue`)
      }
    ],
    intelligence: [
      {
        id: 'seller-intelligence-recommendations',
        kind: 'leaderboard',
        title: 'Recommendations',
        description: 'Highest-priority actions from the analytics engine.',
        aggregateMode: 'event',
        leaderboard: toArray(snapshot.recommendations || []).slice(0, 8).map((row, index) => ({
          id: toText(row.id || `rec-${index}`),
          label: toText(row.title || row.headline || row.type, 'Recommendation'),
          primary: formatMetricNumber(row.score || row.priority || 0),
          secondary: toText(row.summary || row.description),
          badge: titleCase(row.type || 'Action'),
          value: toNumber(row.score || row.priority, 0)
        }))
      },
      {
        id: 'seller-intelligence-timeline',
        kind: 'timeline',
        title: 'Anomalies & Actions',
        description: 'Latest anomalies and recommendation activity.',
        aggregateMode: 'event',
        timeline: intelligenceTimeline
      },
      {
        id: 'seller-intelligence-cohorts',
        kind: 'heatmap',
        title: 'Cohort Retention',
        description: 'Snapshot of seller cohort retention output.',
        aggregateMode: 'event',
        heatmap: cohortHeatmap
      },
      {
        id: 'seller-intelligence-trust',
        kind: 'stat-list',
        title: 'Trust Signals',
        description: 'Quality and risk signals affecting seller analytics reliability.',
        aggregateMode: 'event',
        breakdown: [
          { id: 'trusted', label: 'Trusted Events', value: toNumber(snapshot.trust?.trustedEvents, 0), meta: `${formatPercent(snapshot.trust?.lowTrustRate, 1)} low trust rate` },
          { id: 'high', label: 'High Trust', value: toNumber(snapshot.trust?.highTrust, 0) },
          { id: 'medium', label: 'Medium Trust', value: toNumber(snapshot.trust?.mediumTrust, 0) },
          { id: 'low', label: 'Low Trust', value: toNumber(snapshot.trust?.lowTrust, 0) }
        ]
      }
    ]
  };

  return createPayload({
    scopeType: 'seller',
    scopeId: scope.scopeId,
    pageId,
    range,
    timezone,
    personaLabel: toText(scope.persona?.display_name || scope.persona?.displayName, SCOPE_LABELS.seller),
    title: page.title,
    subtitle: page.subtitle,
    alerts,
    heroMetrics,
    widgets: widgetsByPage[pageId] || widgetsByPage.overview
  });
};

const buildProviderPage = async ({ supabase, scope, pageId, range, timezone }) => {
  const userId = toText(scope.user?.id);
  const requests = await fetchRowsWithFallbacks(
    supabase,
    'work_requests',
    [
      (query) => query.eq('target_provider_id', userId),
      (query) => query.eq('target_provider_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );
  const proposals = await fetchRowsWithFallbacks(
    supabase,
    'work_proposals',
    [
      (query) => query.eq('provider_id', userId),
      (query) => query.eq('provider_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );
  const contracts = await fetchRowsWithFallbacks(
    supabase,
    'work_contracts',
    [
      (query) => query.eq('provider_id', userId),
      (query) => query.eq('provider_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );
  const engagements = await fetchRowsWithFallbacks(
    supabase,
    'work_engagements',
    [
      (query) => query.eq('provider_id', userId),
      (query) => query.eq('provider_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );

  const clientIds = unique(
    requests.map((row) => row.requester_id)
      .concat(proposals.map((row) => row.client_id))
      .concat(contracts.map((row) => row.client_id))
  );
  const usersMap = await loadUsersMap(supabase, clientIds);

  const requestSeries = accumulateSeries(requests, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.created_at || row.updated_at,
    valueGetter: () => 1
  });
  const earningsSeries = accumulateSeries(contracts, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.updated_at || row.created_at,
    valueGetter: (row) => row.total_amount || row.totalAmount || row.price_total || row.priceTotal
  });

  const totalEarnings = sum(
    contracts.map((row) => row.total_amount || row.totalAmount || row.price_total || row.priceTotal)
      .concat(engagements.map((row) => row.amount || row.total_amount || row.totalAmount))
  );
  const activeContracts = contracts.filter((row) => ACTIVE_CONTRACT_STATUSES.has(toText(row.status).toLowerCase()));
  const completedContracts = contracts.filter((row) => COMPLETED_CONTRACT_STATUSES.has(toText(row.status).toLowerCase()));
  const acceptedProposals = proposals.filter((row) => toText(row.status).toLowerCase() === 'accepted');
  const winRate = proposals.length > 0 ? (acceptedProposals.length / proposals.length) * 100 : 0;
  const openRequests = requests.filter((row) => toText(row.status).toLowerCase() === 'open').length;

  const alerts = [];
  if (openRequests > 0) {
    alerts.push({
      id: 'provider-open-requests',
      tone: 'info',
      title: `${openRequests} open client requests`,
      description: 'There are unworked client requests waiting in the provider pipeline.',
      actionLabel: 'Open Pipeline',
      actionHref: '/profile/analytics/provider/pipeline'
    });
  }
  if (contracts.some((row) => toText(row.status).toLowerCase() === 'disputed')) {
    alerts.push({
      id: 'provider-disputes',
      tone: 'critical',
      title: 'Contract disputes need review',
      description: 'At least one provider contract is marked disputed.',
      actionLabel: 'Open Clients',
      actionHref: '/profile/analytics/provider/clients'
    });
  }

  const heroMetrics = [
    { id: 'requests', label: 'Pipeline Requests', value: formatMetricNumber(requests.length) },
    { id: 'contracts', label: 'Active Contracts', value: formatMetricNumber(activeContracts.length) },
    { id: 'win-rate', label: 'Proposal Win Rate', value: formatPercent(winRate, 1) },
    { id: 'earnings', label: 'Earnings', value: formatCurrency(totalEarnings, 'USD') }
  ];

  const clientRevenueMap = new Map();
  contracts.forEach((row) => {
    const clientId = toText(row.client_id);
    clientRevenueMap.set(clientId, (clientRevenueMap.get(clientId) || 0) + toNumber(row.total_amount || row.totalAmount || row.price_total || row.priceTotal, 0));
  });

  const clientLeaderboard = Array.from(clientRevenueMap.entries()).map(([clientId, value]) => ({
    id: clientId,
    label: toText(usersMap.get(clientId)?.name, 'Client'),
    primary: formatCurrency(value, 'USD'),
    secondary: clientId,
    value
  }));

  const page = scopePageMeta('provider', pageId);
  const widgetsByPage = {
    overview: [
      {
        id: 'provider-overview-pipeline',
        kind: 'timeseries',
        title: 'Request Pipeline',
        description: 'Requests entering the provider funnel over time.',
        aggregateMode: 'aggregate',
        series: requestSeries
      },
      {
        id: 'provider-overview-funnel',
        kind: 'funnel',
        title: 'Provider Funnel',
        description: 'Request, proposal, contract, and completion flow.',
        aggregateMode: 'aggregate',
        stages: [
          { id: 'requests', label: 'Requests', value: requests.length, percentage: 100 },
          { id: 'proposals', label: 'Proposals', value: proposals.length, percentage: requests.length ? (proposals.length / requests.length) * 100 : 0 },
          { id: 'contracts', label: 'Contracts', value: contracts.length, percentage: requests.length ? (contracts.length / requests.length) * 100 : 0 },
          { id: 'completed', label: 'Completed', value: completedContracts.length, percentage: requests.length ? (completedContracts.length / requests.length) * 100 : 0 }
        ]
      },
      {
        id: 'provider-overview-timeline',
        kind: 'timeline',
        title: 'Recent Work Activity',
        description: 'Latest requests, proposals, and contract updates.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(requests.concat(contracts).concat(proposals), {
          idGetter: (row) => row.id,
          labelGetter: (row) => row.title || row.brief || 'Work activity',
          timestampGetter: (row) => row.updated_at || row.created_at,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => row.cover_letter || row.description || row.brief || ''
        })
      },
      {
        id: 'provider-overview-clients',
        kind: 'leaderboard',
        title: 'Top Clients',
        description: 'Clients driving the strongest contract value.',
        aggregateMode: 'aggregate',
        leaderboard: clientLeaderboard.slice(0, 8)
      }
    ],
    pipeline: [
      {
        id: 'provider-pipeline-status',
        kind: 'donut',
        title: 'Request Status Mix',
        description: 'Open versus in-progress pipeline pressure.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(requests, (row) => row.status)
      },
      {
        id: 'provider-pipeline-requests',
        kind: 'table',
        title: 'Request Queue',
        description: 'Most recent provider-facing requests.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'title', label: 'Request' },
          { key: 'status', label: 'Status' },
          { key: 'budget', label: 'Budget', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: requests.slice(0, 12).map((row) => ({
          id: toText(row.id),
          title: toText(row.title || row.brief, 'Client request'),
          status: titleCase(row.status),
          budget: formatCurrency(row.budget_max || row.budgetMax || row.budget_min || row.budgetMin, row.currency || 'USD'),
          createdAt: toText(row.created_at)
        }))
      },
      {
        id: 'provider-pipeline-proposals',
        kind: 'leaderboard',
        title: 'Proposal Queue',
        description: 'Recent proposals sorted by commercial value.',
        aggregateMode: 'aggregate',
        leaderboard: buildLeaderboard(proposals, {
          idGetter: (row) => row.id,
          labelGetter: (row) => row.title || 'Proposal',
          primaryGetter: (row) => formatCurrency(row.price_total || row.priceTotal, row.currency || 'USD'),
          secondaryGetter: (row) => titleCase(row.status),
          badgeGetter: (row) => `${toNumber(row.delivery_days || row.deliveryDays, 0)}d`,
          valueGetter: (row) => row.price_total || row.priceTotal
        })
      },
      {
        id: 'provider-pipeline-feed',
        kind: 'ticker',
        title: 'Pipeline Feed',
        description: 'Recent provider-side request and proposal movements.',
        aggregateMode: 'aggregate',
        ticker: requests
          .slice(0, 4)
          .map((row) => `${toText(row.title || 'Request')} is ${titleCase(row.status)}`)
          .concat(proposals.slice(0, 4).map((row) => `${toText(row.title || 'Proposal')} is ${titleCase(row.status)}`))
      }
    ],
    earnings: [
      {
        id: 'provider-earnings-series',
        kind: 'timeseries',
        title: 'Contract Earnings',
        description: 'Value recognized across provider contracts.',
        aggregateMode: 'aggregate',
        series: earningsSeries
      },
      {
        id: 'provider-earnings-clients',
        kind: 'leaderboard',
        title: 'Top Revenue Clients',
        description: 'Clients contributing the most provider earnings.',
        aggregateMode: 'aggregate',
        leaderboard: clientLeaderboard.slice(0, 8)
      },
      {
        id: 'provider-earnings-status',
        kind: 'stat-list',
        title: 'Contract Status Revenue',
        description: 'Revenue split by contract status.',
        aggregateMode: 'aggregate',
        breakdown: buildValueBreakdown(
          contracts,
          (row) => titleCase(row.status),
          (row) => row.total_amount || row.totalAmount || row.price_total || row.priceTotal
        )
      },
      {
        id: 'provider-earnings-table',
        kind: 'table',
        title: 'Recent Contracts',
        description: 'Latest contracts and their current value.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'client', label: 'Client' },
          { key: 'status', label: 'Status' },
          { key: 'value', label: 'Value', align: 'right' },
          { key: 'updatedAt', label: 'Updated' }
        ],
        rows: contracts.slice(0, 12).map((row) => ({
          id: toText(row.id),
          client: toText(usersMap.get(toText(row.client_id))?.name, 'Client'),
          status: titleCase(row.status),
          value: formatCurrency(row.total_amount || row.totalAmount || row.price_total || row.priceTotal, row.currency || 'USD'),
          updatedAt: toText(row.updated_at || row.created_at)
        }))
      }
    ],
    clients: [
      {
        id: 'provider-clients-board',
        kind: 'leaderboard',
        title: 'Client Value Board',
        description: 'Clients ranked by current contract value.',
        aggregateMode: 'aggregate',
        leaderboard: clientLeaderboard.slice(0, 10)
      },
      {
        id: 'provider-clients-table',
        kind: 'table',
        title: 'Client Book',
        description: 'Client activity across requests and contracts.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'client', label: 'Client' },
          { key: 'requests', label: 'Requests', align: 'right' },
          { key: 'contracts', label: 'Contracts', align: 'right' },
          { key: 'revenue', label: 'Revenue', align: 'right' }
        ],
        rows: clientIds.slice(0, 12).map((clientId) => ({
          id: clientId,
          client: toText(usersMap.get(clientId)?.name, 'Client'),
          requests: requests.filter((row) => toText(row.requester_id) === clientId).length,
          contracts: contracts.filter((row) => toText(row.client_id) === clientId).length,
          revenue: formatCurrency(clientRevenueMap.get(clientId) || 0, 'USD')
        }))
      },
      {
        id: 'provider-clients-timeline',
        kind: 'timeline',
        title: 'Client Activity Timeline',
        description: 'Latest client-side touchpoints and contract updates.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(contracts.concat(requests), {
          idGetter: (row) => row.id,
          labelGetter: (row) => toText(usersMap.get(toText(row.client_id || row.requester_id))?.name, 'Client'),
          timestampGetter: (row) => row.updated_at || row.created_at,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => row.title || row.brief || 'Client activity'
        })
      },
      {
        id: 'provider-clients-heatmap',
        kind: 'heatmap',
        title: 'Client Timing Heatmap',
        description: 'When client-side activity tends to hit the pipeline.',
        aggregateMode: 'aggregate',
        heatmap: buildHeatmap(requests.length ? requests : contracts, (row) => row.created_at || row.updated_at)
      }
    ]
  };

  return createPayload({
    scopeType: 'provider',
    scopeId: scope.scopeId,
    pageId,
    range,
    timezone,
    personaLabel: toText(scope.persona?.display_name || scope.persona?.displayName, SCOPE_LABELS.provider),
    title: page.title,
    subtitle: page.subtitle,
    aggregateFallback: true,
    alerts,
    heroMetrics,
    widgets: widgetsByPage[pageId] || widgetsByPage.overview
  });
};

const buildAffiliatePage = async ({ supabase, scope, pageId, range, timezone }) => {
  const userId = toText(scope.user?.id);
  const linkRows = await fetchRowsWithFallbacks(
    supabase,
    'affiliate_links',
    [
      (query) => query.eq('user_id', userId),
      (query) => query.eq('affiliate_user_id', userId),
      (query) => query.eq('affiliate_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );
  const conversionRows = await fetchRowsWithFallbacks(
    supabase,
    'affiliate_conversions',
    [
      (query) => query.eq('user_id', userId),
      (query) => query.eq('affiliate_user_id', userId),
      (query) => query.eq('affiliate_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );
  const payoutRows = await fetchRowsWithFallbacks(
    supabase,
    'affiliate_payouts',
    [
      (query) => query.eq('user_id', userId),
      (query) => query.eq('affiliate_user_id', userId),
      (query) => query.eq('affiliate_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );
  const attributionRows = await fetchRowsWithFallbacks(
    supabase,
    'affiliate_attributions',
    [
      (query) => query.eq('user_id', userId),
      (query) => query.eq('affiliate_user_id', userId),
      (query) => query.eq('affiliate_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1000 }
  );

  const totalClicks = sum(linkRows.map((row) => row.clicks).concat(attributionRows.map((row) => row.clicks || row.click_count)));
  const totalConversions = conversionRows.length || sum(attributionRows.map((row) => row.conversions || row.conversion_count));
  const totalCommissions = sum(conversionRows.map((row) => row.commission_amount || row.amount).concat(payoutRows.map((row) => row.amount || 0)));
  const pendingPayouts = sum(
    payoutRows
      .filter((row) => PENDING_PAYOUT_STATUSES.has(toText(row.status).toLowerCase()))
      .map((row) => row.amount)
  );

  const trafficSeries = accumulateSeries(conversionRows.length ? conversionRows : attributionRows, {
    range,
    timeZone: timezone,
    timestampGetter: (row) => row.created_at || row.updated_at,
    valueGetter: (row) => row.clicks || row.click_count || row.commission_amount || row.amount || 1
  });

  const campaignBreakdown = buildValueBreakdown(
    linkRows.length ? linkRows : conversionRows,
    (row) => row.campaign_name || row.campaign || row.title || row.code || 'Campaign',
    (row) => row.clicks || row.click_count || row.commission_amount || row.amount || 1
  );
  const payoutStatusBreakdown = buildStatusBreakdown(payoutRows, (row) => row.status);
  const attributionBreakdown = buildValueBreakdown(
    attributionRows,
    (row) => row.source || row.channel || row.platform || 'Direct',
    (row) => row.clicks || row.click_count || 1
  );

  const alerts = [];
  if (!linkRows.length && !conversionRows.length && !payoutRows.length) {
    alerts.push({
      id: 'affiliate-empty',
      tone: 'info',
      title: 'Affiliate analytics will populate as live data arrives',
      description: 'No linked clicks, conversions, or payouts are stored for this affiliate persona yet.',
      actionLabel: 'Open Affiliate Center',
      actionHref: '/profile/affiliate'
    });
  }
  if (pendingPayouts > 0) {
    alerts.push({
      id: 'affiliate-pending',
      tone: 'warning',
      title: 'Payouts are pending review',
      description: `${formatCurrency(pendingPayouts, 'USD')} is waiting in the affiliate payout queue.`,
      actionLabel: 'View Payouts',
      actionHref: '/profile/analytics/affiliate/payouts'
    });
  }

  const heroMetrics = [
    { id: 'clicks', label: 'Clicks', value: formatMetricNumber(totalClicks) },
    { id: 'conversions', label: 'Conversions', value: formatMetricNumber(totalConversions) },
    { id: 'commissions', label: 'Commissions', value: formatCurrency(totalCommissions, 'USD') },
    { id: 'pending', label: 'Pending Payouts', value: formatCurrency(pendingPayouts, 'USD') }
  ];

  const page = scopePageMeta('affiliate', pageId);
  const widgetsByPage = {
    overview: [
      {
        id: 'affiliate-overview-series',
        kind: 'timeseries',
        title: 'Referral Momentum',
        description: 'Live referral throughput across clicks, conversions, or commissions.',
        aggregateMode: 'aggregate',
        series: trafficSeries
      },
      {
        id: 'affiliate-overview-campaigns',
        kind: 'stat-list',
        title: 'Campaign Mix',
        description: 'Campaigns or links contributing the most measurable activity.',
        aggregateMode: 'aggregate',
        breakdown: campaignBreakdown
      },
      {
        id: 'affiliate-overview-conversions',
        kind: 'table',
        title: 'Recent Conversions',
        description: 'Latest affiliate conversion rows.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'label', label: 'Conversion' },
          { key: 'status', label: 'Status' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: conversionRows.slice(0, 12).map((row) => ({
          id: toText(row.id),
          label: toText(row.campaign_name || row.campaign || row.code || 'Conversion'),
          status: titleCase(row.status || 'approved'),
          amount: formatCurrency(row.commission_amount || row.amount, row.currency || 'USD'),
          createdAt: toText(row.created_at || row.updated_at)
        }))
      },
      {
        id: 'affiliate-overview-feed',
        kind: 'ticker',
        title: 'Affiliate Feed',
        description: 'Recent campaign and payout updates.',
        aggregateMode: 'aggregate',
        ticker: conversionRows
          .slice(0, 4)
          .map((row) => `${toText(row.campaign_name || row.code || 'Conversion')} recorded ${formatCurrency(row.commission_amount || row.amount, row.currency || 'USD')}`)
          .concat(payoutRows.slice(0, 4).map((row) => `Payout ${toText(row.id)} is ${titleCase(row.status)}`))
      }
    ],
    traffic: [
      {
        id: 'affiliate-traffic-series',
        kind: 'timeseries',
        title: 'Traffic Series',
        description: 'Live click and attribution activity.',
        aggregateMode: 'aggregate',
        series: trafficSeries
      },
      {
        id: 'affiliate-traffic-board',
        kind: 'leaderboard',
        title: 'Top Links & Sources',
        description: 'Referral sources ranked by clicks.',
        aggregateMode: 'aggregate',
        leaderboard: attributionBreakdown.map((entry) => ({
          id: entry.id,
          label: entry.label,
          primary: formatMetricNumber(entry.value),
          secondary: 'Clicks',
          value: entry.value
        }))
      },
      {
        id: 'affiliate-traffic-heatmap',
        kind: 'heatmap',
        title: 'Referral Timing',
        description: 'When affiliate traffic tends to land.',
        aggregateMode: 'aggregate',
        heatmap: buildHeatmap(attributionRows.length ? attributionRows : linkRows, (row) => row.created_at || row.updated_at)
      },
      {
        id: 'affiliate-traffic-table',
        kind: 'table',
        title: 'Referral Rows',
        description: 'Recent clicks and attribution rows.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'campaign', label: 'Campaign' },
          { key: 'source', label: 'Source' },
          { key: 'clicks', label: 'Clicks', align: 'right' },
          { key: 'updatedAt', label: 'Updated' }
        ],
        rows: attributionRows.slice(0, 12).map((row) => ({
          id: toText(row.id),
          campaign: toText(row.campaign_name || row.campaign || 'Campaign'),
          source: titleCase(row.source || row.channel || row.platform || 'Direct'),
          clicks: formatMetricNumber(row.clicks || row.click_count || 0),
          updatedAt: toText(row.updated_at || row.created_at)
        }))
      }
    ],
    campaigns: [
      {
        id: 'affiliate-campaigns-bar',
        kind: 'bar-list',
        title: 'Campaign Output',
        description: 'Campaigns ranked by clicks or commissions.',
        aggregateMode: 'aggregate',
        breakdown: campaignBreakdown
      },
      {
        id: 'affiliate-campaigns-links',
        kind: 'table',
        title: 'Link Inventory',
        description: 'Tracked affiliate links and their current volume.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'campaign', label: 'Campaign' },
          { key: 'shortCode', label: 'Code' },
          { key: 'clicks', label: 'Clicks', align: 'right' },
          { key: 'updatedAt', label: 'Updated' }
        ],
        rows: linkRows.slice(0, 12).map((row) => ({
          id: toText(row.id),
          campaign: toText(row.campaign_name || row.campaign || row.title || 'Campaign'),
          shortCode: toText(row.short_code || row.code || row.slug),
          clicks: formatMetricNumber(row.clicks || row.click_count || 0),
          updatedAt: toText(row.updated_at || row.created_at)
        }))
      },
      {
        id: 'affiliate-campaigns-sources',
        kind: 'donut',
        title: 'Attribution Sources',
        description: 'Source mix contributing to campaign traffic.',
        aggregateMode: 'aggregate',
        breakdown: attributionBreakdown
      },
      {
        id: 'affiliate-campaigns-feed',
        kind: 'ticker',
        title: 'Campaign Feed',
        description: 'Recent campaign and link updates.',
        aggregateMode: 'aggregate',
        ticker: linkRows.slice(0, 8).map((row) => `${toText(row.campaign_name || row.code || 'Campaign')} has ${formatMetricNumber(row.clicks || row.click_count || 0)} clicks`)
      }
    ],
    payouts: [
      {
        id: 'affiliate-payouts-series',
        kind: 'timeseries',
        title: 'Payout Flow',
        description: 'Tracked affiliate payout amounts over time.',
        aggregateMode: 'aggregate',
        series: accumulateSeries(payoutRows, {
          range,
          timeZone: timezone,
          timestampGetter: (row) => row.created_at || row.updated_at,
          valueGetter: (row) => row.amount
        })
      },
      {
        id: 'affiliate-payouts-status',
        kind: 'donut',
        title: 'Payout Status Mix',
        description: 'Status split for affiliate payout rows.',
        aggregateMode: 'aggregate',
        breakdown: payoutStatusBreakdown
      },
      {
        id: 'affiliate-payouts-table',
        kind: 'table',
        title: 'Recent Payouts',
        description: 'Latest affiliate payout rows.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Payout' },
          { key: 'status', label: 'Status' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: payoutRows.slice(0, 12).map((row) => ({
          id: toText(row.id),
          status: titleCase(row.status),
          amount: formatCurrency(row.amount, row.currency || 'USD'),
          createdAt: toText(row.created_at || row.updated_at)
        }))
      },
      {
        id: 'affiliate-payouts-support',
        kind: 'stat-list',
        title: 'Commission Support',
        description: 'How payouts are supported by campaign contribution.',
        aggregateMode: 'aggregate',
        breakdown: campaignBreakdown
      }
    ]
  };

  return createPayload({
    scopeType: 'affiliate',
    scopeId: scope.scopeId,
    pageId,
    range,
    timezone,
    personaLabel: toText(scope.persona?.display_name || scope.persona?.displayName, SCOPE_LABELS.affiliate),
    title: page.title,
    subtitle: page.subtitle,
    aggregateFallback: true,
    alerts,
    heroMetrics,
    widgets: widgetsByPage[pageId] || widgetsByPage.overview
  });
};

const buildShipperPage = async ({ supabase, scope, pageId, range, timezone }) => {
  const userId = toText(scope.user?.id);
  let shipments = await fetchRowsWithFallbacks(
    supabase,
    'shipments',
    [
      (query) => query.eq('shipper_id', userId),
      (query) => query.eq('shipper_persona_id', scope.scopeId)
    ],
    { orderKey: 'updated_at', limit: 1500 }
  );
  if (!shipments.length) {
    shipments = await fetchRowsSafe(supabase, 'shipments', { orderKey: 'updated_at', limit: 1500 });
  }

  const orderIds = unique(shipments.map((row) => row.order_id));
  const orders = orderIds.length
    ? await fetchRowsSafe(supabase, 'orders', {
        apply: (query) => query.in('id', orderIds),
        orderKey: 'updated_at',
        limit: 1500
      })
    : [];
  const orderMap = new Map(orders.map((row) => [toText(row.id), row]));
  const addressMap = await loadAddressesMap(
    supabase,
    orders.map((row) => row.shipping_address_id)
  );

  const activeShipments = shipments.filter((row) => ACTIVE_SHIPMENT_STATUSES.has(toText(row.status).toLowerCase()));
  const delayedShipments = shipments.filter((row) => {
    const status = toText(row.status).toLowerCase();
    const eta = toDate(row.estimated_delivery || row.eta);
    return (SHIPMENT_EXCEPTION_STATUSES.has(status) || (eta && eta.getTime() < Date.now() && status !== 'delivered' && status !== 'cancelled'));
  });
  const deliveredToday = shipments.filter((row) => {
    const status = toText(row.status).toLowerCase();
    if (status !== 'delivered') return false;
    const deliveredAt = toDate(row.delivered_at || row.updated_at);
    if (!deliveredAt) return false;
    const now = new Date();
    return deliveredAt.getFullYear() === now.getFullYear() && deliveredAt.getMonth() === now.getMonth() && deliveredAt.getDate() === now.getDate();
  }).length;
  const onTimeDelivered = shipments.filter((row) => {
    const deliveredAt = toDate(row.delivered_at || row.updated_at);
    const eta = toDate(row.estimated_delivery || row.eta);
    return deliveredAt && eta && deliveredAt.getTime() <= eta.getTime();
  }).length;
  const deliveredCount = shipments.filter((row) => toText(row.status).toLowerCase() === 'delivered').length;
  const onTimeRate = deliveredCount > 0 ? (onTimeDelivered / deliveredCount) * 100 : 0;

  const alerts = [];
  if (delayedShipments.length > 0) {
    alerts.push({
      id: 'shipper-delays',
      tone: 'critical',
      title: `${delayedShipments.length} delayed or exception shipments`,
      description: 'Shipment records are late or already flagged into an exception state.',
      actionLabel: 'Open Exceptions',
      actionHref: '/profile/analytics/shipper/exceptions'
    });
  }

  const heroMetrics = [
    { id: 'active', label: 'Active Shipments', value: formatMetricNumber(activeShipments.length) },
    { id: 'on-time', label: 'On-Time Rate', value: formatPercent(onTimeRate, 1) },
    { id: 'delayed', label: 'Delayed', value: formatMetricNumber(delayedShipments.length) },
    { id: 'delivered', label: 'Delivered Today', value: formatMetricNumber(deliveredToday) }
  ];

  const carrierBreakdown = buildValueBreakdown(
    shipments,
    (row) => row.carrier || 'Unassigned',
    () => 1
  );
  const regionBreakdown = buildValueBreakdown(
    shipments,
    (row) => {
      const order = orderMap.get(toText(row.order_id));
      const address = addressMap.get(toText(order?.shipping_address_id));
      return address?.city || address?.country || 'Unspecified';
    },
    () => 1
  );

  const page = scopePageMeta('shipper', pageId);
  const widgetsByPage = {
    overview: [
      {
        id: 'shipper-overview-series',
        kind: 'timeseries',
        title: 'Shipment Flow',
        description: 'Shipment records entering or updating across the selected range.',
        aggregateMode: 'aggregate',
        series: accumulateSeries(shipments, {
          range,
          timeZone: timezone,
          timestampGetter: (row) => row.updated_at || row.created_at,
          valueGetter: () => 1
        })
      },
      {
        id: 'shipper-overview-status',
        kind: 'donut',
        title: 'Shipment Status Mix',
        description: 'Operational shipment mix by current status.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(shipments, (row) => row.status)
      },
      {
        id: 'shipper-overview-timeline',
        kind: 'timeline',
        title: 'Shipment Timeline',
        description: 'Latest shipment updates across the network.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(shipments, {
          idGetter: (row) => row.id,
          labelGetter: (row) => `${titleCase(row.status)} shipment`,
          timestampGetter: (row) => row.updated_at || row.created_at,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => {
            const order = orderMap.get(toText(row.order_id));
            const address = addressMap.get(toText(order?.shipping_address_id));
            return `${toText(row.carrier, 'Carrier')} to ${toText(address?.city || address?.country, 'destination')}`;
          }
        })
      },
      {
        id: 'shipper-overview-table',
        kind: 'table',
        title: 'Active Shipments',
        description: 'Current active shipment queue.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'shipment', label: 'Shipment' },
          { key: 'carrier', label: 'Carrier' },
          { key: 'status', label: 'Status' },
          { key: 'eta', label: 'ETA' }
        ],
        rows: activeShipments.slice(0, 12).map((row) => ({
          id: toText(row.id),
          shipment: toText(row.id),
          carrier: toText(row.carrier, 'Carrier'),
          status: titleCase(row.status),
          eta: toText(row.estimated_delivery || row.eta || row.updated_at)
        }))
      }
    ],
    sla: [
      {
        id: 'shipper-sla-carriers',
        kind: 'stat-list',
        title: 'Carrier SLA Score',
        description: 'Shipment volume by carrier to support SLA comparisons.',
        aggregateMode: 'aggregate',
        breakdown: carrierBreakdown
      },
      {
        id: 'shipper-sla-series',
        kind: 'timeseries',
        title: 'Delivery Pressure',
        description: 'Delayed shipment volume across the selected range.',
        aggregateMode: 'aggregate',
        series: accumulateSeries(delayedShipments, {
          range,
          timeZone: timezone,
          timestampGetter: (row) => row.updated_at || row.created_at,
          valueGetter: () => 1
        })
      },
      {
        id: 'shipper-sla-table',
        kind: 'table',
        title: 'Delayed Shipments',
        description: 'Shipments currently late or flagged.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'shipment', label: 'Shipment' },
          { key: 'carrier', label: 'Carrier' },
          { key: 'status', label: 'Status' },
          { key: 'eta', label: 'ETA' }
        ],
        rows: delayedShipments.slice(0, 12).map((row) => ({
          id: toText(row.id),
          shipment: toText(row.id),
          carrier: toText(row.carrier, 'Carrier'),
          status: titleCase(row.status),
          eta: toText(row.estimated_delivery || row.eta || row.updated_at)
        }))
      },
      {
        id: 'shipper-sla-feed',
        kind: 'ticker',
        title: 'SLA Feed',
        description: 'Latest exception and delivery completions.',
        aggregateMode: 'aggregate',
        ticker: delayedShipments
          .slice(0, 4)
          .map((row) => `${toText(row.id)} is ${titleCase(row.status)} with ${toText(row.carrier, 'carrier')}`)
          .concat(shipments.slice(0, 4).map((row) => `${toText(row.id)} updated to ${titleCase(row.status)}`))
      }
    ],
    regions: [
      {
        id: 'shipper-regions-bar',
        kind: 'bar-list',
        title: 'Region Throughput',
        description: 'Shipment count by city or region.',
        aggregateMode: 'aggregate',
        breakdown: regionBreakdown
      },
      {
        id: 'shipper-regions-carriers',
        kind: 'donut',
        title: 'Carrier Mix',
        description: 'Carrier split across tracked shipments.',
        aggregateMode: 'aggregate',
        breakdown: carrierBreakdown
      },
      {
        id: 'shipper-regions-heatmap',
        kind: 'heatmap',
        title: 'Route Timing',
        description: 'When shipment events tend to update.',
        aggregateMode: 'aggregate',
        heatmap: buildHeatmap(shipments, (row) => row.updated_at || row.created_at)
      },
      {
        id: 'shipper-regions-table',
        kind: 'table',
        title: 'Regional Queue',
        description: 'Regional destinations for the current shipment set.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'shipment', label: 'Shipment' },
          { key: 'region', label: 'Region' },
          { key: 'carrier', label: 'Carrier' },
          { key: 'status', label: 'Status' }
        ],
        rows: shipments.slice(0, 12).map((row) => {
          const order = orderMap.get(toText(row.order_id));
          const address = addressMap.get(toText(order?.shipping_address_id));
          return {
            id: toText(row.id),
            shipment: toText(row.id),
            region: toText(address?.city || address?.country, 'Unspecified'),
            carrier: toText(row.carrier, 'Carrier'),
            status: titleCase(row.status)
          };
        })
      }
    ],
    exceptions: [
      {
        id: 'shipper-exceptions-table',
        kind: 'table',
        title: 'Exception Queue',
        description: 'Shipments in a delayed or exception state.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'shipment', label: 'Shipment' },
          { key: 'status', label: 'Status' },
          { key: 'carrier', label: 'Carrier' },
          { key: 'eta', label: 'ETA' }
        ],
        rows: delayedShipments.slice(0, 12).map((row) => ({
          id: toText(row.id),
          shipment: toText(row.id),
          status: titleCase(row.status),
          carrier: toText(row.carrier, 'Carrier'),
          eta: toText(row.estimated_delivery || row.eta || row.updated_at)
        }))
      },
      {
        id: 'shipper-exceptions-timeline',
        kind: 'timeline',
        title: 'Exception Timeline',
        description: 'Recent delayed and exception shipment updates.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(delayedShipments, {
          idGetter: (row) => row.id,
          labelGetter: (row) => toText(row.id, 'Shipment'),
          timestampGetter: (row) => row.updated_at || row.created_at,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => `${toText(row.carrier, 'Carrier')} needs intervention`
        })
      },
      {
        id: 'shipper-exceptions-support',
        kind: 'stat-list',
        title: 'Exception Support',
        description: 'Where exception volume is concentrating.',
        aggregateMode: 'aggregate',
        breakdown: carrierBreakdown
      },
      {
        id: 'shipper-exceptions-feed',
        kind: 'ticker',
        title: 'Exception Feed',
        description: 'Latest critical shipment updates.',
        aggregateMode: 'aggregate',
        ticker: delayedShipments.slice(0, 8).map((row) => `${toText(row.id)} is ${titleCase(row.status)} via ${toText(row.carrier, 'carrier')}`)
      }
    ]
  };

  return createPayload({
    scopeType: 'shipper',
    scopeId: scope.scopeId,
    pageId,
    range,
    timezone,
    personaLabel: toText(scope.persona?.display_name || scope.persona?.displayName, SCOPE_LABELS.shipper),
    title: page.title,
    subtitle: page.subtitle,
    aggregateFallback: true,
    alerts,
    heroMetrics,
    widgets: widgetsByPage[pageId] || widgetsByPage.overview
  });
};

const buildAdminPage = async ({ supabase, scope, pageId, range, timezone }) => {
  const [orders, payouts, disputes, flags, personas, shipments, workContracts, uploads] = await Promise.all([
    fetchRowsSafe(supabase, 'orders', { orderKey: 'created_at', limit: 5000 }),
    fetchRowsSafe(supabase, 'payouts', { orderKey: 'created_at', limit: 2000 }),
    fetchRowsSafe(supabase, 'commerce_disputes', { orderKey: 'created_at', limit: 2000 }),
    fetchRowsSafe(supabase, 'moderation_flags', { orderKey: 'created_at', limit: 2000 }),
    fetchRowsSafe(supabase, 'personas', { orderKey: 'created_at', limit: 5000 }),
    fetchRowsSafe(supabase, 'shipments', { orderKey: 'updated_at', limit: 2000 }),
    fetchRowsSafe(supabase, 'work_contracts', { orderKey: 'updated_at', limit: 2000 }),
    fetchRowsSafe(supabase, 'uploaded_assets', { orderKey: 'created_at', limit: 2000 })
  ]);
  const trustArchive = await fetchMirrorCollectionRows(supabase, EVENT_ARCHIVE_COLLECTION, 1200);

  const [userCount, itemCount] = await Promise.all([
    fetchTableCount(supabase, 'users'),
    fetchTableCount(supabase, 'items')
  ]);

  const validOrders = orders.filter((row) => !ORDER_EXCLUDED_STATUSES.has(toText(row.status).toLowerCase()));
  const gmv = sum(validOrders.map((row) => row.total));
  const openDisputes = disputes.filter((row) => toText(row.status).toLowerCase() === 'open').length;
  const pendingPayouts = payouts.filter((row) => PENDING_PAYOUT_STATUSES.has(toText(row.status).toLowerCase()));
  const lowTrustEvents = trustArchive.filter((row) => toText(toObject(row.data).trustTier).toLowerCase() === 'low');

  const alerts = [];
  if (openDisputes > 0) {
    alerts.push({
      id: 'admin-disputes',
      tone: 'critical',
      title: `${openDisputes} open disputes`,
      description: 'Commerce disputes are open and require platform review.',
      actionLabel: 'Open Trust',
      actionHref: '/admin/analytics/trust'
    });
  }
  if (pendingPayouts.length > 0) {
    alerts.push({
      id: 'admin-payouts',
      tone: 'warning',
      title: `${pendingPayouts.length} payouts waiting`,
      description: 'There are payout rows sitting in a pending operational state.',
      actionLabel: 'Open Payouts',
      actionHref: '/admin/analytics/payouts'
    });
  }
  if (lowTrustEvents.length > 0) {
    alerts.push({
      id: 'admin-low-trust',
      tone: 'warning',
      title: `${lowTrustEvents.length} low-trust analytics events`,
      description: 'Recent archived analytics activity includes low-trust signals that should be monitored.',
      actionLabel: 'Open Trust',
      actionHref: '/admin/analytics/trust'
    });
  }

  const heroMetrics = [
    { id: 'gmv', label: 'GMV', value: formatCurrency(gmv, 'USD') },
    { id: 'orders', label: 'Orders', value: formatMetricNumber(orders.length) },
    { id: 'disputes', label: 'Open Disputes', value: formatMetricNumber(openDisputes) },
    { id: 'payouts', label: 'Pending Payouts', value: formatMetricNumber(pendingPayouts.length) }
  ];

  const page = scopePageMeta('admin', pageId);
  const widgetsByPage = {
    overview: [
      {
        id: 'admin-overview-gmv',
        kind: 'timeseries',
        title: 'GMV Trend',
        description: 'Gross marketplace volume across valid orders.',
        aggregateMode: 'aggregate',
        series: accumulateSeries(validOrders, {
          range,
          timeZone: timezone,
          timestampGetter: (row) => row.created_at,
          valueGetter: (row) => row.total
        })
      },
      {
        id: 'admin-overview-personas',
        kind: 'donut',
        title: 'Persona Mix',
        description: 'Live persona composition across the marketplace.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(personas, (row) => row.type)
      },
      {
        id: 'admin-overview-feed',
        kind: 'ticker',
        title: 'Platform Feed',
        description: 'Recent platform-side movement across orders, flags, and payouts.',
        aggregateMode: 'aggregate',
        ticker: validOrders
          .slice(0, 3)
          .map((row) => `Order ${toText(row.id)} is ${titleCase(row.status)} for ${formatCurrency(row.total, row.currency || 'USD')}`)
          .concat(flags.slice(0, 2).map((row) => `Moderation flag ${toText(row.id)} is ${titleCase(row.status || 'open')}`))
          .concat(payouts.slice(0, 3).map((row) => `Payout ${toText(row.id)} is ${titleCase(row.status)}`))
      },
      {
        id: 'admin-overview-orders',
        kind: 'table',
        title: 'Recent Orders',
        description: 'Latest platform orders.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Total', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: validOrders.slice(0, 12).map((row) => ({
          id: toText(row.id),
          status: titleCase(row.status),
          total: formatCurrency(row.total, row.currency || 'USD'),
          createdAt: toText(row.created_at)
        }))
      }
    ],
    commerce: [
      {
        id: 'admin-commerce-orders',
        kind: 'donut',
        title: 'Order Status Mix',
        description: 'Current order state across the platform.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(orders, (row) => row.status)
      },
      {
        id: 'admin-commerce-disputes',
        kind: 'timeline',
        title: 'Dispute Timeline',
        description: 'Recent commerce disputes and escalations.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(disputes, {
          idGetter: (row) => row.id,
          labelGetter: (row) => row.reason_code || 'Dispute',
          timestampGetter: (row) => row.created_at,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => `Opened by ${toText(row.opened_by, 'system')}`
        })
      },
      {
        id: 'admin-commerce-summary',
        kind: 'stat-list',
        title: 'Commerce Summary',
        description: 'Core commerce control metrics.',
        aggregateMode: 'aggregate',
        breakdown: [
          { id: 'orders', label: 'Orders', value: orders.length },
          { id: 'shipments', label: 'Shipments', value: shipments.length },
          { id: 'payouts', label: 'Payout Rows', value: payouts.length },
          { id: 'disputes', label: 'Disputes', value: disputes.length }
        ]
      },
      {
        id: 'admin-commerce-table',
        kind: 'table',
        title: 'Payout Queue',
        description: 'Latest payout operations rows.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Payout' },
          { key: 'status', label: 'Status' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: payouts.slice(0, 12).map((row) => ({
          id: toText(row.id),
          status: titleCase(row.status),
          amount: formatCurrency(row.amount, row.currency || 'USD'),
          createdAt: toText(row.created_at || row.updated_at)
        }))
      }
    ],
    operations: [
      {
        id: 'admin-operations-shipments',
        kind: 'donut',
        title: 'Shipment Status',
        description: 'Operational shipment state across the platform.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(shipments, (row) => row.status)
      },
      {
        id: 'admin-operations-contracts',
        kind: 'bar-list',
        title: 'Work Contract Status',
        description: 'Operational work contract distribution.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(workContracts, (row) => row.status)
      },
      {
        id: 'admin-operations-support',
        kind: 'stat-list',
        title: 'Operational Footprint',
        description: 'Platform scale across users, items, uploads, and contracts.',
        aggregateMode: 'aggregate',
        breakdown: [
          { id: 'users', label: 'Users', value: userCount },
          { id: 'items', label: 'Items', value: itemCount },
          { id: 'uploads', label: 'Uploads', value: uploads.length },
          { id: 'contracts', label: 'Work Contracts', value: workContracts.length }
        ]
      },
      {
        id: 'admin-operations-timeline',
        kind: 'timeline',
        title: 'Operations Timeline',
        description: 'Recent shipment and contract activity.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(shipments.concat(workContracts), {
          idGetter: (row) => row.id,
          labelGetter: (row) => row.carrier || row.title || 'Operational event',
          timestampGetter: (row) => row.updated_at || row.created_at,
          statusGetter: (row) => titleCase(row.status),
          descriptionGetter: (row) => row.tracking_number || row.note || row.description || ''
        })
      }
    ],
    trust: [
      {
        id: 'admin-trust-flags',
        kind: 'table',
        title: 'Moderation Flags',
        description: 'Latest moderation and trust enforcement rows.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Flag' },
          { key: 'status', label: 'Status' },
          { key: 'reason', label: 'Reason' },
          { key: 'createdAt', label: 'Created' }
        ],
        rows: flags.slice(0, 12).map((row) => ({
          id: toText(row.id),
          status: titleCase(row.status || 'open'),
          reason: toText(row.reason_code || row.reason || 'Moderation'),
          createdAt: toText(row.created_at || row.updated_at)
        }))
      },
      {
        id: 'admin-trust-low',
        kind: 'stat-list',
        title: 'Low-Trust Analytics',
        description: 'Recent low-trust event pressure from the analytics archive.',
        aggregateMode: 'aggregate',
        breakdown: [
          { id: 'low-trust', label: 'Low-Trust Events', value: lowTrustEvents.length },
          { id: 'flags', label: 'Moderation Flags', value: flags.length },
          { id: 'open-disputes', label: 'Open Disputes', value: openDisputes }
        ]
      },
      {
        id: 'admin-trust-timeline',
        kind: 'timeline',
        title: 'Trust Timeline',
        description: 'Low-trust events and moderation activity together.',
        aggregateMode: 'aggregate',
        timeline: buildTimeline(
          lowTrustEvents.map((row) => ({ ...toObject(row.data), updated_at: row.updated_at, doc_id: row.doc_id })).concat(flags),
          {
            idGetter: (row) => row.doc_id || row.id,
            labelGetter: (row) => row.eventName || row.reason_code || row.reason || 'Trust event',
            timestampGetter: (row) => row.updated_at || row.created_at || row.occurredAt,
            statusGetter: (row) => row.trustTier || row.status || 'open',
            descriptionGetter: (row) => row.channel || row.source || row.details || ''
          }
        )
      },
      {
        id: 'admin-trust-feed',
        kind: 'ticker',
        title: 'Trust Feed',
        description: 'Recent moderation and analytics trust alerts.',
        aggregateMode: 'aggregate',
        ticker: flags.slice(0, 4).map((row) => `Flag ${toText(row.id)} is ${titleCase(row.status || 'open')}`)
          .concat(lowTrustEvents.slice(0, 4).map((row) => {
            const data = toObject(row.data);
            return `Low-trust ${toText(data.eventName, 'event')} from ${toText(data.channel || data.source, 'unknown source')}`;
          }))
      }
    ],
    payouts: [
      {
        id: 'admin-payouts-series',
        kind: 'timeseries',
        title: 'Payout Amount Trend',
        description: 'Payout amount flow across the selected range.',
        aggregateMode: 'aggregate',
        series: accumulateSeries(payouts, {
          range,
          timeZone: timezone,
          timestampGetter: (row) => row.created_at || row.updated_at,
          valueGetter: (row) => row.amount
        })
      },
      {
        id: 'admin-payouts-status',
        kind: 'donut',
        title: 'Payout Status Mix',
        description: 'Current payout queue split by status.',
        aggregateMode: 'aggregate',
        breakdown: buildStatusBreakdown(payouts, (row) => row.status)
      },
      {
        id: 'admin-payouts-table',
        kind: 'table',
        title: 'Recent Payouts',
        description: 'Latest payout rows awaiting review or settlement.',
        aggregateMode: 'aggregate',
        columns: [
          { key: 'id', label: 'Payout' },
          { key: 'status', label: 'Status' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'updatedAt', label: 'Updated' }
        ],
        rows: payouts.slice(0, 12).map((row) => ({
          id: toText(row.id),
          status: titleCase(row.status),
          amount: formatCurrency(row.amount, row.currency || 'USD'),
          updatedAt: toText(row.updated_at || row.created_at)
        }))
      },
      {
        id: 'admin-payouts-support',
        kind: 'stat-list',
        title: 'Payout Queue Summary',
        description: 'Queue counts and exposure for payout operations.',
        aggregateMode: 'aggregate',
        breakdown: [
          { id: 'pending', label: 'Pending Rows', value: pendingPayouts.length },
          { id: 'total', label: 'Total Rows', value: payouts.length },
          { id: 'amount', label: 'Pending Amount', value: sum(pendingPayouts.map((row) => row.amount)), meta: formatCurrency(sum(pendingPayouts.map((row) => row.amount)), 'USD') }
        ]
      }
    ]
  };

  return createPayload({
    scopeType: 'admin',
    scopeId: 'me',
    pageId,
    range,
    timezone,
    personaLabel: 'Platform',
    title: page.title,
    subtitle: page.subtitle,
    aggregateFallback: true,
    alerts,
    heroMetrics,
    widgets: widgetsByPage[pageId] || widgetsByPage.overview
  });
};

export const createPersonaAnalyticsPages = ({
  supabase,
  userCanAccessPersona,
  resolveAdminContext,
  getSellerSnapshot
}) => {
  const ensureScopeAccess = async (req, scopeType, scopeId) => {
    if (scopeType === 'admin') {
      if (!resolveAdminContext) {
        return { ok: false, status: 500, error: 'Admin context unavailable.' };
      }
      const adminContext = await resolveAdminContext(req);
      if (adminContext?.error) {
        return {
          ok: false,
          status: 403,
          error: adminContext.error.message || 'Admin access required.'
        };
      }
      return {
        ok: true,
        scope: {
          scopeType: 'admin',
          scopeId: 'me',
          user: adminContext.user || null,
          persona: null,
          admin: adminContext
        }
      };
    }

    if (!['consumer', 'seller', 'provider', 'affiliate', 'shipper'].includes(scopeType)) {
      return { ok: false, status: 400, error: 'Invalid analytics scope.' };
    }

    if (!scopeId) {
      return { ok: false, status: 400, error: 'scopeId is required.' };
    }

    const personaContext = await loadPersonaContext(supabase, scopeId);
    if (!personaContext?.persona) {
      return { ok: false, status: 404, error: 'Persona not found.' };
    }

    if (toText(personaContext.persona.type) !== scopeType) {
      return { ok: false, status: 403, error: 'Scope type does not match persona.' };
    }

    if (req.user?.uid) {
      const allowed = await userCanAccessPersona(scopeId, req.user.uid);
      if (!allowed) {
        return { ok: false, status: 403, error: 'Forbidden' };
      }
    }

    return {
      ok: true,
      scope: {
        scopeType,
        scopeId,
        user: personaContext.user || null,
        persona: personaContext.persona
      }
    };
  };

  const invalidateScopedPageCache = async (scopeType, scopeId) => {
    if (!scopeType || !scopeId) return;
    await supabase
      .from('mirror_documents')
      .delete()
      .eq('collection', PAGE_CACHE_COLLECTION)
      .like('doc_id', `${scopeType}:${scopeId}:%`);
  };

  const buildPagePayload = async (scope, pageId, range = '30d', timezone = 'UTC') => {
    const safeTimezone = toText(timezone, 'UTC');
    const safeRange = RANGE_TO_DAYS[range] ? range : '30d';
    const cached = await readPageCache(supabase, scope.scopeType, scope.scopeId, pageId, safeRange, safeTimezone);
    if (cached) return cached;

    let payload;
    if (scope.scopeType === 'consumer') {
      payload = await buildConsumerPage({ supabase, scope, pageId, range: safeRange, timezone: safeTimezone });
    } else if (scope.scopeType === 'seller') {
      payload = await buildSellerPage({ scope, pageId, range: safeRange, timezone: safeTimezone, getSellerSnapshot });
    } else if (scope.scopeType === 'provider') {
      payload = await buildProviderPage({ supabase, scope, pageId, range: safeRange, timezone: safeTimezone });
    } else if (scope.scopeType === 'affiliate') {
      payload = await buildAffiliatePage({ supabase, scope, pageId, range: safeRange, timezone: safeTimezone });
    } else if (scope.scopeType === 'shipper') {
      payload = await buildShipperPage({ supabase, scope, pageId, range: safeRange, timezone: safeTimezone });
    } else {
      payload = await buildAdminPage({ supabase, scope, pageId, range: safeRange, timezone: safeTimezone });
    }

    await writePageCache(supabase, scope.scopeType, scope.scopeId, pageId, safeRange, safeTimezone, payload);
    return payload;
  };

  const buildLiveEnvelope = async (scope, range = '30d', timezone = 'UTC') => {
    const payload = await buildPagePayload(scope, 'overview', range, timezone);
    const summary = Object.fromEntries(
      toArray(payload.heroMetrics).map((metric) => [metric.id, metric.value])
    );

    return {
      type: 'analytics.page',
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      pageId: 'overview',
      range,
      generatedAt: payload.generatedAt,
      connectionState: 'live',
      pages: Object.keys(PAGE_META[scope.scopeType] || {}),
      summary
    };
  };

  return {
    ensureScopeAccess,
    buildPagePayload,
    buildLiveEnvelope,
    invalidateScopedPageCache
  };
};

export default createPersonaAnalyticsPages;
