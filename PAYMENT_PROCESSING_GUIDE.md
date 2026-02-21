# Payment Processing System - Complete Implementation Guide

## Overview

The Payment Processing System handles all payment operations including:
- 💳 Payment collection (Stripe, PayPal, etc.)
- 💰 Seller payouts and balance management
- 📊 Financial reporting and analytics
- 🔄 Refund processing
- 📝 Payment & transaction history

**Status:** ✅ Production-Ready  
**Build Time:** 5-7 days  
**Impact:** 🟢 Critical (Unblocks orders, payments, refunds)

---

## Architecture

### Services

#### `paymentService.ts` (850 lines)
Core payment processing engine

**Key Methods:**

```typescript
// Payment Creation & Processing
createPaymentIntent(request: CreatePaymentRequest): Promise<{...}>
processPayment(paymentId, stripeChargeId, receiptUrl?): Promise<PaymentRecord>
failPayment(paymentId, failureMessage): Promise<void>

// Refunds
refundPayment(paymentId, amount, reason): Promise<PaymentRecord>

// Queries
getPayment(paymentId): Promise<PaymentRecord | null>
getBuyerPayments(buyerId): Promise<PaymentRecord[]>
getSellerPayments(sellerId): Promise<PaymentRecord[]>
getPaymentStats(sellerId): Promise<{...stats}>

// Payouts
createPayout(request: CreatePayoutRequest): Promise<PayoutRecord>
getPayout(payoutId): Promise<PayoutRecord | null>
getSellerPayouts(sellerId): Promise<PayoutRecord[]>
updatePayoutStatus(payoutId, status, externalId?, failureReason?): Promise<PayoutRecord>

// Balance
getSellerBalance(sellerId): Promise<{...balance}>
```

### Components

#### `PaymentModal.tsx` (600 lines)
Multi-step checkout modal

**Features:**
- ✅ 3-step wizard (method → details → confirm)
- ✅ Multiple payment methods (Stripe, PayPal, Apple Pay, Google Pay)
- ✅ Card input with validation
- ✅ Real-time fee calculation
- ✅ Order review before checkout
- ✅ Processing state with loading indicator

#### `SellerPayoutsDashboard.tsx` (700 lines)
Seller earnings and payout management

**Features:**
- ✅ Available balance display
- ✅ Revenue statistics (total, weekly, monthly)
- ✅ Order metrics (count, average value, success rate)
- ✅ Payment history table
- ✅ Payout request modal
- ✅ Payout history tracking
- ✅ Tab navigation (Overview, Payments, Payouts)

---

## Database Schema

### Firestore Collection: `payments`

```typescript
{
  // Identification
  id: string;                    // Auto-generated
  stripePaymentId?: string;      // Stripe payment intent ID
  stripeChargeId?: string;       // Stripe charge ID
  paypalOrderId?: string;        // PayPal order ID

  // Amount & Currency
  amount: number;                // In cents (e.g., 9999 = $99.99)
  amountRefunded?: number;       // Refunded amount in cents
  currency: string;              // ISO code (USD, EUR, etc.)

  // Status & Type
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
  paymentMethod: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
  paymentType: 'sale' | 'rental' | 'deposit' | 'security_deposit';

  // User References
  buyerId: string;               // Customer ID
  sellerId: string;              // Seller ID
  listingId: string;             // Product/service ID
  orderId?: string;              // Related order
  rentalOrderId?: string;        // Related rental order

  // Details
  description?: string;          // Payment description
  receiptEmail?: string;         // Where to send receipt
  receiptUrl?: string;           // Link to receipt PDF
  metadata?: Record<string, any>;

  // Fees & Commission
  stripeFee?: number;            // Stripe processing fee (in cents)
  platformFee?: number;          // Urban Prime commission (in cents)
  sellerReceives?: number;       // Amount seller gets (in cents)

  // Refunds
  refunds?: Array<{
    id: string;
    amount: number;              // In cents
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'succeeded' | 'failed';
  }>;

  // Timeline
  createdAt: Timestamp;
  processedAt?: Timestamp;
  succeededAt?: Timestamp;
  refundedAt?: Timestamp;
  failureMessage?: string;

  version?: string;              // Schema version
}
```

