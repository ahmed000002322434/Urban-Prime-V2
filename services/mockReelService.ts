import type { Reel } from '../types';

// Mock video captions that match the actual Reel interface
const mockCaptions = [
    'Amazing anime quotes that hit different 🔥 #anime #motivation #quotes',
    'Blue Lock anime edit - sports anime excellence at its finest 💪 #anime #sports',
    'Garou\'s powerful speech that moves the soul 🎙️ #anime #inspiration #speech',
    'Jujutsu Kaisen Gojo edit - the strongest sorcerer 👿 #jjk #gojo #anime',
    'Quick anime collection for your daily feed 📺 #anime #trending #collection',
    'Best anime moments compiled for you 🌟 #anime #highlights #bestof',
    'Power of pain - true strength comes from struggle 💯 #anime #motivation #quotes',
    'Madara\'s legendary speech - wisdom from the anime gods 👑 #anime #epic #speech',
    'Goku\'s warrior spirit - where is our warrior? 🥋 #dragonball #goku #anime',
    'Dazai Osamu - beautiful anime aesthetics ✨ #anime #art #aesthetic',
    'Demon Slayer moments - intense and breathtaking 😤 #demonslayer #action #anime',
    'Anime music edit - listen with volume up 🎵 #anime #music #edit',
    'Tanjiro Edit - the demon slayer\'s journey 🗡️ #demonslayer #tanjiro #anime',
    'Akaza fight - the intensity is unreal 🔥 #demonslayer #battle #anime',
    'Zenitsu serious mode - rarely seen but powerful ⚡ #demonslayer #zenitsu #anime'
];

// Mock video files - these exist in public/pixe-videos/
const mockVideoFiles = [
    'From%20KlickPin%20CF%20AstroGlow%20_%20Anime%20quotes%20inspirational%20Anime%20quotes%20about%20life%20Strong%20motivational%20quotes.mp4',
    'From%20KlickPin%20CF%20Blue%20Lock%20_%20Anime%20Edit%20BlueLock%20AnimeEdits%20SportsAnime%20_%20Anime%20book%20Blue%20anime%20Blue%20lovk.mp4',
    'From%20KlickPin%20CF%20Garou%20Speech%20%F0%9F%91%8C%F0%9F%8F%BB%20_%20Good%20anime%20series%20Anime%20life%20Recent%20anime.mp4',
    'From%20KlickPin%20CF%20Jujutsu%20Kaisen%20Gojo%20edit%20_%20Recent%20anime%20Anime%20life%20Good%20anime%20series.mp4',
    'From%20KlickPin%20CF%20Pin%20by%20Gadzhi%20Omarov%20on%20%D0%91%D1%8B%D1%81%D1%82%D1%80%D0%BE%D0%B5%20%D1%81%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B5%D0%BD%D0%B8%D0%B5%20_%20Anime%20shows%20Recent%20anime%20Anime%20films.mp4',
    'From%20KlickPin%20CF%20Pin%20on%20Anime%20_%20Recent%20anime%20Anime%20book%20Best%20anime%20shows.mp4',
    'From%20KlickPin%20CF%20Power%20of%20Pain%20%F0%9F%98%8E%F0%9F%94%B1%20_%20Up%20quotes%20Anime%20quotes%20inspirational%20Mood%20off%20images.mp4',
    'From%20KlickPin%20CF%20VisualizeVividly%20Unleashing%20Madara\'s%20Speech%20%F0%9F%97%A3%EF%B8%8F%20_%20Motivationszitate%20Motivation%20Zitate.mp4',
    'From%20KlickPin%20CF%20Where%20is%20our%20warrior%20Goku_%20_%20Recent%20anime%20Dragon%20ball%20super%20funny%20Dragon%20ball%20art%20goku.mp4',
    'From%20KlickPin%20CF%20%5B%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%5D%20%C2%ABDazai%20Osamu%C2%BB%20_%20%D0%98%D0%BB%D0%BB%D1%8E%D1%81%D1%82%D1%80%D0%B0%D1%86%D0%B8%D0%B8%20%D0%BB%D0%B8%D1%81%D1%8B%20%D0%9C%D0%B8%D0%BB%D1%8B%D0%B5%20%D1%80%D0%B8%D1%81%D1%83%D0%BD%D0%BA%D0%B8%20%D0%94%D0%B5%D0%B2%D1%83%D1%88%D0%BA%D0%B8%20monster%20energy.mp4',
    'From%20KlickPin%20CF%20%D0%9F%D0%B8%D0%BD%20%D0%BE%D1%82%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F%20animle%20%D0%BD%D0%B0%20%D0%B4%D0%BE%D1%81%D0%BA%D0%B5%20%D0%9A%D0%BB%D0%B8%D0%BD%D0%BE%D0%BA%20%D1%80%D0%B0%D1%81%D1%81%D0%B5%D0%BA%D0%B0%D1%8E%D1%89%D0%B8%D0%B9%20%D0%B4%D0%B5%D0%BC%D0%BE%D0%BD%D0%BE%D0%B2%20_%20%D0%A4%D0%BE%D1%82%D0%BE%D0%B3%D1%80%D0%B0%D1%84%D0%B8%D0%B8%20%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F%20%D0%A1%D1%82%D1%80%D0%B0%D1%88%D0%BD%D1%8B%D0%B5%20%D0%BB%D0%B8%D1%86%D0%B0%20%D0%9C%D1%83%D0%B7%D1%8B%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D1%8B.mp4',
    'From%20KlickPin%20CF%20%D0%9F%D0%B8%D0%BD%20%D0%BE%D1%82%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F%20daniilm2907%20%D0%BD%D0%B0%20%D0%B4%D0%BE%D1%81%D0%BA%D0%B5%20%D0%92%D0%B0%D1%88%D0%B8%20%D0%BF%D0%B8%D0%BD%D1%8B%20_%20%D0%9A%D0%BD%D0%B8%D0%B3%D0%B0%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B5%20%D0%9C%D1%83%D0%B7%D1%8B%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D1%8B%20%D0%9C%D1%83%D0%BB%D1%82%D1%84%D0%B8%D0%BB%D1%8C%D0%BC%D1%8B.mp4',
    'From%20KlickPin%20CF%20%E2%99%AB%EF%B8%8ETANJ%C4%B0RO%20_%20Awesome%20anime%20Recent%20anime%20Anime%20shadow.mp4',
    'From%20KlickPin%20CF%20%E2%9C%A6%EF%B8%8EAKAZA%20%5BVideo%5D%20_%20Recent%20anime%20Demon%20king%20anime%20Good%20anime%20series.mp4',
    'From%20KlickPin%20CF%20%E2%9C%A6%EF%B8%8EZENITSU%20%5BVideo%5D%20_%20Anime%20drawings%20Zenitsu%20serious%20Anime%20guys.mp4',
    'From%20Main%20Klickpin%20CF-%20master%20piece%20-%205tBMSotxQ.mp4'
];

