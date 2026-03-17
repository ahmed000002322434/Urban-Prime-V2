/**
 * @deprecated Legacy listing stack.
 * Active listing workflows (create/edit/lifecycle/profile visibility) must use `itemService`.
 * Retained temporarily for backward compatibility only.
 */
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
  Firestore,
  QueryConstraint,
  and,
  or
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Item } from '../types';

/**
 * Listing creation request interface
 * Stricter than Item interface - requires rental/sale specific fields
 */
export interface CreateListingRequest {
  title: string;
  description: string;
  category: string;
  price?: number;
  rentalPrice?: number;
  rentalPriceType?: 'daily' | 'weekly' | 'monthly';
  listingType: 'sale' | 'rent' | 'both' | 'auction';
  rentalRates?: {
    hourly?: number;
    daily?: number;
    weekly?: number;
  };
  minRentalDuration?: number;
  securityDeposit?: number;
  stock: number;
  brand?: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  sku?: string;
  images: string[];
  features?: string[];
  shippingOptions?: Array<{
    name: string;
    cost: number;
    estimatedDays: number;
  }>;
  returnPolicy?: {
    returnable: boolean;
    days?: number;
    refundType?: 'full' | 'partial';
  };
  warranty?: {
    hasWarranty: boolean;
    type?: string;
    durationMonths?: number;
  };
  isInstantBook?: boolean;
  careInstructions?: string[];
  specifications?: Array<{ key: string; value: string }>;
  materials?: string[];
  dimensionsIn?: { l: number; w: number; h: number };
  weightLbs?: number;
}

/**
 * Listing update request - partial fields allowed
 */
export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  status?: 'published' | 'draft' | 'archived' | 'sold';
  boostLevel?: string;
}

/**
 * Search and filter parameters
 */
export interface ListingsSearchParams {
  category?: string;
  listingType?: 'sale' | 'rent' | 'both' | 'auction';
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  condition?: string;
  sortBy?: 'newest' | 'priceAsc' | 'priceDesc' | 'rating';
  pageSize?: number;
  lastDocId?: string;
}

/**
 * Validation errors for listings
 */
interface ValidationError {
  field: string;
  message: string;
}

class ListingsService {
  private collectionName = 'listings_v2';
  private maxTitleLength = 100;
  private minTitleLength = 5;
  private minDescriptionLength = 20;
  private maxDescriptionLength = 5000;

