// Rules shared by the simulation and the interface. No React or browser state.
export function phoneCallFitsProgress(call: { minPhase: number; minCap?: number; minRevenue?: number; needStock: number }, phase: number, maxCap: number, revenue: number) {
  if (call.minPhase !== phase || call.needStock > maxCap) return false;
  const unlocked = phase === 1 ? maxCap >= (call.minCap || 0) : revenue >= (call.minRevenue || 0);
  const relevantSize = phase === 1 ? (call.minCap || call.needStock) : call.needStock;
  const minimumStock = phase >= 4 ? 100 : phase >= 3 ? 50 : 0;
  return unlocked && relevantSize >= maxCap * 0.05 && call.needStock >= minimumStock;
}

export function contractProfile(contract: { deliveryTime?: number; archetype?: string; notorietyMin?: number; brigitteTier?: number } | null) {
  if (!contract) return { maxDeliveries: 1, globalDeadlineSec: 999999, completionBonusPct: 0 };
  const tier = contract.brigitteTier || 1;
  let maxDeliveries: number, margin: number, completionBonusPct: number;
  if (contract.archetype === 'RETAIL') {
    const awareness = contract.notorietyMin || 0;
    maxDeliveries = awareness >= 70 ? 25 : awareness >= 50 ? 20 : 15;
    margin = awareness >= 70 ? 1.35 : awareness >= 50 ? 1.30 : 1.25;
    completionBonusPct = awareness >= 70 ? 0.18 : awareness >= 50 ? 0.15 : 0.12;
  } else {
    // Early clients resolve in a few minutes; larger deals remain distinct sprints.
    maxDeliveries = tier >= 5 ? 9 : tier === 4 ? 12 : tier === 3 ? 10 : tier === 2 ? 8 : 6;
    margin = tier >= 5 ? 1.08 : tier === 4 ? 1.12 : tier === 3 ? 1.18 : 1.25;
    completionBonusPct = tier >= 5 ? 0.25 : tier === 4 ? 0.20 : tier === 3 ? 0.15 : 0.10;
  }
  const cycleSec = (contract.deliveryTime || 60) * 2 + 2;
  return { maxDeliveries, globalDeadlineSec: Math.round(cycleSec * maxDeliveries * margin), completionBonusPct };
}

export function signedContract<T extends { qty: number; pricePerCube: number }>(contract: T, line: { dynQty?: number; dynPrice?: number }) {
  return {
    ...contract,
    qty: Number.isFinite(line.dynQty) && (line.dynQty as number) > 0 ? line.dynQty as number : contract.qty,
    pricePerCube: Number.isFinite(line.dynPrice) && (line.dynPrice as number) >= 0 ? line.dynPrice as number : contract.pricePerCube,
  };
}

export function deliverySpeedMultiplier(durationFactor: number, employeeSpeedFactor: number, trafficDurationFactor = 1, weatherDurationFactor = 1) {
  return employeeSpeedFactor / (durationFactor * trafficDurationFactor * weatherDurationFactor);
}

export function contractFitsCapacity(qty: number, storage: number, truck: number) {
  return Number.isFinite(qty) && qty > 0 && qty <= storage && qty <= truck;
}

export function migrateLegacyContractQuantity<T extends { dynQty?: number; dynPrice?: number }>(contract: { qty: number; pricePerCube: number }, line: T, storage: number, truck: number): T {
  const limit = Math.floor(Math.min(storage, truck));
  const signed = signedContract(contract, line);
  if (limit <= 0 || signed.qty <= limit) return line;
  // Legacy orders charged the base quantity but invoiced the dynamic quantity.
  // Keep the promised payment and all existing dates/targets while making cargo fit.
  return { ...line, dynQty: limit, dynPrice: signed.pricePerCube * signed.qty / limit };
}

export function contractRevenue(qty: number, price: number, factors: { brigitteBonus: number; campaign: number; seasonal: number; sellMult: number; demand: number; premiumWater: number }) {
  const brand = 1 + (factors.sellMult - 1) * 0.7;
  return qty * price * (1 + factors.brigitteBonus) * factors.campaign * factors.seasonal * brand * factors.demand * factors.premiumWater;
}

