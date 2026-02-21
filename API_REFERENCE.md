# Real-Time Database API Reference

## Quick Start

All real data is now persisted in Firestore. No placeholders, no localStorage.

### Import Services
```typescript
import { storeBuildService } from './services/storeBuildService';
import { rentalOrderService } from './services/rentalOrderService';
import { affiliateCommissionService } from './services/affiliateCommissionService';
```

---

## Store Builder Service

### `saveStoreSetup(userId, storeData)`
Save or update store information to database.

```typescript
const store = await storeBuildService.saveStoreSetup('user123', {
  storeName: 'Urban Rentals',
  tagline: 'Premium items on demand',
  city: 'New York',
  category: 'Fashion',
  description: 'Rent designer items',
  idealCustomer: 'Young professionals',
  theme: 'modern',
  primaryColor: '#3B82F6',
  logoEmoji: '🏪',
  story: 'Started in 2024...',
  mission: 'Make luxury accessible'
});
// Returns: { id: 'store_abc', userId: 'user123', ...data, isPublished: false }
```

### `getUserStore(userId)`
Get the current user's store.

```typescript
const store = await storeBuildService.getUserStore('user123');
if (store) {
  console.log(store.storeName); // 'Urban Rentals'
} else {
  console.log('No store found');
}
```

### `getStore(storeId)`
Get a specific store by ID.

```typescript
const store = await storeBuildService.getStore('store_abc');
// Returns store data or null
```

### `publishStore(storeId)`
Make store live to customers.

```typescript
await storeBuildService.publishStore('store_abc');
// Updates: isPublished = true, publishedAt = now
```

### `unpublishStore(storeId)`
Take store offline.

```typescript
await storeBuildService.unpublishStore('store_abc');
// Updates: isPublished = false
```

### `deleteStore(storeId)`
Delete store and all related data cascading.

```typescript
await storeBuildService.deleteStore('store_abc');
// Deletes: store, layout, affiliate program, analytics
```

### `saveStoreLayout(storeId, sections)`
Configure which sections appear on store.

```typescript
await storeBuildService.saveStoreLayout('store_abc', [
  { id: '1', type: 'hero', title: 'Hero', enabled: true, order: 0 },
  { id: '2', type: 'featured', title: 'Featured Items', enabled: true, order: 1 },
  { id: '3', type: 'about', title: 'About Us', enabled: false, order: 2 }
]);
```

---

## Rental Order Service

### `createRentalOrder(orderData)`
Create a new rental order.

```typescript
const order = await rentalOrderService.createRentalOrder({
  storeId: 'store_abc',
  customerId: 'cust_123',
  itemId: 'item_456',
  itemName: 'Designer Handbag',
  itemImage: 'https://...',
  rentalStart: new Date('2024-01-15'),
  rentalEnd: new Date('2024-01-20'),
  rentalDays: 5,
  dailyRate: 50,
  totalPrice: 250,
  status: 'pending',
  paymentStatus: 'pending',
  customerName: 'Sarah',
  customerEmail: 'sarah@example.com',
  customerPhone: '+1234567890',
  shippingAddress: '123 Main St, NYC'
});
// Returns: { id: 'order_xyz', ...order }
```

### `updateRentalOrderStatus(orderId, status)`
Update order status through lifecycle.

```typescript
// Status flow: pending → confirmed → active → returned → completed
await rentalOrderService.updateRentalOrderStatus('order_xyz', 'confirmed');
await rentalOrderService.updateRentalOrderStatus('order_xyz', 'active');
await rentalOrderService.updateRentalOrderStatus('order_xyz', 'returned');
await rentalOrderService.updateRentalOrderStatus('order_xyz', 'completed');
```

### `updatePaymentStatus(orderId, status, refundAmount?)`
Update order payment status.

```typescript
await rentalOrderService.updatePaymentStatus('order_xyz', 'completed');
await rentalOrderService.updatePaymentStatus('order_xyz', 'refunded', 100);
```

### `getStoreOrders(storeId, limit = 50)`
Get paginated orders for store.

```typescript
const orders = await rentalOrderService.getStoreOrders('store_abc', 100);
// Returns array of up to 100 most recent orders

orders.forEach(order => {
  console.log(`${order.customerName}: ${order.itemName} (${order.status})`);
});
```

### `getStoreMetrics(storeId)`
Get aggregated real metrics for store dashboard.

