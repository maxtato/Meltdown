import test from 'node:test';
import assert from 'node:assert/strict';
import { applyUpgradeNotorietyBonuses, experienceFromTotals, normalizeExperienceTotals, normalizePurchasedUpgradeIds, playerMarketShare, preserveExperienceOnMigration, recordUpgradePurchase } from '../progression-rules.ts';

test('old upgrades receive their missing notoriety once, including across reload and resale', () => {
  const owned = { blockchain_certif: true, reseau_diplomatique: true };
  const first = applyUpgradeNotorietyBonuses(owned, 50, undefined);
  assert.equal(first.notoriety, 75);
  assert.equal(first.added, 25);
  const next = applyUpgradeNotorietyBonuses(owned, 70, first.awardedIds);
  assert.equal(next.added, 0);
  assert.equal(next.notoriety, 70);
});

test('a bonus claimed at the notoriety cap cannot be claimed again after decay', () => {
  const first = applyUpgradeNotorietyBonuses({ reseau_diplomatique: true }, 99, []);
  assert.equal(first.notoriety, 100);
  assert.equal(applyUpgradeNotorietyBonuses({ reseau_diplomatique: true }, 50, first.awardedIds).added, 0);
});

test('an established brand with four retailers can beat a rival capped at 45', () => {
  assert.equal(playerMarketShare(100, 100, 4), 46);
  assert.ok(playerMarketShare(100, 100, 4) > 45);
  assert.equal(playerMarketShare(60, 70, 4), 32.7);
});

test('market share bounds stats and retailers to actual game ranges', () => {
  assert.equal(playerMarketShare(900, 900, 900), 49);
  assert.equal(playerMarketShare(NaN, -10, Infinity), 3);
});

test('old saves migrate active equipment into a unique permanent purchase history', () => {
  assert.deepEqual(normalizePurchasedUpgradeIds(['silicone', 'silicone', 7, ''], { silicone: true, mini_freezer: true, fred: false }), ['silicone', 'mini_freezer']);
  assert.deepEqual(normalizeExperienceTotals({ produced: 10 }, { silicone: true }).purchasedUpgradeIds, ['silicone']);
});

test('breakdowns and repurchases preserve XP without paying purchase XP twice', () => {
  const bought = recordUpgradePurchase({ moneyEarned: 20 }, 'mini_freezer');
  const before = experienceFromTotals(bought, 0, { mini_freezer: true });
  assert.equal(experienceFromTotals(bought, 0, {}), before);
  const repaired = recordUpgradePurchase(bought, 'mini_freezer');
  assert.equal(experienceFromTotals(repaired, 0, { mini_freezer: true }), before);
  assert.equal(experienceFromTotals({ ...bought, moneyEarned: 40 }, 0, {}), before + 20);
});

test('new distinct upgrades and activity keep the existing XP weights', () => {
  const bought = recordUpgradePurchase(recordUpgradePurchase({ moneyEarned: 100, produced: 40, contractsCompleted: 3 }, 'fred'), 'autosell');
  assert.equal(experienceFromTotals(bought, 2), 9002);
});

test('malformed XP values cannot turn progress negative or nonfinite', () => {
  assert.equal(experienceFromTotals({ moneyEarned: NaN, produced: Infinity, contractsCompleted: -2, legacyXpBonus: -100 }, -5), 0);
});

test('correcting old delivery counts preserves levels with a fixed migration bonus', () => {
  const old = { moneyEarned: 1000, contractsCompleted: 40 };
  const migrated = preserveExperienceOnMigration(old, { ...old, contractsCompleted: 3 }, 4, { fred: true });
  assert.equal(migrated.contractsCompleted, 3);
  assert.equal(migrated.legacyXpBonus, 7400);
  assert.equal(experienceFromTotals(migrated, 4), experienceFromTotals(old, 4, { fred: true }));
  assert.equal(experienceFromTotals({ ...migrated, contractsCompleted: 4 }, 4), experienceFromTotals(migrated, 4) + 200);
});

test('reapplying the migration to already corrected totals grants no extra XP', () => {
  const migrated = preserveExperienceOnMigration({ contractsCompleted: 40 }, { contractsCompleted: 3 }, 0);
  const again = preserveExperienceOnMigration(migrated, migrated, 0);
  assert.deepEqual(again, migrated);
});
