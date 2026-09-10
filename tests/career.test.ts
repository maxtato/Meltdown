import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_GOAL_IDS, claimCareerReward, getCareerView, normalizeCareerProgress } from '../career.ts';
import type { CareerProgress, CareerSnapshot } from '../career.ts';

function snapshot(changes: Partial<CareerSnapshot> = {}): CareerSnapshot {
  return {
    phase: 1, owned: {}, totals: { produced: 0, sold: 0, delivered: 0, moneyEarned: 0, contractsCompleted: 0 },
    reputation: 0, notoriety: 0, completedCalls: 0, loyalClients: 0, signedRetailers: 0, victoryAchieved: false,
    ...changes,
  };
}
function goal(state: CareerSnapshot, progress: unknown, id: string) {
  return getCareerView(state, progress).goals.find(item => item.id === id)!;
}
function postgameState(): CareerSnapshot {
  return snapshot({ phase: 3, victoryAchieved: true, totals: { produced: 1000000, sold: 800000, delivered: 150000, moneyEarned: 5000000, contractsCompleted: 80 } });
}
function startPostgame(state = postgameState()): CareerProgress {
  let progress: CareerProgress = { claimed: [] };
  for (const id of CAREER_GOAL_IDS) progress = claimCareerReward(state, progress, id)!.progress;
  return progress;
}

test('old saves and malformed career data normalize safely without mutating the source', () => {
  for (const value of [undefined, null, false, 42, '', [], {}, { claimed: 'domination' }]) {
    assert.deepEqual(normalizeCareerProgress(value), { claimed: [] });
  }
  const raw = { claimed: ['first_sales', 'first_sales', 'unknown', null, 'hire_fred'], challenge: { round: 9, baseline: {} } };
  assert.deepEqual(normalizeCareerProgress(raw), { claimed: ['first_sales', 'hire_fred'] });
  assert.equal(raw.claimed.length, 5);
  const malformed = snapshot({ totals: { produced: NaN, sold: Infinity, delivered: -1, moneyEarned: NaN, contractsCompleted: -3 } });
  assert.equal(goal(malformed, undefined, 'first_sales').current, 0);
  assert.equal(goal(malformed, undefined, 'first_contract').current, 0);
});

test('sales reward requires 40 sold cubes and is paid only once across reloads', () => {
  const state = snapshot();
  state.totals.sold = 39.99;
  assert.equal(claimCareerReward(state, undefined, 'first_sales'), null);
  state.totals.sold = 40;
  const claimed = claimCareerReward(state, undefined, 'first_sales')!;
  assert.equal(claimed.reward, 5);
  const reloaded = normalizeCareerProgress(JSON.parse(JSON.stringify(claimed.progress)));
  assert.equal(claimCareerReward(state, reloaded, 'first_sales'), null);
  assert.equal(claimCareerReward(state, reloaded, 'invented_reward'), null);
});

test('staff promotions count and an available reward is shown ahead of a pending milestone', () => {
  const promoted = snapshot({ owned: { fred_dir: true, brigitte_ad: true } });
  assert.equal(goal(promoted, {}, 'hire_fred').complete, true);
  assert.equal(goal(promoted, {}, 'automate_sales').complete, true);
  assert.equal(getCareerView(promoted, {}).featured?.id, 'hire_fred');
  const afterFred = claimCareerReward(promoted, {}, 'hire_fred')!.progress;
  assert.equal(getCareerView(promoted, afterFred).featured?.id, 'automate_sales');
});

test('claimed progress survives destroyed equipment and falling awareness', () => {
  const state = snapshot({ phase: 3, owned: { pro_freezer: true }, notoriety: 60 });
  let progress = claimCareerReward(state, {}, 'protect_stock')!.progress;
  progress = claimCareerReward(state, progress, 'awareness')!.progress;
  state.owned = {};
  state.notoriety = 0;
  assert.equal(goal(state, progress, 'protect_stock').claimed, true);
  assert.equal(goal(state, progress, 'awareness').current, 60);
  assert.equal(claimCareerReward(state, progress, 'awareness'), null);
});

test('past phases remain claimable when loading an advanced save', () => {
  const phase2 = snapshot({ phase: 2 });
  for (const id of ['first_sales', 'hire_fred', 'automate_sales', 'protect_stock', 'industry']) {
    assert.ok(claimCareerReward(phase2, undefined, id), id);
  }
  assert.equal(claimCareerReward(phase2, {}, 'first_contract'), null);
  const phase3 = snapshot({ phase: 3 });
  for (const id of ['first_contract', 'three_contracts', 'loyal_client', 'brand']) {
    assert.ok(claimCareerReward(phase3, undefined, id), id);
  }
  assert.equal(claimCareerReward(phase3, {}, 'domination'), null);
  const won = snapshot({ phase: 3, victoryAchieved: true });
  for (const id of CAREER_GOAL_IDS) assert.ok(claimCareerReward(won, {}, id), id);
});

