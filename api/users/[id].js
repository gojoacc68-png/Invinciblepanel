/**
 * GET    /api/users/:id   — Get user by ID
 * PATCH  /api/users/:id   — Update user (role, expiry, status, telegram, firebase)
 * DELETE /api/users/:id   — Delete user
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res)) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }

  const token = extractToken(req);
  let caller;
  try {
    caller = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }

  if (!['owner', 'admin'].includes(caller.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  // ── GET /api/users/:id ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`
    //   SELECT id, username, role, telegram_id, telegram_username,
    //          firebase_config_id, expires_at, is_active, created_at, last_login
    //   FROM users WHERE id = ${id}
    //   ${caller.role === 'admin' ? sql`AND created_by = ${caller.userId}` : sql``}
    //   LIMIT 1
    // `;
    // if (!result.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });
    // return res.status(200).json({ success: true, user: result.rows[0] });
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({ success: true, message: 'Configure database', userId: id });
  }

  // ── PATCH /api/users/:id ──────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = req.body || {};
    const allowed = ['role', 'expiresAt', 'isActive', 'telegramId', 'telegramUsername', 'firebaseConfigId', 'password'];
    const updates = {};

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.role && caller.role === 'admin' && updates.role !== 'user') {
      return res.status(403).json({ success: false, error: 'Admins can only set role to "user"' });
    }

    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // Build dynamic UPDATE query from updates object
    // const { sql } = require('@vercel/postgres');
    // ... apply updates to the user row
    // ─────────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true, message: 'Configure database', updates, userId: id });
  }

  // ── DELETE /api/users/:id ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (caller.role !== 'owner' && caller.userId === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // await sql`DELETE FROM users WHERE id = ${id}
    //   ${caller.role === 'admin' ? sql`AND created_by = ${caller.userId}` : sql``}
    // `;
    // ─────────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true, message: 'User deleted', userId: id });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