// Generate mock reels - matches the actual Reel interface
export const generateMockReels = (): Reel[] => {
    return mockCaptions.map((caption, index) => {
        const hashtags = caption
            .split(' ')
            .filter(word => word.startsWith('#'))
            .map(tag => tag.slice(1)); // Remove the # sign

        return {
            id: `mock-reel-${index + 1}`,
            creatorId: 'pixe-creator-001',
            videoUrl: `/pixe-videos/${mockVideoFiles[index] || mockVideoFiles[0]}`,
            coverImageUrl: 'https://i.ibb.co/jkyfqdFV/Gemini-Generated_Image-gqj0u3gqj0u3gqj0.png',
            caption: caption,
            likes: Math.floor(Math.random() * 10000) + 100,
            shares: Math.floor(Math.random() * 1000) + 10,
            views: Math.floor(Math.random() * 100000) + 1000,
            comments: [
                {
                    id: `comment-${index}-1`,
                    author: {
                        id: `user-${Math.random()}`,
                        name: ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan'][Math.floor(Math.random() * 5)],
                        avatar: 'https://i.ibb.co/jkyfqdFV/Gemini-Generated_Image-gqj0u3gqj0u3gqj0.png'
                    },
                    text: ['Amazing content! 🔥', 'Love this edit!', 'Best anime content', 'So cool!', 'Keep it up!'][Math.floor(Math.random() * 5)],
                    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
                },
                {
                    id: `comment-${index}-2`,
                    author: {
                        id: `user-${Math.random()}`,
                        name: ['Chris', 'Riley', 'Casey', 'Blake', 'Quinn'][Math.floor(Math.random() * 5)],
                        avatar: 'https://i.ibb.co/jkyfqdFV/Gemini-Generated_Image-gqj0u3gqj0u3gqj0.png'
                    },
                    text: ['Need more like this!', 'Absolutely agree', 'This is fire 🔥', 'Never gets old', 'Masterpiece!'][Math.floor(Math.random() * 5)],
                    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
                }
            ],
            taggedItemIds: [],
            hashtags: hashtags,
            status: 'published' as const,
            createdAt: new Date(Date.now() - Math.random() * 604800000).toISOString(),
            showShopButton: true,
            visibility: 'public' as const,
            allowComments: true
        } as Reel;
    });
};

// Mock reel service for development/testing
export const mockReelService = {
    getMockReels: (): Reel[] => generateMockReels(),
    
    getMockReelById: (id: string): Reel | undefined => {
        const reels = generateMockReels();
        return reels.find(r => r.id === id);
    }
};
