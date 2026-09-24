import { Product } from '../types';

export interface ProductReview {
  id: string;
  author: string;
  location?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  helpfulCount: number;
}

/**
 * Loads customer-submitted reviews saved in this browser.
 * Seeded demo reviews from older versions are discarded; they were not
 * submitted by customers and must not be presented as verified reviews.
 */
export function getProductReviews(product: Product): ProductReview[] {
  const storageKey = `gh_reviews_product_${product.id}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    const reviews = (parsed as ProductReview[]).filter((review) => {
      const seededReviewId = new RegExp(`^rev-${product.id}-[1-5]$`);
      return !(review.verified && seededReviewId.test(review.id));
    });

    if (reviews.length !== parsed.length) {
      localStorage.setItem(storageKey, JSON.stringify(reviews));
    }
    return reviews;
  } catch {
    return [];
  }
}

/** Saves a customer-submitted review in this browser. */
export function saveProductReview(productId: number | string, newReview: ProductReview): ProductReview[] {
  const storageKey = `gh_reviews_product_${productId}`;
  let current: ProductReview[] = [];
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) current = parsed as ProductReview[];
    }
  } catch {
    current = [];
  }

  const updated = [newReview, ...current];
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {
    // The review remains visible for this session if browser storage is full.
  }
  return updated;
}
