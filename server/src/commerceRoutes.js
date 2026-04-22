const PAYMENT_RAILS = ['stripe', 'paypal', 'razorpay', 'jazzcash', 'bank_transfer', 'local_bank'];
const SHIPPING_RAILS = ['shippo', 'easypost', 'self_managed', 'local_courier'];

const list = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const pickEnabledRails = (preferred, fallback) => {
  const parsed = list(preferred);
  if (!parsed.length) return fallback;
  return parsed.filter((rail) => fallback.includes(rail));
};

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

const parseMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const mapPaymentProvider = (method) => {
  const m = String(method || '').toLowerCase();
  if (m.includes('paypal')) return 'paypal';
  if (m.includes('razorpay')) return 'razorpay';
  if (m.includes('jazz')) return 'jazzcash';
  if (m.includes('bank')) return 'bank_transfer';
  if (m.startsWith('pm_') || m.includes('card')) return 'stripe';
  return 'stripe';
};

const mapPaymentStatus = () => 'paid';

const lineRentMode = (line) => {
  const lt = String(line.listingType || line.listing_type || '').toLowerCase();
  const tm = String(line.transactionMode || line.transaction_mode || '').toLowerCase();
  return lt === 'rent' || (lt === 'both' && tm === 'rent');
};

const computeLineUnitPrice = (line, itemRow) => {
  const rent = lineRentMode(line);
  const qty = Math.max(1, parseInt(String(line.quantity || 1), 10) || 1);
  if (rent) {
    let daily = parseMoney(itemRow.rental_price);
    if (line.rentalRates?.daily) daily = parseMoney(line.rentalRates.daily);
    else if (line.rentalPrice) daily = parseMoney(line.rentalPrice);
    if (line.rentalPeriod?.startDate && line.rentalPeriod?.endDate) {
      const start = new Date(line.rentalPeriod.startDate).getTime();
      const end = new Date(line.rentalPeriod.endDate).getTime();
      const days = Math.max(1, Math.ceil((end - start) / (86400000)));
      return daily * days;
    }
    return daily;
  }
  const sale = parseMoney(itemRow.sale_price);
  const fallback = parseMoney(line.salePrice ?? line.price);
  return sale > 0 ? sale : fallback;
};

const orderItemListingType = (line, itemRow) => {
  if (lineRentMode(line)) return 'rent';
  const lt = String(itemRow.listing_type || '').toLowerCase();
  if (lt === 'auction') return 'sale';
  return lt === 'rent' ? 'sale' : lt || 'sale';
};

