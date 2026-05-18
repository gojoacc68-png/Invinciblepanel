/**
 * GET    /api/system/api-keys   — List API keys (masked)
 * POST   /api/system/api-keys   — Generate a new API key
 * DELETE /api/system/api-keys   — Revoke all keys (owner only)
 *
 * Owner-only endpoint.
 */

const crypto = require('crypto');
const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

function generateApiKey() {
  const prefix = 'inv_';
  const secret = crypto.randomBytes(32).toString('hex');
  return `${prefix}${secret}`;
}

function maskApiKey(key) {
  if (!key || key.length < 12) return '***';
  return `${key.slice(0, 8)}${'*'.repeat(24)}${key.slice(-4)}`;
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res, 20)) return;

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

  // ── GET /api/system/api-keys ──────────────────────────────────────────────
  if (req.method === 'GET') {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`
    //   SELECT id, name, key_prefix, created_at, last_used_at,
    //          request_count, rate_limit, is_active
    //   FROM api_keys ORDER BY created_at DESC
    // `;
    // return res.status(200).json({ success: true, keys: result.rows });
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      keys: [],
      message: 'Configure database to return API keys'
    });
  }

  // ── POST /api/system/api-keys ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, rateLimit: keyRateLimit, expiresAt } = req.body || {};

    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 64) {
      return res.status(400).json({ success: false, error: 'name must be 2-64 characters' });
    }

    const fullKey = generateApiKey();
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.slice(0, 12);

    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // await sql`
    //   INSERT INTO api_keys (name, key_hash, key_prefix, rate_limit, expires_at, created_by)
    //   VALUES (${name}, ${keyHash}, ${keyPrefix}, ${keyRateLimit || 1000}, ${expiresAt || null}, ${caller.userId})
    // `;
    // ─────────────────────────────────────────────────────────────────────

    // Return full key ONCE — it will never be shown again
    return res.status(201).json({
      success: true,
      key: fullKey,
      prefix: keyPrefix,
      message: 'Save this key now. It will not be shown again.',
      warning: 'Configure database to persist API keys'
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
