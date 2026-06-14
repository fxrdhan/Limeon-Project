import { describe, expect, it } from 'vite-plus/test';
import { QueryKeys } from '../constants/queryKeys';
import {
  getCriticalPersistedQueryKeys,
  shouldPersistQueryRootKey,
} from './indexedDBPersistencePolicy';

describe('indexedDB persistence policy', () => {
  it('allows only stable master-data and item query roots to persist', () => {
    expect(shouldPersistQueryRootKey('masterData')).toBe(true);
    expect(shouldPersistQueryRootKey('items')).toBe(true);
    expect(shouldPersistQueryRootKey('item_units')).toBe(true);

    expect(shouldPersistQueryRootKey('sales')).toBe(false);
    expect(shouldPersistQueryRootKey('purchases')).toBe(false);
    expect(shouldPersistQueryRootKey(null)).toBe(false);
  });

  it('returns the critical query keys loaded during persistence bootstrap', () => {
    expect(getCriticalPersistedQueryKeys(QueryKeys)).toEqual([
      QueryKeys.items.list(undefined),
      QueryKeys.masterData.categories.list(undefined),
      QueryKeys.masterData.types.list(undefined),
      QueryKeys.masterData.packages.list(undefined),
      QueryKeys.masterData.dosages.list(undefined),
      QueryKeys.masterData.manufacturers.list(undefined),
      QueryKeys.masterData.itemUnits.list(undefined),
    ]);
  });
});
