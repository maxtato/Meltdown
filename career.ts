// Career rewards are explicit, one-time claims. No clocks or browser state here.
export interface CareerSnapshot {
  phase: number;
  owned: Record<string, boolean>;
  totals: { produced: number; sold: number; delivered: number; moneyEarned: number; contractsCompleted: number };
  reputation: number;
  notoriety: number;
  completedCalls: number;
  /** Clients with at least two successfully completed contracts. */
  loyalClients: number;
  signedRetailers: number;
  victoryAchieved: boolean;
}

type ChallengeMetric = 'contractsCompleted' | 'delivered' | 'moneyEarned';
export interface CareerChallenge {
  /** Number of renewable challenges already claimed in this run. */
  round: number;
  baseline: Record<ChallengeMetric, number>;
}
export interface CareerProgress {
  claimed: string[];
  challenge?: CareerChallenge;
}
export interface CareerGoalView {
  id: string;
  phase: number;
  reward: number;
  current: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  kind: 'milestone' | 'challenge' | 'start';
  metric?: ChallengeMetric;
}

const finiteCount = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const has = (snapshot: CareerSnapshot, ...ids: string[]) => ids.some(id => Boolean(snapshot.owned?.[id]));
const phasePassed = (snapshot: CareerSnapshot, phase: number) => snapshot.phase > phase || snapshot.victoryAchieved;

// Brigitte precedes the Pro freezer because she costs less and removes repetitive selling.
const MILESTONES = [
  { id: 'first_sales', phase: 1, reward: 5, target: 40, value: (s: CareerSnapshot) => phasePassed(s, 1) ? 40 : finiteCount(s.totals?.sold) },
  { id: 'hire_fred', phase: 1, reward: 15, target: 1, value: (s: CareerSnapshot) => +(phasePassed(s, 1) || has(s, 'fred_stage', 'fred', 'fred_perma', 'fred_chef', 'fred_dir')) },
  { id: 'automate_sales', phase: 1, reward: 80, target: 1, value: (s: CareerSnapshot) => +(phasePassed(s, 1) || has(s, 'autosell', 'brigitte_compta', 'brigitte_ad')) },
  { id: 'protect_stock', phase: 1, reward: 50, target: 1, value: (s: CareerSnapshot) => +(phasePassed(s, 1) || has(s, 'pro_freezer')) },
  { id: 'industry', phase: 2, reward: 300, target: 1, value: (s: CareerSnapshot) => +(s.phase >= 2 || s.victoryAchieved) },
  { id: 'first_contract', phase: 2, reward: 400, target: 1, value: (s: CareerSnapshot) => phasePassed(s, 2) ? 1 : finiteCount(s.totals?.contractsCompleted) },
  { id: 'three_contracts', phase: 2, reward: 700, target: 3, value: (s: CareerSnapshot) => phasePassed(s, 2) ? 3 : finiteCount(s.totals?.contractsCompleted) },
  { id: 'loyal_client', phase: 2, reward: 1000, target: 1, value: (s: CareerSnapshot) => phasePassed(s, 2) ? 1 : finiteCount(s.loyalClients) },
  { id: 'brand', phase: 3, reward: 2000, target: 1, value: (s: CareerSnapshot) => +(s.phase >= 3 || s.victoryAchieved) },
  { id: 'awareness', phase: 3, reward: 2500, target: 60, value: (s: CareerSnapshot) => s.victoryAchieved ? 60 : finiteCount(s.notoriety) },
  { id: 'retail_network', phase: 3, reward: 4000, target: 4, value: (s: CareerSnapshot) => s.victoryAchieved ? 4 : finiteCount(s.signedRetailers) },
  { id: 'domination', phase: 3, reward: 6000, target: 1, value: (s: CareerSnapshot) => +Boolean(s.victoryAchieved) },
];

export const CAREER_GOAL_IDS: readonly string[] = MILESTONES.map(goal => goal.id);
const metrics: ChallengeMetric[] = ['contractsCompleted', 'delivered', 'moneyEarned'];

