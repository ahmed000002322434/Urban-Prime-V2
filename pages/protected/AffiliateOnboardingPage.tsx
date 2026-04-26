import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { affiliateCommissionService } from '../../services/affiliateCommissionService';
import { storeBuildService, type AffiliateProgram } from '../../services/storeBuildService';

type PartnerStatus = 'new' | 'active' | 'paused' | 'suspended';
type SupportedSurface = 'link' | 'coupon' | 'spotlight' | 'pixe' | 'seller_referral';

const PLATFORM_OPTIONS = ['instagram', 'tiktok', 'youtube', 'blog', 'email'];
const SURFACE_OPTIONS: SupportedSurface[] = ['link', 'coupon', 'spotlight', 'pixe', 'seller_referral'];

const defaultForm = {
  commissionRate: 15,
  maxReward: 50,
  platforms: ['instagram', 'tiktok'],
  enableCookies: true,
  cookieDuration: 30,
  isActive: true,
  minPayout: 50,
  approvalMode: 'manual' as const,
  supportedSurfaces: ['link', 'coupon', 'spotlight', 'pixe', 'seller_referral'] as NonNullable<AffiliateProgram['supportedSurfaces']>,
  sellerBonusAmount: 25
};

const AffiliateOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('Your Store');
  const [partners, setPartners] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalAffiliates: 0, totalConversions: 0, totalEarned: 0, totalPending: 0 });
  const [formData, setFormData] = useState(defaultForm);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const store = await storeBuildService.getUserStore(user.id);
      if (!store?.id) {
        setError('No store found. Complete your store setup first.');
        return;
      }

      setStoreId(store.id);
      setStoreName(store.storeName || 'Your Store');

      const [program, performance] = await Promise.all([
        storeBuildService.getAffiliateProgram(store.id),
        affiliateCommissionService.getStoreAffiliatePerformance(store.id)
      ]);

      if (program) {
        setFormData({
          commissionRate: Number(program.commissionRate || defaultForm.commissionRate),
          maxReward: Number(program.maxReward || defaultForm.maxReward),
          platforms: program.platforms?.length ? program.platforms : defaultForm.platforms,
          enableCookies: program.enableCookies !== false,
          cookieDuration: Number(program.cookieDuration || defaultForm.cookieDuration),
          isActive: program.isActive !== false,
          minPayout: Number(program.minPayout || defaultForm.minPayout),
          approvalMode: program.approvalMode === 'automatic' ? 'automatic' : 'manual',
          supportedSurfaces:
            program.supportedSurfaces?.length ? program.supportedSurfaces : defaultForm.supportedSurfaces,
          sellerBonusAmount: Number(program.sellerBonusAmount || defaultForm.sellerBonusAmount)
        });
      }

      setPartners(performance.affiliates || []);
      setSummary({
        totalAffiliates: performance.totalAffiliates || 0,
        totalConversions: performance.totalConversions || 0,
        totalEarned: performance.totalEarned || 0,
        totalPending: performance.totalPending || 0
      });
    } catch (err: any) {
      console.error('Affiliate program load failed:', err);
      setError(err.message || 'Failed to load affiliate program');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  const activePartners = useMemo(() => partners.filter((partner) => partner.status === 'active').length, [partners]);

  const toggleInArray = <T extends string>(field: 'platforms' | 'supportedSurfaces', value: T) => {
    setFormData((current) => {
      const entries = current[field] as string[];
      return {
        ...current,
        [field]: entries.includes(value) ? entries.filter((entry) => entry !== value) : [...entries, value]
      };
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || !storeId) return;

    try {
      setIsSaving(true);
      setError(null);
      await storeBuildService.saveAffiliateProgram(storeId, user.id, formData);
      showNotification('Affiliate program saved.');
      await loadData();
    } catch (err: any) {
      console.error('Affiliate program save failed:', err);
      setError(err.message || 'Failed to save affiliate program');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePartnerStatus = async (partnerId: string, status: PartnerStatus) => {
    try {
      await affiliateCommissionService.updateAffiliateStatus(partnerId, status);
      showNotification(`Affiliate marked ${status}.`);
      await loadData();
    } catch (err) {
      console.error('Affiliate status update failed:', err);
      showNotification('Failed to update affiliate status.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-text-secondary">Loading affiliate program…</div>;
  }

  if (error && !storeId) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-900">Affiliate Program Unavailable</h1>
          <p className="mt-2 text-red-700">{error}</p>
        </div>
        <button
          onClick={() => navigate('/store/setup')}
          className="px-5 py-3 rounded-xl bg-black text-white font-semibold"
        >
          Complete Store Setup
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <h1 className="text-3xl font-bold text-text-primary">Affiliate Program Manager</h1>
        <p className="text-text-secondary">
          Configure commissions, approval rules, supported traffic surfaces, and payout minimums for {storeName}.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Affiliates', value: summary.totalAffiliates },
          { label: 'Active Partners', value: activePartners },
          { label: 'Conversions', value: summary.totalConversions },
          { label: 'Pending Commissions', value: `$${summary.totalPending.toFixed(2)}` }
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          className="rounded-3xl border border-border bg-surface p-6 space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Program Settings</h2>
              <p className="text-sm text-text-secondary">These values drive attribution, commission release, and wallet transfer eligibility.</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold text-text-primary">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(event) => setFormData((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Program Active
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-secondary">Commission Rate (%)</span>
              <input
                type="number"
                min={5}
                max={50}
                value={formData.commissionRate}
                onChange={(event) => setFormData((current) => ({ ...current, commissionRate: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-secondary">Max Reward Per Conversion ($)</span>
              <input
                type="number"
                min={0}
                value={formData.maxReward}
                onChange={(event) => setFormData((current) => ({ ...current, maxReward: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-secondary">Cookie Window (days)</span>
              <input
                type="number"
                min={1}
                max={90}
                value={formData.cookieDuration}
                onChange={(event) => setFormData((current) => ({ ...current, cookieDuration: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-secondary">Minimum Wallet Transfer ($)</span>
              <input
                type="number"
                min={1}
                value={formData.minPayout}
                onChange={(event) => setFormData((current) => ({ ...current, minPayout: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-secondary">Seller Referral Bonus ($)</span>
              <input
                type="number"
                min={0}
                value={formData.sellerBonusAmount}
                onChange={(event) => setFormData((current) => ({ ...current, sellerBonusAmount: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-secondary">Approval Mode</span>
              <select
                value={formData.approvalMode}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, approvalMode: event.target.value === 'automatic' ? 'automatic' : 'manual' }))
                }
                className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3"
              >
                <option value="manual">Manual approval</option>
                <option value="automatic">Automatic approval</option>
              </select>
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-text-secondary">Allowed Affiliate Platforms</p>
              <div className="flex flex-wrap gap-3">
                {PLATFORM_OPTIONS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => toggleInArray('platforms', platform)}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold ${
                      formData.platforms.includes(platform)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface-soft text-text-secondary'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-text-secondary">Supported Attribution Surfaces</p>
              <div className="flex flex-wrap gap-3">
                {SURFACE_OPTIONS.map((surface) => (
                  <button
                    key={surface}
                    type="button"
                    onClick={() => toggleInArray('supportedSurfaces', surface)}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold ${
                      formData.supportedSurfaces.includes(surface)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface-soft text-text-secondary'
                    }`}
                  >
                    {surface}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft px-4 py-3">
            <input
              type="checkbox"
              checked={formData.enableCookies}
              onChange={(event) => setFormData((current) => ({ ...current, enableCookies: event.target.checked }))}
            />
            <div>
              <p className="font-semibold text-text-primary">Enable session attribution persistence</p>
              <p className="text-sm text-text-secondary">Referral sessions stay eligible until the cookie window expires.</p>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-3 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Program'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/store/manager')}
              className="px-5 py-3 rounded-xl border border-border bg-surface-soft font-semibold text-text-primary"
            >
              Back to Store Manager
            </button>
          </div>
        </motion.form>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Partner Queue</h2>
              <p className="text-sm text-text-secondary">Approve, pause, or suspend affiliates from the same workspace.</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Lifetime Earned</p>
              <p className="text-2xl font-bold text-text-primary">${summary.totalEarned.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {partners.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-text-secondary">
                No affiliate partners yet. Approved affiliates will appear here after they generate links or coupons for your program.
              </div>
            ) : (
              partners.map((partner) => (
                <div key={partner.id} className="rounded-2xl border border-border bg-surface-soft p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-primary">{partner.name}</p>
                      <p className="text-sm text-text-secondary">{partner.email || 'No email available'}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        partner.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : partner.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-700'
                            : partner.status === 'suspended'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {partner.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-text-secondary">Clicks</p>
                      <p className="font-semibold text-text-primary">{partner.clicks || 0}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Conversions</p>
                      <p className="font-semibold text-text-primary">{partner.conversions || 0}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Pending</p>
                      <p className="font-semibold text-text-primary">${Number(partner.pendingCommissions || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePartnerStatus(partner.id, 'active')}
                      className="px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerStatus(partner.id, 'paused')}
                      className="px-3 py-2 rounded-xl bg-yellow-500 text-white text-sm font-semibold"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerStatus(partner.id, 'suspended')}
                      className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold"
                    >
                      Suspend
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AffiliateOnboardingPage;