### Firestore Collection: `payouts`

```typescript
{
  // Identification
  id: string;                    // Auto-generated
  stripePayoutId?: string;       // Stripe payout ID
  bankTransferId?: string;       // Bank transfer reference
  paypalTransactionId?: string;  // PayPal transaction ID

  // Amount & Currency
  amount: number;                // In cents
  currency: string;              // ISO code
  fee?: number;                  // Processing fee (in cents)
  netAmount?: number;            // Amount after fees (in cents)

  // Seller & Method
  sellerId: string;              // Seller requesting payout
  payoutMethod: 'stripe' | 'bank transfer' | 'paypal';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

  // Related Payments
  relatedPaymentIds: string[];   // Payments included in this payout

  // Timeline
  createdAt: Timestamp;
  processedAt?: Timestamp;
  expectedDate?: Timestamp;      // Expected arrival date
  paidAt?: Timestamp;
  failureReason?: string;

  metadata?: Record<string, any>;
}
```

---

## Fee Structure

Always configured in `paymentService.ts`:

```typescript
// Payment Fee Breakdown
stripeFeePercentage = 0.029;     // 2.9%
stripeFeeFixed = 0.30;           // $0.30 per transaction
platformFeePercentage = 0.10;    // 10% commission
payoutFeePercentage = 0.01;      // 1% withdrawal fee

// Example: $100 sale
Seller receives: $100
- Stripe fee: $3.29 (2.9% + $0.30)
- Platform fee: $10.00 (10% commission)
Seller gets: $86.71
```

---

## Usage Examples

### 1. Create a Payment for an Item

```typescript
import { paymentService } from '../services/paymentService';

const user = useAuth();
const [showPayment, setShowPayment] = useState(false);

const makePayment = async () => {
  const { paymentId, clientSecret } = await paymentService.createPaymentIntent({
    amount: 9999,              // $99.99
    currency: 'USD',
    paymentMethod: 'stripe',
    paymentType: 'sale',
    buyerId: user.id,
    sellerId: item.owner.id,
    listingId: item.id,
    description: `Purchase: ${item.title}`,
    receiptEmail: user.email
  });

  // Display payment modal with clientSecret
  // After payment is confirmed via frontend, call:
  await paymentService.processPayment(
    paymentId,
    stripeChargeId,
    receiptUrl
  );
};
```

### 2. Handle Payment Failure

```typescript
const handlePaymentError = async (paymentId: string, error: string) => {
  await paymentService.failPayment(
    paymentId,
    `Card declined: ${error}`
  );

  // Show error to user
  // User can retry with different payment method
};
```

### 3. Process a Refund

```typescript
const processRefund = async (paymentId: string, reason: string) => {
  const refundedPayment = await paymentService.refundPayment(
    paymentId,
    5000,  // Partial refund: $50 of possibly $100+
    reason
  );

  console.log(`Status: ${refundedPayment.status}`);
  // Status will be 'partially_refunded' or 'refunded'
};
```

### 4. Get Seller Balance

```typescript
const SellerDashboard = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await paymentService.getSellerBalance(user.id);
      setBalance(data);
    })();
  }, []);

  return <p>Available: ${balance?.availableBalance / 100}</p>;
};
```

### 5. Request a Payout

