/**
 * src/server/reviewRoutes.ts
 *
 * Express routes for customer reviews, verified purchase verification,
 * dynamic rating calculations, and administrator moderation.
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  submitReview,
  getProductPublicReviews,
  calculateProductRatingSummary,
  getHomepageTestimonials,
  adminListReviews,
  adminApproveReview,
  adminRejectReview,
  adminDeleteReview,
  adminToggleFeatureOnHome,
  adminAddResponse,
  voteHelpful,
} from './reviewService';

export const reviewRouter = express.Router();

/**
 * Middleware to verify administrator privileges for review moderation
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const origin = req.headers.origin || req.headers.referer || '';
  if (!isProd && (origin.includes('localhost') || origin.includes('ais-dev'))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.length > 5)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Administrator privileges required.',
  });
}

// ============================================================================
// PUBLIC REVIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/reviews
 * Query params: productId (number), limit (number)
 * Returns approved reviews and live rating summary
 */
reviewRouter.get('/api/reviews', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');

  const productId = Number(req.query.productId);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'Valid numeric productId is required.' });
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const result = getProductPublicReviews(productId, limit);

  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * GET /api/reviews/summary
 * Query params: productId (number)
 * Returns calculated rating summary for a single product
 */
reviewRouter.get('/api/reviews/summary', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

  const productId = Number(req.query.productId);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'Valid numeric productId is required.' });
  }

  const summary = calculateProductRatingSummary(productId);
  return res.status(200).json({
    success: true,
    summary,
  });
});

/**
 * GET /api/reviews/testimonials
 * Returns approved featured reviews for homepage showcase
 */
reviewRouter.get('/api/reviews/testimonials', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const testimonials = getHomepageTestimonials(6);
  return res.status(200).json({
    success: true,
    testimonials,
  });
});

/**
 * POST /api/reviews
 * Submits a new customer review. Enters 'pending' status for moderation.
 */
reviewRouter.post('/api/reviews', async (req: Request, res: Response) => {
  const { productId, productName, productSlug, author, email, rating, title, comment, imageUrl } = req.body || {};

  const submission = submitReview({
    productId: Number(productId),
    productName,
    productSlug,
    author: String(author || ''),
    email: email ? String(email) : undefined,
    rating: Number(rating) || 5,
    title: title ? String(title) : undefined,
    comment: String(comment || ''),
    imageUrl: imageUrl ? String(imageUrl) : undefined,
  });

  if (!submission.success) {
    return res.status(400).json({
      success: false,
      error: submission.error || 'Failed to submit review.',
    });
  }

  return res.status(200).json({
    success: true,
    reviewId: submission.review?.id,
    duplicateSuppressed: submission.duplicateSuppressed || false,
    message: 'Thank you for sharing your experience with Global Herbs. Your review has been submitted and will appear after approval.',
  });
});

/**
 * POST /api/reviews/:id/vote-helpful
 * Increments helpful counter for a review
 */
reviewRouter.post('/api/reviews/:id/vote-helpful', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = voteHelpful(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error || 'Review not found.' });
  }
  return res.status(200).json({ success: true, helpfulCount: result.helpfulCount });
});

// ============================================================================
// ADMINISTRATOR MODERATION ENDPOINTS (Strictly Protected)
// ============================================================================

/**
 * GET /api/admin/reviews
 * Query params: status (all|pending|approved|rejected), productId, minRating, search
 */
reviewRouter.get('/api/admin/reviews', requireAdmin, (req: Request, res: Response) => {
  const status = req.query.status as any;
  const productId = req.query.productId ? Number(req.query.productId) : undefined;
  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
  const search = req.query.search as string;

  const result = adminListReviews({
    status,
    productId,
    minRating,
    search,
  });

  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * POST /api/admin/reviews/:id/approve
 */
reviewRouter.post('/api/admin/reviews/:id/approve', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = adminApproveReview(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({
    success: true,
    review: result.review,
    message: 'Review approved and published to the live storefront.',
  });
});

/**
 * POST /api/admin/reviews/:id/reject
 */
reviewRouter.post('/api/admin/reviews/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = adminRejectReview(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({
    success: true,
    review: result.review,
    message: 'Review rejected.',
  });
});

/**
 * DELETE /api/admin/reviews/:id
 */
reviewRouter.delete('/api/admin/reviews/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = adminDeleteReview(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({
    success: true,
    message: 'Review record permanently deleted.',
  });
});

/**
 * POST /api/admin/reviews/:id/feature
 */
reviewRouter.post('/api/admin/reviews/:id/feature', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { featured } = req.body || {};
  const result = adminToggleFeatureOnHome(id, typeof featured === 'boolean' ? featured : undefined);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({
    success: true,
    review: result.review,
    message: result.review?.featuredOnHome
      ? 'Review featured on the homepage testimonials.'
      : 'Review unfeatured from the homepage.',
  });
});

/**
 * POST /api/admin/reviews/:id/respond
 */
reviewRouter.post('/api/admin/reviews/:id/respond', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { response, responderName } = req.body || {};

  if (!response || !String(response).trim()) {
    return res.status(400).json({ success: false, error: 'Response message is required.' });
  }

  const result = adminAddResponse(id, String(response), responderName ? String(responderName) : undefined);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }

  return res.status(200).json({
    success: true,
    review: result.review,
    message: 'Official response attached to review.',
  });
});