export function elapsedMissionMonths(previousMonth: number, currentMonth: number, phase: number, previousPhase = phase) {
  return phase >= 3 && previousPhase >= 3 && previousMonth >= 0 ? Math.max(0, currentMonth - previousMonth) : 0;
}

/** The loyalty ledger records one entry per fully successful contract, unlike legacy delivery counters. */
export function completedContractsFromLoyalty(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.values(value).reduce<number>((sum, count) =>
    typeof count === 'number' && Number.isFinite(count) && count >= 0
      ? Math.min(Number.MAX_SAFE_INTEGER, sum + Math.floor(count)) : sum, 0);
}

/** Revalidate an offer at the moment of signing: an open detail view is not a reservation. */
export function contractSigningIssue(contract: { brigitteTier?: number; notorietyMin?: number }, context: {
  offerExpiresIn: number | undefined; alreadySigned: boolean; maxTier: number; notoriety: number;
  marketBlocked: boolean; quarantined?: boolean;
}): 'expired' | 'duplicate' | 'blocked' | 'tier' | 'notoriety' | 'quarantine' | null {
  if (!Number.isFinite(context.offerExpiresIn) || !(context.offerExpiresIn! > 0)) return 'expired';
  if (context.alreadySigned) return 'duplicate';
  if (context.marketBlocked) return 'blocked';
  if ((contract.brigitteTier || 1) > context.maxTier) return 'tier';
  if ((contract.notorietyMin || 0) > context.notoriety) return 'notoriety';
  if (context.quarantined) return 'quarantine';
  return null;
}

/** Shared eligibility for both market refresh paths; quantities must already be dynamic. */
export function contractReputationEligible(contract: { archetype?: string; brigitteTier?: number }, reputation: number): boolean {
  // Small neighbourhood jobs remain a way to rebuild trust after a bad run.
  return reputation >= 20 || (contract.archetype === 'LOCAL' && (contract.brigitteTier || 1) === 1);
}

export function marketContractEligible(contract: {
  id: string; qty: number; brigitteTier?: number; notorietyMin?: number; archetype?: string; _qualityTooLow?: boolean;
}, context: {
  phase: number; maxTier: number; storage: number; truck: number; notoriety: number; reputation?: number;
  excludedIds?: readonly string[]; quarantinedIds?: readonly string[];
}) {
  if ((contract.brigitteTier || 1) > context.maxTier || (contract.notorietyMin || 0) > context.notoriety) return false;
  if (!contractFitsCapacity(contract.qty, context.storage, context.truck)) return false;
  if (context.excludedIds?.includes(contract.id) || context.quarantinedIds?.includes(contract.id)) return false;
  if (typeof context.reputation === 'number' && context.reputation < 20) {
    return contractReputationEligible(contract, context.reputation) && !contract._qualityTooLow;
  }
  if (context.phase < 3) return !contract._qualityTooLow;
  // In phase 3, retain attainable intermediate contracts alongside aspirational large accounts.
  return contract.archetype === 'RETAIL' || (contract.brigitteTier || 1) >= 5
    || ((contract.brigitteTier || 1) >= 3 && !contract._qualityTooLow);
}

/** Resolve once even if a second contract's dialog is open or the save is reloaded. */
export function contractResolutionDue(line: {
  deliveriesDone?: number; deliveriesTarget?: number; contractExpiresAt?: number | null; contractEndedTriggered?: boolean;
}, now: number): 'success' | 'failure' | null {
  if (line.contractEndedTriggered) return null;
  const done = Number.isFinite(line.deliveriesDone) ? Math.max(0, line.deliveriesDone!) : 0;
  const target = Number.isFinite(line.deliveriesTarget) && line.deliveriesTarget! > 0 ? line.deliveriesTarget! : Infinity;
  const expired = Number.isFinite(line.contractExpiresAt) && now > line.contractExpiresAt!;
  if (expired) return 'failure';
  if (done >= target) return 'success';
  return null;
}

