/** Convert a hazard per game second to a probability for the elapsed game time. */
export function perSecondChance(rate: number, elapsedSeconds: number, multiplier = 1): number {
  if (!Number.isFinite(rate) || !Number.isFinite(elapsedSeconds) || !Number.isFinite(multiplier)
    || rate <= 0 || elapsedSeconds <= 0 || multiplier <= 0) return 0;
  return -Math.expm1(-rate * elapsedSeconds * multiplier);
}

/** Preserve a legacy probability calibrated for a 100 ms tick at any game speed. */
export function perTickChance(probability: number, elapsedSeconds: number, referenceTick = 0.1, multiplier = 1): number {
  if (!Number.isFinite(probability) || !Number.isFinite(elapsedSeconds) || !Number.isFinite(referenceTick)
    || !Number.isFinite(multiplier) || probability <= 0 || elapsedSeconds <= 0 || referenceTick <= 0 || multiplier <= 0) return 0;
  if (probability >= 1) return 1;
  return -Math.expm1(Math.log1p(-probability) * elapsedSeconds / referenceTick * multiplier);
}

function riskFactor(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 1;
}

export type SabotageKind = 'pneus' | 'avis' | 'cyber' | 'frigo';
export interface SabotageProtection {
  immunePneus?: boolean;
  immuneAvis?: boolean;
  immuneCyber?: boolean;
  immuneFrigo?: boolean;
  sabotageRiskMult?: number;
}

export function sabotageRiskMultiplier(stats: SabotageProtection, kind: SabotageKind): number {
  const protectedByKind = { pneus: stats.immunePneus, avis: stats.immuneAvis, cyber: stats.immuneCyber, frigo: stats.immuneFrigo };
  return (protectedByKind[kind] ? 0.22 : 1) * riskFactor(stats.sabotageRiskMult);
}

/** Equipment protection, weather and heat all act on the same vehicle hazard. */
export function vehicleBreakRiskMultiplier(
  stats: { truckBreakMult?: number }, eventMods: { truckBreakMult?: number }, heatMultiplier = 1,
): number {
  return riskFactor(stats.truckBreakMult) * riskFactor(eventMods.truckBreakMult) * riskFactor(heatMultiplier);
}

export function applyStockLoss(stock: number, fraction: number): { stock: number; lost: number } {
  const before = Number.isFinite(stock) ? Math.max(0, stock) : 0;
  const loss = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
  const after = before * (1 - loss);
  return { stock: after, lost: before - after };
}

/** A phase grace period starts when that phase was entered, not at the start of the run. */
export function eventGraceElapsed(gameTime: number, phaseStartedAt: number, graceSeconds: number): boolean {
  return Number.isFinite(gameTime) && Number.isFinite(phaseStartedAt) && Number.isFinite(graceSeconds)
    && gameTime >= phaseStartedAt && gameTime - phaseStartedAt >= Math.max(0, graceSeconds);
}

/** Avoid replaying the last event when another eligible event exists, retaining relative weights. */
export function pickWeightedEvent<T extends { id: string; weight?: number }>(
  eligible: readonly T[], previousId: string | null = null, random: () => number = Math.random,
): T | null {
  const valid = eligible.filter(item => item.weight === undefined || (Number.isFinite(item.weight) && item.weight > 0));
  const alternatives = valid.filter(item => item.id !== previousId);
  const pool = alternatives.length > 0 ? alternatives : valid;
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const draw = random();
  let remaining = (Number.isFinite(draw) ? Math.max(0, Math.min(1 - Number.EPSILON, draw)) : 0) * total;
  for (const item of pool) {
    remaining -= item.weight ?? 1;
    if (remaining < 0) return item;
  }
  return pool[pool.length - 1];
}

/** Inaction never accepts an offer or pays money, including Glacier's disguised offer. */
export function tensionExpiryAction(definition: { id: string; category?: string }): 'mitigate' | 'ignore' | 'decline' {
  if (definition.id === 'crisis_glacier') return 'mitigate'; // refuse the envelope
  return definition.category === 'tension_opportunity' ? 'decline' : 'ignore';
}

type EventCatalogs = { events: Record<string, any>; frictions: Record<string, any>; incidents: Record<string, any[]> };
const record = (value: any): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const finite = (value: any, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) => typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : fallback;