test('contract, client and retail milestones use their stated thresholds', () => {
  const state = snapshot({ phase: 2, loyalClients: 1, signedRetailers: 3, notoriety: 59.9 });
  state.totals.contractsCompleted = 2;
  assert.equal(goal(state, {}, 'first_contract').complete, true);
  assert.equal(goal(state, {}, 'three_contracts').complete, false);
  assert.equal(goal(state, {}, 'loyal_client').complete, true);
  assert.equal(goal(state, {}, 'retail_network').complete, false);
  assert.equal(goal(state, {}, 'awareness').complete, false);
  state.totals.contractsCompleted++;
  state.signedRetailers++;
  state.notoriety = 60;
  assert.equal(goal(state, {}, 'three_contracts').complete, true);
  assert.equal(goal(state, {}, 'retail_network').complete, true);
  assert.equal(goal(state, {}, 'awareness').complete, true);
});

test('renewable challenges need victory plus all rewards, and start from current totals', () => {
  const state = postgameState();
  assert.equal(claimCareerReward(state, {}, 'challenge:start'), null);
  assert.equal(claimCareerReward(snapshot(), { claimed: [...CAREER_GOAL_IDS] }, 'challenge:start'), null);
  const progress = startPostgame(state);
  assert.deepEqual(progress.challenge, { round: 0, baseline: { contractsCompleted: 80, delivered: 150000, moneyEarned: 5000000 } });
  const view = getCareerView(state, progress);
  assert.equal(view.featured?.id, 'challenge:0');
  assert.equal(view.featured?.current, 0);
  assert.equal(view.featured?.target, 3);
  assert.equal(claimCareerReward(state, progress, 'challenge:0'), null);
  assert.equal(claimCareerReward(state, progress, 'challenge:start'), null);
});

test('reload preserves the challenge baseline and repeat claims cannot pay twice', () => {
  const state = postgameState();
  const progress = startPostgame(state);
  state.totals.contractsCompleted += 2;
  const reloaded = normalizeCareerProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(getCareerView(state, reloaded).featured?.current, 2);
  assert.equal(claimCareerReward(state, reloaded, 'challenge:0'), null);
  state.totals.contractsCompleted++;
  const result = claimCareerReward(state, reloaded, 'challenge:0')!;
  assert.equal(result.reward, 1500);
  assert.equal(result.progress.challenge?.round, 1);
  assert.equal(claimCareerReward(state, result.progress, 'challenge:0'), null);
  assert.equal(claimCareerReward(state, result.progress, 'challenge:2'), null);
  assert.equal(getCareerView(state, result.progress).featured?.current, 0);
});

test('challenges rotate contracts, new deliveries and new revenue with increasing targets', () => {
  const state = postgameState();
  let progress = startPostgame(state);
  state.totals.contractsCompleted += 3;
  progress = claimCareerReward(state, progress, 'challenge:0')!.progress;
  assert.equal(getCareerView(state, progress).featured?.metric, 'delivered');
  assert.equal(getCareerView(state, progress).featured?.target, 5000);
  state.totals.delivered += 4999;
  assert.equal(claimCareerReward(state, progress, 'challenge:1'), null);
  state.totals.delivered += 101;
  progress = claimCareerReward(state, progress, 'challenge:1')!.progress;
  assert.equal(getCareerView(state, progress).featured?.metric, 'moneyEarned');
  assert.equal(getCareerView(state, progress).featured?.current, 0);
  state.totals.moneyEarned += 10000;
  progress = claimCareerReward(state, progress, 'challenge:2')!.progress;
  assert.equal(getCareerView(state, progress).featured?.metric, 'contractsCompleted');
  assert.equal(getCareerView(state, progress).featured?.target, 4);
  assert.equal(getCareerView(state, progress).featured?.reward, 2000);
  assert.equal(progress.challenge?.baseline.delivered, state.totals.delivered);
  assert.equal(getCareerView(state, progress).featured?.current, 0);
});

test('invalid or missing baselines require an explicit start instead of rewarding lifetime totals', () => {
  const state = postgameState();
  const claimed = [...CAREER_GOAL_IDS];
  for (const challenge of [undefined, { round: -1, baseline: state.totals }, { round: 1.5, baseline: state.totals }, { round: 8, baseline: {} }, { round: 2, baseline: { ...state.totals, moneyEarned: Infinity } }]) {
    const progress = normalizeCareerProgress({ claimed, challenge });
    assert.equal(progress.challenge, undefined);
    assert.equal(getCareerView(state, progress).featured?.id, 'challenge:start');
    const result = claimCareerReward(state, progress, 'challenge:start')!;
    assert.equal(result.reward, 0);
    assert.equal(getCareerView(state, result.progress).featured?.current, 0);
  }
});

test('late challenges remain bounded and negative counter differences never show negative progress', () => {
  const state = postgameState();
  for (const [round, target] of [[3000, 8], [3001, 100000], [3002, 200000]]) {
    const progress = startPostgame(state);
    progress.challenge!.round = round;
    const current = getCareerView(state, progress).featured!;
    assert.equal(current.target, target);
    assert.equal(current.reward, 10000);
    state.totals[current.metric!] = progress.challenge!.baseline[current.metric!] - 1;
    assert.equal(getCareerView(state, progress).featured?.current, 0);
  }
});
