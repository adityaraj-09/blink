import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth';

// Helper to safely get IP address with IPv6 support
const getClientIdentifier = (req: AuthRequest): string => {
  // If authenticated, use userId
  if (req.auth?.userId) {
    return `user:${req.auth.userId}`;
  }

  // For IP-based identification, use a combination of headers and req.ip
  // This handles both IPv4 and IPv6 addresses properly
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.ip;

  return `ip:${ip || 'anonymous'}`;
};

/**
 * Rate limiter for API endpoints
 * Uses userId if authenticated, otherwise IP address
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Limit each user/IP to 100 requests per windowMs
    message = 'Too many requests, please try again later',
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use userId if authenticated, otherwise IP
    keyGenerator: (req: AuthRequest) => {
      return getClientIdentifier(req);
    },
    // Skip rate limiting for successful OPTIONS requests
    skip: (req) => req.method === 'OPTIONS',
  });
};

/**
 * Rate limiters for different endpoint types
 */

// General API rate limiter - 100 requests per 15 minutes
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Stricter rate limiter for chat endpoints - 30 requests per 15 minutes
export const chatRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many chat requests, please wait before asking more questions',
});

// Ingestion rate limiter - 50 requests per hour
export const ingestionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many ingestion requests, please wait before uploading more code',
});

// Authentication rate limiter - 5 requests per minute (for auth-intensive operations)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many authentication attempts, please try again later',
});
