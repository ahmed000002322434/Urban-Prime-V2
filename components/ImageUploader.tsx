import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadService, type UploadResponse, type ImageType } from '../services/uploadService';
import { useAuth } from '../context/AuthContext';

interface ImageUploaderProps {
  uploadType: ImageType;
  resourceId?: string;
  onUploadSuccess?: (responses: UploadResponse[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxSizeKB?: number;
  multiple?: boolean;
  acceptedFormats?: string;
  showPreview?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: UploadResponse;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  uploadType,
  resourceId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 5,
  maxSizeKB = 5120,
  multiple = true,
  acceptedFormats = 'image/jpeg,image/png,image/gif,image/webp',
  showPreview = true
}) => {
  const { user } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResponse[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Generate unique ID for uploading file
   */
  const generateId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Handle file selection
   */
  const handleFiles = async (files: FileList | null) => {
    if (!files || !user?.id) return;

    const fileArray = Array.from(files);

    // Check max files
    if (fileArray.length > maxFiles) {
      const error = `Maximum ${maxFiles} files allowed`;
      onUploadError?.(error);
      return;
    }

    if (uploadedFiles.length + uploadingFiles.length + fileArray.length > maxFiles) {
      const error = `Cannot exceed ${maxFiles} total files`;
      onUploadError?.(error);
      return;
    }

    // Create uploading file entries
    const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
      id: generateId(),
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    // Process uploads
    for (const uploadingFile of newUploadingFiles) {
      await uploadFile(uploadingFile.id, uploadingFile.file);
    }
  };

  /**
   * Upload single file
   */
  const uploadFile = async (fileId: string, file: File) => {
    try {
      // Update status to uploading
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'uploading', progress: 10 } : f
        )
      );

      // Upload file
      const response = await uploadService.uploadImage({
        file,
        uploadType,
        userId: user?.id || '',
        resourceId,
        maxSizeKB
      });

      // Update status to success
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'success', progress: 100, result: response }
            : f
        )
      );

      // Add to uploaded files
      setUploadedFiles((prev) => [...prev, response]);

      // Simulate progress
      let progress = 10;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 90) progress = 90;

        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        );
      }, 200);

      clearInterval(interval);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );

      onUploadError?.(errorMessage);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  /**
   * Remove uploaded file
   */
  const removeUploadedFile = async (index: number) => {
    const file = uploadedFiles[index];

    try {
      await uploadService.deleteImage(file.path);
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  /**
   * Remove uploading file
   */
  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  /**
   * Retry failed upload
   */
  const retryUpload = async (fileId: string) => {
    const uploadingFile = uploadingFiles.find((f) => f.id === fileId);
    if (uploadingFile) {
      await uploadFile(fileId, uploadingFile.file);
    }
  };

  /**
   * Check if upload is complete
   */
  const isUploadComplete = () => {
    if (uploadingFiles.length === 0) {
      if (uploadedFiles.length > 0) {
        onUploadSuccess?.(uploadedFiles);
      }
      return true;
    }
    return false;
  };

  React.useEffect(() => {
    isUploadComplete();
  }, [uploadingFiles]);

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      {(uploadedFiles.length < maxFiles || multiple) && (
        <motion.div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          animate={{
            scale: isDragging ? 1.02 : 1,
            borderColor: isDragging ? '#3b82f6' : '#e5e7eb'
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
            isDragging ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple && uploadedFiles.length < maxFiles}
            accept={acceptedFormats}
            onChange={handleInputChange}
            className="hidden"
            disabled={uploadingFiles.some((f) => f.status === 'uploading')}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer"
          >
            <motion.div
              animate={{ scale: isDragging ? 1.1 : 1 }}
              className="text-4xl mb-3"
            >
              📸
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Drag & drop images here
            </h3>
            <p className="text-sm text-gray-600">or click to browse</p>
            <p className="text-xs text-gray-500 mt-2">
              {uploadedFiles.length}/{maxFiles} images uploaded
            </p>
            <p className="text-xs text-gray-500">
              Max size: {(maxSizeKB / 1024).toFixed(1)}MB per image
            </p>
          </div>
        </motion.div>
      )}

      {/* Uploading Files */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 rounded-lg p-4 space-y-3"
          >
            <h4 className="text-sm font-semibold text-gray-900">
              Uploading ({uploadingFiles.length})
            </h4>

            {uploadingFiles.map((uploadingFile) => (
              <motion.div
                key={uploadingFile.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                {/* Status Icon */}
                {uploadingFile.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                {uploadingFile.status === 'success' && (
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {uploadingFile.status === 'error' && (
                  <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">!</span>
                  </div>
                )}
                {uploadingFile.status === 'pending' && (
                  <div className="w-5 h-5 bg-gray-300 rounded-full flex-shrink-0" />
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${uploadingFile.progress}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-gray-600 min-w-max">
                      {uploadingFile.progress}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {uploadingFile.status === 'error' && (
                  <button
                    onClick={() => retryUpload(uploadingFile.id)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                    title="Retry upload"
                  >
                    🔄
                  </button>
                )}

                <button
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="p-1 text-gray-600 hover:bg-gray-200 rounded transition"
                  title="Remove"
                  disabled={uploadingFile.status === 'uploading'}
                >
                  ×
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-green-50 rounded-lg p-4 space-y-3"
          >
            <h4 className="text-sm font-semibold text-gray-900">
              Uploaded ({uploadedFiles.length}/{maxFiles})
            </h4>

            <div className={`grid gap-3 ${showPreview ? 'grid-cols-2 md:grid-cols-3' : 'space-y-2'}`}>
              {uploadedFiles.map((file, idx) => (
                <motion.div
                  key={file.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`relative group ${showPreview ? '' : 'flex items-center justify-between bg-green-100 p-3 rounded-lg'}`}
                >
                  {showPreview && (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
                      <img
                        src={file.url}
                        alt={`Preview ${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-300 transition"
                          title="View full size"
                        >
                          🔗
                        </a>
                      </div>
                    </div>
                  )}

                  {!showPreview && (
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {uploadService.formatFileSize(file.size)}
                      </p>
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => removeUploadedFile(idx)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                    title="Delete image"
                  >
                    ×
                  </button>

                  {/* File Info Tooltip */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black/75 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition">
                    <p>{uploadService.formatFileSize(file.size)}</p>
                    <p>{file.mimeType}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Uploaded URLs (for copying) */}
            <details className="mt-4">
              <summary className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                📋 View URLs
              </summary>
              <div className="mt-2 space-y-2 bg-gray-100 p-3 rounded max-h-48 overflow-y-auto">
                {uploadedFiles.map((file, idx) => (
                  <div key={file.path} className="text-xs">
                    <p className="text-gray-600 mb-1">Image {idx + 1}:</p>
                    <input
                      type="text"
                      value={file.url}
                      readOnly
                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 font-mono text-xs"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                ))}
              </div>
            </details>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {uploadingFiles.some((f) => f.status === 'error') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm"
        >
          <p className="font-semibold mb-2">⚠️ Upload Errors</p>
          <ul className="list-disc list-inside space-y-1">
            {uploadingFiles
              .filter((f) => f.status === 'error')
              .map((f) => (
                <li key={f.id}>
                  {f.file.name}: {f.error}
                </li>
              ))}
          </ul>
        </motion.div>
      )}

      {/* Success Message */}
      {uploadedFiles.length > 0 &&
        uploadingFiles.every((f) => ['success', 'error'].includes(f.status)) &&
        !uploadingFiles.some((f) => f.status === 'error') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm"
          >
            ✓ All {uploadedFiles.length} image(s) uploaded successfully!
          </motion.div>
        )}
    </div>
  );
};

export default ImageUploader;
