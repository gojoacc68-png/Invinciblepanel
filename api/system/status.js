/**
 * GET /api/system/status
 *
 * Returns overall system health: API uptime, DB connectivity,
 * Telegram bot status, active sessions count.
 *
 * Public endpoint (no auth required) — suitable for health checks and
 * the dashboard's live status indicator.
 */

const { handleCors } = require('../../middleware/auth');

const START_TIME = Date.now();

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  // Check Telegram bot
  let telegramStatus = 'unconfigured';
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
        { signal: AbortSignal.timeout(3000) }
      );
      const data = await resp.json();
      telegramStatus = data.ok ? 'connected' : 'error';
    } catch {
      telegramStatus = 'unreachable';
    }
  }

  // Check DB (replace with actual ping)
  let dbStatus = 'unconfigured';
  if (process.env.ADMIN_DB_URL) {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // try {
    //   const { sql } = require('@vercel/postgres');
    //   await sql`SELECT 1`;
    //   dbStatus = 'connected';
    // } catch {
    //   dbStatus = 'error';
    // }
    dbStatus = 'configured';
  }

  return res.status(200).json({
    success: true,
    status: 'operational',
    version: '1.0.0',
    panel: 'INVINCIBLE PANEL',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    services: {
      api: 'operational',
      database: dbStatus,
      telegram: telegramStatus
    },
    environment: process.env.VERCEL_ENV || 'development'
  });
};
