# File Upload System - Integration Guide

## Quick Start

### 1. Upload a Single Image

```typescript
import { uploadService } from '../services/uploadService';

// Upload a listing image
const response = await uploadService.uploadImage({
  file,
  uploadType: 'listing',
  userId: currentUser.id,
  resourceId: listingId,
  maxSizeKB: 5120
});

console.log('URL:', response.url);
console.log('Size:', response.size);
```

### 2. Use ImageUploader Component

```typescript
import ImageUploader from '../components/ImageUploader';

<ImageUploader
  uploadType="listing"
  resourceId={listingId}
  maxFiles={5}
  onUploadSuccess={(responses) => {
    const urls = responses.map(r => r.url);
    // Save to database
  }}
/>
```

### 3. Display Uploaded Images

```typescript
{images.map((url, idx) => (
  <img
    key={idx}
    src={url}
    alt={`Image ${idx}`}
    className="rounded-lg"
  />
))}
```

---

## Platform-Wide Integration Points

### 1. **Listing Management** (Already Integrated ✓)

**File:** `ListingForm.tsx`

**Integration Points:**
- Step 2: Images & Details
- ImageUploader component replaces file input
- Automatically optimized for 1200×1200px
- Supports up to 5 images per listing
- URLs saved to `formData.images`

**Code:**
```typescript
import ImageUploader from './ImageUploader';
import type { UploadResponse } from '../services/uploadService';

// In ListingForm
const handleImageUpload = (responses: UploadResponse[]) => {
  const urls = responses.map(r => r.url);
  setFormData(prev => ({
    ...prev,
    images: [...prev.images, ...urls]
  }));
};

// In render
<ImageUploader
  uploadType="listing"
  resourceId={listingId}
  maxFiles={5}
  onUploadSuccess={handleImageUpload}
/>
```

---

### 2. **Profile Pictures** (Ready to Integrate)

**File:** `ProfilePictureUploadPage.tsx` (NEW)

**Integration Points:**
- User settings/profile page
- Shows current avatar
- Quick upload & preview
- Automatic removal option
- Updates auth context on save

**Code:**
```typescript
import ProfilePictureUploadPage from '../components/ProfilePictureUploadPage';

// Add to settings page
<ProfilePictureUploadPage
  onSuccess={(url) => console.log('Avatar updated:', url)}
  onError={(error) => console.error(error)}
/>
```

**Where to Add:**
- `AccountSidebar.tsx` - Add "Edit Profile Picture" button
- User settings dashboard → Add ProfilePictureUploadPage component
- Checkout page → Show seller avatar (uses uploaded image)

---

### 3. **Store Branding** (Available for Integration)

**Files:**
- `StoreSetupPage.tsx` - Step 6: Store Branding
- `StoreManagerPage.tsx` - Store settings

**Integration Code:**

```typescript
import ImageUploader from '../components/ImageUploader';
import { storeBuildService } from '../services/storeBuildService';

// In StoreSetupPage
const [logoUrl, setLogoUrl] = useState('');
const [bannerUrl, setBannerUrl] = useState('');

const handleLogoUpload = (responses: UploadResponse[]) => {
  if (responses.length > 0) {
    setLogoUrl(responses[0].url);
  }
};

const handleBannerUpload = (responses: UploadResponse[]) => {
  if (responses.length > 0) {
    setBannerUrl(responses[0].url);
  }
};

// In form submission
const storeData = {
  ...formData,
  logo: logoUrl,
  banner: bannerUrl
};

// Render
<>
  {/* Store Logo */}
  <div>
    <label>Store Logo</label>
    <ImageUploader
      uploadType="store-logo"
      resourceId={storeId}
      maxFiles={1}
      maxSizeKB={2048}
      multiple={false}
      onUploadSuccess={handleLogoUpload}
    />
  </div>

  {/* Store Banner */}
  <div>
    <label>Store Banner</label>
    <ImageUploader
      uploadType="store-banner"
      resourceId={storeId}
      maxFiles={1}
      maxSizeKB={5120}
      multiple={false}
      onUploadSuccess={handleBannerUpload}
    />
  </div>
</>
```

---

### 4. **Review Images** (Available for Integration)

**Files:**
- `ReviewForm.tsx`
- `LeaveReviewModal.tsx`

**Integration Code:**

```typescript
import ImageUploader from '../components/ImageUploader';

// In ReviewForm
const [reviewImages, setReviewImages] = useState<string[]>([]);

const handleReviewImagesUpload = (responses: UploadResponse[]) => {
  const urls = responses.map(r => r.url);
  setReviewImages(urls);
};

// In form submission
const reviewData = {
  rating: formData.rating,
  comment: formData.comment,
  images: reviewImages,  // ← From uploads
  itemId: itemId,
  reviewerId: userId
};

// Render
<ImageUploader
  uploadType="review"
  resourceId={itemId}
  maxFiles={3}
  maxSizeKB={5120}
  multiple={true}
  onUploadSuccess={handleReviewImagesUpload}
/>
```

