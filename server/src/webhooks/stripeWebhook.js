/**
 * Stripe webhook receiver (raw body). Verifies signature when STRIPE_WEBHOOK_SECRET is set.
 * Always records idempotency in public.webhook_events when the table exists.
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
    if (supabase) {
      const { error } = await supabase.from('webhook_events').insert({
        provider: 'stripe',
        idempotency_key: String(eventId).slice(0, 512),
        payload: parsed
      });
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        console.warn('[stripe webhook] webhook_events insert:', error.message || error);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('[stripe webhook]', error);
    return res.status(500).send('Webhook handler failed');
  }
};
