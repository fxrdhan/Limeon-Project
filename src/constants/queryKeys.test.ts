import { describe, expect, it } from 'vite-plus/test';

import { getInvalidationKeys, QueryKeys } from './queryKeys';

describe('query key invalidation contracts', () => {
  it('keeps item invalidation tied to dashboard caches', () => {
    expect(getInvalidationKeys.items.related()).toEqual([
      QueryKeys.items.all,
      QueryKeys.dashboard.all,
    ]);
  });

  it('keeps transaction invalidation tied to stock and dashboard caches', () => {
    expect(getInvalidationKeys.purchases.related()).toEqual([
      QueryKeys.purchases.all,
      QueryKeys.items.all,
      QueryKeys.dashboard.all,
    ]);

    expect(getInvalidationKeys.sales.related()).toEqual([
      QueryKeys.sales.all,
      QueryKeys.items.all,
      QueryKeys.dashboard.all,
    ]);
  });

  it('keeps item master-data invalidation tied to item caches', () => {
    expect(getInvalidationKeys.masterData.categories()).toEqual([
      QueryKeys.masterData.categories.all,
      QueryKeys.items.all,
    ]);

    expect(getInvalidationKeys.masterData.types()).toEqual([
      QueryKeys.masterData.types.all,
      QueryKeys.items.all,
    ]);

    expect(getInvalidationKeys.masterData.packages()).toEqual([
      QueryKeys.masterData.packages.all,
      QueryKeys.items.all,
    ]);

    expect(getInvalidationKeys.masterData.dosages()).toEqual([
      QueryKeys.masterData.dosages.all,
      QueryKeys.items.all,
    ]);

    expect(getInvalidationKeys.masterData.manufacturers()).toEqual([
      QueryKeys.masterData.manufacturers.all,
      QueryKeys.items.all,
    ]);

    expect(getInvalidationKeys.masterData.itemUnits()).toEqual([
      QueryKeys.masterData.itemUnits.all,
      QueryKeys.items.all,
    ]);
  });

  it('keeps inventory-unit invalidation tied to stock-moving caches', () => {
    expect(getInvalidationKeys.masterData.inventoryUnits()).toEqual([
      QueryKeys.masterData.inventoryUnits.all,
      QueryKeys.items.all,
      QueryKeys.purchases.all,
      QueryKeys.sales.all,
    ]);
  });

  it('keeps party invalidation tied to affected transaction caches', () => {
    expect(getInvalidationKeys.masterData.suppliers()).toEqual([
      QueryKeys.masterData.suppliers.all,
      QueryKeys.purchases.all,
    ]);

    expect(getInvalidationKeys.patients.related()).toEqual([
      QueryKeys.patients.all,
      QueryKeys.sales.all,
    ]);

    expect(getInvalidationKeys.doctors.related()).toEqual([
      QueryKeys.doctors.all,
      QueryKeys.sales.all,
    ]);

    expect(getInvalidationKeys.customers.related()).toEqual([
      QueryKeys.customers.all,
      QueryKeys.sales.all,
    ]);
  });
});
