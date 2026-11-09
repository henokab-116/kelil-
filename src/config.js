// Backend settings, read from environment variables (and from .env if present).
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const env = process.env;
const num = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) ? n : d; };
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(String(v)));

const PRODUCTION = env.NODE_ENV === 'production';
let JWT_SECRET = env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'replace_me_with_a_long_random_string') {
  if (PRODUCTION) { console.error('JWT_SECRET must be set in production'); process.exit(1); }
  JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
  console.warn('[warn] JWT_SECRET not set: using a temporary random one (logins reset on restart).');
}

module.exports = {
  PORT: num(env.PORT, 3000),
  JWT_SECRET,
  DEMO_MODE: bool(env.DEMO_MODE, !PRODUCTION),
  TRUST_PROXY: bool(env.TRUST_PROXY, false),
  DB_PATH: env.DB_PATH === ':memory:' ? ':memory:' : path.resolve(__dirname, '..', env.DB_PATH || './data/transit.db'),
  MAX_FARE_ETB: num(env.MAX_FARE_ETB, 100),
  MAX_TOPUP_ETB: num(env.MAX_TOPUP_ETB, 5000),
  MIN_WITHDRAW_ETB: num(env.MIN_WITHDRAW_ETB, 10),
  WELCOME_BONUS_ETB: num(env.WELCOME_BONUS_ETB, 100),
  QR_TTL_MS: num(env.QR_TTL_MS, 60000)
};
