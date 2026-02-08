import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemModal from './ItemModal';

const useAddItemPageHandlersMock = vi.hoisted(() => vi.fn());
const useItemFormValidationMock = vi.hoisted(() => vi.fn());
const useEntityHistoryMock = vi.hoisted(() => vi.fn());
const useItemModalRealtimeMock = vi.hoisted(() => vi.fn());
const useItemUIMock = vi.hoisted(() => vi.fn());
const useItemFormMock = vi.hoisted(() => vi.fn());
const useItemPriceMock = vi.hoisted(() => vi.fn());
const useItemActionsMock = vi.hoisted(() => vi.fn());
const useItemRealtimeMock = vi.hoisted(() => vi.fn());
const loggerDebugMock = vi.hoisted(() => vi.fn());
const loggerInfoMock = vi.hoisted(() => vi.fn());

const captured = vi.hoisted(() => ({
  providerValue: null as Record<string, unknown> | null,
  realtimeArgs: null as Record<string, unknown> | null,
  templateProps: null as Record<string, unknown> | null,
}));

vi.mock('@/hooks/realtime/useItemModalRealtime', () => ({
  useItemModalRealtime: useItemModalRealtimeMock,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: loggerDebugMock,
    info: loggerInfoMock,
  },
}));

vi.mock('../../../application/hooks/form/useItemPageHandlers', () => ({
  useAddItemPageHandlers: useAddItemPageHandlersMock,
}));

vi.mock('../../../application/hooks/form/useItemValidation', () => ({
  useItemFormValidation: useItemFormValidationMock,
}));

vi.mock('../../../application/hooks/instances/useEntityHistory', () => ({
  useEntityHistory: useEntityHistoryMock,
}));

vi.mock('../../../shared/contexts/ItemFormContext', () => ({
  ItemManagementProvider: ({
    value,
    children,
  }: {
    value: Record<string, unknown>;
    children: React.ReactNode;
  }) => {
    captured.providerValue = value;
    return <div data-testid="item-management-provider">{children}</div>;
  },
}));

vi.mock('../../../shared/contexts/useItemFormContext', () => ({
  useItemUI: useItemUIMock,
  useItemForm: useItemFormMock,
  useItemPrice: useItemPriceMock,
  useItemActions: useItemActionsMock,
  useItemRealtime: useItemRealtimeMock,
}));

vi.mock('../ItemFormSections', () => ({
  ItemFormSections: {
    Header: ({ onClose, onReset }: Record<string, unknown>) => (
      <div data-testid="section-header">
        <button type="button" onClick={() => (onReset as () => void)?.()}>
          header-reset
        </button>
        <button type="button" onClick={() => (onClose as () => void)?.()}>
          header-close
        </button>
      </div>
    ),
    BasicInfoRequired: () => <div data-testid="section-basic-required" />,
    BasicInfoOptional: ({
      onExpand,
      isExpanded,
    }: {
      onExpand?: () => void;
      isExpanded?: boolean;
    }) => (
      <div data-testid="section-optional">
        <div data-testid="optional-expanded">{String(isExpanded)}</div>
        <button type="button" onClick={() => onExpand?.()}>
          expand-optional
        </button>
      </div>
    ),
    Settings: ({
      onExpand,
      onRequestNextSection,
      isExpanded,
    }: {
      onExpand?: () => void;
      onRequestNextSection?: () => void;
      isExpanded?: boolean;
    }) => (
      <div data-testid="section-settings">
        <div data-testid="settings-expanded">{String(isExpanded)}</div>
        <button type="button" onClick={() => onExpand?.()}>
          expand-settings
        </button>
        <button type="button" onClick={() => onRequestNextSection?.()}>
          next-pricing
        </button>
      </div>
    ),
    Pricing: ({
      onExpand,
      onLevelPricingToggle,
      isExpanded,
    }: {
      onExpand?: () => void;
      onLevelPricingToggle?: (open: boolean) => void;
      isExpanded?: boolean;
    }) => (
      <div data-testid="section-pricing">
        <div data-testid="pricing-expanded">{String(isExpanded)}</div>
        <button type="button" onClick={() => onExpand?.()}>
          expand-pricing
        </button>
        <button type="button" onClick={() => onLevelPricingToggle?.(true)}>
          level-on
        </button>
        <button type="button" onClick={() => onLevelPricingToggle?.(false)}>
          level-off
        </button>
      </div>
    ),
    PackageConversion: ({
      onExpand,
      isExpanded,
    }: {
      onExpand?: () => void;
      isExpanded?: boolean;
    }) => (
      <div data-testid="section-conversion">
        <div data-testid="conversion-expanded">{String(isExpanded)}</div>
        <button type="button" onClick={() => onExpand?.()}>
          expand-conversion
        </button>
      </div>
    ),
  },
}));