---

### 5. **Affiliate Program** (Available for Integration)

**Files:**
- `AffiliateOnboarding.tsx`
- Optional: Store asset uploads (logos, banners)

**Integration Code:**

```typescript
// For affiliate store assets (if applicable)
const handleAffiliateAssetUpload = (responses: UploadResponse[]) => {
  const url = responses[0].url;
  setAffiliateData(prev => ({
    ...prev,
    featuredImage: url
  }));
};

<ImageUploader
  uploadType="review"  // Reuse 'review' type for affiliate assets
  maxFiles={1}
  onUploadSuccess={handleAffiliateAssetUpload}
/>
```

---

## Database Integration

### Firestore Collections to Update

```typescript
// 1. listings_v2 - Update with image URLs
await listingsService.updateListing(listingId, {
  images: uploadedUrls
});

// 2. users - Update avatar
await userService.updateUser(userId, {
  avatar: avatarUrl
});

// 3. stores_v2 - Update branding
await storeBuildService.updateStore(storeId, {
  logo: logoUrl,
  banner: bannerUrl
});

// 4. reviews - Add image URLs
await reviewService.updateReview(reviewId, {
  images: reviewImageUrls
});
```

---

## Error Handling Patterns

### Global Error Boundary

```typescript
import { useCallback } from 'react';

// Custom hook for consistent error handling
export const useImageUpload = () => {
  const handleError = useCallback((error: string) => {
    console.error('Upload error:', error);
    
    // Map errors to user-friendly messages
    if (error.includes('File type')) {
      return 'Please upload a valid image file (JPG, PNG, WebP, GIF)';
    }
    if (error.includes('size')) {
      return 'File is too large. Maximum 5MB allowed.';
    }
    if (error.includes('Permission')) {
      return 'You do not have permission to upload. Please check your account status.';
    }
    if (error.includes('Failed to upload')) {
      return 'Upload failed. Please check your internet connection and try again.';
    }
    
    return error;
  }, []);

  return { handleError };
};

// Usage in component
const { handleError } = useImageUpload();

<ImageUploader
  onUploadError={(error) => {
    const userMessage = handleError(error);
    showNotification({ type: 'error', message: userMessage });
  }}
/>
```

---

## Performance Optimization

### Lazy Load Image URLs

```typescript
// Don't store all image URLs in state if not needed
// Instead, fetch them on demand

const getListingImages = async (listingId: string) => {
  const listing = await listingsService.getListing(listingId);
  return listing.images;  // Only when needed
};
```

### Image Caching Strategy

```typescript
// Use React Query or SWR for caching
import { useQuery } from 'react-query';

const { data: images } = useQuery(
  ['listing-images', listingId],
  () => uploadService.listImagesForResource('listing', userId, listingId),
  { staleTime: 1000 * 60 * 5 }  // Cache for 5 minutes
);
```

### Thumbnail Generation

```typescript
// Generate thumbnails for gallery views
const getThumbnailUrl = (fullUrl: string) => {
  return uploadService.getThumbnailUrl(fullUrl, 200, 200);
};

// Use in list views
{listings.map(listing => (
  <img
    src={getThumbnailUrl(listing.images[0])}
    alt="Listing thumbnail"
    className="w-12 h-12 object-cover rounded"
  />
))}
```

---

## Security Checklist

### Firebase Storage Rules

```typescript
// ✓ Completed - See FILE_UPLOAD_SYSTEM_GUIDE.md
// Upload security rules ensure:
// - Users can only upload to their own folders
// - Files are validated for type & size
// - Deletion only allowed by owner
// - Public read access for URLs (via download links)
```

### API-Level Validation

```typescript
// uploadService.ts already includes:
// ✓ File type validation
// ✓ File size validation
// ✓ Image dimension validation
// ✓ User ID isolation in path
// ✓ Custom metadata with timestamp
```

### Recommended Additional Security

```typescript
// 1. Rate limiting (prevents abuse)
const hasExceededUploadLimit = await checkUploadQuota(userId);

// 2. Virus scanning (third-party service)
const scanResult = await virusScan.scan(file);

// 3. Content moderation (flag inappropriate images)
const moderationResult = await contentModerator.analyze(imageUrl);
```

---

## Testing Integration

### Test Checklist

**Upload Service:**
- [ ] Upload valid JPG/PNG/WebP file
- [ ] Reject invalid file types
- [ ] Reject files exceeding 5MB
- [ ] Validate dimensions (min 400×300 required)
- [ ] Verify image optimization applied
- [ ] Get correct download URL
- [ ] Delete uploaded image
- [ ] List images for resource
- [ ] Get image metadata

**ImageUploader Component:**
- [ ] Drag-drop upload works
- [ ] Click-to-browse works
- [ ] Progress bar displays correctly
- [ ] Multiple files upload sequentially
- [ ] Error messages display
- [ ] Retry button works
- [ ] Remove uploaded file
- [ ] Preview grid displays all images
- [ ] Responsive on mobile
- [ ] Max files limit enforced