export default function registerCommerceRoutes({ app, supabase, requireAuth, getUserContext }) {
  app.get('/commerce/providers', requireAuth, async (_req, res) => {
    const paymentRails = pickEnabledRails(process.env.COMMERCE_PAYMENT_RAILS, PAYMENT_RAILS);
    const shippingRails = pickEnabledRails(process.env.COMMERCE_SHIPPING_RAILS, SHIPPING_RAILS);
    res.json({
      paymentRails,
      shippingRails,
      payouts: {
        enabled: true,
        rails: paymentRails.filter((rail) =>
          ['stripe', 'paypal', 'razorpay', 'bank_transfer', 'local_bank', 'jazzcash'].includes(rail)
        )
      },
      realtime: {
        notifications: true,
        analytics: true
      }
    });
  });

  app.get('/commerce/shipper/snapshot', requireAuth, async (_req, res) => {
    try {
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('id,order_id,status,created_at,shipped_at,delivered_at')
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw error;

      const rows = Array.isArray(shipments) ? shipments : [];
      const now = Date.now();
      const active = rows.filter((row) => {
        const s = String(row.status || '').toLowerCase();
        return s === 'processing' || s === 'shipped';
      });
      const pendingPickup = rows.filter((row) => String(row.status || '').toLowerCase() === 'pending').length;
      const deliveredToday = rows.filter((row) => {
        const status = String(row.status || '').toLowerCase();
        if (status !== 'delivered' || !row.delivered_at) return false;
        const d = new Date(String(row.delivered_at));
        const n = new Date();
        return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
      }).length;
      const delayedShipments = rows.filter((row) => {
        const eta = row.shipped_at ? new Date(String(row.shipped_at)).getTime() + 7 * 86400000 : 0;
        const status = String(row.status || '').toLowerCase();
        return eta > 0 && eta < now && status !== 'delivered' && status !== 'cancelled';
      }).length;

      res.json({
        generatedAt: new Date().toISOString(),
        summary: {
          activeShipments: active.length,
          pendingPickup,
          deliveredToday,
          delayedShipments
        },
        upcoming: active.slice(0, 20).map((row) => ({
          shipmentId: String(row.id || ''),
          orderId: String(row.order_id || ''),
          eta: String(row.shipped_at || row.created_at || new Date().toISOString()),
          status: String(row.status || '')
        }))
      });
    } catch (error) {
      console.error('commerce shipper snapshot failed:', error);
      res.status(500).json({ error: 'Unable to load shipper snapshot' });
    }
  });

  app.get('/commerce/orders/history', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured: getUserContext missing.' });
      }
      const ctx = await getUserContext(req);
      if (ctx.error) return res.status(400).json({ error: ctx.error.message || 'Unable to resolve user.' });
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '40'), 10) || 40, 1), 100);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id,created_at,status,total,currency,note')
        .eq('buyer_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (ordersError) throw ordersError;
      const orderIds = (orders || []).map((o) => o.id).filter(Boolean);
      if (!orderIds.length) {
        return res.json({ lines: [] });
      }
      const { data: lines, error: linesError } = await supabase
        .from('order_items')
        .select('id,order_id,item_id,seller_id,quantity,unit_price,listing_type,rental_start,rental_end,metadata,items(title)')
        .in('order_id', orderIds);
      if (linesError) throw linesError;

      const orderMap = new Map((orders || []).map((o) => [o.id, o]));
      const mapped = (lines || []).map((row) => {
        const ord = orderMap.get(row.order_id) || {};
        const title = row.items?.title || 'Item';
        const lt = String(row.listing_type || '').toLowerCase();
        const type = lt === 'rent' ? 'rent' : 'sale';
        return {
          id: String(row.id),
          orderId: String(row.order_id),
          itemId: row.item_id ? String(row.item_id) : '',
          itemTitle: title,
          startDate: row.rental_start || ord.created_at,
          endDate: row.rental_end || ord.created_at,
          totalPrice: parseMoney(row.unit_price) * Math.max(1, Number(row.quantity || 1)),
          status: String(ord.status || 'processing'),
          type
        };
      });
      res.json({ lines: mapped });
    } catch (error) {
      console.error('commerce orders history failed:', error);
      res.status(500).json({ error: 'Unable to load order history' });
    }
  });

  app.post('/commerce/orders/checkout', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured: getUserContext missing.' });
      }
      const ctx = await getUserContext(req);
      if (ctx.error) return res.status(400).json({ error: ctx.error.message || 'Unable to resolve user.' });

      const buyerId = ctx.user.id;
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ error: 'items required' });

      for (const line of items) {
        if (!isUuid(String(line.id || '').trim())) {
          return res.status(422).json({ error: 'non_uuid_item', fallback: true, message: 'Canonical checkout requires Supabase item UUIDs.' });
        }
      }

      const legacyRef = String(body.legacy_display_ref || `UP-${Date.now()}`).slice(0, 64);
      const shipping = body.shipping_info || body.shippingInfo || {};
      const paymentMethod = String(body.payment_method || body.paymentMethod || 'card');
      const shippingTotal = parseMoney(body.shipping_total ?? body.shippingTotal ?? 0);
      const taxTotal = parseMoney(body.tax_total ?? body.taxTotal ?? 0);

      let buyerPersonaId = null;
      const actorPid = body.actor_persona_id || body.actorPersonaId;
      if (actorPid && isUuid(String(actorPid))) {
        const { data: personaRow } = await supabase.from('personas').select('id,user_id').eq('id', actorPid).maybeSingle();
        if (personaRow && String(personaRow.user_id) === String(buyerId)) {
          buyerPersonaId = personaRow.id;
        }
      }

      const { data: addrRow, error: addrErr } = await supabase
        .from('shipping_addresses')
        .insert({
          user_id: buyerId,
          name: shipping.name || '',
          line1: shipping.addressLine1 || shipping.line1 || '—',
          city: shipping.city || '—',
          state: shipping.state || '',
          postal_code: shipping.zip || shipping.postal_code || '',
          country: shipping.country || 'US',
          phone: shipping.phone || ''
        })
        .select('id')
        .single();
      if (addrErr) throw addrErr;

      const resolvedLines = [];
      let subtotal = 0;
      for (const line of items) {
        const itemId = String(line.id).trim();
        const { data: itemRow, error: itemErr } = await supabase
          .from('items')
          .select('id,seller_id,listing_type,sale_price,rental_price,stock,status')
          .eq('id', itemId)
          .single();
        if (itemErr || !itemRow) {
          return res.status(400).json({ error: `Item not found: ${itemId}` });
        }
        const qty = Math.max(1, parseInt(String(line.quantity || 1), 10) || 1);
        const rent = lineRentMode(line);
        if (!rent) {
          const stock = Number(itemRow.stock || 0);
          if (stock < qty) {
            return res.status(409).json({ error: `Insufficient stock for ${itemId}` });
          }
        }
        const lineTotal = computeLineUnitPrice(line, itemRow) * qty;
        subtotal += lineTotal;
        resolvedLines.push({ line, itemRow, qty, lineTotal, rent });
      }

      const total = subtotal + shippingTotal + taxTotal;
      const notePayload = {
        legacy_display_ref: legacyRef,
        client_payment_method: paymentMethod,
        version: 1
      };

      const { data: orderRow, error: orderErr } = await supabase
        .from('orders')
        .insert({
          buyer_id: buyerId,
          buyer_persona_id: buyerPersonaId,
          status: 'processing',
          currency: 'USD',
          subtotal,
          shipping_total: shippingTotal,
          tax_total: taxTotal,
          total,
          shipping_address_id: addrRow.id,
          note: JSON.stringify(notePayload)
        })
        .select('id')
        .single();
      if (orderErr) throw orderErr;

      for (const { line, itemRow, qty, lineTotal, rent } of resolvedLines) {
        const unitPrice = qty > 0 ? lineTotal / qty : 0;
        const lt = orderItemListingType(line, itemRow);
        const rentalStart = rent && line.rentalPeriod?.startDate ? new Date(line.rentalPeriod.startDate).toISOString() : null;
        const rentalEnd = rent && line.rentalPeriod?.endDate ? new Date(line.rentalPeriod.endDate).toISOString() : null;
        const { error: oiErr } = await supabase.from('order_items').insert({
          order_id: orderRow.id,
          item_id: itemRow.id,
          seller_id: itemRow.seller_id,
          quantity: qty,
          unit_price: unitPrice,
          listing_type: lt,
          rental_start: rentalStart,
          rental_end: rentalEnd,
          metadata: {
            spotlightAttribution: line.spotlightAttribution || null,
            title: line.title || null
          }
        });
        if (oiErr) throw oiErr;
      }

      for (const { itemRow, qty, rent } of resolvedLines) {
        if (rent) continue;
        const { data: fresh, error: freshErr } = await supabase
          .from('items')
          .select('stock,status')
          .eq('id', itemRow.id)
          .single();
        if (freshErr) throw freshErr;
        const currentStock = Number(fresh?.stock || 0);
        const nextStock = Math.max(0, currentStock - qty);
        const updates = { stock: nextStock };
        if (nextStock <= 0) updates.status = 'sold';
        const { error: stErr } = await supabase.from('items').update(updates).eq('id', itemRow.id);
        if (stErr) throw stErr;
      }

      const { error: payErr } = await supabase.from('payments').insert({
        order_id: orderRow.id,
        provider: mapPaymentProvider(paymentMethod),
        status: mapPaymentStatus(),
        amount: total,
        currency: 'USD',
        provider_ref: legacyRef,
        metadata: { source: 'checkout', payment_method: paymentMethod }
      });
      if (payErr) throw payErr;

      const { error: shipErr } = await supabase.from('shipments').insert({
        order_id: orderRow.id,
        status: 'pending'
      });
      if (shipErr) throw shipErr;

      const buyerName = String(body.actor_name || shipping.name || 'Customer').trim() || 'Customer';
      await supabase.from('notifications').insert({
        user_id: buyerId,
        type: 'order',
        title: 'Order placed',
        body: `Order ${legacyRef} was placed successfully.`,
        link: '/profile/orders'
      });

      const sellerIds = new Set(resolvedLines.map((r) => String(r.itemRow.seller_id)));
      for (const sid of sellerIds) {
        if (!sid || sid === String(buyerId)) continue;
        await supabase.from('notifications').insert({
          user_id: sid,
          type: 'order',
          title: 'New order',
          body: `${buyerName} placed order ${legacyRef}.`,
          link: '/profile/sales'
        });
      }

      return res.status(201).json({
        ok: true,
        legacy_order_ref: legacyRef,
        order_id: orderRow.id
      });
    } catch (error) {
      console.error('commerce checkout failed:', error);
      return res.status(500).json({ error: error?.message || 'Checkout failed' });
    }
  });
}
