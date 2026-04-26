import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item, PodCatalogTemplate, PodDesignAsset, PodVariantOption } from '../../types';
import podMarketplaceService from '../../services/podMarketplaceService';
import Spinner from '../Spinner';
import { useNotification } from '../../context/NotificationContext';

type PODProductStudioProps = {
  initialItem?: Item | null;
  initialTemplateKey?: string | null;
};

const stepLabels = ['Template', 'Designs', 'Variants', 'Pricing', 'Publish'];

const defaultVariantsForTemplate = (template: PodCatalogTemplate, salePrice?: number, baseCost?: number) => {
  const colors = template.availableColors.slice(0, Math.min(3, template.availableColors.length || 1));
  const sizes = template.availableSizes.slice(0, Math.min(3, template.availableSizes.length || 1));
  const combos =
    sizes.length > 1
      ? colors.flatMap((color) => sizes.map((size) => ({ color, size })))
      : colors.map((color) => ({ color, size: sizes[0] || '' }));

  return combos.slice(0, 6).map((combo, index) => ({
    id: `${template.key}-${combo.color}-${combo.size || 'std'}-${index}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    color: combo.color,
    size: combo.size || undefined,
    sku: `${template.key}-${combo.color}-${combo.size || 'std'}`.toUpperCase().replace(/[^A-Z0-9-]+/g, '-'),
    baseCost: baseCost || template.baseCost,
    salePrice: salePrice || Number((template.baseCost * 2.4).toFixed(2)),
    compareAtPrice: Number(((salePrice || template.baseCost * 2.4) * 1.15).toFixed(2)),
    stock: 999,
    isEnabled: true
  })) as PodVariantOption[];
};

const tagsToText = (tags?: string[]) => (Array.isArray(tags) ? tags.join(', ') : '');

const uploadWellClass =
  'rounded-[26px] border border-[var(--pod-border)] bg-white/[0.04] p-4';

const PODProductStudio: React.FC<PODProductStudioProps> = ({ initialItem, initialTemplateKey }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [catalog, setCatalog] = useState<PodCatalogTemplate[]>([]);
  const [designs, setDesigns] = useState<PodDesignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<'draft' | 'published' | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState(0);
  const [baseCost, setBaseCost] = useState(0);
  const [turnaroundDays, setTurnaroundDays] = useState(4);
  const [brandName, setBrandName] = useState('');
  const [providerLabel, setProviderLabel] = useState('Urban Prime POD');
  const [tagsText, setTagsText] = useState('');
  const [variantOptions, setVariantOptions] = useState<PodVariantOption[]>([]);
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);

  const selectedTemplate = useMemo(
    () => catalog.find((template) => template.key === selectedTemplateKey) || null,
    [catalog, selectedTemplateKey]
  );

  const enabledVariants = useMemo(
    () => variantOptions.filter((variant) => variant.isEnabled !== false),
    [variantOptions]
  );

  const selectedDesigns = useMemo(
    () => designs.filter((design) => selectedDesignIds.includes(design.id)),
    [designs, selectedDesignIds]
  );

  const marginPercent = useMemo(() => {
    if (!salePrice || salePrice <= 0) return 0;
    return Number((((salePrice - baseCost) / salePrice) * 100).toFixed(1));
  }, [baseCost, salePrice]);

  const mockupCount = (coverPreviewUrl ? 1 : 0) + galleryPreviewUrls.length;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [catalogRows, designRows] = await Promise.all([
          podMarketplaceService.getCatalog(),
          podMarketplaceService.getDesigns()
        ]);
        if (cancelled) return;
        setCatalog(catalogRows);
        setDesigns(designRows);
      } catch (error) {
        console.error('POD studio bootstrap failed:', error);
        if (!cancelled) showNotification('Unable to load POD studio right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  useEffect(() => {
    if (!catalog.length) return;
    if (!initialItem) {
      if (!selectedTemplateKey) {
        const firstTemplate =
          catalog.find((template) => template.key === initialTemplateKey) || catalog[0];
        setSelectedTemplateKey(firstTemplate?.key || '');
        setSalePrice(Number((firstTemplate?.baseCost || 10) * 2.4));
        setBaseCost(firstTemplate?.baseCost || 10);
        setTurnaroundDays(firstTemplate?.leadTimeDays || 4);
        setVariantOptions(firstTemplate ? defaultVariantsForTemplate(firstTemplate) : []);
      }
      return;
    }

    const rawItem = initialItem as Item & { metadata?: Record<string, any> };
    const metadata = (rawItem.metadata || {}) as Record<string, any>;
    const podProfile = (initialItem.podProfile || metadata.podProfile || {}) as Record<string, any>;
    const templateKey = String(podProfile.templateKey || catalog[0]?.key || '');
    const template = catalog.find((entry) => entry.key === templateKey) || catalog[0];
    setSelectedTemplateKey(templateKey);
    setStatus(initialItem.status === 'published' ? 'published' : 'draft');
    setTitle(initialItem.title || '');
    setDescription(initialItem.description || '');
    setSalePrice(Number(initialItem.salePrice || metadata.salePrice || 0));
    setBaseCost(Number(podProfile.baseCost || template?.baseCost || 0));
    setTurnaroundDays(Number(podProfile.turnaroundDays || template?.leadTimeDays || 4));
    setBrandName(String(podProfile.brandName || 'Urban Prime Studio'));
    setProviderLabel(String(podProfile.providerLabel || 'Urban Prime POD'));
    setTagsText(tagsToText(metadata.tags));
    setVariantOptions(
      Array.isArray(podProfile.variantOptions) && podProfile.variantOptions.length
        ? (podProfile.variantOptions as PodVariantOption[])
        : template
          ? defaultVariantsForTemplate(
              template,
              Number(initialItem.salePrice || 0),
              Number(podProfile.baseCost || template.baseCost)
            )
          : []
    );
    setSelectedDesignIds(Array.isArray(podProfile.designAssetIds) ? podProfile.designAssetIds : []);
    setExistingImageUrls(
      Array.isArray(podProfile.mockupImageUrls) && podProfile.mockupImageUrls.length
        ? podProfile.mockupImageUrls
        : Array.isArray(metadata.galleryImageUrls)
          ? metadata.galleryImageUrls
          : initialItem.imageUrls || []
    );
  }, [catalog, initialItem, initialTemplateKey, selectedTemplateKey]);

  useEffect(() => {
    if (!selectedTemplate || initialItem) return;
    if (variantOptions.length) return;
    setVariantOptions(defaultVariantsForTemplate(selectedTemplate, salePrice, baseCost || selectedTemplate.baseCost));
  }, [baseCost, initialItem, salePrice, selectedTemplate, variantOptions.length]);

  useEffect(() => {
    const urlsToRevoke: string[] = [];
    const fallbackCover = existingImageUrls[0] || selectedTemplate?.mockupImageUrls[0] || '/icons/urbanprime.svg';
    const nextCover = coverFile ? URL.createObjectURL(coverFile) : fallbackCover;
    if (nextCover.startsWith('blob:')) urlsToRevoke.push(nextCover);

    const fallbackGallery = existingImageUrls.slice(1).length
      ? existingImageUrls.slice(1)
      : selectedTemplate?.mockupImageUrls.slice(1, 4) || [];
    const uploadedGallery = galleryFiles.map((file) => {
      const url = URL.createObjectURL(file);
      urlsToRevoke.push(url);
      return url;
    });

    setCoverPreviewUrl(nextCover);
    setGalleryPreviewUrls(uploadedGallery.length ? uploadedGallery : fallbackGallery);

    return () => {
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [coverFile, existingImageUrls, galleryFiles, selectedTemplate]);

  const toggleDesign = (designId: string) => {
    setSelectedDesignIds((prev) =>
      prev.includes(designId) ? prev.filter((id) => id !== designId) : [...prev, designId]
    );
  };

  const updateVariant = (index: number, patch: Partial<PodVariantOption>) => {
    setVariantOptions((prev) =>
      prev.map((variant, rowIndex) => (rowIndex === index ? { ...variant, ...patch } : variant))
    );
  };

  const addVariantRow = () => {
    if (!selectedTemplate) return;
    setVariantOptions((prev) => [
      ...prev,
      {
        id: `${selectedTemplate.key}-variant-${prev.length + 1}`,
        color: selectedTemplate.availableColors[0] || 'Black',
        size: selectedTemplate.availableSizes[0] || undefined,
        sku: `${selectedTemplate.key}-VAR-${prev.length + 1}`,
        baseCost: baseCost || selectedTemplate.baseCost,
        salePrice: salePrice || Number((selectedTemplate.baseCost * 2.4).toFixed(2)),
        compareAtPrice: salePrice ? Number((salePrice * 1.15).toFixed(2)) : undefined,
        stock: 999,
        isEnabled: true
      }
    ]);
  };

  const submit = async (nextStatus: 'draft' | 'published') => {
    if (!selectedTemplate) {
      showNotification('Select a POD template first.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      showNotification('Title and description are required.');
      return;
    }
    if (!enabledVariants.length) {
      showNotification('Enable at least one POD variant.');
      return;
    }
    if (!selectedDesignIds.length) {
      showNotification('Select at least one design asset.');
      return;
    }

    setSubmitIntent(nextStatus);
    setSubmitting(true);
    try {
      const submission = {
        listingId: initialItem?.id,
        status: nextStatus,
        templateKey: selectedTemplate.key,
        title,
        description,
        category: selectedTemplate.category,
        salePrice,
        baseCost,
        turnaroundDays,
        brandName: brandName || 'Urban Prime Studio',
        providerLabel,
        tags: tagsText
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        designAssetIds: selectedDesignIds,
        variantOptions,
        existingImageUrls,
        coverFile,
        galleryFiles
      };

      if (initialItem?.id) {
        await podMarketplaceService.updateListing(submission);
        showNotification(nextStatus === 'published' ? 'POD listing updated and published.' : 'POD draft updated.');
      } else {
        await podMarketplaceService.createListing(submission);
        showNotification(nextStatus === 'published' ? 'POD listing published.' : 'POD draft created.');
      }
      setStatus(nextStatus);
      navigate('/profile/pod-studio/products');
    } catch (error) {
      console.error('POD listing submit failed:', error);
      showNotification(error instanceof Error ? error.message : 'Unable to save POD listing.');
    } finally {
      setSubmitting(false);
      setSubmitIntent(null);
    }
  };

  if (loading) {
    return (
      <div className="pod-panel flex min-h-[420px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pod-editor-grid">
      <div className="space-y-4">
        <div className="pod-step-rail">
          {stepLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`pod-step-pill ${activeStep === index ? 'is-active' : ''}`}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        <section className={`pod-step-card ${activeStep === 0 ? 'is-active' : ''}`}>
          <div className="pod-step-card-header">
            <div>
              <p className="pod-step-label">Step 1</p>
              <h2 className="pod-step-title">Choose a starter blank</h2>
            </div>
            <div className="pod-badge">{catalog.length} templates</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => {
                  setSelectedTemplateKey(template.key);
                  setBaseCost(template.baseCost);
                  setTurnaroundDays(template.leadTimeDays);
                  setSalePrice((current) =>
                    current > 0 ? current : Number((template.baseCost * 2.4).toFixed(2))
                  );
                  setVariantOptions(
                    defaultVariantsForTemplate(
                      template,
                      salePrice || Number((template.baseCost * 2.4).toFixed(2)),
                      template.baseCost
                    )
                  );
                }}
                className={`pod-catalog-card ${selectedTemplateKey === template.key ? 'is-selected' : ''}`}
              >
                <div className="pod-catalog-media">
                  <img src={template.mockupImageUrls[0]} alt={template.name} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3>{template.name}</h3>
                    <span>{template.category}</span>
                  </div>
                  <p>{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-white/68">
                    <span>Base {template.baseCost.toFixed(2)} USD</span>
                    <span>{template.leadTimeDays} day lead</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={`pod-step-card ${activeStep === 1 ? 'is-active' : ''}`}>
          <div className="pod-step-card-header">
            <div>
              <p className="pod-step-label">Step 2</p>
              <h2 className="pod-step-title">Attach private design assets</h2>
            </div>
            <button
              type="button"
              className="pod-button secondary"
              onClick={() => navigate('/profile/pod-studio/designs')}
            >
              Open design library
            </button>
          </div>
          {designs.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {designs.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => toggleDesign(design.id)}
                  className={`pod-design-card ${selectedDesignIds.includes(design.id) ? 'is-selected' : ''}`}
                >
                  <div className="pod-design-preview">
                    {design.previewUrl ? (
                      <img src={design.previewUrl} alt={design.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="pod-design-fallback">
                        {design.fileName.split('.').pop()?.toUpperCase() || 'ART'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3>{design.title}</h3>
                        <p>{design.fileName}</p>
                      </div>
                      <span>{design.usageCount || 0} uses</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {design.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="pod-badge">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-5 py-8 text-sm text-white/68">
              <p className="font-black text-white">No private design assets yet.</p>
              <p className="mt-2 leading-6 text-white/64">
                Upload source artwork in the design library first, then come back here to attach it to the product.
              </p>
              <button type="button" className="pod-button secondary mt-4" onClick={() => navigate('/profile/pod-studio/designs')}>
                Go to designs
              </button>
            </div>
          )}
        </section>

        <section className={`pod-step-card ${activeStep === 2 ? 'is-active' : ''}`}>
          <div className="pod-step-card-header">
            <div>
              <p className="pod-step-label">Step 3</p>
              <h2 className="pod-step-title">Configure variants and mockups</h2>
            </div>
            <button type="button" className="pod-button secondary" onClick={addVariantRow}>
              Add variant
            </button>
          </div>
          <div className="space-y-3">
            {variantOptions.map((variant, index) => (
              <div key={`${variant.id}-${index}`} className="pod-variant-row">
                <label className="pod-field">
                  <span>Color</span>
                  <select
                    value={variant.color}
                    onChange={(event) => updateVariant(index, { color: event.target.value })}
                  >
                    {(selectedTemplate?.availableColors || [variant.color]).map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pod-field">
                  <span>Size</span>
                  <select
                    value={variant.size || ''}
                    onChange={(event) => updateVariant(index, { size: event.target.value || undefined })}
                  >
                    {(selectedTemplate?.availableSizes || [variant.size || '']).map((size) => (
                      <option key={size || 'default'} value={size || ''}>
                        {size || 'Default'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pod-field">
                  <span>SKU</span>
                  <input
                    value={variant.sku || ''}
                    onChange={(event) => updateVariant(index, { sku: event.target.value })}
                  />
                </label>
                <label className="pod-field">
                  <span>Base cost</span>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.baseCost}
                    onChange={(event) => updateVariant(index, { baseCost: Number(event.target.value || 0) })}
                  />
                </label>
                <label className="pod-field">
                  <span>Sale price</span>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.salePrice}
                    onChange={(event) => updateVariant(index, { salePrice: Number(event.target.value || 0) })}
                  />
                </label>
                <label className="pod-field">
                  <span>Stock</span>
                  <input
                    type="number"
                    value={variant.stock || 999}
                    onChange={(event) => updateVariant(index, { stock: Number(event.target.value || 0) })}
                  />
                </label>
                <label className="pod-switch">
                  <input
                    type="checkbox"
                    checked={variant.isEnabled !== false}
                    onChange={(event) => updateVariant(index, { isEnabled: event.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className={uploadWellClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="pod-step-label">Cover mockup</p>
                {coverFile ? (
                  <button type="button" className="text-xs font-black uppercase tracking-[0.18em] text-white/56" onClick={() => setCoverFile(null)}>
                    Reset
                  </button>
                ) : null}
              </div>
              <div className="pod-summary-media">
                <img
                  src={coverPreviewUrl || '/icons/urbanprime.svg'}
                  alt={title || 'POD preview'}
                  className="h-full w-full object-cover"
                />
              </div>
              <label className="pod-button secondary mt-4 cursor-pointer">
                Select cover
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className={uploadWellClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="pod-step-label">Gallery mockups</p>
                {galleryFiles.length ? (
                  <button type="button" className="text-xs font-black uppercase tracking-[0.18em] text-white/56" onClick={() => setGalleryFiles([])}>
                    Clear uploads
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {galleryPreviewUrls.length ? (
                  galleryPreviewUrls.slice(0, 4).map((url) => (
                    <div key={url} className="pod-design-preview">
                      <img src={url} alt="Mockup preview" className="h-full w-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-[20px] border border-dashed border-white/12 px-4 py-8 text-center text-sm text-white/62">
                    Add alternate angles, colorway shots, or close detail crops.
                  </div>
                )}
              </div>
              <label className="pod-button secondary mt-4 cursor-pointer">
                Add gallery
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => setGalleryFiles(Array.from(event.target.files || []))}
                />
              </label>
            </div>
          </div>
        </section>

        <section className={`pod-step-card ${activeStep === 3 ? 'is-active' : ''}`}>
          <div className="pod-step-card-header">
            <div>
              <p className="pod-step-label">Step 4</p>
              <h2 className="pod-step-title">Set pricing, turnaround, and brand</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="pod-inline-stat">
              <span>Margin</span>
              <strong>{marginPercent}%</strong>
            </div>
            <div className="pod-inline-stat">
              <span>Enabled variants</span>
              <strong>{enabledVariants.length}</strong>
            </div>
            <div className="pod-inline-stat">
              <span>Mockups</span>
              <strong>{mockupCount}</strong>
            </div>
          </div>
          <div className="pod-form-grid mt-4">
            <label className="pod-field">
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Capsule release title" />
            </label>
            <label className="pod-field">
              <span>Brand / collection</span>
              <input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Night Shift Studio" />
            </label>
            <label className="pod-field pod-field-wide">
              <span>Description</span>
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the story, materials, audience, and drop direction."
              />
            </label>
            <label className="pod-field">
              <span>Headline sale price</span>
              <input type="number" step="0.01" value={salePrice} onChange={(event) => setSalePrice(Number(event.target.value || 0))} />
            </label>
            <label className="pod-field">
              <span>Base cost</span>
              <input type="number" step="0.01" value={baseCost} onChange={(event) => setBaseCost(Number(event.target.value || 0))} />
            </label>
            <label className="pod-field">
              <span>Turnaround days</span>
              <input type="number" value={turnaroundDays} onChange={(event) => setTurnaroundDays(Number(event.target.value || 0))} />
            </label>
            <label className="pod-field">
              <span>Fulfillment label</span>
              <input value={providerLabel} onChange={(event) => setProviderLabel(event.target.value)} placeholder="Urban Prime POD" />
            </label>
            <label className="pod-field pod-field-wide">
              <span>Tags</span>
              <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="streetwear, capsule, limited run" />
            </label>
          </div>
        </section>

        <section className={`pod-step-card ${activeStep === 4 ? 'is-active' : ''}`}>
          <div className="pod-step-card-header">
            <div>
              <p className="pod-step-label">Step 5</p>
              <h2 className="pod-step-title">Publish to the marketplace</h2>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/72">
            <p>
              POD v1 is manual fulfillment. Buyers purchase a fixed design, choose a variant, and the seller advances each
              job through the production queue inside POD Studio Orders.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="pod-inline-stat">
              <span>Template</span>
              <strong>{selectedTemplate?.name || 'Choose one'}</strong>
            </div>
            <div className="pod-inline-stat">
              <span>Designs</span>
              <strong>{selectedDesignIds.length}</strong>
            </div>
            <div className="pod-inline-stat">
              <span>Status target</span>
              <strong>{status}</strong>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="pod-button secondary" disabled={submitting} onClick={() => void submit('draft')}>
              {submitIntent === 'draft' && submitting ? 'Saving draft...' : 'Save draft'}
            </button>
            <button type="button" className="pod-button" disabled={submitting} onClick={() => void submit('published')}>
              {submitIntent === 'published' && submitting
                ? 'Publishing...'
                : initialItem?.id
                  ? 'Update & publish'
                  : 'Publish product'}
            </button>
          </div>
        </section>
      </div>

      <aside className="pod-summary-card">
        <p className="pod-step-label">Live summary</p>
        <h3 className="text-2xl font-black tracking-[-0.03em] text-white">
          {title || selectedTemplate?.name || 'Untitled POD product'}
        </h3>
        <div className="pod-summary-media">
          <img src={coverPreviewUrl || '/icons/urbanprime.svg'} alt={title || 'POD preview'} className="h-full w-full object-cover" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="pod-summary-stat">
            <span>Template</span>
            <strong>{selectedTemplate?.name || 'Choose one'}</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Enabled variants</span>
            <strong>{enabledVariants.length}</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Selected designs</span>
            <strong>{selectedDesignIds.length}</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Mockups</span>
            <strong>{mockupCount}</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Headline price</span>
            <strong>${salePrice.toFixed(2)}</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Base cost</span>
            <strong>${baseCost.toFixed(2)}</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Margin</span>
            <strong>{marginPercent}%</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Turnaround</span>
            <strong>{turnaroundDays} days</strong>
          </div>
          <div className="pod-summary-stat">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
        </div>
        {selectedDesigns.length ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <p className="pod-step-label">Attached designs</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDesigns.slice(0, 6).map((design) => (
                <span key={design.id} className="pod-badge">
                  {design.title}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
};

export default PODProductStudio;
