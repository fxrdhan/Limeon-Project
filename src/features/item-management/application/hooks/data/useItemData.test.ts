import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemData } from './useItemData';

const formatRupiahMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const loggerDebugMock = vi.hoisted(() => vi.fn());
const loggerErrorMock = vi.hoisted(() => vi.fn());
const fetchItemDataByIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/formatters', () => ({
  formatRupiah: formatRupiahMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: loggerDebugMock,
    error: loggerErrorMock,
  },
}));

vi.mock('../../../infrastructure/itemData.service', () => ({
  itemDataService: {
    fetchItemDataById: fetchItemDataByIdMock,
  },
}));

const createFormState = () => ({
  setLoading: vi.fn(),
  setFormData: vi.fn(),
  setInitialFormData: vi.fn(),
  setInitialPackageConversions: vi.fn(),
  setDisplayBasePrice: vi.fn(),
  setDisplaySellPrice: vi.fn(),
  packages: [
    { id: 'pkg-strip', name: 'Strip' },
    { id: 'pkg-box', name: 'Box' },
  ] as never,
});

const createPackageConversionHook = () => ({
  setBaseUnit: vi.fn(),
  setBasePrice: vi.fn(),
  setSellPrice: vi.fn(),
  skipNextRecalculation: vi.fn(),
  conversions: [],
  removePackageConversion: vi.fn(),
  addPackageConversion: vi.fn(),
  setConversions: vi.fn(),
});

describe('useItemData', () => {
  beforeEach(() => {
    formatRupiahMock.mockReset();
    toastErrorMock.mockReset();
    loggerDebugMock.mockReset();
    loggerErrorMock.mockReset();
    fetchItemDataByIdMock.mockReset();

    formatRupiahMock.mockImplementation((v: number) => `Rp${v}`);
  });

  it('hydrates item data, normalizes conversions/discounts, and syncs display + conversion state', () => {
    const formState = createFormState();
    const packageConversionHook = createPackageConversionHook();

    const { result } = renderHook(() =>
      useItemData({
        formState,
        packageConversionHook,
      })
    );

    act(() => {
      result.current.hydrateItemData(
        {
          code: 'ITM-10',
          name: 'Amoxicillin',
          manufacturer: { id: 'man-from-rel' },
          type_id: 'type-1',
          category_id: 'cat-1',
          package_id: 'pkg-box',
          dosage_id: 'dos-1',
          description: 'test',
          image_urls: ['https://img.test/a.jpg'],
          base_price: 1000,
          sell_price: 1500,
          is_level_pricing_active: true,
          min_stock: 12,
          is_active: true,
          is_medicine: true,
          has_expiry_date: true,
          quantity: 7,
          unit_id: 'pkg-box',
          updated_at: '2025-01-01T00:00:00.000Z',
          base_unit: 'Box',
          customer_level_discounts: [
            { customer_level_id: 'lvl-1', discount_percentage: '10.5' },
            { customer_level_id: '', discount_percentage: '99' },
          ],
          package_conversions:
            '[{"unit_name":"Strip","to_unit_id":"pkg-strip","conversion_rate":2,"base_price":0,"sell_price":0}]',
        },
        { skipImages: true }
      );
    });

    expect(formState.setFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Amoxicillin',
        manufacturer_id: 'man-from-rel',
        image_urls: [],
        customer_level_discounts: [
          { customer_level_id: 'lvl-1', discount_percentage: 10.5 },
        ],
      })
    );

    expect(formState.setInitialPackageConversions).toHaveBeenCalledWith([
      expect.objectContaining({
        unit_name: 'Strip',
        conversion_rate: 2,
        base_price: 500,
        sell_price: 750,
      }),
    ]);

    expect(formState.setDisplayBasePrice).toHaveBeenCalledWith('Rp1000');
    expect(formState.setDisplaySellPrice).toHaveBeenCalledWith('Rp1500');

    expect(packageConversionHook.setBaseUnit).toHaveBeenCalledWith('Box');
    expect(packageConversionHook.setBasePrice).toHaveBeenCalledWith(1000);
    expect(packageConversionHook.setSellPrice).toHaveBeenCalledWith(1500);
    expect(packageConversionHook.skipNextRecalculation).toHaveBeenCalled();
    expect(packageConversionHook.setConversions).toHaveBeenCalledWith([
      expect.objectContaining({ unit_name: 'Strip' }),
    ]);
  });

  it('handles fetch success and invalid package conversion JSON parsing fallback', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const formState = createFormState();
    const packageConversionHook = createPackageConversionHook();

    fetchItemDataByIdMock.mockResolvedValue({
      data: {
        code: 'ITM-20',
        name: 'Paracetamol',
        manufacturer_id: 'man-2',
        package_conversions: '{invalid-json}',
      },
      error: null,
    });

    const { result } = renderHook(() =>
      useItemData({
        formState,
        packageConversionHook,
      })
    );

    await act(async () => {
      await result.current.fetchItemData('item-20');
    });

    expect(fetchItemDataByIdMock).toHaveBeenCalledWith('item-20');
    expect(formState.setLoading).toHaveBeenCalledWith(true);
    expect(formState.setLoading).toHaveBeenCalledWith(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error parsing package_conversions from DB:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('handles fetch failures by showing error toast and logger output', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const formState = createFormState();
    const packageConversionHook = createPackageConversionHook();

    fetchItemDataByIdMock.mockResolvedValue({
      data: null,
      error: new Error('db failed'),
    });

    const { result } = renderHook(() =>
      useItemData({
        formState,
        packageConversionHook,
      })
    );

    await act(async () => {
      await result.current.fetchItemData('item-fail');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching item data:',
      expect.any(Error)
    );
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'Failed to fetch item data from Supabase',
      expect.any(Error),
      expect.objectContaining({ itemId: 'item-fail' })
    );
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal memuat data item. Silakan coba lagi.'
    );
    expect(formState.setLoading).toHaveBeenCalledWith(false);

    consoleErrorSpy.mockRestore();
  });

  it('covers missing item fetch and conversion mapping by unit name fallback', async () => {
    const formState = createFormState();
    const packageConversionHook = createPackageConversionHook();
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useItemData({
        formState,
        packageConversionHook,
      })
    );

    act(() => {
      result.current.hydrateItemData({
        name: 'Fallback',
        package_conversions: [
          {
            unit_name: 'Box',
            conversion_rate: 2,
            base_price: 0,
            sell_price: 0,
          },
        ],
      });
    });

    expect(packageConversionHook.setConversions).toHaveBeenCalledWith([
      expect.objectContaining({
        to_unit_id: 'pkg-box',
        unit: { id: 'pkg-box', name: 'Box' },
      }),
    ]);

    fetchItemDataByIdMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await act(async () => {
      await result.current.fetchItemData('item-missing');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching item data:',
      expect.any(Error)
    );

    act(() => {
      result.current.hydrateItemData({
        name: 'No Conversion Field',
        package_conversions: null,
      });
    });

    expect(packageConversionHook.setConversions).toHaveBeenCalledWith([]);
    consoleErrorSpy.mockRestore();
  });
});
