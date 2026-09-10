import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real purchase definitions, not a second table of their implementation.
const source = readFileSync(new URL('../meltdown.tsx', import.meta.url), 'utf8');
const catalogue = source.slice(source.indexOf('const UPGRADES ='), source.indexOf('const UPGRADE_FAMILIES =')).replace(/Icon:\s*\w+/g, 'Icon: null');
const compute = source.match(/function computeStats\(owned\) \{[\s\S]+?\n\}/)![0];
const context = vm.createContext({ BASE_CAP: 24, FREEZE_BASE_OUTPUT: 8, FREEZE_DURATION: 3, PRESTIGE_RUNS: 0 });
vm.runInContext(catalogue + '\n' + compute + '\nthis.stats = computeStats; this.upgrades = UPGRADES;', context);
const stats = (owned: Record<string, boolean>) => (context as any).stats(owned);

test('AI logistics reduces the route duration used by the simulation', () => {
  assert.equal(stats({ logistique_ia: true }).deliverySpeedMult, 0.6);
});
test('renewable energy and accounting combine on the actual utilities multiplier', () => {
  assert.equal(stats({ energie_renouvelable: true }).utilityCostMult, 0.5);
  assert.equal(stats({ energie_renouvelable: true, comptable_senior: true }).utilityCostMult, 0.4);
});
test('second depot adds a route and increases existing truck capacity by half', () => {
  const before = stats({ camion_1: true });
  const after = stats({ camion_1: true, deuxieme_zone_depot: true });
  assert.equal(after.linesBonus, before.linesBonus + 1);
  assert.equal(after.truckMaxCap, before.truckMaxCap * 1.5);
});
test('insurance and quality purchases expose their promised loss protections', () => {
  const protectedStats = stats({ assurance_complete: true, garde_fous_qualite: true });
  assert.equal(protectedStats.sabotageRiskMult, 0.5);
  assert.equal(protectedStats.truckBreakMult, 0.5);
  assert.equal(protectedStats.b2bPenaltyMult, 0.5);
});
test('both awareness investments expose the one-time gain collected at purchase', () => {
  assert.equal(stats({ blockchain_certif: true, reseau_diplomatique: true }).notoBonus, 25);
});
