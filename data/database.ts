// data/database.ts
import { HIERARCHICAL_CATEGORIES } from '../constants';
import type { User, Item, Review, Category, Badge, BadgeID, DashboardAnalytics, Booking, DiscountCode, ItemBundle, RentalHistoryItem, ProjectShowcase, VerificationLevel, ChatThread, ChatMessage, Question, SupplierProduct, Offer, ItemCollection, Milestone, MilestoneID, Transaction, Affiliate, AffiliateEarning, Store, Event, AffiliateLink, AffiliateCoupon, CreativeAsset, AffiliateCampaign, ExternalProductSubmission, ContentReviewSubmission, WalletTransaction, PasswordResetToken, Reel, ReelComment, WishlistItem, WishlistItemComment, Post, PostComment, PixeAnalytics, ViewEvent, TrafficSource, InspirationContent, GameUpload, LiveStream, Notification, SiteSettings, ViewerProfile } from '../types';

class MockDB {
  private static data: Map<string, any> = new Map();
  private static isInitialized = false;

  public init() {
    // FIX: Corrected typo from Mock-DB to MockDB.
    if (MockDB.isInitialized) return;
    
    this.populateUsers();
    this.populateItems();
    this.populateReels();
    this.populatePosts(); // New
    this.populateInspirationContent();
    this.populateGames();
    this.populateLiveStreams(); // New
    this.populateOtherData();
    this.simulateRealTimeViews();

    MockDB.isInitialized = true;
  }

  public get<T>(key: string): T {
    return MockDB.data.get(key);
  }

  public set<T>(key: string, value: T): void {
    MockDB.data.set(key, value);
  }
  
  private simulateRealTimeViews() {
    setInterval(() => {
        const reels = this.get<Reel[]>('reels');
        if (!reels) return;

        const publishedReels = reels.filter(r => r.status === 'published');
        if (publishedReels.length === 0) return;

        // --- More realistic simulation logic ---
        // 80% chance to view the "trending" reel, 20% for others
        let reelToUpdate: Reel;
        const trendingReel = reels.find(r => r.id === 'reel-5'); // Designate reel-5 as trending

        if (trendingReel && Math.random() < 0.8) {
          reelToUpdate = trendingReel;
        } else {
          reelToUpdate = publishedReels[Math.floor(Math.random() * publishedReels.length)];
        }
        
        // --- Update View ---
        if (!reelToUpdate.viewEvents) {
            reelToUpdate.viewEvents = [];
        }

        const cities = ['San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Houston'];
        const sources: ('Browse' | 'Search' | 'Profile' | 'External')[] = ['Browse', 'Search', 'Profile', 'External'];
        const genders: ('Male' | 'Female' | 'Other')[] = ['Male', 'Female', 'Other'];

        const newView: ViewEvent = {
            timestamp: new Date().toISOString(),
            viewerProfile: {
                age: 13 + Math.floor(Math.random() * 50),
                gender: genders[Math.floor(Math.random() * genders.length)],
                city: cities[Math.floor(Math.random() * cities.length)],
                source: sources[Math.floor(Math.random() * sources.length)],
            }
        };
        
        reelToUpdate.viewEvents.push(newView);
        
        // --- Update other stats occasionally ---
        // 1 in 10 views gets a like
        if (Math.random() < 0.1) {
            reelToUpdate.likes++;
        }
        // 1 in 50 views gets a share
        if (Math.random() < 0.02) {
            reelToUpdate.shares++;
        }
        // 1 in 100 views gets a comment
        if (Math.random() < 0.01) {
            const users = this.get<User[]>('users');
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const newComment: ReelComment = {
                id: `rc-sim-${Date.now()}`,
                author: { id: randomUser.id, name: randomUser.name, avatar: randomUser.avatar },
                text: "Wow, cool!",
                timestamp: new Date().toISOString(),
            };
            reelToUpdate.comments.push(newComment);
        }
        
        // --- IMPORTANT: Sync top-level `views` count ---
        reelToUpdate.views = reelToUpdate.viewEvents.length;

        this.set('reels', reels);
    }, 2000); // Add a new view every 2 seconds
  }

