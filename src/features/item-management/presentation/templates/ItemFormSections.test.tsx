import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemFormSections } from './ItemFormSections';

const useItemFormMock = vi.hoisted(() => vi.fn());
const useItemModalMock = vi.hoisted(() => vi.fn());
const useItemPriceMock = vi.hoisted(() => vi.fn());
const useItemRealtimeMock = vi.hoisted(() => vi.fn());
const useItemUIMock = vi.hoisted(() => vi.fn());
const useItemHistoryMock = vi.hoisted(() => vi.fn());
const useItemPriceCalculationsMock = vi.hoisted(() => vi.fn());
const useConversionLogicMock = vi.hoisted(() => vi.fn());
const useCustomerLevelsMock = vi.hoisted(() => vi.fn());
const useInlineEditorMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());
const compressImageIfNeededMock = vi.hoisted(() => vi.fn());
const extractNumericValueMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const updateItemFieldsMock = vi.hoisted(() => vi.fn());
const updateItemImagesMock = vi.hoisted(() => vi.fn());
const listItemImagesMock = vi.hoisted(() => vi.fn());
const uploadItemImageMock = vi.hoisted(() => vi.fn());
const preloadImagesMock = vi.hoisted(() => vi.fn());
const setCachedImageSetMock = vi.hoisted(() => vi.fn());
const removeCachedImageSetMock = vi.hoisted(() => vi.fn());
const getCachedImageBlobUrlMock = vi.hoisted(() => vi.fn());
const cacheImageBlobMock = vi.hoisted(() => vi.fn());
const removeCachedImageBlobMock = vi.hoisted(() => vi.fn());
const releaseCachedImageBlobsMock = vi.hoisted(() => vi.fn());
const extractPathFromUrlMock = vi.hoisted(() => vi.fn());
const getPublicUrlMock = vi.hoisted(() => vi.fn());

const capturedProps = vi.hoisted(() => ({
  header: null as Record<string, unknown> | null,
  basicInfoRequired: null as Record<string, unknown> | null,
  settings: null as Record<string, unknown> | null,
  pricing: null as Record<string, unknown> | null,
  packageConversion: null as Record<string, unknown> | null,
  basicInfoOptional: null as Record<string, unknown> | null,
  imageUploaderById: {} as Record<string, Record<string, unknown>>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

vi.mock('cropperjs', () => ({
  default: class MockCropper {
    getCroppedCanvas() {
      return {
        toBlob(callback: (blob: Blob | null) => void) {
          callback(new Blob(['img'], { type: 'image/jpeg' }));
        },
      };
    }
    destroy() {}
  },
}));

vi.mock('@/utils/image', () => ({
  compressImageIfNeeded: compressImageIfNeededMock,
}));

vi.mock('@/lib/formatters', () => ({
  extractNumericValue: extractNumericValueMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/utils/imageCache', () => ({
  preloadImages: preloadImagesMock,
  setCachedImageSet: setCachedImageSetMock,
  removeCachedImageSet: removeCachedImageSetMock,
  getCachedImageBlobUrl: getCachedImageBlobUrlMock,
  cacheImageBlob: cacheImageBlobMock,
  removeCachedImageBlob: removeCachedImageBlobMock,
  releaseCachedImageBlobs: releaseCachedImageBlobsMock,
}));

vi.mock('@/services/api/storage.service', () => ({
  StorageService: {
    extractPathFromUrl: extractPathFromUrlMock,
    getPublicUrl: getPublicUrlMock,
  },
}));

vi.mock('../../shared/contexts/useItemFormContext', () => ({
  useItemForm: useItemFormMock,
  useItemModal: useItemModalMock,
  useItemPrice: useItemPriceMock,
  useItemRealtime: useItemRealtimeMock,
  useItemUI: useItemUIMock,
  useItemHistory: useItemHistoryMock,
}));

vi.mock('../../application/hooks/utils/useItemPriceCalculator', () => ({
  useItemPriceCalculations: useItemPriceCalculationsMock,
}));

vi.mock('../../application/hooks/utils/useConversionLogic', () => ({
  useConversionLogic: useConversionLogicMock,
}));

vi.mock('../../application/hooks/data', () => ({
  useCustomerLevels: useCustomerLevelsMock,
}));

vi.mock('@/hooks/forms/useInlineEditor', () => ({
  useInlineEditor: useInlineEditorMock,
}));

vi.mock('../../infrastructure/itemData.service', () => ({
  itemDataService: {
    updateItemFields: updateItemFieldsMock,
    updateItemImages: updateItemImagesMock,
  },
}));

vi.mock('../../infrastructure/itemStorage.service', () => ({
  itemStorageService: {
    listItemImages: listItemImagesMock,
    uploadItemImage: uploadItemImageMock,
  },
}));

vi.mock('../molecules', () => ({
  ItemFormHeader: (props: Record<string, unknown>) => {
    capturedProps.header = props;
    return <div data-testid="item-form-header" />;
  },
}));

vi.mock('../organisms/ItemBasicInfoForm', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.basicInfoRequired = props;
    return <div data-testid="basic-info-required" />;
  },
}));

