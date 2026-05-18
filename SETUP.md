# INVINCIBLE PANEL — Vercel API Setup Guide

## Overview

This folder contains the complete serverless API backend for INVINCIBLE PANEL.
Deploy it to Vercel and point your frontend at the deployed URL.

## File Structure

```
vercel-api/
├── vercel.json                    ← Vercel config + env var declarations
├── package.json                   ← Dependencies (jsonwebtoken)
├── database-schema.sql            ← PostgreSQL schema — run this first
├── SETUP.md                       ← This file
│
├── middleware/
│   ├── auth.js                    ← JWT verification, CORS, role checks
│   └── rateLimit.js               ← In-memory rate limiter
│
└── api/
    ├── auth/
    │   ├── login.js               ← POST — username+password → sends Telegram OTP
    │   ├── verify-otp.js          ← POST — OTP code → returns access token
    │   ├── me.js                  ← GET  — current user profile
    │   └── logout.js              ← POST — invalidate session
    │
    ├── users/
    │   ├── index.js               ← GET list / POST create user
    │   └── [id].js                ← GET / PATCH / DELETE user by ID
    │
    ├── admins/
    │   └── index.js               ← GET list / POST create admin (owner only)
    │
    ├── firebase/
    │   ├── configs.js             ← GET list / POST add Firebase config
    │   └── [id].js                ← GET / PATCH / DELETE / POST test config
    │
    ├── telegram/
    │   ├── settings.js            ← GET / PATCH Telegram bot settings
    │   └── test.js                ← POST test bot connection
    │
    ├── analytics/
    │   └── index.js               ← GET analytics data (7d/30d/90d)
    │
    ├── logs/
    │   └── index.js               ← GET / POST security logs
    │
    └── system/
        ├── status.js              ← GET system health (public)
        ├── stats.js               ← GET dashboard stats
        ├── settings.js            ← GET / PATCH owner settings
        ├── api-keys.js            ← GET list / POST generate API key
        ├── api-keys/[id].js       ← DELETE / PATCH API key
        └── revoke-sessions.js     ← POST revoke all sessions
```

## Step 1 — Set up a Database

Use one of these Vercel-native databases:

- **Vercel Postgres** (recommended): `vercel postgres create`
- **Neon** (free tier): https://neon.tech
- **PlanetScale**: https://planetscale.com

Run `database-schema.sql` against your database:
```bash
psql "$DATABASE_URL" -f database-schema.sql
```

Then uncomment the `@vercel/postgres` SQL queries in each API file and remove
the placeholder `return res.status(200).json({ message: 'Configure database...' })` lines.

## Step 2 — Generate Secrets

```bash
# JWT Secret (32+ random chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (exactly 32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Step 3 — Set Environment Variables in Vercel

```bash
vercel env add JWT_SECRET
vercel env add TELEGRAM_BOT_TOKEN
vercel env add ADMIN_DB_URL
vercel env add ENCRYPTION_KEY
vercel env add BASE_URL        # Your deployed Vercel URL, e.g. https://invincible-panel-api.vercel.app
```

Or set them in the Vercel Dashboard → Project Settings → Environment Variables.

## Step 4 — Create a Telegram Bot

1. Message `@BotFather` on Telegram
2. Send `/newbot`, follow the prompts
3. Copy the token → set as `TELEGRAM_BOT_TOKEN`
4. Have each user start a chat with the bot and share their Telegram User ID
   (users can get their ID from `@userinfobot`)

## Step 5 — Deploy

```bash
cd vercel-api
npm install
vercel --prod
```

Your API will be live at: `https://your-project.vercel.app/api/...`

## Step 6 — Initialize the First Owner Account

After deploying, run this SQL to create your first owner:

```sql
INSERT INTO users (username, password_hash, password_salt, role, telegram_id, is_active)
VALUES (
  'owner',
  -- Generate hash: node -e "const c=require('crypto'); const s=c.randomBytes(16).toString('hex'); console.log(s, c.createHmac('sha256',s).update('YOUR_PASSWORD').digest('hex'))"
  'YOUR_PASSWORD_HASH',
  'YOUR_PASSWORD_SALT',
  'owner',
  'YOUR_TELEGRAM_USER_ID',
  true
);
```

## Step 7 — Configure BASE_URL in Your Frontend

Set the `BASE_URL` environment variable in your frontend to point to your Vercel API:
```
BASE_URL=https://your-project.vercel.app
```

## API Authentication Flow

```
1. POST /api/auth/login
   Body: { username, password }
   → Returns: { sessionToken, expiresIn }

2. POST /api/auth/verify-otp
   Body: { sessionToken, otp }  ← OTP received on Telegram
   → Returns: { accessToken, user }

3. All subsequent requests:
   Header: Authorization: Bearer <accessToken>
```

## Role Permissions Matrix

| Action              | Owner | Admin | User |
|---------------------|-------|-------|------|
| Create Owner        |  ✓    |  ✗    |  ✗   |
| Create Admin        |  ✓    |  ✗    |  ✗   |
| Create User         |  ✓    |  ✓    |  ✗   |
| Manage Firebase     |  ✓    |  ✓    |  ✗   |
| View Analytics      |  ✓    |  ✓    |  ✗   |
| View Logs           |  ✓    |  ✓    |  ✗   |
| Manage API Keys     |  ✓    |  ✗    |  ✗   |
| System Settings     |  ✓    |  ✗    |  ✗   |
| Telegram Settings   |  ✓    |  ✗    |  ✗   |
| Revoke Sessions     |  ✓    |  ✗    |  ✗   |

## Security Notes

- JWT tokens are signed with HS256 using `JWT_SECRET`
- Passwords are hashed with HMAC-SHA256 + random salt (upgrade to bcrypt for production)
- Firebase API keys are encrypted with AES-256-GCM using `ENCRYPTION_KEY`
- OTPs are hashed before storage in the session token
- All OTP comparisons use `crypto.timingSafeEqual` to prevent timing attacks
- Rate limiting is applied to all endpoints (strict limits on OTP endpoints)
- CORS headers are set on every response
- Expired accounts are blocked at login
- Set up Vercel Cron to run `auto_disable_expired_accounts()` daily

## Auto-disable Cron Job

Add to `vercel.json` to auto-disable expired accounts daily:

```json
{
  "crons": [{
    "path": "/api/system/cron-disable-expired",
    "schedule": "0 0 * * *"
  }]
}
```
