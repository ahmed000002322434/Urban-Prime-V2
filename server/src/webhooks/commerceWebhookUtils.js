const DUPLICATE_RE = /duplicate|already exists|23505|unique/i;
const MISSING_TABLE_RE = /PGRST205|schema cache|Could not find the table/i;
const fallbackWebhookEvents = new Map();

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const nowIso = () => new Date().toISOString();
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
const normalizeText = (value) => String(value || '').trim();
const uniqueTexts = (values) =>
  [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
const firstText = (...values) => uniqueTexts(values)[0] || '';
const fallbackWebhookKey = (provider, eventId) => `${String(provider || 'unknown')}::${String(eventId || '')}`;
const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(jsonObject(value)).filter(([, entry]) => {
      if (entry === undefined || entry === null) return false;
      if (typeof entry === 'string') return entry.trim().length > 0;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    })
  );

const fetchSingleLatest = async (query) => {
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
};

const insertNotification = async (supabase, userId, title, body, link = '/profile/orders', type = 'order') => {
  if (!supabase || !userId) return;
  const payload = {
    user_id: String(userId),
    title: String(title || 'Commerce update'),
    body: String(body || ''),
    link: String(link || '/profile/orders'),
    type: String(type || 'order'),
    created_at: nowIso()
  };
  const { error } = await supabase.from('notifications').insert(payload);
  if (error) {
    console.warn('[commerce webhook] notification insert failed:', error.message || error);
  }
};

export const recordWebhookEvent = async (supabase, provider, eventId, payload) => {
  if (!supabase) return { duplicate: false };
  const cacheKey = fallbackWebhookKey(provider, eventId);
  const now = Date.now();
  const existingFallback = fallbackWebhookEvents.get(cacheKey);
  if (existingFallback && existingFallback > now) {
    return { duplicate: true, degraded: true };
  }

  const { error } = await supabase.from('webhook_events').insert({
    provider: String(provider || 'unknown'),
    idempotency_key: String(eventId || `${provider}_${Date.now()}`).slice(0, 512),
    payload
  });

  if (!error) return { duplicate: false };
  if (DUPLICATE_RE.test(String(error.message || '')) || String(error.code || '') === '23505') {
    return { duplicate: true };
  }
  if (
    String(error.code || '').toUpperCase() === 'PGRST205' ||
    MISSING_TABLE_RE.test(String(error.message || ''))
  ) {
    fallbackWebhookEvents.set(cacheKey, now + 24 * 60 * 60 * 1000);
    console.warn('[commerce webhook] webhook_events unavailable, using in-memory idempotency fallback');
    return { duplicate: false, degraded: true };
  }
  throw error;
};

const findPaymentRow = async (supabase, { orderId, providerRefs }) => {
  const normalizedOrderId = normalizeText(orderId);
  if (normalizedOrderId) {
    const payment = await fetchSingleLatest(
      supabase.from('payments').select('*').eq('order_id', normalizedOrderId)
    );
    if (payment) return payment;
  }

  for (const ref of uniqueTexts(providerRefs || [])) {
    const payment = await fetchSingleLatest(
      supabase.from('payments').select('*').eq('provider_ref', ref)
    );
    if (payment) return payment;
  }

  return null;
};

const loadOrderContext = async (supabase, orderId) => {
  const normalizedOrderId = normalizeText(orderId);
  if (!normalizedOrderId) return { order: null, orderItem: null, rentalBooking: null };

  const [{ data: order }, orderItem, rentalBooking] = await Promise.all([
    supabase.from('orders').select('*').eq('id', normalizedOrderId).maybeSingle(),
    fetchSingleLatest(supabase.from('order_items').select('*').eq('order_id', normalizedOrderId)).catch(() => null),
    fetchSingleLatest(supabase.from('rental_bookings').select('*').eq('order_id', normalizedOrderId)).catch(() => null)
  ]);

  return {
    order: order || null,
    orderItem: orderItem || null,
    rentalBooking: rentalBooking || null
  };
};

const upsertProviderDispute = async ({
  supabase,
  provider,
  eventId,
  eventType,
  order,
  orderItem,
  rentalBooking,
  amount,
  currency,
  reason,
  rawPayload
}) => {
  if (!supabase || !order?.id) return;

  const existing = await fetchSingleLatest(
    supabase
      .from('commerce_disputes')
      .select('*')
      .eq('order_id', String(order.id))
      .eq('reason_code', 'provider_chargeback')
  ).catch(() => null);

  const details = JSON.stringify({
    provider,
    eventId,
    eventType,
    amount: parseMoney(amount),
    currency: normalizeText(currency || order.currency || 'USD') || 'USD',
    reason: normalizeText(reason || 'provider_dispute'),
    payload: rawPayload
  });
  const adminNotes = `Provider webhook ${eventType} (${eventId}) reported a payment dispute.`;

  if (existing?.id) {
    const { error } = await supabase
      .from('commerce_disputes')
      .update({
        status: existing.status === 'resolved' ? existing.status : 'under_review',
        details,
        admin_notes: [normalizeText(existing.admin_notes), adminNotes].filter(Boolean).join('\n')
      })
      .eq('id', existing.id);
    if (error) {
      console.warn('[commerce webhook] dispute update failed:', error.message || error);
    }
    return;
  }

  const { error } = await supabase.from('commerce_disputes').insert({
    order_id: String(order.id),
    order_item_id: orderItem?.id ? String(orderItem.id) : null,
    rental_booking_id: rentalBooking?.id ? String(rentalBooking.id) : null,
    opened_by: String(order.buyer_id || orderItem?.seller_id || ''),
    reason_code: 'provider_chargeback',
    details,
    status: 'open',
    resolution: null,
    admin_notes: adminNotes
  });

  if (error) {
    console.warn('[commerce webhook] dispute insert failed:', error.message || error);
    return;
  }

  await insertNotification(
    supabase,
    order.buyer_id,
    'Payment issue under review',
    'A provider dispute was opened for your order. Our team will review the payment event.',
    '/profile/disputes',
    'dispute'
  );
};

