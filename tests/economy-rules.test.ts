import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPayroll, loanInstallment, offlineGrant, restoredRevenueBaseline } from '../economy-rules.ts';

test('forecast rounds each employee exactly like monthly payroll, including automation', () => {
  assert.equal(monthlyPayroll([100, 100, 100]), 51);
  assert.equal(monthlyPayroll([100, 100, 100], 0.5), 24);
  assert.equal(monthlyPayroll([0, 0]), 0);
});
test('loans keep a fixed installment after partial repayment, settle exact final balance', () => {
  assert.equal(loanInstallment({ remaining: 1100, totalDue: 1150, semestersLeft: 23 }), 48);
  assert.equal(loanInstallment({ remaining: 20, totalDue: 1150, semestersLeft: 8 }), 20);
  assert.equal(loanInstallment({ remaining: 70, totalDue: 1150, semestersLeft: 1 }), 70);
  assert.equal(loanInstallment(null), 0);
});
test('reloading preserves the taxed revenue baseline without taxing all lifetime earnings', () => {
  assert.equal(restoredRevenueBaseline(9000, 10000), 9000);
  assert.equal(restoredRevenueBaseline(undefined, 10000), 10000);
  assert.equal(restoredRevenueBaseline(Infinity, 10000), 10000);
  assert.equal(restoredRevenueBaseline(20000, 10000), 10000);
});
test('offline reward is paid once across an immediate reload and preserves progress', () => {
  const save = { savedAt: 100000, money: 10, totals: { moneyEarned: 100, contractsCompleted: 4 } };
  const grant = offlineGrant(save, 220000, 10, 0.15, true)!;
  assert.equal(grant.amount, 50);
  assert.equal(grant.save.money, 60);
  assert.equal(grant.save.totals.contractsCompleted, 4);
  assert.equal(grant.save.totals.moneyEarned, 150);
  assert.equal(offlineGrant(grant.save, 220000, 10, 0.15, true), null);
  assert.equal(save.money, 10);
});
test('offline reward respects two-hour cap and requires production and sales', () => {
  const save = { savedAt: 1000, money: 0, totals: { moneyEarned: 0 } };
  const grant = offlineGrant(save, 1000 + 14400000, 10, 0.15, true)!;
  assert.equal(grant.amount, 3024);
  assert.equal(grant.capped, true);
  assert.equal(offlineGrant(save, 30000, 10, 0.15, true), null);
  assert.equal(offlineGrant(save, 100000, 0, 0.15, true), null);
  assert.equal(offlineGrant(save, 100000, 10, 0.15, false), null);
  assert.equal(offlineGrant({}, 100000, 10, 0.15, true), null);
});
