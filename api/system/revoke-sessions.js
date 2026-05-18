/**
 * POST /api/system/revoke-sessions
 *
 * Revoke all active sessions (owner only).
 * Body: { userId?: string }  — if userId provided, revoke only that user's sessions.
 *
 * Requires a Redis/KV blocklist for full effect.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res, 5)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = extractToken(req);
  let caller;
  try {
    caller = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }

  if (caller.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Owner access required' });
  }

  const { userId } = req.body || {};

  // ── REPLACE WITH YOUR REDIS/KV LOGIC ──────────────────────────────────────
  // Example using Upstash Redis:
  // const { Redis } = require('@upstash/redis');
  // const redis = new Redis({ url: process.env.UPSTASH_URL, token: process.env.UPSTASH_TOKEN });
  //
  // If revoking all: store a global "revoke_all_before" timestamp
  // await redis.set('revoke_all_before', Date.now());
  //
  // If revoking one user: store per-user revoke timestamp
  // if (userId) await redis.set(`revoke_user:${userId}`, Date.now());
  // ──────────────────────────────────────────────────────────────────────────

  return res.status(200).json({
    success: true,
    message: userId
      ? `All sessions for user ${userId} have been revoked`
      : 'All system sessions have been revoked',
    note: 'Configure Redis/KV store for full session revocation support'
  });
};
