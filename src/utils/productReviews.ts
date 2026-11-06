/**
 * src/utils/productReviews.ts
 *
 * Client-side interface for customer reviews, verified ratings, and testimonials.
 * Synchronizes with the persistent backend review API (/api/reviews) while
 * preserving local cache and backwards compatibility.
 */

import { Product } from '../types';
import {
  ProductReview as FullProductReview,
  ProductRatingSummary,
  ReviewSubmissionInput,
} from '../types/review';

// Backward compatible interface alias
export type ProductReview = FullProductReview;
export type { ProductRatingSummary };

/**
 * Loads customer-submitted reviews from local cache for instant initial render.
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

/**
 * Saves a customer-submitted review to local cache.
 */
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

  // Remove any duplicates with the same ID
  const filtered = current.filter((r) => r.id !== newReview.id);
  const updated = [newReview, ...filtered];
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {
    // Session cache fallback
  }
  return updated;
}

/**
 * Fetches approved public reviews and live rating summary from the server.
 */
export async function fetchProductReviews(
  productId: number,
  limit: number = 50
): Promise<{
  reviews: ProductReview[];
  summary: ProductRatingSummary;
  total: number;
}> {
  try {
    const res = await fetch(`/api/reviews?productId=${productId}&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        // Save to local cache for instant hydration next time
        try {
          localStorage.setItem(`gh_reviews_product_${productId}`, JSON.stringify(data.reviews || []));
          localStorage.setItem(`gh_rating_summary_${productId}`, JSON.stringify(data.summary));
        } catch {
          // ignore storage quota errors
        }
        return {
          reviews: data.reviews || [],
          summary: data.summary || getFallbackRatingSummary(productId),
          total: data.total || (data.reviews || []).length,
        };
      }
    }
  } catch (err) {
    console.warn('[Product Reviews] Error fetching remote reviews:', err);
  }

  // Fallback to local cache
  const cachedReviews = getProductReviews({ id: productId } as Product);
  return {
    reviews: cachedReviews,
    summary: getFallbackRatingSummary(productId, cachedReviews),
    total: cachedReviews.length,
  };
}

/**
 * Submits a new review to the persistent backend.
 */
export async function submitProductReview(
  input: ReviewSubmissionInput
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  reviewId?: string;
}> {
  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Your review has been submitted for moderation.',
        reviewId: data.reviewId,
      };
    }
    return {
      success: false,
      error: data.error || 'Failed to submit review. Please try again.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error submitting review.',
    };
  }
}

/**
 * Fetches featured testimonials for the homepage.
 */
export async function fetchHomepageTestimonials(): Promise<ProductReview[]> {
  try {
    const res = await fetch('/api/reviews/testimonials');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.testimonials)) {
        return data.testimonials;
      }
    }
  } catch (err) {
    console.warn('[Testimonials] Error fetching testimonials:', err);
  }
  return [];
}

/**
 * Votes helpful on a customer review.
 */
export async function voteReviewHelpful(reviewId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/reviews/${reviewId}/vote-helpful`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Helper to generate fallback summary from local reviews.
 */
export function getFallbackRatingSummary(
  productId: number,
  reviewsList: ProductReview[] = []
): ProductRatingSummary {
  const approved = reviewsList.filter((r) => r.status === 'approved' || !r.status);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;
  let writtenCount = 0;

  for (const r of approved) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    distribution[star as 1 | 2 | 3 | 4 | 5]++;
    ratingSum += star;
    if (r.comment && r.comment.trim()) writtenCount++;
  }

  const count = approved.length;
  const averageRating = count > 0 ? Number((ratingSum / count).toFixed(1)) : 0;

  return {
    productId,
    productSlug: `product-${productId}`,
    productName: `Product #${productId}`,
    averageRating,
    ratingCount: count,
    reviewCount: writtenCount,
    distribution,
    lastCalculatedAt: new Date().toISOString(),
  };
}
