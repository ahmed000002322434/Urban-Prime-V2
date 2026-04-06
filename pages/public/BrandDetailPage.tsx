import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import brandService from '../../services/brandService';
import type { Brand, BrandCatalogNode, Item } from '../../types';
import Spinner from '../../components/Spinner';
import ItemCard from '../../components/ItemCard';
import { useAuth } from '../../hooks/useAuth';

const formatScore = (value?: number | null) => {
  if (!Number.isFinite(Number(value))) return '0.0';
  return Number(value).toFixed(1);
};

const BrandDetailPage: React.FC = () => {
  const { brandSlug = '' } = useParams();
  const { isAuthenticated } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [topNodes, setTopNodes] = useState<BrandCatalogNode[]>([]);
  const [priceSummary, setPriceSummary] = useState<Brand['priceSummary'] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [claimNotes, setClaimNotes] = useState('');
  const [claimEvidenceUrl, setClaimEvidenceUrl] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!brandSlug) return;
      setIsLoading(true);
      setError(null);
      try {
        const [brandPayload, itemsPayload, storesPayload] = await Promise.all([
          brandService.getBrandBySlug(brandSlug),
          brandService.getBrandItems(brandSlug, { limit: 12, offset: 0 }),
          brandService.getBrandStores(brandSlug, { limit: 24, offset: 0 })
        ]);

        if (ignore) return;
        setBrand(brandPayload.brand);
        setTopNodes(brandPayload.topNodes);
        setPriceSummary(brandPayload.priceSummary || brandPayload.brand.priceSummary || null);
        setItems(itemsPayload.data);
        setStores(storesPayload);
      } catch (err: any) {
        if (ignore) return;
        setError(err?.message || 'Unable to load this brand.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [brandSlug]);

  useEffect(() => {
    let ignore = false;
    const loadFollowState = async () => {
      if (!isAuthenticated || !brand?.id) {
        setIsFollowing(false);
        return;
      }
      try {
        const following = await brandService.getBrandFollowState(brand.id);
        if (!ignore) setIsFollowing(following);
      } catch {
        if (!ignore) setIsFollowing(false);
      }
    };

    void loadFollowState();
    return () => {
      ignore = true;
    };
  }, [isAuthenticated, brand?.id]);

  const stats = useMemo(() => brand?.stats || { itemCount: 0, storeCount: 0, followerCount: 0 }, [brand]);
  const priceSnapshot = useMemo(() => priceSummary || brand?.priceSummary || null, [priceSummary, brand]);

  const handleFollowToggle = async () => {
    if (!brand?.id) return;
    if (!isAuthenticated) {
      setActionError('Sign in to follow this brand.');
      return;
    }
    setActionError(null);
    setActionMessage(null);
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await brandService.unfollowBrand(brand.id);
        setIsFollowing(false);
        setActionMessage('You unfollowed this brand.');
      } else {
        await brandService.followBrand(brand.id);
        setIsFollowing(true);
        setActionMessage('You are now following this brand.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Unable to update follow state.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleClaimSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!brand?.id) return;
    if (!isAuthenticated) {
      setActionError('Sign in to submit a brand claim.');
      return;
    }
    setActionError(null);
    setActionMessage(null);
    setIsClaimLoading(true);
    try {
      await brandService.claimBrand(brand.id, {
        notes: claimNotes.trim(),
        evidenceUrl: claimEvidenceUrl.trim() || null,
        source: 'brand_detail_page'
      });
      setActionMessage('Claim request submitted for review.');
      setIsClaimOpen(false);
      setClaimNotes('');
      setClaimEvidenceUrl('');
    } catch (err: any) {
      setActionError(err?.message || 'Unable to submit claim request.');
    } finally {
      setIsClaimLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-text-primary">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 text-text-primary">
        <div className="max-w-xl rounded-3xl border border-border bg-surface p-6 text-center">
          <h1 className="text-2xl font-bold">Brand unavailable</h1>
          <p className="mt-3 text-sm text-text-secondary">{error || 'This brand could not be loaded.'}</p>
          <Link to="/brands" className="mt-5 inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold">
            Back to brands
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={brand.logoUrl || '/icons/urbanprime.svg'}
              alt={brand.name}
              className="h-16 w-16 rounded-2xl border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Canonical brand profile</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.03em]">{brand.name}</h1>
              <p className="mt-2 text-sm text-text-secondary">
                {brand.description || 'Unified profile for all products, lines, stores, and trust intelligence.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{brand.verificationLevel}</span>
                <span className="rounded-full border border-border px-3 py-1">{brand.country || 'Global'}</span>
                {brand.website ? (
                  <a href={brand.website} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 hover:bg-background">
                    Website
                  </a>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/60 disabled:opacity-60"
                >
                  {isFollowLoading ? 'Updating...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsClaimOpen((value) => !value)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/60"
                >
                  {isClaimOpen ? 'Close claim form' : 'Claim this brand'}
                </button>
              </div>
            </div>
            <div className="grid min-w-[220px] grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border bg-background px-3 py-2 text-center">
                <p className="text-lg font-bold">{stats.itemCount}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Items</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-2 text-center">
                <p className="text-lg font-bold">{stats.storeCount}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Stores</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-2 text-center">
                <p className="text-lg font-bold">{stats.followerCount}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Followers</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-2 text-center">
                <p className="text-lg font-bold">{formatScore(brand.trust?.overallTrustScore)}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Trust</p>
              </div>
            </div>
          </div>
          {priceSnapshot ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Price band</p>
                <p className="mt-1 text-lg font-bold">
                  {priceSnapshot.currency} {priceSnapshot.min.toFixed(0)} - {priceSnapshot.max.toFixed(0)}
                </p>
                <p className="text-xs text-text-secondary">Median {priceSnapshot.median.toFixed(0)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Deal range</p>
                <p className="mt-1 text-lg font-bold">
                  {priceSnapshot.currency} {priceSnapshot.dealBandLow.toFixed(0)} - {priceSnapshot.dealBandHigh.toFixed(0)}
                </p>
                <p className="text-xs text-text-secondary">Price integrity lens</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Sample size</p>
                <p className="mt-1 text-lg font-bold">{priceSnapshot.sampleSize}</p>
                <p className="text-xs text-text-secondary">Listings analyzed</p>
              </div>
            </div>
          ) : null}
          {isClaimOpen ? (
            <form onSubmit={handleClaimSubmit} className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-text-primary">Brand claim request</p>
              <p className="mt-1 text-xs text-text-secondary">Add representative details and optional verification link.</p>
              <textarea
                value={claimNotes}
                onChange={(event) => setClaimNotes(event.target.value)}
                placeholder="Representative details, company role, verification context..."
                rows={3}
                className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <input
                value={claimEvidenceUrl}
                onChange={(event) => setClaimEvidenceUrl(event.target.value)}
                placeholder="Evidence URL (optional)"
                className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isClaimLoading}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/60 disabled:opacity-60"
                >
                  {isClaimLoading ? 'Submitting...' : 'Submit claim'}
                </button>
              </div>
            </form>
          ) : null}
          {actionMessage ? (
            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{actionMessage}</div>
          ) : null}
          {actionError ? (
            <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</div>
          ) : null}
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Spotlight brand story</p>
              <h2 className="mt-2 text-xl font-black">Push this brand into Spotlight discovery</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Spotlight posts can lead shoppers into this brand's product lines, stores, and checkout flow without leaving Urban Prime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/spotlight" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-soft">
                Open Spotlight
              </Link>
              <Link to="/spotlight/create" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                Create brand post
              </Link>
              <Link to={`/brands/${brand.slug}/all`} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-soft">
                Browse all products
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Product Lines</h2>
            <Link to={`/brands/${brand.slug}/all`} className="text-sm font-semibold text-primary">Open tree</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topNodes.slice(0, 12).map((node) => (
              <Link
                key={node.id}
                to={`/brands/${brand.slug}/${node.path}`}
                className="rounded-2xl border border-border bg-background px-4 py-3 hover:border-primary/50"
              >
                <p className="text-sm font-semibold">{node.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-secondary">{node.nodeType}</p>
              </Link>
            ))}
            {topNodes.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
                No lines published yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Products</h2>
            <Link to={`/brands/${brand.slug}/all`} className="text-sm font-semibold text-primary">Browse all</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onQuickView={() => {}} />
            ))}
            {items.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
                No products mapped to this brand yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-xl font-bold">Stores Carrying {brand.name}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link key={store.id} to={`/s/${store.slug}`} className="rounded-2xl border border-border bg-background p-4 hover:border-primary/50">
                <p className="font-semibold text-text-primary">{store.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-secondary">Rating {Number(store.rating || 0).toFixed(1)}</p>
              </Link>
            ))}
            {stores.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
                No linked stores yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BrandDetailPage;
