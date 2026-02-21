import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { paymentService, type CreatePaymentRequest, type PaymentMethod } from '../services/paymentService';
import type { Item } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  item: Item;
  buyerId: string;
  sellerId: string;
  paymentType: 'sale' | 'rental' | 'deposit' | 'security_deposit';
  amount: number;
  quantity?: number;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  item,
  buyerId,
  sellerId,
  paymentType,
  amount,
  quantity = 1,
  onSuccess,
  onError,
  onClose
}) => {
  const [step, setStep] = useState<'method' | 'details' | 'confirm'>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Card details
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    holderName: ''
  });

  // Email
  const [email, setEmail] = useState('');

  const totalAmount = amount * quantity;
  const fees = Math.round(totalAmount * 0.029 + 30);
  const finalAmount = totalAmount + fees;

  const paymentMethods: Array<{ id: PaymentMethod; name: string; icon: string; description: string }> = [
    { id: 'stripe', name: 'Credit Card', icon: '💳', description: 'Visa, Mastercard, Amex' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'Fast and secure' },
    { id: 'apple_pay', name: 'Apple Pay', icon: '🍎', description: 'Quick checkout' },
    { id: 'google_pay', name: 'Google Pay', icon: '🔵', description: 'Easy payment' }
  ];

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '');
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    setCardData((prev) => ({ ...prev, cardNumber: value }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    setCardData((prev) => ({ ...prev, expiry: value }));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardData((prev) => ({ ...prev, cvc: value }));
  };

  const validateCardData = (): boolean => {
    setError('');

    if (!cardData.holderName.trim()) {
      setError('Cardholder name is required');
      return false;
    }

    const cardNum = cardData.cardNumber.replace(/\s/g, '');
    if (cardNum.length < 13 || cardNum.length > 19) {
      setError('Invalid card number');
      return false;
    }

    const [month, year] = cardData.expiry.split('/');
    if (!month || !year) {
      setError('Invalid expiry date');
      return false;
    }

    if (cardData.cvc.length < 3) {
      setError('Invalid CVC');
      return false;
    }

    if (!email.includes('@')) {
      setError('Valid email is required');
      return false;
    }

    return true;
  };

  const handleProcessPayment = async () => {
    if (!validateCardData()) return;

    setIsProcessing(true);
    setError('');

    try {
      const paymentRequest: CreatePaymentRequest = {
        amount: Math.round(finalAmount * 100),
        currency: 'USD',
        paymentMethod,
        paymentType,
        buyerId,
        sellerId,
        listingId: item.id,
        description: `Purchase: ${item.title} (Qty: ${quantity})`,
        receiptEmail: email,
        metadata: {
          itemTitle: item.title,
          quantity,
          pricePerUnit: amount,
          paymentType
        }
      };

      const { paymentId, paymentIntentId } = await paymentService.createPaymentIntent(paymentRequest);

      // Simulate payment processing
      // In production, this would integrate with Stripe/PayPal APIs
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mark as succeeded
      await paymentService.processPayment(
        paymentId,
        `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        `https://receipts.example.com/${paymentId}`
      );

      onSuccess?.(paymentId);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('method');
    setPaymentMethod('stripe');
    setCardData({ cardNumber: '', expiry: '', cvc: '', holderName: '' });
    setEmail('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                {item.images?.[0] ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">📦</div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 line-clamp-2">{item.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {quantity} × ${(amount / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  ${(totalAmount / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Processing Fee</span>
                <span className="text-gray-900">
                  ${(fees / 100).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span className="text-gray-900">Total</span>
                <span className="text-lg text-blue-600">
                  ${(finalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Step: Payment Method Selection */}
          {step === 'method' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h3 className="font-semibold text-gray-900">Choose Payment Method</h3>
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${
                    paymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-2xl mx-3">{method.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{method.name}</p>
                    <p className="text-xs text-gray-600">{method.description}</p>
                  </div>
                </label>
              ))}

              <button
                onClick={() => setStep('details')}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Continue to Payment Details
              </button>
            </motion.div>
          )}

          {/* Step: Payment Details */}
          {step === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="font-semibold text-gray-900">
                {paymentMethods.find((m) => m.id === paymentMethod)?.name}
              </h3>

              {paymentMethod === 'stripe' && (
                <>
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardData.holderName}
                      onChange={(e) =>
                        setCardData((prev) => ({ ...prev, holderName: e.target.value }))
                      }
                      placeholder="John Doe"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardData.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      maxLength={23}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Expiry & CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardData.expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC
                      </label>
                      <input
                        type="text"
                        value={cardData.cvc}
                        onChange={handleCvcChange}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {paymentMethod === 'paypal' && (
                <div className="text-center py-6">
                  <p className="text-lg text-gray-600">🅿️</p>
                  <p className="text-gray-600 mt-2">You'll be redirected to PayPal</p>
                  <p className="text-sm text-gray-500 mt-1">
                    You&apos;ll review and confirm your purchase on PayPal
                  </p>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('method')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Review Order
                </button>
              </div>
            </motion.div>
          )}

          {/* Step: Confirmation */}
          {step === 'confirm' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-center"
            >
              <h3 className="font-semibold text-gray-900">Review Your Order</h3>

              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-left">
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold text-gray-900">
                  {paymentMethods.find((m) => m.id === paymentMethod)?.name}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${(finalAmount / 100).toFixed(2)}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                By clicking "Complete Purchase", you agree to process payment securely
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>✓ Complete Purchase</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentModal;
