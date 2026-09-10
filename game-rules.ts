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
