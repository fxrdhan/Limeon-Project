import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddItemPageHandlers } from './useItemPageHandlers';

const useAddItemFormMock = vi.hoisted(() => vi.fn());
const useAddItemRefsMock = vi.hoisted(() => vi.fn());
const useAddItemUIStateMock = vi.hoisted(() => vi.fn());
const useItemQueriesMock = vi.hoisted(() => vi.fn());
const useAddItemEventHandlersMock = vi.hoisted(() => vi.fn());

const addItemFormMock = {
  setCategories: vi.fn(),
  setTypes: vi.fn(),
  setPackages: vi.fn(),
  setUnits: vi.fn(),
  setDosages: vi.fn(),
  setManufacturers: vi.fn(),
  resetForm: vi.fn(),
  currentSearchTermForModal: 'aspirin',
  handleAddNewCategory: vi.fn(),
  handleAddNewType: vi.fn(),
  handleAddNewUnit: vi.fn(),
  closeModalAndClearSearch: vi.fn(),
  dosages: [{ id: 'dos-1', name: 'Tablet' }],
  isAddDosageModalOpen: false,
  setIsAddDosageModalOpen: vi.fn(),
  handleAddNewDosage: vi.fn(),
  handleSaveDosage: vi.fn(),
  addDosageMutation: { mutate: vi.fn() },
  manufacturers: [{ id: 'man-1', name: 'Produsen A' }],
  isAddManufacturerModalOpen: false,
  setIsAddManufacturerModalOpen: vi.fn(),
  handleAddNewManufacturer: vi.fn(),
  handleSaveManufacturer: vi.fn(),
  addManufacturerMutation: { mutate: vi.fn() },
};

const eventHandlersMock = {
  handleSelectChange: vi.fn(),
  handleDropdownChange: vi.fn(),
  handleMarginChange: vi.fn(),
  handleSellPriceChange: vi.fn(),
  startEditingMargin: vi.fn(),
  stopEditingMargin: vi.fn(),
  handleMarginKeyDown: vi.fn(),
  startEditingMinStock: vi.fn(),
  stopEditingMinStock: vi.fn(),
  handleMinStockChange: vi.fn(),
  handleMinStockKeyDown: vi.fn(),
  handleActualCancel: vi.fn(),
};

vi.mock('../core/useItemCrud', () => ({
  useAddItemForm: useAddItemFormMock,
}));

vi.mock('../ui/useRefs', () => ({
  useAddItemRefs: useAddItemRefsMock,
}));

vi.mock('../ui/useUIState', () => ({
  useAddItemUIState: useAddItemUIStateMock,
}));

vi.mock('../core/useItemQueries', () => ({
  useItemQueries: useItemQueriesMock,
}));

vi.mock('../ui/useEventHandlers', () => ({
  useAddItemEventHandlers: useAddItemEventHandlersMock,
}));