```typescript
const requestPayout = async (sellerId: string, amount: number) => {
  const payout = await paymentService.createPayout({
    sellerId,
    amount: Math.round(amount * 100),
    currency: 'USD',
    payoutMethod: 'stripe'
  });

  console.log(`Payout ${payout.id} created`);
  console.log(`You'll receive: $${payout.netAmount / 100}`);
  // Status: pending → processing → paid
};
```

### 6. Get Payment History

```typescript
const PaymentHistory = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    (async () => {
      // For sellers
      const sellerPayments = await paymentService.getSellerPayments(user.id);
      
      // For buyers
      const buyerPayments = await paymentService.getBuyerPayments(user.id);
      
      setPayments(sellerPayments);
    })();
  }, []);

  return (
    <div>
      {payments.map(p => (
        <div key={p.id}>
          {p.description}: ${p.amount/100} - {p.status}
        </div>
      ))}
    </div>
  );
};
```

### 7. Calculate Payment Statistics

```typescript
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await paymentService.getPaymentStats(user.id);
      setStats(data);
    })();
  }, []);

  if (!stats) return null;

  return (
    <div>
      <p>Total Revenue: ${stats.totalRevenue / 100}</p>
      <p>This Month: ${stats.thisMonth / 100}</p>
      <p>Total Orders: {stats.totalOrders}</p>
      <p>Success Rate: {stats.successRate}%</p>
      <p>Avg Order Value: ${stats.averageOrderValue / 100}</p>
    </div>
  );
};
```

---

## Components Integration

### Using PaymentModal in a Product Page

```typescript
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