const deriveBuyerNotice = (status, provider, amount, currency) => {
  const money =
    parseMoney(amount) > 0
      ? `${parseMoney(amount).toFixed(2)} ${normalizeText(currency || 'USD').toUpperCase()}`
      : null;
  const providerLabel = normalizeText(provider || 'payment provider') || 'payment provider';

  if (status === 'paid') {
    return {
      title: 'Payment confirmed',
      body: money
        ? `Your ${providerLabel} payment of ${money} was confirmed.`
        : `Your ${providerLabel} payment was confirmed.`
    };
  }
  if (status === 'pending') {
    return {
      title: 'Payment pending review',
      body: `Your ${providerLabel} payment is pending confirmation.`
    };
  }
  if (status === 'failed') {
    return {
      title: 'Payment failed',
      body: `Your ${providerLabel} payment did not complete. Please try again or choose another rail.`
    };
  }
  if (status === 'refunded') {
    return {
      title: 'Refund processed',
      body: money
        ? `A refund of ${money} was recorded through ${providerLabel}.`
        : `A refund was recorded through ${providerLabel}.`
    };
  }
  return null;
};

export const applyPaymentWebhookUpdate = async ({
  supabase,
  provider,
  eventId,
  eventType,
  orderId,
  providerRefs,
  status,
  amount,
  currency,
  payoutSettlementRef,
  methodDetails,
  depositState,
  disputeReason,
  rawPayload
}) => {
  if (!supabase) return { matched: false };

  const payment = await findPaymentRow(supabase, { orderId, providerRefs });
  if (!payment?.id) {
    return { matched: false };
  }

  const currentMetadata = jsonObject(payment.metadata);
  const mergedMethodDetails = {
    ...compactObject(currentMetadata.provider_method_details),
    ...compactObject(methodDetails)
  };
  const normalizedStatus = firstText(status, payment.status).toLowerCase() || payment.status || 'pending';
  const normalizedProviderRef = firstText(...(providerRefs || []), payment.provider_ref);
  const nextMetadata = {
    ...currentMetadata,
    provider_method_details: mergedMethodDetails,
    payout_settlement_ref: firstText(payoutSettlementRef, currentMetadata.payout_settlement_ref) || null,
    last_webhook_at: nowIso(),
    last_webhook_status: normalizedStatus,
    last_webhook_event_id: eventId,
    last_webhook_event_type: eventType,
    deposit_provider_state: firstText(depositState, currentMetadata.deposit_provider_state) || undefined
  };

  const updatePayload = {
    status: normalizedStatus,
    provider_ref: normalizedProviderRef || payment.provider_ref || null,
    metadata: nextMetadata
  };
  if (parseMoney(amount) > 0) updatePayload.amount = parseMoney(amount);
  if (hasText(currency)) updatePayload.currency = normalizeText(currency).toUpperCase();

  const { error: updateError } = await supabase.from('payments').update(updatePayload).eq('id', payment.id);
  if (updateError) throw updateError;

  const resolvedOrderId = firstText(orderId, payment.order_id);
  const orderContext = await loadOrderContext(supabase, resolvedOrderId);

  if (orderContext.order?.id) {
    const orderNote = jsonObject(orderContext.order.note);
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        note: JSON.stringify({
          ...orderNote,
          payment_provider: provider,
          payment_status: normalizedStatus,
          payment_provider_ref: normalizedProviderRef || null,
          last_provider_event_id: eventId,
          last_provider_event_type: eventType,
          payout_settlement_ref: firstText(payoutSettlementRef, orderNote.payout_settlement_ref) || null
        })
      })
      .eq('id', orderContext.order.id);
    if (orderUpdateError) {
      console.warn('[commerce webhook] order note update failed:', orderUpdateError.message || orderUpdateError);
    }

    if (payment.status !== normalizedStatus) {
      const buyerNotice = deriveBuyerNotice(normalizedStatus, provider, amount, currency);
      if (buyerNotice) {
        await insertNotification(
          supabase,
          orderContext.order.buyer_id,
          buyerNotice.title,
          buyerNotice.body,
          '/profile/orders',
          'order'
        );
      }
    }
  }

  if (disputeReason && orderContext.order?.id) {
    await upsertProviderDispute({
      supabase,
      provider,
      eventId,
      eventType,
      order: orderContext.order,
      orderItem: orderContext.orderItem,
      rentalBooking: orderContext.rentalBooking,
      amount,
      currency,
      reason: disputeReason,
      rawPayload
    });
  }

  return {
    matched: true,
    paymentId: String(payment.id),
    orderId: resolvedOrderId || null
  };
};