  /**
   * Validate listing data before saving to Firestore
   */
  private validateListing(
    data: CreateListingRequest | UpdateListingRequest,
    isCreate: boolean = false
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (isCreate) {
      // Required fields on creation
      if (!data.title || data.title.length < this.minTitleLength) {
        errors.push({
          field: 'title',
          message: `Title must be at least ${this.minTitleLength} characters`
        });
      }

      if (!data.description || data.description.length < this.minDescriptionLength) {
        errors.push({
          field: 'description',
          message: `Description must be at least ${this.minDescriptionLength} characters`
        });
      }

      if (data.title && data.title.length > this.maxTitleLength) {
        errors.push({
          field: 'title',
          message: `Title cannot exceed ${this.maxTitleLength} characters`
        });
      }

      if (data.description && data.description.length > this.maxDescriptionLength) {
        errors.push({
          field: 'description',
          message: `Description cannot exceed ${this.maxDescriptionLength} characters`
        });
      }

      if (!data.category) {
        errors.push({
          field: 'category',
          message: 'Category is required'
        });
      }

      if (!data.listingType) {
        errors.push({
          field: 'listingType',
          message: 'Listing type (sale/rent/both/auction) is required'
        });
      }

      if (data.stock === undefined || data.stock < 1) {
        errors.push({
          field: 'stock',
          message: 'Stock must be at least 1'
        });
      }

      if (data.images && data.images.length === 0) {
        errors.push({
          field: 'images',
          message: 'At least one image is required'
        });
      }
    }

    // Conditional required fields based on listing type
    if (data.listingType === 'rent' || data.listingType === 'both') {
      if (isCreate && !data.rentalPrice && !data.rentalRates) {
        errors.push({
          field: 'rentalPrice',
          message: 'Rental price or rates are required for rentals'
        });
      }

      if (data.rentalPrice && data.rentalPrice < 0) {
        errors.push({
          field: 'rentalPrice',
          message: 'Rental price must be non-negative'
        });
      }

      if (data.securityDeposit && data.securityDeposit < 0) {
        errors.push({
          field: 'securityDeposit',
          message: 'Security deposit must be non-negative'
        });
      }

      if (data.minRentalDuration && data.minRentalDuration < 1) {
        errors.push({
          field: 'minRentalDuration',
          message: 'Minimum rental duration must be at least 1 day'
        });
      }
    }

    if (data.listingType === 'sale' || data.listingType === 'both') {
      if (isCreate && !data.price) {
        errors.push({
          field: 'price',
          message: 'Sale price is required for sale listings'
        });
      }

      if (data.price && data.price < 0) {
        errors.push({
          field: 'price',
          message: 'Price must be non-negative'
        });
      }
    }

    if (data.listingType === 'auction') {
      if (data.price && data.price < 0) {
        errors.push({
          field: 'price',
          message: 'Starting bid must be non-negative'
        });
      }
    }

    // Validate rental rates if provided
    if (data.rentalRates) {
      if (data.rentalRates.daily && data.rentalRates.daily < 0) {
        errors.push({
          field: 'rentalRates.daily',
          message: 'Daily rental rate must be non-negative'
        });
      }
      if (data.rentalRates.weekly && data.rentalRates.weekly < 0) {
        errors.push({
          field: 'rentalRates.weekly',
          message: 'Weekly rental rate must be non-negative'
        });
      }
      if (data.rentalRates.hourly && data.rentalRates.hourly < 0) {
        errors.push({
          field: 'rentalRates.hourly',
          message: 'Hourly rental rate must be non-negative'
        });
      }
    }

    // Validate dimensions and weight
    if (data.dimensionsIn) {
      if (data.dimensionsIn.l < 0 || data.dimensionsIn.w < 0 || data.dimensionsIn.h < 0) {
        errors.push({
          field: 'dimensionsIn',
          message: 'Dimensions must be non-negative'
        });
      }
    }

    if (data.weightLbs && data.weightLbs < 0) {
      errors.push({
        field: 'weightLbs',
        message: 'Weight must be non-negative'
      });
    }

    return errors;
  }

