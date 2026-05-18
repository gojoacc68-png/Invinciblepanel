/**
 * GET /api/analytics
 *
 * Returns aggregated analytics data for the dashboard:
 *   - User activity (7/30 day chart data)
 *   - API requests timeline
 *   - Role distribution
 *   - Error rate breakdown
 *   - Top active users
 *
 * Query params:
 *   - range: 7d | 30d | 90d (default: 7d)
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

function generateDateRange(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

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

  const range = req.query?.range || '7d';
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const dates = generateDateRange(days);

  // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────────
  // const { sql } = require('@vercel/postgres');
  //
  // const [userActivity, apiMetrics, roleBreakdown, topUsers, errorBreakdown] = await Promise.all([
  //   sql`SELECT DATE(created_at) as date, COUNT(*) as logins
  //       FROM logs WHERE type = 'login' AND created_at > NOW() - INTERVAL '${days} days'
  //       GROUP BY DATE(created_at) ORDER BY date`,
  //
  //   sql`SELECT DATE(created_at) as date, COUNT(*) as requests,
  //             COUNT(*) FILTER (WHERE status >= 400) as errors
  //       FROM api_logs WHERE created_at > NOW() - INTERVAL '${days} days'
  //       GROUP BY DATE(created_at) ORDER BY date`,
  //
  //   sql`SELECT role, COUNT(*) as count FROM users GROUP BY role`,
  //
  //   sql`SELECT u.username, u.role, COUNT(l.id) as activity
  //       FROM users u LEFT JOIN logs l ON l.user_id = u.id
  //       AND l.created_at > NOW() - INTERVAL '${days} days'
  //       GROUP BY u.id ORDER BY activity DESC LIMIT 10`,
  //
  //   sql`SELECT type, level, COUNT(*) as count FROM logs
  //       WHERE created_at > NOW() - INTERVAL '${days} days'
  //       GROUP BY type, level ORDER BY count DESC`
  // ]);
  // ──────────────────────────────────────────────────────────────────────────

  return res.status(200).json({
    success: true,
    range,
    dates,
    data: {
      userActivity: dates.map(date => ({ date, logins: 0 })),
      apiRequests: dates.map(date => ({ date, requests: 0, errors: 0 })),
      roleBreakdown: { owner: 0, admin: 0, user: 0 },
      topUsers: [],
      errorBreakdown: []
    },
    message: 'Configure database to return real analytics'
  });
};
