import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import ImageUploader from './ImageUploader';
import type { UploadResponse } from '../services/uploadService';
import { userService } from '../services/itemService';

interface ProfilePictureUploadPageProps {
  userId?: string;
  onSuccess?: (avatarUrl: string) => void;
  onError?: (error: string) => void;
  showDeleteOption?: boolean;
}

const ProfilePictureUploadPage: React.FC<ProfilePictureUploadPageProps> = ({
  userId: propUserId,
  onSuccess,
  onError,
  showDeleteOption = true
}) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const updateUserFn = authContext?.updateUser;
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userId = propUserId || user?.id;

  useEffect(() => {
    // Load current avatar if user has one
    if (user?.avatar) {
      setCurrentAvatar(user.avatar);
    }
  }, [user?.avatar]);

  const handleUploadSuccess = (responses: UploadResponse[]) => {
    if (responses.length > 0) {
      const url = responses[0].url;
      setUploadedUrl(url);
      setError(null);
      setSuccess('Image uploaded successfully. Click "Save as Profile Picture" to confirm.');
    }
  };

  const handleUploadError = (error: string) => {
    setError(error);
    setSuccess(null);
    onError?.(error);
  };

  const handleSaveAsProfilePicture = async () => {
    if (!uploadedUrl || !userId) {
      setError('No image selected or user ID missing');
      return;
    }

    if (!updateUserFn) {
      setError('Auth context not available');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await userService.updateUserProfile(userId, {
        avatar: uploadedUrl
      });
      updateUserFn(updatedUser);
      setCurrentAvatar(updatedUser.avatar || uploadedUrl);
      setUploadedUrl(null);
      setSuccess('Profile picture updated successfully!');
      setError(null);

      // Call parent callback
      onSuccess?.(updatedUser.avatar || uploadedUrl);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile picture';
      setError(message);
      onError?.(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!window.confirm('Remove your profile picture?')) return;

    if (!updateUserFn) {
      setError('Auth context not available');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await userService.updateUserProfile(userId, {
        avatar: '',
        gender: user?.gender
      });
      updateUserFn(updatedUser);

      setCurrentAvatar(updatedUser.avatar || null);
      setUploadedUrl(null);
      setSuccess('Profile picture removed successfully!');
      setError(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove profile picture';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUploadedUrl(null);
    setError(null);
    setSuccess(null);
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 font-medium">Unable to load profile. Please log in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Picture</h1>
          <p className="text-blue-100">Upload or change your profile picture</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Current Avatar */}
          {currentAvatar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center space-y-4"
            >
              <h2 className="text-lg font-semibold text-gray-900">Current Profile Picture</h2>
              <div className="relative">
                <img
                  src={currentAvatar}
                  alt="Current profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
                <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
              </div>

              {showDeleteOption && (
                <button
                  onClick={handleRemoveProfilePicture}
                  disabled={isSaving}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Removing...' : 'Remove Picture'}
                </button>
              )}
            </motion.div>
          )}

          {/* Divider */}
          {currentAvatar && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or upload a new one</span>
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {currentAvatar ? 'Upload New Picture' : 'Upload Profile Picture'}
            </h2>

            {!uploadedUrl && (
              <ImageUploader
                uploadType="profile"
                maxFiles={1}
                maxSizeKB={5120}
                multiple={false}
                showPreview={true}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            )}

            {/* Preview of uploaded image */}
            {uploadedUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center space-y-4">
                  <h3 className="text-md font-medium text-gray-900">Preview</h3>
                  <img
                    src={uploadedUrl}
                    alt="Uploaded preview"
                    className="w-40 h-40 rounded-full object-cover border-4 border-green-200 shadow-lg"
                  />
                  <p className="text-sm text-gray-600 text-center">
                    This image will be used as your profile picture
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center pt-4">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAsProfilePicture}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save as Profile Picture'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <p className="text-green-800 font-medium">Success</p>
              <p className="text-green-700 text-sm mt-1">{success}</p>
            </motion.div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Requirements</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ Supported formats: JPG, PNG, WebP, GIF</li>
            <li>✓ Maximum file size: 5 MB</li>
            <li>✓ Recommended size: 400×400px (square)</li>
            <li>✓ Image will be automatically optimized</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePictureUploadPage;
