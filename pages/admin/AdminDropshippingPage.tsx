import React, { useEffect, useMemo, useState } from 'react';
import commerceService from '../../services/commerceService';
import type {
  DropshipAdminOverview,
  DropshipOrder,
  SellerDropshipProfile,
  Supplier,
  SupplierProduct,
  SupplierSettlement
} from '../../types';
import { CommerceDashboardSkeleton } from '../../components/commerce/CommerceSkeleton';
import { useNotification } from '../../context/NotificationContext';

type TabId = 'overview' | 'suppliers' | 'catalog' | 'sellers' | 'orders' | 'settlements';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'sellers', label: 'Seller Approvals' },
  { id: 'orders', label: 'Order Queue' },
  { id: 'settlements', label: 'Settlements' }
];

const currency = (value: number, code = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code || 'USD',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`.trim()}
  >
    {children}
  </div>
);

const AdminDropshippingPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [overview, setOverview] = useState<DropshipAdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    id: '',
    name: '',
    contactEmail: '',
    status: 'active',
    fulfillmentMode: 'manual_panel',
    defaultRoutingMode: 'seller_approve'
  });
  const [productForm, setProductForm] = useState({
    id: '',
    supplierId: '',
    title: '',
    wholesalePrice: '',
    shippingCost: '',
    stock: '',
    category: '',
    status: 'active'
  });
  const [settlementForm, setSettlementForm] = useState({
    supplierId: '',
    orderIds: [] as string[],
    externalRef: '',
    status: 'draft'
  });

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const data = await commerceService.getDropshipAdminOverview();
      setOverview(data);
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to load dropshipping admin overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const refresh = async (message?: string) => {
    if (message) showNotification(message);
    await loadOverview();
  };

  const selectedSettlementOrders = useMemo(() => {
    const supplierId = settlementForm.supplierId;
    if (!supplierId || !overview) return [];
    return overview.orders.filter(
      (order) =>
        order.supplierId === supplierId &&
        !order.settlementId &&
        !['cancelled', 'failed'].includes(String(order.status || '').toLowerCase())
    );
  }, [overview, settlementForm.supplierId]);

  const submitSupplier = async () => {
    setIsSaving(true);
    try {
      if (supplierForm.id) {
        await commerceService.updateDropshipSupplier(supplierForm.id, supplierForm);
        await refresh('Supplier updated.');
      } else {
        await commerceService.createDropshipSupplier(supplierForm);
        await refresh('Supplier created.');
      }
      setSupplierForm({
        id: '',
        name: '',
        contactEmail: '',
        status: 'active',
        fulfillmentMode: 'manual_panel',
        defaultRoutingMode: 'seller_approve'
      });
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to save supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitProduct = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...productForm,
        wholesalePrice: Number(productForm.wholesalePrice || 0),
        shippingCost: Number(productForm.shippingCost || 0),
        stock: Number(productForm.stock || 0)
      };
      if (productForm.id) {
        await commerceService.updateDropshipProduct(productForm.id, payload);
        await refresh('Supplier product updated.');
      } else {
        await commerceService.createDropshipProduct(payload);
        await refresh('Supplier product created.');
      }
      setProductForm({
        id: '',
        supplierId: '',
        title: '',
        wholesalePrice: '',
        shippingCost: '',
        stock: '',
        category: '',
        status: 'active'
      });
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to save supplier product.');
    } finally {
      setIsSaving(false);
    }
  };

  const createSettlement = async () => {
    setIsSaving(true);
    try {
      await commerceService.createDropshipSettlement({
        supplierId: settlementForm.supplierId,
        supplierOrderIds: settlementForm.orderIds,
        externalRef: settlementForm.externalRef,
        status: settlementForm.status
      });
      setSettlementForm({ supplierId: '', orderIds: [], externalRef: '', status: 'draft' });
      await refresh('Settlement created.');
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to create settlement.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSettlementForm((prev) => ({
      ...prev,
      orderIds: prev.orderIds.includes(orderId)
        ? prev.orderIds.filter((id) => id !== orderId)
        : [...prev.orderIds, orderId]
    }));
  };

  if (isLoading || !overview) return <CommerceDashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,#f8fafc_0%,#e0f2fe_38%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12)_0%,rgba(15,23,42,0.98)_45%,rgba(2,6,23,1)_100%)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Admin Operations</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Dropshipping control center</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Canonical supplier directory, managed catalog, seller approvals, supplier-order exceptions, and settlement
              payables all run here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Suppliers</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{overview.summary.suppliers}</p>
            </Card>
            <Card className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Active Catalog</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{overview.summary.activeProducts}</p>
            </Card>
            <Card className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Pending Sellers</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{overview.summary.pendingSellerApprovals}</p>
            </Card>
            <Card className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Exceptions</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{overview.summary.ordersNeedingAttention}</p>
            </Card>
            <Card className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Unsettled</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{currency(overview.summary.unsettledPayables)}</p>
            </Card>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Platform Toggles</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: 'enabled', label: 'Dropshipping enabled' },
                { key: 'requireApproval', label: 'Require approval' },
                { key: 'allowAutoSubmit', label: 'Allow auto submit' }
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={Boolean((overview.settings as any)[toggle.key])}
                    onChange={async (event) => {
                      setIsSaving(true);
                      try {
                        await commerceService.updateDropshipAdminSettings({ [toggle.key]: event.target.checked });
                        await refresh('Dropshipping settings updated.');
                      } catch (error: any) {
                        console.error(error);
                        showNotification(error?.message || 'Unable to update platform settings.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  />
                  {toggle.label}
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Recent Exception Queue</p>
            <div className="mt-4 space-y-3">
              {overview.orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">{order.itemTitle}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {order.supplierName} · {String(order.status).replace(/_/g, ' ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                  >
                    Review queue
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
              {supplierForm.id ? 'Edit Supplier' : 'Create Supplier'}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={supplierForm.name}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Supplier name"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <input
                value={supplierForm.contactEmail}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                placeholder="Contact email"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <select
                value={supplierForm.status}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="blocked">Blocked</option>
              </select>
              <select
                value={supplierForm.fulfillmentMode}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, fulfillmentMode: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="manual_panel">Manual Panel</option>
                <option value="manual_email">Manual Email</option>
                <option value="api">API</option>
              </select>
            </div>
            <select
              value={supplierForm.defaultRoutingMode}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, defaultRoutingMode: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <option value="manual_review">Manual Review</option>
              <option value="seller_approve">Seller Approve</option>
              <option value="auto_submit">Auto Submit</option>
            </select>
            <button
              type="button"
              disabled={isSaving}
              onClick={submitSupplier}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {supplierForm.id ? 'Save Supplier' : 'Create Supplier'}
            </button>
          </Card>
          <div className="grid gap-4">
            {overview.suppliers.map((supplier) => (
              <Card key={supplier.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{supplier.fulfillmentMode}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{supplier.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {supplier.status} · default routing {supplier.defaultRoutingMode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSupplierForm({
                      id: supplier.id,
                      name: supplier.name,
                      contactEmail: supplier.contactEmail || '',
                      status: supplier.status,
                      fulfillmentMode: supplier.fulfillmentMode,
                      defaultRoutingMode: supplier.defaultRoutingMode
                    })
                  }
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                >
                  Edit
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                {productForm.id ? 'Edit Supplier Product' : 'Create Supplier Product'}
              </p>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await commerceService.importLegacyDropshipCatalog({ backfillListings: true });
                    await refresh('Legacy supplier catalog imported.');
                  } catch (error: any) {
                    console.error(error);
                    showNotification(error?.message || 'Unable to import legacy supplier catalog.');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
              >
                Import Legacy Catalog
              </button>
            </div>
            <select
              value={productForm.supplierId}
              onChange={(event) => setProductForm((prev) => ({ ...prev, supplierId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <option value="">Select supplier</option>
              {overview.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={productForm.title}
                onChange={(event) => setProductForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Product title"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <input
                value={productForm.category}
                onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="Category"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <input
                value={productForm.wholesalePrice}
                onChange={(event) => setProductForm((prev) => ({ ...prev, wholesalePrice: event.target.value }))}
                placeholder="Wholesale price"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <input
                value={productForm.shippingCost}
                onChange={(event) => setProductForm((prev) => ({ ...prev, shippingCost: event.target.value }))}
                placeholder="Shipping cost"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <input
                value={productForm.stock}
                onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                placeholder="Stock"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
              <select
                value={productForm.status}
                onChange={(event) => setProductForm((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={submitProduct}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {productForm.id ? 'Save Product' : 'Create Product'}
            </button>
          </Card>
          <div className="grid gap-4">
            {overview.products.map((product) => (
              <Card key={product.id} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{product.supplierName}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{product.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {product.status} · {currency(product.wholesalePrice, product.currency)} wholesale · {product.stock || 0} stock
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProductForm({
                      id: product.id,
                      supplierId: product.supplierId || '',
                      title: product.title,
                      wholesalePrice: String(product.wholesalePrice || ''),
                      shippingCost: String(product.shippingInfo?.cost || ''),
                      stock: String(product.stock || ''),
                      category: product.category,
                      status: product.status || 'active'
                    })
                  }
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                >
                  Edit
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sellers' && (
        <div className="grid gap-4">
          {overview.sellers.map((seller) => (
            <Card key={seller.id} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{seller.status}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{seller.sellerName || seller.sellerId}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{seller.riskNotes || 'No risk notes recorded.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {seller.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        await commerceService.approveDropshipSeller(seller.sellerId);
                        await refresh('Seller approved for dropshipping.');
                      } catch (error: any) {
                        console.error(error);
                        showNotification(error?.message || 'Unable to approve seller.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                  >
                    Approve
                  </button>
                )}
                {seller.status !== 'suspended' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        await commerceService.suspendDropshipSeller(seller.sellerId, { reason: 'Admin suspension' });
                        await refresh('Seller suspended from dropshipping.');
                      } catch (error: any) {
                        console.error(error);
                        showNotification(error?.message || 'Unable to suspend seller.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="grid gap-4">
          {overview.orders.map((order) => (
            <Card key={order.id} className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                    {order.supplierName} · {order.routingMode}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{order.itemTitle}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {String(order.status).replace(/_/g, ' ')} · payable {currency(Number(order.payableTotal || 0), order.currency)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Submitted', status: 'submitted' },
                    { label: 'Shipped', status: 'shipped' },
                    { label: 'Delivered', status: 'delivered' },
                    { label: 'Cancelled', status: 'cancelled' }
                  ].map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      disabled={isSaving}
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          await commerceService.overrideDropshipOrder(order.id, { status: action.status });
                          await refresh('Supplier order updated.');
                        } catch (error: any) {
                          console.error(error);
                          showNotification(error?.message || 'Unable to override supplier order.');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                    >
                      Mark {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Create Settlement Batch</p>
            <select
              value={settlementForm.supplierId}
              onChange={(event) =>
                setSettlementForm((prev) => ({ ...prev, supplierId: event.target.value, orderIds: [] }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <option value="">Select supplier</option>
              {overview.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input
              value={settlementForm.externalRef}
              onChange={(event) => setSettlementForm((prev) => ({ ...prev, externalRef: event.target.value }))}
              placeholder="External settlement reference"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            />
            <select
              value={settlementForm.status}
              onChange={(event) => setSettlementForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
            </select>
            <div className="space-y-2">
              {selectedSettlementOrders.map((order) => (
                <label
                  key={order.id}
                  className="flex items-center gap-3 rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    checked={settlementForm.orderIds.includes(order.id)}
                    onChange={() => toggleOrderSelection(order.id)}
                  />
                  <span className="font-semibold text-slate-900 dark:text-white">{order.itemTitle}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {currency(Number(order.payableTotal || 0), order.currency)}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={isSaving || !settlementForm.supplierId || settlementForm.orderIds.length === 0}
              onClick={createSettlement}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              Create Settlement
            </button>
          </Card>
          <div className="grid gap-4">
            {overview.settlements.map((settlement) => (
              <Card key={settlement.id} className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{settlement.status}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{settlement.supplierName}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {currency(settlement.amountTotal, settlement.currency)} · {settlement.lines.length} lines
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving || settlement.status === 'settled'}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        await commerceService.updateDropshipSettlement(settlement.id, { status: 'settled' });
                        await refresh('Settlement marked as settled.');
                      } catch (error: any) {
                        console.error(error);
                        showNotification(error?.message || 'Unable to update settlement.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                  >
                    Mark Settled
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDropshippingPage;
