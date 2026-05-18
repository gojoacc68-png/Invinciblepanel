/**
 * GET /api/system/cron-disable-expired
 *
 * Vercel Cron Job handler — auto-disables expired user accounts.
 * Called automatically by Vercel Cron (see vercel.json crons config).
 * Protected by CRON_SECRET header.
 *
 * Add to vercel.json:
 *   "crons": [{ "path": "/api/system/cron-disable-expired", "schedule": "0 0 * * *" }]
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`SELECT auto_disable_expired_accounts()`;
    // const count = result.rows[0]?.auto_disable_expired_accounts || 0;
    // return res.status(200).json({ success: true, disabledCount: count, ran_at: new Date().toISOString() });
    // ─────────────────────────────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      disabledCount: 0,
      ran_at: new Date().toISOString(),
      message: 'Configure database to enable auto-disable'
    });
  } catch (err) {
    console.error('[cron-disable-expired]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
