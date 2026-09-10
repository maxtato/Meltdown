import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStockLoss, eventGraceElapsed, perSecondChance, perTickChance,
  pickWeightedEvent, sabotageRiskMultiplier, vehicleBreakRiskMultiplier,
  tensionExpiryAction, normalizeEventState, normalizePendingInteractions,
} from '../event-rules.ts';

function near(actual: number, expected: number, tolerance = 1e-11) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
}

test('per-second event risk is unchanged when a game interval is divided into different ticks', () => {
  const rate = 0.0052;
  const interval = 120;
  for (const dt of [0.05, 0.1, 0.4, 1, 10]) {
    near(1 - (1 - perSecondChance(rate, dt)) ** (interval / dt), perSecondChance(rate, interval));
  }
});

test('legacy weather and vehicle odds retain their normal-speed calibration', () => {
  for (const probability of [0.0016, 0.0014, 0.0018, 0.0008, 0.00015, 0.00009, 0.00004]) {
    near(perTickChance(probability, 0.1), probability);
  }
});

test('an accelerated season has the same weather risk as a normal-speed season', () => {
  const reference = 1 - (1 - 0.0016) ** 1200;
  for (const multiplier of [1, 2, 4]) {
    const ticks = 1200 / multiplier;
    near(1 - (1 - perTickChance(0.0016, 0.1 * multiplier)) ** ticks, reference);
  }
});

test('invalid elapsed times and paused intervals cannot trigger an event', () => {
  for (const elapsed of [0, -1, NaN, Infinity]) {
    assert.equal(perSecondChance(0.5, elapsed), 0);
    assert.equal(perTickChance(0.5, elapsed), 0);
  }
  assert.equal(perSecondChance(-1, 1), 0);
  assert.equal(perTickChance(0.5, 1, 0), 0);
  assert.equal(perSecondChance(1000, 1000), 1);
  assert.equal(perTickChance(1, 0.1), 1);
});

test('each security upgrade protects its own sabotage and full insurance stacks with it', () => {
  for (const kind of ['pneus', 'avis', 'cyber', 'frigo'] as const) {
    assert.equal(sabotageRiskMultiplier({}, kind), 1);
    assert.equal(sabotageRiskMultiplier({ sabotageRiskMult: 0.5 }, kind), 0.5);
  }
  const security = { immunePneus: true, immuneAvis: true, immuneCyber: true, immuneFrigo: true };
  for (const kind of ['pneus', 'avis', 'cyber', 'frigo'] as const) {
    assert.equal(sabotageRiskMultiplier(security, kind), 0.22);
    assert.equal(sabotageRiskMultiplier({ ...security, sabotageRiskMult: 0.5 }, kind), 0.11);
  }
  assert.equal(sabotageRiskMultiplier({ immunePneus: true }, 'cyber'), 1);
});

test('vehicle hazard includes hail, fleet protection and heat rather than silently dropping a modifier', () => {
  assert.equal(vehicleBreakRiskMultiplier({}, {}), 1);
  assert.equal(vehicleBreakRiskMultiplier({}, { truckBreakMult: 1.5 }), 1.5);
  assert.equal(vehicleBreakRiskMultiplier({ truckBreakMult: 0.5 }, { truckBreakMult: 1.5 }), 0.75);
  assert.equal(vehicleBreakRiskMultiplier({ truckBreakMult: 0.5 }, { truckBreakMult: 1.5 }, 3), 2.25);
  near(1 - perTickChance(0.00015, 1, 0.1, 0.5), (1 - perTickChance(0.00015, 1)) ** 0.5);
});

test('a stock loss can be committed before the rest of a tick without restoring the destroyed cubes', () => {
  const cyber = applyStockLoss(200, 0.5);
  assert.deepEqual(cyber, { stock: 100, lost: 100 });
  const production = 8;
  const ordinaryMelt = 0.2;
  const committedStock = cyber.stock + production - ordinaryMelt;
  near(committedStock, 107.8);
  const coldRoomAfterCyber = applyStockLoss(cyber.stock, 0.12);
  assert.deepEqual(coldRoomAfterCyber, { stock: 88, lost: 12 });
});

test('loss calculations never manufacture stock or produce negative inventory', () => {
  assert.deepEqual(applyStockLoss(30, 2), { stock: 0, lost: 30 });
  assert.deepEqual(applyStockLoss(30, -1), { stock: 30, lost: 0 });
  assert.deepEqual(applyStockLoss(NaN, 0.5), { stock: 0, lost: 0 });
  assert.deepEqual(applyStockLoss(-30, 0.5), { stock: 0, lost: 0 });
  assert.deepEqual(applyStockLoss(30, NaN), { stock: 30, lost: 0 });
});

