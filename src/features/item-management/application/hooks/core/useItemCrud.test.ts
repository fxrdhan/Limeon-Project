import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddItemForm } from './useItemCrud';

const useAddItemFormStateMock = vi.hoisted(() => vi.fn());
const usePackageConversionMock = vi.hoisted(() => vi.fn());
const useAddItemMutationsMock = vi.hoisted(() => vi.fn());
const useItemDataMock = vi.hoisted(() => vi.fn());
const useItemCacheManagerMock = vi.hoisted(() => vi.fn());
const useItemModalOrchestratorMock = vi.hoisted(() => vi.fn());
const useItemFormHandlersMock = vi.hoisted(() => vi.fn());
const useItemUserInteractionsMock = vi.hoisted(() => vi.fn());
const useItemFormResetMock = vi.hoisted(() => vi.fn());
const useItemPricingLogicMock = vi.hoisted(() => vi.fn());

const formatDateTimeMock = vi.hoisted(() => vi.fn());
const loggerInfoMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../form/useItemFormState', () => ({
  useAddItemFormState: useAddItemFormStateMock,
}));

vi.mock('../utils/usePackageConversion', () => ({
  usePackageConversion: usePackageConversionMock,
}));

vi.mock('./useItemMutations', () => ({
  useAddItemMutations: useAddItemMutationsMock,
}));

vi.mock('../data/useItemData', () => ({
  useItemData: useItemDataMock,
}));

vi.mock('../form', () => ({
  useItemModalOrchestrator: useItemModalOrchestratorMock,
  useItemCacheManager: useItemCacheManagerMock,
  useItemFormHandlers: useItemFormHandlersMock,
  useItemUserInteractions: useItemUserInteractionsMock,
  useItemFormReset: useItemFormResetMock,
}));

vi.mock('../utils', () => ({
  useItemPricingLogic: useItemPricingLogicMock,
}));

