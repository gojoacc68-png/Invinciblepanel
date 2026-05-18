/**
 * GET  /api/users       — List all users (owner: all; admin: own users only)
 * POST /api/users       — Create a new user
 *
 * Roles: owner can create owner/admin/user; admin can create user only.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { requireAuth, handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

const ALLOWED_ROLES = ['owner', 'admin', 'user'];
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return { hash, salt };
}

function validateCreatePayload(body) {
  const errors = [];
  if (!body.username || typeof body.username !== 'string' || body.username.length < 3 || body.username.length > 32) {
    errors.push('username must be 3-32 characters');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    errors.push('password must be at least 8 characters');
  }
  if (!body.role || !ALLOWED_ROLES.includes(body.role)) {
    errors.push('role must be one of: owner, admin, user');
  }
  if (body.expiresAt && isNaN(Date.parse(body.expiresAt))) {
    errors.push('expiresAt must be a valid ISO date string');
  }
  return errors;
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

  if (!['owner', 'admin'].includes(caller.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  // ── GET /api/users ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query?.page || '1', 10);
      const limit = Math.min(parseInt(req.query?.limit || '20', 10), 100);
      const offset = (page - 1) * limit;
      const roleFilter = req.query?.role;
      const search = req.query?.search;

      // ── REPLACE WITH YOUR DATABASE LOGIC ────────────────────────────────
      // const { sql } = require('@vercel/postgres');
      // let query = sql`
      //   SELECT id, username, role, telegram_id, telegram_username,
      //          firebase_config_id, expires_at, is_active, created_at, last_login,
      //          created_by
      //   FROM users
      //   WHERE 1=1
      //   ${caller.role === 'admin' ? sql`AND created_by = ${caller.userId}` : sql``}
      //   ${roleFilter ? sql`AND role = ${roleFilter}` : sql``}
      //   ${search ? sql`AND username ILIKE ${'%' + search + '%'}` : sql``}
      //   ORDER BY created_at DESC
      //   LIMIT ${limit} OFFSET ${offset}
      // `;
      // const users = await query;
      // ─────────────────────────────────────────────────────────────────────

      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0 },
        message: 'Configure database in /api/users/index.js to return real users'
      });
    } catch (err) {
      console.error('[GET /api/users]', err.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  }

  // ── POST /api/users ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const errors = validateCreatePayload(body);
      if (errors.length) {
        return res.status(400).json({ success: false, errors });
      }

      // Role creation permissions
      if (caller.role === 'admin' && body.role !== 'user') {
        return res.status(403).json({
          success: false,
          error: 'Admins can only create users with role "user"'
        });
      }
      if (caller.role === 'admin' && body.role === 'owner') {
        return res.status(403).json({ success: false, error: 'Admins cannot create owners' });
      }

      const { hash, salt } = hashPassword(body.password);

      const newUser = {
        username: body.username.toLowerCase().trim(),
        password_hash: hash,
        password_salt: salt,
        role: body.role,
        telegram_id: body.telegramId || null,
        telegram_username: body.telegramUsername || null,
        firebase_config_id: body.firebaseConfigId || null,
        expires_at: body.expiresAt || null,
        is_active: true,
        created_by: caller.userId
      };

      // ── REPLACE WITH YOUR DATABASE LOGIC ────────────────────────────────
      // const { sql } = require('@vercel/postgres');
      // const result = await sql`
      //   INSERT INTO users (username, password_hash, password_salt, role, telegram_id,
      //     telegram_username, firebase_config_id, expires_at, is_active, created_by)
      //   VALUES (${newUser.username}, ${newUser.password_hash}, ${newUser.password_salt},
      //     ${newUser.role}, ${newUser.telegram_id}, ${newUser.telegram_username},
      //     ${newUser.firebase_config_id}, ${newUser.expires_at}, ${newUser.is_active},
      //     ${newUser.created_by})
      //   RETURNING id, username, role, expires_at, created_at
      // `;
      // return res.status(201).json({ success: true, user: result.rows[0] });
      // ─────────────────────────────────────────────────────────────────────

      return res.status(201).json({
        success: true,
        message: 'Configure database to persist users',
        user: { username: newUser.username, role: newUser.role }
      });

    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, error: 'Username already exists' });
      }
      console.error('[POST /api/users]', err.message);
      return res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
