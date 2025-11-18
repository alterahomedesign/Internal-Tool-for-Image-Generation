export interface GeneratedImage {
  id: string;
  title: string;
  description: string;
  base64: string;
  sourcePrompt: string; // The prompt used to generate it
  sourceAspectRatio: '1:1' | '16:9' | '9:16';
  category: 'studio' | 'lifestyle';
}

export interface ProductDetails {
  names: string[];
  description: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  socialMediaCaption: string;
  measurements: string;
  shipping: string;
  careInstructions: string;
  suggestedPrice: string;
}

// New types for variations
export interface VariationResult {
  id: string; // Unique ID for the result group
  variation: Record<string, string>; // e.g. { Size: 'Three seats', Color: 'Beige' }
  images: GeneratedImage[];
}

export interface GeneratedContent {
  baseDetails: ProductDetails;
  variationResults: VariationResult[];
  furnitureCategory: string;
}

export type CreativeStyle = 'modern_suburban' | 'scandinavian' | 'moody_luxurious' | 'warm_rustic' | 'industrial_loft';