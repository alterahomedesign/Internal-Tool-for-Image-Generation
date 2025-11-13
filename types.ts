export interface GeneratedImage {
  id: string;
  title: string;
  description: string;
  base64: string;
  sourcePrompt: string; // The prompt used to generate it
  sourceAspectRatio: '1:1' | '16:9' | '9:16';
  category: 'studio' | 'lifestyle' | 'social';
}

export interface ProductDetails {
  names: string[];
  description: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  socialMediaCaption: string;
}

export interface GeneratedContent {
  images: GeneratedImage[];
  details: ProductDetails;
  furnitureCategory: string;
}

export type CreativeStyle = 'modern_suburban' | 'scandinavian' | 'moody_luxurious' | 'warm_rustic' | 'industrial_loft';