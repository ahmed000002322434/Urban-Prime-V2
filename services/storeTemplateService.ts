/**
 * Store Templates Service
 * Pre-built store templates for users to customize
 * Unique names, professional designs, ready-to-customize
 */

export interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  theme: 'modern' | 'luxury' | 'eco' | 'playful';
  primaryColor: string;
  logoEmoji: string;
  defaultTagline: string;
  defaultMission: string;
  defaultStory: string;
  idealCustomer: string;
  features: string[];
  layout: string[];
}

export class StoreTemplateService {
  /**
   * Get all available store templates
   */
  static getTemplates(): StoreTemplate[] {
    return [
      {
        id: 'template-1',
        name: 'VendorHub',
        description: 'Premium marketplace style for multi-category sellers',
        icon: '🏬',
        category: 'General',
        theme: 'modern',
        primaryColor: '#1F2937',
        logoEmoji: '🏬',
        defaultTagline: 'Your trusted marketplace for quality goods',
        defaultMission: 'To provide customers with access to premium, carefully curated products',
        defaultStory: 'Born from a passion for quality and customer service excellence',
        idealCustomer: 'Quality-conscious shoppers seeking trusted brands',
        features: ['Advanced search', 'Customer reviews', 'Bulk pricing', 'Loyalty rewards'],
        layout: ['hero', 'featured', 'categories', 'testimonials', 'trust', 'newsletter'],
      },
      {
        id: 'template-2',
        name: 'LuxeGallery',
        description: 'Premium luxury goods and exclusive items',
        icon: '👑',
        category: 'Fashion & Accessories',
        theme: 'luxury',
        primaryColor: '#78350F',
        logoEmoji: '✨',
        defaultTagline: 'Exquisite Collections for Discerning Tastes',
        defaultMission: 'Curating the finest luxury items for those who appreciate excellence',
        defaultStory: 'Established in craftsmanship and refined aesthetics',
        idealCustomer: 'Luxury-focused buyers valuing exclusivity and quality',
        features: ['VIP access', 'Private appointments', 'Authentication', 'White glove service'],
        layout: ['hero', 'featured', 'testimonials', 'story', 'trust'],
      },
      {
        id: 'template-3',
        name: 'EcoSphere',
        description: 'Sustainable and eco-friendly products',
        icon: '🌿',
        category: 'Sustainability',
        theme: 'eco',
        primaryColor: '#15803D',
        logoEmoji: '🌍',
        defaultTagline: 'Sustainable Living, Starting Today',
        defaultMission: 'Making sustainable choices accessible and affordable for everyone',
        defaultStory: 'Dedicated to reducing environmental impact through conscious commerce',
        idealCustomer: 'Environmentally conscious consumers and eco-warriors',
        features: ['Carbon-neutral shipping', 'Sustainability badge', 'Eco impact tracking', 'Refurbished items'],
        layout: ['hero', 'featured', 'categories', 'testimonials', 'newsletter', 'faq'],
      },
      {
        id: 'template-4',
        name: 'ArtisanCraft',
        description: 'Handmade and artisan-made products',
        icon: '🎨',
        category: 'Handmade & Crafts',
        theme: 'playful',
        primaryColor: '#BE123C',
        logoEmoji: '✋',
        defaultTagline: 'Proudly Handmade with Love & Passion',
        defaultMission: 'Supporting artisans and celebrating handcrafted excellence',
        defaultStory: 'Each item tells a story of craftsmanship and dedication',
        idealCustomer: 'Buyers who value unique, handcrafted items and artisan support',
        features: ['Artisan stories', 'Limited editions', 'Customization', 'Direct artist connection'],
        layout: ['hero', 'featured', 'testimonials', 'story', 'faq', 'newsletter'],
      },
      {
        id: 'template-5',
        name: 'TechVault',
        description: 'Technology products and gadgets',
        icon: '🔧',
        category: 'Electronics & Tech',
        theme: 'modern',
        primaryColor: '#0369A1',
        logoEmoji: '⚙️',
        defaultTagline: 'Future-Ready Tech, Today Available',
        defaultMission: 'Bringing cutting-edge technology within reach of everyone',
        defaultStory: 'Born from an obsession with innovation and user experience',
        idealCustomer: 'Tech enthusiasts and early adopters',
        features: ['Tech specs display', 'Comparison tools', 'Expert reviews', 'Warranty info'],
        layout: ['hero', 'featured', 'categories', 'testimonials', 'trust', 'faq'],
      },
      {
        id: 'template-6',
        name: 'StyleHub',
        description: 'Fashion, apparel, and personal style',
        icon: '👗',
        category: 'Fashion & Beauty',
        theme: 'modern',
        primaryColor: '#EC4899',
        logoEmoji: '💄',
        defaultTagline: 'Express Yourself Through Fashion',
        defaultMission: 'Empowering people to express their unique style and identity',
        defaultStory: 'Dedicated to celebrating individuality and fashion expression',
        idealCustomer: 'Fashion-forward individuals seeking trendy and quality clothing',
        features: ['Style guides', 'Size charts', 'Looks & outfits', 'Fashion blog', 'Virtual fitting'],
        layout: ['hero', 'featured', 'categories', 'testimonials', 'newsletter', 'faq'],
      },
      {
        id: 'template-7',
        name: 'LocalFresh',
        description: 'Fresh, local, and organic marketplace',
        icon: '🥬',
        category: 'Food & Groceries',
        theme: 'eco',
        primaryColor: '#7C2D12',
        logoEmoji: '🌾',
        defaultTagline: 'From Local Farms to Your Door',
        defaultMission: 'Supporting local farmers and providing fresh, organic products',
        defaultStory: 'Connecting communities with farm-fresh goodness since day one',
        idealCustomer: 'Health-conscious consumers supporting local communities',
        features: ['Farm sourcing', 'Organic certification', 'Weekly specials', 'Recipe ideas', 'Delivery tracking'],
        layout: ['hero', 'featured', 'testimonials', 'story', 'newsletter', 'faq'],
      },
      {
        id: 'template-8',
        name: 'WellnessPro',
        description: 'Health, wellness, and personal care',
        icon: '🧘',
        category: 'Health & Wellness',
        theme: 'luxury',
        primaryColor: '#6366F1',
        logoEmoji: '💚',
        defaultTagline: 'Your Journey to Wellness Starts Here',
        defaultMission: 'Promoting holistic health through premium wellness products',
        defaultStory: 'Inspired by ancient wellness practices and modern science',
        idealCustomer: 'Health-conscious individuals seeking quality wellness products',
        features: ['Expert consultations', 'Ingredient transparency', 'Wellness guides', 'Customer testimonials'],
        layout: ['hero', 'featured', 'categories', 'testimonials', 'story', 'trust'],
      },
      {
        id: 'template-9',
        name: 'HomeSense',
        description: 'Home decor and furnishings',
        icon: '🏠',
        category: 'Home & Decor',
        theme: 'modern',
        primaryColor: '#92400E',
        logoEmoji: '🪑',
        defaultTagline: 'Transform Your Space Into Your Sanctuary',
        defaultMission: 'Creating beautiful, functional living spaces for modern life',
        defaultStory: 'Each piece is selected to bring comfort and style to homes',
        idealCustomer: 'Home enthusiasts looking for quality furnishings and decor',
        features: ['Room planning tool', 'Interior design tips', 'Size guides', '3D visualization', 'Delivery info'],
        layout: ['hero', 'featured', 'categories', 'testimonials', 'faq', 'newsletter'],
      },
      {
        id: 'template-10',
        name: 'StudiosHub',
        description: 'Creative services and digital products',
        icon: '🎬',
        category: 'Services & Digital',
        theme: 'playful',
        primaryColor: '#7C3AED',
        logoEmoji: '🎭',
        defaultTagline: 'Creative Excellence at Your Service',
        defaultMission: 'Connecting businesses with top-tier creative talent',
        defaultStory: 'Built on the belief that great design changes lives',
        idealCustomer: 'Businesses and individuals seeking creative solutions',
        features: ['Portfolio showcase', 'Service packages', 'Project timeline', 'Client gallery', 'Booking system'],
        layout: ['hero', 'featured', 'testimonials', 'story', 'faq', 'newsletter'],
      },
    ];
  }