vi.mock('../organisms/ItemSettingsForm', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.settings = props;
    return <div data-testid="settings-form" />;
  },
}));

vi.mock('../organisms/ItemPricingForm', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.pricing = props;
    return <div data-testid="pricing-form" />;
  },
}));

vi.mock('../organisms/ItemPackageConversionForm', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.packageConversion = props;
    return <div data-testid="package-conversion-form" />;
  },
}));

vi.mock('../organisms/ItemAdditionalInfoForm', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.basicInfoOptional = props;
    return <div data-testid="additional-info-form" />;
  },
}));

vi.mock('@/components/image-manager', () => ({
  default: ({
    id,
    onImageUpload,
    onImageDelete,
    children,
  }: {
    id: string;
    onImageUpload?: (file: File) => void;
    onImageDelete?: () => void;
    children?: React.ReactNode;
  }) => {
    capturedProps.imageUploaderById[id] = {
      onImageUpload,
      onImageDelete,
    };
    return (
      <div data-testid={`image-uploader-${id}`}>
        <button
          type="button"
          onClick={() =>
            onImageUpload?.(
              new File(['img'], `${id}.jpg`, { type: 'image/jpeg' })
            )
          }
        >
          upload-{id}
        </button>
        <button type="button" onClick={() => onImageDelete?.()}>
          delete-{id}
        </button>
        {children}
      </div>
    );
  },
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    isLoading,
    disabled,
    ...props
  }: React.ComponentPropsWithoutRef<'button'> & { isLoading?: boolean }) => (
    <button disabled={disabled || isLoading} {...props}>
      {children}
    </button>
  ),
}));

const createPackageHook = () => ({
  baseUnit: 'Tablet',
  basePrice: 1000,
  sellPrice: 1500,
  setBaseUnit: vi.fn(),
  conversions: [
    {
      id: 'conv-1',
      to_unit_id: 'unit-2',
      unit: { id: 'unit-2', name: 'Box' },
      conversion_rate: 2,
      base_price: 500,
      sell_price: 750,
    },
  ],
  availableUnits: [
    { id: 'unit-1', name: 'Tablet', code: 'TAB', description: null },
    { id: 'unit-2', name: 'Box', code: 'BOX', description: null },
  ],
  packageConversionFormData: {
    unit: '',
    conversion_rate: 0,
  },
  addPackageConversion: vi.fn(),
  setPackageConversionFormData: vi.fn(),
  removePackageConversion: vi.fn(),
  setConversions: vi.fn(),
  skipNextRecalculation: vi.fn(),
});

const createFormHook = () => ({
  formData: {
    code: 'ITEM-1',
    name: 'Paracetamol',
    manufacturer_id: 'man-1',
    category_id: 'cat-1',
    type_id: 'type-1',
    package_id: 'pkg-1',
    dosage_id: 'dos-1',
    unit_id: 'unit-1',
    barcode: '123456',
    description: 'desc',
    base_price: 1000,
    sell_price: 1500,
    min_stock: 10,
    quantity: 5,
    is_active: true,
    is_medicine: true,
    has_expiry_date: true,
    image_urls: [],
    customer_level_discounts: [],
  },
  categories: [
    {
      id: 'cat-1',
      name: 'Analgesik',
      code: 'CAT',
      description: null,
      updated_at: null,
    },
  ],
  types: [
    {
      id: 'type-1',
      name: 'Obat Bebas',
      code: 'TYPE',
      description: null,
      updated_at: null,
    },
  ],
  packages: [
    {
      id: 'pkg-1',
      name: 'Tablet',
      code: 'PKG',
      description: null,
      updated_at: null,
    },
  ],
  units: [
    {
      id: 'unit-1',
      name: 'Strip',
      code: 'UNT',
      description: null,
      updated_at: null,
    },
  ],
  dosages: [
    {
      id: 'dos-1',
      name: '500mg',
      code: 'DOS',
      description: null,
      updated_at: null,
    },
  ],
  manufacturers: [
    {
      id: 'man-1',
      name: 'Kimia Farma',
      code: 'MNF',
      address: 'Jakarta',
      updated_at: null,
    },
  ],
  loading: false,
  isDirty: vi.fn(() => false),
  handleChange: vi.fn(),
  updateFormData: vi.fn(),
});

