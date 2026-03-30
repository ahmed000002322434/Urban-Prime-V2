

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { itemService, reelService, userService } from '../../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import type { Reel, User, ReelComment } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';
import BlueTickBadge from '../../components/spotlight/BlueTickBadge';

// --- ICONS ---
const PixeLogo = () => <img src="https://i.ibb.co/jkyfqdFV/Gemini-Generated_Image-gqj0u3gqj0u3gqj0.png" alt="Pixe Logo" className="w-8 h-8 object-contain" />;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const VideoCameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const HeartOutlineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const BookmarkOutlineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>;

const BackArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const MoreVertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;

const HeartFilledIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 drop-shadow-sm"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-white drop-shadow-sm"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const CommentFillIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-white drop-shadow-sm"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>;
const BookmarkFillIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-white drop-shadow-sm"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>;
const BookmarkOutlineFillIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white drop-shadow-sm"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>;
const ShareFillIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-white drop-shadow-sm"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;

const MusicNoteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;

const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;
const PlayCenterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white/90 drop-shadow-2xl"><path d="M8 5v14l11-7z"></path></svg>;
const VolumeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>;
const VolumeXIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const glassyBtnClass = "p-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] transition-all duration-300 hover:scale-110 active:scale-95 group flex items-center justify-center";

// Extended Comment Interface
interface UIComment extends ReelComment {
    likes?: number;
    isLiked?: boolean;
}

