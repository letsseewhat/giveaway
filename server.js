'use strict';
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const databaseDir = path.resolve(process.env.DATABASE_DIR || './data');
fs.mkdirSync(databaseDir, { recursive: true, mode: 0o700 });

const sessionSecret = process.env.SESSION_SECRET;
const adminUsername = process.env.ADMIN_USERNAME;
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
if (!sessionSecret || sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
if (!adminUsername || !adminPasswordHash || !adminPasswordHash.startsWith('$2')) throw new Error('Set ADMIN_USERNAME and a bcrypt ADMIN_PASSWORD_HASH.');

const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS || '')
  .split(',').map((origin) => origin.trim()).filter(Boolean));
if (!allowedOrigins.size) throw new Error('Set FRONTEND_ORIGINS to exact trusted frontend origins.');

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'https://images.unsplash.com', 'data:'],
      connectSrc: ["'self'", ...allowedOrigins],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  }
}));

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
  }
  if (req.method === 'OPTIONS') return origin && allowedOrigins.has(origin) ? res.sendStatus(204) : res.sendStatus(403);
  next();
});
app.use(express.json({ limit: '12kb', type: 'application/json' }));
app.use(session({
  name: '__Host-drive.sid',
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: databaseDir, table: 'sessions' }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function requireTrustedOrigin(req, res, next) {
  const origin = req.get('Origin');
  if (!origin || !allowedOrigins.has(origin) || req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Request origin was not accepted.' });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session || req.session.admin !== true) return res.status(401).json({ error: 'Authentication required.' });
  next();
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const entryLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
const entrySchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional().default(''),
  prize: z.enum(['suv', 'truck', 'coupe']),
  terms: z.literal(true)
}).strict();
const statusSchema = z.object({ status: z.enum(['確認中', '当選', '対象外']) }).strict();
const prizeLabels = { suv: 'プレミアム SUV', truck: '大型トラック', coupe: 'ラグジュアリークーペ' };
const entriesFile = path.join(databaseDir, 'entries.json');

function readEntries() {
  try {
    const parsed = JSON.parse(fs.readFileSync(entriesFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
function writeEntries(entries) {
  const tempFile = `${entriesFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(entries), { mode: 0o600 });
  fs.renameSync(tempFile, entriesFile);
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/entries', entryLimiter, requireTrustedOrigin, (req, res, next) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '入力内容をご確認ください。' });
  try {
    const entries = readEntries();
    const entry = {
      id: `DRV-${require('node:crypto').randomUUID()}`,
      ...parsed.data,
      status: '確認中',
      submittedAt: new Date().toISOString()
    };
    entries.push(entry);
    writeEntries(entries);
    res.status(201).json({ id: entry.id, message: '応募を受け付けました。' });
  } catch (error) { next(error); }
});

app.post('/api/admin/login', loginLimiter, requireTrustedOrigin, async (req, res, next) => {
  try {
    const schema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) }).strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success || parsed.data.username !== adminUsername || !(await bcrypt.compare(parsed.data.password, adminPasswordHash))) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが違います。' });
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.admin = true;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.json({ authenticated: true });
      });
    });
  } catch (error) { next(error); }
});
app.post('/api/admin/logout', requireTrustedOrigin, requireAdmin, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('__Host-drive.sid', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
    res.sendStatus(204);
  });
});
app.get('/api/admin/entries', requireAdmin, (req, res, next) => {
  try {
    const entries = readEntries().map((entry) => ({
      id: entry.id, name: entry.name, email: entry.email, phone: entry.phone,
      prize: entry.prize, prizeLabel: prizeLabels[entry.prize] || '未設定',
      status: entry.status, submittedAt: entry.submittedAt
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ entries });
  } catch (error) { next(error); }
});
app.patch('/api/admin/entries/:id', requireTrustedOrigin, requireAdmin, (req, res, next) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status.' });
  try {
    const entries = readEntries();
    const entry = entries.find((item) => item.id === req.params.id);
    if (!entry) return res.status(404).json({ error: '応募が見つかりません。' });
    entry.status = parsed.data.status;
    writeEntries(entries);
    res.json({ entry: { id: entry.id, status: entry.status } });
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error('Request error:', error.message);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'サーバーエラーが発生しました。' });
});
app.listen(port, () => console.log(`Campaign API listening on port ${port}`));
