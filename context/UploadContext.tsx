
import React, { createContext, useState, useCallback, useMemo, useContext } from 'react';
import { useNotification } from './NotificationContext';
import type { Reel } from '../types';

type ItemServiceModule = typeof import('../services/itemService');
type FirebaseModule = typeof import('../firebase');
type FirebaseStorageModule = typeof import('firebase/storage');

let uploadRuntimePromise: Promise<{
  reelService: ItemServiceModule['reelService'];
  storage: FirebaseModule['storage'];
  ref: FirebaseStorageModule['ref'];
  uploadBytesResumable: FirebaseStorageModule['uploadBytesResumable'];
  getDownloadURL: FirebaseStorageModule['getDownloadURL'];
}> | null = null;

const loadUploadRuntime = () => {
  if (!uploadRuntimePromise) {
    uploadRuntimePromise = Promise.all([
      import('../services/itemService'),
      import('../firebase'),
      import('firebase/storage'),
    ]).then(([itemServiceModule, firebaseModule, firebaseStorageModule]) => ({
      reelService: itemServiceModule.reelService,
      storage: firebaseModule.storage,
      ref: firebaseStorageModule.ref,
      uploadBytesResumable: firebaseStorageModule.uploadBytesResumable,
      getDownloadURL: firebaseStorageModule.getDownloadURL,
    }));
  }
  return uploadRuntimePromise;
};

export type UploadStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
  reelData?: Partial<Reel>;
  error?: string;
}

interface UploadContextType {
  tasks: UploadTask[];
  overallProgress: number;
  startUpload: (file: File, reelData: Partial<Reel>) => void;
}

export const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const { showNotification } = useNotification();

  const updateTask = useCallback((id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
  }, []);

  const startUpload = useCallback((file: File, reelData: Partial<Reel>) => {
    const id = `upload-${Date.now()}-${file.name}`;
    const newTask: UploadTask = {
      id,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      reelData,
    };
    setTasks(prev => [newTask, ...prev]);

    void loadUploadRuntime()
      .then(({ storage, ref, uploadBytesResumable, getDownloadURL, reelService }) => {
        const storageRef = ref(storage, `reels/${reelData.creatorId}/${id}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            updateTask(id, { progress: Math.round(progress) });
          }, 
          (error) => {
            console.error("Upload failed:", error);
            updateTask(id, { status: 'failed', error: error.message });
            showNotification(`Upload failed: ${error.message}`);
          }, 
          async () => {
            updateTask(id, { status: 'processing' });
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              await reelService.addReel({
                ...reelData,
                creatorId: reelData.creatorId!,
                videoUrl: downloadURL,
                caption: reelData.caption || '',
                taggedItemIds: reelData.taggedItemIds || [],
                status: reelData.status || 'published',
                hashtags: reelData.hashtags || [],
                showShopButton: reelData.showShopButton ?? true,
                coverImageUrl: reelData.coverImageUrl || '',
                views: 0
              });
              
              updateTask(id, { status: 'completed' });
              showNotification('Pixe uploaded successfully!');
              
              setTimeout(() => setTasks(prev => prev.filter(t => t.id !== id)), 5000);

            } catch (error) {
               const errorMessage = error instanceof Error ? error.message : "An unknown error occurred saving data.";
               updateTask(id, { status: 'failed', error: errorMessage });
               showNotification(`Processing failed: ${errorMessage}`);
            }
          }
        );
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Upload runtime failed to initialize.';
        updateTask(id, { status: 'failed', error: errorMessage });
        showNotification(`Upload failed: ${errorMessage}`);
      });

  }, [showNotification, updateTask]);

  const overallProgress = useMemo(() => {
    const uploadingTasks = tasks.filter(t => t.status === 'uploading' || t.status === 'processing');
    if (uploadingTasks.length === 0) return 0;
    const totalProgress = uploadingTasks.reduce((sum, task) => sum + task.progress, 0);
    return totalProgress / (uploadingTasks.length * 100);
  }, [tasks]);

  const value = useMemo(() => ({
    tasks,
    overallProgress,
    startUpload
  }), [tasks, overallProgress, startUpload]);

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};
