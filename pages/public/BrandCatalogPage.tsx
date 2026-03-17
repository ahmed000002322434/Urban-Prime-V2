import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import brandService from '../../services/brandService';
import type { Brand, BrandCatalogNode, BrandCatalogPath, Item } from '../../types';
import ItemCard from '../../components/ItemCard';
import Spinner from '../../components/Spinner';

const normalizeWildcardPath = (value: string | undefined) => {
  const raw = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  if (!raw || raw.toLowerCase() === 'all') return '';
  return raw;
};

const BrandCatalogPage: React.FC = () => {
  const { brandSlug = '', '*': wildcardPath } = useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [node, setNode] = useState<BrandCatalogNode | null>(null);
  const [children, setChildren] = useState<BrandCatalogNode[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BrandCatalogPath[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceSummary, setPriceSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(() => normalizeWildcardPath(wildcardPath), [wildcardPath]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!brandSlug) return;
      setIsLoading(true);
      setError(null);

      try {
        if (!path) {
          const [brandPayload, itemsPayload] = await Promise.all([
            brandService.getBrandBySlug(brandSlug),
            brandService.getBrandItems(brandSlug, { limit: 24, offset: 0 })
          ]);
          if (ignore) return;
          setBrand(brandPayload.brand);
          setNode(null);
          setChildren(brandPayload.topNodes);
          setBreadcrumbs([]);
          setPriceSummary(brandPayload.priceSummary || brandPayload.brand.priceSummary || null);
          setItems(itemsPayload.data);
        } else {
          const [catalogPayload, itemPayload] = await Promise.all([
            brandService.getBrandCatalogPath(brandSlug, path),
            brandService.getBrandCatalogItems(brandSlug, path, { limit: 24, offset: 0 })
          ]);
          if (ignore) return;
          setBrand(catalogPayload.brand);
          setNode(catalogPayload.node);
          setChildren(catalogPayload.children);
          setBreadcrumbs(catalogPayload.breadcrumbs);
          setPriceSummary(catalogPayload.priceSummary || null);
          setItems(itemPayload.data);
        }
      } catch (err: any) {
        if (ignore) return;
        setError(err?.message || 'Unable to load this catalog path.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [brandSlug, path]);

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
          <h1 className="text-2xl font-bold">Catalog path unavailable</h1>
          <p className="mt-3 text-sm text-text-secondary">{error || 'This path does not exist.'}</p>
          <Link to={`/brands/${brandSlug}`} className="mt-5 inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold">
            Back to brand
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Brand catalog</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em]">{brand.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <Link to={`/brands/${brand.slug}`} className="rounded-full border border-border px-3 py-1 hover:bg-background">{brand.name}</Link>
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.path}>
                <span className="text-text-secondary">/</span>
                <Link to={`/brands/${brand.slug}/${crumb.path}`} className="rounded-full border border-border px-3 py-1 hover:bg-background">
                  {crumb.name}
                </Link>
              </React.Fragment>
            ))}
          </div>
          {node ? (
            <p className="mt-3 text-sm text-text-secondary">{node.name} - {node.nodeType} - depth {node.depth}</p>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">Root lines for {brand.name}.</p>
          )}
        </div>


        {priceSummary ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Price band</p>
              <p className="mt-1 text-lg font-bold">
                {priceSummary.currency} {Number(priceSummary.min || 0).toFixed(0)} - {Number(priceSummary.max || 0).toFixed(0)}
              </p>
              <p className="text-xs text-text-secondary">Median {Number(priceSummary.median || 0).toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Deal range</p>
              <p className="mt-1 text-lg font-bold">
                {priceSummary.currency} {Number(priceSummary.dealBandLow || 0).toFixed(0)} - {Number(priceSummary.dealBandHigh || 0).toFixed(0)}
              </p>
              <p className="text-xs text-text-secondary">Price integrity lens</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">Sample size</p>
              <p className="mt-1 text-lg font-bold">{Number(priceSummary.sampleSize || 0)}</p>
              <p className="text-xs text-text-secondary">Listings analyzed</p>
            </div>
          </div>
        ) : null}


        <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-xl font-bold">Subcategories</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link key={child.id} to={`/brands/${brand.slug}/${child.path}`} className="rounded-2xl border border-border bg-background px-4 py-3 hover:border-primary/50">
                <p className="font-semibold">{child.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-secondary">{child.nodeType}</p>
              </Link>
            ))}
            {children.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
                No deeper subcategories found.
              </div>
            ) : null}
          </div>
        </div>


        <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-xl font-bold">Products In This Path</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onQuickView={() => {}} />
            ))}
            {items.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
                No mapped products yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BrandCatalogPage;

