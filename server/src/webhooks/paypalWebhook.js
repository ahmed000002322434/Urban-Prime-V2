import { applyPaymentWebhookUpdate, recordWebhookEvent } from './commerceWebhookUtils.js';

const paypalPaymentStatus = (eventType) => {
  const normalized = String(eventType || '').trim().toUpperCase();
  if (
    [
      'PAYMENT.CAPTURE.COMPLETED',
      'CHECKOUT.ORDER.APPROVED',
      'CHECKOUT.ORDER.COMPLETED'
    ].includes(normalized)
  ) {
    return 'paid';
  }
  if (['PAYMENT.CAPTURE.PENDING', 'CHECKOUT.ORDER.PROCESSED'].includes(normalized)) {
    return 'pending';
  }
  if (
    ['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED', 'CHECKOUT.ORDER.DENIED'].includes(
      normalized
    )
  ) {
    return 'failed';
  }
  if (
    ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.SALE.REFUNDED'].includes(
      normalized
    )
  ) {
    return 'refunded';
  }
  return '';
};

/**
 * PayPal IPN / webhook-style receiver (JSON). Records idempotency and applies canonical payment updates.
 */
export const createPaypalWebhookHandler = (supabase) => async (req, res) => {
  try {
    const body = req.body || {};
    const eventId =
      body?.id ||
      body?.resource?.id ||
      body?.event_type ||
      `paypal_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const recorded = await recordWebhookEvent(supabase, 'paypal', eventId, body);
    if (recorded.duplicate) {
      return res.json({ received: true, duplicate: true });
    }

    const eventType = String(body?.event_type || '').trim();
    const resource = body?.resource || {};
    const relatedIds = resource?.supplementary_data?.related_ids || {};
    const card = resource?.payment_source?.card || resource?.payment_source?.paypal || {};
    const amountValue =
      resource?.seller_receivable_breakdown?.gross_amount?.value ||
      resource?.amount?.value ||
      resource?.amount?.total ||
      resource?.transaction_amount?.value ||
      0;

    await applyPaymentWebhookUpdate({
      supabase,
      provider: 'paypal',
      eventId,
      eventType,
      orderId:
        resource?.custom_id ||
        resource?.invoice_id ||
        relatedIds?.order_id ||
        relatedIds?.capture_id ||
        '',
      providerRefs: [
        resource?.id,
        relatedIds?.capture_id,
        relatedIds?.order_id,
        body?.id,
        resource?.invoice_id
      ],
      status: paypalPaymentStatus(eventType),
      amount: Number(amountValue || 0),
      currency:
        resource?.seller_receivable_breakdown?.gross_amount?.currency_code ||
        resource?.amount?.currency_code ||
        resource?.amount?.currency ||
        '',
      payoutSettlementRef:
        relatedIds?.capture_id ||
        resource?.id ||
        body?.resource?.supplementary_data?.related_ids?.capture_id ||
        '',
      methodDetails: {
        rail: 'paypal',
        payer_id: resource?.payer?.payer_id || '',
        payer_email: resource?.payer?.email_address || '',
        brand: card?.brand || '',
        last4: card?.last_digits || card?.last4 || ''
      },
      disputeReason:
        eventType.includes('DISPUTE') || eventType.includes('CHARGEBACK')
          ? resource?.reason || resource?.dispute_reason || 'provider_dispute'
          : '',
      rawPayload: body
    });

    return res.json({ received: true });
  } catch (error) {
    console.error('[paypal webhook]', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};