  /**
   * Get template by ID
   */
  static getTemplate(id: string): StoreTemplate | undefined {
    return this.getTemplates().find((t) => t.id === id);
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): StoreTemplate[] {
    return this.getTemplates().filter((t) => t.category === category);
  }

  /**
   * Get all available categories
   */
  static getCategories(): string[] {
    const templates = this.getTemplates();
    return [...new Set(templates.map((t) => t.category))];
  }

  /**
   * Get templates by theme
   */
  static getTemplatesByTheme(theme: string): StoreTemplate[] {
    return this.getTemplates().filter((t) => t.theme === theme);
  }

  /**
   * Search templates by name or description
   */
  static searchTemplates(query: string): StoreTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getTemplates().filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.features.some((f) => f.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get featured templates (for homepage)
   */
  static getFeaturedTemplates(): StoreTemplate[] {
    return [
      this.getTemplate('template-1'),
      this.getTemplate('template-3'),
      this.getTemplate('template-4'),
      this.getTemplate('template-6'),
    ].filter(Boolean) as StoreTemplate[];
  }

  /**
   * Merge template data with user input
   * User data takes precedence over template defaults
   */
  static mergeTemplateWithUserData(template: StoreTemplate, userData: any) {
    return {
      storeName: userData.storeName || `${template.name} Store`,
      tagline: userData.tagline || template.defaultTagline,
      city: userData.city || '',
      category: userData.category || template.category,
      description: userData.description || `Welcome to our ${template.name} store. ${template.description}`,
      idealCustomer: userData.idealCustomer || template.idealCustomer,
      theme: userData.theme || template.theme,
      primaryColor: userData.primaryColor || template.primaryColor,
      logoEmoji: userData.logoEmoji || template.logoEmoji,
      story: userData.story || template.defaultStory,
      mission: userData.mission || template.defaultMission,
      templateId: template.id,
    };
  }

  /**
   * Validate store name uniqueness (simple check - in production, check against Firestore)
   */
  static isValidStoreName(storeName: string): { valid: boolean; error?: string } {
    // Reserved Shopify-like names to avoid
    const reservedNames = [
      'shopify',
      'store',
      'shop',
      'checkout',
      'admin',
      'api',
      'cdn',
      'staging',
      'test',
      'myshopify',
      'ontraport',
      'squarespace',
      'wix',
      'weebly',
      'bigcommerce',
      'magento',
      'prestashop',
    ];

    const normalizedName = storeName.toLowerCase().trim();

    if (normalizedName.length < 3) {
      return { valid: false, error: 'Store name must be at least 3 characters' };
    }

    if (normalizedName.length > 50) {
      return { valid: false, error: 'Store name must be less than 50 characters' };
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(storeName)) {
      return { valid: false, error: 'Store name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }

    if (reservedNames.includes(normalizedName)) {
      return { valid: false, error: 'This store name is reserved. Please choose another' };
    }

    return { valid: true };
  }
}

export const storeTemplateService = new StoreTemplateService();
