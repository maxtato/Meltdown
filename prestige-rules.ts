export const PRESTIGE_PERK_IDS = ['prod', 'sell', 'cash', 'calm'] as const;
export type PrestigePerkId = typeof PRESTIGE_PERK_IDS[number];
export type PrestigePerks = Record<PrestigePerkId, number>;
export interface VictoryReceipt {
  runTarget: number;
  pendingPerk: boolean;
  perkAward?: { id: PrestigePerkId; total: number };
}

const safeCount = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) ? Math.max(0, value) : 0;
const isPerk = (value: unknown): value is PrestigePerkId => typeof value === 'string' && PRESTIGE_PERK_IDS.some(id => id === value);

export function normalizePrestigePerks(value: unknown): PrestigePerks {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { prod: safeCount(raw.prod), sell: safeCount(raw.sell), cash: safeCount(raw.cash), calm: safeCount(raw.calm) };
}

export function normalizeVictoryReceipt(value: unknown): VictoryReceipt | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (safeCount(raw.runTarget) < 1) return null;
  if (raw.perkAward && typeof raw.perkAward === 'object') {
    const award = raw.perkAward as Record<string, unknown>;
    if (!isPerk(award.id) || safeCount(award.total) < 1) return null;
    return { runTarget: raw.runTarget as number, pendingPerk: false, perkAward: { id: award.id, total: award.total as number } };
  }
  return raw.pendingPerk === true ? { runTarget: raw.runTarget as number, pendingPerk: true } : null;
}

/** Persist this receipt before writing the global prestige counter. */
export function createVictoryReceipt(currentRuns: number): VictoryReceipt {
  return { runTarget: Math.min(Number.MAX_SAFE_INTEGER, safeCount(currentRuns) + 1), pendingPerk: true };
}

/** Persist the returned choice before applying its global total. Repeated choices are rejected. */
export function chooseVictoryPerk(value: unknown, perkId: string, currentPerks: unknown): VictoryReceipt | null {
  const receipt = normalizeVictoryReceipt(value);
  if (!receipt?.pendingPerk || !isPerk(perkId)) return null;
  const perks = normalizePrestigePerks(currentPerks);
  return {
    runTarget: receipt.runTarget,
    pendingPerk: false,
    perkAward: { id: perkId, total: Math.min(Number.MAX_SAFE_INTEGER, perks[perkId] + 1) },
  };
}

/** Replay after interruption by setting targets, never by incrementing a second time. */
export function restorePrestigeReceipt(currentRuns: number, currentPerks: unknown, value: unknown): { runs: number; perks: PrestigePerks } {
  const receipt = normalizeVictoryReceipt(value);
  const perks = normalizePrestigePerks(currentPerks);
  if (receipt?.perkAward) {
    const award = receipt.perkAward;
    perks[award.id] = Math.max(perks[award.id], award.total);
  }
  return { runs: Math.max(safeCount(currentRuns), receipt?.runTarget || 0), perks };
}