describe('ItemFormSections', () => {
  beforeEach(() => {
    vi.useRealTimers();

    capturedProps.header = null;
    capturedProps.basicInfoRequired = null;
    capturedProps.settings = null;
    capturedProps.pricing = null;
    capturedProps.packageConversion = null;
    capturedProps.basicInfoOptional = null;
    capturedProps.imageUploaderById = {};

    useItemFormMock.mockReset();
    useItemModalMock.mockReset();
    useItemPriceMock.mockReset();
    useItemRealtimeMock.mockReset();
    useItemUIMock.mockReset();
    useItemHistoryMock.mockReset();
    useItemPriceCalculationsMock.mockReset();
    useConversionLogicMock.mockReset();
    useCustomerLevelsMock.mockReset();
    useInlineEditorMock.mockReset();
    useQueryClientMock.mockReset();
    compressImageIfNeededMock.mockReset();
    extractNumericValueMock.mockReset();
    updateItemFieldsMock.mockReset();
    updateItemImagesMock.mockReset();
    listItemImagesMock.mockReset();
    uploadItemImageMock.mockReset();
    preloadImagesMock.mockReset();
    setCachedImageSetMock.mockReset();
    removeCachedImageSetMock.mockReset();
    getCachedImageBlobUrlMock.mockReset();
    cacheImageBlobMock.mockReset();
    removeCachedImageBlobMock.mockReset();
    releaseCachedImageBlobsMock.mockReset();
    extractPathFromUrlMock.mockReset();
    getPublicUrlMock.mockReset();
    toastErrorMock.mockReset();

    const queryClient = { setQueriesData: vi.fn() };
    const packageHook = createPackageHook();
    const formHook = createFormHook();

    useQueryClientMock.mockReturnValue(queryClient);
    useItemFormMock.mockReturnValue(formHook);
    useItemModalMock.mockReturnValue({
      handleAddNewCategory: vi.fn(),
      handleAddNewType: vi.fn(),
      handleAddNewUnit: vi.fn(),
      handleAddNewDosage: vi.fn(),
      handleAddNewManufacturer: vi.fn(),
    });
    useItemPriceMock.mockReturnValue({
      packageConversionHook: packageHook,
      displayBasePrice: 'Rp 1000',
      displaySellPrice: 'Rp 1500',
    });
    useItemRealtimeMock.mockReturnValue({
      smartFormSync: {
        registerActiveField: vi.fn(),
        unregisterActiveField: vi.fn(),
      },
    });
    useItemUIMock.mockReturnValue({
      resetKey: 1,
      isViewingOldVersion: false,
      isEditMode: true,
      isClosing: false,
      formattedUpdateAt: '2026-02-08',
      handleVersionSelect: vi.fn(),
      viewingVersionNumber: null,
    });
    useItemHistoryMock.mockReturnValue({
      data: [{ version_number: 3 }],
      isLoading: false,
    });
    useItemPriceCalculationsMock.mockReturnValue({
      calculateProfitPercentage: 25,
    });
    useConversionLogicMock.mockReturnValue({
      validateAndAddConversion: vi.fn(() => ({ success: true })),
    });
    useCustomerLevelsMock.mockReturnValue({
      levels: [{ id: 'lvl-1', level_name: 'Gold', price_percentage: 90 }],
      isLoading: false,
      createLevel: { mutateAsync: vi.fn(), isPending: false },
      updateLevels: { mutateAsync: vi.fn(), isPending: false },
      deleteLevel: { mutateAsync: vi.fn(), isPending: false },
    });
    useInlineEditorMock.mockReturnValue({
      isEditing: false,
      value: '10',
      startEditing: vi.fn(),
      stopEditing: vi.fn(),
      handleChange: vi.fn(),
      handleKeyDown: vi.fn(),
      setValue: vi.fn(),
    });

    updateItemFieldsMock.mockResolvedValue({ error: null });
    updateItemImagesMock.mockResolvedValue({ error: null });
    listItemImagesMock.mockResolvedValue({
      data: [{ name: 'slot-0', updated_at: '2026-02-07T00:00:00.000Z' }],
      error: null,
    });
    uploadItemImageMock.mockResolvedValue({ error: null });

    compressImageIfNeededMock.mockImplementation(async (file: File) => file);
    extractNumericValueMock.mockReturnValue(1200);
    getCachedImageBlobUrlMock.mockResolvedValue(null);
    cacheImageBlobMock.mockImplementation(async (source: string) => source);
    extractPathFromUrlMock.mockImplementation((url: string) =>
      url.includes('slot-0') ? 'items/item-1/slot-0' : ''
    );
    getPublicUrlMock.mockImplementation(
      (_bucket: string, path: string) => `https://cdn.pharmasys.test/${path}`
    );

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 100,
        height: 100,
        close: vi.fn(),
      }))
    );
  });

  it('renders header and handles basic required field updates', () => {
    vi.useFakeTimers();

    render(<ItemFormSections.Header onClose={vi.fn()} itemId="item-1" />);
    expect(capturedProps.header).toMatchObject({
      entityId: 'item-1',
      currentVersion: 3,
    });

    render(<ItemFormSections.BasicInfoRequired itemId="item-1" />);
    const props = capturedProps.basicInfoRequired as {
      onFieldChange: (field: string, value: boolean | string) => void;
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => void;
      onDropdownChange: (field: string, value: string) => void;
    };

    props.onFieldChange('is_medicine', false);
    props.onFieldChange('is_medicine', true);
    props.onFieldChange('code', 'ITEM-NEW');
    props.onChange({
      target: { name: 'name', value: 'Ibuprofen' },
    } as React.ChangeEvent<HTMLInputElement>);
    props.onDropdownChange('category_id', 'cat-1');
    props.onDropdownChange('type_id', 'type-1');
    props.onDropdownChange('package_id', 'pkg-1');
    props.onDropdownChange('dosage_id', 'dos-1');
    props.onDropdownChange('manufacturer_id', 'man-1');

    expect(updateItemFieldsMock).toHaveBeenCalled();
    expect(useItemFormMock().updateFormData).toHaveBeenCalled();
    expect(
      useItemPriceMock().packageConversionHook.setBaseUnit
    ).toHaveBeenCalledWith('Tablet');

    vi.useRealTimers();
  });

  it('handles settings and pricing section callbacks including level pricing mode', async () => {
    const onLevelPricingToggle = vi.fn();

    render(
      <ItemFormSections.Settings
        isExpanded={true}
        onExpand={vi.fn()}
        itemId="item-1"
      />
    );
    const settingsProps = capturedProps.settings as {
      onFieldChange: (field: string, value: boolean | string) => void;
    };
    settingsProps.onFieldChange('is_medicine', false);
    settingsProps.onFieldChange('is_active', false);
    settingsProps.onFieldChange('has_expiry_date', true);
    settingsProps.onFieldChange('min_stock', '12');

    render(
      <ItemFormSections.Pricing
        isExpanded={true}
        onExpand={vi.fn()}
        onLevelPricingToggle={onLevelPricingToggle}
        itemId="item-1"
      />
    );

    const pricingProps = capturedProps.pricing as {
      onBasePriceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
      onSellPriceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
      onLevelPricingActiveChange: (active: boolean) => void;
      onShowLevelPricing: () => void;
      levelPricing?: {
        onDiscountChange: (levelId: string, value: string) => void;
      };
    };

    pricingProps.onBasePriceChange({
      target: { value: 'Rp 1200', name: 'base_price' },
    } as React.ChangeEvent<HTMLInputElement>);
    pricingProps.onSellPriceChange({
      target: { value: 'Rp 2500' },
    } as React.ChangeEvent<HTMLInputElement>);
    pricingProps.onLevelPricingActiveChange(true);
    pricingProps.onShowLevelPricing();

    await waitFor(() => {
      expect(
        (capturedProps.pricing as { levelPricing?: unknown }).levelPricing
      ).toBeTruthy();
    });
    const nextPricingProps = capturedProps.pricing as {
      levelPricing?: {
        onDiscountChange: (levelId: string, value: string) => void;
      };
    };
    nextPricingProps.levelPricing?.onDiscountChange('lvl-1', '12.5');

    expect(onLevelPricingToggle).toHaveBeenCalled();
    expect(updateItemFieldsMock).toHaveBeenCalled();
  });

  it('handles package conversion actions and realtime interaction markers', () => {
    render(
      <ItemFormSections.PackageConversion
        isExpanded={true}
        onExpand={vi.fn()}
        itemId="item-1"
      />
    );

    const packageProps = capturedProps.packageConversion as {
      onAddConversion: () => void;
      onRemoveConversion: (id: string) => void;
      onUpdateSellPrice: (id: string, sellPrice: number) => void;
      onInteractionStart: () => void;
      onInteractionEnd: () => void;
    };

    packageProps.onInteractionStart();
    packageProps.onInteractionEnd();
    packageProps.onAddConversion();
    packageProps.onRemoveConversion('conv-1');
    packageProps.onUpdateSellPrice('conv-1', 999);

    expect(
      useConversionLogicMock().validateAndAddConversion
    ).toHaveBeenCalled();
    expect(
      useItemPriceMock().packageConversionHook.removePackageConversion
    ).toHaveBeenCalledWith('conv-1');
    expect(
      useItemPriceMock().packageConversionHook.setConversions
    ).toHaveBeenCalled();
    expect(
      useItemRealtimeMock().smartFormSync.registerActiveField
    ).toHaveBeenCalledWith('package_conversions');
    expect(
      useItemRealtimeMock().smartFormSync.unregisterActiveField
    ).toHaveBeenCalledWith('package_conversions');
  });

  it('handles optional section in draft mode including optional field edits and local image flow', async () => {
    useItemUIMock.mockReturnValue({
      resetKey: 1,
      isViewingOldVersion: false,
      isEditMode: false,
      isClosing: false,
      formattedUpdateAt: '2026-02-08',
      handleVersionSelect: vi.fn(),
      viewingVersionNumber: null,
    });

    render(
      <ItemFormSections.BasicInfoOptional
        isExpanded={true}
        onExpand={vi.fn()}
      />
    );

    const optionalProps = capturedProps.basicInfoOptional as {
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => void;
      onDropdownChange: (field: string, value: string) => void;
    };

    optionalProps.onDropdownChange('unit_id', 'unit-1');
    optionalProps.onChange({
      target: { name: 'barcode', value: 'BR-1' },
    } as React.ChangeEvent<HTMLInputElement>);
    optionalProps.onChange({
      target: { name: 'quantity', value: '10' },
    } as React.ChangeEvent<HTMLInputElement>);
    optionalProps.onChange({
      target: { name: 'description', value: 'desc baru' },
    } as React.ChangeEvent<HTMLInputElement>);

    fireEvent.click(screen.getByText('upload-item-image-0'));
    fireEvent.click(screen.getByText('delete-item-image-0'));

    expect(useItemFormMock().updateFormData).toHaveBeenCalled();
    expect(useItemFormMock().handleChange).toHaveBeenCalledTimes(3);

    expect(listItemImagesMock).not.toHaveBeenCalled();
  });

  it('loads and updates persisted item images when optional section is in edit mode', async () => {
    render(
      <ItemFormSections.BasicInfoOptional
        isExpanded={true}
        onExpand={vi.fn()}
        itemId="item-1"
      />
    );

    await waitFor(() => {
      expect(listItemImagesMock).toHaveBeenCalledWith('item_images', 'item-1');
    });
    expect(updateItemImagesMock).toHaveBeenCalled();

    fireEvent.click(screen.getByText('upload-item-image-0'));
    await waitFor(() => {
      expect(uploadItemImageMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('delete-item-image-0'));
    await waitFor(() => {
      expect(removeCachedImageBlobMock).toHaveBeenCalled();
    });
  });
});
