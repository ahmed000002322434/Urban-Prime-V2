import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import commerceService from '../../services/commerceService';
import { itemService } from '../../services/itemService';
import type {
  DropshipOrder,
  DropshipWorkspaceSnapshot,
  Item,
  SellerDropshipProfile,
  SupplierProduct
} from '../../types';
import { CommerceDashboardSkeleton } from '../../components/commerce/CommerceSkeleton';

type TabId = 'catalog' | 'imported' | 'orders' | 'intelligence' | 'application';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'imported', label: 'Imported Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'intelligence', label: 'Margins & Intelligence' },
  { id: 'application', label: 'Application' }
];

const statusTone: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-700',
  rejected: 'bg-rose-100 text-rose-700',
  submitted: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-200 text-slate-700'
};

const currency = (value: number, code = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code || 'USD',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getMarginMetrics = (item: Item) => {
  const salePrice = safeNumber(item.salePrice);
  const wholesale = safeNumber(item.wholesalePrice);
  const shipping = safeNumber(item.supplierInfo?.shippingCost);
  const marginValue = salePrice - wholesale - shipping;
  const marginPercent = salePrice > 0 ? (marginValue / salePrice) * 100 : 0;
  return {
    salePrice,
    wholesale,
    shipping,
    marginValue,
    marginPercent
  };
};

const CardShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`.trim()}
  >
    {children}
  </div>
);

const CreatorHubPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabId>('catalog');
  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<DropshipWorkspaceSnapshot | null>(null);
  const [catalog, setCatalog] = useState<SupplierProduct[]>([]);
  const [orders, setOrders] = useState<DropshipOrder[]>([]);
  const [importedItems, setImportedItems] = useState<Item[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [minMarginPercent, setMinMarginPercent] = useState('20');
  const [routingMode, setRoutingMode] = useState<'manual_review' | 'seller_approve' | 'auto_submit'>('seller_approve');
  const [blindDropship, setBlindDropship] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, { carrier: string; trackingNumber: string }>>(
    {}
  );
  const [application, setApplication] = useState({
    notes: '',
    channels: '',
    monthlyOrders: '',
    targetMarginPercent: '20'
  });

  const loadAll = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [workspaceSnapshot, orderRows, ownerItems] = await Promise.all([
        commerceService.getDropshipProfile(),
        commerceService.getDropshipOrders(120),
        itemService.getItemsByOwner(user.id)
      ]);
      setWorkspace(workspaceSnapshot);
      if (workspaceSnapshot.canAccessCatalog) {
        const catalogRows = await commerceService.getDropshipCatalog({ limit: 120 });
        setCatalog(catalogRows);
      } else {
        setCatalog([]);
      }
      setOrders(orderRows);
      const mine = ownerItems.filter(
        (item) => item.fulfillmentType === 'dropship' || item.productType === 'dropship'
      );
      setImportedItems(mine);
      const profileSettings = (workspaceSnapshot.profile?.settings || {}) as Record<string, unknown>;
      const appSettings = (profileSettings.application || {}) as Record<string, unknown>;
      setApplication({
        notes: String(appSettings.notes || ''),
        channels: String(appSettings.channels || ''),
        monthlyOrders: String(appSettings.monthlyOrders || ''),
        targetMarginPercent: String(appSettings.targetMarginPercent || '20')
      });
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to load the dropshipping workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const baseline = (safeNumber(selectedProduct.wholesalePrice) + safeNumber(selectedProduct.shippingInfo?.cost)) * 1.35;
    setSalePrice(baseline > 0 ? baseline.toFixed(2) : '');
    setMinMarginPercent('20');
    setRoutingMode('seller_approve');
    setBlindDropship(true);
  }, [selectedProduct?.id]);

  const profile = workspace?.profile as SellerDropshipProfile | undefined;

  const metrics = useMemo(() => {
    const margins = importedItems.map(getMarginMetrics);
    const avgMarginPercent =
      margins.length > 0 ? margins.reduce((sum, item) => sum + item.marginPercent, 0) / margins.length : 0;
    const lowestMargins = [...importedItems]
      .map((item) => ({ item, metrics: getMarginMetrics(item) }))
      .sort((left, right) => left.metrics.marginPercent - right.metrics.marginPercent)
      .slice(0, 4);
    const payableExposure = orders
      .filter((order) => !['delivered', 'cancelled'].includes(String(order.status || '').toLowerCase()))
      .reduce((sum, order) => sum + safeNumber(order.payableTotal), 0);

    return {
      avgMarginPercent,
      payableExposure,
      activeOrders: orders.filter((order) =>
        ['pending_review', 'approved', 'submitted', 'accepted', 'processing', 'shipped'].includes(
          String(order.status || '').toLowerCase()
        )
      ).length,
      lowestMargins
    };
  }, [importedItems, orders]);

  const handleApplicationSubmit = async () => {
    setIsSubmitting(true);
    try {
      await commerceService.submitDropshipProfile({
        application,
        settings: {
          application: {
            ...application,
            targetMarginPercent: safeNumber(application.targetMarginPercent)
          }
        }
      });
      showNotification('Dropshipping application submitted.');
      await loadAll();
      setActiveTab('catalog');
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to submit dropshipping application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await commerceService.importDropshipProduct({
        supplierProductId: selectedProduct.id,
        salePrice: safeNumber(salePrice),
        routingMode,
        minMarginPercent: safeNumber(minMarginPercent, 20),
        blindDropship,
        autoFulfill: routingMode === 'auto_submit',
        title: selectedProduct.title,
        description: selectedProduct.description,
        category: selectedProduct.category,
        imageUrls: selectedProduct.imageUrls
      });
      showNotification(`${selectedProduct.title} imported into your store.`);
      setSelectedProduct(null);
      await loadAll();
      setActiveTab('imported');
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to import supplier product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mutateOrder = async (
    action: () => Promise<{ order: DropshipOrder }>,
    successMessage: string
  ) => {
    setIsSubmitting(true);
    try {
      await action();
      showNotification(successMessage);
      await loadAll();
    } catch (error: any) {
      console.error(error);
      showNotification(error?.message || 'Unable to update supplier order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <CommerceDashboardSkeleton />;

  return (
    <div className="min-h-full space-y-6 px-1 pb-10 animate-fade-in-up">
      <CardShell className="overflow-hidden bg-[radial-gradient(circle_at_top_left,#f8fafc_0%,#eef2ff_35%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.14)_0%,rgba(15,23,42,0.96)_50%,rgba(2,6,23,1)_100%)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Seller Workflow</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
              Canonical dropshipping workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Managed supplier catalog, seller approval, supplier-order routing, and payable exposure now run on the
              commerce backend. Buyers still see a normal sale flow.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <CardShell className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Profile</p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                {profile?.status?.replace('_', ' ') || 'draft'}
              </p>
            </CardShell>
            <CardShell className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Active Orders</p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{metrics.activeOrders}</p>
            </CardShell>
            <CardShell className="rounded-[22px] border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Payable Exposure</p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                {currency(metrics.payableExposure)}
              </p>
            </CardShell>
          </div>
        </div>
      </CardShell>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {!workspace?.canAccessCatalog ? (
            <CardShell>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Catalog access unlocks after admin approval.
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Use the application tab to submit your store notes and channel plan. Once approved, you can import
                managed supplier products directly into your sale catalog.
              </p>
            </CardShell>
          ) : (
            <>
              {selectedProduct && (
                <CardShell className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Import Composer</p>
                      <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{selectedProduct.title}</h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {selectedProduct.supplierName} · wholesale {currency(selectedProduct.wholesalePrice, selectedProduct.currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Sale Price
                      <input
                        value={salePrice}
                        onChange={(event) => setSalePrice(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Routing Mode
                      <select
                        value={routingMode}
                        onChange={(event) => setRoutingMode(event.target.value as typeof routingMode)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <option value="manual_review">Manual Review</option>
                        <option value="seller_approve">Seller Approve</option>
                        <option value="auto_submit">Auto Submit</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Margin Floor %
                      <input
                        value={minMarginPercent}
                        onChange={(event) => setMinMarginPercent(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                      />
                    </label>
                    <label className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={blindDropship}
                        onChange={(event) => setBlindDropship(event.target.checked)}
                      />
                      Blind dropship buyer experience
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleImport}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                    >
                      {isSubmitting ? 'Importing...' : 'Import Product'}
                    </button>
                    <p className="self-center text-xs text-slate-500 dark:text-slate-400">
                      Internal landed cost: {currency(selectedProduct.wholesalePrice + safeNumber(selectedProduct.shippingInfo?.cost), selectedProduct.currency)}
                    </p>
                  </div>
                </CardShell>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {catalog.map((product) => (
                  <CardShell key={product.id} className="flex flex-col">
                    <img
                      src={product.imageUrls?.[0] || '/icons/urbanprime.svg'}
                      alt={product.title}
                      className="h-48 w-full rounded-[22px] object-cover"
                    />
                    <div className="mt-4 flex flex-1 flex-col">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{product.supplierName}</p>
                      <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{product.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Wholesale</p>
                          <p className="mt-1 font-black text-slate-950 dark:text-white">{currency(product.wholesalePrice, product.currency)}</p>
                        </div>
                        <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Shipping</p>
                          <p className="mt-1 font-black text-slate-950 dark:text-white">{currency(safeNumber(product.shippingInfo?.cost), product.currency)}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                          {product.processingTimeDays || 0}d processing
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                        >
                          Import
                        </button>
                      </div>
                    </div>
                  </CardShell>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'imported' && (
        <div className="grid gap-4">
          {importedItems.length === 0 ? (
            <CardShell>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No dropship listings imported yet. Start from the managed catalog.
              </p>
            </CardShell>
          ) : (
            importedItems.map((item) => {
              const margin = getMarginMetrics(item);
              return (
                <CardShell key={item.id} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.imageUrls?.[0] || item.images?.[0] || '/icons/urbanprime.svg'}
                      alt={item.title}
                      className="h-20 w-20 rounded-[22px] object-cover"
                    />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                        {item.supplierInfo?.name || item.dropshipProfile?.supplierName || 'Managed Supplier'}
                      </p>
                      <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Routing {item.dropshipProfile?.routingMode || 'seller_approve'} · blind {item.dropshipProfile?.blindDropship ? 'yes' : 'no'}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                    <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Sale</p>
                      <p className="mt-1 font-black text-slate-950 dark:text-white">{currency(margin.salePrice)}</p>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Margin</p>
                      <p className="mt-1 font-black text-slate-950 dark:text-white">
                        {currency(margin.marginValue)} · {margin.marginPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/item/${item.id}`}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                      >
                        View
                      </Link>
                      <Link
                        to={`/profile/products/edit/${item.id}`}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </CardShell>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="grid gap-4">
          {orders.length === 0 ? (
            <CardShell>
              <p className="text-sm text-slate-600 dark:text-slate-300">No supplier orders yet.</p>
            </CardShell>
          ) : (
            orders.map((order) => {
              const trackingDraft = trackingDrafts[order.id] || { carrier: order.carrier || '', trackingNumber: order.trackingNumber || '' };
              return (
                <CardShell key={order.id} className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                        {order.supplierName || 'Supplier'} · {order.routingMode || 'seller_approve'}
                      </p>
                      <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{order.itemTitle}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Payable {currency(safeNumber(order.payableTotal), order.currency)} · Margin {currency(safeNumber(order.marginSnapshot), order.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusTone[String(order.status || '').toLowerCase()] || 'bg-slate-200 text-slate-700'}`}>
                        {String(order.status || '').replace(/_/g, ' ')}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusTone[String(order.approvalState || '').toLowerCase()] || 'bg-slate-200 text-slate-700'}`}>
                        {String(order.approvalState || 'pending').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">External Ref</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{order.externalOrderRef || 'Pending'}</p>
                      </div>
                      <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">ETA</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{order.etaLabel || 'TBD'}</p>
                      </div>
                      <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Tracking</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{order.trackingNumber || 'Pending'}</p>
                      </div>
                      <div className="rounded-[20px] bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Sync</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{order.trackingSyncState || 'pending'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {order.routingMode === 'seller_approve' && order.approvalState === 'pending' && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => mutateOrder(() => commerceService.approveDropshipOrder(order.id), 'Supplier order approved.')}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                        >
                          Approve
                        </button>
                      )}
                      {['approved', 'pending_review'].includes(String(order.status || '')) && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => mutateOrder(() => commerceService.submitDropshipOrder(order.id, { idempotencyKey: `${order.id}-submit` }), 'Supplier order submitted.')}
                          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                        >
                          Submit
                        </button>
                      )}
                      {['failed', 'cancelled'].includes(String(order.status || '')) && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => mutateOrder(() => commerceService.retryDropshipOrder(order.id), 'Supplier order reset for retry.')}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                        >
                          Retry
                        </button>
                      )}
                      {!['delivered', 'cancelled'].includes(String(order.status || '')) && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => mutateOrder(() => commerceService.cancelDropshipOrder(order.id, { reason: 'Seller cancelled supplier order.' }), 'Supplier order cancelled.')}
                          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      value={trackingDraft.carrier}
                      onChange={(event) =>
                        setTrackingDrafts((prev) => ({
                          ...prev,
                          [order.id]: { ...trackingDraft, carrier: event.target.value }
                        }))
                      }
                      placeholder="Carrier"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                    />
                    <input
                      value={trackingDraft.trackingNumber}
                      onChange={(event) =>
                        setTrackingDrafts((prev) => ({
                          ...prev,
                          [order.id]: { ...trackingDraft, trackingNumber: event.target.value }
                        }))
                      }
                      placeholder="Tracking number"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        mutateOrder(
                          () =>
                            commerceService.updateDropshipTracking(order.id, {
                              carrier: trackingDraft.carrier,
                              trackingNumber: trackingDraft.trackingNumber,
                              status: order.status === 'delivered' ? 'delivered' : 'shipped',
                              idempotencyKey: `${order.id}-${trackingDraft.trackingNumber || 'tracking'}`
                            }),
                          'Tracking synced to the buyer order.'
                        )
                      }
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950"
                    >
                      Sync Tracking
                    </button>
                  </div>
                </CardShell>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'intelligence' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <CardShell>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Portfolio Intelligence</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 p-4 dark:bg-white/[0.04]">
                <p className="text-sm font-semibold text-slate-500">Average margin</p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{metrics.avgMarginPercent.toFixed(1)}%</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4 dark:bg-white/[0.04]">
                <p className="text-sm font-semibold text-slate-500">Payable exposure</p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{currency(metrics.payableExposure)}</p>
              </div>
            </div>
          </CardShell>
          <CardShell>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Margin Guardrail Watchlist</p>
            <div className="mt-5 space-y-3">
              {metrics.lowestMargins.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">Import products to start tracking margin health.</p>
              ) : (
                metrics.lowestMargins.map(({ item, metrics: margin }) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{item.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {currency(margin.marginValue)} · {margin.marginPercent.toFixed(1)}%
                      </p>
                    </div>
                    <Link
                      to={`/profile/products/edit/${item.id}`}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
                    >
                      Reprice
                    </Link>
                  </div>
                ))
              )}
            </div>
          </CardShell>
        </div>
      )}

      {activeTab === 'application' && (
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <CardShell>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Approval State</p>
            <div className="mt-4 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusTone[String(profile?.status || 'draft').toLowerCase()] || 'bg-slate-200 text-slate-700'}`}>
                {String(profile?.status || 'draft').replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Approval controls catalog access and supplier-order submission. Seller verification alone is not enough.
            </p>
            {profile?.riskNotes ? (
              <div className="mt-5 rounded-[20px] bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {profile.riskNotes}
              </div>
            ) : null}
          </CardShell>
          <CardShell className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Application Details</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Sales channels
                <input
                  value={application.channels}
                  onChange={(event) => setApplication((prev) => ({ ...prev, channels: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Monthly order target
                <input
                  value={application.monthlyOrders}
                  onChange={(event) => setApplication((prev) => ({ ...prev, monthlyOrders: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                />
              </label>
            </div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Target margin floor %
              <input
                value={application.targetMarginPercent}
                onChange={(event) => setApplication((prev) => ({ ...prev, targetMarginPercent: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Store notes
              <textarea
                value={application.notes}
                onChange={(event) => setApplication((prev) => ({ ...prev, notes: event.target.value }))}
                rows={5}
                className="mt-2 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              />
            </label>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApplicationSubmit}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? 'Saving...' : profile?.status === 'approved' ? 'Update Application Profile' : 'Submit for Approval'}
            </button>
          </CardShell>
        </div>
      )}
    </div>
  );
};

export default CreatorHubPage;
