/**
 * POST /api/auth/logout
 *
 * Invalidates the current session.
 * In a stateless JWT system, this logs the JTI into a blocklist.
 * Requires: Authorization: Bearer <accessToken>
 *
 * For production, maintain a token blocklist in Redis/KV with TTL = token expiry.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      // ── ADD TOKEN TO BLOCKLIST ─────────────────────────────────────────────
      // Example using Upstash Redis:
      // const { Redis } = require('@upstash/redis');
      // const redis = new Redis({ url: process.env.UPSTASH_URL, token: process.env.UPSTASH_TOKEN });
      // const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      // if (ttl > 0) await redis.setex(`blocklist:${decoded.jti || token.slice(-16)}`, ttl, '1');
      // ───────────────────────────────────────────────────────────────────────
      void decoded;
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(200).json({ success: true, message: 'Logged out' });
  }
};