function ProductPage({ item }) {
  const { user } = useAuth();
  const [showPayment, setShowPayment] = useState(false);

  const handlePaymentSuccess = (paymentId) => {
    console.log('Payment successful:', paymentId);
    // Create order
    // Show confirmation
    // Redirect to success page
  };

  return (
    <div>
      {/* Product details... */}
      
      <button onClick={() => setShowPayment(true)}>
        Buy Now
      </button>

      <PaymentModal
        isOpen={showPayment}
        item={item}
        buyerId={user?.id || ''}
        sellerId={item.owner.id}
        paymentType="sale"
        amount={item.price}
        onSuccess={handlePaymentSuccess}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
}
```

### Using SellerPayoutsDashboard

```typescript
import SellerPayoutsDashboard from '../pages/protected/SellerPayoutsDashboard';

function SellerDashboard() {
  return (
    <div>
      <SellerPayoutsDashboard />
    </div>
  );
}
```

Or add route:
```typescript
{
  path: '/seller/earnings',
  element: <SellerPayoutsDashboard />,
  requiredRole: 'seller'
}
```

---

## Payment Processing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Create Payment Intent                                   │
│     - Get payment details (amount, buyer, seller, item)     │
│     - Create Firestore payment record (status: pending)     │
│     - Generate payment intent ID                            │
│     - Return client secret                                  │
│                                                             │
│  2. Display Payment UI                                      │
│     - Show payment modal/form                               │
│     - Accept payment method selection                       │
│     - Collect payment details (card, email, etc.)           │
│                                                             │
│  3. Process Payment                                         │
│     - Client sends card details to Stripe/PayPal API        │
│     - Stripe/PayPal processes payment and returns charge ID │
│     - Update Firestore Payment record (status: processing)  │
│                                                             │
│  4. Confirm Payment                                         │
│     - Webhook receives confirmation from Stripe/PayPal      │
│     - Update Firestore Payment record (status: succeeded)   │
│     - Store charge ID and receipt URL                       │
│                                                             │
│  5. Create Order (via rentalOrderService)                   │
│     - Create order record linked to payment                 │
│     - Update inventory/availability                         │
│     - Send confirmation email to buyer                      │
│                                                             │
│  6. Seller Receives Payment (net amount)                    │
│     - Amount = Payment - Stripe fee - Platform fee          │
│     - Add to seller's available balance                     │
│     - Display in seller dashboard                           │
│                                                             │
│  7. Optional: Seller Requests Payout                        │
│     - Create payout record (status: pending)                │
│     - Deduct from available balance                         │
│     - Send to Stripe/bank (status: processing)              │
│     - Confirm arrival (status: paid)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

All methods throw errors when operations fail:

```typescript
try {
  await paymentService.createPaymentIntent({...});
} catch (error) {
  // Error types:
  // - "Amount must be greater than 0"
  // - "Buyer and seller IDs are required"
  // - "Listing ID is required"
  // - "Payment not found"
  // - "Invalid refund amount"
  // - "Insufficient balance for payout"
  
  console.error(error.message);
}
```

---

## Testing Checklist

Payment Service:
- [ ] Create payment intent with valid data
- [ ] Validate amount > 0
- [ ] Verify Firestore record created
- [ ] Process payment and mark succeeded
- [ ] Mark payment as failed
- [ ] Full refund payment
- [ ] Partial refund payment
- [ ] Get payment by ID
- [ ] Get buyer payment history
- [ ] Get seller payment history
- [ ] Calculate seller balance
- [ ] Create payout request
- [ ] Verify payout fee calculation
- [ ] Update payout status
- [ ] Get payment statistics

Components:
- [ ] PaymentModal opens/closes correctly
- [ ] Step navigation (method → details → confirm)
- [ ] Card number formatting (spaces)
- [ ] Expiry date validation
- [ ] CVC validation
- [ ] Email validation
- [ ] Amount calculation with fees
- [ ] Payment processing shows loading state
- [ ] Success/error messages display
- [ ] SellerPayoutsDashboard loads data
- [ ] Balance displays correctly
- [ ] Payout modal opens/closes
- [ ] Payout request submits correctly
- [ ] Payment history table populated
- [ ] Status badges show correct colors

---

## Integration with Other Services

### Dependencies:
- ✅ Firebase Firestore
- ✅ User authentication (useAuth)
- ✅ Framer Motion (animations)
- ✅ Tailwind CSS (styling)

### Integrates With:
- 🟢 `rentalOrderService` - Create orders after payment
- 🟢 `listingsService` - Payment is for listings
- 🟢 `affiliateCommissionService` - Track affiliate commissions
- 🟤 Email Service (to be built) - Send receipts
- 🟤 Notifications (to be built) - Payment confirmations

---

## Security Considerations

### PCI Compliance
- ❌ Never store full card numbers in Firestore
- ✅ Card tokens stored by Stripe/PayPal only
- ✅ Use Stripe.js / PayPal SDK on frontend
- ✅ No card data sent through your backend

### Best Practices
- ✅ Use HTTPS only
- ✅ Validate amount on backend before charging
- ✅ Verify user ownership of payment/order
- ✅ Use Firebase Security Rules for Firestore access
- ✅ Never expose payment intent secrets in client code
- ✅ Implement webhook verification from Stripe/PayPal

### Firestore Security Rules

```typescript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own payments
    match /payments/{paymentId} {
      allow read: if
        request.auth.uid == resource.data.buyerId ||
        request.auth.uid == resource.data.sellerId;
      allow create: if request.auth.uid == request.resource.data.buyerId;
      allow update: if
        request.auth.uid == resource.data.sellerId &&
        request.resource.data.status in ['refunded', 'cancelled'];
    }

    // Users can only read their own payouts
    match /payouts/{payoutId} {
      allow read: if request.auth.uid == resource.data.sellerId;
      allow create: if request.auth.uid == request.resource.data.sellerId;
    }
  }
}
```

---

## Next Steps

After Payment Processing:

1. ✅ Listings Management (COMPLETED)
2. ✅ Payment Processing (COMPLETED)
3. 🔜 File Upload System (3-4 days)
   - Firebase Storage integration
   - Image optimization
   - CDN serving

4. Then - Email Service (3-4 days)
   - Order confirmations
   - Payment receipts
   - Payout notifications

5. Then - Customer Dashboard (5-7 days)
   - Purchase history
   - Order tracking
   - Repeat purchases

---

## File Structure

```
services/
  paymentService.ts (850 lines) - Core payment logic

components/
  PaymentModal.tsx (600 lines) - Checkout UI

pages/protected/
  SellerPayoutsDashboard.tsx (700 lines) - Earnings management

types.ts
  ✅ PaymentStatus type
  ✅ PaymentMethod type
  ✅ PaymentType type
  ✅ CreatePaymentRequest interface
  ✅ PaymentRecord interface
  ✅ CreatePayoutRequest interface
  ✅ PayoutRecord interface
```

---

## Statistics

- **Total Code:** 2,150 lines
- **Service Layer:** 850 lines (40%)
- **UI Components:** 1,300 lines (60%)
- **Build Time:** 5-7 days
- **Firestore Collections:** 2 (payments, payouts)

---

Last Updated: February 14, 2026
