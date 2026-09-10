// One salary-bearing grade per person, shared by the staff panel and payroll.
// comptable_senior is an efficiency upgrade, not a new salaried Brigitte grade.
export const STAFF_TIERS = {
  fred: ['fred_stage', 'fred', 'fred_perma', 'fred_chef', 'fred_dir', 'fred_legende'],
  brigitte: ['autosell', 'brigitte_compta', 'brigitte_ad', 'brigitte_legende'],
} as const;

type StaffRole = keyof typeof STAFF_TIERS;
type Owned = Record<string, unknown>;

export function getStaffTier(owned: Owned, role: StaffRole): string | undefined {
  return [...STAFF_TIERS[role]].reverse().find(id => !!owned[id]);
}

export function getStaffUpgrade<T extends { id: string }>(owned: Owned, role: StaffRole, upgrades: readonly T[]): T | null {
  const tier = getStaffTier(owned, role);
  return tier ? upgrades.find(upgrade => upgrade.id === tier) || null : null;
}

export function getFredCycleDuration(tierId: string | null | undefined): number {
  switch (tierId) {
    case 'fred_legende': return 1.5;
    case 'fred_dir': return 2;
    case 'fred_chef': return 2.5;
    case 'fred_perma': return 3;
    case 'fred':
    case 'fred_stage': return 4;
    default: return 0;
  }
}
