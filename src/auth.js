const jwt = require('jsonwebtoken');
const cfg = require('./config');
const svc = require('./service');
const { AppError } = require('./errors');

const signSession = (user) =>
  jwt.sign({ sub: user.id }, cfg.JWT_SECRET, { expiresIn: '7d', audience: 'session', algorithm: 'HS256' });

// Always re-read the user so role/status changes (blocked, approved) apply immediately.
function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, cfg.JWT_SECRET, { audience: 'session', algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Session expired, please log in again');
  }
  const user = svc.getUser(payload.sub);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Account not found');
  if (user.status === 'blocked') throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account is blocked');
  return user;
}

function required(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHORIZED', 'Login required');
    req.user = userFromToken(h.slice(7));
    next();
  } catch (e) { next(e); }
}

const role = (r) => (req, res, next) =>
  req.user.role === r ? next() : next(new AppError(403, 'WRONG_APP', `This action is for ${r}s only`));

function activeOnly(req, res, next) {
  if (req.user.status === 'active') return next();
  next(new AppError(403, 'ACCOUNT_PENDING', 'Your account is waiting for approval'));
}

module.exports = { signSession, userFromToken, required, role, activeOnly };
