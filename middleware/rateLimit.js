/**
 * Simple in-memory rate limiter for Vercel serverless functions.
 * Note: This is per-instance. For production, use Upstash Redis or similar.
 */

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const OTP_MAX_REQUESTS = parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10);

const store = new Map();

function getClientIdentifier(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function checkRateLimit(identifier, maxRequests = MAX_REQUESTS, windowMs = WINDOW_MS) {
  const now = Date.now();
  const key = identifier;

  if (!store.has(key)) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  const entry = store.get(key);

  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Standard rate limit middleware.
 * Returns true if request should be blocked.
 */
function rateLimit(req, res, maxRequests = MAX_REQUESTS) {
  const identifier = getClientIdentifier(req);
  const result = checkRateLimit(identifier, maxRequests);

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
    });
    return true;
  }
  return false;
}

/**
 * Strict rate limit for OTP endpoints (max 5 per window).
 */
function otpRateLimit(req, res) {
  return rateLimit(req, res, OTP_MAX_REQUESTS);
}

module.exports = { rateLimit, otpRateLimit, getClientIdentifier };
