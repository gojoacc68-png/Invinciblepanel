/**
 * POST /api/telegram/test
 *
 * Send a test message to verify Telegram bot is working.
 * Body: { telegramId: string }
 * Owner-only.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res, 5)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

  const { telegramId } = req.body || {};
  if (!telegramId) {
    return res.status(400).json({ success: false, error: 'telegramId is required' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(400).json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: '✅ *INVINCIBLE PANEL* — Bot connection test successful!\n\nYour Telegram integration is working correctly.',
        parse_mode: 'Markdown'
      }),
      signal: AbortSignal.timeout(8000)
    });

    const data = await response.json();
    const latency = Date.now() - startTime;

    if (!data.ok) {
      return res.status(400).json({
        success: false,
        error: `Telegram API error: ${data.description}`,
        errorCode: data.error_code
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Test message sent successfully',
      latencyMs: latency,
      messageId: data.result?.message_id
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.name === 'TimeoutError' ? 'Request to Telegram timed out' : err.message
    });
  }
};