  private generateViewEvents(count: number): ViewEvent[] {
    const events: ViewEvent[] = [];
    const cities = ['San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Houston'];
    const sources: ('Browse' | 'Search' | 'Profile' | 'External')[] = ['Browse', 'Search', 'Profile', 'External'];
    const genders: ('Male' | 'Female' | 'Other')[] = ['Male', 'Female', 'Other'];

    for (let i = 0; i < count; i++) {
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        const viewerProfile: ViewerProfile = {
            age: 13 + Math.floor(Math.random() * 50), // Age 13-62
            gender: genders[Math.floor(Math.random() * genders.length)],
            city: cities[Math.floor(Math.random() * cities.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
        };
        events.push({ timestamp, viewerProfile });
    }
    return events;
  }

  private populateUsers() {
    const users: User[] = [
      { id: 'user-1', name: 'Ahmed Ali', storeId: 'store-1', email: 'ahmed@gmail.com', password: '123098', avatar: '/icons/urbanprime.svg', memberSince: '2022-01-15', rating: 4.8, interests: ['electronics', 'tools'], style: 'DIY Champion', badges: ['power-lister', 'community-helper', 'category-expert'], wishlist: [{ itemId: 'item-2', addedAt: new Date().toISOString(), isPublic: true, likes: ['user-2'], comments: [{userId: 'user-2', name: 'Alice Johnson', avatar: '/icons/urbanprime.svg', text: 'Great find!', timestamp: new Date().toISOString() }] }], following: ['user-2'], followers: ['user-3'], verificationLevel: 'level2', isAdmin: true, status: 'active', phone: '123-456-7890', city: 'San Francisco', about: 'Your friendly neighborhood tool guy. I take great care of my equipment and expect the same from renters. Happy to help with project advice!', milestoneProgress: [{milestoneId: 'lister-novice', progress: 5}, {milestoneId: 'earner-100', progress: 150}], walletBalance: 25.50, reels: ['reel-2', 'reel-4', 'reel-6', 'reel-draft-1'], likedReels: ['reel-1', 'reel-3'], posts: ['post-2'], likedPosts:['post-1'], unlockedItemIds: [], dailyUsage: { date: '1970-01-01', videos: 0, images: 0 }, addresses: [{id: 'addr-1', name: 'Home', addressLine1: '123 Market St', city: 'San Francisco', state: 'CA', zip: '94103', country: 'United States', isDefault: true}], rewardPoints: 1250, dailyStreak: 3 },
      { id: 'user-2', name: 'Alice Johnson', storeId: 'store-2', email: 'alice@example.com', password: 'password123', avatar: '/icons/urbanprime.svg', memberSince: '2022-03-20', rating: 4.9, interests: ['electronics', 'clothing'], style: 'Creative Pro', badges: ['first-rental'], wishlist: [{ itemId: 'item-1', addedAt: new Date().toISOString(), isPublic: true, likes: [], comments: [] }, { itemId: 'item-3', addedAt: new Date().toISOString(), isPublic: true, likes: [], comments: [] }], following: ['user-3'], followers: ['user-1'], verificationLevel: 'level1', status: 'active', phone: '111-222-3333', city: 'Oakland', about: 'Photographer and designer. My gear is top-of-the-line and perfect for your next creative project.', walletBalance: 0, reels: ['reel-1', 'reel-3', 'reel-5'], likedReels: [], posts: ['post-1'], likedPosts:[], unlockedItemIds: [], dailyUsage: { date: '1970-01-01', videos: 0, images: 0 }, addresses: [], rewardPoints: 450, dailyStreak: 1 },
      { id: 'user-3', name: 'Bob Williams', storeId: 'store-3', email: 'bob@example.com', password: 'password123', avatar: '/icons/urbanprime.svg', memberSince: '2023-05-10', rating: 4.5, interests: ['tools'], style: 'Weekend Warrior', badges: [], wishlist: [], following: ['user-1'], followers: ['user-2'], verificationLevel: 'none', status: 'active', phone: '444-555-6666', city: 'San Francisco', walletBalance: 10.00, reels: [], likedReels: ['reel-1'], posts:[], likedPosts:[], unlockedItemIds: [], dailyUsage: { date: '1970-01-01', videos: 0, images: 0 }, addresses: [], rewardPoints: 50, dailyStreak: 0 }
    ];
    this.set('users', users);
  }

  private populateItems() {
    const users = this.get<User[]>('users');
    const items: Item[] = [
// FIX: Added missing 'status' property.
      { id: 'item-1', title: 'Professional DSLR Camera Kit', description: 'Canon EOS 5D Mark IV with 24-70mm f/2.8L II USM Lens. Perfect for professional photography and videography.', category: 'cameras-lenses', imageUrls: ['https://picsum.photos/seed/camera1/600/400', 'https://picsum.photos/seed/camera2/600/400'], owner: users[1], reviews: [], avgRating: 4.9, listingType: 'rent', rentalPrice: 75, rentalPriceType: 'daily', stock: 1, condition: 'used-like-new', brand: 'Canon', createdAt: '2023-10-25T10:00:00Z', status: 'published', isVerified: true, isFeatured: true, questions: [{ id: 'q-1', questionText: "Does this come with a memory card?", author: {id: 'user-1', name: 'Ahmed Ali'}, date: new Date().toISOString(), answer: { text: "Yes, it includes a 64GB SD card.", helpfulVotes: 4 } }], battleWins: 10, battleAppearances: 15 },
// FIX: Added missing 'status' property.
      { id: 'item-2', title: 'Heavy-Duty Hammer Drill', description: 'Bosch 11255VSR Bulldog Xtreme 1-Inch Corded Rotary Hammer. Comes with a full set of bits.', category: 'drills-drivers', imageUrls: ['https://picsum.photos/seed/drill1/600/400'], owner: users[0], reviews: [], avgRating: 4.7, listingType: 'both', rentalPrice: 20, rentalPriceType: 'daily', salePrice: 150, stock: 1, condition: 'used-good', brand: 'Bosch', createdAt: '2023-10-24T11:00:00Z', status: 'published', isVerified: true, questions: [], battleWins: 5, battleAppearances: 12 },
// FIX: Added missing 'status' property.
      { id: 'item-3', title: 'DJI Mavic 3 Pro Drone', description: 'Capture stunning aerial footage with this top-of-the-line drone. Includes 3 batteries and a carrying case.', category: 'drones', imageUrls: ['https://picsum.photos/seed/drone1/600/400'], owner: users[1], reviews: [], avgRating: 5.0, listingType: 'rent', rentalPrice: 120, rentalPriceType: 'daily', stock: 1, condition: 'used-like-new', brand: 'DJI', createdAt: '2023-10-22T14:00:00Z', status: 'published', isVerified: false, questions: [], battleWins: 20, battleAppearances: 22 },
      { 
        id: 'item-4', 
        title: 'Men\'s Classic Leather Jacket', 
        description: 'Stylish and timeless leather jacket. Perfect for a night out. Size Large.', 
        category: 'mens-clothing', 
        imageUrls: ['https://picsum.photos/seed/jacket1/600/400'], 
        owner: users[0], 
        reviews: [], 
        avgRating: 4.5, 
        listingType: 'auction', 
        stock: 1, 
        condition: 'new', 
        brand: 'Schott', 
        createdAt: '2023-10-20T18:00:00Z', 
// FIX: Added missing 'status' property.
        status: 'published',
        isFeatured: true, 
        questions: [], 
        battleWins: 8, 
        battleAppearances: 18,
        buyNowPrice: 450,
        reservePrice: 300,
        auctionDetails: {
            startingBid: 200,
            currentBid: 250,
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Ends in 2 days
            bidCount: 2,
            bids: [
                { userId: 'user-3', userName: 'Bob Williams', amount: 250, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
                { userId: 'user-2', userName: 'Alice Johnson', amount: 225, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
            ]
        }
      },
// FIX: Added missing 'status' property.
      { id: 'item-5', title: 'Organic Apples (5 lb bag)', description: 'Fresh, crisp, and locally sourced organic gala apples.', category: 'fresh-food', imageUrls: ['https://picsum.photos/seed/apples/600/400'], owner: users[0], reviews: [], avgRating: 4.8, listingType: 'sale', salePrice: 8.99, stock: 50, condition: 'new', brand: 'Local Farm', createdAt: new Date().toISOString(), status: 'published' },
// FIX: Added missing 'status' property.
      { id: 'item-secret-1', title: 'Secret Legendary Sword', description: 'A mysterious and powerful blade, unlocked only by the most dedicated explorers of Urban Prime.', category: 'art-collectibles', imageUrls: ['https://picsum.photos/seed/sword/600/400'], owner: users[0], reviews: [], avgRating: 5, listingType: 'sale', salePrice: 9999, stock: 1, condition: 'new', brand: 'Ancient Forge', createdAt: '2024-01-01T00:00:00Z', isSecret: true, unlockConditions: { type: 'view_reels', value: 5 }, status: 'published' }
    ];
    // Add reviews
    items[0].reviews = [
        { id: 'review-1', itemId: 'item-1', itemTitle: items[0].title, itemImageUrl: items[0].imageUrls[0], author: { id: users[0].id, name: users[0].name, avatar: users[0].avatar }, rating: 5, comment: 'Great camera, exactly as described. Alice was very helpful.', date: '2023-09-10' }
    ];
    items[0].avgRating = 5;
     items[1].reviews = [
        { id: 'review-2', itemId: 'item-2', itemTitle: items[1].title, itemImageUrl: items[1].imageUrls[0], author: { id: users[2].id, name: users[2].name, avatar: users[2].avatar }, rating: 4, comment: 'Powerful drill, but a bit heavy.', date: '2023-09-15' }
    ];
    items[1].avgRating = 4;
    items[2].reviews = [
        { id: 'review-3', itemId: 'item-3', itemTitle: items[2].title, itemImageUrl: items[2].imageUrls[0], author: { id: users[0].id, name: users[0].name, avatar: users[0].avatar }, rating: 5, comment: 'Amazing drone for professional work. Highly recommend renting from Alice.', date: '2023-10-01' }
    ];
    items[2].avgRating = 5;

    this.set('items', items);
  }

  private populateReels() {
    const reel1Events = this.generateViewEvents(50);
    const reel2Events = this.generateViewEvents(30);
    const reel3Events = this.generateViewEvents(80);
    const reel4Events = this.generateViewEvents(10);
    const reel5Events = this.generateViewEvents(120);
    const reel6Events = this.generateViewEvents(45);
      
    const reels: Reel[] = [
      { id: 'reel-1', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', creatorId: 'user-2', caption: 'Testing out the new camera kit! The quality is insane. #cameragear #filmmaking', taggedItemIds: ['item-1'], likes: 152, comments: [], shares: 23, createdAt: '2024-05-20T10:00:00Z', hashtags: ['cameragear', 'filmmaking'], showShopButton: true, coverImageUrl: 'https://picsum.photos/seed/reel-1-cover/400/600', views: reel1Events.length, status: 'published', viewEvents: reel1Events },
      { id: 'reel-2', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', creatorId: 'user-1', caption: 'Quick demo of this awesome hammer drill. It goes through concrete like butter!', taggedItemIds: ['item-2'], likes: 88, comments: [], shares: 12, createdAt: '2024-05-19T11:00:00Z', hashtags: ['diy', 'tools'], showShopButton: true, coverImageUrl: 'https://picsum.photos/seed/reel-2-cover/400/600', views: reel2Events.length, status: 'published', viewEvents: reel2Events },
      { id: 'reel-3', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', creatorId: 'user-2', caption: 'Just a beautiful day flying my drone. No products here, just vibes. #drone #scenery', taggedItemIds: [], likes: 230, comments: [], shares: 45, createdAt: '2024-05-18T14:00:00Z', hashtags: ['drone', 'scenery'], showShopButton: false, coverImageUrl: 'https://picsum.photos/seed/reel-3-cover/400/600', views: reel3Events.length, status: 'published', viewEvents: reel3Events },
      { id: 'reel-4', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', creatorId: 'user-1', caption: 'Putting this jacket to the test on a chilly SF night.', taggedItemIds: ['item-4'], likes: 45, comments: [], shares: 5, createdAt: '2024-05-17T18:00:00Z', hashtags: ['fashion', 'style'], showShopButton: true, coverImageUrl: 'https://picsum.photos/seed/reel-4-cover/400/600', views: reel4Events.length, status: 'published', viewEvents: reel4Events },
      { id: 'reel-5', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', creatorId: 'user-2', caption: 'More drone shots!', taggedItemIds: ['item-3'], likes: 310, comments: [], shares: 50, createdAt: '2024-05-16T10:00:00Z', hashtags: ['drone', 'cinematic'], showShopButton: true, coverImageUrl: 'https://picsum.photos/seed/reel-5-cover/400/600', views: reel5Events.length, status: 'published', viewEvents: reel5Events },
      { id: 'reel-6', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', creatorId: 'user-1', caption: 'Another great tool for the workshop.', taggedItemIds: ['item-2'], likes: 95, comments: [], shares: 15, createdAt: '2024-05-15T12:00:00Z', hashtags: ['woodworking'], showShopButton: true, coverImageUrl: 'https://picsum.photos/seed/reel-6-cover/400/600', views: reel6Events.length, status: 'published', viewEvents: reel6Events },
      { id: 'reel-draft-1', videoUrl: null, creatorId: 'user-1', caption: 'My new draft video!', taggedItemIds: [], likes: 0, comments: [], shares: 0, createdAt: '2024-05-21T09:00:00Z', hashtags: [], showShopButton: true, coverImageUrl: 'https://picsum.photos/seed/reel-draft-cover/400/600', views: 0, status: 'draft', viewEvents: [] },
    ];
    this.set('reels', reels);
  }

  private populatePosts() {
      const users = this.get<User[]>('users');
      const posts: Post[] = [
// FIX: Added missing 'status' property.
          { id: 'post-1', creatorId: 'user-2', imageUrl: 'https://picsum.photos/seed/post1/600/600', caption: 'A beautiful sunset over the Golden Gate Bridge. Feeling inspired!', likes: 120, comments: [{id: 'pc-1', author: users[0], text: 'Amazing shot!', timestamp: new Date().toISOString()}], createdAt: '2023-10-26T18:00:00Z', status: 'published' },
// FIX: Added missing 'status' property.
          { id: 'post-2', creatorId: 'user-1', imageUrl: 'https://picsum.photos/seed/post2/600/600', caption: 'My latest woodworking project is finally complete. So happy with how this table turned out.', likes: 75, comments: [], createdAt: '2023-10-25T12:00:00Z', status: 'published' },
      ];
      this.set('posts', posts);
  }

  private populateInspirationContent() {
    const inspirationContent: InspirationContent[] = [
      { id: 'img-1', type: 'image', url: 'https://picsum.photos/seed/inspire1/800/600', prompt: 'A futuristic cityscape at dusk', generatedBy: 'system', likes: 123 },
      { id: 'vid-1', type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', prompt: 'People having fun at a park', generatedBy: 'system', likes: 45 },
      { id: 'img-2', type: 'image', url: 'https://picsum.photos/seed/inspire2/800/1200', prompt: 'An enchanted forest with glowing mushrooms', generatedBy: 'system', likes: 289 },
      { id: 'vid-2', type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', prompt: 'A surreal, abstract animation', generatedBy: 'system', likes: 76 },
      { id: 'img-3', type: 'image', url: 'https://picsum.photos/seed/inspire3/800/1000', prompt: 'Portrait of a knight in shining armor, detailed, photorealistic', generatedBy: 'system', likes: 312 },
      { id: 'img-4', type: 'image', url: 'https://picsum.photos/seed/inspire4/800/800', prompt: 'A cute robot holding a red balloon', generatedBy: 'system', likes: 510 },
    ];
    this.set('inspirationContent', inspirationContent);
  }

  private populateGames() {
    const users = this.get<User[]>('users');
    const gameUploads: GameUpload[] = [
        {
            id: 'game-1',
            name: 'Pixel Platformer Demo',
            description: 'A fun little platformer demo created with a retro pixel art style. Jump, run, and collect coins! Built with a custom engine.',
            version: '1.0.1',
            category: 'Indie Game',
            uploader: { id: users[1].id, name: users[1].name, avatar: users[1].avatar },
            coverImageUrl: 'https://picsum.photos/seed/game1/600/400',
            fileUrl: '#', // Placeholder
            fileSize: '55 MB',
            downloads: 1258,
            createdAt: '2023-10-20T10:00:00Z'
        },
        {
            id: 'game-2',
            name: 'HD Texture Pack for SimCraft',
            description: 'Revamp the world of SimCraft with these high-resolution textures. This resource pack overhauls all the default blocks, items, and mobs for a more realistic look.',
            version: '2.3.0',
            category: 'Resource Pack',
            uploader: { id: users[0].id, name: users[0].name, avatar: users[0].avatar },
            coverImageUrl: 'https://picsum.photos/seed/game2/600/400',
            fileUrl: '#', // Placeholder
            fileSize: '210 MB',
            downloads: 8432,
            createdAt: '2023-10-18T15:30:00Z'
        },
        {
            id: 'game-3',
            name: 'Advanced Inventory Mod',
            description: 'An essential utility mod that adds powerful sorting and searching capabilities to your inventory in the game "Galaxy Explorers".',
            version: '4.1.2',
            category: 'Mod',
            uploader: { id: users[2].id, name: users[2].name, avatar: users[2].avatar },
            coverImageUrl: 'https://picsum.photos/seed/game3/600/400',
            fileUrl: '#', // Placeholder
            fileSize: '5 MB',
            downloads: 25410,
            createdAt: '2023-10-22T11:00:00Z'
        },
    ];
    this.set('gameUploads', gameUploads);
  }

  private populateLiveStreams() {
    const users = this.get<User[]>('users');
    const streams: LiveStream[] = [
        {
            id: 'stream-1',
            title: 'Camera Gear Demo & Q&A',
            hostName: users[1].name,
            hostAvatar: users[1].avatar,
            viewers: 254,
            thumbnailUrl: 'https://picsum.photos/seed/stream-1/600/400',
            videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', // Mock video
            featuredItemIds: ['item-1'],
            isLive: true,
        },
        {
            id: 'stream-2',
            title: 'Woodworking Masterclass',
            hostName: users[0].name,
            hostAvatar: users[0].avatar,
            viewers: 120,
            thumbnailUrl: 'https://picsum.photos/seed/stream-2/600/400',
            videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', // Mock video
            featuredItemIds: ['item-2'],
            isLive: true,
        }
    ];
    this.set('liveStreams', streams);
  }

  private populateOtherData() {
    this.set('hierarchicalCategories', HIERARCHICAL_CATEGORIES);
    const badges: Record<BadgeID, Badge> = {
        'first-rental': { id: 'first-rental', name: 'First Timer', icon: 'star', description: 'Completed their first rental or sale.' },
        'power-lister': { id: 'power-lister', name: 'Power Lister', icon: 'zap', description: 'Has listed 5 or more items.' },
        'community-helper': { id: 'community-helper', name: 'Community Helper', icon: 'heart', description: 'Received 5+ positive reviews.' },
        'category-expert': { id: 'category-expert', name: 'Category Expert', icon: 'award', description: 'Top lister in a specific category.' },
        'verified': { id: 'verified', name: 'Verified', icon: 'check', description: 'Identity verified.' },
        'top-seller': { id: 'top-seller', name: 'Top Seller', icon: 'star', description: 'Top rated seller.' },
        'just-launched': { id: 'just-launched', name: 'New Seller', icon: 'rocket', description: 'Recently joined seller.' },
    };
    this.set('badges', badges);
    const milestones: Record<MilestoneID, Milestone> = {
        'lister-novice': {id: 'lister-novice', name: 'Lister Novice', description: 'List your first item', goal: 1, icon: 'list'},
        'lister-pro': {id: 'lister-pro', name: 'Lister Pro', description: 'List 5 items', goal: 5, icon: 'list'},
        'earner-100': {id: 'earner-100', name: 'Earner $100', description: 'Earn your first $100', goal: 100, icon: 'earn'},
        'earner-500': {id: 'earner-500', name: 'Earner $500', description: 'Earn $500 in total', goal: 500, icon: 'earn'},
        'rental-champion': {id: 'rental-champion', name: 'Rental Champion', description: 'Complete 10 rentals', goal: 10, icon: 'book'},
    };
    this.set('milestones', milestones);

    const discountCodes: DiscountCode[] = [
      { id: 'code-1', code: 'SAVE10', percentage: 10, isActive: true },
      { id: 'code-2', code: 'FALL20', percentage: 20, isActive: true },
      { id: 'code-3', code: 'OLDCODE', percentage: 15, isActive: false },
    ];
    this.set('discountCodes', discountCodes);

    const events: Event[] = [
        { id: 'event-1', title: 'DIY Workshop: Build a Bookshelf', date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), location: 'Oakland Community Center', description: 'Learn the basics of woodworking and build your own bookshelf to take home. All tools provided.', imageUrl: 'https://picsum.photos/seed/event1/800/400', host: 'Ahmed Ali' },
        { id: 'event-2', title: 'Intro to Drone Cinematography (Online)', date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), location: 'Online', description: 'Join professional photographer Alice Johnson as she covers the fundamentals of capturing stunning aerial video.', imageUrl: 'https://picsum.photos/seed/event2/800/400', host: 'Alice Johnson' },
    ];
    this.set('events', events);
    
    this.set('bookings', []);
    this.set('chatThreads', []);
    this.set('offers', []);
    this.set('itemCollections', [
        { id: 'col-1', name: 'My Weekend Project Gear', ownerId: 'user-1', isPublic: true, itemIds: ['item-2'], isShopTheLook: true, coverImageUrl: 'https://picsum.photos/seed/look1/800/600' }
    ]);
    this.set('transactions', []);
    this.set('passwordResetTokens', []);
    
    this.set('affiliates', []);
    this.set('affiliateEarnings', []);
    this.set('affiliateLinks', []);
    this.set('affiliateCoupons', []);
    this.set('creativeAssets', [
        { id: 'asset-1', title: 'Urban Prime Logo (Light)', type: 'logo', imageUrl: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png', dimensions: '400x200' },
        { id: 'asset-2', title: 'Urban Prime Logo (Dark)', type: 'logo', imageUrl: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png', dimensions: '400x200' },
        { id: 'asset-3', title: 'Summer Sale Banner', type: 'banner', imageUrl: 'https://picsum.photos/seed/banner-summer/1200/630', dimensions: '1200x630' },
        { id: 'asset-4', title: 'Black Friday Banner', type: 'banner', imageUrl: 'https://picsum.photos/seed/banner-bf/1200/630', dimensions: '1200x630' },
    ]);

    this.set('projectShowcases', []);
    this.set('itemBundles', []);
    const supplierProducts: SupplierProduct[] = [
        { id: 'sup-1', title: 'Portable Bluetooth Speaker', description: 'Waterproof with 12-hour battery life.', category: 'audio-equipment', imageUrls: ['https://picsum.photos/seed/sup1/600/400'], wholesalePrice: 15.50, shippingInfo: { minDays: 5, maxDays: 10, cost: 4.99 }, supplierName: 'GadgetWarehouse', stock: 150 },
        { id: 'sup-2', title: 'Ergonomic Office Chair', description: 'Mesh back with lumbar support.', category: 'furniture', imageUrls: ['https://picsum.photos/seed/sup2/600/400'], wholesalePrice: 65.00, shippingInfo: { minDays: 7, maxDays: 14, cost: 15.00 }, supplierName: 'OfficeDirect', stock: 80 },
        { id: 'sup-3', title: 'Smart WiFi LED Bulb', description: 'RGB color changing, works with Alexa and Google Home.', category: 'lighting-lamps', imageUrls: ['https://picsum.photos/seed/sup3/600/400'], wholesalePrice: 8.75, shippingInfo: { minDays: 5, maxDays: 10, cost: 3.50 }, supplierName: 'GadgetWarehouse', stock: 300 },
        { id: 'sup-4', title: 'Stainless Steel Water Bottle', description: '24oz insulated bottle, keeps drinks cold for 24 hours.', category: 'sports-outdoors', imageUrls: ['https://picsum.photos/seed/sup4/600/400'], wholesalePrice: 7.20, shippingInfo: { minDays: 3, maxDays: 7, cost: 4.00 }, supplierName: 'HomeGoodsPlus', stock: 250 },
    ];
    this.set('supplierProducts', supplierProducts);

    const stores: Store[] = [
      {
        storeId: 'store-1',
        ownerId: 'user-1',
        slug: 'ahmeds-tool-shed',
        name: "Ahmed's Tool Shed",
        logo: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png',
        tagline: "Quality tools for any project, big or small.",
        category: 'tools',
        city: 'San Francisco',
        products: ['item-2', 'item-4', 'item-5'],
        pixes: ['reel-2', 'reel-4', 'reel-6', 'reel-draft-1'],
        reviews: [],
        followers: ['user-3'],
        badges: ['verified', 'top-seller'],
        createdAt: '2023-10-20T10:00:00Z',
        brandingKit: {
            logoDescription: 'A wrench and hammer crossed',
            logoUrl: '',
            palette: { primary: '#f39c12', secondary: '#ecf0f1', accent: '#2c3e50' },
            fontPairing: { heading: 'Roboto Slab', body: 'Roboto' }
        },
        layout: 'grid',
        banner: { text: '10% off your first tool rental!' },
        pages: [],
        questionnaireAnswers: [
            { question: "What is the name of your store?", answer: "Ahmed's Tool Shed" },
            { question: "In one sentence, what is the tagline for your store?", answer: "Quality tools for any project, big or small." }
        ]
      },
      {
        storeId: 'store-2',
        ownerId: 'user-2',
        slug: 'alices-photo-gear',
        name: "Alice's Photo Gear",
        logo: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png',
        tagline: "Professional camera gear for your creative vision.",
        category: 'electronics',
        city: 'Oakland',
        products: ['item-1', 'item-3'],
        pixes: ['reel-1', 'reel-3', 'reel-5'],
        reviews: [],
        followers: ['user-1'],
        badges: ['verified'],
        createdAt: new Date().toISOString(),
        brandingKit: {
            logoDescription: '',
            logoUrl: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png',
            palette: { primary: '#3498db', secondary: '#ffffff', accent: '#e74c3c' },
            fontPairing: { heading: 'Montserrat', body: 'Lato' }
        },
        layout: 'minimalist',
        banner: { text: 'Capture your moments. Pro gear for rent.' },
        pages: [],
        questionnaireAnswers: [
            { question: "What is the name of your store?", answer: "Alice's Photo Gear" },
            { question: "In one sentence, what is the tagline for your store?", answer: "Professional camera gear for your creative vision." }
        ]
      },
      {
        storeId: 'store-3',
        ownerId: 'user-3',
        slug: 'bobs-weekend-rentals',
        name: "Bob's Weekend Rentals",
        logo: '',
        tagline: "Gear for your next adventure.",
        category: 'sports-outdoors',
        city: 'San Francisco',
        products: [],
        pixes: [],
        reviews: [],
        followers: [],
        badges: ['just-launched'],
        createdAt: '2024-03-15T10:00:00Z',
        brandingKit: {
            logoDescription: 'A mountain and a tent',
            logoUrl: '',
            palette: { primary: '#16a085', secondary: '#f1f5f9', accent: '#e67e22' },
            fontPairing: { heading: 'Poppins', body: 'Inter' }
        },
        layout: 'story-driven',
        banner: { text: 'Get out and explore!' },
        pages: [],
        questionnaireAnswers: []
      }
    ];
    this.set('storefronts', stores);


    // New Data Stores for Advanced Affiliate Features
    this.set('affiliateCampaigns', []);
    this.set('externalProductSubmissions', []);
    this.set('contentReviewSubmissions', []);
    this.set('walletTransactions', []);
    this.set('passwordResetTokens', []);
    this.set('pixeAnalytics', {});
    
    // New stores for Admin features
    this.set('supportQueries', []);
    
    const notifications: Notification[] = [
      { id: 'notif-1', userId: 'user-1', message: 'Alice Johnson placed a bid on your "Leather Jacket".', link: '/item/item-4', isRead: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
      { id: 'notif-2', userId: 'user-1', message: 'Your item "Heavy-Duty Hammer Drill" has been rented.', link: '/profile/orders', isRead: false, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { id: 'notif-3', userId: 'user-2', message: 'Bob Williams started following you.', link: '/user/user-3', isRead: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    ];
    this.set('notifications', notifications);

    this.set('siteSettings', { siteBanner: { message: 'Welcome to the marketplace! Enjoy 10% off your first order.', isActive: true } });
  }
}

export const db = new MockDB();
