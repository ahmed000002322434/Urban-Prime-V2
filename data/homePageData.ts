// data/homePageData.ts

export const heroBanners = [
  {
    id: 'electronics',
    title: 'Premium Electronics Finds',
    subtitle: '',
    imageUrl: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png',
    link: '/browse?category=electronics',
    bgColor: '#FFDE59'
  },
  {
    id: 'gaming',
    title: 'Get your game on',
    subtitle: '',
    imageUrl: 'https://i.ibb.co/JqjS0S4/premium-electronics-finds.png',
    link: '/browse?category=gaming-consoles',
    bgColor: '#f0f2f5'
  },
];


export const homeGridCards = [
    {
        id: 'gaming',
        title: 'Get your game on',
        largeImageUrl: 'https://i.postimg.cc/1tHnYbVC/BCO-02d528fe-8eef-4d36-8446-0d5d1407f34b.png',
        link: '/browse?category=gaming-consoles',
        cta: 'Shop now'
    },
    {
        id: 'fashion',
        title: 'Shop Fashion for less',
        link: '/clothing',
        cta: 'See all deals',
        subItems: [
            { title: 'Jeans under $50', imageUrl: 'https://i.postimg.cc/T1rrN8wM/Copilot-20251005-150238.png', link: '/browse?category=clothing' },
            { title: 'Tops under $25', imageUrl: 'https://i.postimg.cc/8P4yTW1Z/Copilot-20251005-150804.png', link: '/browse?category=clothing' },
            { title: 'Dresses', imageUrl: 'https://i.postimg.cc/VvqzJg76/Copilot-20251005-151246.png', link: '/browse?category=clothing' },
            { title: 'Shoes', imageUrl: 'https://i.postimg.cc/cH7zYzS4/BCO-7d3c7c87-b0dc-437e-bec6-3eb451d186f5.png', link: '/browse?category=clothing' }
        ]
    },
    {
        id: 'home',
        title: 'Shop for your home essentials',
        link: '/home-living',
        cta: 'Shop home & kitchen',
        subItems: [
            { title: 'Cleaning Tools', imageUrl: 'https://i.postimg.cc/WzchYXt6/BCO-1e6334e9-b9cd-44bf-ac90-2a0c17fa7624.png', link: '/browse?category=cleaning-supplies' },
            { title: 'Home Storage', imageUrl: 'https://i.postimg.cc/kXzXTTZ9/BCO-0c10cee4-047c-4fc5-ad5b-c2d1d741bdf3.png', link: '/browse?category=storage-organization' },
            { title: 'Home Decor', imageUrl: 'https://i.postimg.cc/dtjDV2S1/BCO-5cf5d184-9a24-48e3-a1c8-dc5b2df6c136.png', link: '/browse?category=home-decor' },
            { title: 'Lighting', imageUrl: 'https://i.postimg.cc/g2L5KsFz/BCO-ff3bfe40-189a-4335-a775-6da429a9a14f.png', link: '/browse?category=lighting-lamps' }
        ]
    },
    {
        id: 'kitchen',
        title: 'Top categories in Kitchen',
        link: '/browse?category=kitchenware-dining',
        cta: 'Shop kitchen appliances',
        subItems: [
            { title: 'Cooker', imageUrl: 'https://i.postimg.cc/wjFCMMpb/BCO-a0fda19f-1d4f-49ec-b808-56d22dcc9fd5.png', link: '/browse?category=kitchenware-dining' },
            { title: 'Appliances', imageUrl: 'https://i.postimg.cc/ZnK3TwFv/BCO-391906b0-9ed6-484b-a55a-fd5e25e6e15b.png', link: '/browse?category=small-home-appliances' },
            { title: 'Cookware', imageUrl: 'https://i.postimg.cc/bJb8ZPL2/BCO-cdd1492d-a092-4df0-9b88-1cd1f7f146fc.png', link: '/browse?category=kitchenware-dining' },
            { title: 'Dinnerware', imageUrl: 'https://i.postimg.cc/sXf9Xf3n/BCO-69e5f2b6-ccf8-42e1-9555-c2f5e0c6364e.png', link: '/browse?category=kitchenware-dining' }
        ]
    }
];


export const topCategoriesStrip = [
  { name: 'Electronics', icon: 'electronics', link: '/browse?category=electronics' },
  { name: 'Grocery', icon: 'groceries-essentials', link: '/grocery' },
  { name: 'Cosmetics', icon: 'beauty-personal-care', link: '/cosmetics' },
  { name: 'Fashion', icon: 'clothing', link: '/clothing' },
  { name: 'Furniture', icon: 'event-furniture', link: '/browse?category=furniture' },
  { name: 'Tools', icon: 'tools', link: '/tools' },
  { name: 'Watches', icon: 'smart-watches', link: '/watches' },
];

export const brandLogos = [
    'https://i.postimg.cc/P5gLp3sS/apple-logo-24.png',
    'https://i.postimg.cc/tJn3jDk9/samsung-226438.png',
    'https://i.postimg.cc/50tHDXGk/nike-3383418.png',
    'https://i.postimg.cc/0j47W1v4/adidas-logo-5092.png',
    'https://i.postimg.cc/8cR1s12q/dior-wordmark-logo-EE68645519-seeklogo-com.png',
    'https://i.postimg.cc/C1J0ff6N/sony-logo-22.png',
    'https://i.postimg.cc/jSzsVnm4/canon-logo-36295.png',
    'https://i.postimg.cc/26Ld6N0q/Bose-Logo-wine.png',
];
