const path = require('path');
const http = require('http');
const express = require('express');
const cfg = require('./src/config');
const routes = require('./src/routes');
const realtime = require('./src/realtime');
const { AppError } = require('./src/errors');

const app = express();
const server = http.createServer(app);
realtime.init(server);

app.disable('x-powered-by');
if (cfg.TRUST_PROXY) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(self)',
    'Content-Security-Policy': [
      "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:", "media-src 'self' blob:", "font-src 'self'",
      "connect-src 'self' ws: wss:", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"
    ].join('; ')
  });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Not found' }));

// Front-end libraries are served from node_modules (no CDN: works offline / on flaky networks, and CSP stays strict).
const nm = (...p) => path.join(__dirname, 'node_modules', ...p);
const week = { maxAge: '7d' };
app.use('/vendor/bootstrap', express.static(nm('bootstrap', 'dist'), week));
app.use('/vendor/bootstrap-icons', express.static(nm('bootstrap-icons', 'font'), week));
app.use('/vendor/html5-qrcode', express.static(nm('html5-qrcode'), week));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] })); // "/" -> index.html, "/driver" -> driver.html

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) return res.status(err.status).json({ success: false, code: err.code, error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, code: 'BAD_JSON', error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ success: false, code: 'SERVER', error: 'Server error' });
});

server.listen(cfg.PORT, () => {
  console.log(`Transit Tap & Pay on http://localhost:${cfg.PORT}  (passenger: /   driver: /driver)  demo=${cfg.DEMO_MODE}`);
});
