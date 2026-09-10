import test from 'node:test';
import assert from 'node:assert/strict';
import { contractReputationEligible, pickMarketContracts } from '../game-rules.ts';
import { upgradePrice } from '../progression-rules.ts';

test('local starter jobs remain available to rebuild reputation, including in phase 3', () => {
  const local = { id: 'local', archetype: 'LOCAL', brigitteTier: 1, qty: 50, pricePerCube: 1, deliveryTime: 10 };
  const large = { ...local, id: 'large', archetype: 'VOLUME', brigitteTier: 5 };
  assert.equal(contractReputationEligible(local, 0), true);
  assert.equal(contractReputationEligible(large, 19), false);
  assert.equal(contractReputationEligible(large, 20), true);
  for (const phase of [2, 3]) {
    const result = pickMarketContracts([large, local], { phase, maxTier: 7, truck: 3000, storage: 5000, notoriety: 100, reputation: 0, currentIds: ['large'] }, 3);
    assert.deepEqual(result.map(c => c.id), ['local']);
  }
});

test('training price includes legendary promotions but does not discount buildings or a first truck', () => {
  for (const id of ['fred_legende', 'brigitte_legende', 'camion_6']) {
    assert.equal(upgradePrice({ id, cost: 999 }, {}), 999);
    assert.equal(upgradePrice({ id, cost: 999 }, { plan_formation: true }), 500);
  }
  for (const id of ['camion_1', 'rent_warehouse', 'agence_marketing']) {
    assert.equal(upgradePrice({ id, cost: 10000 }, { plan_formation: true }), 10000);
  }
});
