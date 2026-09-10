/** Legacy salary tables describe six months; round each employee as payroll does. */
export function monthlyPayroll(salaries: number[], multiplier = 1) {
  return salaries.reduce((sum, salary) => sum + Math.round(Math.max(0, salary || 0) * multiplier / 6), 0);
}

export function loanInstallment(loan: { remaining: number; totalDue: number; semestersLeft: number } | null) {
  if (!loan) return 0;
  const remaining = Math.max(0, loan.remaining || 0);
  return loan.semestersLeft <= 1 ? remaining : Math.min(remaining, Math.ceil(loan.totalDue / 24));
}

export function restoredRevenueBaseline(savedBaseline: unknown, revenue: number) {
  const earned = Math.max(0, revenue || 0);
  return typeof savedBaseline === 'number' && Number.isFinite(savedBaseline)
    ? Math.max(0, Math.min(earned, savedBaseline)) : earned;
}

/** An idle reward is a grant, not an offline simulation. Persist its returned save before displaying it. */
export function offlineGrant<T extends { savedAt?: number; money?: number; totals?: Record<string, any> }>(save: T, now: number, production: number, price: number, canSell: boolean) {
  if (!canSell || !Number.isFinite(save.savedAt) || !Number.isFinite(now) || !Number.isFinite(production) || !Number.isFinite(price)) return null;
  const elapsed = Math.max(0, (now - save.savedAt!) / 1000);
  if (elapsed < 60 || production <= 0 || price <= 0) return null;
  const seconds = Math.min(elapsed, 7200);
  const amount = Math.round(production * seconds * 0.4 * price * 0.7);
  if (amount <= 0) return null;
  return { amount, minutes: Math.max(1, Math.round(seconds / 60)), capped: elapsed > 7200,
    save: { ...save, savedAt: now, money: (save.money || 0) + amount,
      totals: { ...save.totals, moneyEarned: (save.totals?.moneyEarned || 0) + amount } } };
}