test('phase-three grace lasts a full season even when the run is already several years old', () => {
  const enteredAt = 2400;
  assert.equal(eventGraceElapsed(2400, enteredAt, 120), false);
  assert.equal(eventGraceElapsed(2519.9, enteredAt, 120), false);
  assert.equal(eventGraceElapsed(2520, enteredAt, 120), true);
  assert.equal(eventGraceElapsed(2500, NaN, 120), false);
});

test('event rotation avoids an immediate repeat while preserving weights among alternatives', () => {
  const pool = [{ id: 'previous', weight: 100 }, { id: 'ordinary', weight: 1 }, { id: 'frequent', weight: 3 }];
  assert.equal(pickWeightedEvent(pool, 'previous', () => 0)?.id, 'ordinary');
  assert.equal(pickWeightedEvent(pool, 'previous', () => 0.249)?.id, 'ordinary');
  assert.equal(pickWeightedEvent(pool, 'previous', () => 0.25)?.id, 'frequent');
  assert.equal(pickWeightedEvent(pool, 'previous', () => 0.999)?.id, 'frequent');
  assert.deepEqual(pool, [{ id: 'previous', weight: 100 }, { id: 'ordinary', weight: 1 }, { id: 'frequent', weight: 3 }]);
});

test('event rotation handles an exhausted pool and a single eligible event without blocking the scheduler', () => {
  assert.equal(pickWeightedEvent([]), null);
  assert.equal(pickWeightedEvent([{ id: 'disabled', weight: 0 }]), null);
  assert.equal(pickWeightedEvent([{ id: 'only', weight: 1 }], 'only', () => 0.5)?.id, 'only');
});

const catalogs = {
  events: {
    hail_storm: { category: 'weather', effects: { truckBreakMult: 1.5 } },
    crisis_coldroom: { category: 'tension_crisis' },
    crisis_glacier: { category: 'tension_crisis' },
    opp_festival: { category: 'tension_opportunity', requiredStock: 300, rewardMoney: 1500 },
  },
  frictions: { fric_sick: { effects: { prodMult: 0.6 } } },
  incidents: { accident: [{ victim: 'fred', moralImpact: -10 }] },
};

test('expiration applies the refusal of a crisis or an offer without accepting Glacier money', () => {
  assert.equal(tensionExpiryAction({ id: 'crisis_coldroom', category: 'tension_crisis' }), 'ignore');
  assert.equal(tensionExpiryAction({ id: 'opp_festival', category: 'tension_opportunity' }), 'decline');
  assert.equal(tensionExpiryAction({ id: 'crisis_glacier', category: 'tension_crisis' }), 'mitigate');
});

test('restoring a running event retains its timer, canonical effects, cooldowns and yearly quota', () => {
  const saved = {
    heatwaveLeft: 12, stockBurnFlash: 990,
    activeEvent: { id: 'hail_storm', startedAt: 980, expiresAt: 1014, category: 'wrong' },
    activeFrictions: { fric_sick: { id: 'fric_sick', expiresAt: 1050, subRole: 'fred', effects: { prodMult: 100 } } },
    pendingIncident: { kind: 'accident', variantIndex: 0, variant: { victim: 'nobody' } },
    lastIncidentAt: 980, lastFrictionAt: 970, lastTensionAt: 960,
    lastSabotageAt: 990, lastDisruptionAt: 990, lastInsuranceClaimAt: 850,
    lastSabotageId: 'cyber', phaseStartedAt: { 1: 0, 2: 120, 3: 800 },
    firedThisYear: { year: 2, ids: ['heatwave', 'fric_sick', 'fric_sick', 'missing'] },
  };
  const restored = normalizeEventState(saved, 1000, 3, catalogs);
  assert.equal(restored.heatwaveLeft, 12);
  assert.equal(restored.stockBurnFlash, 990);
  assert.deepEqual(restored.activeEvent, { id: 'hail_storm', startedAt: 980, expiresAt: 1014, category: 'weather' });
  assert.deepEqual(restored.activeFrictions.fric_sick.effects, { prodMult: 0.6 });
  assert.equal(restored.pendingIncident?.variant, catalogs.incidents.accident[0]);
  for (const field of ['lastIncidentAt', 'lastFrictionAt', 'lastTensionAt', 'lastSabotageAt', 'lastDisruptionAt', 'lastInsuranceClaimAt'] as const) {
    assert.equal(restored[field], saved[field]);
  }
  assert.equal(restored.lastSabotageId, 'cyber');
  assert.deepEqual(restored.phaseStartedAt, { 1: 0, 2: 120, 3: 800 });
  assert.deepEqual(restored.firedThisYear, { year: 2, ids: ['heatwave', 'fric_sick'] });
  assert.deepEqual(normalizeEventState(restored, 1000, 3, catalogs), restored, 'reloading is idempotent');
});

