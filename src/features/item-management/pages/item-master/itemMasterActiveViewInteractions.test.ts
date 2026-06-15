import { describe, expect, it, vi } from 'vite-plus/test';
import type { ItemMasterActiveViewFlags } from './itemMasterActiveViewState';
import {
  getItemMasterActiveItemSelection,
  getItemMasterActiveKeyDownHandler,
  runItemMasterActiveAddAction,
} from './itemMasterActiveViewInteractions';

const baseFlags: ItemMasterActiveViewFlags = {
  isCustomerTab: false,
  isDoctorTab: false,
  isItemEntityTab: false,
  isItemTab: false,
  isOtherMasterTab: false,
  isPatientTab: false,
  isSupplierTab: false,
};

const flags = (
  overrides: Partial<ItemMasterActiveViewFlags>
): ItemMasterActiveViewFlags => ({
  ...baseFlags,
  ...overrides,
});

const createAddActions = () => ({
  activeSearchValue: 'parasetamol',
  handleAddItem: vi.fn(),
  openAddSupplierModal: vi.fn(),
  openAddEntityModal: vi.fn(),
  openAddCustomerModal: vi.fn(),
  openAddPatientModal: vi.fn(),
  openAddDoctorModal: vi.fn(),
});

describe('item master active view interactions', () => {
  it('runs the active add action for the active tab type', () => {
    const itemActions = createAddActions();
    runItemMasterActiveAddAction(flags({ isItemTab: true }), itemActions);
    expect(itemActions.handleAddItem).toHaveBeenCalledWith(
      undefined,
      'parasetamol'
    );

    const supplierActions = createAddActions();
    runItemMasterActiveAddAction(
      flags({ isSupplierTab: true }),
      supplierActions
    );
    expect(supplierActions.openAddSupplierModal).toHaveBeenCalledTimes(1);

    const customerActions = createAddActions();
    runItemMasterActiveAddAction(
      flags({ isCustomerTab: true }),
      customerActions
    );
    expect(customerActions.openAddCustomerModal).toHaveBeenCalledTimes(1);

    const patientActions = createAddActions();
    runItemMasterActiveAddAction(flags({ isPatientTab: true }), patientActions);
    expect(patientActions.openAddPatientModal).toHaveBeenCalledTimes(1);

    const doctorActions = createAddActions();
    runItemMasterActiveAddAction(flags({ isDoctorTab: true }), doctorActions);
    expect(doctorActions.openAddDoctorModal).toHaveBeenCalledTimes(1);

    const entityActions = createAddActions();
    runItemMasterActiveAddAction(
      flags({ isItemEntityTab: true }),
      entityActions
    );
    expect(entityActions.openAddEntityModal).toHaveBeenCalledTimes(1);
  });

  it('selects the active keydown handler for identity tabs', () => {
    const handlers = {
      handleCustomerKeyDown: vi.fn(),
      handlePatientKeyDown: vi.fn(),
      handleDoctorKeyDown: vi.fn(),
    };

    expect(
      getItemMasterActiveKeyDownHandler(
        flags({ isCustomerTab: true }),
        handlers
      )
    ).toBe(handlers.handleCustomerKeyDown);
    expect(
      getItemMasterActiveKeyDownHandler(flags({ isPatientTab: true }), handlers)
    ).toBe(handlers.handlePatientKeyDown);
    expect(
      getItemMasterActiveKeyDownHandler(flags({ isDoctorTab: true }), handlers)
    ).toBe(handlers.handleDoctorKeyDown);
    expect(getItemMasterActiveKeyDownHandler(flags({}), handlers)).toBe(
      undefined
    );
  });

  it('only enables item selection props on the item tab', () => {
    const itemsData = [{ id: 'item-1' }];
    const handleItemSelect = vi.fn();
    const activeItemSelection = getItemMasterActiveItemSelection(
      flags({ isItemTab: true }),
      { handleItemSelect, itemsData }
    );
    const inactiveItemSelection = getItemMasterActiveItemSelection(flags({}), {
      handleItemSelect,
      itemsData,
    });

    expect(activeItemSelection.activeItemsSelection).toBe(itemsData);
    expect(activeItemSelection.activeOnItemSelect).toBe(handleItemSelect);
    expect(inactiveItemSelection.activeItemsSelection).toBe(undefined);
    expect(inactiveItemSelection.activeOnItemSelect).toBe(undefined);
  });
});