describe('useAddItemPageHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAddItemFormMock.mockReturnValue(addItemFormMock);
    useAddItemRefsMock.mockReturnValue({
      descriptionRef: { current: null },
      marginInputRef: { current: null },
      minStockInputRef: { current: null },
    });
    useAddItemUIStateMock.mockReturnValue({
      isClosing: false,
      setIsClosing: vi.fn(),
      showDescription: false,
      setShowDescription: vi.fn(),
      isDescriptionHovered: false,
      setIsDescriptionHovered: vi.fn(),
      showFefoTooltip: false,
      setShowFefoTooltip: vi.fn(),
    });
    useItemQueriesMock.mockReturnValue({
      categoriesData: [{ id: 'cat-1', name: 'Kategori A' }],
      typesData: [{ id: 'type-1', name: 'Tipe A' }],
      packagesData: [{ id: 'pkg-1', name: 'Box' }],
      unitsData: [{ id: 'unit-1', name: 'Strip' }],
      dosagesData: [{ id: 'dos-1', name: 'Tablet' }],
      manufacturersData: [{ id: 'man-1', name: 'Produsen A' }],
    });
    useAddItemEventHandlersMock.mockReturnValue(eventHandlersMock);
  });

  it('hydrates add-item form datasets from query hooks and exposes expected handlers', () => {
    const props = {
      itemId: 'item-1',
      initialItemData: null,
      initialSearchQuery: 'query',
      onClose: vi.fn(),
      refetchItems: vi.fn(),
      expiryCheckboxRef: { current: null },
    };

    const { result } = renderHook(() => useAddItemPageHandlers(props));

    expect(useAddItemFormMock).toHaveBeenCalledWith({
      itemId: 'item-1',
      initialItemData: null,
      initialSearchQuery: 'query',
      onClose: props.onClose,
      refetchItems: props.refetchItems,
    });

    expect(addItemFormMock.setCategories).toHaveBeenCalledWith([
      { id: 'cat-1', name: 'Kategori A' },
    ]);
    expect(addItemFormMock.setTypes).toHaveBeenCalledWith([
      { id: 'type-1', name: 'Tipe A' },
    ]);
    expect(addItemFormMock.setPackages).toHaveBeenCalledWith([
      { id: 'pkg-1', name: 'Box' },
    ]);
    expect(addItemFormMock.setUnits).toHaveBeenCalledWith([
      { id: 'unit-1', name: 'Strip' },
    ]);
    expect(addItemFormMock.setDosages).toHaveBeenCalledWith([
      { id: 'dos-1', name: 'Tablet' },
    ]);
    expect(addItemFormMock.setManufacturers).toHaveBeenCalledWith([
      { id: 'man-1', name: 'Produsen A' },
    ]);

    expect(result.current.id).toBe('item-1');
    expect(result.current.resetForm).toBe(addItemFormMock.resetForm);
    expect(result.current.handleMarginChange).toBe(
      eventHandlersMock.handleMarginChange
    );
    expect(result.current.handleSellPriceChange).toBe(
      eventHandlersMock.handleSellPriceChange
    );
    expect(result.current.handleAddNewManufacturer).toBe(
      addItemFormMock.handleAddNewManufacturer
    );
    expect(result.current.dosages).toEqual([{ id: 'dos-1', name: 'Tablet' }]);
  });

  it('does not call form setters when query data is absent and routes cancel handler properly', () => {
    const setIsClosing = vi.fn();

    useAddItemUIStateMock.mockReturnValue({
      isClosing: false,
      setIsClosing,
      showDescription: false,
      setShowDescription: vi.fn(),
      isDescriptionHovered: false,
      setIsDescriptionHovered: vi.fn(),
      showFefoTooltip: false,
      setShowFefoTooltip: vi.fn(),
    });

    useItemQueriesMock.mockReturnValue({
      categoriesData: undefined,
      typesData: undefined,
      packagesData: undefined,
      unitsData: undefined,
      dosagesData: undefined,
      manufacturersData: undefined,
    });

    const { result } = renderHook(() =>
      useAddItemPageHandlers({
        itemId: 'item-2',
        initialItemData: null,
        initialSearchQuery: '',
        onClose: vi.fn(),
      })
    );

    expect(addItemFormMock.setCategories).not.toHaveBeenCalled();
    expect(addItemFormMock.setTypes).not.toHaveBeenCalled();
    expect(addItemFormMock.setPackages).not.toHaveBeenCalled();
    expect(addItemFormMock.setUnits).not.toHaveBeenCalled();
    expect(addItemFormMock.setDosages).not.toHaveBeenCalled();
    expect(addItemFormMock.setManufacturers).not.toHaveBeenCalled();

    result.current.handleCancel();
    expect(eventHandlersMock.handleActualCancel).toHaveBeenCalledWith(
      setIsClosing
    );

    const externalClosingSetter = vi.fn();
    result.current.handleCancel(externalClosingSetter);
    expect(eventHandlersMock.handleActualCancel).toHaveBeenCalledWith(
      externalClosingSetter
    );
  });
});
