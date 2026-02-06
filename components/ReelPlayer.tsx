
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Reel, User, Item, ReelComment } from '../types';
import { userService, itemService, reelService } from '../services/itemService';
import { useAuth } from '../../hooks/useAuth';
import Spinner from './Spinner';
import { useNotification } from '../../context/NotificationContext';
import BackButton from './BackButton';


// --- Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-white/80 filter drop-shadow(0 2px 4px rgba(0,0,0,0.5))"><path d="M8 5v14l11-7z"></path></svg>;
const LikeIcon = ({isLiked, size = 32}: {isLiked: boolean, size?: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" 
    fill={isLiked ? 'currentColor' : 'none'} 
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={`transition-all duration-200 ${isLiked ? 'text-red-500' : ''}`}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>;
const ShopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>;
const BookmarkIcon = ({isSaved}: {isSaved: boolean}) => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>;
const MoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>;


// --- Sub-components ---

const CommentTray: React.FC<{ reel: Reel; onClose: () => void }> = ({ reel, onClose }) => {
    const { user, openAuthModal } = useAuth();
    const [comments, setComments] = useState<ReelComment[]>(reel.comments);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        if (!user) {
            openAuthModal('login');
            return;
        }
        if (!newComment.trim()) return;
        setIsPosting(true);
        try {
            const updatedReel = await reelService.addCommentToReel(reel.id, user, newComment);
            setComments(updatedReel.comments);
            setNewComment('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="reel-tray-backdrop" onClick={onClose}>
            <div className="reel-tray" onClick={e => e.stopPropagation()}>
                <header className="reel-tray-header">
                    <h3>{comments.length} Comments</h3>
                    <button onClick={onClose} className="reel-tray-close-btn"><CloseIcon /></button>
                </header>
                <div className="reel-tray-content">
                    {comments.length > 0 ? comments.map(comment => (
                        <div key={comment.id} className="comment-item">
                            <img src={comment.author.avatar} alt={comment.author.name} className="comment-avatar" />
                            <div className="comment-body">
                                <p><span className="author">{comment.author.name}</span> <span className="text">{comment.text}</span></p>
                                <p className="timestamp">{new Date(comment.timestamp).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )) : <p className="text-center text-sm text-gray-500">No comments yet. Be the first!</p>}
                </div>
                {user && (
                    <div className="comment-form">
                        <img src={user.avatar} alt="My avatar" className="w-8 h-8 rounded-full" />
                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handlePost()}
                            placeholder="Add a comment..."
                            className="comment-input"
                        />
                        <button onClick={handlePost} disabled={isPosting} className="font-semibold text-primary disabled:text-gray-400">
                            {isPosting ? <Spinner size="sm" /> : 'Post'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ShareTray: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { showNotification } = useNotification();
    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        showNotification("Link copied to clipboard!");
    };
    return (
         <div className="reel-tray-backdrop" onClick={onClose}>
            <div className="reel-tray" onClick={e => e.stopPropagation()}>
                <header className="reel-tray-header">
                    <h3>Share</h3>
                    <button onClick={onClose} className="reel-tray-close-btn"><CloseIcon /></button>
                </header>
                <div className="reel-tray-content">
                    <button onClick={handleCopyLink} className="share-option w-full">Copy Link</button>
                    <button className="share-option w-full">Share to Friend (mock)</button>
                    <button className="share-option w-full">Share to Twitter (mock)</button>
                </div>
            </div>
        </div>
    );
};

const ShopTogetherTray: React.FC<{onClose: () => void}> = ({ onClose }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if(!input.trim()) return;
        setMessages(prev => [...prev, {user: 'You', text: input}]);
        setInput('');
        // Simulate a friend's response
        setTimeout(() => {
            setMessages(prev => [...prev, {user: 'Bob', text: 'Looks cool!'}]);
        }, 1500);
    }
    
    return (
        <div className="absolute bottom-24 right-20 w-72 h-96 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md rounded-lg shadow-2xl flex flex-col z-20 border dark:border-gray-700 animate-fade-in-up">
            <header className="p-2 border-b dark:border-gray-700 flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-800 dark:text-dark-text">Shop Together</h4>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon/></button>
            </header>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto text-sm">
                {messages.map((msg, i) => (
                    <div key={i}>
                        <span className="font-bold">{msg.user}: </span>
                        <span>{msg.text}</span>
                    </div>
                ))}
            </div>
            <div className="p-2 border-t dark:border-gray-700 flex gap-1">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} className="flex-1 p-2 text-sm bg-gray-100 dark:bg-dark-background rounded-md" placeholder="Chat..."/>
                <button onClick={handleSend} className="p-2 bg-primary text-white rounded-md"><SendIcon/></button>
            </div>
        </div>
    )
};


// --- Main Player ---
interface ReelPlayerProps {
  reel: Reel;
}

const ReelPlayer: React.FC<ReelPlayerProps> = ({ reel }) => {
  const { user, openAuthModal, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [creator, setCreator] = useState<User | null>(null);
  const [taggedItems, setTaggedItems] = useState<Item[]>([]);
  const [isShopTrayOpen, setIsShopTrayOpen] = useState(false);
  const [isCommentTrayOpen, setIsCommentTrayOpen] = useState(false);
  const [isShareTrayOpen, setIsShareTrayOpen] = useState(false);
  const [isShopTogetherOpen, setIsShopTogetherOpen] = useState(false);
  
  // Like state
  const [isLiked, setIsLiked] = useState(user?.likedReels?.includes(reel.id) || false);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isLikeButtonAnimating, setIsLikeButtonAnimating] = useState(false);
  const lastTap = useRef(0);
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const isOwnProfile = user?.id === reel.creatorId;

  useEffect(() => {
    const video = videoRef.current;
    const viewport = viewportRef.current;
    if (!video || !viewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!isAnimated) setIsAnimated(true);
          video.play().catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Autoplay failed:", e);
            }
          });
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }, { threshold: 0.5 }
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [reel.id, isAnimated]);

  useEffect(() => {
    userService.getUserById(reel.creatorId).then(creatorUser => {
        setCreator(creatorUser || null);
        if (user && creatorUser) {
            setIsFollowing(user.following.includes(creatorUser.id));
        }
    });
    if (reel.taggedItemIds.length > 0) {
      Promise.all(reel.taggedItemIds.map(id => itemService.getItemById(id)))
        .then(items => setTaggedItems(items.filter(Boolean) as Item[]));
    }
  }, [reel, user]);
  
  useEffect(() => {
    setIsLiked(user?.likedReels?.includes(reel.id) || false);
  }, [user?.likedReels, reel.id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  
  const handleLike = async () => {
    if (!user) {
        openAuthModal('login');
        return;
    }
    const newLikedState = !isLiked;
    // Optimistic UI updates
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
    if (newLikedState) {
        setIsLikeButtonAnimating(true);
        setTimeout(() => setIsLikeButtonAnimating(false), 600);
    }

    try {
        // Update backend and sync auth context
        const updatedUser = await reelService.toggleLikeReel(user.id, reel.id);
        updateUser(updatedUser);
    } catch (error) {
        console.error("Failed to toggle like:", error);
        // Revert UI on failure
        setIsLiked(!newLikedState);
        setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
        showNotification("Failed to update like.");
    }
  };
  
  const handleFollow = async () => {
    if (!user) {
        openAuthModal('login');
        return;
    }
    if (!creator) return;

    const newFollowingState = !isFollowing;
    // Optimistic update
    setIsFollowing(newFollowingState);
    
    try {
        const { currentUser } = await userService.toggleFollow(user.id, creator.id);
        updateUser(currentUser);
    } catch (e) {
        // revert on error
        setIsFollowing(!newFollowingState);
        showNotification("Something went wrong. Please try again.");
    }
  };

  const handleTap = () => {
    const now = new Date().getTime();
    const timeSinceLastTap = now - lastTap.current;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap
      if (!isLiked) {
        handleLike();
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 800);
      }
    } else {
      // Single tap
      togglePlay();
    }
    lastTap.current = now;
  };

  return (
    <>
        <div ref={viewportRef} className={`reel-viewport ${isAnimated ? 'animate-reel-enter' : 'opacity-0'}`} onClick={handleTap}>
            <video ref={videoRef} src={reel.videoUrl} loop playsInline muted className="reel-video" />
            
            {showLikeAnimation && <div className="like-heart-animation"><LikeIcon isLiked={true} size={128} /></div>}

            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <PlayIcon />
                </div>
            )}
            
            <div className="reel-header">
                 {/* Replaced custom button with shared BackButton */}
                <BackButton className="back-button !text-white hover:!text-gray-200" />
                <h2 className="title flex items-center gap-1">
                     <img src="https://i.ibb.co/jkyfqdFV/Gemini-Generated-Image-gqj0u3gqj0u3gqj0.png" alt="Pixe Logo" className="h-6 w-auto object-contain" />
                     <span className="text-inherit">Pixe</span>
                     <span className="text-primary">.</span>
                </h2>
            </div>
            
            <div className="reel-content-container" onClick={e => e.stopPropagation()}>
                <div className="reel-info">
                    <div className="flex gap-2 items-center">
                        {taggedItems.length > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); setIsShopTrayOpen(true); }} className="reel-shop-button">
                                <ShopIcon />
                                <span>Shop this Pixe</span>
                            </button>
                        )}
                        <button onClick={() => setIsShopTogetherOpen(p => !p)} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-sm">
                            <UsersIcon />
                        </button>
                    </div>
                    {creator && (
                        <div className="flex items-center gap-2 mb-2 mt-4">
                            <Link to={`/user/${creator.id}`} className="flex items-center gap-3">
                                <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full border-2 border-current"/>
                                <span className="font-bold text-sm">{creator.name}</span>
                            </Link>
                            {!isOwnProfile && (
                                <button
                                    onClick={handleFollow}
                                    className={`reel-follow-btn ${isFollowing ? 'following' : ''}`}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-sm line-clamp-2">{reel.caption}</p>
                </div>
            </div>
             {isShopTogetherOpen && <ShopTogetherTray onClose={() => setIsShopTogetherOpen(false)}/>}
        </div>
        
        <div className="reel-actions" onClick={e => e.stopPropagation()}>
            <button onClick={handleLike} className={`reel-action-button ${isLikeButtonAnimating ? 'animate-heart-beat' : ''}`}>
                <LikeIcon isLiked={isLiked} />
                <span className="count">{likeCount}</span>
            </button>
            <button onClick={() => setIsCommentTrayOpen(true)} className="reel-action-button">
                <CommentIcon />
                <span className="count">{reel.comments.length}</span>
            </button>
            <button onClick={() => setIsShareTrayOpen(true)} className="reel-action-button">
                <ShareIcon />
                <span className="count">{reel.shares}</span>
            </button>
            <button className="reel-action-button">
                <BookmarkIcon isSaved={false} />
            </button>
            <button className="reel-action-button">
                <MoreIcon />
            </button>
            {creator && <div className="reel-creator-record"><img src={creator.avatar} alt={creator.name} /></div>}
        </div>
        
        {isShopTrayOpen && taggedItems.length > 0 && (
            <div className="reel-tray-backdrop" onClick={(e) => {e.stopPropagation(); setIsShopTrayOpen(false);}}>
                <div 
                    className="reel-tray"
                    onClick={e => e.stopPropagation()}
                >
                    <header className="reel-tray-header">
                        <h3 className="font-bold text-gray-900 dark:text-dark-text">Shop this Reel</h3>
                         <button onClick={() => setIsShopTrayOpen(false)} className="reel-tray-close-btn"><CloseIcon /></button>
                    </header>
                    <div className="reel-tray-content">
                        {taggedItems.map(item => (
                            <Link to={`/item/${item.id}`} key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-background">
                            <img src={item.imageUrls[0]} alt={item.title} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-sm text-gray-800 dark:text-dark-text line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.owner.name}</p>
                                    <p className="text-sm font-bold text-primary">${item.salePrice || item.rentalPrice}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {isCommentTrayOpen && <CommentTray reel={reel} onClose={() => setIsCommentTrayOpen(false)} />}
        {isShareTrayOpen && <ShareTray onClose={() => setIsShareTrayOpen(false)} />}
    </>
  );
};

export default ReelPlayer;
