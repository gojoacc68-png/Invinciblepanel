/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 * Requires: Authorization: Bearer <accessToken>
 */

const { requireAuth, handleCors } = require('../../middleware/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let user;
  try {
    await new Promise((resolve, reject) => {
      requireAuth(['owner', 'admin', 'user'])(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    user = req.user;
  } catch (err) {
    return;
  }

  // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────────
  // const { sql } = require('@vercel/postgres');
  // const result = await sql`
  //   SELECT id, username, role, telegram_username, expires_at, created_at, last_login
  //   FROM users WHERE id = ${user.userId} AND is_active = true LIMIT 1
  // `;
  // if (!result.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });
  // return res.status(200).json({ success: true, user: result.rows[0] });
  // ─────────────────────────────────────────────────────────────────────────

  return res.status(200).json({
    success: true,
    user: {
      id: user.userId,
      username: user.username,
      role: user.role
    }
  });
};