/** Restore durations and canonical definitions, never replaying their initial monetary/stock effects. */
export function normalizeEventState(value: unknown, gameTime: number, phase: number, catalogs: EventCatalogs) {
  const raw = record(value);
  const now = finite(gameTime);
  const timestamp = (value: any, fallback = -9999) => typeof value === 'number' && Number.isFinite(value) && value <= now ? Math.max(-9999, value) : fallback;
  const timed = (value: any, known: Record<string, any>, retainExpired = false): any => {
    const item = record(value);
    if (!Object.hasOwn(known, item.id) || !Number.isFinite(item.expiresAt) || item.expiresAt < 0 || item.expiresAt > now + 86400
      || (!retainExpired && item.expiresAt <= now)) return null;
    return { id: item.id, expiresAt: item.expiresAt };
  };
  const ambient = Object.fromEntries(Object.entries(catalogs.events).filter(([, definition]) =>
    definition.effects && !['tension_crisis', 'tension_opportunity'].includes(definition.category)));
  const active = timed(raw.activeEvent, ambient);
  const tension = timed(raw.pendingTensionEvent, catalogs.events, true);
  const effect = timed(raw.activeTensionEffect, { ...catalogs.events, glacier_pricewar: {} });
  const mega = timed(raw.activeMegacontract, Object.fromEntries(['opp_megacontract', 'opp_festival'].filter(id => catalogs.events[id]).map(id => [id, catalogs.events[id]])), true);
  const frictions: Record<string, any> = {};
  for (const [id, saved] of Object.entries(record(raw.activeFrictions))) {
    const normalized = timed(saved, catalogs.frictions);
    if (normalized && normalized.id === id) frictions[id] = { ...normalized, effects: catalogs.frictions[id].effects,
      subRole: ['fred', 'brigitte', 'lenny'].includes((saved as any).subRole) ? (saved as any).subRole : null };
  }
  const incident = record(raw.pendingIncident);
  const variant = Number.isInteger(incident.variantIndex) ? catalogs.incidents[incident.kind]?.[incident.variantIndex] : null;
  const starts: Record<number, number> = {};
  for (const [key, value] of Object.entries(record(raw.phaseStartedAt))) {
    if ([1, 2, 3].includes(Number(key)) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= now) starts[Number(key)] = value;
  }
  if (starts[phase] === undefined) starts[phase] = now; // migration gets a fresh phase grace
  const year = Math.floor(now / 480);
  const annual = record(raw.firedThisYear);
  const knownAnnual = new Set(['heatwave', 'drought', 'outage', ...Object.keys(catalogs.events), ...Object.keys(catalogs.frictions)]);
  return {
    version: 1,
    heatwaveLeft: finite(raw.heatwaveLeft, 0, 45), droughtLeft: finite(raw.droughtLeft, 0, 45),
    outageLeft: finite(raw.outageLeft, 0, 32), autumnRushLeft: finite(raw.autumnRushLeft, 0, 40),
    stockBurnFlash: timestamp(raw.stockBurnFlash, 0),
    activeEvent: active && { ...active, startedAt: timestamp(raw.activeEvent.startedAt, now), category: catalogs.events[active.id].category },
    nextEventAt: Number.isFinite(raw.nextEventAt) ? Math.max(now, Math.min(now + 86400, raw.nextEventAt)) : now + 300,
    activeFrictions: frictions,
    pendingTensionEvent: tension && ['tension_crisis', 'tension_opportunity'].includes(catalogs.events[tension.id].category) ? tension : null,
    activeTensionEffect: effect && { ...effect, sellMult: finite(raw.activeTensionEffect.sellMult, 1, 10), blockTrucks: raw.activeTensionEffect.blockTrucks === true },
    activeMegacontract: mega && { ...mega, requiredStock: catalogs.events[mega.id].requiredStock,
      rewardMoney: catalogs.events[mega.id].rewardMoney, deliveredFromStart: finite(raw.activeMegacontract.deliveredFromStart), startStock: finite(raw.activeMegacontract.startStock) },
    pendingIncident: variant ? { kind: incident.kind, variantIndex: incident.variantIndex, variant } : null,
    lastIncidentAt: timestamp(raw.lastIncidentAt), lastFrictionAt: timestamp(raw.lastFrictionAt),
    lastTensionAt: timestamp(raw.lastTensionAt), lastSabotageAt: timestamp(raw.lastSabotageAt),
    lastEventAt: timestamp(raw.lastEventAt), lastDisruptionAt: timestamp(raw.lastDisruptionAt),
    lastInsuranceClaimAt: timestamp(raw.lastInsuranceClaimAt),
    lastSabotageId: ['pneus', 'avis', 'cyber', 'frigo'].includes(raw.lastSabotageId) ? raw.lastSabotageId : null,
    phaseStartedAt: starts,
    firedThisYear: { year, ids: annual.year === year && Array.isArray(annual.ids) ? [...new Set(annual.ids.filter((id: unknown) => typeof id === 'string' && knownAnnual.has(id)))] : [] },
  };
}

export function normalizePendingInteractions(value: unknown, now: number, calls: Record<string, any>) {
  const raw = record(value), call = record(raw.currentCall);
  const currentCall = Object.hasOwn(calls, call.id) && Number.isFinite(call.startedAt) && call.startedAt >= 0 && call.startedAt <= now
    ? { id: call.id, startedAt: call.startedAt } : null;
  const seen = new Set<string>();
  const pendingDeliveries = (Array.isArray(raw.pendingDeliveries) ? raw.pendingDeliveries : []).flatMap(item => {
    if (!item || !Object.hasOwn(calls, item.callId) || !Number.isFinite(item.dueAt) || item.dueAt < 0 || item.dueAt > now + 86400
      || !Number.isFinite(item.needStock) || item.needStock <= 0) return [];
    if (seen.has(item.callId)) return [];
    seen.add(item.callId);
    const definition = calls[item.callId];
    return [{ callId: item.callId, needStock: definition.needStock || item.needStock, dueAt: item.dueAt,
      reward: definition.rewardAccept || {}, ethic: definition.ethic, title: definition.title }];
  });
  return { currentCall, pendingDeliveries };
}
