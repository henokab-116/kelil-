// SQLite via Node's built-in driver (no native modules to compile). Money is stored as integer santim.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

const MEMORY = cfg.DB_PATH === ':memory:';
if (!MEMORY) fs.mkdirSync(path.dirname(cfg.DB_PATH), { recursive: true });

function open() {
  const d = new DatabaseSync(cfg.DB_PATH);
  d.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return d;
}

let db = open();

// The v1 prototype created a `users` table with float balances and no user_version.
// Keep that file aside instead of corrupting or silently reusing it.
if (!MEMORY
  && db.prepare('PRAGMA user_version').get().user_version === 0
  && db.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='users'").get()) {
  db.close();
  const legacy = cfg.DB_PATH.replace(/\.db$/, '') + `.legacy-${Date.now()}.db`;
  fs.renameSync(cfg.DB_PATH, legacy);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(cfg.DB_PATH + ext)) fs.renameSync(cfg.DB_PATH + ext, legacy + ext);
  }
  console.warn(`[warn] Old prototype database moved to ${legacy}; starting with a fresh schema.`);
  db = open();
}

const MIGRATIONS = [`
  CREATE TABLE users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    role         TEXT NOT NULL CHECK (role IN ('passenger','driver')),
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','blocked')),
    name         TEXT NOT NULL,
    phone        TEXT NOT NULL UNIQUE,
    email        TEXT UNIQUE,
    passwordHash TEXT NOT NULL,
    cardUid      TEXT NOT NULL UNIQUE,
    nfcSerial    TEXT UNIQUE,
    balance      INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    licenseNo    TEXT,
    plate        TEXT,
    vehicleType  TEXT,
    createdAt    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE transactions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    userId         INTEGER NOT NULL REFERENCES users(id),
    kind           TEXT NOT NULL CHECK (kind IN ('topup','fare','fare_received','withdrawal','refund')),
    type           TEXT NOT NULL CHECK (type IN ('debit','credit')),
    amount         INTEGER NOT NULL CHECK (amount > 0),
    balanceAfter   INTEGER NOT NULL,
    title          TEXT NOT NULL,
    counterpartyId INTEGER REFERENCES users(id),
    ref            TEXT,
    createdAt      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX idx_tx_user ON transactions(userId, id DESC);
  CREATE UNIQUE INDEX idx_tx_ref ON transactions(userId, ref) WHERE ref IS NOT NULL;
  CREATE TABLE withdrawals (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL REFERENCES users(id),
    amount    INTEGER NOT NULL CHECK (amount > 0),
    phone     TEXT NOT NULL,
    status    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`];

for (let v = db.prepare('PRAGMA user_version').get().user_version; v < MIGRATIONS.length; v++) {
  db.exec('BEGIN');
  try {
    db.exec(MIGRATIONS[v]);
    db.exec(`PRAGMA user_version = ${v + 1}`);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// node:sqlite is synchronous, so a BEGIN IMMEDIATE ... COMMIT block can never interleave with
// another request: balance checks and updates inside tx() are atomic.
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { db, tx };
