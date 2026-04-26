import { auth } from '../firebase';
import { backendFetch, getBackendBaseUrl, isBackendConfigured } from './backendClient';
import { shouldUseLocalMockFallback } from './dataMode';

export type ImageType = 'listing' | 'profile' | 'store-banner' | 'spotlight-banner' | 'store-logo' | 'review';

export interface UploadRequest {
  file: File;
  uploadType: ImageType;
  userId: string;
  resourceId?: string;
  maxSizeKB?: number;
}

export interface UploadResponse {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  path: string;
}

interface OptimizationSettings {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'png';
}

type CachedUpload = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadType: ImageType;
  userId: string;
  resourceId?: string;
};

class UploadService {
  private maxFileSize = 5 * 1024 * 1024;
  private allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private localUploads = new Map<string, CachedUpload>();

  private optimizationPresets: Record<ImageType, OptimizationSettings> = {
    listing: { maxWidth: 1200, maxHeight: 1200, quality: 0.85, format: 'webp' },
    'store-banner': { maxWidth: 1920, maxHeight: 600, quality: 0.8, format: 'webp' },
    'spotlight-banner': { maxWidth: 1800, maxHeight: 720, quality: 0.82, format: 'webp' },
    'store-logo': { maxWidth: 500, maxHeight: 500, quality: 0.9, format: 'png' },
    profile: { maxWidth: 400, maxHeight: 400, quality: 0.85, format: 'jpeg' },
    review: { maxWidth: 800, maxHeight: 800, quality: 0.8, format: 'jpeg' }
  };

  private makeAbsoluteUrl(path: string) {
    if (!path) return path;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    const base = getBackendBaseUrl();
    return base ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : path;
  }

