const express = require('express');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const cfg = require('./config');
const svc = require('./service');
const auth = require('./auth');
const realtime = require('./realtime');
const rateLimit = require('./ratelimit');
const { AppError } = require('./errors');

const r = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (code, msg) => new AppError(400, code, msg);
const str = (v, min, max) => {
  if (typeof v !== 'string') return min === 0 ? '' : null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
};
const VEHICLES = ['bajaj', 'e_bajaj', 'taxi'];
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps login timing similar for unknown users

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const chargeLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, key: (req) => 'u' + req.user.id });

// ---------- public ----------
r.get('/health', (req, res) => res.json({ status: 'ok' }));
r.get('/config', (req, res) =>
  res.json({ success: true, config: { demo: cfg.DEMO_MODE, maxFare: cfg.MAX_FARE_ETB, minWithdraw: cfg.MIN_WITHDRAW_ETB } }));

// ---------- auth ----------
r.post('/auth/register', authLimiter, wrap(async (req, res) => {
  const b = req.body || {};
  const role = b.role === 'driver' ? 'driver' : 'passenger';
  const name = str(b.name, 2, 60);
  if (!name) throw bad('INVALID_NAME', 'Name must be 2-60 characters');
  const phone = svc.normalizePhone(b.phone);
  if (!phone) throw bad('INVALID_PHONE', 'Enter a valid Ethiopian phone number (09… or 07…)');
  let email = null;
  if (b.email) {
    email = String(b.email).trim().toLowerCase();
    if (email.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('INVALID_EMAIL', 'Invalid email address');
  }
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 6 || Buffer.byteLength(password) > 72) throw bad('WEAK_PASSWORD', 'Password must be 6-72 characters');

  const extra = {};
  if (role === 'driver') {
    extra.licenseNo = str(b.licenseNo, 3, 30);
    if (!extra.licenseNo) throw bad('INVALID_LICENSE', 'Driver license number is required');
    extra.plate = str(b.plate, 0, 20) || null;
    extra.vehicleType = VEHICLES.includes(b.vehicleType) ? b.vehicleType : 'bajaj';
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = svc.createUser({ role, name, phone, email, passwordHash, ...extra });
  } catch (e) {
    if (/UNIQUE/.test(e.message || '')) throw new AppError(409, 'DUPLICATE_ACCOUNT', 'Phone or email already registered');
    throw e;
  }
  res.status(201).json({ success: true, token: auth.signSession(user), user: svc.publicUser(user) });
}));

r.post('/auth/login', authLimiter, wrap(async (req, res) => {
  const login = String((req.body || {}).login || '').trim();
  const password = typeof (req.body || {}).password === 'string' ? req.body.password : '';
  const user = login ? svc.findByLogin(login) : undefined;
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'INVALID_LOGIN', 'Wrong phone/email or password');
  if (user.status === 'blocked') throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account is blocked');
  res.json({ success: true, token: auth.signSession(user), user: svc.publicUser(user) });
}));

r.get('/auth/me', auth.required, (req, res) => res.json({ success: true, user: svc.publicUser(req.user) }));

// ---------- wallet ----------
r.get('/wallet/transactions', auth.required, (req, res) =>
  res.json({ success: true, transactions: svc.listTransactions(req.user.id, req.query.limit, req.query.before) }));

r.post('/wallet/topup', auth.required, auth.role('passenger'), wrap(async (req, res) => {
  // Real Telebirr needs merchant credentials + a payment-confirmation callback. Until that exists,
  // top-up only works in DEMO_MODE so nobody can mint money in production.
  if (!cfg.DEMO_MODE) throw new AppError(501, 'TOPUP_UNAVAILABLE', 'Top-up is not available yet');
  const out = svc.topUp(req.user.id, (req.body || {}).amount);
  realtime.notify(req.user.id, { balance: out.balance, delta: out.amount, title: 'Telebirr top-up', kind: 'topup' });
  res.json({ success: true, newBalance: out.balance });
}));

// ---------- passenger: QR + NFC card ----------
r.get('/passenger/qr', auth.required, auth.role('passenger'), auth.activeOnly, wrap(async (req, res) => {
  const { code, expiresInSec } = svc.issueQrToken(req.user.id);
  const svg = await QRCode.toString(code, { type: 'svg', margin: 1, width: 260, errorCorrectionLevel: 'M' });
  res.json({ success: true, token: code, svg, expiresInSec });
}));

r.put('/passenger/card', auth.required, auth.role('passenger'), (req, res) => {
  svc.linkCard(req.user.id, (req.body || {}).serial);
  res.json({ success: true });
});

r.delete('/passenger/card', auth.required, auth.role('passenger'), (req, res) => {
  svc.unlinkCard(req.user.id);
  res.json({ success: true });
});

// ---------- driver ----------
r.post('/driver/charge', auth.required, auth.role('driver'), auth.activeOnly, chargeLimiter, wrap(async (req, res) => {
  const b = req.body || {};
  const ref = typeof b.ref === 'string' && b.ref.length <= 64 ? b.ref : null;
  const out = svc.chargeFare({ driver: req.user, identifier: b.identifier, amount: b.amount, route: b.route, ref });
  if (!out.duplicate) {
    realtime.notify(out.payerId, { balance: out.payerBalance, delta: -out.amount, title: out.title, kind: 'fare' });
    realtime.notify(req.user.id, { balance: out.driverBalance, delta: out.amount, title: out.title, kind: 'fare_received' });
  }
  res.json({ success: true, amount: out.amount, payerName: out.payerName, balance: out.driverBalance, duplicate: out.duplicate });
}));

r.get('/driver/shift', auth.required, auth.role('driver'), (req, res) =>
  res.json({ success: true, ...svc.driverShift(req.user.id), balance: svc.getUser(req.user.id).balance / 100 }));

r.post('/driver/withdraw', auth.required, auth.role('driver'), auth.activeOnly, (req, res) => {
  const balance = svc.requestWithdrawal(req.user, (req.body || {}).amount);
  realtime.notify(req.user.id, { balance, delta: 0, title: 'Withdrawal request', kind: 'withdrawal' });
  res.json({ success: true, newBalance: balance });
});

module.exports = r;
