/**
 * src/server/reviewService.ts
 *
 * Persistent review storage and calculation engine for Global Herbs.
 * Manages customer reviews, verified purchase verification, dynamic rating
 * calculations, and administrator moderation.
 */

import fs from 'fs';
import path from 'path';
import { ProductReview, ProductRatingSummary, ReviewSubmissionInput, ReviewStatus } from '../types/review';
import { products } from '../data/products';

const REVIEWS_FILE_PATH = path.join(process.cwd(), 'data/reviews.json');
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data/orders.json');

// Memory cache for high performance
const reviewsStore = new Map<string, ProductReview>();
let isInitialized = false;

// HTML tag stripper for XSS prevention
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Loads reviews from disk into the in-memory cache.
 */
export function initReviewStore(): void {
  if (isInitialized) return;
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(REVIEWS_FILE_PATH)) {
      const raw = fs.readFileSync(REVIEWS_FILE_PATH, 'utf-8');
      if (raw.trim()) {
        const list: ProductReview[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((rev) => {
            if (rev && rev.id) {
              reviewsStore.set(rev.id, rev);
            }
          });
          console.log(`[Review Service] Loaded ${reviewsStore.size} persistent reviews from ${REVIEWS_FILE_PATH}`);
        }
      }
    } else {
      fs.writeFileSync(REVIEWS_FILE_PATH, '[]', 'utf-8');
    }
    isInitialized = true;
  } catch (err) {
    console.error('[Review Service] Error initializing reviews storage:', err);
  }
}

/**
 * Persists all in-memory reviews back to disk.
 */
function persistReviews(): void {
  try {
    const list = Array.from(reviewsStore.values());
    fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Review Service] Failed to persist reviews to disk:', err);
  }
}

/**
 * Validates whether an email has a completed/delivered order containing the product.
 * Returns { verified: boolean, orderId?: string }
 */
