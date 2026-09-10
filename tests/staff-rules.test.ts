import test from 'node:test';
import assert from 'node:assert/strict';
import { getStaffTier, getStaffUpgrade, getFredCycleDuration } from '../staff-rules.ts';

test('promoting Fred to Legend updates his cycle and the grade used for payroll', () => {
  const owned = { fred_stage: true, fred: true, fred_perma: true, fred_chef: true, fred_dir: true, fred_legende: true };
  const upgrades = [
    { id: 'fred_dir', salary: { bas: 1385, std: 2100, haut: 3275 } },
    { id: 'fred_legende', salary: { bas: 3200, std: 4800, haut: 7400 } },
  ];
  assert.equal(getStaffTier(owned, 'fred'), 'fred_legende');
  assert.equal(getFredCycleDuration(getStaffTier(owned, 'fred')), 1.5);
  assert.deepEqual(getStaffUpgrade(owned, 'fred', upgrades)?.salary, { bas: 3200, std: 4800, haut: 7400 });
  assert.equal(getFredCycleDuration(getStaffTier({ ...owned, fred_legende: false }, 'fred')), 2);
});

test('Brigitte Legend pays her own salary while the accountant efficiency upgrade has no separate payroll', () => {
  const upgrades = [
    { id: 'brigitte_ad', salary: { bas: 1180, std: 1890, haut: 2860 } },
    { id: 'comptable_senior' },
    { id: 'brigitte_legende', salary: { bas: 2800, std: 4200, haut: 6500 } },
  ];
  const beforePromotion = { autosell: true, brigitte_compta: true, brigitte_ad: true, comptable_senior: true };
  assert.equal(getStaffTier(beforePromotion, 'brigitte'), 'brigitte_ad');
  assert.equal(getStaffUpgrade(beforePromotion, 'brigitte', upgrades)?.salary?.std, 1890);
  const promoted = { ...beforePromotion, brigitte_legende: true };
  assert.equal(getStaffUpgrade(promoted, 'brigitte', upgrades)?.salary?.std, 4200);
  assert.equal(getStaffTier({ comptable_senior: true }, 'brigitte'), undefined);
});

test('saved legendary grades work even when earlier grade flags are absent', () => {
  assert.equal(getStaffTier({ fred_legende: true }, 'fred'), 'fred_legende');
  assert.equal(getStaffTier({ brigitte_legende: true }, 'brigitte'), 'brigitte_legende');
  assert.equal(getFredCycleDuration(getStaffTier({}, 'fred')), 0);
  assert.equal(getStaffUpgrade({}, 'fred', []), null);
  assert.equal(getStaffUpgrade({ fred_legende: true }, 'fred', []), null);
});
