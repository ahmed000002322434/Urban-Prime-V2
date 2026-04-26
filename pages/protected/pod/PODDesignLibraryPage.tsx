import React, { useEffect, useState } from 'react';
import PODStudioLayout from '../../../components/pod/PODStudioLayout';
import podMarketplaceService from '../../../services/podMarketplaceService';
import type { PodDesignAsset } from '../../../types';
import Spinner from '../../../components/Spinner';
import { useNotification } from '../../../context/NotificationContext';

const PODDesignLibraryPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [assets, setAssets] = useState<PodDesignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [tagsText, setTagsText] = useState('');

  const loadAssets = async () => {
    const response = await podMarketplaceService.getDesigns();
    setAssets(response);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await podMarketplaceService.getDesigns();
        if (!cancelled) setAssets(response);
      } catch (error) {
        console.error('POD designs load failed:', error);
        if (!cancelled) showNotification('Unable to load your POD design library.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotification]);

  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      showNotification('Choose a design file first.');
      return;
    }

    setUploading(true);
    try {
      await podMarketplaceService.uploadDesign(selectedFile, {
        title: title || selectedFile.name.replace(/\.[^/.]+$/, ''),
        tags: tagsText
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      });
      setSelectedFile(null);
      setTitle('');
      setTagsText('');
      await loadAssets();
      showNotification('Design asset uploaded to your private library.');
    } catch (error) {
      console.error('POD design upload failed:', error);
      showNotification(error instanceof Error ? error.message : 'Unable to upload design asset.');
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!window.confirm('Delete this design asset from your private library?')) return;
    try {
      await podMarketplaceService.deleteDesign(assetId);
      await loadAssets();
      showNotification('Design asset removed.');
    } catch (error) {
      console.error('POD design delete failed:', error);
      showNotification('Unable to delete this design asset.');
    }
  };

  return (
    <PODStudioLayout
      eyebrow="Design Library"
      title="Private source files stay here until you attach them to a POD product."
      description="Upload seller-owned art, tag it for reuse, and attach the same source file across multiple POD listings."
      stats={[
        { label: 'Assets', value: String(assets.length), detail: 'Private source files' },
        {
          label: 'In use',
          value: String(assets.filter((asset) => (asset.usageCount || 0) > 0).length),
          detail: 'Attached to active products'
        }
      ]}
    >
      <section className="pod-panel">
        <form onSubmit={submitUpload} className="pod-form-grid">
          <label className="pod-field">
            <span>Source file</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>
          <label className="pod-field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Poster master / chest logo / sleeve print" />
          </label>
          <label className="pod-field pod-field-wide">
            <span>Tags</span>
            <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="streetwear, logo, capsule, poster" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="pod-button" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload design'}
            </button>
          </div>
        </form>
      </section>

      <section className="pod-panel">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <div key={asset.id} className="pod-design-card">
                <div className="pod-design-preview">
                  {asset.previewUrl ? (
                    <img src={asset.previewUrl} alt={asset.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="pod-design-fallback">{asset.fileName.split('.').pop()?.toUpperCase() || 'ART'}</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3>{asset.title}</h3>
                      <p>{asset.fileName}</p>
                    </div>
                    <span className="pod-badge">{asset.usageCount || 0} uses</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map((tag) => (
                      <span key={tag} className="pod-badge">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/48">
                    <span>{(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button type="button" className="pod-button secondary" onClick={() => void deleteAsset(asset.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!assets.length ? (
              <p className="rounded-[28px] border border-dashed border-white/12 bg-white/4 px-5 py-10 text-sm text-white/64 md:col-span-2 xl:col-span-3">
                Your design library is empty. Upload PNG, JPG, WEBP, SVG, or PDF source files to start building POD products.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </PODStudioLayout>
  );
};

export default PODDesignLibraryPage;
