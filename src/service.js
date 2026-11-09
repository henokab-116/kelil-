// All money logic lives here (no HTTP, no bcrypt/JWT) so it can be tested and reused by the admin CLI.
const crypto = require('crypto');
const cfg = require('./config');
const { db, tx } = require('./db');
const { AppError } = require('./errors');

// ---------- helpers ----------
function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let p = raw.replace(/[\s\-()]/g, '');
  if (p.startsWith('+251')) p = '0' + p.slice(4);
  else if (/^251\d{9}$/.test(p)) p = '0' + p.slice(3);
  return /^0[79]\d{8}$/.test(p) ? p : null;
}

function normalizeSerial(raw) {
  return typeof raw === 'string' ? raw.replace(/[^0-9a-f]/gi, '').toLowerCase() : '';
}

// ETB (decimal) -> integer santim. Rejects NaN, more than 2 decimals, and out-of-range values.
function toCents(value, { min = 0.01, max = Infinity } = {}) {
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new AppError(400, 'INVALID_AMOUNT', 'Invalid amount');
  const cents = Math.round(n * 100);
  if (Math.abs(n * 100 - cents) > 1e-6 || cents < Math.round(min * 100) || cents > Math.round(max * 100)) {
    throw new AppError(400, 'INVALID_AMOUNT', `Amount must be between ${min} and ${max} ETB`);
  }
  return cents;
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, role: u.role, status: u.status, name: u.name, phone: u.phone, email: u.email,
    cardUid: u.cardUid, hasCard: !!u.nfcSerial, balance: u.balance / 100,
    licenseNo: u.licenseNo, plate: u.plate, vehicleType: u.vehicleType
  };
}

const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

function findByLogin(login) {
  if (typeof login !== 'string') return undefined;
  if (login.includes('@')) return db.prepare('SELECT * FROM users WHERE email = ?').get(login.trim().toLowerCase());
  const phone = normalizePhone(login);
  return phone ? db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) : undefined;
}

// ---------- ledger primitive (call only inside tx) ----------
function move(userId, kind, type, cents, title, counterpartyId = null, ref = null) {
  const res = type === 'credit'
    ? db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(cents, userId)
    : db.prepare('UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?').run(cents, userId, cents);
  if (!res.changes) throw new AppError(400, 'INSUFFICIENT_BALANCE', 'Insufficient balance');
  const balanceAfter = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId).balance;
  db.prepare(`INSERT INTO transactions (userId, kind, type, amount, balanceAfter, title, counterpartyId, ref)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, kind, type, cents, balanceAfter, title, counterpartyId, ref);
  return balanceAfter;
}

// ---------- users ----------
function newCardUid() {
  return 'TP-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

function createUser({ role, name, phone, email = null, passwordHash, licenseNo = null, plate = null, vehicleType = null }) {
  const status = role === 'driver' && !cfg.DEMO_MODE ? 'pending' : 'active';
  return tx(() => {
    let cardUid = newCardUid();
    while (db.prepare('SELECT 1 AS x FROM users WHERE cardUid = ?').get(cardUid)) cardUid = newCardUid();
    const r = db.prepare(`INSERT INTO users (role, status, name, phone, email, passwordHash, cardUid, licenseNo, plate, vehicleType)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(role, status, name, phone, email, passwordHash, cardUid, licenseNo, plate, vehicleType);
    const id = Number(r.lastInsertRowid);
    if (role === 'passenger' && cfg.DEMO_MODE && cfg.WELCOME_BONUS_ETB > 0) {
      move(id, 'topup', 'credit', Math.round(cfg.WELCOME_BONUS_ETB * 100), 'Welcome bonus (demo)');
    }
    return getUser(id);
  });
}

function setStatus(userId, status) {
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
}

// ---------- wallet ----------
function topUp(userId, amount, title = 'Telebirr top-up (demo)') {
  const cents = toCents(amount, { max: cfg.MAX_TOPUP_ETB });
  return tx(() => ({ balance: move(userId, 'topup', 'credit', cents, title) / 100, amount: cents / 100 }));
}

function listTransactions(userId, limit = 50, beforeId = null) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const rows = beforeId
    ? db.prepare('SELECT * FROM transactions WHERE userId = ? AND id < ? ORDER BY id DESC LIMIT ?').all(userId, Number(beforeId), lim)
    : db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY id DESC LIMIT ?').all(userId, lim);
  return rows.map((t) => ({
    id: t.id, kind: t.kind, type: t.type, amount: t.amount / 100, balanceAfter: t.balanceAfter / 100,
    title: t.title, createdAt: t.createdAt
  }));
}

// ---------- passenger cards: NFC serial + short-lived QR ----------
function linkCard(userId, serialRaw) {
  const serial = normalizeSerial(serialRaw);
  if (serial.length < 4 || serial.length > 40) throw new AppError(400, 'INVALID_CARD', 'Could not read a card serial number');
  const owner = db.prepare('SELECT id FROM users WHERE nfcSerial = ?').get(serial);
  if (owner && owner.id !== userId) throw new AppError(409, 'CARD_IN_USE', 'This card is already linked to another account');
  db.prepare('UPDATE users SET nfcSerial = ? WHERE id = ?').run(serial, userId);
}

function unlinkCard(userId) {
  db.prepare('UPDATE users SET nfcSerial = NULL WHERE id = ?').run(userId);
}

const qrTokens = new Map(); // token -> { userId, exp }   (single instance; fine for one server process)

