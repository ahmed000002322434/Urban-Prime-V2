import { useContext } from 'react';
import { UploadContext } from '../context/UploadContext';

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};
