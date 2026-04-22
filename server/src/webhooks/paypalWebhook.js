/**
 * PayPal IPN / webhook-style receiver (JSON). Records idempotency in webhook_events.
 */
export const createPaypalWebhookHandler = (supabase) => async (req, res) => {
  try {
    const body = req.body || {};
    const eventId =
      body?.id ||
      body?.resource?.id ||
      body?.event_type ||
      `paypal_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (supabase) {
      const { error } = await supabase.from('webhook_events').insert({
        provider: 'paypal',
        idempotency_key: String(eventId).slice(0, 512),
        payload: body
      });
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        console.warn('[paypal webhook] webhook_events insert:', error.message || error);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('[paypal webhook]', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};