function issueQrToken(userId) {
  const now = Date.now();
  for (const [tok, e] of qrTokens) if (e.exp < now || e.userId === userId) qrTokens.delete(tok);
  const token = crypto.randomBytes(16).toString('base64url');
  qrTokens.set(token, { userId, exp: now + cfg.QR_TTL_MS });
  return { code: 'tp1:' + token, expiresInSec: Math.round(cfg.QR_TTL_MS / 1000) };
}

// identifier is either a scanned QR payload ("tp1:...") or an NFC tag serial number.
function resolvePayer(identifier) {
  if (typeof identifier !== 'string' || !identifier.trim() || identifier.length > 200) {
    throw new AppError(400, 'UNKNOWN_CARD', 'Card not recognized');
  }
  const id = identifier.trim();
  if (id.startsWith('tp1:')) {
    const token = id.slice(4);
    const e = qrTokens.get(token);
    if (!e || e.exp < Date.now()) throw new AppError(400, 'QR_EXPIRED', 'QR code expired, ask the passenger to refresh it');
    return { userId: e.userId, token };
  }
  const serial = normalizeSerial(id);
  const u = serial ? db.prepare('SELECT id FROM users WHERE nfcSerial = ?').get(serial) : null;
  if (!u) throw new AppError(404, 'UNKNOWN_CARD', 'Card not recognized');
  return { userId: u.id };
}

// ---------- driver: charge a fare ----------
function chargeFare({ driver, identifier, amount, route, ref }) {
  const cents = toCents(amount, { max: cfg.MAX_FARE_ETB });
  const routeName = (typeof route === 'string' ? route.trim() : '').slice(0, 60) || 'Bus fare';
  let usedToken = null;

  const out = tx(() => {
    if (ref) { // idempotency: a retried request returns the original result instead of charging twice
      const dup = db.prepare('SELECT amount, counterpartyId, balanceAfter FROM transactions WHERE userId = ? AND ref = ?').get(driver.id, ref);
      if (dup) {
        const p = getUser(dup.counterpartyId);
        return { duplicate: true, amount: dup.amount / 100, payerName: p ? p.name.split(' ')[0] : '', driverBalance: dup.balanceAfter / 100 };
      }
    }
    const { userId, token } = resolvePayer(identifier);
    usedToken = token || null;
    if (userId === driver.id) throw new AppError(400, 'SELF_PAY', 'A driver cannot pay their own fare');
    const payer = getUser(userId);
    if (!payer || payer.role !== 'passenger' || payer.status !== 'active') {
      throw new AppError(403, 'ACCOUNT_BLOCKED', 'This passenger account cannot pay right now');
    }
    const first = payer.name.split(' ')[0];
    const payerBalance = move(payer.id, 'fare', 'debit', cents, routeName, driver.id);
    const driverBalance = move(driver.id, 'fare_received', 'credit', cents, `${routeName} · ${first}`, payer.id, ref || null);
    return { duplicate: false, payerId: payer.id, payerName: first, amount: cents / 100, title: routeName, payerBalance: payerBalance / 100, driverBalance: driverBalance / 100 };
  });
  if (usedToken) qrTokens.delete(usedToken);
  return out;
}

// Start of "today" in Ethiopia (UTC+3, no DST), as an ISO string comparable with createdAt.
function startOfTodayEAT(now = Date.now()) {
  const day = 86400000, off = 3 * 3600000;
  return new Date(Math.floor((now + off) / day) * day - off).toISOString();
}

function driverShift(driverId) {
  const since = startOfTodayEAT();
  const agg = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n FROM transactions
                          WHERE userId = ? AND kind = 'fare_received' AND createdAt >= ?`).get(driverId, since);
  const recent = db.prepare(`SELECT id, title, amount, createdAt FROM transactions
                             WHERE userId = ? AND kind = 'fare_received' ORDER BY id DESC LIMIT 10`).all(driverId)
    .map((t) => ({ id: t.id, title: t.title, amount: t.amount / 100, createdAt: t.createdAt }));
  return { total: agg.total / 100, count: agg.n, recent };
}

// ---------- driver: cash-out requests (paid manually / by admin CLI until a payout API is wired) ----------
function requestWithdrawal(driver, amount) {
  const cents = toCents(amount, { min: cfg.MIN_WITHDRAW_ETB });
  return tx(() => {
    const balance = move(driver.id, 'withdrawal', 'debit', cents, 'Withdrawal request');
    db.prepare('INSERT INTO withdrawals (userId, amount, phone) VALUES (?, ?, ?)').run(driver.id, cents, driver.phone);
    return balance / 100;
  });
}

function listWithdrawals(status = 'pending') {
  return db.prepare(`SELECT w.id, w.amount, w.phone, w.status, w.createdAt, u.name FROM withdrawals w
                     JOIN users u ON u.id = w.userId WHERE w.status = ? ORDER BY w.id`).all(status)
    .map((w) => ({ ...w, amount: w.amount / 100 }));
}

function resolveWithdrawal(id, outcome) {
  return tx(() => {
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id);
    if (!w) throw new AppError(404, 'NOT_FOUND', 'Withdrawal not found');
    if (w.status !== 'pending') throw new AppError(400, 'ALREADY_RESOLVED', `Already ${w.status}`);
    db.prepare('UPDATE withdrawals SET status = ? WHERE id = ?').run(outcome, id);
    if (outcome === 'rejected') move(w.userId, 'refund', 'credit', w.amount, `Withdrawal #${id} rejected`);
    return w;
  });
}

module.exports = {
  normalizePhone, normalizeSerial, toCents, publicUser, getUser, findByLogin, createUser, setStatus,
  topUp, listTransactions, linkCard, unlinkCard, issueQrToken, chargeFare, startOfTodayEAT, driverShift,
  requestWithdrawal, listWithdrawals, resolveWithdrawal
};
