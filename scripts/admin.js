process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-cli-does-not-issue-tokens-0000';
// Usage: npm run admin -- <command> [args]
const svc = require('../src/service');
const { db } = require('../src/db');

const [cmd, a, b] = process.argv.slice(2);
const user = (phone) => {
  const u = svc.findByLogin(phone || '');
  if (!u) { console.error('No user with that phone/email'); process.exit(1); }
  return u;
};
const show = (rows) => (rows.length ? console.table(rows) : console.log('(none)'));

switch (cmd) {
  case 'drivers':
    show(db.prepare("SELECT id, name, phone, licenseNo, plate, status, balance/100.0 AS balance FROM users WHERE role='driver' ORDER BY id").all());
    break;
  case 'approve': { const u = user(a); svc.setStatus(u.id, 'active'); console.log(`Approved ${u.name}`); break; }
  case 'block':   { const u = user(a); svc.setStatus(u.id, 'blocked'); console.log(`Blocked ${u.name}`); break; }
  case 'unblock': { const u = user(a); svc.setStatus(u.id, 'active'); console.log(`Unblocked ${u.name}`); break; }
  case 'topup': {  // cash top-up at an agent counter
    const u = user(a);
    console.log(`New balance for ${u.name}: ${svc.topUp(u.id, b, 'Agent top-up').balance} ETB`);
    break;
  }
  case 'withdrawals': show(svc.listWithdrawals(a || 'pending')); break;
  case 'pay':    svc.resolveWithdrawal(Number(a), 'paid');     console.log('Marked as paid'); break;
  case 'reject': svc.resolveWithdrawal(Number(a), 'rejected'); console.log('Rejected and refunded'); break;
  default:
    console.log(`Commands:
  drivers                     list drivers and their status
  approve <phone>             approve a pending driver
  block|unblock <phone>       suspend / restore any account
  topup <phone> <etb>         add money to a wallet (agent/cash top-up)
  withdrawals [status]        list driver cash-out requests (default: pending)
  pay <id>                    mark a withdrawal as paid (after you sent the money)
  reject <id>                 reject a withdrawal and refund the driver`);
}