export function verifyPurchase(email: string, productId: number, productName?: string): { verified: boolean; orderId?: string } {
  if (!email || !email.includes('@')) {
    return { verified: false };
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const raw = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
      const orders: any[] = JSON.parse(raw);
      if (Array.isArray(orders)) {
        for (const order of orders) {
          if (!order || !order.customerEmail) continue;
          if (order.customerEmail.trim().toLowerCase() !== cleanEmail) continue;

          // Check if order contains the product
          const items = order.items || [];
          const matchesProduct = items.some((item: any) => {
            const itemProdId = item.productId || item.id;
            if (itemProdId && String(itemProdId) === String(productId)) return true;
            if (productName && item.name && item.name.toLowerCase().includes(productName.toLowerCase())) return true;
            return false;
          });

          if (matchesProduct) {
            // Check status eligibility
            const s = (order.status || '').toLowerCase();
            const pStatus = (order.paymentStatus || '').toLowerCase();
            const isCompleted =
              s.includes('delivered') ||
              s.includes('out for delivery') ||
              s.includes('shipped') ||
              s.includes('processing') ||
              pStatus.includes('paid') ||
              pStatus.includes('verified');

            if (isCompleted) {
              return { verified: true, orderId: order.orderId };
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Review Service] Error verifying purchase against orders:', err);
  }

  return { verified: false };
}

/**
 * Computes live rating summary for a product using strictly approved reviews.
 */
export function calculateProductRatingSummary(productId: number): ProductRatingSummary {
  initReviewStore();

  const prod = products.find((p) => p.id === productId);
  const productSlug = prod?.slug || `product-${productId}`;
  const productName = prod?.name || `Product #${productId}`;

  const approvedReviews = Array.from(reviewsStore.values()).filter(
    (r) => r.productId === productId && r.status === 'approved'
  );

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;
  let writtenReviewCount = 0;

  for (const rev of approvedReviews) {
    const star = Math.min(5, Math.max(1, Math.round(rev.rating)));
    if (star >= 1 && star <= 5) {
      distribution[star as 1 | 2 | 3 | 4 | 5]++;
      ratingSum += star;
    }
    if (rev.comment && rev.comment.trim().length > 0) {
      writtenReviewCount++;
    }
  }

  const ratingCount = approvedReviews.length;
  const averageRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : 0;

  return {
    productId,
    productSlug,
    productName,
    averageRating,
    ratingCount,
    reviewCount: writtenReviewCount,
    distribution,
    lastCalculatedAt: new Date().toISOString(),
  };
}

/**
 * Submits a new customer review.
 * Always enters 'pending' status for admin approval.
 */
export function submitReview(input: ReviewSubmissionInput): {
  success: boolean;
  review?: ProductReview;
  error?: string;
  duplicateSuppressed?: boolean;
} {
  initReviewStore();

  const cleanAuthor = sanitizeText(input.author);
  const cleanComment = sanitizeText(input.comment);
  const cleanTitle = input.title ? sanitizeText(input.title) : undefined;
  const cleanEmail = input.email ? input.email.trim().toLowerCase() : undefined;
  const numRating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
  const productId = Number(input.productId);

  if (!productId || isNaN(productId)) {
    return { success: false, error: 'A valid product ID is required.' };
  }

  if (!cleanAuthor || cleanAuthor.length < 2) {
    return { success: false, error: 'Customer display name must be at least 2 characters.' };
  }

  if (cleanAuthor.length > 60) {
    return { success: false, error: 'Customer display name cannot exceed 60 characters.' };
  }

  if (!cleanComment || cleanComment.length < 5) {
    return { success: false, error: 'Review comment must be at least 5 characters.' };
  }

  if (cleanComment.length > 1500) {
    return { success: false, error: 'Review comment cannot exceed 1500 characters.' };
  }

  const prod = products.find((p) => p.id === productId);
  const productName = prod?.name || input.productName || `Product #${productId}`;
  const productSlug = prod?.slug || input.productSlug || `product-${productId}`;

  // Spam / duplicate submission prevention (check last 5 minutes)
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const existing of reviewsStore.values()) {
    if (
      existing.productId === productId &&
      existing.author.toLowerCase() === cleanAuthor.toLowerCase() &&
      existing.comment.toLowerCase() === cleanComment.toLowerCase() &&
      new Date(existing.createdAt).getTime() > fiveMinAgo
    ) {
      return {
        success: true,
        review: existing,
        duplicateSuppressed: true,
      };
    }
  }

  // Check verified purchase against orders database
  const verification = cleanEmail ? verifyPurchase(cleanEmail, productId, productName) : { verified: false };

  const id = `rev_${productId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newReview: ProductReview = {
    id,
    productId,
    productSlug,
    productName,
    rating: numRating,
    author: cleanAuthor,
    email: cleanEmail,
    title: cleanTitle,
    comment: cleanComment,
    imageUrl: input.imageUrl,
    verified: verification.verified,
    orderId: verification.orderId,
    status: 'pending', // Pending moderation by default
    featuredOnHome: false,
    helpfulCount: 0,
    createdAt: new Date().toISOString(),
  };

  reviewsStore.set(id, newReview);
  persistReviews();

  return { success: true, review: newReview };
}

/**
 * Returns public reviews and summary for a product.
 * Strips private customer emails and order numbers.
 */
export function getProductPublicReviews(productId: number, limit: number = 50): {
  reviews: Array<Omit<ProductReview, 'email' | 'orderId'>>;
  summary: ProductRatingSummary;
  total: number;
} {
  initReviewStore();

  const allApproved = Array.from(reviewsStore.values())
    .filter((r) => r.productId === productId && r.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allApproved.length;
  const paginated = allApproved.slice(0, limit);

  const sanitized = paginated.map((r) => {
    const { email, orderId, ...publicFields } = r;
    return publicFields;
  });

  const summary = calculateProductRatingSummary(productId);

  return {
    reviews: sanitized,
    summary,
    total,
  };
}

/**
 * Returns featured approved testimonials for the homepage.
 */
export function getHomepageTestimonials(limit: number = 6): Array<Omit<ProductReview, 'email' | 'orderId'>> {
  initReviewStore();

  const allApproved = Array.from(reviewsStore.values()).filter((r) => r.status === 'approved');

  // Prioritize explicitly featured reviews, then highest rated verified reviews
  const sorted = allApproved.sort((a, b) => {
    if (a.featuredOnHome && !b.featuredOnHome) return -1;
    if (!a.featuredOnHome && b.featuredOnHome) return 1;
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return sorted.slice(0, limit).map((r) => {
    const { email, orderId, ...publicFields } = r;
    return publicFields;
  });
}

/**
 * Administrator: List all reviews with filters.
 */
export function adminListReviews(filters?: {
  status?: ReviewStatus | 'all';
  productId?: number;
  minRating?: number;
  search?: string;
}): {
  reviews: ProductReview[];
  counts: { all: number; pending: number; approved: number; rejected: number };
} {
  initReviewStore();

  let list = Array.from(reviewsStore.values());

  const counts = {
    all: list.length,
    pending: list.filter((r) => r.status === 'pending').length,
    approved: list.filter((r) => r.status === 'approved').length,
    rejected: list.filter((r) => r.status === 'rejected').length,
  };

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((r) => r.status === filters.status);
  }

  if (filters?.productId) {
    list = list.filter((r) => r.productId === filters.productId);
  }

  if (filters?.minRating) {
    list = list.filter((r) => r.rating >= (filters.minRating as number));
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter((r) =>
      r.author.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q) ||
      (r.email && r.email.toLowerCase().includes(q))
    );
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { reviews: list, counts };
}

/**
 * Administrator: Approve review
 */
export function adminApproveReview(id: string): { success: boolean; review?: ProductReview; error?: string } {
  initReviewStore();
  const rev = reviewsStore.get(id);
  if (!rev) return { success: false, error: 'Review not found' };

  rev.status = 'approved';
  rev.updatedAt = new Date().toISOString();
  reviewsStore.set(id, rev);
  persistReviews();

  return { success: true, review: rev };
}

/**
 * Administrator: Reject review
 */
export function adminRejectReview(id: string): { success: boolean; review?: ProductReview; error?: string } {
  initReviewStore();
  const rev = reviewsStore.get(id);
  if (!rev) return { success: false, error: 'Review not found' };

  rev.status = 'rejected';
  rev.updatedAt = new Date().toISOString();
  reviewsStore.set(id, rev);
  persistReviews();

  return { success: true, review: rev };
}

/**
 * Administrator: Delete review
 */
export function adminDeleteReview(id: string): { success: boolean; error?: string } {
  initReviewStore();
  if (!reviewsStore.has(id)) return { success: false, error: 'Review not found' };

  reviewsStore.delete(id);
  persistReviews();

  return { success: true };
}

/**
 * Administrator: Toggle homepage featured status
 */
export function adminToggleFeatureOnHome(id: string, featured?: boolean): { success: boolean; review?: ProductReview; error?: string } {
  initReviewStore();
  const rev = reviewsStore.get(id);
  if (!rev) return { success: false, error: 'Review not found' };

  rev.featuredOnHome = typeof featured === 'boolean' ? featured : !rev.featuredOnHome;
  rev.updatedAt = new Date().toISOString();
  reviewsStore.set(id, rev);
  persistReviews();

  return { success: true, review: rev };
}

/**
 * Administrator: Add or edit official response
 */
export function adminAddResponse(
  id: string,
  response: string,
  responderName: string = 'Global Herbs Dispatch Management'
): { success: boolean; review?: ProductReview; error?: string } {
  initReviewStore();
  const rev = reviewsStore.get(id);
  if (!rev) return { success: false, error: 'Review not found' };

  rev.adminResponse = {
    response: sanitizeText(response),
    respondedAt: new Date().toISOString(),
    responderName: sanitizeText(responderName),
  };
  rev.updatedAt = new Date().toISOString();
  reviewsStore.set(id, rev);
  persistReviews();

  return { success: true, review: rev };
}

/**
 * Public: Increment helpful count
 */
export function voteHelpful(id: string): { success: boolean; helpfulCount?: number; error?: string } {
  initReviewStore();
  const rev = reviewsStore.get(id);
  if (!rev) return { success: false, error: 'Review not found' };

  rev.helpfulCount = (rev.helpfulCount || 0) + 1;
  reviewsStore.set(id, rev);
  persistReviews();

  return { success: true, helpfulCount: rev.helpfulCount };
}
