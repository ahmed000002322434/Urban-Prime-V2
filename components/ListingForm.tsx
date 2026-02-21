import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CreateListingRequest, UpdateListingRequest } from '../services/listingsService';
import type { UploadResponse } from '../services/uploadService';
import type { Item } from '../types';
import { listingsService } from '../services/listingsService';
import ImageUploader from './ImageUploader';

interface ListingFormProps {
  initialData?: Item | null;
  onSuccess?: (listing: Item) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
  sellerId: string;
}

const ListingForm: React.FC<ListingFormProps> = ({
  initialData,
  onSuccess,
  onError,
  isLoading = false,
  sellerId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [listingId, setListingId] = useState<string | undefined>(initialData?.id);
  const [formData, setFormData] = useState<CreateListingRequest>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    price: initialData?.price || 0,
    rentalPrice: initialData?.rentalPrice || 0,
    rentalPriceType: initialData?.rentalPriceType || 'daily',
    listingType: initialData?.listingType as any || 'both',
    rentalRates: initialData?.rentalRates || { daily: 0, weekly: 0 },
    minRentalDuration: initialData?.minRentalDuration || 1,
    securityDeposit: initialData?.securityDeposit || 0,
    stock: initialData?.stock || 1,
    brand: initialData?.brand || '',
    condition: initialData?.condition as any || 'new',
    sku: initialData?.sku || '',
    images: initialData?.images || [],
    features: initialData?.features || [],
    isInstantBook: initialData?.isInstantBook || false,
    careInstructions: initialData?.careInstructions || [],
    specifications: initialData?.specifications || [],
    materials: initialData?.materials || [],
    dimensionsIn: initialData?.dimensionsIn || { l: 0, w: 0, h: 0 },
    weightLbs: initialData?.weightLbs || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>(formData.images || []);

  const steps = [
    { title: 'Basic Info', icon: '📝' },
    { title: 'Pricing', icon: '💰' },
    { title: 'Images & Details', icon: '📸' },
    { title: 'Specifications', icon: '⚙️' }
  ];

  const categories = [
    'Electronics',
    'Fashion',
    'Furniture',
    'Tools',
    'Sports',
    'Books',
    'Toys',
    'Home & Garden',
    'Vehicles',
    'Other'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev as any)[parent],
        [field]: value
      }
    }));
  };

  const handleArrayInputChange = (field: string, index: number, subField?: string, value?: any) => {
    const array = [...((formData as any)[field] || [])];

    if (subField && value !== undefined) {
      array[index] = { ...array[index], [subField]: value };
    } else if (value !== undefined) {
      array[index] = value;
    } else {
      array.splice(index, 1);
    }

    handleInputChange(field, array);
  };

  const handleImageUpload = (responses: UploadResponse[]) => {
    // Upload complete - add URLs to form data
    const uploadedUrls = responses.map((r) => r.url);
    const newImages = [...formData.images, ...uploadedUrls];
    handleInputChange('images', newImages);
    setImagePreview(newImages);
  };

  const handleImageUploadError = (error: string) => {
    console.error('Image upload error:', error);
    setErrors((prev) => ({
      ...prev,
      images: error
    }));
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newPreview = imagePreview.filter((_, i) => i !== index);
    handleInputChange('images', newImages);
    setImagePreview(newPreview);
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      // Basic info validation
      if (!formData.title || formData.title.length < 5) {
        newErrors.title = 'Title must be at least 5 characters';
      }
      if (!formData.description || formData.description.length < 20) {
        newErrors.description = 'Description must be at least 20 characters';
      }
      if (!formData.category) {
        newErrors.category = 'Category is required';
      }
      if (!formData.listingType) {
        newErrors.listingType = 'Listing type is required';
      }
      if (!formData.stock || formData.stock < 1) {
        newErrors.stock = 'Stock must be at least 1';
      }
    }

    if (currentStep === 1) {
      // Pricing validation
      if (formData.listingType === 'sale' || formData.listingType === 'both') {
        if (!formData.price || formData.price < 0) {
          newErrors.price = 'Sale price is required and must be non-negative';
        }
      }
      if (formData.listingType === 'rent' || formData.listingType === 'both') {
        if (!formData.rentalPrice && !formData.rentalRates?.daily) {
          newErrors.rentalPrice = 'Rental price or daily rate is required';
        }
      }
    }

    if (currentStep === 2) {
      // Images validation
      if (!formData.images || formData.images.length === 0) {
        newErrors.images = 'At least one image is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep()) return;

    setIsSubmitting(true);

    try {
      let result: Item;

      if (initialData) {
        // Update existing listing
        result = await listingsService.updateListing(initialData.id, formData as UpdateListingRequest);
      } else {
        // Create new listing
        result = await listingsService.createListing(sellerId, formData);
      }

      onSuccess?.(result);
      setCurrentStep(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save listing';
      onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Title *
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g., Canon EOS R5 Professional Camera"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.title?.length || 0}/100 characters
              </div>
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                maxLength={5000}
                rows={6}
                placeholder="Describe your item in detail. Include condition, features, any defects..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description?.length || 0}/5000 characters
              </div>
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['sale', 'rent', 'both', 'auction'].map((type) => (
                  <label
                    key={type}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                      formData.listingType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="listingType"
                      value={type}
                      checked={formData.listingType === type}
                      onChange={(e) => handleInputChange('listingType', e.target.value)}
                      className="mr-2"
                    />
                    <span className="capitalize">{type === 'both' ? 'For Sale & Rent' : type}</span>
                  </label>
                ))}
              </div>
              {errors.listingType && <p className="text-red-500 text-sm mt-1">{errors.listingType}</p>}
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Stock *
              </label>
              <input
                type="number"
                min={1}
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 1)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.stock ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
            </div>

            {/* Brand & Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <input
                  type="text"
                  placeholder="e.g., Canon"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
                <select
                  value={formData.condition}
                  onChange={(e) => handleInputChange('condition', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Sale Price */}
            {(formData.listingType === 'sale' || formData.listingType === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Price {formData.listingType === 'sale' && '*'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.price ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>
            )}

            {/* Rental Price */}
            {(formData.listingType === 'rent' || formData.listingType === 'both') && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Rental Pricing</h3>

                {/* Price Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Rental Price Type
                  </label>
                  <select
                    value={formData.rentalPriceType}
                    onChange={(e) => handleInputChange('rentalPriceType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Base Rental Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Rental Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      value={formData.rentalPrice}
                      onChange={(e) => handleInputChange('rentalPrice', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Tiered Rates */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Tiered Rates (Optional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['hourly', 'daily', 'weekly'] as const).map((period) => (
                      <div key={period}>
                        <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                          {period}
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            step={0.01}
                            min={0}
                            placeholder="0.00"
                            value={formData.rentalRates?.[period] || ''}
                            onChange={(e) =>
                              handleNestedChange('rentalRates', period, parseFloat(e.target.value) || 0)
                            }
                            className="w-full pl-6 pr-2 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Min Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rental Duration (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.minRentalDuration}
                    onChange={(e) => handleInputChange('minRentalDuration', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Security Deposit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Deposit (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      value={formData.securityDeposit}
                      onChange={(e) => handleInputChange('securityDeposit', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Instant Book */}
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.isInstantBook}
                    onChange={(e) => handleInputChange('isInstantBook', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Enable Instant Book (customers can book without approval)
                  </span>
                </label>
              </div>
            )}

            {errors.rentalPrice && <p className="text-red-500 text-sm">{errors.rentalPrice}</p>}
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images * (Upload at least 1)
              </label>
              
              <ImageUploader
                uploadType="listing"
                resourceId={listingId}
                maxFiles={5}
                maxSizeKB={5120}
                multiple={true}
                showPreview={true}
                onUploadSuccess={handleImageUpload}
                onUploadError={handleImageUploadError}
              />

              {/* Display uploaded images with delete option */}
              {imagePreview.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {imagePreview.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${idx}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Features
              </label>
              <div className="space-y-2">
                {formData.features?.map((feature, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleArrayInputChange('features', idx, undefined, e.target.value)}
                      placeholder="e.g., Weather-resistant, 4K resolution"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleArrayInputChange('features', idx, undefined, undefined)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleInputChange('features', [...(formData.features || []), ''])
                  }
                  className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition"
                >
                  + Add Feature
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Specifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specifications
              </label>
              <div className="space-y-2">
                {formData.specifications?.map((spec, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) =>
                        handleArrayInputChange('specifications', idx, 'key', e.target.value)
                      }
                      placeholder="Specification name"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) =>
                        handleArrayInputChange('specifications', idx, 'value', e.target.value)
                      }
                      placeholder="Value"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleArrayInputChange('specifications', idx, undefined, undefined)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleInputChange('specifications', [
                      ...(formData.specifications || []),
                      { key: '', value: '' }
                    ])
                  }
                  className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition"
                >
                  + Add Specification
                </button>
              </div>
            </div>

            {/* Dimensions & Weight */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-medium text-gray-900">Shipping Details</h3>

              <div className="grid grid-cols-3 gap-3">
                {(['l', 'w', 'h'] as const).map((dim) => (
                  <div key={dim}>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase">
                      {dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'} (in)
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      value={formData.dimensionsIn?.[dim] || ''}
                      onChange={(e) =>
                        handleNestedChange('dimensionsIn', dim, parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                      className="w-full px-2 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  value={formData.weightLbs}
                  onChange={(e) => handleInputChange('weightLbs', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Care Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Care Instructions
              </label>
              <div className="space-y-2">
                {formData.careInstructions?.map((instruction, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) =>
                        handleArrayInputChange('careInstructions', idx, undefined, e.target.value)
                      }
                      placeholder="e.g., Hand wash in cold water"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleArrayInputChange('careInstructions', idx, undefined, undefined)
                      }
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    handleInputChange('careInstructions', [...(formData.careInstructions || []), ''])
                  }
                  className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition"
                >
                  + Add Instruction
                </button>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center flex-1">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition ${
                idx === currentStep
                  ? 'bg-blue-600 text-white'
                  : idx < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {idx < currentStep ? '✓' : step.icon}
            </motion.div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition ${
                  idx < currentStep ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{steps[currentStep].title}</h2>

      {/* Form Content */}
      <div className="bg-white rounded-lg mb-8">{renderStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Previous
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isSubmitting || isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              `${initialData ? 'Update' : 'Create'} Listing`
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
};

export default ListingForm;