vi.mock('@/lib/formatters', () => ({
  formatDateTime: formatDateTimeMock,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: loggerInfoMock,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

type MockFormState = ReturnType<typeof createFormStateMock>;
type MockPackageHook = ReturnType<typeof createPackageHookMock>;

type ConversionUnit = { id: string; name: string };

type MockMutation = {
  mutateAsync: ReturnType<typeof vi.fn>;
};

const createFormStateMock = () => ({
  formData: {
    code: 'ITM-001',
    name: 'Item Test',
    package_id: 'pkg-1',
    unit_id: 'unit-1',
    quantity: 1,
    base_price: 1000,
    sell_price: 1500,
    updated_at: '2025-01-01T10:00:00.000Z',
  },
  displayBasePrice: 'Rp1.000',
  displaySellPrice: 'Rp1.500',
  categories: [],
  types: [],
  packages: [{ id: 'pkg-1', name: 'Box' }],
  units: [{ id: 'unit-1', name: 'Box' }],
  dosages: [],
  manufacturers: [],
  loading: false,
  saving: false,
  isEditMode: false,
  isAddEditModalOpen: false,
  setIsAddEditModalOpen: vi.fn(),
  isAddTypeModalOpen: false,
  setIsAddTypeModalOpen: vi.fn(),
  isAddUnitModalOpen: false,
  setIsAddUnitModalOpen: vi.fn(),
  isAddDosageModalOpen: false,
  setIsAddDosageModalOpen: vi.fn(),
  isAddManufacturerModalOpen: false,
  setIsAddManufacturerModalOpen: vi.fn(),
  editingMargin: false,
  setEditingMargin: vi.fn(),
  marginPercentage: '50.0',
  setMarginPercentage: vi.fn(),
  editingMinStock: false,
  setEditingMinStock: vi.fn(),
  minStockValue: '10',
  setMinStockValue: vi.fn(),
  currentSearchTermForModal: undefined as string | undefined,
  setCurrentSearchTermForModal: vi.fn(),
  updateFormData: vi.fn(),
  setFormData: vi.fn(),
  setInitialFormData: vi.fn(),
  initialFormData: { name: 'Initial' },
  setInitialPackageConversions: vi.fn(),
  initialPackageConversions: [],
  setCategories: vi.fn(),
  setTypes: vi.fn(),
  setPackages: vi.fn(),
  setUnits: vi.fn(),
  setDosages: vi.fn(),
  setManufacturers: vi.fn(),
  setLoading: vi.fn(),
  setSaving: vi.fn(),
  setIsEditMode: vi.fn(),
  setDisplayBasePrice: vi.fn(),
  setDisplaySellPrice: vi.fn(),
  handleChange: vi.fn(),
  handleSelectChange: vi.fn(),
  isDirty: vi.fn(() => true),
  resetForm: vi.fn(),
  setInitialDataForForm: vi.fn(),
  hasInitialized: { current: false },
});

const createPackageHookMock = () => ({
  conversions: [] as Array<{
    id: string;
    unit: ConversionUnit;
    unit_name: string;
    to_unit_id: string;
    conversion_rate: number;
    base_price: number;
    sell_price: number;
  }>,
  availableUnits: [] as ConversionUnit[],
  packageConversionFormData: {
    unit: '',
    conversion_rate: 0,
  },
  baseUnit: '',
  basePrice: 1000,
  sellPrice: 1500,
  setConversions: vi.fn(),
  setBaseUnit: vi.fn(),
  setBasePrice: vi.fn(),
  setSellPrice: vi.fn(),
  recalculateBasePrices: vi.fn(),
});

const createMutationsMock = () => {
  const saveItemMutation: MockMutation = {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  };

  return {
    addCategoryMutation: { isPending: false },
    addTypeMutation: { isPending: false },
    addUnitMutation: { isPending: false },
    addDosageMutation: { isPending: false },
    addManufacturerMutation: { isPending: false },
    deleteItemMutation: { isPending: false },
    saveItemMutation,
    saveCategory: vi.fn(),
    saveType: vi.fn(),
    saveUnit: vi.fn(),
    saveDosage: vi.fn(),
    saveManufacturer: vi.fn(),
  };
};

describe('useAddItemForm', () => {
  let formStateMock: MockFormState;
  let packageHookMock: MockPackageHook;
  let mutationsMock: ReturnType<typeof createMutationsMock>;
  let cacheMock: {
    clearCache: ReturnType<typeof vi.fn>;
    loadFromCache: ReturnType<typeof vi.fn>;
    updateCacheWithSearchQuery: ReturnType<typeof vi.fn>;
    saveToCache: ReturnType<typeof vi.fn>;
  };
  let itemDataMock: {
    hydrateItemData: ReturnType<typeof vi.fn>;
    fetchItemData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    formStateMock = createFormStateMock();
    packageHookMock = createPackageHookMock();
    mutationsMock = createMutationsMock();

    cacheMock = {
      clearCache: vi.fn(),
      loadFromCache: vi.fn().mockReturnValue(null),
      updateCacheWithSearchQuery: vi.fn(),
      saveToCache: vi.fn(),
    };

    itemDataMock = {
      hydrateItemData: vi.fn(),
      fetchItemData: vi.fn(),
    };

    useAddItemFormStateMock.mockReturnValue(formStateMock);
    usePackageConversionMock.mockReturnValue(packageHookMock);
    useAddItemMutationsMock.mockReturnValue(mutationsMock);
    useItemDataMock.mockReturnValue(itemDataMock);
    useItemCacheManagerMock.mockReturnValue(cacheMock);
    useItemPricingLogicMock.mockReturnValue({
      calculateProfitPercentage: vi.fn(() => 50),
      calculateSellPriceFromMargin: vi.fn(() => 1500),
    });
    useItemFormHandlersMock.mockReturnValue({
      handleChange: vi.fn(),
      handleSelectChange: vi.fn(),
    });
    useItemUserInteractionsMock.mockReturnValue({
      handleDeleteItem: vi.fn(),
      handleCancel: vi.fn(),
      isDirty: vi.fn(() => false),
      confirmDialog: {
        show: vi.fn(),
      },
    });
    useItemFormResetMock.mockReturnValue({
      resetForm: vi.fn(),
    });
    useItemModalOrchestratorMock.mockReturnValue({
      handleSaveCategory: vi.fn(),
      handleSaveType: vi.fn(),
      handleSaveUnit: vi.fn(),
      handleSaveDosage: vi.fn(),
      handleSaveManufacturer: vi.fn(),
      handleAddNewCategory: vi.fn(),
      handleAddNewType: vi.fn(),
      handleAddNewUnit: vi.fn(),
      handleAddNewDosage: vi.fn(),
      handleAddNewManufacturer: vi.fn(),
      closeModalAndClearSearch: vi.fn(),
    });

    formatDateTimeMock.mockReturnValue('01/01/2025 10:00');
    loggerInfoMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('hydrates from cache in create mode and blocks submit on invalid pending conversion unit', async () => {
    cacheMock.loadFromCache.mockReturnValue({
      formData: {
        ...formStateMock.formData,
        quantity: undefined,
        unit_id: undefined,
      },
      conversions: [],
    });

    cacheMock.updateCacheWithSearchQuery.mockReturnValue({
      formData: {
        ...formStateMock.formData,
        name: 'Dari Cache',
        quantity: undefined,
        unit_id: undefined,
      },
      conversions: [{ id: 'conv-1' }],
    });

    packageHookMock.packageConversionFormData = {
      unit: 'Tidak Ada',
      conversion_rate: 2,
    };
    packageHookMock.availableUnits = [{ id: 'unit-x', name: 'Strip' }];

    const { result } = renderHook(() =>
      useAddItemForm({
        initialSearchQuery: 'Paracetamol',
        onClose: vi.fn(),
      })
    );

    expect(formStateMock.setInitialDataForForm).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Dari Cache',
        quantity: 0,
        unit_id: '',
      })
    );
    expect(packageHookMock.setConversions).toHaveBeenCalledWith([
      { id: 'conv-1' },
    ]);
    expect(formStateMock.setInitialPackageConversions).toHaveBeenCalledWith([
      { id: 'conv-1' },
    ]);

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(toastErrorMock).toHaveBeenCalledWith('Kemasan tidak valid!');
    expect(mutationsMock.saveItemMutation.mutateAsync).not.toHaveBeenCalled();
    expect(result.current.formattedUpdateAt).toBe('01/01/2025 10:00');
  });

  it('runs edit-mode initialization and submits with derived pending conversion payload', async () => {
    formStateMock.isEditMode = true;
    packageHookMock.baseUnit = '';
    packageHookMock.availableUnits = [
      { id: 'unit-strip', name: 'Strip' },
      { id: 'unit-box', name: 'Box' },
    ];
    packageHookMock.packageConversionFormData = {
      unit: 'Strip',
      conversion_rate: 5,
    };
    packageHookMock.conversions = [
      {
        id: 'conv-existing',
        unit: { id: 'unit-tablet', name: 'Tablet' },
        unit_name: 'Tablet',
        to_unit_id: 'unit-tablet',
        conversion_rate: 10,
        base_price: 100,
        sell_price: 150,
      },
    ];

    const { result } = renderHook(() =>
      useAddItemForm({
        itemId: 'item-1',
        initialItemData: {
          id: 'item-1',
        } as never,
        onClose: vi.fn(),
      })
    );

    expect(formStateMock.setIsEditMode).toHaveBeenCalledWith(true);
    expect(itemDataMock.hydrateItemData).toHaveBeenCalled();
    expect(itemDataMock.fetchItemData).toHaveBeenCalledWith('item-1');
    expect(cacheMock.clearCache).toHaveBeenCalled();

    expect(packageHookMock.recalculateBasePrices).toHaveBeenCalled();
    expect(packageHookMock.setSellPrice).toHaveBeenCalledWith(
      formStateMock.formData.sell_price
    );
    expect(packageHookMock.setBaseUnit).toHaveBeenCalledWith('Box');

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(loggerInfoMock).toHaveBeenCalledWith(
      'Submitting item update to Supabase',
      expect.objectContaining({
        itemId: 'item-1',
      })
    );

    expect(mutationsMock.saveItemMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        isEditMode: true,
        itemId: 'item-1',
        baseUnit: '',
        conversions: expect.arrayContaining([
          expect.objectContaining({
            unit_name: 'Strip',
            conversion_rate: 5,
            base_price: 200,
            sell_price: 300,
          }),
        ]),
      })
    );

    expect(cacheMock.clearCache.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('persists unsaved create-mode form into cache on unmount', () => {
    formStateMock.isEditMode = false;
    formStateMock.saving = false;
    formStateMock.isDirty = vi.fn(() => true);

    packageHookMock.conversions = [
      {
        id: 'conv-unsaved',
        unit: { id: 'unit-1', name: 'Box' },
        unit_name: 'Box',
        to_unit_id: 'unit-1',
        conversion_rate: 1,
        base_price: 1000,
        sell_price: 1500,
      },
    ];

    const { unmount } = renderHook(() =>
      useAddItemForm({
        onClose: vi.fn(),
      })
    );

    unmount();

    expect(cacheMock.saveToCache).toHaveBeenCalledWith(
      formStateMock.formData,
      packageHookMock.conversions
    );
  });
});
