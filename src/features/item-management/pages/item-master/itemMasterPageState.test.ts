import { describe, expect, it } from 'vite-plus/test';
import {
  getItemMasterCoordinatedSearchBarProps,
  getIsAnyMasterDataModalOpen,
  getItemMasterActiveEntityType,
  getItemMasterGridGroupingState,
  getItemMasterOtherMasterDataConfig,
  getItemMasterPageTitle,
  getItemMasterTabFlags,
  getItemMasterTabInteractionState,
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

  it('derives tab interaction state from item-master tab membership', () => {
    expect(getItemMasterTabInteractionState(true)).toEqual({
      showTabSelector: true,
      enableTabShortcuts: true,
    });
    expect(getItemMasterTabInteractionState(false)).toEqual({
      showTabSelector: false,
      enableTabShortcuts: false,
    });
  });

  it('keeps grid grouping enabled only for the item tab', () => {
    const itemGroupingState = getItemMasterGridGroupingState('items');
    expect(itemGroupingState).toEqual({
      defaultExpanded: -1,
      isRowGroupingEnabled: true,
      showGroupPanel: true,
    });

    const supplierGroupingState = getItemMasterGridGroupingState('suppliers');
    expect(supplierGroupingState).toEqual({
      defaultExpanded: 1,
      isRowGroupingEnabled: false,
      showGroupPanel: true,
    });
  });

  it('coordinates search selector props without dropping active search props', () => {
    const onChange = () => undefined;
    const onSelectorOpenChange = () => undefined;
    const ignoreRef = { current: null };
    const searchBarProps = {
      value: 'amoxicillin',
      onChange,
    };

    const coordinatedProps = getItemMasterCoordinatedSearchBarProps(
      searchBarProps,
      {
        onSelectorOpenChange,
        selectorOutsideIgnoreRefs: [ignoreRef],
        suppressSelectors: true,
      }
    );

    expect(coordinatedProps).toEqual({
      value: 'amoxicillin',
      onChange,
      onSelectorOpenChange,
      selectorOutsideIgnoreRefs: [ignoreRef],
      suppressSelectors: true,
    });
  });
});
