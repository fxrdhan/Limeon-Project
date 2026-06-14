import { describe, expect, it } from 'vite-plus/test';
import {
  getIsAnyMasterDataModalOpen,
  getItemMasterActiveEntityType,
  getItemMasterOtherMasterDataConfig,
  getItemMasterPageTitle,
  getItemMasterTabFlags,
  getItemMasterTabSelectorLayerClass,
} from './itemMasterPageState';

describe('item master page state helpers', () => {
  it('derives tab flags for item, entity, supplier, and other master-data tabs', () => {
    expect(getItemMasterTabFlags('items')).toMatchObject({
      isItemTab: true,
      isItemEntityTab: false,
      isItemMasterTab: true,
    });
    expect(getItemMasterTabFlags('categories')).toMatchObject({
      isItemTab: false,
      isItemEntityTab: true,
      isItemMasterTab: true,
    });
    expect(getItemMasterTabFlags('suppliers')).toMatchObject({
      isSupplierTab: true,
      isItemMasterTab: false,
    });
    expect(getItemMasterTabFlags('patients')).toMatchObject({
      isPatientTab: true,
      isOtherMasterTab: true,
    });
  });

  it('keeps the active entity fallback on categories outside entity tabs', () => {
    expect(getItemMasterActiveEntityType('units')).toBe('units');
    expect(getItemMasterActiveEntityType('suppliers')).toBe('categories');
  });

  it('derives page titles from supplier and other master-data config', () => {
    expect(getItemMasterPageTitle('suppliers', null)).toBe('Daftar Supplier');
    expect(getItemMasterPageTitle('patients', 'Daftar Pasien')).toBe(
      'Daftar Pasien'
    );
    expect(getItemMasterPageTitle('items', null)).toBe('Item Master');
    expect(getItemMasterOtherMasterDataConfig('doctors')?.title).toBe(
      'Daftar Dokter'
    );
    expect(getItemMasterOtherMasterDataConfig('items')).toBeNull();
  });

  it('derives modal overlay state and tab selector layer classes', () => {
    expect(
      getIsAnyMasterDataModalOpen({
        add: false,
        edit: false,
      })
    ).toBe(false);
    expect(
      getIsAnyMasterDataModalOpen({
        add: false,
        edit: true,
      })
    ).toBe(true);
    expect(getItemMasterTabSelectorLayerClass(false)).toBe('z-[70]');
    expect(getItemMasterTabSelectorLayerClass(true)).toBe('z-40');
  });
});
