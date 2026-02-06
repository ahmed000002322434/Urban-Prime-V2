
export type SectionType = 'hero' | 'products' | 'info' | 'banner';

export interface StoreTheme {
  primaryColor: string;
  font: string;
  borderRadius: string;
  backgroundColor: string;
}

export interface StoreSection {
  id: string;
  type: SectionType;
  order: number;
  content: {
    title?: string;
    subtitle?: string;
    body?: string;
    ctaText?: string;
    imageUrl?: string;
    limit?: number;
    category?: string;
  };
}

export interface StoreSEO {
  metaTitle: string;
  metaDescription: string;
  socialImage: string;
}

export interface StoreLayout {
  slug: string;
  isLive: boolean;
  theme: StoreTheme;
  sections: StoreSection[];
  seo: StoreSEO;
}
