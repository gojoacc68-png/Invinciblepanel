/**
 * GET  /api/logs   — Retrieve security and activity logs
 * POST /api/logs   — Write a log entry (internal use / API integrations)
 *
 * Query params:
 *   - level: INFO | WARN | ERROR
 *   - type: login | otp | user_create | user_delete | api_key | system
 *   - userId: filter by user
 *   - from: ISO date string (start)
 *   - to: ISO date string (end)
 *   - page: page number (default 1)
 *   - limit: page size (default 50, max 200)
 *   - live: 'true' to return only entries from last 5 minutes
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

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

  // ── GET /api/logs ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const {
      level, type, userId, from, to,
      page = '1', limit = '50', live
    } = req.query || {};

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 200);
    const offset = (pageNum - 1) * limitNum;

    // ── REPLACE WITH YOUR DATABASE LOGIC ────────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // Build WHERE conditions:
    //   - level filter
    //   - type filter
    //   - userId filter (admins can only see their own users' logs)
    //   - date range
    //   - live mode: created_at > NOW() - INTERVAL '5 minutes'
    //
    // const result = await sql`
    //   SELECT id, level, type, message, user_id, username, ip_address,
    //          details, created_at
    //   FROM logs
    //   WHERE 1=1
    //   -- apply dynamic filters
    //   ORDER BY created_at DESC
    //   LIMIT ${limitNum} OFFSET ${offset}
    // `;
    // ──────────────────────────────────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      logs: [],
      pagination: { page: pageNum, limit: limitNum, total: 0 },
      filters: { level, type, userId, from, to, live },
      message: 'Configure database to return real logs'
    });
  }

  // ── POST /api/logs (internal write) ──────────────────────────────────────
  if (req.method === 'POST') {
    const { level, type, message, details, targetUserId } = req.body || {};

    if (!level || !type || !message) {
      return res.status(400).json({ success: false, error: 'level, type, and message are required' });
    }

    const validLevels = ['INFO', 'WARN', 'ERROR'];
    if (!validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({ success: false, error: `level must be one of: ${validLevels.join(', ')}` });
    }

    const entry = {
      level: level.toUpperCase(),
      type,
      message,
      details: details || null,
      userId: caller.userId,
      username: caller.username,
      targetUserId: targetUserId || null,
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown',
      createdAt: new Date().toISOString()
    };

    // ── REPLACE WITH YOUR DATABASE LOGIC ────────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // await sql`
    //   INSERT INTO logs (level, type, message, details, user_id, username,
    //     target_user_id, ip_address)
    //   VALUES (${entry.level}, ${entry.type}, ${entry.message}, ${JSON.stringify(entry.details)},
    //     ${entry.userId}, ${entry.username}, ${entry.targetUserId}, ${entry.ipAddress})
    // `;
    // ──────────────────────────────────────────────────────────────────────────

    return res.status(201).json({ success: true, entry });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
