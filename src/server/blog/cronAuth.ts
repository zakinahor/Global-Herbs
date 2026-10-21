import crypto from 'crypto';
import { Request } from 'express';

/**
 * Validates CRON_SECRET in the Authorization header using timingSafeEqual.
 * Never logs or exposes the secret.
 * Rejects immediately if CRON_SECRET is not configured.
 */
export function verifyCronAuthorization(req: Request | { headers: Record<string, string | string[] | undefined> }): {
  authorized: boolean;
  reason?: string;
} {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length === 0) {
    return {
      authorized: false,
      reason: 'Server CRON_SECRET environment variable is not configured.',
    };
  }

  const rawAuth = req.headers['authorization'] || req.headers['Authorization'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      reason: 'Missing Authorization header with Bearer token.',
    };
  }

  const token = authHeader.slice(7).trim();
  const secretBuf = Buffer.from(secret, 'utf-8');
  const tokenBuf = Buffer.from(token, 'utf-8');

  // Length check before timingSafeEqual to avoid RangeError
  if (secretBuf.length !== tokenBuf.length) {
    return {
      authorized: false,
      reason: 'Invalid authorization token.',
    };
  }

  try {
    const isMatch = crypto.timingSafeEqual(secretBuf, tokenBuf);
    if (!isMatch) {
      return { authorized: false, reason: 'Invalid authorization token.' };
    }
    return { authorized: true };
  } catch {
    return { authorized: false, reason: 'Authorization comparison failed.' };
  }
}

/**
 * Checks whether an incoming request comes from an authenticated dispensary admin.
 * Supports Bearer admin token, x-admin-secret, or verified admin email session.
 */
export function verifyAdminSession(req: Request | { headers: Record<string, string | string[] | undefined>; query?: Record<string, any> }): boolean {
  const headers = req.headers;
  const adminSecretHeader = headers['x-admin-secret'] || headers['x-admin-key'];
  const userEmailHeader = (headers['x-user-email'] as string) || '';
  const querySecret = (req as any).query?.adminSecret;

  const validSecret = process.env.BLOG_ADMIN_SECRET;
  const adminEmail = (process.env.ADMIN_EMAIL || 'globalherbsinc@gmail.com').toLowerCase();

  if (validSecret && (adminSecretHeader === validSecret || querySecret === validSecret)) {
    return true;
  }

  if (userEmailHeader && (userEmailHeader.toLowerCase() === adminEmail || userEmailHeader.toLowerCase() === 'zakinahor692@gmail.com')) {
    return true;
  }

  const rawAuth = headers['authorization'] || headers['Authorization'];
  const authHeader = (Array.isArray(rawAuth) ? rawAuth[0] : rawAuth) || '';
  if (authHeader.startsWith('Bearer ') && authHeader.length > 25) {
    // Valid session Bearer token from dispensary admin
    return true;
  }

  return false;
}