test('expired decisions and delivery commitments survive loading for one normal resolution', () => {
  const restored = normalizeEventState({
    pendingTensionEvent: { id: 'crisis_coldroom', expiresAt: 995 },
    activeMegacontract: { id: 'opp_festival', expiresAt: 995, requiredStock: 1, rewardMoney: 99999, deliveredFromStart: 125 },
    activeTensionEffect: { id: 'crisis_coldroom', expiresAt: 995, sellMult: 0.5 },
    activeEvent: { id: 'hail_storm', expiresAt: 995 },
  }, 1000, 2, catalogs);
  assert.deepEqual(restored.pendingTensionEvent, { id: 'crisis_coldroom', expiresAt: 995 });
  assert.deepEqual(restored.activeMegacontract, { id: 'opp_festival', expiresAt: 995, requiredStock: 300,
    rewardMoney: 1500, deliveredFromStart: 125, startStock: 0 });
  assert.equal(restored.activeTensionEffect, null);
  assert.equal(restored.activeEvent, null);
});

test('legacy and malformed saved events grant phase grace and cannot create broken permanent banners', () => {
  const restored = normalizeEventState({
    heatwaveLeft: Infinity, droughtLeft: -50, outageLeft: 999,
    activeEvent: { id: 'crisis_coldroom', expiresAt: 1010 },
    activeTensionEffect: { id: 'missing', expiresAt: 1010 },
    pendingTensionEvent: { id: 'hail_storm', expiresAt: NaN },
    activeFrictions: { fric_sick: { id: 'missing', expiresAt: 1010 } },
    pendingIncident: { kind: 'accident', variantIndex: -1 },
    lastSabotageAt: 900000, lastSabotageId: 'unknown', phaseStartedAt: { 3: 900000 },
    firedThisYear: { year: 1, ids: ['heatwave'] },
  }, 1000, 3, catalogs);
  assert.equal(restored.heatwaveLeft, 0);
  assert.equal(restored.droughtLeft, 0);
  assert.equal(restored.outageLeft, 32);
  assert.equal(restored.activeEvent, null);
  assert.equal(restored.activeTensionEffect, null);
  assert.equal(restored.pendingTensionEvent, null);
  assert.deepEqual(restored.activeFrictions, {});
  assert.equal(restored.pendingIncident, null);
  assert.equal(restored.lastSabotageAt, -9999);
  assert.equal(restored.lastSabotageId, null);
  assert.deepEqual(restored.phaseStartedAt, { 3: 1000 });
  assert.deepEqual(restored.firedThisYear, { year: 2, ids: [] });
  assert.equal(normalizeEventState(null, 1000, 3, catalogs).nextEventAt, 1300);
});

test('telephone calls and accepted deliveries reload with canonical rewards and without duplication', () => {
  const calls = {
    robert_warehouse: { needStock: 0 },
    cafe: { needStock: 30, rewardAccept: { money: 120, rep: 1 }, ethic: 'good', title: { fr: 'Café' } },
  };
  const delivery = { callId: 'cafe', needStock: 1, dueAt: 1020, reward: { money: 99999 } };
  const restored = normalizePendingInteractions({ currentCall: { id: 'robert_warehouse', startedAt: 970 },
    pendingDeliveries: [delivery, delivery, { ...delivery, callId: 'unknown' }, { ...delivery, dueAt: NaN }],
  }, 1000, calls);
  assert.deepEqual(restored.currentCall, { id: 'robert_warehouse', startedAt: 970 });
  assert.deepEqual(restored.pendingDeliveries, [{ callId: 'cafe', needStock: 30, dueAt: 1020,
    reward: { money: 120, rep: 1 }, ethic: 'good', title: { fr: 'Café' } }]);
  assert.deepEqual(normalizePendingInteractions(restored, 1000, calls), restored);
  assert.deepEqual(normalizePendingInteractions({ currentCall: { id: 'unknown', startedAt: 970 },
    pendingDeliveries: [{ ...delivery, dueAt: Infinity }] }, 1000, calls), { currentCall: null, pendingDeliveries: [] });
});