  /**
   * Create a new listing for a seller
   */
  async createListing(sellerId: string, listingData: CreateListingRequest): Promise<Item> {
    try {
      // Validate input
      const validationErrors = this.validateListing(listingData, true);
      if (validationErrors.length > 0) {
        throw new Error(
          `Validation failed: ${validationErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
        );
      }

      // Prepare document data
      const docData = {
        ...listingData,
        sellerId,
        ownerId: sellerId,
        owner: {
          id: sellerId,
          name: '',
          avatar: ''
        },
        status: 'draft' as const,
        avgRating: 0,
        reviews: [],
        imageUrls: listingData.images || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        bookedDates: [],
        version: '1.0'
      };

      // Save to Firestore
      const listingsRef = collection(db, this.collectionName);
      const docRef = await addDoc(listingsRef, docData);

      // Return created listing with ID
      return {
        id: docRef.id,
        ...docData,
        createdAt: new Date().toISOString()
      } as Item;
    } catch (error) {
      console.error('[listingsService] Error creating listing:', error);
      throw new Error(
        `Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update an existing listing
   */
  async updateListing(listingId: string, updates: UpdateListingRequest): Promise<Item> {
    try {
      // Validate updates
      const validationErrors = this.validateListing(updates, false);
      if (validationErrors.length > 0) {
        throw new Error(
          `Validation failed: ${validationErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
        );
      }

      // Get current listing for permission check
      const listingRef = doc(db, this.collectionName, listingId);
      const currentListing = await getDoc(listingRef);

      if (!currentListing.exists()) {
        throw new Error('Listing not found');
      }

      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      // Update in Firestore
      await updateDoc(listingRef, updateData);

      // Return updated listing
      const updated = await getDoc(listingRef);
      const data = updated.data();

      return {
        id: updated.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as Item;
    } catch (error) {
      console.error('[listingsService] Error updating listing:', error);
      throw new Error(
        `Failed to update listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Publish a draft listing
   */
  async publishListing(listingId: string): Promise<void> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        throw new Error('Listing not found');
      }

      await updateDoc(listingRef, {
        status: 'published',
        updatedAt: Timestamp.now(),
        publishedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[listingsService] Error publishing listing:', error);
      throw new Error(
        `Failed to publish listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Unpublish a listing (move to draft)
   */
  async unpublishListing(listingId: string): Promise<void> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        throw new Error('Listing not found');
      }

      await updateDoc(listingRef, {
        status: 'draft',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[listingsService] Error unpublishing listing:', error);
      throw new Error(
        `Failed to unpublish listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a listing
   */
  async deleteListing(listingId: string): Promise<void> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        throw new Error('Listing not found');
      }

      await deleteDoc(listingRef);
    } catch (error) {
      console.error('[listingsService] Error deleting listing:', error);
      throw new Error(
        `Failed to delete listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all listings for a specific seller
   */
  async getSellerListings(
    sellerId: string,
    options?: {
      includeArchived?: boolean;
      status?: 'published' | 'draft' | 'archived' | 'sold';
    }
  ): Promise<Item[]> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const constraints: QueryConstraint[] = [where('sellerId', '==', sellerId)];

      if (options?.status) {
        constraints.push(where('status', '==', options.status));
      } else if (!options?.includeArchived) {
        constraints.push(where('status', 'in', ['published', 'draft']));
      }

      constraints.push(orderBy('createdAt', 'desc'));

      const q = query(listingsRef, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
        } as Item;
      });
    } catch (error) {
      console.error('[listingsService] Error fetching seller listings:', error);
      throw new Error(
        `Failed to fetch listings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single listing by ID
   */
  async getListing(listingId: string): Promise<Item | null> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        return null;
      }

      const data = listing.data();
      return {
        id: listing.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as Item;
    } catch (error) {
      console.error('[listingsService] Error fetching listing:', error);
      throw new Error(
        `Failed to fetch listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search and filter published listings
   */
  async searchListings(params: ListingsSearchParams): Promise<{
    listings: Item[];
    totalResults: number;
  }> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const constraints: QueryConstraint[] = [where('status', '==', 'published')];

      // Category filter
      if (params.category) {
        constraints.push(where('category', '==', params.category));
      }

      // Listing type filter
      if (params.listingType) {
        constraints.push(where('listingType', '==', params.listingType));
      }

      // Price range filter - simplified for Firestore query limitations
      if (params.minPrice !== undefined) {
        constraints.push(where('price', '>=', params.minPrice));
      }

      if (params.maxPrice !== undefined) {
        constraints.push(where('price', '<=', params.maxPrice));
      }

      // Add sorting
      const sortField = this.mapSortBy(params.sortBy);
      const direction = params.sortBy === 'priceAsc' ? 'asc' : 'desc';
      constraints.push(orderBy(sortField, direction));

      // Pagination
      constraints.push(limit((params.pageSize || 20) + 1));

      const q = query(listingsRef, ...constraints);
      const snapshot = await getDocs(q);

      // Filter by search query client-side if provided
      let listings = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
        } as Item;
      });

      if (params.searchQuery) {
        const query_lower = params.searchQuery.toLowerCase();
        listings = listings.filter(
          (item: Item) =>
            item.title?.toLowerCase().includes(query_lower) ||
            item.description?.toLowerCase().includes(query_lower)
        );
      }

      return {
        listings: listings.slice(0, params.pageSize || 20),
        totalResults: listings.length
      };
    } catch (error) {
      console.error('[listingsService] Error searching listings:', error);
      throw new Error(
        `Failed to search listings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get listings by category
   */
  async getListingsByCategory(
    category: string,
    listingType?: 'sale' | 'rent' | 'both'
  ): Promise<Item[]> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const constraints: QueryConstraint[] = [
        where('status', '==', 'published'),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(50)
      ];

      if (listingType) {
        constraints.push(where('listingType', '==', listingType));
      }

      const q = query(listingsRef, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
        } as Item;
      });
    } catch (error) {
      console.error('[listingsService] Error fetching listings by category:', error);
      throw new Error(
        `Failed to fetch category listings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Archive a listing
   */
  async archiveListing(listingId: string): Promise<void> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        throw new Error('Listing not found');
      }

      await updateDoc(listingRef, {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[listingsService] Error archiving listing:', error);
      throw new Error(
        `Failed to archive listing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get listing statistics for dashboard
   */
  async getListingStats(sellerId: string): Promise<{
    totalListings: number;
    publishedListings: number;
    draftListings: number;
    totalStock: number;
    totalValue: number;
  }> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const q = query(listingsRef, where('sellerId', '==', sellerId));
      const snapshot = await getDocs(q);

      let totalListings = 0;
      let publishedListings = 0;
      let draftListings = 0;
      let totalStock = 0;
      let totalValue = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalListings++;

        if (data.status === 'published') publishedListings++;
        if (data.status === 'draft') draftListings++;

        totalStock += data.stock || 0;
        totalValue += (data.price || 0) * (data.stock || 0);
      });

      return {
        totalListings,
        publishedListings,
        draftListings,
        totalStock,
        totalValue
      };
    } catch (error) {
      console.error('[listingsService] Error fetching listing stats:', error);
      throw new Error(
        `Failed to fetch stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Mark listing as sold (for sale listings)
   */
  async markAsSold(listingId: string): Promise<void> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        throw new Error('Listing not found');
      }

      await updateDoc(listingRef, {
        status: 'sold',
        stock: 0,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[listingsService] Error marking listing as sold:', error);
      throw new Error(
        `Failed to mark sold: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update item availability (for rentals)
   */
  async updateAvailability(
    listingId: string,
    bookedDates: string[],
    availableStock?: number
  ): Promise<void> {
    try {
      const listingRef = doc(db, this.collectionName, listingId);
      const listing = await getDoc(listingRef);

      if (!listing.exists()) {
        throw new Error('Listing not found');
      }

      const updateData: any = {
        bookedDates,
        updatedAt: Timestamp.now()
      };

      if (availableStock !== undefined) {
        updateData.stock = availableStock;
      }

      await updateDoc(listingRef, updateData);
    } catch (error) {
      console.error('[listingsService] Error updating availability:', error);
      throw new Error(
        `Failed to update availability: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Bulk update listings status
   */
  async bulkUpdateStatus(listingIds: string[], status: 'published' | 'draft' | 'archived'): Promise<void> {
    try {
      for (const listingId of listingIds) {
        const listingRef = doc(db, this.collectionName, listingId);
        await updateDoc(listingRef, {
          status,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('[listingsService] Error bulk updating listings:', error);
      throw new Error(
        `Failed to bulk update listings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map sortBy param to Firestore field
   */
  private mapSortBy(sortBy?: string): string {
    switch (sortBy) {
      case 'priceAsc':
      case 'priceDesc':
        return 'price';
      case 'rating':
        return 'avgRating';
      case 'newest':
      default:
        return 'createdAt';
    }
  }
}

// Export singleton instance
export const listingsService = new ListingsService();

export default listingsService;
