
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { reelService, itemService } from '../../services/itemService';
import { generateCaptions, generateHashtags } from '../../services/geminiService';
import type { Item, Reel, User } from '../../types';
import Spinner from '../../components/Spinner';
import { useUpload } from '../../hooks/useUpload';

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const ContentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const MagicWandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-2.3 2.3a4 4 0 0 0 0 5.6L12 13l2.3-2.3a4 4 0 0 0 0-5.6Zm0 0L9.7 5.3a4 4 0 0 0 5.6 0L12 3Z"/><path d="M21 12c-2.3 2.3-4.8 3.3-6.4 2.9-.8-.2-1.2-.6-1.5-1.3L12 12l-1.1-1.6c-.3-.7-.7-1-1.5-1.3-1.6-.4-4.1.6-6.4 2.9"/><path d="M3 21c2.3-2.3 3.3-4.8 2.9-6.4-.2-.8-.6-1.2-1.3-1.5L6 12l-1.6-1.1c-.7-.3-1-.7-1.3-1.5-.4-1.6.6-4.1 2.9-6.4"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

type PixeStudioView = 'dashboard' | 'upload' | 'content' | 'analytics' | 'monetization';

// --- START OF UPLOAD VIEW & SUB-COMPONENTS ---
const LiveMobilePreview: React.FC<{ videoUrl: string | null; coverImageUrl: string | null; caption: string; creator: User | null }> = ({ videoUrl, coverImageUrl, caption, creator }) => {
    return (
        <div className="w-full max-w-[280px] aspect-[9/16] bg-black rounded-3xl shadow-2xl p-2.5 mx-auto">
            <div className="w-full h-full bg-gray-800 rounded-[1.25rem] overflow-hidden relative">
                {videoUrl ? (
                    <video key={videoUrl} src={videoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                ) : coverImageUrl ? (
                    <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-500">Preview</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40"></div>
                <div className="absolute bottom-4 left-4 right-10 text-white text-xs">
                    <p className="font-bold mb-1">@{creator?.name || 'Your Name'}</p>
                    <p className="line-clamp-2">{caption || 'Your caption will appear here...'}</p>
                </div>
            </div>
        </div>
    );
};

const PixeScore: React.FC<{ score: number }> = ({ score }) => (
    <div className="flex items-center gap-2">
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${score}%` }}></div>
        </div>
        <span className="font-bold text-sm text-primary">{score}/100</span>
    </div>
);

const AIHelperButton: React.FC<{ onClick: () => void; isLoading: boolean; children: React.ReactNode }> = ({ onClick, isLoading, children }) => (
    <button type="button" onClick={onClick} disabled={isLoading} className="text-xs font-semibold text-primary hover:underline disabled:text-gray-400 flex items-center gap-1">
        {isLoading ? <Spinner size="sm" /> : <MagicWandIcon />}
        {children}
    </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        {children}
    </div>
);

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VideoTimelineEditor: React.FC<{
    duration: number;
    trimStart: number;
    trimEnd: number;
    setTrimStart: (time: number) => void;
    setTrimEnd: (time: number) => void;
}> = ({ duration, trimStart, trimEnd, setTrimStart, setTrimEnd }) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingHandle || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const position = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, position / rect.width));
        const time = percentage * duration;

        if (draggingHandle === 'start') {
            setTrimStart(Math.min(time, trimEnd - 0.1));
        } else {
            setTrimEnd(Math.max(time, trimStart + 0.1));
        }
    }, [draggingHandle, duration, trimStart, trimEnd, setTrimStart, setTrimEnd]);

    const handleMouseUp = useCallback(() => {
        setDraggingHandle(null);
    }, []);

    useEffect(() => {
        if (draggingHandle) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingHandle, handleMouseMove, handleMouseUp]);

    const startPercent = (trimStart / duration) * 100;
    const endPercent = (trimEnd / duration) * 100;

    return (
        <div className="mt-4">
            <div ref={timelineRef} className="relative w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                <div
                    className="absolute top-0 h-full bg-primary/30"
                    style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                />
                <div
                    onMouseDown={() => setDraggingHandle('start')}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-10 bg-primary rounded-md cursor-ew-resize"
                    style={{ left: `${startPercent}%` }}
                />
                <div
                    onMouseDown={() => setDraggingHandle('end')}
                    className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-10 bg-primary rounded-md cursor-ew-resize"
                    style={{ left: `${endPercent}%` }}
                />
            </div>
            <div className="flex justify-between text-xs font-mono mt-1">
                <span>{formatTime(trimStart)}</span>
                <span>{formatTime(trimEnd)}</span>
            </div>
        </div>
    );
};

const UploadView: React.FC<{ onPublish: (formData: Partial<Reel>, videoFile: File | null) => Promise<void>; isLoading: boolean; existingReel: Reel | null; onCancelEdit: () => void; }> = ({ onPublish, isLoading, existingReel, onCancelEdit }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState<Partial<Reel>>({
        caption: '', taggedItemIds: [], visibility: 'public', allowComments: true, ...existingReel
    });
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(existingReel?.videoUrl || null);
    const [userItems, setUserItems] = useState<Item[]>([]);
    const [aiLoading, setAiLoading] = useState({ captions: false, hashtags: false });
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dragCounter = useRef(0);

    const taggedItems = useMemo(() => {
        return userItems.filter(item => formData.taggedItemIds?.includes(item.id));
    }, [formData.taggedItemIds, userItems]);

    useEffect(() => {
        if (user) {
            itemService.getItemsByOwner(user.id).then(setUserItems);
        }
    }, [user]);
    
    useEffect(() => {
      if (existingReel) {
          setFormData({ ...existingReel });
          setVideoPreview(existingReel.videoUrl);
      } else {
          setFormData({ caption: '', taggedItemIds: [], visibility: 'public', allowComments: true });
          setVideoPreview(null);
          setVideoFile(null);
      }
    }, [existingReel]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                showNotification('Only video files are allowed.');
                return;
            }
            setVideoFile(file);
            const url = URL.createObjectURL(file);
            setVideoPreview(url);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDraggingOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDraggingOver(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange({ target: { files: e.dataTransfer.files } });
            e.dataTransfer.clearData();
        }
    };


    const handleTagItem = (itemId: string) => {
        setFormData(prev => ({
            ...prev,
            taggedItemIds: prev.taggedItemIds?.includes(itemId)
                ? prev.taggedItemIds.filter(id => id !== itemId)
                : [...(prev.taggedItemIds || []), itemId]
        }));
    };
    
    const handleGenerateCaptions = async () => {
        setAiLoading(p => ({ ...p, captions: true }));
        try {
            const itemTitles = taggedItems.map(i => i.title);
            const { captions } = await generateCaptions(itemTitles);
            setFormData(p => ({ ...p, caption: captions[0] }));
        } catch (e) { showNotification("Failed to generate captions."); }
        finally { setAiLoading(p => ({ ...p, captions: false })); }
    };

    const handleGenerateHashtags = async () => {
        if (!formData.caption) { showNotification("Please write a caption first."); return; }
        setAiLoading(p => ({ ...p, hashtags: true }));
        try {
            const { hashtags } = await generateHashtags(formData.caption);
            const newHashtags = hashtags.join(' ');
            setFormData(p => ({ ...p, caption: `${p.caption || ''} ${newHashtags}`.trim() }));
        } catch (e) { showNotification("Failed to generate hashtags."); }
        finally { setAiLoading(p => ({ ...p, hashtags: false })); }
    };
    
    const handleGenerateCover = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFormData(p => ({ ...p, coverImageUrl: canvas.toDataURL('image/jpeg') }));
    };

    const pixeScore = useMemo(() => {
        let score = 0;
        if (videoPreview) score += 20;
        if (formData.caption && formData.caption.length > 10) score += 20;
        if (formData.caption && (formData.caption.match(/#/g) || []).length >= 3) score += 15;
        if (formData.taggedItemIds && formData.taggedItemIds.length > 0) score += 25;
        if (formData.coverImageUrl) score += 20;
        return score;
    }, [formData, videoPreview]);
    
    const handleMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (isFinite(video.duration)) {
            setDuration(video.duration);
            const start = existingReel?.startTime || 0;
            const end = existingReel?.endTime || video.duration;
            setTrimStart(start);
            setTrimEnd(end);
            setFormData(p => ({...p, startTime: start, endTime: end}));
        }
    };
    
    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.currentTime >= trimEnd) {
            video.currentTime = trimStart;
            video.play();
        }
    };

    const handleSetTrimStart = (time: number) => {
        setTrimStart(time);
        setFormData(p => ({ ...p, startTime: time }));
        if (videoRef.current) videoRef.current.currentTime = time;
    };

    const handleSetTrimEnd = (time: number) => {
        setTrimEnd(time);
        setFormData(p => ({ ...p, endTime: time }));
    };

    return (
        <div
            className="flex gap-6 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/20 border-4 border-dashed border-primary rounded-2xl z-30 flex flex-col items-center justify-center pointer-events-none">
                    <UploadIcon />
                    <p className="mt-2 font-bold text-primary text-lg">Drop your video to upload</p>
                </div>
            )}
            <div className={`flex-1 transition-all duration-300 ease-in-out ${isEditorOpen ? 'lg:mr-[25rem]' : 'mr-0'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="space-y-6">
                        <Section title={existingReel ? "Edit Pixe" : "1. Upload & Edit"}>
                            <div className="bg-gray-100 dark:bg-dark-background rounded-lg flex items-center justify-center text-gray-400">
                                {videoPreview ? (
                                    <div className="w-full aspect-video relative bg-black rounded-lg">
                                        <video
                                            ref={videoRef}
                                            src={videoPreview}
                                            onLoadedMetadata={handleMetadataLoaded}
                                            onTimeUpdate={handleTimeUpdate}
                                            controls={false}
                                            autoPlay muted loop
                                            className="w-full h-full object-contain rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <label className="cursor-pointer text-center w-full h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg hover:border-primary hover:text-primary">
                                        <UploadIcon />
                                        <span className="text-sm font-semibold mt-1 block">Click to upload or drag video anywhere</span>
                                        <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                            {videoPreview && duration > 0 && (
                                <VideoTimelineEditor duration={duration} trimStart={trimStart} trimEnd={trimEnd} setTrimStart={handleSetTrimStart} setTrimEnd={handleSetTrimEnd} />
                            )}
                        </Section>
                         <Section title="2. Add Details">
                            <textarea
                                value={formData.caption}
                                onChange={e => setFormData(p => ({...p, caption: e.target.value}))}
                                placeholder="Write a caption..."
                                rows={5}
                                className="w-full p-3 bg-gray-50 dark:bg-dark-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </Section>
                    </div>

                    <div className="space-y-6 lg:sticky top-28">
                        <Section title="Actions">
                            <div className="space-y-3">
                                <button onClick={() => setIsEditorOpen(true)} className="w-full p-3 bg-gray-100 dark:bg-dark-background rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700">
                                    <SettingsIcon /> Open Editor Tools
                                </button>
                                <div>
                                    <label className="text-sm font-semibold">Visibility</label>
                                    <select value={formData.visibility} onChange={e => setFormData(p => ({...p, visibility: e.target.value as any}))} className="w-full mt-1 p-2 bg-gray-50 dark:bg-dark-background border rounded-lg">
                                        <option value="public">Public</option>
                                        <option value="followers">Followers Only</option>
                                        <option value="private">Private (Draft)</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input type="checkbox" checked={formData.allowComments} onChange={e => setFormData(p => ({...p, allowComments: e.target.checked}))} className="h-4 w-4 rounded text-primary focus:ring-primary" />
                                    <span className="text-sm font-medium">Allow comments</span>
                                </label>
                                <div className="border-t pt-4 space-y-3">
                                    <div>
                                        <label className="text-sm font-semibold">Schedule</label>
                                        <input type="datetime-local" value={formData.scheduledFor?.substring(0, 16)} onChange={e => setFormData(p => ({...p, scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : undefined}))} className="w-full mt-1 p-2 bg-gray-50 dark:bg-dark-background border rounded-lg"/>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { if(existingReel) onCancelEdit(); else onPublish({...formData, status: 'draft'}, videoFile) }} disabled={isLoading} className="flex-1 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">
                                            {existingReel ? 'Cancel' : 'Save as Draft'}
                                        </button>
                                        <button onClick={() => onPublish({...formData, status: 'published'}, videoFile)} disabled={isLoading} className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:opacity-90">
                                            {existingReel ? 'Save Changes' : 'Publish'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Section>
                        <Section title="Live Preview">
                            <LiveMobilePreview videoUrl={videoPreview} coverImageUrl={formData.coverImageUrl || null} caption={formData.caption || ''} creator={user} />
                        </Section>
                    </div>
                </div>
            </div>

            {/* Editor Tools Drawer */}
            <div className={`fixed top-[136px] right-0 h-[calc(100vh-136px)] w-96 bg-white dark:bg-dark-surface shadow-2xl border-l dark:border-gray-700 transition-transform duration-300 ease-in-out z-20 transform ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">Editor Tools</h3>
                    <button onClick={() => setIsEditorOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-background">&times;</button>
                </div>
                <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
                    <Section title="AI Assistants">
                         <div className="flex justify-between items-center">
                            <AIHelperButton onClick={handleGenerateCaptions} isLoading={aiLoading.captions}>Generate with AI</AIHelperButton>
                            <AIHelperButton onClick={handleGenerateHashtags} isLoading={aiLoading.hashtags}>Suggest Hashtags</AIHelperButton>
                        </div>
                    </Section>
                    <Section title="Tag Products">
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                            {userItems.map(item => (
                                <button key={item.id} onClick={() => handleTagItem(item.id)} className={`relative aspect-square rounded-md overflow-hidden border-2 ${formData.taggedItemIds?.includes(item.id) ? 'border-primary' : 'border-transparent'}`}>
                                    <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover" />
                                    {formData.taggedItemIds?.includes(item.id) && <div className="absolute inset-0 bg-primary/50 flex items-center justify-center text-white">✓</div>}
                                </button>
                            ))}
                        </div>
                    </Section>
                    <Section title="Cover Photo">
                        <div className="aspect-[9/16] bg-gray-100 dark:bg-dark-background rounded-lg">
                            {formData.coverImageUrl && <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover rounded-lg" />}
                        </div>
                        <button onClick={handleGenerateCover} disabled={!videoPreview} className="w-full mt-2 text-sm p-2 bg-gray-200 font-semibold rounded-lg disabled:opacity-50">Generate from video</button>
                    </Section>
                     <Section title="Pixe Score">
                        <PixeScore score={pixeScore} />
                    </Section>
                </div>
            </div>
        </div>
    );
};
// --- END OF UPLOAD VIEW ---

const ContentView: React.FC<{ reels: Reel[]; onEdit: (reel: Reel) => void; onDelete: (reelId: string) => void; }> = ({ reels, onEdit, onDelete }) => {
    if (reels.length === 0) {
        return <div className="text-center p-8 bg-white dark:bg-dark-surface rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">You haven't created any Pixes yet.</div>;
    }

    return (
        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4">Your Content</h2>
            <div className="space-y-4">
                {reels.map(reel => (
                    <div key={reel.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-background">
                        <img src={reel.coverImageUrl} alt={reel.caption} className="w-16 h-24 object-cover rounded-md flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{reel.caption || "No caption"}</p>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${reel.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {reel.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">Likes: {reel.likes} &bull; Comments: {reel.comments.length}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(reel)} className="p-2 text-gray-500 hover:text-primary"><EditIcon /></button>
                            <button onClick={() => onDelete(reel.id)} className="p-2 text-gray-500 hover:text-red-500"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
        <p className="text-xs uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
);

const MiniLineChart: React.FC<{ data: number[] }> = ({ data }) => {
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / max) * 100}`).join(' ');
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-20">
            <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-primary"
                points={points}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const DashboardView: React.FC<{ reels: Reel[] }> = ({ reels }) => {
    const totalViews = reels.reduce((sum, r) => sum + (r.views || 0), 0);
    const totalLikes = reels.reduce((sum, r) => sum + (r.likes || 0), 0);
    const totalComments = reels.reduce((sum, r) => sum + (r.comments?.length || 0), 0);
    const recent = reels.slice(0, 4);
    const growthData = [12, 18, 14, 22, 28, 26, 34];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Views" value={totalViews.toLocaleString()} sub="Last 28 days" />
                <StatCard label="Likes" value={totalLikes.toLocaleString()} sub="All time" />
                <StatCard label="Comments" value={totalComments.toLocaleString()} sub="Engagement" />
                <StatCard label="Pixes" value={reels.length.toString()} sub="Published + Drafts" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-2">Channel Momentum</h3>
                    <p className="text-sm text-gray-500 mb-4">Weekly viewer growth</p>
                    <MiniLineChart data={growthData} />
                </div>
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 space-y-3">
                    <h3 className="font-bold text-lg">Quick Actions</h3>
                    <button className="w-full py-2 rounded-lg bg-primary text-white font-semibold">Upload New Pixe</button>
                    <button className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700">Schedule Release</button>
                    <button className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700">Open Monetization</button>
                </div>
            </div>
            <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4">Recent Uploads</h3>
                <div className="space-y-4">
                    {recent.length === 0 && <p className="text-sm text-gray-500">No uploads yet.</p>}
                    {recent.map(reel => (
                        <div key={reel.id} className="flex items-center gap-4">
                            <img src={reel.coverImageUrl} alt={reel.caption} className="w-16 h-24 object-cover rounded-md" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{reel.caption || 'Untitled'}</p>
                                <p className="text-xs text-gray-500">Views {reel.views || 0} • Likes {reel.likes || 0}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${reel.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {reel.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AnalyticsView: React.FC<{ reels: Reel[] }> = ({ reels }) => {
    const viewsData = [120, 180, 140, 220, 280, 260, 340];
    const engagementRate = reels.length ? ((reels.reduce((sum, r) => sum + (r.likes || 0) + (r.comments?.length || 0), 0)) / Math.max(reels.reduce((sum, r) => sum + (r.views || 0), 0), 1)) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Avg. View Duration" value="00:28" sub="Last 7 days" />
                <StatCard label="Engagement Rate" value={`${engagementRate.toFixed(1)}%`} sub="Likes + comments" />
                <StatCard label="Returning Viewers" value="42%" sub="Last 28 days" />
                <StatCard label="CTR" value="6.3%" sub="Shop button" />
            </div>
            <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-2">Views Over Time</h3>
                <p className="text-sm text-gray-500 mb-4">Daily total views</p>
                <MiniLineChart data={viewsData} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-3">Top Pixes</h3>
                    <div className="space-y-3">
                        {reels.slice(0, 4).map(reel => (
                            <div key={reel.id} className="flex items-center gap-3">
                                <img src={reel.coverImageUrl} alt={reel.caption} className="w-12 h-16 rounded-md object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{reel.caption || 'Untitled'}</p>
                                    <p className="text-xs text-gray-500">Views {reel.views || 0}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-3">Audience</h3>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <p>Top Countries: United States, Italy, UAE</p>
                        <p>Peak Hours: 7pm - 10pm</p>
                        <p>Device Split: 78% Mobile, 22% Desktop</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MonetizationView: React.FC = () => {
    const [adRevenue, setAdRevenue] = useState(true);
    const [tipsEnabled, setTipsEnabled] = useState(true);
    const [membershipsEnabled, setMembershipsEnabled] = useState(false);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Est. Revenue" value="$1,280" sub="Last 28 days" />
                <StatCard label="Shop Sales" value="$3,420" sub="Affiliate + tagged items" />
                <StatCard label="Tips" value="$220" sub="Community support" />
                <StatCard label="Next Payout" value="$540" sub="Scheduled Friday" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="font-bold text-lg">Monetization Toggles</h3>
                    <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">Ad Revenue Sharing</span>
                        <input type="checkbox" checked={adRevenue} onChange={e => setAdRevenue(e.target.checked)} className="h-4 w-4 rounded text-primary" />
                    </label>
                    <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tips & Super Fans</span>
                        <input type="checkbox" checked={tipsEnabled} onChange={e => setTipsEnabled(e.target.checked)} className="h-4 w-4 rounded text-primary" />
                    </label>
                    <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">Memberships</span>
                        <input type="checkbox" checked={membershipsEnabled} onChange={e => setMembershipsEnabled(e.target.checked)} className="h-4 w-4 rounded text-primary" />
                    </label>
                    <div className="text-xs text-gray-500">
                        Enable monetization tools to unlock earnings across ads, tips, and member perks.
                    </div>
                </div>
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="font-bold text-lg">Eligibility Checklist</h3>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                        <li>✓ 3 Pixes published</li>
                        <li>✓ Identity verified</li>
                        <li>✓ Payout method connected</li>
                        <li>• 1,000 followers (in progress)</li>
                    </ul>
                    <button className="w-full py-2 rounded-lg bg-primary text-white font-semibold">Connect Payout Method</button>
                </div>
            </div>
            <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-3">Membership Tiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Supporter $4.99', 'Insider $9.99', 'Elite $19.99'].map(tier => (
                        <div key={tier} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                            <p className="font-semibold">{tier}</p>
                            <p className="text-xs text-gray-500 mt-2">Perks: badges, exclusive drops, early access.</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const StudioTabs: React.FC<{
    activeView: PixeStudioView;
    setActiveView: (view: PixeStudioView) => void;
    onUploadClick: () => void;
    contentCount: number;
}> = ({ activeView, setActiveView, onUploadClick, contentCount }) => {
    const TabButton = ({ view, icon, label, count }: { view: PixeStudioView; icon: React.ReactNode; label: string; count?: number }) => {
        const isActive = activeView === view;
        const handleClick = () => {
            if (view === 'upload') {
                onUploadClick();
            } else {
                setActiveView(view);
            }
        };
        return (
            <button
                onClick={handleClick}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface'
                }`}
            >
                {icon}
                <span>{label}</span>
                {count !== undefined && <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">{count}</span>}
            </button>
        );
    };

    return (
        <div className="flex items-center gap-2 p-2 bg-white dark:bg-dark-surface rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 mb-6">
            <TabButton view="dashboard" icon={<ContentIcon />} label="Dashboard" />
            <TabButton view="upload" icon={<UploadIcon />} label="Upload / Edit" />
            <TabButton view="content" icon={<ContentIcon />} label="My Content" count={contentCount} />
            <TabButton view="analytics" icon={<SettingsIcon />} label="Analytics" />
            <TabButton view="monetization" icon={<MagicWandIcon />} label="Monetization" />
        </div>
    );
};

const PixeStudio: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const { startUpload } = useUpload();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<PixeStudioView>('upload');
    const [reels, setReels] = useState<Reel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingReel, setEditingReel] = useState<Reel | null>(null);

    const fetchReels = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            try {
                const reelsData = await reelService.getReelsByCreator(user.id);
                setReels(reelsData);
            } catch (error) {
                console.error("Failed to fetch reels:", error);
                showNotification("Could not load your content.");
            } finally {
                setIsLoading(false);
            }
        }
    }, [user, showNotification]);

    useEffect(() => {
        fetchReels();
    }, [fetchReels]);
    
    const handlePublish = async (formData: Partial<Reel>, videoFile: File | null) => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (formData.id) { // This is an update
                const updatedReel = await reelService.updateReel(formData.id, formData);
                if (formData.status === 'published' && videoFile) {
                    startUpload(videoFile, { ...updatedReel });
                }
                 showNotification("Draft updated successfully!");
            } else { // This is a new reel
                if (formData.status === 'published' && videoFile) {
                    startUpload(videoFile, { ...formData, creatorId: user.id });
                    showNotification("Pixe is uploading in the background!");
                } else {
                    await reelService.addReel({ 
                        ...formData, 
                        creatorId: user.id, 
                        videoUrl: formData.videoUrl || null, 
                        caption: formData.caption || '', 
                        taggedItemIds: formData.taggedItemIds || [],
                        status: formData.status || 'draft',
                        hashtags: formData.hashtags || [],
                        showShopButton: formData.showShopButton ?? true,
                        coverImageUrl: formData.coverImageUrl || '',
                        views: 0
                    });
                     showNotification("Saved to drafts!");
                }
            }
            await fetchReels();
            setActiveView('content');
            setEditingReel(null);
        } catch (error) {
             showNotification("Failed to save Pixe.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEdit = (reel: Reel) => {
        setEditingReel(reel);
        setActiveView('upload');
    };

    const handleDelete = async (reelId: string) => {
        if (window.confirm("Are you sure you want to delete this Pixe? This cannot be undone.")) {
            try {
                await reelService.deleteReel(reelId);
                showNotification("Pixe deleted.");
                fetchReels();
            } catch (error) {
                showNotification("Failed to delete Pixe.");
            }
        }
    };
    
    const renderView = () => {
        switch(activeView) {
            case 'dashboard':
                return <DashboardView reels={reels} />;
            case 'upload':
                return <UploadView onPublish={handlePublish} isLoading={isLoading} existingReel={editingReel} onCancelEdit={() => { setEditingReel(null); setActiveView('content'); }} />;
            case 'content':
                return <ContentView reels={reels} onEdit={handleEdit} onDelete={handleDelete} />;
            case 'analytics':
                return <AnalyticsView reels={reels} />;
            case 'monetization':
                return <MonetizationView />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-dark-background min-h-screen">
             <header className="bg-gray-50 dark:bg-dark-background/80 backdrop-blur-md shadow-sm sticky top-[72px] z-30 border-b dark:border-gray-700">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <button onClick={() => navigate('/profile')} className="flex items-center gap-1 font-semibold text-sm text-light-text dark:text-dark-text">
                        <BackIcon /> Back to Profile
                    </button>
                    <h1 className="text-xl font-bold font-display text-light-text dark:text-dark-text">Pixe Studio</h1>
                    <div className="w-36"></div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8">
                 <div className="flex flex-col items-start">
                    <StudioTabs
                        activeView={activeView}
                        setActiveView={setActiveView}
                        onUploadClick={() => {
                            setActiveView('upload');
                            setEditingReel(null);
                        }}
                        contentCount={reels.length}
                    />
                    <div className="flex-1 min-w-0 w-full">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PixeStudio;