**Integration Points:**
- [ ] ListingForm: Images save with listing
- [ ] ProfilePicture: Avatar updates auth context
- [ ] StoreSetup: Logo/banner save with store
- [ ] ReviewForm: Review images attach correctly

---

## Rollout Plan

### Phase 3 Deliverables (Current)

✅ **Core Components:**
- uploadService.ts (850 lines)
- ImageUploader.tsx (500 lines)
- ProfilePictureUploadPage.tsx (350 lines)

✅ **Integration:**
- ListingForm.tsx (updated)
- FILE_UPLOAD_SYSTEM_GUIDE.md
- INTEGRATION_GUIDE.md (this file)

### Next Phase: Integrations

**Priority 1 (Do Next):**
- [ ] Update ProfilePictureUploadPage in user settings
- [ ] Add store logo/banner uploads to StoreSetupPage
- [ ] Add review image uploads to LeaveReviewModal

**Priority 2 (Optional Enhancements):**
- [ ] Image cropper component
- [ ] Batch image editor
- [ ] Before/after slider for product rentals
- [ ] 360° product viewer

---

## API Reference

### uploadService Methods

```typescript
// Upload single image
uploadImage(request: UploadRequest): Promise<UploadResponse>

// Upload multiple images
uploadMultiple(requests: UploadRequest[]): Promise<UploadResponse[]>

// Delete image
deleteImage(filePath: string): Promise<void>

// Delete multiple images
deleteMultiple(filePaths: string[]): Promise<void>

// List images for resource
listImagesForResource(
  uploadType: ImageType,
  userId: string,
  resourceId?: string
): Promise<FileMetadata[]>

// Get image URL
getImageUrl(filePath: string): Promise<string>

// Get image metadata
getImageMetadata(filePath: string): Promise<ImageMetadata>

// Get thumbnail URL
getThumbnailUrl(url: string, width?: number, height?: number): string

// Validate dimensions
validateImageDimensions(file: File, ...): Promise<ValidationResult>

// Format file size
formatFileSize(bytes: number): string
```

### ImageUploader Props

```typescript
interface ImageUploaderProps {
  uploadType: 'listing' | 'profile' | 'store-banner' | 'store-logo' | 'review';
  resourceId?: string;
  maxFiles?: number;          // Default: 5
  maxSizeKB?: number;         // Default: 5120
  multiple?: boolean;          // Default: true
  acceptedFormats?: string[]; // Default: all images
  showPreview?: boolean;       // Default: true
  onUploadSuccess?: (responses: UploadResponse[]) => void;
  onUploadError?: (error: string) => void;
}
```

---

## Troubleshooting

### Image Not Uploading

**Check:**
1. File is valid image format (JPG, PNG, WebP, GIF)
2. File size < 5MB
3. User is authenticated
4. Firebase Storage is accessible
5. Browser allows local file access

**Solution:**
```typescript
// Add detailed error logging
try {
  await uploadService.uploadImage({...});
} catch (error) {
  console.error('Upload error:', {
    message: error.message,
    code: error.code,
    timestamp: new Date().toISOString()
  });
}
```

### Slow Upload Speed

**Optimize:**
1. Reduce image quality (0.75-0.80)
2. Reduce max dimensions
3. Use thumbnails for previews
4. Enable browser caching
5. Check network connection

### CORS Errors

**Verify:**
1. Firebase Storage CORS configuration
2. Domain is whitelisted
3. CloudFront distribution setup

---

## Monitoring

### Key Metrics to Track

```typescript
// Uploads per user per day
const uploadCount = await analytics.getUserUploadCount(userId);

// Average file size
const avgSize = await analytics.getAverageUploadSize();

// Success rate
const successRate = await analytics.getUploadSuccessRate();

// Most used upload type
const topType = await analytics.getMostUsedUploadType();
```

### Logging

```typescript
// Log all uploads for audit trail
await firestore.collection('upload_logs').add({
  userId,
  uploadType,
  fileSize: response.size,
  success: true,
  timestamp: new Date(),
  url: response.url,
  format: response.mimeType
});
```

---

## Cost Estimation

### Firebase Storage Pricing (per month)

```
Uploads: $0.05 per GB
Downloads: $0.01 per GB
Operations: $0.0004 per 10k read ops

Example (1000 users, 5 images each):
- Storage: 1000 × 5 images × 100KB = 500MB ≈ $0.03
- Operations: 1000 × 5 = 5000 ops ≈ $0.002
- Monthly estimate: ~$0.05-0.10

Note: Free tier includes 5GB storage + 1GB downloads
```

---

## Next Steps After Phase 3

1. **Phase 4:** Email Service (order confirmations, notifications)
2. **Phase 5:** Customer Dashboard (purchase history, tracking)
3. **Phase 6:** Search & Browse (advanced filters, recommendations)
4. **Phase 7:** Admin Dashboard (moderation, analytics)

---

Last Updated: February 14, 2026
Documentation for File Upload System Integration across Urban Prime V2.0 Platform
