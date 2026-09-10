import test from 'node:test';
import assert from 'node:assert/strict';
import { completedContractsFromLoyalty, contractSigningIssue, marketContractEligible, contractResolutionDue, pickMarketContracts } from '../game-rules.ts';
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

test('legacy completed-contract migration uses the success ledger, never delivered trips', () => {
  assert.equal(completedContractsFromLoyalty({ mojito: 2, brasserie: 1 }), 3);
  assert.equal(completedContractsFromLoyalty({ mojito: 0, brasserie: -8, bad: NaN, huge: Infinity, text: '10' }), 0);
  assert.equal(completedContractsFromLoyalty(undefined), 0);
  assert.equal(completedContractsFromLoyalty(null), 0);
  assert.equal(completedContractsFromLoyalty([5, 9]), 0);
});

test('signing revalidates expiry, uniqueness, staff tier, awareness and market lockouts', () => {
  const contract = { brigitteTier: 4, notorietyMin: 20 };
  const ctx = { offerExpiresIn: 50, alreadySigned: false, maxTier: 4, notoriety: 20, marketBlocked: false };
  assert.equal(contractSigningIssue(contract, ctx), null);
  for (const offerExpiresIn of [undefined, 0, -1, NaN, Infinity]) assert.equal(contractSigningIssue(contract, { ...ctx, offerExpiresIn }), 'expired');
  assert.equal(contractSigningIssue(contract, { ...ctx, alreadySigned: true }), 'duplicate');
  assert.equal(contractSigningIssue(contract, { ...ctx, maxTier: 1 }), 'tier');
  assert.equal(contractSigningIssue(contract, { ...ctx, notoriety: 19 }), 'notoriety');
  assert.equal(contractSigningIssue(contract, { ...ctx, marketBlocked: true }), 'blocked');
  assert.equal(contractSigningIssue(contract, { ...ctx, quarantined: true }), 'quarantine');
});

test('market eligibility matches phase, quality, signed capacity and quarantine in every refresh', () => {
  const ctx = { phase: 2, maxTier: 4, storage: 1500, truck: 500, notoriety: 30 };
  const volume = { id: 'volume', qty: 490, brigitteTier: 3, archetype: 'VOLUME', _qualityTooLow: false };
  const premium = { ...volume, id: 'premium', archetype: 'PREMIUM', _qualityTooLow: true };
  assert.equal(marketContractEligible(volume, ctx), true);
  assert.equal(marketContractEligible(premium, ctx), false);
  assert.equal(marketContractEligible({ ...volume, qty: 501 }, ctx), false);
  assert.equal(marketContractEligible(volume, { ...ctx, excludedIds: ['volume'] }), false);
  assert.equal(marketContractEligible(volume, { ...ctx, quarantinedIds: ['volume'] }), false);
  assert.equal(marketContractEligible(volume, { ...ctx, maxTier: 2 }), false);
  assert.equal(marketContractEligible({ ...volume, notorietyMin: 31 }, ctx), false);
  assert.equal(marketContractEligible(volume, { ...ctx, phase: 3 }), true);
  assert.equal(marketContractEligible(premium, { ...ctx, phase: 3 }), false);
  assert.equal(marketContractEligible({ ...premium, brigitteTier: 5 }, { ...ctx, phase: 3, maxTier: 5 }), true);
});

test('a contract resolves once, including simultaneous expiry and a saved resolution flag', () => {
  const line = { deliveriesDone: 5, deliveriesTarget: 6, contractExpiresAt: 100 };
  assert.equal(contractResolutionDue(line, 99), null);
  assert.equal(contractResolutionDue(line, 101), 'failure');
  assert.equal(contractResolutionDue({ ...line, deliveriesDone: 6 }, 100), 'success');
  assert.equal(contractResolutionDue({ ...line, deliveriesDone: 6 }, 101), 'failure');
  const ended = { ...line, contractEndedTriggered: true };
  assert.equal(contractResolutionDue(ended, 101), null);
  assert.equal(contractResolutionDue(JSON.parse(JSON.stringify(ended)), 200), null);
  assert.equal(contractResolutionDue({ ...line, deliveriesTarget: 0, contractExpiresAt: null }, 500), null);
  const simultaneous = [line, { ...line }].map(l => ({ ...l, contractEndedTriggered: contractResolutionDue(l, 101) !== null }));
  assert.deepEqual(simultaneous.map(l => contractResolutionDue(l, 102)), [null, null]);
});