vi.mock('../ItemModalTemplate', () => ({
  default: ({
    children,
    formAction,
    onBackdropClick,
    rightColumnProps,
  }: {
    children: Record<string, React.ReactNode>;
    formAction: Record<string, unknown>;
    onBackdropClick?: () => void;
    rightColumnProps?: Record<string, unknown>;
  }) => {
    captured.templateProps = {
      children,
      formAction,
      rightColumnProps,
    };
    return (
      <div data-testid="item-modal-template">
        <div data-testid="right-column" {...rightColumnProps} />
        <button type="button" onClick={() => onBackdropClick?.()}>
          backdrop
        </button>
        <button
          type="button"
          onClick={() =>
            (
              formAction.onCancel as ((...args: unknown[]) => void) | undefined
            )?.()
          }
        >
          form-cancel
        </button>
        {(formAction.onDelete as unknown) ? (
          <button
            type="button"
            onClick={() =>
              (
                formAction.onDelete as
                  | ((...args: unknown[]) => void)
                  | undefined
              )?.()
            }
          >
            form-delete
          </button>
        ) : null}
        {children.header}
        {children.basicInfoRequired}
        {children.basicInfoOptional}
        {children.settingsForm}
        {children.pricingForm}
        {children.packageConversionManager}
        {children.modals}
      </div>
    );
  },
}));

vi.mock('../containers/ItemModalContainer', () => ({
  default: () => <div data-testid="item-modal-container" />,
}));

const createHandlers = () => ({
  formData: {
    code: 'ITM-1',
    name: 'Paracetamol',
    base_price: 1000,
    sell_price: 1500,
    updated_at: '2026-02-08T00:00:00Z',
  },
  displayBasePrice: 'Rp 1000',
  displaySellPrice: 'Rp 1500',
  categories: [],
  types: [],
  packages: [{ id: 'pkg-1', name: 'Tablet' }],
  units: [],
  dosages: [],
  manufacturers: [],
  saving: false,
  loading: false,
  isEditMode: true,
  handleChange: vi.fn(),
  handleSubmit: vi.fn((event?: React.FormEvent) => event?.preventDefault()),
  updateFormData: vi.fn(),
  setInitialFormData: vi.fn(),
  setInitialPackageConversions: vi.fn(),
  resetForm: vi.fn(),
  isDirty: vi.fn(() => false),
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
  currentSearchTermForModal: '',
  handleAddNewCategory: vi.fn(),
  handleAddNewType: vi.fn(),
  handleAddNewUnit: vi.fn(),
  handleAddNewDosage: vi.fn(),
  handleAddNewManufacturer: vi.fn(),
  closeModalAndClearSearch: vi.fn(),
  handleCancel: vi.fn(),
  handleDeleteItem: vi.fn(),
  handleSaveCategory: vi.fn(),
  handleSaveType: vi.fn(),
  handleSaveUnit: vi.fn(),
  handleSaveDosage: vi.fn(),
  handleSaveManufacturer: vi.fn(),
  addCategoryMutation: { isPending: false },
  addTypeMutation: { isPending: false },
  addUnitMutation: { isPending: false },
  addDosageMutation: { isPending: false },
  addManufacturerMutation: { isPending: false },
  deleteItemMutation: { isPending: false },
  packageConversionHook: {
    basePrice: 1000,
    sellPrice: 1500,
    conversions: [],
    skipNextRecalculation: vi.fn(),
    setConversions: vi.fn(),
    setBaseUnit: vi.fn(),
  },
  formattedUpdateAt: '2026-02-08',
});

