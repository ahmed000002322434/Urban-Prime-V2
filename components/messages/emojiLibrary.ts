export interface EmojiEntry {
  symbol: string;
  name: string;
  keywords: string[];
}

export interface EmojiCategory {
  key: string;
  label: string;
  icon: string;
  emojis: EmojiEntry[];
}

const createEmoji = (symbol: string, name: string, keywords: string[]): EmojiEntry => ({
  symbol,
  name,
  keywords
});

export const emojiCategories: EmojiCategory[] = [
  {
    key: 'smileys',
    label: 'Smileys',
    icon: '😀',
    emojis: [
      createEmoji('😀', 'Grinning face', ['happy', 'smile', 'joy']),
      createEmoji('😁', 'Beaming face', ['cheerful', 'smile']),
      createEmoji('😂', 'Face with tears of joy', ['lol', 'laugh', 'funny']),
      createEmoji('🤣', 'Rolling on the floor laughing', ['rofl', 'funny']),
      createEmoji('😊', 'Smiling face with smiling eyes', ['blush', 'warm']),
      createEmoji('😍', 'Smiling face with heart-eyes', ['love', 'crush']),
      createEmoji('🥰', 'Smiling face with hearts', ['affection', 'sweet']),
      createEmoji('😘', 'Face blowing a kiss', ['kiss', 'love']),
      createEmoji('😎', 'Smiling face with sunglasses', ['cool', 'chill']),
      createEmoji('🤩', 'Star-struck', ['wow', 'excited']),
      createEmoji('🥳', 'Partying face', ['celebration', 'party']),
      createEmoji('🙂', 'Slightly smiling face', ['gentle', 'okay']),
      createEmoji('🙃', 'Upside-down face', ['sarcasm', 'playful']),
      createEmoji('😉', 'Winking face', ['wink', 'flirty']),
      createEmoji('🤗', 'Hugging face', ['hug', 'support']),
      createEmoji('🤔', 'Thinking face', ['hmm', 'question']),
      createEmoji('🫡', 'Saluting face', ['respect', 'roger']),
      createEmoji('😴', 'Sleeping face', ['sleep', 'tired']),
      createEmoji('🤤', 'Drooling face', ['hungry', 'want']),
      createEmoji('😭', 'Loudly crying face', ['sad', 'cry']),
      createEmoji('😤', 'Face with steam from nose', ['proud', 'frustrated']),
      createEmoji('😡', 'Pouting face', ['angry', 'mad']),
      createEmoji('🥺', 'Pleading face', ['please', 'cute']),
      createEmoji('😮', 'Face with open mouth', ['surprised', 'shock']),
      createEmoji('🤯', 'Exploding head', ['mindblown', 'wow']),
      createEmoji('😅', 'Grinning face with sweat', ['relief', 'awkward']),
      createEmoji('😇', 'Smiling face with halo', ['angel', 'innocent']),
      createEmoji('🫠', 'Melting face', ['embarrassed', 'heat'])
    ]
  },
  {
    key: 'people',
    label: 'People',
    icon: '🙌',
    emojis: [
      createEmoji('👍', 'Thumbs up', ['approve', 'yes']),
      createEmoji('👎', 'Thumbs down', ['no', 'disapprove']),
      createEmoji('👏', 'Clapping hands', ['applause', 'nice']),
      createEmoji('🙌', 'Raising hands', ['celebrate', 'hooray']),
      createEmoji('🫶', 'Heart hands', ['love', 'support']),
      createEmoji('🙏', 'Folded hands', ['thanks', 'please', 'pray']),
      createEmoji('🤝', 'Handshake', ['deal', 'agreement']),
      createEmoji('💪', 'Flexed biceps', ['strong', 'gym']),
      createEmoji('👀', 'Eyes', ['look', 'watching']),
      createEmoji('🧠', 'Brain', ['smart', 'idea']),
      createEmoji('🫵', 'Index pointing at the viewer', ['you', 'point']),
      createEmoji('👋', 'Waving hand', ['hello', 'bye']),
      createEmoji('🤙', 'Call me hand', ['phone', 'call']),
      createEmoji('✌️', 'Victory hand', ['peace', 'two']),
      createEmoji('🤟', 'Love-you gesture', ['ily', 'sign']),
      createEmoji('🤞', 'Crossed fingers', ['luck', 'hope']),
      createEmoji('👌', 'OK hand', ['perfect', 'fine']),
      createEmoji('💅', 'Nail polish', ['style', 'sass']),
      createEmoji('💃', 'Woman dancing', ['dance', 'fun']),
      createEmoji('🕺', 'Man dancing', ['dance', 'party']),
      createEmoji('🧍', 'Person standing', ['waiting']),
      createEmoji('🏃', 'Person running', ['fast', 'go']),
      createEmoji('🧑‍💻', 'Technologist', ['work', 'laptop']),
      createEmoji('🧑‍🎨', 'Artist', ['creative', 'design'])
    ]
  },
  {
    key: 'nature',
    label: 'Nature',
    icon: '🌿',
    emojis: [
      createEmoji('🌞', 'Sun with face', ['sunny', 'day']),
      createEmoji('🌙', 'Crescent moon', ['night']),
      createEmoji('⭐', 'Star', ['favorite', 'night']),
      createEmoji('🔥', 'Fire', ['lit', 'hot']),
      createEmoji('✨', 'Sparkles', ['magic', 'shine']),
      createEmoji('⚡', 'High voltage', ['energy', 'fast']),
      createEmoji('☁️', 'Cloud', ['weather']),
      createEmoji('🌧️', 'Cloud with rain', ['rain']),
      createEmoji('🌈', 'Rainbow', ['color', 'hope']),
      createEmoji('🌸', 'Cherry blossom', ['flower', 'spring']),
      createEmoji('🌹', 'Rose', ['love', 'flower']),
      createEmoji('🌿', 'Herb', ['nature', 'green']),
      createEmoji('🍀', 'Four leaf clover', ['luck']),
      createEmoji('🪴', 'Potted plant', ['home', 'decor']),
      createEmoji('🌊', 'Water wave', ['ocean', 'sea']),
      createEmoji('🐶', 'Dog face', ['pet', 'dog']),
      createEmoji('🐱', 'Cat face', ['pet', 'cat']),
      createEmoji('🦋', 'Butterfly', ['pretty', 'light']),
      createEmoji('🐼', 'Panda', ['cute', 'animal']),
      createEmoji('🦄', 'Unicorn', ['fantasy', 'magic'])
    ]
  },
  {
    key: 'food',
    label: 'Food',
    icon: '🍕',
    emojis: [
      createEmoji('🍕', 'Pizza', ['food', 'slice']),
      createEmoji('🍔', 'Hamburger', ['burger']),
      createEmoji('🌮', 'Taco', ['mexican']),
      createEmoji('🍟', 'French fries', ['snack']),
      createEmoji('🍣', 'Sushi', ['japanese']),
      createEmoji('🍜', 'Steaming bowl', ['ramen', 'noodles']),
      createEmoji('🍦', 'Soft ice cream', ['dessert']),
      createEmoji('🍩', 'Doughnut', ['sweet']),
      createEmoji('🍪', 'Cookie', ['dessert']),
      createEmoji('🎂', 'Birthday cake', ['cake', 'celebrate']),
      createEmoji('☕', 'Hot beverage', ['coffee', 'tea']),
      createEmoji('🧋', 'Bubble tea', ['drink', 'boba']),
      createEmoji('🥤', 'Cup with straw', ['soda', 'drink']),
      createEmoji('🍹', 'Tropical drink', ['juice', 'party']),
      createEmoji('🍓', 'Strawberry', ['fruit']),
      createEmoji('🍉', 'Watermelon', ['fruit']),
      createEmoji('🍇', 'Grapes', ['fruit']),
      createEmoji('🥑', 'Avocado', ['healthy']),
      createEmoji('🍳', 'Cooking', ['breakfast']),
      createEmoji('🥂', 'Clinking glasses', ['cheers'])
    ]
  },
  {
    key: 'travel',
    label: 'Travel',
    icon: '✈️',
    emojis: [
      createEmoji('🚗', 'Automobile', ['car', 'drive']),
      createEmoji('🛻', 'Pickup truck', ['truck']),
      createEmoji('🏍️', 'Motorcycle', ['bike']),
      createEmoji('✈️', 'Airplane', ['travel', 'flight']),
      createEmoji('🛫', 'Airplane departure', ['trip']),
      createEmoji('🚆', 'Train', ['transport']),
      createEmoji('🚀', 'Rocket', ['launch', 'fast']),
      createEmoji('🗺️', 'World map', ['travel', 'map']),
      createEmoji('🧭', 'Compass', ['direction']),
      createEmoji('🏝️', 'Desert island', ['vacation']),
      createEmoji('🏖️', 'Beach with umbrella', ['beach']),
      createEmoji('🏠', 'House', ['home']),
      createEmoji('🏡', 'House with garden', ['home']),
      createEmoji('🏨', 'Hotel', ['stay']),
      createEmoji('🌆', 'Cityscape at dusk', ['city']),
      createEmoji('🌃', 'Night with stars', ['night', 'city']),
      createEmoji('🎡', 'Ferris wheel', ['fun']),
      createEmoji('🎢', 'Roller coaster', ['ride']),
      createEmoji('🎠', 'Carousel horse', ['park']),
      createEmoji('🛍️', 'Shopping bags', ['shop'])
    ]
  },
  {
    key: 'activities',
    label: 'Activities',
    icon: '⚽',
    emojis: [
      createEmoji('⚽', 'Soccer ball', ['sport', 'football']),
      createEmoji('🏀', 'Basketball', ['sport']),
      createEmoji('🏏', 'Cricket game', ['sport']),
      createEmoji('🎾', 'Tennis', ['sport']),
      createEmoji('🎮', 'Video game', ['gaming']),
      createEmoji('🕹️', 'Joystick', ['gaming']),
      createEmoji('🎧', 'Headphone', ['music']),
      createEmoji('🎤', 'Microphone', ['sing']),
      createEmoji('🎬', 'Clapper board', ['movie']),
      createEmoji('📸', 'Camera with flash', ['photo']),
      createEmoji('🎨', 'Artist palette', ['art']),
      createEmoji('🧩', 'Puzzle piece', ['game']),
      createEmoji('♟️', 'Chess pawn', ['strategy']),
      createEmoji('🎯', 'Direct hit', ['goal', 'target']),
      createEmoji('🏆', 'Trophy', ['win']),
      createEmoji('🥇', '1st place medal', ['winner']),
      createEmoji('🎁', 'Wrapped gift', ['present']),
      createEmoji('🎉', 'Party popper', ['celebrate']),
      createEmoji('🎊', 'Confetti ball', ['party']),
      createEmoji('🪩', 'Mirror ball', ['dance'])
    ]
  },
  {
    key: 'objects',
    label: 'Objects',
    icon: '💡',
    emojis: [
      createEmoji('💡', 'Light bulb', ['idea']),
      createEmoji('📱', 'Mobile phone', ['phone']),
      createEmoji('💻', 'Laptop', ['computer', 'work']),
      createEmoji('⌚', 'Watch', ['time']),
      createEmoji('📷', 'Camera', ['photo']),
      createEmoji('🎥', 'Movie camera', ['video']),
      createEmoji('📞', 'Telephone receiver', ['call']),
      createEmoji('📢', 'Loudspeaker', ['announcement']),
      createEmoji('🔔', 'Bell', ['notification']),
      createEmoji('🔒', 'Locked', ['secure']),
      createEmoji('🔑', 'Key', ['unlock']),
      createEmoji('🧸', 'Teddy bear', ['cute']),
      createEmoji('💎', 'Gem stone', ['premium', 'luxury']),
      createEmoji('💰', 'Money bag', ['cash']),
      createEmoji('🪙', 'Coin', ['money']),
      createEmoji('📦', 'Package', ['delivery']),
      createEmoji('🛒', 'Shopping cart', ['cart']),
      createEmoji('📝', 'Memo', ['note']),
      createEmoji('📌', 'Pushpin', ['pin']),
      createEmoji('🧯', 'Fire extinguisher', ['safety'])
    ]
  },
  {
    key: 'symbols',
    label: 'Symbols',
    icon: '❤️',
    emojis: [
      createEmoji('❤️', 'Red heart', ['love']),
      createEmoji('🩷', 'Pink heart', ['love']),
      createEmoji('🧡', 'Orange heart', ['love']),
      createEmoji('💛', 'Yellow heart', ['love']),
      createEmoji('💚', 'Green heart', ['love']),
      createEmoji('🩵', 'Light blue heart', ['love']),
      createEmoji('💙', 'Blue heart', ['love']),
      createEmoji('💜', 'Purple heart', ['love']),
      createEmoji('🖤', 'Black heart', ['love']),
      createEmoji('🤍', 'White heart', ['love']),
      createEmoji('💯', 'Hundred points', ['perfect']),
      createEmoji('✅', 'Check mark button', ['done', 'yes']),
      createEmoji('❌', 'Cross mark', ['no', 'stop']),
      createEmoji('⚠️', 'Warning', ['alert']),
      createEmoji('🚫', 'Prohibited', ['block']),
      createEmoji('💬', 'Speech balloon', ['chat']),
      createEmoji('🗨️', 'Left speech bubble', ['message']),
      createEmoji('💭', 'Thought balloon', ['thinking']),
      createEmoji('♾️', 'Infinity', ['forever']),
      createEmoji('🔁', 'Repeat button', ['loop'])
    ]
  }
];

export const emojiLookup = emojiCategories.flatMap((category) => category.emojis);
