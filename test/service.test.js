process.env.DB_PATH = ':memory:';
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'x'.repeat(40);

const test = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../src/service');
const { db } = require('../src/db');

const mk = (role, phone, name = 'Abebe Kebede') =>
  svc.createUser({ role, name, phone, passwordHash: 'x', licenseNo: role === 'driver' ? 'L-1' : null });

test('phone / amount validation', () => {
  assert.equal(svc.normalizePhone('+251 911 22 33 44'), '0911223344');
  assert.equal(svc.normalizePhone('251711223344'), '0711223344');
  assert.equal(svc.normalizePhone('12345'), null);
  assert.equal(svc.toCents('0.1') + svc.toCents(0.2), 30);
  for (const bad of [0, -5, NaN, 'abc', '', 1.005, 1e9]) assert.throws(() => svc.toCents(bad, { max: 100 }), /amount/i);
});

test('demo signup gives welcome bonus and unique card ids', () => {
  const p = mk('passenger', '0911000001');
  const q = mk('passenger', '0911000002');
  assert.equal(svc.publicUser(p).balance, 100);
  assert.notEqual(p.cardUid, q.cardUid);
  assert.equal(p.status, 'active');
  assert.throws(() => mk('passenger', '0911000001'), /UNIQUE/);
});

test('QR fare: moves money both ways, is single-use, and is idempotent by ref', () => {
  const p = mk('passenger', '0911000010', 'Sara Tesfaye');
  const d = mk('driver', '0911000011', 'Driver One');
  const { code } = svc.issueQrToken(p.id);

  const r = svc.chargeFare({ driver: d, identifier: code, amount: 15.5, route: 'Megenagna - Piassa', ref: 'r1' });
  assert.equal(r.payerBalance, 84.5);
  assert.equal(r.driverBalance, 15.5);
  assert.equal(r.payerName, 'Sara');

  // token already used
  assert.throws(() => svc.chargeFare({ driver: d, identifier: code, amount: 5, ref: 'r2' }), (e) => e.code === 'QR_EXPIRED');
  // retry of the first request must not double charge
  const again = svc.chargeFare({ driver: d, identifier: code, amount: 15.5, ref: 'r1' });
  assert.equal(again.duplicate, true);
  assert.equal(svc.getUser(p.id).balance, 8450);
  assert.equal(svc.getUser(d.id).balance, 1550);

  const shift = svc.driverShift(d.id);
  assert.equal(shift.total, 15.5);
  assert.equal(shift.count, 1);
});

test('NFC serial fare, insufficient balance leaves everything untouched', () => {
  const p = mk('passenger', '0911000020');
  const other = mk('passenger', '0911000021');
  const d = mk('driver', '0911000022');
  svc.linkCard(p.id, '04:A2:2B:1C:7F:00:01');
  assert.throws(() => svc.linkCard(other.id, '04a22b1c7f000 1'), (e) => e.code === 'CARD_IN_USE');

  svc.chargeFare({ driver: d, identifier: '04:a2:2b:1c:7f:00:01', amount: 60, ref: 'a' });
  assert.throws(() => svc.chargeFare({ driver: d, identifier: '04a22b1c7f0001', amount: 60, ref: 'b' }),
    (e) => e.code === 'INSUFFICIENT_BALANCE');
  assert.equal(svc.getUser(p.id).balance, 4000);
  assert.equal(svc.getUser(d.id).balance, 6000);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE userId = ?').get(d.id).n, 1);

  assert.throws(() => svc.chargeFare({ driver: d, identifier: 'deadbeef', amount: 5 }), (e) => e.code === 'UNKNOWN_CARD');
  assert.throws(() => svc.chargeFare({ driver: d, identifier: '04a22b1c7f0001', amount: 5000 }), (e) => e.code === 'INVALID_AMOUNT');
});

test('blocked passengers and self-pay are rejected', () => {
  const p = mk('passenger', '0911000030');
  const d = mk('driver', '0911000031');
  svc.linkCard(p.id, 'aabbccdd');
  svc.setStatus(p.id, 'blocked');
  assert.throws(() => svc.chargeFare({ driver: d, identifier: 'aabbccdd', amount: 5 }), (e) => e.code === 'ACCOUNT_BLOCKED');
  svc.linkCard(d.id, '11223344');
  assert.throws(() => svc.chargeFare({ driver: d, identifier: '11223344', amount: 5 }), (e) => e.code === 'SELF_PAY');
});

test('top-up limits and withdrawals (pay / reject+refund)', () => {
  const p = mk('passenger', '0911000040');
  assert.equal(svc.topUp(p.id, 50).balance, 150);
  assert.throws(() => svc.topUp(p.id, 999999), (e) => e.code === 'INVALID_AMOUNT');

  const d = mk('driver', '0911000041');
  svc.linkCard(p.id, 'cafebabe');
  svc.chargeFare({ driver: d, identifier: 'cafebabe', amount: 40 });
  svc.chargeFare({ driver: d, identifier: 'cafebabe', amount: 40 });
  assert.throws(() => svc.requestWithdrawal(d, 5), (e) => e.code === 'INVALID_AMOUNT');
  assert.throws(() => svc.requestWithdrawal(d, 500), (e) => e.code === 'INSUFFICIENT_BALANCE');
  assert.equal(svc.requestWithdrawal(d, 30), 50);
  const [w] = svc.listWithdrawals().filter((x) => x.phone === '0911000041');
  svc.resolveWithdrawal(w.id, 'rejected');
  assert.equal(svc.getUser(d.id).balance, 8000);
  assert.throws(() => svc.resolveWithdrawal(w.id, 'paid'), (e) => e.code === 'ALREADY_RESOLVED');

  const kinds = svc.listTransactions(d.id).map((t) => t.kind);
  assert.deepEqual(kinds, ['refund', 'withdrawal', 'fare_received', 'fare_received']);
});

test('start of day uses Ethiopian time', () => {
  // 2026-09-24T22:00Z is already 01:00 on the 25th in Addis Ababa
  assert.equal(svc.startOfTodayEAT(Date.parse('2026-09-24T22:00:00Z')), '2026-09-24T21:00:00.000Z');
  assert.equal(svc.startOfTodayEAT(Date.parse('2026-09-24T10:00:00Z')), '2026-09-23T21:00:00.000Z');
});
