type Owned = Record<string, unknown>;

const TRAINABLE_IDS = new Set([
  'fred', 'fred_perma', 'fred_chef', 'fred_dir', 'fred_legende',
  'brigitte_compta', 'brigitte_ad', 'brigitte_legende', 'janice_senior', 'janice_dir',
  'camion_2', 'camion_3', 'camion_4', 'camion_5', 'camion_6',
]);

export function upgradePrice(upgrade: { id: string; cost: number }, owned: Owned): number {
  return owned.plan_formation && TRAINABLE_IDS.has(upgrade.id) ? Math.round(upgrade.cost * 0.5) : upgrade.cost;
}

export interface ExperienceTotals {
  moneyEarned?: number;
  produced?: number;
  contractsCompleted?: number;
  purchasedUpgradeIds?: string[];
  legacyXpBonus?: number;
}

const count = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

/** One-time effects have their own receipt; old saves receive missing effects once. */
export function applyUpgradeNotorietyBonuses(owned: Owned, notoriety: number, previousAwards: unknown): { notoriety: number; awardedIds: string[]; added: number } {
  const bonuses: Record<string, number> = { blockchain_certif: 10, reseau_diplomatique: 15 };
  const awardedIds = Array.isArray(previousAwards)
    ? [...new Set(previousAwards.filter((id): id is string => typeof id === 'string' && Object.hasOwn(bonuses, id)))] : [];
  let added = 0;
  for (const [id, amount] of Object.entries(bonuses)) {
    if (!owned[id] || awardedIds.includes(id)) continue;
    awardedIds.push(id);
    added += amount;
  }
  return { notoriety: Math.min(100, count(notoriety) + added), awardedIds, added };
}

/** Four active retailers and a fully established brand can overtake a rival at its 45-point ceiling. */
export function playerMarketShare(notoriety: number, reputation: number, signedRetailerCount: number): number {
  const awareness = Math.min(100, count(notoriety));
  const trust = Math.min(100, count(reputation));
  const retailers = Math.min(6, Math.floor(count(signedRetailerCount)));
  return Math.min(50, 3 + awareness / 100 * 22 + trust / 100 * 15 + retailers * 1.5);
}

/** Purchases are remembered after a breakdown; rebuilding never grants this XP twice. */
export function normalizePurchasedUpgradeIds(value: unknown, owned: Owned = {}): string[] {
  const previous = Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
  return [...new Set([...previous, ...Object.keys(owned).filter(id => !!owned[id])])];
}

/** Also migrates old saves which only knew about currently owned equipment. */
export function normalizeExperienceTotals<T extends ExperienceTotals>(totals: T, owned: Owned = {}): T {
  return {
    ...totals,
    purchasedUpgradeIds: normalizePurchasedUpgradeIds(totals.purchasedUpgradeIds, owned),
    legacyXpBonus: count(totals.legacyXpBonus),
  };
}

export function recordUpgradePurchase<T extends ExperienceTotals>(totals: T, id: string, owned: Owned = {}): T {
  const normalized = normalizeExperienceTotals(totals, owned);
  return { ...normalized, purchasedUpgradeIds: normalizePurchasedUpgradeIds([...normalized.purchasedUpgradeIds!, id]) };
}

/** Keeps the existing XP weights while using the permanent purchase history. */
export function experienceFromTotals(totals: ExperienceTotals, callsCount: number, owned: Owned = {}): number {
  const upgradeCount = normalizePurchasedUpgradeIds(totals.purchasedUpgradeIds, owned).length;
  return Math.floor(
    count(totals.moneyEarned)
    + count(totals.produced) * 0.05
    + count(totals.contractsCompleted) * 200
    + count(callsCount) * 150
    + upgradeCount * 4000
    + count(totals.legacyXpBonus),
  );
}

/** Preserve earned levels when fixing inflated legacy counters, without keeping those counters wrong. */
export function preserveExperienceOnMigration<T extends ExperienceTotals>(before: ExperienceTotals, after: T, callsCount: number, owned: Owned = {}): T {
  const normalized = normalizeExperienceTotals(after, owned);
  const shortfall = Math.max(0, experienceFromTotals(before, callsCount, owned) - experienceFromTotals(normalized, callsCount, owned));
  return { ...normalized, legacyXpBonus: count(normalized.legacyXpBonus) + shortfall };
}