/** Supports old saves; removes duplicate/unknown claims and invalid challenge data. */
export function normalizeCareerProgress(value: unknown): CareerProgress {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const claimed = Array.isArray(raw.claimed)
    ? [...new Set(raw.claimed.filter((id): id is string => typeof id === 'string' && CAREER_GOAL_IDS.includes(id)))]
    : [];
  const result: CareerProgress = { claimed };
  const challenge = raw.challenge && typeof raw.challenge === 'object' ? raw.challenge as Record<string, unknown> : null;
  if (claimed.length === MILESTONES.length && challenge && Number.isSafeInteger(challenge.round) && (challenge.round as number) >= 0) {
    const baseline = challenge.baseline && typeof challenge.baseline === 'object' ? challenge.baseline as Record<string, unknown> : null;
    // A missing baseline must never turn a lifetime total into newly earned progress.
    if (baseline && metrics.every(metric => typeof baseline[metric] === 'number' && Number.isFinite(baseline[metric]) && (baseline[metric] as number) >= 0)) {
      result.challenge = {
        round: challenge.round as number,
        baseline: { contractsCompleted: baseline.contractsCompleted as number, delivered: baseline.delivered as number, moneyEarned: baseline.moneyEarned as number },
      };
    }
  }
  return result;
}

function startChallenge(snapshot: CareerSnapshot, round = 0): CareerChallenge {
  return {
    round,
    baseline: {
      contractsCompleted: finiteCount(snapshot.totals?.contractsCompleted),
      delivered: finiteCount(snapshot.totals?.delivered),
      moneyEarned: finiteCount(snapshot.totals?.moneyEarned),
    },
  };
}

function challengeView(snapshot: CareerSnapshot, challenge: CareerChallenge): CareerGoalView {
  const level = Math.floor(challenge.round / metrics.length);
  const metric = metrics[challenge.round % metrics.length];
  const target = metric === 'contractsCompleted' ? Math.min(8, 3 + level)
    : metric === 'delivered' ? Math.min(100000, 5000 * (level + 1))
      : Math.min(200000, 10000 * (level + 1));
  const current = Math.min(target, Math.max(0, finiteCount(snapshot.totals?.[metric]) - challenge.baseline[metric]));
  return {
    id: `challenge:${challenge.round}`, phase: 3,
    reward: Math.min(10000, 1500 + level * 500),
    current, target, complete: current >= target, claimed: false, kind: 'challenge', metric,
  };
}

export function getCareerView(snapshot: CareerSnapshot, value: unknown) {
  const progress = normalizeCareerProgress(value);
  const goals: CareerGoalView[] = MILESTONES.map(goal => {
    const claimed = progress.claimed.includes(goal.id);
    const current = claimed ? goal.target : Math.min(goal.target, Math.max(0, goal.value(snapshot)));
    return { id: goal.id, phase: goal.phase, reward: goal.reward, target: goal.target, current, complete: current >= goal.target, claimed, kind: 'milestone' };
  });
  const remaining = goals.filter(goal => !goal.claimed);
  const allClaimed = remaining.length === 0;
  let featured: CareerGoalView | null = remaining.find(goal => goal.complete) || remaining[0] || null;
  if (allClaimed && snapshot.victoryAchieved) {
    featured = progress.challenge ? challengeView(snapshot, progress.challenge) : {
      id: 'challenge:start', phase: 3, reward: 0, current: 0, target: 1,
      complete: true, claimed: false, kind: 'start',
    };
  }
  return {
    goals, featured,
    next: remaining.filter(goal => goal.id !== featured?.id).slice(0, 3),
    claimedCount: progress.claimed.length,
    totalCount: MILESTONES.length,
    challengeCount: progress.challenge?.round || 0,
    postgame: allClaimed && snapshot.victoryAchieved,
  };
}

/** Call against the latest snapshot/progress; stale or repeated claim IDs return null. */
export function claimCareerReward(snapshot: CareerSnapshot, value: unknown, id: string): { progress: CareerProgress; reward: number } | null {
  const progress = normalizeCareerProgress(value);
  const view = getCareerView(snapshot, progress);
  if (id === 'challenge:start') {
    if (!view.postgame || progress.challenge) return null;
    return { progress: { ...progress, challenge: startChallenge(snapshot) }, reward: 0 };
  }
  if (id.startsWith('challenge:')) {
    if (!view.postgame || !progress.challenge || view.featured?.id !== id || !view.featured.complete || progress.challenge.round >= Number.MAX_SAFE_INTEGER) return null;
    return { progress: { ...progress, challenge: startChallenge(snapshot, progress.challenge.round + 1) }, reward: view.featured.reward };
  }
  const goal = view.goals.find(item => item.id === id);
  if (!goal || goal.claimed || !goal.complete) return null;
  const next: CareerProgress = { ...progress, claimed: [...progress.claimed, id] };
  if (next.claimed.length === MILESTONES.length && snapshot.victoryAchieved) next.challenge = startChallenge(snapshot);
  return { progress: next, reward: goal.reward };
}