  private async getBackendToken() {
    if (!auth.currentUser) return undefined;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return undefined;
    }
  }

  private fileToDataUrl(fileOrBlob: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file data'));
      reader.readAsDataURL(fileOrBlob);
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const dataUrl = await this.fileToDataUrl(blob);
    const [, base64 = ''] = dataUrl.split(',');
    if (!base64) {
      throw new Error('Failed to encode image to base64');
    }
    return base64;
  }

  private validateFile(file: File, maxSizeKB?: number): { valid: boolean; error?: string } {
    if (!this.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not supported. Allowed: ${this.allowedMimeTypes.join(', ')}`
      };
    }

    const maxSize = maxSizeKB ? maxSizeKB * 1024 : this.maxFileSize;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`
      };
    }

    return { valid: true };
  }

  private async optimizeImage(file: File, uploadType: ImageType): Promise<Blob> {
    const settings = this.optimizationPresets[uploadType];

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          let width = img.width;
          let height = img.height;

          if (width > settings.maxWidth || height > settings.maxHeight) {
            const ratio = Math.min(settings.maxWidth / width, settings.maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            `image/${settings.format}`,
            settings.quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = String(event.target?.result || '');
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private generateFileName(uploadType: ImageType, originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const extension = originalName.split('.').pop() || 'jpg';
    return `${uploadType}_${timestamp}_${random}.${extension}`;
  }

  async uploadImage(request: UploadRequest): Promise<UploadResponse> {
    const validation = this.validateFile(request.file, request.maxSizeKB);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const optimizedBlob = await this.optimizeImage(request.file, request.uploadType);
    const fileName = this.generateFileName(request.uploadType, request.file.name);
    const mimeType = `image/${this.optimizationPresets[request.uploadType].format}`;

    if (isBackendConfigured()) {
      const base64 = await this.blobToBase64(optimizedBlob);
      const token = await this.getBackendToken();
      const response = await backendFetch(
        '/uploads',
        {
          method: 'POST',
          body: JSON.stringify({
            fileName,
            mimeType,
            base64Data: base64,
            owner_firebase_uid: request.userId,
            asset_type: request.uploadType,
            resource_id: request.resourceId || null,
            is_public: true
          })
        },
        token
      );

      const row = response?.data;
      if (!row) {
        throw new Error('Upload response missing payload');
      }

      return {
        url: this.makeAbsoluteUrl(row.public_url || ''),
        fileName: row.file_name || fileName,
        size: row.size_bytes || optimizedBlob.size,
        mimeType: row.mime_type || mimeType,
        uploadedAt: new Date(row.created_at || Date.now()),
        path: row.id || row.storage_path || fileName
      };
    }

    if (!shouldUseLocalMockFallback()) {
      throw new Error('Backend upload unavailable. Configure VITE_BACKEND_URL and run backend server.');
    }

    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const objectUrl = URL.createObjectURL(optimizedBlob);
    this.localUploads.set(id, {
      id,
      url: objectUrl,
      fileName,
      mimeType,
      size: optimizedBlob.size,
      uploadedAt: new Date().toISOString(),
      uploadType: request.uploadType,
      userId: request.userId,
      resourceId: request.resourceId
    });

    return {
      url: objectUrl,
      fileName,
      size: optimizedBlob.size,
      mimeType,
      uploadedAt: new Date(),
      path: id
    };
  }

  async uploadMultiple(requests: UploadRequest[]): Promise<UploadResponse[]> {
    return Promise.all(requests.map((req) => this.uploadImage(req)));
  }

  async deleteImage(filePath: string): Promise<void> {
    if (!filePath) return;

    if (filePath.startsWith('local-')) {
      const cached = this.localUploads.get(filePath);
      if (cached?.url) {
        URL.revokeObjectURL(cached.url);
      }
      this.localUploads.delete(filePath);
      return;
    }

    if (!isBackendConfigured()) {
      return;
    }

    const token = await this.getBackendToken();
    await backendFetch(`/uploads/${encodeURIComponent(filePath)}`, { method: 'DELETE' }, token);
  }

  async deleteMultiple(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map((path) => this.deleteImage(path)));
  }

  async listImagesForResource(
    uploadType: ImageType,
    userId: string,
    resourceId?: string
  ): Promise<Array<{ name: string; path: string; size: number; uploadedAt: string }>> {
    const localRows = Array.from(this.localUploads.values())
      .filter((row) => row.uploadType === uploadType && row.userId === userId && (!resourceId || row.resourceId === resourceId))
      .map((row) => ({
        name: row.fileName,
        path: row.id,
        size: row.size,
        uploadedAt: row.uploadedAt
      }));

    if (!isBackendConfigured()) {
      return localRows;
    }

    try {
      const token = await this.getBackendToken();
      const typeFilter = encodeURIComponent(uploadType);
      const resourceFilter = resourceId ? `&resource_id=${encodeURIComponent(resourceId)}` : '';
      const res = await backendFetch(
        `/uploads?owner_firebase_uid=${encodeURIComponent(userId)}&asset_type=${typeFilter}${resourceFilter}&limit=200`,
        {},
        token
      );
      const rows = Array.isArray(res?.data) ? res.data : [];
      const backendRows = rows.map((row: any) => ({
        name: row.file_name,
        path: row.id,
        size: row.size_bytes,
        uploadedAt: row.created_at
      }));
      return [...backendRows, ...localRows];
    } catch {
      return localRows;
    }
  }

  async getImageUrl(filePath: string): Promise<string> {
    if (filePath.startsWith('local-')) {
      return this.localUploads.get(filePath)?.url || '';
    }

    if (!isBackendConfigured()) {
      return filePath;
    }

    const token = await this.getBackendToken();
    const res = await backendFetch(`/uploads/${encodeURIComponent(filePath)}`, {}, token);
    return this.makeAbsoluteUrl(res?.data?.public_url || filePath);
  }

  async getImageMetadata(filePath: string): Promise<{
    size: number;
    contentType: string;
    uploadedAt: string;
    customMetadata?: Record<string, string>;
  }> {
    if (filePath.startsWith('local-')) {
      const row = this.localUploads.get(filePath);
      if (!row) throw new Error('Local upload not found');
      return {
        size: row.size,
        contentType: row.mimeType,
        uploadedAt: row.uploadedAt,
        customMetadata: { storage: 'local-memory' }
      };
    }

    if (!isBackendConfigured()) {
      throw new Error('Backend not configured');
    }

    const token = await this.getBackendToken();
    const res = await backendFetch(`/uploads/${encodeURIComponent(filePath)}`, {}, token);
    const row = res?.data;
    if (!row) throw new Error('Upload not found');

    return {
      size: row.size_bytes || 0,
      contentType: row.mime_type || 'application/octet-stream',
      uploadedAt: row.created_at || new Date().toISOString(),
      customMetadata: {
        assetType: row.asset_type || 'generic',
        storage: row.storage_driver || 'local_disk'
      }
    };
  }

  getThumbnailUrl(originalUrl: string): string {
    return originalUrl;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  validateImageDimensions(
    file: File,
    minWidth?: number,
    minHeight?: number,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          let error: string | undefined;

          if (minWidth && img.width < minWidth) {
            error = `Image width must be at least ${minWidth}px`;
          } else if (minHeight && img.height < minHeight) {
            error = `Image height must be at least ${minHeight}px`;
          } else if (maxWidth && img.width > maxWidth) {
            error = `Image width must be at most ${maxWidth}px`;
          } else if (maxHeight && img.height > maxHeight) {
            error = `Image height must be at most ${maxHeight}px`;
          }

          resolve({
            valid: !error,
            error,
            width: img.width,
            height: img.height
          });
        };

        img.onerror = () => {
          resolve({
            valid: false,
            error: 'Failed to load image'
          });
        };

        img.src = String(event.target?.result || '');
      };

      reader.onerror = () => {
        resolve({
          valid: false,
          error: 'Failed to read file'
        });
      };

      reader.readAsDataURL(file);
    });
  }
}

export const uploadService = new UploadService();

export default uploadService;
