import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { itemService } from '../../services/itemService';
import type { GameUpload } from '../../types';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;

const UploadGamePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState<Omit<GameUpload, 'id' | 'createdAt' | 'downloads' | 'uploader' | 'fileUrl'>>({
    name: '',
    description: '',
    version: '1.0',
    category: 'Indie Game',
    coverImageUrl: '',
    fileSize: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [gameFileName, setGameFileName] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImagePreview(reader.result as string);
        // In a real app, you would upload this and get a URL. We'll use a placeholder for now.
        setFormData(prev => ({ ...prev, coverImageUrl: 'https://picsum.photos/seed/newgame/600/400' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGameFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGameFileName(file.name);
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setFormData(prev => ({ ...prev, fileSize: `${sizeInMB} MB` }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      await itemService.uploadGame(formData, user);
      showNotification('Your game has been uploaded successfully!');
      navigate('/games');
    } catch (error) {
      console.error("Failed to upload game", error);
      showNotification('There was an error uploading your game.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dark-background min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <BackButton to="/games" alwaysShowText />
          </div>
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-surface p-8 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 space-y-6">
            <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-dark-text">Upload Your Game</h1>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} required className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version</label>
                    <input type="text" name="version" value={formData.version} onChange={handleChange} required className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600">
                        <option value="Indie Game">Indie Game</option>
                        <option value="Mod">Mod</option>
                        <option value="Resource Pack">Resource Pack</option>
                        <option value="Utility">Utility</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image</label>
                <div className="mt-1 flex items-center gap-4">
                    <div className="w-40 h-24 bg-gray-100 dark:bg-dark-background rounded-md flex items-center justify-center overflow-hidden">
                        {coverImagePreview ? <img src={coverImagePreview} alt="Cover preview" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">Preview</span>}
                    </div>
                    <label className="cursor-pointer bg-white dark:bg-dark-surface px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span>Upload Image</span>
                        <input type="file" onChange={handleCoverImageChange} accept="image/*" className="sr-only" required/>
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game File</label>
                <label className="cursor-pointer w-full flex flex-col items-center justify-center px-6 py-10 border-2 border-dashed rounded-lg text-gray-500 hover:border-primary hover:text-primary">
                    <UploadIcon />
                    <span className="mt-2 text-sm font-semibold">{gameFileName || 'Click to select a file'}</span>
                    <input type="file" onChange={handleGameFileChange} className="sr-only" required/>
                </label>
            </div>
            
            <div className="pt-4 border-t dark:border-gray-600">
                <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex justify-center items-center">
                    {isLoading ? <Spinner size="sm" /> : 'Upload & Publish'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadGamePage;