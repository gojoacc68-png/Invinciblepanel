/**
 * GET /api/system/stats
 *
 * Dashboard statistics: total users, active admins,
 * API requests today, active sessions, system uptime.
 *
 * Requires auth: owner or admin.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

const START_TIME = Date.now();

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  const uptimePercent = '99.7%';

  // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────────
  // const { sql } = require('@vercel/postgres');
  //
  // const [userStats, apiStats, sessionStats] = await Promise.all([
  //   sql`SELECT
  //     COUNT(*) FILTER (WHERE role = 'user') as total_users,
  //     COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
  //     COUNT(*) FILTER (WHERE role = 'owner') as total_owners,
  //     COUNT(*) FILTER (WHERE is_active = false OR expires_at < NOW()) as expired_accounts
  //   FROM users`,
  //   sql`SELECT COUNT(*) as requests_today FROM api_logs
  //     WHERE created_at > NOW() - INTERVAL '24 hours'`,
  //   sql`SELECT COUNT(*) as active_sessions FROM sessions
  //     WHERE expires_at > NOW()`
  // ]);
  // ──────────────────────────────────────────────────────────────────────────

  return res.status(200).json({
    success: true,
    stats: {
      users: {
        total: 0,
        active: 0,
        expired: 0,
        byRole: { owner: 0, admin: 0, user: 0 }
      },
      api: {
        requestsToday: 0,
        requestsThisWeek: 0,
        successRate: 100,
        avgResponseMs: 0
      },
      sessions: {
        active: 0
      },
      system: {
        uptimeSeconds,
        uptimePercent,
        firebaseConfigs: 0
      }
    },
    message: 'Configure database to return real statistics'
  });
};
