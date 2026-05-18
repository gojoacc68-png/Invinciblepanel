/**
 * GET  /api/admins   — List admins with their stats
 * POST /api/admins   — Create admin (owner only)
 *
 * Returns admins with: expiry, sub-user count, API quota, status.
 */

const crypto = require('crypto');
const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return { hash, salt };
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res)) return;

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

  // ── GET /api/admins ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`
    //   SELECT u.id, u.username, u.telegram_username, u.expires_at,
    //          u.is_active, u.created_at, u.last_login,
    //          COUNT(sub.id) as sub_user_count,
    //          COALESCE(u.api_quota, 1000) as api_quota,
    //          COALESCE(u.api_used, 0) as api_used
    //   FROM users u
    //   LEFT JOIN users sub ON sub.created_by = u.id
    //   WHERE u.role = 'admin'
    //   GROUP BY u.id
    //   ORDER BY u.created_at DESC
    // `;
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      admins: [],
      message: 'Configure database to return admins'
    });
  }

  // ── POST /api/admins ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { username, password, telegramId, telegramUsername, expiresAt, apiQuota } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'username and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'password must be at least 8 characters' });
    }

    const { hash, salt } = hashPassword(password);

    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`
    //   INSERT INTO users (username, password_hash, password_salt, role,
    //     telegram_id, telegram_username, expires_at, api_quota, created_by)
    //   VALUES (${username.toLowerCase().trim()}, ${hash}, ${salt}, 'admin',
    //     ${telegramId || null}, ${telegramUsername || null},
    //     ${expiresAt || null}, ${apiQuota || 1000}, ${caller.userId})
    //   RETURNING id, username, role, expires_at, created_at
    // `;
    // return res.status(201).json({ success: true, admin: result.rows[0] });
    // ─────────────────────────────────────────────────────────────────────

    return res.status(201).json({
      success: true,
      message: 'Configure database to persist admin',
      admin: { username: username.toLowerCase().trim(), role: 'admin' }
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