export interface MarketContract {
  id: string; qty: number; pricePerCube: number; deliveryTime: number;
  brigitteTier?: number; notorietyMin?: number; archetype?: string; _qualityTooLow?: boolean;
  targetSegment?: string; minSegment?: number;
}
export interface MarketContext {
  phase: number; maxTier: number; storage: number; truck: number; notoriety: number; reputation?: number;
  excludedIds?: readonly string[]; quarantinedIds?: readonly string[];
  /** Previously issued offers, oldest first; current offers are preserved rather than reissued. */
  recentIds?: readonly string[];
  currentIds?: readonly string[];
  segments?: Record<string, number>;
}

/** One picker for initial offers, timed rotation and Brigitte's refresh. */
export function pickMarketContracts<T extends MarketContract>(contracts: readonly T[], context: MarketContext, targetSize: number, random: () => number = Math.random): T[] {
  const limit = Number.isFinite(targetSize) ? Math.max(0, Math.min(6, Math.floor(targetSize))) : 0;
  if (!limit) return [];
  const unique = [...new Map(contracts.filter(c => marketContractEligible(c, context)).map(c => [c.id, c])).values()];
  const feasible = (c: T) => !c._qualityTooLow && (!(c.targetSegment && c.minSegment)
    || (context.segments?.[c.targetSegment] ?? 0) >= c.minSegment);
  const playable = unique.filter(feasible);
  const future = unique.filter(c => !feasible(c));
  const topTier = Math.max(1, ...playable.map(c => c.brigitteTier || 1));
  const lucrative = (c: T) => c.archetype === 'VOLUME' || (c.brigitteTier || 1) >= Math.max(3, topTier - 1);
  const recent = new Set(context.recentIds || []);
  const selected: T[] = [];
  const current = (context.currentIds || []).map(id => unique.find(c => c.id === id)).filter((c): c is T => Boolean(c));
  const retainedFuture = current.find(c => !feasible(c));
  // A locked preview occupies at most one slot, and never displaces the only playable offer.
  const showFuture = future.length > 0 && (playable.length === 0 || (limit >= 2
    && (Boolean(retainedFuture) || (current.length < limit && random() < 0.12))));
  const playableLimit = Math.max(0, limit - (showFuture ? 1 : 0));
  const draw = (pool: readonly T[]): T | undefined => {
    const available = pool.filter(c => !selected.some(s => s.id === c.id));
    const fresh = available.filter(c => !recent.has(c.id));
    const choices = fresh.length ? fresh : available;
    if (!choices.length) return undefined;
    const weights = choices.map(c => {
      const distance = Math.max(0, topTier - (c.brigitteTier || 1));
      const sameType = selected.filter(s => s.archetype === c.archetype).length;
      return 1 / ((1 + distance) ** 2 * (1 + sameType * 0.35));
    });
    let ticket = Math.max(0, Math.min(0.999999999, random())) * weights.reduce((a, w) => a + w, 0);
    for (let i = 0; i < choices.length; i++) {
      ticket -= weights[i];
      if (ticket < 0) return choices[i];
    }
    return choices[choices.length - 1];
  };
  for (const c of current.filter(feasible)) {
    if (selected.length >= playableLimit) break;
    if (!selected.some(s => s.id === c.id)) selected.push(c);
  }
  if (playableLimit > 0 && !selected.some(lucrative)) {
    // A lucrative bucket gets its own rotation: do not repeat the last high-value client if another fits.
    const valuable = draw(playable.filter(lucrative));
    if (valuable) {
      if (selected.length >= playableLimit) selected.pop();
      selected.push(valuable);
    }
  }
  while (selected.length < playableLimit) {
    const next = draw(playable);
    if (!next) break;
    selected.push(next);
  }
  if (showFuture && selected.length < limit) {
    const preview = retainedFuture || draw(future);
    if (preview) selected.push(preview);
  }
  return selected;
}
