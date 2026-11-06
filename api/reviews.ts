// api/reviews.ts
// Vercel Serverless Function for /api/reviews
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

interface ProductReview {
  id: string;
  productId: number;
  productSlug: string;
  productName: string;
  rating: number;
  author: string;
  email?: string;
  title?: string;
  comment: string;
  imageUrl?: string;
  verified: boolean;
  orderId?: string;
  status: 'pending' | 'approved' | 'rejected';
  featuredOnHome?: boolean;
  adminResponse?: {
    response: string;
    respondedAt: string;
    responderName: string;
  };
  helpfulCount: number;
  createdAt: string;
  updatedAt?: string;
}

function loadReviewsFromDisk(): ProductReview[] {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'data/reviews.json'),
      path.join('/tmp', 'data/reviews.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    }
  } catch (err) {
    console.error('[API Reviews] Error loading reviews:', err);
  }
  return [];
}

function saveReviewsToDisk(reviews: ProductReview[]): void {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'data/reviews.json'),
      path.join('/tmp', 'data/reviews.json'),
    ];
    for (const p of candidatePaths) {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(reviews, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[API Reviews] Error saving reviews:', err);
  }
}

function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret, x-user-email');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const reviews = loadReviewsFromDisk();

  // Testimonials endpoint
  if (pathname.includes('/testimonials') || url.searchParams.get('type') === 'testimonials') {
    const approved = reviews
      .filter((r) => r.status === 'approved')
      .sort((a, b) => {
        if (a.featuredOnHome && !b.featuredOnHome) return -1;
        if (!a.featuredOnHome && b.featuredOnHome) return 1;
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 6)
      .map(({ email, orderId, ...rest }) => rest);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.end(JSON.stringify({ success: true, testimonials: approved }));
    return;
  }

  // GET: Reviews for product or all approved
  if (req.method === 'GET') {
    const productIdStr = url.searchParams.get('productId');
    const productId = productIdStr ? Number(productIdStr) : null;

    if (!productId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Valid productId is required.' }));
      return;
    }

    const approved = reviews
      .filter((r) => r.productId === productId && r.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    let writtenReviewCount = 0;

    for (const rev of approved) {
      const star = Math.min(5, Math.max(1, Math.round(rev.rating)));
      distribution[star as 1 | 2 | 3 | 4 | 5]++;
      ratingSum += star;
      if (rev.comment && rev.comment.trim()) writtenReviewCount++;
    }

    const ratingCount = approved.length;
    const averageRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : 0;

    const summary = {
      productId,
      productSlug: approved[0]?.productSlug || `product-${productId}`,
      productName: approved[0]?.productName || `Product #${productId}`,
      averageRating,
      ratingCount,
      reviewCount: writtenReviewCount,
      distribution,
      lastCalculatedAt: new Date().toISOString(),
    };

    const sanitizedReviews = approved.map(({ email, orderId, ...rest }) => rest);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.end(JSON.stringify({
      success: true,
      reviews: sanitizedReviews,
      summary,
      total: approved.length,
    }));
    return;
  }

  // POST: Submit a new review
  if (req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { productId, productName, productSlug, author, email, rating, title, comment, imageUrl } = body;

    const cleanAuthor = sanitizeText(String(author || ''));
    const cleanComment = sanitizeText(String(comment || ''));
    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;
    const numRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const prodId = Number(productId);

    if (!prodId || isNaN(prodId)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Valid numeric productId is required.' }));
      return;
    }

    if (!cleanAuthor || cleanAuthor.length < 2) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Author name must be at least 2 characters.' }));
      return;
    }

    if (!cleanComment || cleanComment.length < 5) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Review comment must be at least 5 characters.' }));
      return;
    }

    const id = `rev_${prodId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRev: ProductReview = {
      id,
      productId: prodId,
      productSlug: productSlug || `product-${prodId}`,
      productName: productName || `Product #${prodId}`,
      rating: numRating,
      author: cleanAuthor,
      email: cleanEmail,
      title: title ? sanitizeText(String(title)) : undefined,
      comment: cleanComment,
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      verified: false,
      status: 'pending',
      featuredOnHome: false,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };

    reviews.push(newRev);
    saveReviewsToDisk(reviews);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      reviewId: id,
      message: 'Thank you for sharing your experience with Global Herbs. Your review has been submitted and will appear after approval.',
    }));
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
}
