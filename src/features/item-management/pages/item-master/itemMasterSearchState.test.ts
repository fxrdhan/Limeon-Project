import { describe, expect, it } from 'vite-plus/test';
import type { MasterDataType } from '../../shared/types';
import {
  getActiveItemMasterSearchRuntime,
  getItemMasterSearchRuntimeKey,
  type ItemMasterSearchRuntimeKey,
} from './itemMasterSearchState';

describe('item master search state helpers', () => {
  it.each([
    ['items', 'items'],
    ['suppliers', 'suppliers'],
    ['customers', 'customers'],
    ['patients', 'patients'],
    ['doctors', 'doctors'],
    ['categories', 'itemEntity'],
    ['types', 'itemEntity'],
    ['packages', 'itemEntity'],
    ['dosages', 'itemEntity'],
    ['manufacturers', 'itemEntity'],
    ['units', 'itemEntity'],
  ] as Array<[MasterDataType, ItemMasterSearchRuntimeKey]>)(
    'maps %s to the %s search runtime',
    (activeTab, runtimeKey) => {
      expect(getItemMasterSearchRuntimeKey(activeTab)).toBe(runtimeKey);
    }
  );

  it('selects a value from the active search runtime map', () => {
    expect(
      getActiveItemMasterSearchRuntime('patients', {
        items: 'items-search',
        suppliers: 'suppliers-search',
        customers: 'customers-search',
        patients: 'patients-search',
        doctors: 'doctors-search',
        itemEntity: 'entity-search',
      })
    ).toBe('patients-search');

    expect(
      getActiveItemMasterSearchRuntime('categories', {
        items: 'items-search',
        suppliers: 'suppliers-search',
        customers: 'customers-search',
        patients: 'patients-search',
        doctors: 'doctors-search',
        itemEntity: 'entity-search',
      })
    ).toBe('entity-search');
  });
});