```typescript
const metrics = await rentalOrderService.getStoreMetrics('store_abc');

console.log(metrics);
// {
//   totalRentals: 42,
//   completedRentals: 38,
//   totalRevenue: 1250.50,
//   completedRentals: 38,
//   averageOrderValue: 32.89,
//   returnRate: 9.52,
//   averageRating: 4.8,
//   customerCount: 23,
//   topItems: [
//     { itemId: 'item1', name: 'Handbag', rentals: 12, revenue: 480 },
//     { itemId: 'item2', name: 'Watch', rentals: 8, revenue: 320 }
//   ]
// }
```

### `getStoreRequests(storeId, limit = 10)`
Get recent rental requests.

```typescript
const requests = await rentalOrderService.getStoreRequests('store_abc', 5);
// Returns pending requests from customers

requests.forEach(req => {
  console.log(`${req.customerId} asked for ${req.itemName}`);
});
```

### `getCustomerOrders(customerId)`
Get all orders for a customer.

```typescript
const myOrders = await rentalOrderService.getCustomerOrders('cust_123');
// Returns all orders placed by customer
```

### `getStoreRevenue(storeId)`
Get total revenue (paid orders only).

```typescript
const revenue = await rentalOrderService.getStoreRevenue('store_abc');
// Returns number: total of all completed payments
```

### `recordPayment(paymentData)`
Record payment for order.

```typescript
const payment = await rentalOrderService.recordPayment({
  orderId: 'order_xyz',
  storeId: 'store_abc',
  customerId: 'cust_123',
  amount: 250,
  paymentMethod: 'card',
  status: 'completed',
  transactionId: 'txn_stripe_123'
});
// Also updates order paymentStatus automatically
```

---

## Affiliate Commission Service

### `registerAffiliate(affiliateData)`
Register new affiliate for store.

```typescript
const affiliate = await affiliateCommissionService.registerAffiliate({
  storeId: 'store_abc',
  email: 'creator@example.com',
  name: 'Sarah Creator',
  platform: 'instagram',
  audience: 'Fashion enthusiasts 18-30'
});
// Returns: { id: 'aff_123', status: 'new', joinedAt, ...data }
```

### `createAffiliateLink(affiliate)`
Generate tracking link for affiliate.

```typescript
const link = await affiliateCommissionService.createAffiliateLink(affiliate);
// Returns: {
//   id: 'link_123',
//   link: 'https://example.com?ref=af_xyz789',
//   customUrl: 'ref-sarah-creator-xyz789',
//   trackingCode: 'af_xyz789'
// }
```

### `trackAffiliateClick(trackingCode)`
Record affiliate click (call when user visits via link).

```typescript
// In your store landing page
const urlParams = new URLSearchParams(window.location.search);
const trackingCode = urlParams.get('ref');
if (trackingCode) {
  await affiliateCommissionService.trackAffiliateClick(trackingCode);
}
```

### `recordAffiliateCommission(trackingCode, orderId, orderAmount, commissionRate)`
Record commission when affiliate's customer completes order.

```typescript
// When order is completed
const commission = await affiliateCommissionService.recordAffiliateCommission(
  'af_xyz789',           // tracking code from order source
  'order_123',           // order ID
  250,                   // order amount
  15                     // commission rate (%)
);
// Calculates: 250 * 15 / 100 = $37.50 commission
// Returns: { id: 'comm_123', commissionAmount: 37.50, status: 'earned' }
```

### `getAffiliateStats(affiliateId, storeId)`
Get individual affiliate performance.

```typescript
const stats = await affiliateCommissionService.getAffiliateStats('aff_123', 'store_abc');
// Returns: {
//   totalClicks: 150,
//   totalConversions: 12,
//   conversionRate: 8,
//   totalOrderAmount: 3000,
//   totalCommissionsEarned: 450,
//   totalCommissionsPaid: 300,
//   pendingCommissions: 150,
//   averageOrderValue: 250
// }
```

### `getAffiliateCommissions(affiliateId, status?)`
Get commissions for affiliate.

```typescript
const allCommissions = await affiliateCommissionService.getAffiliateCommissions('aff_123');
const earned = await affiliateCommissionService.getAffiliateCommissions('aff_123', 'earned');
const paid = await affiliateCommissionService.getAffiliateCommissions('aff_123', 'paid');
```

### `markCommissionsAsPaid(commissionIds, paymentMethod)`
Mark commissions as paid (after payout).

```typescript
await affiliateCommissionService.markCommissionsAsPaid(
  ['comm_123', 'comm_456', 'comm_789'],
  'bank_transfer'
);
```

### `getStoreAffiliatePerformance(storeId)`
Get all affiliate performance for store.

