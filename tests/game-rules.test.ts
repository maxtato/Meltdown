import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneCallFitsProgress, contractProfile, signedContract, deliverySpeedMultiplier, contractFitsCapacity, migrateLegacyContractQuantity, contractRevenue, elapsedMissionMonths } from '../game-rules.ts';

test('industry and brand calls unlock with revenue even without minCap', () => {
  const karim = { minPhase: 2, minRevenue: 100000, needStock: 100 };
  assert.equal(phoneCallFitsProgress(karim, 2, 1500, 100000), true);
  assert.equal(phoneCallFitsProgress(karim, 2, 1500, 99999), false);
  assert.equal(phoneCallFitsProgress({ minPhase: 3, minRevenue: 800000, needStock: 500 }, 3, 8000, 800000), true);
  assert.equal(phoneCallFitsProgress(karim, 3, 1500, 100000), false);
  assert.equal(phoneCallFitsProgress({ minPhase: 2, needStock: 2000 }, 2, 1500, 100000), false);
});

test('small early calls retire when the business outgrows them', () => {
  const early = { minPhase: 1, minCap: 24, needStock: 20 };
  assert.equal(phoneCallFitsProgress(early, 1, 24, 0), true);
  assert.equal(phoneCallFitsProgress(early, 1, 1000, 0), false);
});

test('first contracts finish in short sessions without changing per-delivery rewards', () => {
  const mojito = contractProfile({ brigitteTier: 1, deliveryTime: 12, archetype: 'LOCAL' });
  const pizzeria = contractProfile({ brigitteTier: 2, deliveryTime: 18, archetype: 'LOCAL' });
  assert.equal(mojito.maxDeliveries, 6);
  assert.ok(mojito.globalDeadlineSec <= 240);
  assert.equal(pizzeria.maxDeliveries, 8);
  assert.equal(mojito.completionBonusPct, 0.10);
  assert.equal(pizzeria.completionBonusPct, 0.10);
  for (let tier = 3; tier <= 7; tier++) {
    const p = contractProfile({ brigitteTier: tier, deliveryTime: 30 });
    assert.ok(p.maxDeliveries <= 12);
    assert.ok(p.globalDeadlineSec > 62 * p.maxDeliveries);
  }
  assert.equal(contractProfile({ archetype: 'RETAIL', notorietyMin: 70 }).maxDeliveries, 25);
});

test('the signed quantity and price govern loading, fuel, display and payment', () => {
  const c = signedContract({ qty: 120, pricePerCube: 0.84 }, { dynQty: 175, dynPrice: 1.10 });
  assert.equal(c.qty, 175);
  assert.equal(c.pricePerCube, 1.10);
  assert.deepEqual(signedContract({ qty: 120, pricePerCube: 0.84 }, {}), { qty: 120, pricePerCube: 0.84 });
  assert.deepEqual(signedContract({ qty: 120, pricePerCube: 0.84 }, { dynQty: NaN, dynPrice: NaN }), { qty: 120, pricePerCube: 0.84 });
});

test('promotions and better pay accelerate Lenny; traffic and weather slow him', () => {
  assert.ok(deliverySpeedMultiplier(1, 1.20) > deliverySpeedMultiplier(1, 1.05));
  assert.ok(deliverySpeedMultiplier(0.7, 1.23) > deliverySpeedMultiplier(0.7, 1.17));
  assert.equal(deliverySpeedMultiplier(0.7, 1.2, 2, 1.5), 1.2 / (0.7 * 2 * 1.5));
});

test('a dynamically enlarged order cannot exceed either storage or truck capacity', () => {
  assert.equal(contractFitsCapacity(175, 200, 150), false);
  assert.equal(contractFitsCapacity(175, 150, 200), false);
  assert.equal(contractFitsCapacity(175, 175, 175), true);
  assert.equal(contractFitsCapacity(NaN, 200, 200), false);
});

test('legacy impossible cargo fits without losing its promised revenue or signed schedule', () => {
  const old = { dynQty: 450, dynPrice: 2.4, deliveriesDone: 8, deliveriesTarget: 48, contractExpiresAt: 1200 };
  const migrated = migrateLegacyContractQuantity({ qty: 300, pricePerCube: 2 }, old, 350, 400);
  assert.equal(migrated.dynQty, 350);
  assert.ok(Math.abs(migrated.dynQty * migrated.dynPrice - old.dynQty * old.dynPrice) < 1e-8);
  assert.equal(migrated.deliveriesTarget, 48);
  assert.equal(migrated.deliveriesDone, 8);
  assert.equal(migrated.contractExpiresAt, 1200);
  assert.strictEqual(migrateLegacyContractQuantity({ qty: 300, pricePerCube: 2 }, migrated, 350, 400), migrated);
  assert.strictEqual(migrateLegacyContractQuantity({ qty: 300, pricePerCube: 2 }, old, 1000, 1000), old);
});

test('revenue preview equals delivery payment before melt, including all factors', () => {
  const factors = { brigitteBonus: 0.2, campaign: 1.5, seasonal: 1.25, sellMult: 3, demand: 0.8, premiumWater: 1.3 };
  const preview = contractRevenue(200, 2, factors);
  assert.ok(Math.abs(preview - 400 * 1.2 * 1.5 * 1.25 * 2.4 * 0.8 * 1.3) < 1e-8);
  assert.ok(Math.abs(contractRevenue(160, 2, factors) - preview * 0.8) < 1e-8);
});

test('perennity counts each month, skipped months, and never time before phase 3', () => {
  assert.equal(elapsedMissionMonths(10, 11, 3), 1);
  assert.equal(elapsedMissionMonths(10, 13, 3), 3);
  assert.equal(elapsedMissionMonths(10, 11, 2), 0);
  assert.equal(elapsedMissionMonths(-1, 11, 3), 0);
  assert.equal(elapsedMissionMonths(11, 1, 3), 0);
  assert.equal(elapsedMissionMonths(0, 90, 3, 1), 0); // loading a saved run
  assert.equal(elapsedMissionMonths(10, 11, 3, 2), 0); // entering phase 3
});
