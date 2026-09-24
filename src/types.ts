export interface WeightVariant {
  id: string;
  label: string;
  shortLabel: string;
  weight: string;
  priceMultiplier: number;
  isPopular?: boolean;
  savings?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  price: number;
  originalPrice?: number;
  onSale: boolean;
  image: string;
  description: string;
  // Audited fields
  sku?: string;
  weight?: string;
  weights?: string[];
  weightVariants?: WeightVariant[];
  productType?: string;
  tags?: string[];
  inventory?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  seoSlug?: string;
  brand?: string;
  strainType?: string;
  potency?: string;
  inStock?: boolean;
  sourceUrl?: string;
  subcategory?: string;
}

export interface Category {
  name: string;
  slug: string;
  count: number;
  subcategories?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedWeight?: string;
  unitPrice?: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  email: string;
  createdAt: string;
}
