import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseVictoryPerk, createVictoryReceipt, normalizeVictoryReceipt, restorePrestigeReceipt } from '../prestige-rules.ts';

test('a receipt restores a victory interrupted before the global increment exactly once', () => {
  const receipt = createVictoryReceipt(2);
  assert.equal(receipt.runTarget, 3);
  const first = restorePrestigeReceipt(2, {}, receipt);
  assert.equal(first.runs, 3);
  assert.deepEqual(restorePrestigeReceipt(first.runs, first.perks, receipt), first);
  assert.equal(receipt.pendingPerk, true);
});

test('a chosen perk survives interruption and does not get paid twice on reload', () => {
  const choice = chooseVictoryPerk(createVictoryReceipt(2), 'prod', { prod: 4 });
  assert.deepEqual(choice?.perkAward, { id: 'prod', total: 5 });
  const first = restorePrestigeReceipt(3, { prod: 4 }, choice);
  assert.equal(first.perks.prod, 5);
  assert.deepEqual(restorePrestigeReceipt(3, first.perks, choice), first);
  assert.equal(chooseVictoryPerk(choice, 'cash', first.perks), null);
});

test('legacy victories without receipts never grant a new prestige level or perk', () => {
  assert.equal(normalizeVictoryReceipt(undefined), null);
  assert.deepEqual(restorePrestigeReceipt(4, { prod: 2 }, undefined), { runs: 4, perks: { prod: 2, sell: 0, cash: 0, calm: 0 } });
});

test('replaying an old receipt never decreases later prestige totals', () => {
  const receipt = chooseVictoryPerk(createVictoryReceipt(1), 'sell', { sell: 1 });
  assert.deepEqual(restorePrestigeReceipt(8, { sell: 5, cash: 2 }, receipt), { runs: 8, perks: { prod: 0, sell: 5, cash: 2, calm: 0 } });
});

test('malformed receipts and unknown perk choices are rejected', () => {
  assert.equal(normalizeVictoryReceipt({ runTarget: Infinity, pendingPerk: true }), null);
  assert.equal(normalizeVictoryReceipt({ runTarget: 2, perkAward: { id: '__proto__', total: 2 } }), null);
  assert.equal(chooseVictoryPerk(createVictoryReceipt(1), '__proto__', {}), null);
});