```typescript
const performance = await affiliateCommissionService.getStoreAffiliatePerformance('store_abc');
// Returns: {
//   totalAffiliates: 5,
//   totalConversions: 45,
//   totalEarned: 6750,
//   totalPaid: 4500,
//   totalPending: 2250,
//   affiliates: [
//     {
//       id: 'aff_123',
//       name: 'Sarah',
//       email: 'sarah@example.com',
//       platform: 'instagram',
//       totalCommissionsEarned: 1050,
//       totalCommissionsPaid: 700,
//       pendingCommissions: 350,
//       conversions: 8,
//       status: 'active'
//     },
//     ...
//   ]
// }
```

### `getStoreAffiliates(storeId)`
Get list of all affiliates for store.

```typescript
const affiliates = await affiliateCommissionService.getStoreAffiliates('store_abc');
// Returns array of affiliate users
```

### `updateAffiliateStatus(affiliateId, status)`
Change affiliate status.

```typescript
await affiliateCommissionService.updateAffiliateStatus('aff_123', 'paused');
// Status: 'new' | 'active' | 'paused' | 'suspended'
```

---

## Error Handling

All service methods include built-in error handling. Always wrap in try-catch:

```typescript
try {
  const store = await storeBuildService.saveStoreSetup(userId, data);
  console.log('Success:', store);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    // Handle specific errors:
    if (error.message.includes('Store name')) {
      // Validation error - store name invalid
    } else if (error.message.includes('Missing')) {
      // Missing required field
    }
  }
}
```

### Common Errors
```
"Store name must be between 3 and 50 characters"
"Invalid color format" (must be #RRGGBB)
"Invalid theme selected"
"Missing required field: [fieldName]"
"Cannot transition from [status1] to [status2]"
"Commission rate must be between 5% and 50%"
```

---

## Real Data Examples

### Store Flow Example
```typescript
// 1. Create store
const store = await storeBuildService.saveStoreSetup('user123', {
  storeName: 'Luxury Rentals NYC',
  // ... other fields
});

// 2. Configure sections
await storeBuildService.saveStoreLayout(store.id, sections);

// 3. Publish store
await storeBuildService.publishStore(store.id);

// 4. Check metrics (empty at first)
const metrics = await rentalOrderService.getStoreMetrics(store.id);
// { totalRentals: 0, revenue: 0, ... }
```

### Order Flow Example
```typescript
// Customer rents item
const order = await rentalOrderService.createRentalOrder({
  storeId: 'store_abc',
  customerId: 'cust_123',
  itemId: 'item_456',
  // ... rental details
  totalPrice: 100
});

// Process payment
const payment = await rentalOrderService.recordPayment({
  orderId: order.id,
  storeId: 'store_abc',
  customerId: 'cust_123',
  amount: 100,
  paymentMethod: 'card',
  status: 'completed'
});

// Item rented
await rentalOrderService.updateRentalOrderStatus(order.id, 'confirmed');
await rentalOrderService.updateRentalOrderStatus(order.id, 'active');

// Item returned
await rentalOrderService.updateRentalOrderStatus(order.id, 'returned');
await rentalOrderService.updateRentalOrderStatus(order.id, 'completed');

// Check updated metrics
const metrics = await rentalOrderService.getStoreMetrics('store_abc');
// { totalRentals: 1, completedRentals: 1, revenue: 100, ... }
```

### Affiliate Flow Example
```typescript
// Register affiliate
const affiliate = await affiliateCommissionService.registerAffiliate({
  storeId: 'store_abc',
  email: 'influencer@example.com',
  name: 'Influencer Sarah',
  platform: 'instagram'
});

// Create tracking link
const link = await affiliateCommissionService.createAffiliateLink(affiliate);
// Share: link.link or link.customUrl

// Customer clicks link
await affiliateCommissionService.trackAffiliateClick(link.trackingCode);

// Customer completes order
const commission = await affiliateCommissionService.recordAffiliateCommission(
  link.trackingCode,
  'order_123',
  250,
  15  // 15% commission
);
// Commission: $37.50

// Check affiliate performance
const stats = await affiliateCommissionService.getAffiliateStats(
  affiliate.id,
  'store_abc'
);
// { totalCommissionsEarned: 37.50, ... }
```

---

## Testing

Test these API calls in your browser console:

```javascript
// Import in console
import { storeBuildService } from '/src/services/storeBuildService.ts';
import { rentalOrderService } from '/src/services/rentalOrderService.ts';

// List all stores (admin - needs rule updates)
const { collection, getDocs } = await import('firebase/firestore');
const { db } = await import('/src/firebase.ts');
const stores = await getDocs(collection(db, 'stores_v2'));
stores.forEach(doc => console.log(doc.id, doc.data()));

// Check orders
const orders = await getDocs(collection(db, 'rental_orders'));
console.log(`Total orders: ${orders.size}`);
```

---

**Every API call returns real Firestore data. No mock data. No placeholders.**
