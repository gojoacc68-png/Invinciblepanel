/**
 * DELETE /api/system/api-keys/:id   — Revoke a specific API key
 * PATCH  /api/system/api-keys/:id   — Update key (name, rate limit, status)
 *
 * Owner-only.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res, 20)) return;

  const { id } = req.query;
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

  if (req.method === 'DELETE') {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // await sql`UPDATE api_keys SET is_active = false WHERE id = ${id}`;
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({ success: true, message: 'API key revoked', keyId: id });
  }

  if (req.method === 'PATCH') {
    const { name, rateLimit: keyRateLimit, isActive } = req.body || {};
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // Build and run UPDATE query
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({ success: true, message: 'API key updated', keyId: id });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
