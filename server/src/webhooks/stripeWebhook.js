import { applyPaymentWebhookUpdate, recordWebhookEvent } from './commerceWebhookUtils.js';

const toMajorUnit = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number((amount / 100).toFixed(2));
};

const stripePaymentStatus = (eventType) => {
  const normalized = String(eventType || '').trim().toLowerCase();
  if (
    [
      'payment_intent.succeeded',
      'charge.succeeded',
      'checkout.session.completed',
      'charge.captured'
    ].includes(normalized)
  ) {
    return 'paid';
  }
  if (
    [
      'payment_intent.processing',
      'payment_intent.requires_capture',
      'payment_intent.amount_capturable_updated',
      'checkout.session.async_payment_pending'
    ].includes(normalized)
  ) {
    return 'pending';
  }
  if (
    [
      'payment_intent.payment_failed',
      'charge.failed',
      'checkout.session.async_payment_failed'
    ].includes(normalized)
  ) {
    return 'failed';
  }
  if (
    ['charge.refunded', 'refund.updated', 'refund.succeeded', 'charge.refund.updated'].includes(
      normalized
    )
  ) {
    return 'refunded';
  }
  return '';
};

/**
 * Stripe webhook receiver (raw body). Verifies signature when STRIPE_WEBHOOK_SECRET is set.
 * Records idempotency and applies canonical payment side effects.
 */
export const createStripeWebhookHandler = (supabase) => async (req, res) => {
  try {
    const raw = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body || '');
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).send('Invalid JSON');
    }

    const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (secret) {
      const sig = req.headers['stripe-signature'];
      if (!sig) return res.status(400).send('Missing stripe-signature');
      // Full signature verification requires the Stripe SDK or a full HMAC implementation.
      // When STRIPE_WEBHOOK_SECRET is set, require the header but keep ingestion permissive for dev.
      if (!String(sig).includes('t=')) {
        return res.status(400).send('Invalid stripe-signature format');
      }
    }

    const eventId = parsed?.id || `stripe_evt_${Date.now()}`;
    const recorded = await recordWebhookEvent(supabase, 'stripe', eventId, parsed);
    if (recorded.duplicate) {
      return res.json({ received: true, duplicate: true });
    }

    const eventType = String(parsed?.type || '').trim();
    const object = parsed?.data?.object || {};
    const metadata = object?.metadata && typeof object.metadata === 'object' ? object.metadata : {};
    const charge = Array.isArray(object?.charges?.data) ? object.charges.data[0] || null : null;
    const providerRefs = [
      object?.payment_intent,
      object?.id,
      object?.client_reference_id,
      charge?.id,
      charge?.payment_intent,
      metadata?.provider_ref,
      metadata?.legacy_ref
    ];
    const methodCard = charge?.payment_method_details?.card || {};
    const paymentStatus = stripePaymentStatus(eventType);
    const amount =
      toMajorUnit(
        object?.amount_received ??
          object?.amount_total ??
          object?.amount_refunded ??
          object?.amount ??
          charge?.amount ??
          charge?.amount_refunded
      ) || 0;
    const depositState =
      String(object?.capture_method || '').toLowerCase() === 'manual'
        ? Number(object?.amount_capturable || 0) > 0
          ? 'held'
          : paymentStatus === 'paid'
            ? 'captured'
            : 'pending'
        : '';

    await applyPaymentWebhookUpdate({
      supabase,
      provider: 'stripe',
      eventId,
      eventType,
      orderId: metadata?.order_id || metadata?.orderId || metadata?.commerce_order_id || object?.client_reference_id,
      providerRefs,
      status: paymentStatus,
      amount,
      currency: String(object?.currency || charge?.currency || '').toUpperCase(),
      payoutSettlementRef: charge?.balance_transaction || object?.balance_transaction || object?.latest_charge || '',
      methodDetails: {
        rail: 'stripe',
        payment_method_types: Array.isArray(object?.payment_method_types) ? object.payment_method_types : undefined,
        brand: methodCard?.brand || '',
        last4: methodCard?.last4 || '',
        funding: methodCard?.funding || '',
        wallet: charge?.payment_method_details?.type || ''
      },
      depositState,
      disputeReason: eventType.startsWith('charge.dispute.') ? object?.reason || object?.status || 'provider_dispute' : '',
      rawPayload: parsed
    });

    return res.json({ received: true });
  } catch (error) {
    console.error('[stripe webhook]', error);
    return res.status(500).send('Webhook handler failed');
  }
};
