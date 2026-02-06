
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import Spinner from '../../components/Spinner';
import { postService } from '../../services/itemService';
import type { Post } from '../../types';
import BackButton from '../../components/BackButton';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;


const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [formData, setFormData] = useState<Partial<Post>>({
    caption: '',
    imageUrl: null,
    status: 'published',
    scheduledFor: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (publishStatus: 'published' | 'draft') => {
    if (!formData.imageUrl || !user) {
      showNotification('Please select an image to post.');
      return;
    }
    setIsLoading(true);

    const isScheduled = formData.status === 'scheduled' && formData.scheduledFor;
    
    // FIX: Explicitly cast the 'status' property to the correct literal union type to satisfy the postService.addPost function signature.
    const postData = {
        creatorId: user.id,
        imageUrl: formData.imageUrl,
        caption: formData.caption || '',
        status: (publishStatus === 'draft' ? 'draft' : (isScheduled ? 'scheduled' : 'published')) as 'published' | 'draft' | 'scheduled',
        scheduledFor: isScheduled ? new Date(formData.scheduledFor).toISOString() : undefined,
    };

    try {
        await postService.addPost(postData);
        if (publishStatus === 'draft') {
            showNotification('Post saved as draft!');
        } else if (isScheduled) {
            showNotification(`Post scheduled for ${new Date(formData.scheduledFor!).toLocaleString()}`);
        } else {
            showNotification('Post published successfully!');
        }
        navigate(`/user/${user.id}`);
    } catch (error) {
        showNotification('Failed to save post.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dark-background min-h-screen">
       <header className="bg-white dark:bg-dark-surface shadow-sm sticky top-0 z-20 border-b dark:border-gray-700">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <BackButton text="Cancel" />
                <h1 className="text-xl font-bold font-display">New Post</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePublish('draft')} disabled={isLoading} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-dark-text font-bold rounded-lg text-sm disabled:opacity-50">
                        Save Draft
                    </button>
                    <button onClick={() => handlePublish('published')} disabled={isLoading} className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-sm disabled:bg-primary/50 min-w-[80px] flex justify-center items-center">
                        {isLoading ? <Spinner size="sm" /> : 'Publish'}
                    </button>
                </div>
            </div>
        </header>
        <main className="container mx-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-soft border dark:border-gray-700">
                    {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="Post preview" className="w-full aspect-square object-cover rounded-lg" />
                    ) : (
                         <label className="aspect-square w-full bg-gray-100 dark:bg-dark-background border-2 border-dashed dark:border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary text-gray-500 hover:text-primary">
                            <ImageIcon />
                            <span className="mt-2 font-semibold text-sm">Upload Photo</span>
                            <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                        </label>
                    )}
                </div>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full" />
                        <span className="font-bold">{user?.name}</span>
                    </div>
                    <textarea 
                        value={formData.caption}
                        onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                        placeholder="Write a caption..." 
                        rows={8}
                        className="w-full p-3 bg-white dark:bg-dark-surface border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                     <div className="space-y-2">
                        <h3 className="font-bold text-sm">Publishing Options</h3>
                        <div className="p-4 border dark:border-gray-700 rounded-lg space-y-3 bg-white dark:bg-dark-surface">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="status" value="published" checked={formData.status === 'published'} onChange={() => setFormData(p => ({...p, status: 'published'}))} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                                <span>Publish Immediately</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="status" value="scheduled" checked={formData.status === 'scheduled'} onChange={() => setFormData(p => ({...p, status: 'scheduled'}))} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                                <span>Schedule for later</span>
                            </label>
                            {formData.status === 'scheduled' && (
                                <div className="pl-7 animate-fade-in-up">
                                    <input type="datetime-local" name="scheduledFor" value={formData.scheduledFor} onChange={e => setFormData(p => ({...p, scheduledFor: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-gray-600" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};

export default CreatePostPage;