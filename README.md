# Transit Tap & Pay

Passengers hold a wallet and pay fares by **QR code** (works with any phone) or a **linked NFC tag**.
Drivers run a terminal page that scans the passenger, collects the fare into their own wallet and sees shift earnings.
Balances update live on both phones.

- Passenger app: `http://localhost:3000/`
- Driver terminal: `http://localhost:3000/driver`

## Run

Requires **Node 22.13+** (uses the built-in SQLite, so nothing native to compile).

```bash
npm install
cp .env.example .env      # set JWT_SECRET; keep DEMO_MODE=true while testing
npm start                 # or: npm run dev
npm test                  # wallet/ledger tests
```

### Try it with one phone (no NFC cards needed)
1. Open `/` on a laptop, register a passenger (you get a demo 100 ETB), tap **Show my QR**.
2. Open `/driver` on your Android phone, register a driver, tap **Scan QR Code**, point at the laptop screen.
3. Fare moves from passenger to driver; both screens update instantly.
   With one device only, use **Enter code manually (demo)** and paste the code shown under the QR.

### Testing NFC on the phone
Web NFC works only in **Chrome on Android over HTTPS** (`localhost` counts). To reach your laptop server from the phone use a tunnel
(`cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`), or plug the phone in and use Chrome's port forwarding to `localhost:3000`.
Passenger: **Profile → Link NFC card**, tap any NDEF-formatted NFC sticker/card. Driver: **Tap NFC Card**, then tap the card.

## What changed from the prototype

**Fixed / removed**
- `server.js` started with a typo (`npmrequire`) and required a `models/db` that wasn't in the upload; the server could not boot.
- `driver.html` was a separate localStorage demo (plain-text passwords, never touched the server). It is now a real driver account/terminal on the same backend.
- Any logged-in user could charge **any** card (`/pay-by-card`). Now only approved drivers can charge, and passengers are identified by a short-lived single-use QR or a linked NFC tag serial, not a guessable `ETH-123456` number.
- Balance was checked and updated in separate steps with float math; concurrent taps could overdraw or double-charge. Money is now integer santim, updated atomically, with an idempotency key so a network retry never charges twice.
- Anyone could subscribe to any card's socket room; sockets now authenticate with the session token and only join the user's own room. Wildcard CORS removed.
- Free money: `/topup` credited any amount with no payment. It now works only in `DEMO_MODE`.
- Hard-coded fallback JWT secret removed (random temporary secret in dev, refuses to start in production without one).
- `innerHTML` with user text (driver page) replaced by `textContent`; strict CSP; login/register rate limiting; passwords no longer trimmed.
- Removed: the "Bajaj Dash" game and its score API, `/api/wallet/pay` (self-pay had no receiver), CDN scripts (Bootstrap/socket.io/QR libs are served locally so it works on weak networks), `dotenv`, `nodemon`, `sqlite3` (native build), `cors`.

**Added**
- Roles (passenger / driver), phone-number login (Ethiopian formats, `+251` accepted), optional email.
- Driver wallet, cash-out requests, real shift totals (Addis Ababa day), approval flow for drivers.
- Passenger QR (auto-refreshing), NFC tag linking/unlinking, transaction history for everyone.
- Admin CLI: `npm run admin` (approve/block drivers, agent top-ups, process withdrawals).
- Installable PWA (icons, manifests, offline app shell), single merged 6-language dictionary.

## Going live

1. `NODE_ENV=production`, real `JWT_SECRET`, `DEMO_MODE=false`, HTTPS in front (Web NFC and camera require it), `TRUST_PROXY=true` behind a proxy.
2. Drivers register as *pending*; approve with `npm run admin -- approve 0911223344`.
3. Top-ups: integrate Telebirr's merchant API (payment request + server-to-server confirmation) in `POST /api/wallet/topup`, crediting only after Telebirr confirms. Until then use `npm run admin -- topup <phone> <etb>` at agent counters.
4. Withdrawals: `npm run admin -- withdrawals`, send the money, then `pay <id>` (or `reject <id>` to refund).
5. Back up `data/transit.db`. If an old prototype `transit.db` is found it is renamed to `transit.legacy-*.db` and a fresh schema is created.

## Known limits (be aware)
- **NFC tag serial numbers are not secret** and can be cloned. Real fare cards use secured chips (MIFARE DESFire etc.) with a reader; a phone-only setup can't provide that. Mitigations here: approved drivers only, per-fare cap (`MAX_FARE_ETB`), instant live notifications, passengers can unlink a card. Prefer QR for higher-value use.
- Payments need a connection; there is no offline queue.
- One server process (rate limits and QR tokens are in memory).
- Translations: the new v2 strings exist in English and Amharic only; other languages fall back to English until a native speaker adds them.
  Please also have speakers review the existing Sidaamu/Oromo/Tigrinya/Somali text.
- I could only run the wallet/ledger tests and a stubbed route test here (no npm access); the browser UI has not been exercised, so do a pass on a real phone.

## Project layout
- `server.js`, `src/` – backend (Node 22, Express, built-in SQLite). `npm install && npm start`, `npm test`.
- `public/` – web/PWA passenger app (`/`) and driver terminal (`/driver`).
- `mobile/` – Expo / React Native Android app. Set `BASE_URL` in `mobile/src/config.js` to your server (https), then:
  `cd mobile && npm install && npx expo install --fix && npx eas build -p android --profile preview` (produces an installable APK).
- `android/` + `capacitor.config.json` – optional Capacitor wrapper of `public/` (`npx cap sync android`). Not needed if you use `mobile/`.