const reelVariants = {
    enter: (direction: number) => ({ y: direction > 0 ? 800 : -800, opacity: 0, scale: 0.9 }),
    center: { zIndex: 1, y: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({ zIndex: 0, y: direction < 0 ? 800 : -800, opacity: 0, scale: 0.9 })
};

const ReelsPage: React.FC = () => {
    // --- HOOKS (MUST BE AT THE TOP) ---
    const { user, openAuthModal } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [reels, setReels] = useState<Reel[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [playProgress, setPlayProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [creator, setCreator] = useState<User | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
    const [activePanel, setActivePanel] = useState<'none' | 'comments' | 'share'>('none');
    const [commentInput, setCommentInput] = useState("");
    const [commentsList, setCommentsList] = useState<UIComment[]>([]);
    const [shareSearchQuery, setShareSearchQuery] = useState("");
    const [usersForShare, setUsersForShare] = useState<User[]>([]);
    const [likeAnimation, setLikeAnimation] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);
    
    // --- DERIVED LOGIC & EFFECTS (AFTER HOOKS) ---
    const activeReel = reels[activeIndex];
    const focusId = searchParams.get('focus');

    useEffect(() => {
        const fetchReels = async () => {
            setIsLoading(true);
            try {
                const reelsData = await reelService.getReelsForFeed(user?.id || 'guest');
                const publishedReels = reelsData.filter(r => r.status === 'published');
                setReels(publishedReels);
            } catch (err) {
                console.error('Error fetching reels:', err);
                setReels([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReels();
    }, [user]);

    useEffect(() => {
        if (!focusId || reels.length === 0) return;
        const focusIndex = reels.findIndex((reel) => reel.id === focusId);
        if (focusIndex >= 0) {
            setActiveIndex(focusIndex);
            setDirection(1);
        }
    }, [focusId, reels]);
    
    useEffect(() => {
        if (!activeReel) return;
        userService.getUserById(activeReel.creatorId).then(creatorData => {
            setCreator(creatorData || null);
            if (creatorData && user) setIsFollowing(user.following.includes(creatorData.id));
        });
        
        setIsLiked(user?.likedReels?.includes(activeReel.id) || false);
        setIsSaved(false); 
        setCommentsList(activeReel.comments.map(c => ({...c, likes: Math.floor(Math.random() * 10), isLiked: false})) || []);
        setIsCaptionExpanded(false);
        setIsPlaying(true);
    }, [activeReel, user]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') handlePrev();
            if (e.key === 'ArrowDown') handleNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [reels.length, activeIndex]);
    
    useEffect(() => {
        if (activePanel === 'share') {
             userService.getAllSellers().then(setUsersForShare);
        }
    }, [activePanel]);

    const handleNext = () => {
        setDirection(1);
        if (activeIndex < reels.length - 1) setActiveIndex(prev => prev + 1);
        else setActiveIndex(0);
    };

    const handlePrev = () => {
        setDirection(-1);
        if (activeIndex > 0) setActiveIndex(prev => prev - 1);
        else setActiveIndex(reels.length - 1);
    };

    const handleTogglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleToggleFullscreen = async () => {
        const node = containerRef.current;
        if (!node) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
        } else {
            if (node.requestFullscreen) {
                await node.requestFullscreen().catch(() => undefined);
            }
        }
    };
    
    const handleVideoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            handleLike(); // Trigger like
        } else {
            handleTogglePlay(); // Trigger play/pause
        }
        lastTapRef.current = now;
    };

    const handleLike = async () => {
        if (!user) { openAuthModal('login'); return; }
        if (!activeReel) return;
        
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeAnimation(true);
        setTimeout(() => setLikeAnimation(false), 500);
        
        const updatedReel = { ...activeReel, likes: newLikedState ? activeReel.likes + 1 : activeReel.likes - 1 };
        setReels(prev => prev.map((r, i) => i === activeIndex ? updatedReel : r));
        await reelService.toggleLikeReel(user.id, activeReel.id);
    };

    const handleFollow = async () => {
        if (!user) { openAuthModal('login'); return; }
        if (!creator) return;
        setIsFollowing(!isFollowing);
        try { await userService.toggleFollow(user.id, creator.id); } 
        catch (error) { setIsFollowing(!isFollowing); showNotification("Failed to follow user."); }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) { openAuthModal('login'); return; }
        setIsSaved(!isSaved);
        showNotification(isSaved ? "Removed from Saved" : "Saved to Favorites");
    };
    
    const handleCommentToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActivePanel(activePanel === 'comments' ? 'none' : 'comments');
    }
    
    const handleShareToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActivePanel(activePanel === 'share' ? 'none' : 'share');
    }

    const submitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!user) { openAuthModal('login'); return; }
        if(!commentInput.trim()) return;

        const newComment: UIComment = {
            id: `temp-${Date.now()}`,
            author: { id: user.id, name: user.name, avatar: user.avatar },
            text: commentInput,
            timestamp: new Date().toISOString(),
            likes: 0,
            isLiked: false
        };

        setCommentsList(prev => [newComment, ...prev]);
        setCommentInput("");
        const updatedReel = await reelService.addCommentToReel(activeReel.id, user, newComment.text);
        setReels(prev => prev.map((r, i) => i === activeIndex ? updatedReel : r));
    }
    
    const handleLikeComment = (commentId: string) => {
        setCommentsList(prev => prev.map(c => 
            c.id === commentId 
            ? { ...c, isLiked: !c.isLiked, likes: (c.likes || 0) + (c.isLiked ? -1 : 1) } 
            : c
        ));
    };

    const handleDeleteComment = (commentId: string) => {
        if (window.confirm("Delete this comment?")) {
             setCommentsList(prev => prev.filter(c => c.id !== commentId));
        }
    };

    const filteredUsers = usersForShare.filter(u => u.name.toLowerCase().includes(shareSearchQuery.toLowerCase()));

    const handleSendPixe = (recipientName: string) => {
        showNotification(`Pixe sent to ${recipientName}!`);
        setActivePanel('none');
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        showNotification("Link copied to clipboard!");
    };
    
    // --- EARLY RETURNS & RENDER ---
    if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#EAEBED] dark:bg-[#000000]"><Spinner size="lg" /></div>;
    if (!activeReel) return <div className="h-screen w-full flex items-center justify-center bg-[#EAEBED] dark:bg-[#000000] text-gray-500">No content available.</div>;

    const SideNavLink: React.FC<{ to?: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ to, icon, label, active, onClick }) => {
        const classes = `flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 font-semibold text-base border border-transparent ${
            active 
            ? 'bg-white/10 dark:bg-white/5 text-black dark:text-white border-white/20 shadow-lg backdrop-blur-md' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
        }`;
        
        if (to) return <Link to={to} className={classes}>{icon}<span>{label}</span></Link>;
        return <button onClick={onClick} className={`w-full ${classes}`}>{icon}<span>{label}</span></button>;
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#D4D6DB] dark:bg-[#000000] font-sans flex items-center justify-center overflow-hidden transition-colors duration-500">
            {/* Background Blur */}
            <AnimatePresence>
                <motion.div 
                    key={activeReel.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-0 bg-cover bg-center blur-[120px] scale-125"
                    style={{ backgroundImage: `url(${activeReel.coverImageUrl})` }}
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-black/60 dark:to-black/80 z-0"></div>

            <div className="relative z-10 w-full h-full max-w-[1920px] flex p-4 lg:p-8 gap-6 justify-center items-center">
                
                {/* --- LEFT SIDEBAR --- */}
                <aside className="hidden xl:flex flex-col w-[260px] flex-shrink-0 bg-white/70 dark:bg-[#121212]/80 backdrop-blur-3xl rounded-[32px] h-[85vh] shadow-2xl border border-white/40 dark:border-white/5 p-6 z-20 transition-all hover:border-white/60">
                    <div className="flex items-center gap-4 mb-8 px-2 mt-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <PixeLogo />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white font-display">Pixe</span>
                    </div>

                    <nav className="flex-col flex gap-2 flex-1 overflow-y-auto no-scrollbar">
                        <SideNavLink icon={<HomeIcon />} label="For You" active />
                        <SideNavLink icon={<ClockIcon />} label="Following" to="/profile/following" />
                        <SideNavLink icon={<VideoCameraIcon />} label="Live" to="/live" />
                        <div className="my-4 h-px bg-gray-300/50 dark:bg-white/10 mx-6"></div>
                        <p className="px-6 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Library</p>
                        <SideNavLink icon={<HeartOutlineIcon />} label="Liked Pixes" to="/profile/liked" />
                        <SideNavLink icon={<BookmarkOutlineIcon />} label="Saved Pixes" to="/profile/saved" />
                    </nav>

                    <div className="mt-auto pt-4 border-t border-gray-200/50 dark:border-white/10">
                        {user ? (
                            <Link to={`/user/${user.id}`} className="flex items-center gap-4 p-3 rounded-[20px] hover:bg-white/50 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-white/20">
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-md" />
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">View Profile</p>
                                </div>
                            </Link>
                        ) : (
                            <button onClick={() => openAuthModal('login')} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-[20px] shadow-xl hover:scale-[1.02] transition-transform text-sm">
                                Log in
                            </button>
                        )}
                    </div>
                </aside>

                {/* --- CENTER AREA (Video + Actions + Panel) --- */}
                <main className="flex items-center gap-6 h-[85vh]">
                    
                    {/* VIDEO PLAYER */}
                    <div className="relative h-full aspect-[9/16] transform scale-[0.68] origin-center md:scale-100 md:origin-top md:h-[800px] md:w-[450px]">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div 
                                key={activeReel.id}
                                custom={direction}
                                variants={reelVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ y: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                                ref={containerRef}
                                className="absolute inset-0 bg-black rounded-[48px] overflow-hidden shadow-2xl ring-1 ring-white/10 z-20"
                            >
                                <video 
                                    ref={videoRef}
                                    src={activeReel.videoUrl || ''}
                                    loop
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={handleVideoClick}
                                    poster={activeReel.coverImageUrl}
                                    playsInline
                                    autoPlay
                                    muted={isMuted}
                                    onTimeUpdate={(event) => {
                                        const video = event.currentTarget;
                                        setPlayProgress(video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0);
                                    }}
                                    onLoadedMetadata={(event) => {
                                        setVideoDuration(event.currentTarget.duration || 0);
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />
                                
                                {likeAnimation && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                         <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                                            <HeartFilledIcon />
                                         </motion.div>
                                    </div>
                                )}

                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-full border border-white/20 shadow-2xl">
                                            <PlayCenterIcon />
                                        </div>
                                    </div>
                                )}

                                {/* OVERLAYS */}
                                <div className="absolute top-0 left-0 right-0 p-6 pt-8 flex justify-between items-start z-20 pointer-events-none">
                                    <button onClick={() => navigate(-1)} className={`${glassyBtnClass} text-white pointer-events-auto`}>
                                        <BackArrowIcon />
                                    </button>
                                    <div className="flex gap-3 pointer-events-auto">
                                        <button onClick={() => setIsMuted(!isMuted)} className={`${glassyBtnClass} text-white`}>
                                            {isMuted ? <VolumeXIcon /> : <VolumeIcon />}
                                        </button>
                                        <button onClick={() => void handleToggleFullscreen()} className={`${glassyBtnClass} text-white`} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                                {isFullscreen ? <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="absolute left-0 right-0 top-0 z-20 h-1 bg-white/10">
                                    <div className="h-full bg-gradient-to-r from-blue-400 via-sky-500 to-cyan-400 transition-[width] duration-150" style={{ width: `${playProgress}%` }} />
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 pt-32 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-20 pointer-events-none">
                                    <div className="pointer-events-auto">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Link to={`/user/${activeReel.creatorId}`} className="text-white font-bold text-lg drop-shadow-md hover:underline">{creator?.name}</Link>
                                            <BlueTickBadge className="h-5 w-5" />
                                            {!isFollowing && (
                                                <button onClick={handleFollow} className="px-3 py-1 bg-transparent border border-white/50 rounded-full text-xs font-bold text-white hover:bg-white/20 transition-colors">
                                                    Follow
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-white/95 text-base font-medium leading-relaxed drop-shadow-sm mb-4">
                                            <p className={isCaptionExpanded ? '' : 'line-clamp-2'}>
                                                {activeReel.caption}
                                                {activeReel.hashtags.map(tag => <span key={tag} className="font-bold text-[#3b82f6] ml-1 cursor-pointer hover:underline">#{tag}</span>)}
                                            </p>
                                            {activeReel.caption.length > 80 && (
                                                <button onClick={() => setIsCaptionExpanded(!isCaptionExpanded)} className="text-xs text-gray-400 font-bold hover:text-white mt-1">
                                                    {isCaptionExpanded ? 'Show less' : 'more'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-white/20 transition-colors cursor-pointer shadow-lg">
                                            <div className="text-white"><MusicNoteIcon /></div>
                                            <div className="w-32 overflow-hidden relative">
                                                 <p className="text-xs font-bold text-white whitespace-nowrap animate-marquee">
                                                    Original Audio • {creator?.name} • Trending
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3 text-xs text-white/75">
                                            <span>{Math.round(playProgress)}%</span>
                                            <span>{videoDuration ? `${Math.max(0, Math.round(videoDuration - (videoDuration * playProgress) / 100))}s left` : 'Live playback'}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ACTIONS SIDEBAR */}
                    <div className="flex flex-col gap-5 items-center z-20 h-full justify-center">
                         <div className="relative cursor-pointer group/avatar mb-2">
                            <Link to={`/user/${activeReel.creatorId}`}>
                                <div className="w-[56px] h-[56px] rounded-full border-[3px] border-white p-0.5 overflow-hidden shadow-lg transition-transform group-hover/avatar:scale-110">
                                    <img src={creator?.avatar} className="w-full h-full rounded-full object-cover"/>
                                </div>
                            </Link>
                            {!isFollowing && (
                                <button onClick={handleFollow} className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 rounded-full p-0.5 border-2 border-white transform transition-transform group-hover/avatar:scale-110">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={handleLike}>
                                <div className={`${glassyBtnClass} ${isLiked ? 'text-red-500 bg-white/20' : 'text-white'}`}>
                                    {isLiked ? <HeartFilledIcon /> : <HeartIcon />}
                                </div>
                                <span className="text-xs font-bold text-gray-800 dark:text-white drop-shadow-md">{activeReel.likes}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={handleCommentToggle}>
                                <div className={`${glassyBtnClass} ${activePanel === 'comments' ? 'bg-white/30' : 'text-white'}`}>
                                    <CommentFillIcon />
                                </div>
                                <span className="text-xs font-bold text-gray-800 dark:text-white drop-shadow-md">{commentsList.length}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={handleSave}>
                                <div className={`${glassyBtnClass} ${isSaved ? 'text-yellow-400 bg-white/20' : 'text-white'}`}>
                                    {isSaved ? <BookmarkFillIcon /> : <BookmarkOutlineFillIcon />}
                                </div>
                                <span className="text-xs font-bold text-gray-800 dark:text-white drop-shadow-md">{isSaved ? "Saved" : "Save"}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={handleShareToggle}>
                                <div className={`${glassyBtnClass} ${activePanel === 'share' ? 'bg-white/30' : 'text-white'}`}>
                                    <ShareFillIcon />
                                </div>
                                <span className="text-xs font-bold text-gray-800 dark:text-white drop-shadow-md">Share</span>
                            </div>
                        </div>
                        
                         {/* Navigation Arrows */}
                        <div className="flex flex-col gap-4 mt-4">
                             <button onClick={handlePrev} className={`${glassyBtnClass} w-12 h-12 !p-0 text-white`}><ArrowUpIcon /></button>
                             <button onClick={handleNext} className={`${glassyBtnClass} w-12 h-12 !p-0 text-white`}><ArrowDownIcon /></button>
                        </div>
                    </div>

                    {/* RIGHT EXPANDABLE PANEL (Comments / Share) */}
                    <AnimatePresence>
                        {activePanel !== 'none' && (
                            <motion.div
                                initial={{ width: 0, opacity: 0, x: 20 }}
                                animate={{ width: 350, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: 20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="h-[800px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl rounded-[32px] border border-white/20 shadow-2xl overflow-hidden flex flex-col z-20"
                            >
                                {/* Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                        {activePanel === 'comments' ? `Comments (${commentsList.length})` : 'Share to'}
                                    </h3>
                                    <button onClick={() => setActivePanel('none')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"><XIcon /></button>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {activePanel === 'comments' ? (
                                        <>
                                            {commentsList.map(comment => (
                                                <div key={comment.id} className="flex gap-3 group">
                                                    <img src={comment.author.avatar} className="w-8 h-8 rounded-full object-cover border border-white/10"/>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{comment.author.name} <span className="font-normal opacity-50 ml-2">{new Date(comment.timestamp).toLocaleDateString()}</span></p>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200">{comment.text}</p>
                                                        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button className="text-[10px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white">Reply</button>
                                                            {user && user.id === comment.author.id && <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] font-semibold text-red-400 hover:text-red-500">Delete</button>}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleLikeComment(comment.id)} className={`self-start text-xs ${comment.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}>
                                                        {comment.isLiked ? <HeartFilledIcon /> : <HeartIcon />}
                                                    </button>
                                                </div>
                                            ))}
                                            {commentsList.length === 0 && <p className="text-center text-gray-400 mt-10 text-sm">No comments yet. Be the first!</p>}
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <SearchIcon />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search users..." 
                                                    value={shareSearchQuery}
                                                    onChange={(e) => setShareSearchQuery(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                                />
                                                <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"><SearchIcon /></div>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Suggested</h4>
                                                {filteredUsers.length > 0 ? filteredUsers.slice(0, 5).map(u => (
                                                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <img src={u.avatar} className="w-10 h-10 rounded-full object-cover" />
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{u.name}</p>
                                                                <p className="text-xs text-gray-500">{u.email}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleSendPixe(u.name)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/80">Send</button>
                                                    </div>
                                                )) : <p className="text-center text-sm text-gray-500 py-4">No users found.</p>}
                                            </div>
                                            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                                                <button onClick={copyLink} className="w-full py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-white/20">
                                                    <LinkIcon /> Copy Link
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer (Input for comments) */}
                                {activePanel === 'comments' && (
                                    <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                                        <form onSubmit={submitComment} className="flex gap-2 items-center">
                                            <img src={user?.avatar || "/icons/urbanprime.svg"} className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/10" />
                                            <input 
                                                value={commentInput} 
                                                onChange={e => setCommentInput(e.target.value)} 
                                                placeholder="Add a comment..."
                                                className="flex-1 bg-white dark:bg-white/10 rounded-full px-4 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary border border-gray-200 dark:border-transparent placeholder-gray-400"
                                            />
                                            <button type="submit" disabled={!commentInput.trim()} className="p-2 text-primary hover:text-white transition-colors disabled:opacity-50"><SendIcon/></button>
                                        </form>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                </main>
            </div>
        </div>
    );
};

export default ReelsPage;