test('all market refreshes preserve active offers and guarantee a feasible valuable contract', () => {
  const local = { id: 'local', qty: 90, pricePerCube: 1, deliveryTime: 10, brigitteTier: 1, archetype: 'LOCAL' };
  const volume = { ...local, id: 'volume', qty: 450, brigitteTier: 3, archetype: 'VOLUME' };
  const premium = { ...local, id: 'premium', brigitteTier: 3, archetype: 'PREMIUM', _qualityTooLow: true };
  const ctx = { phase: 2, maxTier: 3, storage: 1500, truck: 500, notoriety: 0, currentIds: ['local'] };
  const picked = pickMarketContracts([local, volume, premium], ctx, 3, () => 0.5);
  assert.deepEqual(picked.map(c => c.id), ['local', 'volume']);
  assert.deepEqual(pickMarketContracts([local, volume], { ...ctx, currentIds: picked.map(c => c.id) }, 3, () => 0.5), picked);
  assert.equal(pickMarketContracts([local, volume], ctx, 1, () => 0.5)[0].id, 'volume');
});

test('the market rotates recent clients when alternatives exist, then falls back without deadlock', () => {
  const base = { qty: 90, pricePerCube: 1, deliveryTime: 10, brigitteTier: 3, archetype: 'VOLUME' };
  const clients = ['a', 'b', 'c', 'd'].map(id => ({ ...base, id }));
  const ctx = { phase: 2, maxTier: 3, storage: 1500, truck: 500, notoriety: 0, recentIds: ['a', 'b'] };
  const picked = pickMarketContracts(clients, ctx, 2, () => 0);
  assert.deepEqual(picked.map(c => c.id), ['c', 'd']);
  assert.equal(pickMarketContracts(clients, { ...ctx, recentIds: ['a', 'b', 'c', 'd'] }, 4, () => 0).length, 4);
  assert.equal(new Set(pickMarketContracts([...clients, clients[0]], ctx, 6, () => 0).map(c => c.id)).size, 4);
});

test('phase 3 shows at most one locked discovery and never hides the only playable choice', () => {
  const base = { qty: 100, pricePerCube: 2, deliveryTime: 20, brigitteTier: 5, archetype: 'VOLUME' };
  const live = { ...base, id: 'live' };
  const locked = [1, 2, 3].map(n => ({ ...base, id: `locked${n}`, archetype: 'PREMIUM', _qualityTooLow: true }));
  const ctx = { phase: 3, maxTier: 5, storage: 1500, truck: 500, notoriety: 0 };
  const result = pickMarketContracts([live, ...locked], ctx, 6, () => 0);
  assert.equal(result.length, 2);
  assert.equal(result.filter(c => c._qualityTooLow).length, 1);
  assert.equal(result[0].id, 'live');
  assert.deepEqual(pickMarketContracts([live, ...locked], ctx, 1, () => 0).map(c => c.id), ['live']);
  assert.equal(pickMarketContracts(locked, ctx, 6, () => 0).length, 1);
});

test('market selection favors the latest playable tier instead of cheap lifetime starter clients', () => {
  const base = { qty: 100, pricePerCube: 1, deliveryTime: 20, archetype: 'LOCAL' };
  const old = { ...base, id: 'old', brigitteTier: 1 };
  const newClient = { ...base, id: 'new', brigitteTier: 4 };
  const ctx = { phase: 2, maxTier: 4, storage: 1500, truck: 500, notoriety: 0 };
  assert.equal(pickMarketContracts([old, newClient], ctx, 1, () => 0)[0].id, 'new');
  assert.deepEqual(pickMarketContracts([old, newClient], { ...ctx, excludedIds: ['new'] }, 1, () => 0).map(c => c.id), ['old']);
});
