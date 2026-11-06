/**
 * src/types/review.ts
 *
 * Types for Global Herbs Customer Review & Rating System.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReviewResponse {
  response: string;
  respondedAt: string;
  responderName: string;
}

export interface ProductReview {
  id: string;
  productId: number;
  productSlug: string;
  productName: string;
  rating: number; // 1 to 5 integer
  author: string; // Display name
  email?: string; // Private, never exposed in public API
  title?: string;
  comment: string;
  imageUrl?: string;
  verified: boolean; // Verified purchase badge
  orderId?: string; // Private, never exposed in public API
  status: ReviewStatus;
  featuredOnHome?: boolean;
  adminResponse?: AdminReviewResponse;
  helpfulCount: number;
  createdAt: string; // ISO date string
  updatedAt?: string;
}

export interface ProductRatingSummary {
  productId: number;
  productSlug: string;
  productName: string;
  averageRating: number; // e.g. 4.8 (0 if no approved reviews)
  ratingCount: number; // Total approved ratings count
  reviewCount: number; // Total approved written reviews
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  lastCalculatedAt: string;
}

export interface ReviewSubmissionInput {
  productId: number;
  productName?: string;
  productSlug?: string;
  author: string;
  email?: string;
  rating: number;
  title?: string;
  comment: string;
  imageUrl?: string;
}

export interface PublicReviewResponse {
  reviews: Array<Omit<ProductReview, 'email' | 'orderId'>>;
  summary: ProductRatingSummary;
  total: number;
}