describe('ItemModal template/item', () => {
  beforeEach(() => {
    captured.providerValue = null;
    captured.realtimeArgs = null;
    captured.templateProps = null;

    useAddItemPageHandlersMock.mockReset();
    useItemFormValidationMock.mockReset();
    useEntityHistoryMock.mockReset();
    useItemModalRealtimeMock.mockReset();
    useItemUIMock.mockReset();
    useItemFormMock.mockReset();
    useItemPriceMock.mockReset();
    useItemActionsMock.mockReset();
    useItemRealtimeMock.mockReset();
    loggerDebugMock.mockReset();
    loggerInfoMock.mockReset();

    const handlers = createHandlers();
    const uiHook = {
      isOpen: true,
      isClosing: false,
      isEditMode: true,
      formattedUpdateAt: '2026-02-08',
      resetKey: 1,
      viewingVersionNumber: null,
      isViewingOldVersion: false,
      handleBackdropClick: vi.fn(),
      handleClose: vi.fn(),
      handleReset: vi.fn(),
      setIsClosing: vi.fn(),
    };
    const formHook = {
      formData: {
        ...handlers.formData,
        barcode: 'BR-1',
        quantity: 5,
        description: 'desc',
      },
      loading: false,
      handleSubmit: vi.fn((event?: React.FormEvent) => event?.preventDefault()),
    };
    const priceHook = {
      packageConversionHook: {
        conversions: [],
      },
    };
    const actionsHook = {
      handleCancel: vi.fn(),
      handleDeleteItem: vi.fn(),
      saving: false,
      deleteItemMutation: { isPending: false },
      finalDisabledState: false,
    };
    const realtimeHook = { isConnected: false };

    useAddItemPageHandlersMock.mockReturnValue(handlers);
    useItemFormValidationMock.mockReturnValue({ finalDisabledState: false });
    useEntityHistoryMock.mockReturnValue({
      history: [{ version_number: 2 }],
      isLoading: false,
      error: null,
    });
    useItemModalRealtimeMock.mockImplementation(args => {
      captured.realtimeArgs = args as Record<string, unknown>;
      return {
        smartFormSync: {
          registerActiveField: vi.fn(),
          unregisterActiveField: vi.fn(),
        },
        isConnected: true,
      };
    });
    useItemUIMock.mockReturnValue(uiHook);
    useItemFormMock.mockReturnValue(formHook);
    useItemPriceMock.mockReturnValue(priceHook);
    useItemActionsMock.mockReturnValue(actionsHook);
    useItemRealtimeMock.mockReturnValue(realtimeHook);
  });

  it('builds provider context and handles realtime smart update payloads', () => {
    const onClose = vi.fn();
    const setIsClosing = vi.fn();

    render(
      <ItemModal
        isOpen={true}
        onClose={onClose}
        itemId="item-1"
        isClosing={false}
        setIsClosing={setIsClosing}
        refetchItems={vi.fn()}
      />
    );

    expect(captured.providerValue).toBeTruthy();
    expect(captured.realtimeArgs).toBeTruthy();

    const realtimeArgs = captured.realtimeArgs as {
      onSmartUpdate: (updates: Record<string, unknown>) => void;
      onItemDeleted: () => void;
    };

    realtimeArgs.onSmartUpdate({
      package_conversions: JSON.stringify([
        {
          id: 'conv-1',
          to_unit_id: 'pkg-1',
          unit_name: 'Tablet',
          conversion_rate: 2,
          base_price: 0,
          sell_price: 0,
        },
      ]),
      name: 'Nama Baru',
    });

    const handlers = useAddItemPageHandlersMock();
    expect(
      handlers.packageConversionHook.skipNextRecalculation
    ).toHaveBeenCalled();
    expect(handlers.packageConversionHook.setConversions).toHaveBeenCalled();
    expect(handlers.setInitialPackageConversions).toHaveBeenCalled();
    expect(handlers.updateFormData).toHaveBeenCalledWith({ name: 'Nama Baru' });
    expect(handlers.setInitialFormData).toHaveBeenCalled();
    expect(loggerDebugMock).toHaveBeenCalled();

    realtimeArgs.onItemDeleted();
    expect(setIsClosing).toHaveBeenCalledWith(true);
  });

  it('handles reset shortcut in add mode and closes when isClosing is true', () => {
    const handlers = createHandlers();
    handlers.isEditMode = false;
    useAddItemPageHandlersMock.mockReturnValue(handlers);

    const onClose = vi.fn();
    const { rerender } = render(
      <ItemModal
        isOpen={true}
        onClose={onClose}
        itemId={undefined}
        isClosing={false}
        setIsClosing={vi.fn()}
        refetchItems={vi.fn()}
      />
    );

    fireEvent.keyDown(document, {
      key: 'R',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(handlers.resetForm).toHaveBeenCalled();

    rerender(
      <ItemModal
        isOpen={true}
        onClose={onClose}
        itemId={undefined}
        isClosing={true}
        setIsClosing={vi.fn()}
        refetchItems={vi.fn()}
      />
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('toggles level pricing mode and triggers form actions through template', async () => {
    render(
      <ItemModal
        isOpen={true}
        onClose={vi.fn()}
        itemId="item-1"
        initialItemData={{ code: 'INIT-1' }}
        isClosing={false}
        setIsClosing={vi.fn()}
        refetchItems={vi.fn()}
      />
    );

    expect(screen.getByTestId('section-optional')).toBeInTheDocument();
    expect(screen.getByTestId('section-settings')).toBeInTheDocument();
    expect(screen.getByTestId('section-conversion')).toBeInTheDocument();

    fireEvent.click(screen.getByText('level-on'));
    await waitFor(() => {
      expect(screen.queryByTestId('section-optional')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('level-off'));
    await waitFor(() => {
      expect(screen.getByTestId('section-optional')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('form-cancel'));
    fireEvent.click(screen.getByText('form-delete'));
    fireEvent.click(screen.getByText('backdrop'));

    expect(useItemActionsMock().handleCancel).toHaveBeenCalled();
    expect(useItemActionsMock().handleDeleteItem).toHaveBeenCalled();
    expect(useItemUIMock().handleBackdropClick).toHaveBeenCalled();
  });
});
