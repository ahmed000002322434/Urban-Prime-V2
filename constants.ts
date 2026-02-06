// data/constants.ts
import type { Category } from './types';

export const COUNTRIES: string[] = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan',
    'India', 'Brazil', 'South Africa', 'New Zealand', 'Spain', 'Italy', 'Mexico', 'Singapore',
];

export const CATEGORY_COLORS: Record<string, string> = {
  'electronics': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'clothing': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  'home-living': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  'tools': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  'beauty-personal-care': 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  'groceries-essentials': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  'art-collectibles': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  'digital-products': 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
  'sports-outdoors': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  'party-events': 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
  'vehicles': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


export const HIERARCHICAL_CATEGORIES: Category[] = [
  {
    id: 'electronics', name: 'Electronics', subcategories: [
      { id: 'mobile-phones', name: 'Mobile Phones' },
      { id: 'tablets', name: 'Tablets' },
      { id: 'laptops-computers', name: 'Laptops & Computers' },
      { id: 'cameras-lenses', name: 'Cameras & Lenses' },
      { id: 'drones', name: 'Drones' },
      { id: 'tvs-home-entertainment', name: 'TVs & Home Entertainment' },
      { id: 'projectors', name: 'Projectors' },
      { id: 'audio-equipment', name: 'Audio Equipment' },
      { id: 'smart-watches', name: 'Smart Watches' },
      { id: 'gaming-consoles', name: 'Gaming Consoles' },
      { id: 'gaming-accessories', name: 'Gaming Accessories' },
      { id: 'computer-accessories', name: 'Computer Accessories' },
      { id: 'storage-devices', name: 'Storage Devices' },
      { id: 'networking-devices', name: 'Networking Devices' },
      { id: 'power-banks-chargers', name: 'Power Banks & Chargers' },
    ]
  },
  {
    id: 'clothing', name: 'Fashion', subcategories: [
      { id: 'womens-clothing', name: 'Women\'s Fashion' },
      { id: 'mens-clothing', name: 'Men\'s Fashion' },
      { id: 'kids-clothing', name: 'Kids & Baby' },
      { id: 'sportswear', name: 'Sportswear' },
      { id: 'unisex-fashion', name: 'Unisex Fashion' },
      { id: 'traditional-wear', name: 'Traditional Wear' },
      { id: 'baby-wear', name: 'Baby Wear' },
      { id: 'shoes', name: 'Shoes' },
      { id: 'womens-bags', name: 'Women\'s Bags' },
      { id: 'mens-accessories', name: 'Men\'s Accessories' },
      { id: 'womens-accessories', name: 'Women\'s Accessories' },
      { id: 'eyewear', name: 'Eyewear' },
      { id: 'watches', name: 'Watches' },
      { id: 'jewelry', name: 'Jewelry' },
    ]
  },
  {
    id: 'home-living', name: 'Home & Living', subcategories: [
      { id: 'furniture', name: 'Furniture' },
      { id: 'home-decor', name: 'Home Décor' },
      { id: 'kitchenware-dining', name: 'Kitchenware & Dining' },
      { id: 'bedding-mattresses', name: 'Bedding & Mattresses' },
      { id: 'bath-essentials', name: 'Bath Essentials' },
      { id: 'lighting-lamps', name: 'Lighting & Lamps' },
      { id: 'storage-organization', name: 'Storage & Organization' },
      { id: 'cleaning-supplies', name: 'Cleaning Supplies' },
      { id: 'garden-outdoor', name: 'Garden & Outdoor' },
      { id: 'carpets-rugs', name: 'Carpets & Rugs' },
      { id: 'curtains-blinds', name: 'Curtains & Blinds' },
      { id: 'diy-tools', name: 'DIY Tools' },
      { id: 'paint-hardware', name: 'Paint & Hardware' },
      { id: 'electrical-appliances', name: 'Electrical Appliances' },
      { id: 'small-home-appliances', name: 'Small Home Appliances' },
    ]
  },
  {
    id: 'tools', name: 'Tools', subcategories: [
      { id: 'power-tools', name: 'Power Tools' },
      { id: 'hand-tools', name: 'Hand Tools' },
      { id: 'gardening-tools', name: 'Gardening Tools' },
      { id: 'ladders-scaffolding', name: 'Ladders & Scaffolding' },
      { id: 'drills-drivers', name: 'Drills & Drivers' },
      { id: 'saws', name: 'Saws' },
      { id: 'sanders-grinders', name: 'Sanders & Grinders' },
      { id: 'air-compressors', name: 'Air Compressors' },
    ]
  },
  {
    id: 'beauty-personal-care', name: 'Beauty & Personal Care', subcategories: [
      { id: 'skincare', name: 'Skincare' },
      { id: 'makeup', name: 'Makeup' },
      { id: 'hair-care', name: 'Hair Care' },
      { id: 'fragrances', name: 'Fragrances' },
      { id: 'bath-body', name: 'Bath & Body' },
      { id: 'nail-care', name: 'Nail Care' },
      { id: 'mens-grooming', name: 'Men’s Grooming' },
      { id: 'health-wellness', name: 'Health & Wellness' },
      { id: 'beauty-tools', name: 'Beauty Tools' },
      { id: 'personal-hygiene', name: 'Personal Hygiene' },
    ]
  },
  {
    id: 'groceries-essentials', name: 'Groceries & Essentials', subcategories: [
      { id: 'fresh-food', name: 'Fresh Food' },
      { id: 'packaged-food', name: 'Packaged Food' },
      { id: 'beverages', name: 'Beverages' },
      { id: 'snacks-confectionery', name: 'Snacks & Confectionery' },
      { id: 'cooking-essentials', name: 'Cooking Essentials' },
      { id: 'baby-food-formula', name: 'Baby Food & Formula' },
      { id: 'dairy-products', name: 'Dairy Products' },
      { id: 'pet-food', name: 'Pet Food' },
      { id: 'cleaning-household', name: 'Cleaning & Household' },
      { id: 'personal-care-essentials', name: 'Personal Care Essentials' },
    ]
  },
  {
    id: 'art-collectibles', name: 'Art & Collectibles', subcategories: [
      { id: 'paintings', name: 'Paintings' },
      { id: 'sculptures', name: 'Sculptures' },
      { id: 'photography', name: 'Photography' },
      { id: 'prints-posters', name: 'Prints & Posters' },
      { id: 'collectibles', name: 'Collectibles' },
    ]
  },
  {
    id: 'digital-products', name: 'Digital Products', subcategories: [
        { id: 'software', name: 'Software' },
        { id: 'games', name: 'Games' },
        { id: 'design-templates', name: 'Design Templates' },
        { id: 'ebooks', name: 'E-Books' },
        { id: 'stock-photos-videos', name: 'Stock Photos & Videos' },
    ]
  },
  {
    id: 'sports-outdoors', name: 'Sports & Outdoors', subcategories: [
        { id: 'cycling', name: 'Cycling' },
        { id: 'water-sports', name: 'Water Sports' },
        { id: 'winter-sports', name: 'Winter Sports' },
        { id: 'team-sports', name: 'Team Sports' },
        { id: 'camping-gear', name: 'Camping Gear' },
        { id: 'hiking-gear', name: 'Hiking Gear' },
        { id: 'fishing', name: 'Fishing' },
    ]
  },
];

export const HIERARCHICAL_SERVICE_CATEGORIES: Category[] = [
  {
    id: 'home-utility', name: 'Home & Utility', subcategories: [
      { id: 'electrician', name: 'Electrician' },
      { id: 'plumber', name: 'Plumber' },
      { id: 'carpenter', name: 'Carpenter' },
      { id: 'cleaning', name: 'Cleaning' },
      { id: 'appliance-repair', name: 'Appliance Repair' },
      { id: 'ac-hvac', name: 'AC / HVAC Services' },
    ]
  },
  {
    id: 'transport', name: 'Transport & Rental', subcategories: [
      { id: 'rent-a-car', name: 'Rent a Car' },
      { id: 'rent-a-bike', name: 'Rent a Bike' },
      { id: 'driver-on-demand', name: 'Driver on Demand' },
      { id: 'delivery-helper', name: 'Delivery Helper' },
    ]
  },
  {
    id: 'personal-pro', name: 'Professional & Personal', subcategories: [
      { id: 'tutor', name: 'Tutor' },
      { id: 'personal-trainer', name: 'Personal Trainer' },
      { id: 'photographer', name: 'Photographer' },
      { id: 'videographer', name: 'Videographer' },
      { id: 'event-planner', name: 'Event Planner' },
      { id: 'makeup-artist', name: 'Makeup Artist' },
      { id: 'fitness-coach', name: 'Fitness Coach' },
    ]
  },
  {
    id: 'business-office', name: 'Business & Office', subcategories: [
      { id: 'office-cleaning', name: 'Office Cleaning' },
      { id: 'it-support', name: 'IT Support' },
      { id: 'network-setup', name: 'Printer & Network Setup' },
      { id: 'document-services', name: 'Document Services' },
    ]
  },
];

export const SERVICE_CATEGORIES: Category[] = HIERARCHICAL_SERVICE_CATEGORIES.map(c => ({id: c.id, name: c.name}));


export const CATEGORIES: Category[] = HIERARCHICAL_CATEGORIES.map(c => ({id: c.id, name: c.name}));