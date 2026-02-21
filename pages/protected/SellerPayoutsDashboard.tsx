import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import type { PaymentRecord, PayoutRecord } from '../services/paymentService';

const SellerPayoutsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState({
    totalReceived: 0,
    totalPaidOut: 0,
    availableBalance: 0,
    currency: 'USD'
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonth: 0,
    thisWeek: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    successRate: 0
  });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'stripe' | 'bank transfer' | 'paypal'>('stripe');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'payouts'>('overview');

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load balance
      const balanceData = await paymentService.getSellerBalance(user.id);
      setBalance(balanceData);

      // Load stats
      const statsData = await paymentService.getPaymentStats(user.id);
      setStats(statsData);

      // Load payments
      const paymentsData = await paymentService.getSellerPayments(user.id);
      setPayments(paymentsData);

      // Load payouts
      const payoutsData = await paymentService.getSellerPayouts(user.id);
      setPayouts(payoutsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!user?.id) return;

    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setPayoutError('Enter a valid amount');
      return;
    }

    if (amount > balance.availableBalance / 100) {
      setPayoutError('Amount exceeds available balance');
      return;
    }

    setIsSubmittingPayout(true);
    setPayoutError(null);

    try {
      const payout = await paymentService.createPayout({
        sellerId: user.id,
        amount: Math.round(amount * 100),
        currency: 'USD',
        payoutMethod
      });

      setPayoutSuccess(`Payout request submitted! You'll receive $${(payout.netAmount! / 100).toFixed(2)} within 1-2 business days.`);
      setPayoutAmount('');
      setShowPayoutModal(false);

      // Reload data
      setTimeout(() => {
        loadData();
        setPayoutSuccess(null);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request payout';
      setPayoutError(message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      succeeded: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Payout Modal */}
      {showPayoutModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPayoutModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg max-w-md w-full"
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Request Payout</h2>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {payoutSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
                >
                  ✓ {payoutSuccess}
                </motion.div>
              )}

              {payoutError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  ✕ {payoutError}
                </motion.div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${(balance.availableBalance / 100).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    max={balance.availableBalance / 100}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Max: ${(balance.availableBalance / 100).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stripe">Direct to Stripe</option>
                  <option value="bank transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="text-gray-600 mb-2">Payout Summary</p>
                {payoutAmount && (
                  <>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Amount</span>
                      <span className="text-gray-900">${parseFloat(payoutAmount || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600">Processing Fee (1%)</span>
                      <span className="text-gray-900">
                        ${(parseFloat(payoutAmount || '0') * 0.01).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold mt-1 bg-white p-2 rounded">
                      <span>You Receive</span>
                      <span className="text-green-600">
                        ${(parseFloat(payoutAmount || '0') * 0.99).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={isSubmittingPayout || !payoutAmount}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingPayout ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Request Payout'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Earnings & Payouts</h1>
              <p className="text-gray-600 mt-2">Track your income and manage withdrawals</p>
            </div>
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={balance.availableBalance <= 0}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Request Payout
            </button>
          </div>

          {/* Main Balance Card */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Available Balance */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6 text-white"
            >
              <p className="text-green-100 text-sm font-medium">Available Balance</p>
              <p className="text-4xl font-bold mt-2">${(balance.availableBalance / 100).toFixed(2)}</p>
              <p className="text-green-100 text-sm mt-3">Ready to withdraw</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Received', value: `$${(balance.totalReceived / 100).toFixed(2)}` },
                { label: 'Paid Out', value: `$${(balance.totalPaidOut / 100).toFixed(2)}` },
                { label: 'This Month', value: `$${(stats.thisMonth / 100).toFixed(2)}` },
                { label: 'Success Rate', value: `${stats.successRate}%` }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-lg p-4 border border-gray-200"
                >
                  <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Revenue Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `$${(stats.totalRevenue / 100).toFixed(2)}`, icon: '💰' },
              { label: 'This Week', value: `$${(stats.thisWeek / 100).toFixed(2)}`, icon: '📅' },
              { label: 'Avg Order Value', value: `$${(stats.averageOrderValue / 100).toFixed(2)}`, icon: '📊' },
              { label: 'Total Orders', value: stats.totalOrders.toString(), icon: '📦' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg p-4 border border-gray-200"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs font-medium text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          {['overview', 'payments', 'payouts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium border-b-2 transition capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'payments' ? '💳 Payments' : '💸 Payouts'}
            </button>
          ))}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

              <div className="space-y-4">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{payment.description}</p>
                      <p className="text-sm text-gray-600">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        +${(payment.sellerReceives! / 100).toFixed(2)}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>

              {payments.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No payments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Item</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">{payment.description}</td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(payment.createdAt)}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            ${(payment.amount / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusBadge(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h3>

              {payouts.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No payouts yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Method</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            ${(payout.amount / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-gray-600 capitalize">{payout.payoutMethod}</td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(payout.createdAt)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusBadge(payout.status)}`}>
                              {payout.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SellerPayoutsDashboard;
