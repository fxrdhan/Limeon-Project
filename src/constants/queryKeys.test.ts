import { describe, expect, it } from 'vitest';
import { getInvalidationKeys, QueryKeys } from './queryKeys';

describe('QueryKeys', () => {
  it('builds item, purchase and sales keys', () => {
    expect(QueryKeys.items.list({ q: 'abc' })).toEqual([
      'items',
      'list',
      { filters: { q: 'abc' } },
    ]);
    expect(QueryKeys.items.detail('item-1')).toEqual([
      'items',
      'detail',
      'item-1',
    ]);
    expect(QueryKeys.items.search('para', { active: true })).toEqual([
      'items',
      'search',
      'para',
      { filters: { active: true } },
    ]);
    expect(QueryKeys.items.byCategory('cat-1')).toEqual([
      'items',
      'byCategory',
      'cat-1',
    ]);
    expect(QueryKeys.items.byType('type-1')).toEqual([
      'items',
      'byType',
      'type-1',
    ]);
    expect(QueryKeys.items.lowStock(5)).toEqual(['items', 'lowStock', 5]);
    expect(QueryKeys.items.checkCode('A1', 'item-2')).toEqual([
      'items',
      'checkCode',
      'A1',
      'item-2',
    ]);
    expect(QueryKeys.items.checkBarcode('B1')).toEqual([
      'items',
      'checkBarcode',
      'B1',
      undefined,
    ]);
    expect(QueryKeys.items.packageConversions('item-1')).toEqual([
      'items',
      'detail',
      'item-1',
      'packageConversions',
    ]);

    expect(QueryKeys.purchases.list({ paid: false })).toEqual([
      'purchases',
      'list',
      { filters: { paid: false } },
    ]);
    expect(QueryKeys.purchases.paginated(2, 'vendor', 25)).toEqual([
      'purchases',
      2,
      'vendor',
      25,
    ]);
    expect(QueryKeys.purchases.detail('p-1')).toEqual([
      'purchases',
      'detail',
      'p-1',
    ]);
    expect(QueryKeys.purchases.items('p-1')).toEqual([
      'purchases',
      'detail',
      'p-1',
      'items',
    ]);
    expect(QueryKeys.purchases.bySupplier('s-1')).toEqual([
      'purchases',
      'bySupplier',
      's-1',
    ]);
    expect(QueryKeys.purchases.byPaymentStatus('pending')).toEqual([
      'purchases',
      'byPaymentStatus',
      'pending',
    ]);
    expect(QueryKeys.purchases.byDateRange('2025-01-01', '2025-01-31')).toEqual(
      ['purchases', 'byDateRange', '2025-01-01', '2025-01-31']
    );
    expect(QueryKeys.purchases.checkInvoice('INV-1')).toEqual([
      'purchases',
      'checkInvoice',
      'INV-1',
      undefined,
    ]);

    expect(QueryKeys.sales.list({ cashier: 'u1' })).toEqual([
      'sales',
      'list',
      { filters: { cashier: 'u1' } },
    ]);
    expect(QueryKeys.sales.detail('s-1')).toEqual(['sales', 'detail', 's-1']);
    expect(QueryKeys.sales.items('s-1')).toEqual([
      'sales',
      'detail',
      's-1',
      'items',
    ]);
  });

  it('builds master-data and people related keys', () => {
    expect(QueryKeys.masterData.categories.list({ active: true })).toEqual([
      'masterData',
      'categories',
      'list',
      { filters: { active: true } },
    ]);
    expect(QueryKeys.masterData.categories.detail('c-1')).toEqual([
      'masterData',
      'categories',
      'detail',
      'c-1',
    ]);
    expect(QueryKeys.masterData.types.list()).toEqual([
      'masterData',
      'types',
      'list',
      { filters: undefined },
    ]);
    expect(QueryKeys.masterData.types.details()).toEqual([
      'masterData',
      'types',
      'detail',
    ]);
    expect(QueryKeys.masterData.types.detail('t-1')).toEqual([
      'masterData',
      'types',
      'detail',
      't-1',
    ]);
    expect(QueryKeys.masterData.packages.lists()).toEqual([
      'masterData',
      'packages',
      'list',
    ]);
    expect(QueryKeys.masterData.packages.list({ primary: true })).toEqual([
      'masterData',
      'packages',
      'list',
      { filters: { primary: true } },
    ]);
    expect(QueryKeys.masterData.packages.detail('pkg-1')).toEqual([
      'masterData',
      'packages',
      'detail',
      'pkg-1',
    ]);
    expect(QueryKeys.masterData.suppliers.lists()).toEqual([
      'masterData',
      'suppliers',
      'list',
    ]);
    expect(QueryKeys.masterData.suppliers.list({ local: true })).toEqual([
      'masterData',
      'suppliers',
      'list',
      { filters: { local: true } },
    ]);
    expect(QueryKeys.masterData.suppliers.details()).toEqual([
      'masterData',
      'suppliers',
      'detail',
    ]);
    expect(QueryKeys.masterData.suppliers.detail('sup-1')).toEqual([
      'masterData',
      'suppliers',
      'detail',
      'sup-1',
    ]);
    expect(QueryKeys.masterData.suppliers.search('global')).toEqual([
      'masterData',
      'suppliers',
      'search',
      'global',
    ]);
    expect(QueryKeys.masterData.dosages.lists()).toEqual([
      'masterData',
      'dosages',
      'list',
    ]);
    expect(QueryKeys.masterData.dosages.list({ oral: true })).toEqual([
      'masterData',
      'dosages',
      'list',
      { filters: { oral: true } },
    ]);
    expect(QueryKeys.masterData.dosages.detail('dos-1')).toEqual([
      'masterData',
      'dosages',
      'detail',
      'dos-1',
    ]);
    expect(QueryKeys.masterData.manufacturers.details()).toEqual([
      'masterData',
      'manufacturers',
      'detail',
    ]);
    expect(QueryKeys.masterData.manufacturers.detail('m-1')).toEqual([
      'masterData',
      'manufacturers',
      'detail',
      'm-1',
    ]);
    expect(QueryKeys.masterData.manufacturers.list({ local: true })).toEqual([
      'masterData',
      'manufacturers',
      'list',
      { filters: { local: true } },
    ]);
    expect(QueryKeys.masterData.itemUnits.lists()).toEqual([
      'item_units',
      'list',
    ]);
    expect(QueryKeys.masterData.itemUnits.list({ unit: 'tablet' })).toEqual([
      'item_units',
      'list',
      { filters: { unit: 'tablet' } },
    ]);
    expect(QueryKeys.masterData.itemUnits.detail('u-1')).toEqual([
      'item_units',
      'detail',
      'u-1',
    ]);

    expect(QueryKeys.patients.details()).toEqual(['patients', 'detail']);
    expect(QueryKeys.patients.detail('pt-1')).toEqual([
      'patients',
      'detail',
      'pt-1',
    ]);
    expect(QueryKeys.patients.search('ani')).toEqual([
      'patients',
      'list',
      { filters: undefined },
      'search',
      'ani',
    ]);
    expect(QueryKeys.patients.byGender('female')).toEqual([
      'patients',
      'list',
      { filters: undefined },
      'gender',
      'female',
    ]);
    expect(QueryKeys.patients.recent(3)).toEqual([
      'patients',
      'list',
      { filters: undefined },
      'recent',
      3,
    ]);
    expect(QueryKeys.doctors.details()).toEqual(['doctors', 'detail']);
    expect(QueryKeys.doctors.detail('doc-1')).toEqual([
      'doctors',
      'detail',
      'doc-1',
    ]);
    expect(QueryKeys.doctors.search('ger')).toEqual([
      'doctors',
      'list',
      { filters: undefined },
      'search',
      'ger',
    ]);
    expect(QueryKeys.doctors.bySpecialization('cardio')).toEqual([
      'doctors',
      'list',
      { filters: undefined },
      'specialization',
      'cardio',
    ]);
    expect(QueryKeys.doctors.byExperience(10)).toEqual([
      'doctors',
      'list',
      { filters: undefined },
      'experience',
      10,
    ]);
    expect(QueryKeys.doctors.recent(4)).toEqual([
      'doctors',
      'list',
      { filters: undefined },
      'recent',
      4,
    ]);
    expect(QueryKeys.customers.lists()).toEqual(['customers', 'list']);
    expect(QueryKeys.customers.list({ walkIn: true })).toEqual([
      'customers',
      'list',
      { filters: { walkIn: true } },
    ]);
    expect(QueryKeys.customers.details()).toEqual(['customers', 'detail']);
    expect(QueryKeys.customers.detail('cus-1')).toEqual([
      'customers',
      'detail',
      'cus-1',
    ]);
    expect(QueryKeys.customers.search('walk-in')).toEqual([
      'customers',
      'search',
      'walk-in',
    ]);
  });

  it('builds dashboard, users and helper invalidation keys', () => {
    expect(QueryKeys.users.list({ role: 'admin' })).toEqual([
      'users',
      'list',
      { filters: { role: 'admin' } },
    ]);
    expect(QueryKeys.users.lists()).toEqual(['users', 'list']);
    expect(QueryKeys.users.details()).toEqual(['users', 'detail']);
    expect(QueryKeys.users.detail('u-1')).toEqual(['users', 'detail', 'u-1']);
    expect(QueryKeys.users.profile).toEqual(['users', 'profile']);
    expect(QueryKeys.companyProfile.detail).toEqual([
      'companyProfile',
      'detail',
    ]);
    expect(QueryKeys.dashboard.stats).toEqual(['dashboard', 'stats']);
    expect(QueryKeys.dashboard.topSellingMedicines).toEqual([
      'dashboard',
      'topSellingMedicines',
    ]);
    expect(QueryKeys.dashboard.stockAlerts).toEqual([
      'dashboard',
      'stockAlerts',
    ]);
    expect(QueryKeys.dashboard.monthlyRevenue).toEqual([
      'dashboard',
      'monthlyRevenue',
    ]);
    expect(QueryKeys.dashboard.salesAnalytics('monthly')).toEqual([
      'dashboard',
      'salesAnalytics',
      'monthly',
    ]);
    expect(QueryKeys.dashboard.recentTransactions(7)).toEqual([
      'dashboard',
      'recentTransactions',
      7,
    ]);
    expect(QueryKeys.apiMetrics.lists()).toEqual(['apiMetrics', 'list']);
    expect(QueryKeys.apiMetrics.list({ path: '/items' })).toEqual([
      'apiMetrics',
      'list',
      { filters: { path: '/items' } },
    ]);
    expect(QueryKeys.tables.byName('dynamic_table')).toEqual(['dynamic_table']);

    expect(getInvalidationKeys.items.all()).toEqual([['items']]);
    expect(getInvalidationKeys.items.related()).toEqual([
      ['items'],
      ['dashboard'],
    ]);
    expect(getInvalidationKeys.purchases.related()).toEqual([
      ['purchases'],
      ['items'],
      ['dashboard'],
    ]);
    expect(getInvalidationKeys.purchases.all()).toEqual([['purchases']]);
    expect(getInvalidationKeys.sales.related()).toEqual([
      ['sales'],
      ['items'],
      ['dashboard'],
    ]);
    expect(getInvalidationKeys.sales.all()).toEqual([['sales']]);
    expect(getInvalidationKeys.masterData.categories()).toEqual([
      ['masterData', 'categories'],
      ['items'],
    ]);
    expect(getInvalidationKeys.masterData.types()).toEqual([
      ['masterData', 'types'],
      ['items'],
    ]);
    expect(getInvalidationKeys.masterData.packages()).toEqual([
      ['masterData', 'packages'],
      ['items'],
    ]);
    expect(getInvalidationKeys.masterData.suppliers()).toEqual([
      ['masterData', 'suppliers'],
      ['purchases'],
    ]);
    expect(getInvalidationKeys.masterData.dosages()).toEqual([
      ['masterData', 'dosages'],
      ['items'],
    ]);
    expect(getInvalidationKeys.masterData.manufacturers()).toEqual([
      ['masterData', 'manufacturers'],
      ['items'],
    ]);
    expect(getInvalidationKeys.masterData.itemUnits()).toEqual([
      ['item_units'],
      ['items'],
    ]);
    expect(getInvalidationKeys.patients.related()).toEqual([
      ['patients'],
      ['sales'],
    ]);
    expect(getInvalidationKeys.patients.all()).toEqual([['patients']]);
    expect(getInvalidationKeys.doctors.related()).toEqual([
      ['doctors'],
      ['sales'],
    ]);
    expect(getInvalidationKeys.doctors.all()).toEqual([['doctors']]);
    expect(getInvalidationKeys.customers.related()).toEqual([
      ['customers'],
      ['sales'],
    ]);
    expect(getInvalidationKeys.customers.all()).toEqual([['customers']]);
  });
});
