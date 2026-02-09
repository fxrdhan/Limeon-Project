import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemFormData } from '../../../shared/types';
import type { PackageConversion } from '../../../shared/types';
import type { CustomerLevelDiscount } from '@/types/database';
import {
  checkExistingCodes,
  generateItemCode,
  prepareItemData,
  saveEntityHelpers,
  saveItemBusinessLogic,
} from './ItemMutationUtilities';

const loggerInfoMock = vi.hoisted(() => vi.fn());
const loggerDebugMock = vi.hoisted(() => vi.fn());

const generateItemCodeWithSequenceMock = vi.hoisted(() => vi.fn());

const categoryServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  getAll: vi.fn(),
}));
const medicineTypeServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  getAll: vi.fn(),
}));
const itemPackageServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  getAll: vi.fn(),
}));
const itemDosageServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  getAll: vi.fn(),
}));
const itemManufacturerServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  getAll: vi.fn(),
}));

const itemDataServiceMock = vi.hoisted(() => ({
  updateItemFields: vi.fn(),
  createItem: vi.fn(),
  updateItemImages: vi.fn(),
  replaceCustomerLevelDiscounts: vi.fn(),
  getItemCodesLike: vi.fn(),
}));

const uploadFileMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/logger', () => ({
  logger: {
    info: loggerInfoMock,
    debug: loggerDebugMock,
  },
}));

vi.mock('../utils/useItemCodeGenerator', () => ({
  generateItemCodeWithSequence: generateItemCodeWithSequenceMock,
}));

vi.mock('@/services/api/masterData.service', () => ({
  categoryService: categoryServiceMock,
  medicineTypeService: medicineTypeServiceMock,
  itemPackageService: itemPackageServiceMock,
  itemDosageService: itemDosageServiceMock,
  itemManufacturerService: itemManufacturerServiceMock,
}));

vi.mock('../../../infrastructure/itemData.service', () => ({
  itemDataService: itemDataServiceMock,
}));

vi.mock('@/services/api/storage.service', () => ({
  StorageService: {
    uploadFile: uploadFileMock,
  },
}));

const baseFormData = (): ItemFormData => ({
  code: '',
  name: 'Paracetamol',
  manufacturer_id: 'm-1',
  type_id: 't-1',
  category_id: 'c-1',
  package_id: 'p-1',
  dosage_id: 'd-1',
  barcode: '8990001',
  description: 'Obat demam',
  image_urls: [],
  base_price: 1000,
  sell_price: 1500,
  min_stock: 10,
  quantity: 0,
  unit_id: 'u-1',
  is_active: true,
  is_medicine: true,
  has_expiry_date: true,
});

const baseConversions = (): PackageConversion[] => [
  {
    id: 'conv-1',
    unit_name: 'Box',
    to_unit_id: 'u-box',
    unit: { id: 'u-box', name: 'Box' },
    conversion_rate: 10,
    base_price: 10000,
    sell_price: 12000,
  },
];

describe('ItemMutationUtilities', () => {
  beforeEach(() => {
    loggerInfoMock.mockReset();
    loggerDebugMock.mockReset();

    generateItemCodeWithSequenceMock.mockReset();

    Object.values(categoryServiceMock).forEach(fn => fn.mockReset());
    Object.values(medicineTypeServiceMock).forEach(fn => fn.mockReset());
    Object.values(itemPackageServiceMock).forEach(fn => fn.mockReset());
    Object.values(itemDosageServiceMock).forEach(fn => fn.mockReset());
    Object.values(itemManufacturerServiceMock).forEach(fn => fn.mockReset());
    Object.values(itemDataServiceMock).forEach(fn => fn.mockReset());

    uploadFileMock.mockReset();

    categoryServiceMock.getById.mockResolvedValue({ data: { code: 'CAT' } });
    medicineTypeServiceMock.getById.mockResolvedValue({
      data: { code: 'TYPE' },
    });
    itemPackageServiceMock.getById.mockResolvedValue({ data: { code: 'PKG' } });
    itemDosageServiceMock.getById.mockResolvedValue({ data: { code: 'DOS' } });
    itemManufacturerServiceMock.getById.mockResolvedValue({
      data: { code: 'MFR' },
    });

    itemDataServiceMock.updateItemFields.mockResolvedValue({ error: null });
    itemDataServiceMock.createItem.mockResolvedValue({
      data: { id: 'item-1' },
      error: null,
    });
    itemDataServiceMock.updateItemImages.mockResolvedValue({ error: null });
    itemDataServiceMock.replaceCustomerLevelDiscounts.mockResolvedValue({
      error: null,
    });
    itemDataServiceMock.getItemCodesLike.mockResolvedValue({
      data: [{ code: 'CAT-TYPE-PKG-DOS-MFR-001' }, { code: null }],
      error: null,
    });

    generateItemCodeWithSequenceMock.mockResolvedValue(
      'CAT-TYPE-PKG-DOS-MFR-001'
    );
    uploadFileMock.mockResolvedValue({
      path: 'items/item-1/history/slot-0-a.jpg',
      publicUrl: 'https://cdn.example/item-1.jpg',
    });
  });

  it('prepares item payloads for create and update modes', async () => {
    const formData = baseFormData();
    const conversions = baseConversions();

    const createPayload = await prepareItemData(
      {
        ...formData,
        is_level_pricing_active: undefined,
      },
      conversions,
      'PCS',
      false
    );
    const updatePayload = await prepareItemData(
      formData,
      conversions,
      'PCS',
      true
    );

    expect(createPayload).toMatchObject({
      name: 'Paracetamol',
      manufacturer_id: 'm-1',
      base_unit: 'PCS',
      stock: 0,
      is_level_pricing_active: true,
      package_conversions: [
        {
          unit_name: 'Box',
          to_unit_id: 'u-box',
          conversion_rate: 10,
          base_price: 10000,
          sell_price: 12000,
        },
      ],
    });
    expect(updatePayload).not.toHaveProperty('stock');
  });

  it('checks existing codes and generates code from master-data components', async () => {
    await expect(checkExistingCodes('CAT%')).resolves.toEqual([
      'CAT-TYPE-PKG-DOS-MFR-001',
    ]);

    const generated = await generateItemCode(baseFormData());
    expect(generated).toBe('CAT-TYPE-PKG-DOS-MFR-001');
    expect(generateItemCodeWithSequenceMock).toHaveBeenCalledWith(
      'CAT-TYPE-PKG-DOS-MFR',
      checkExistingCodes
    );

    categoryServiceMock.getById.mockResolvedValueOnce({ data: null });
    await expect(generateItemCode(baseFormData())).rejects.toThrow(
      'Semua field kategori'
    );

    itemDataServiceMock.getItemCodesLike.mockResolvedValueOnce({
      data: null,
      error: new Error('codes down'),
    });
    await expect(checkExistingCodes('ERR%')).rejects.toBeInstanceOf(Error);
  });

  it('creates items, uploads temporary images, and syncs discounts', async () => {
    const discounts: CustomerLevelDiscount[] = [
      { customer_level_id: 'lvl-1', discount_percentage: 10 },
      { customer_level_id: 'lvl-1', discount_percentage: 5 },
      { customer_level_id: 'lvl-2', discount_percentage: -2 },
      { customer_level_id: '', discount_percentage: 99 },
    ];

    const formData = {
      ...baseFormData(),
      image_urls: [
        'data:image/png;base64,aGVsbG8=',
        'https://cdn.example/existing.jpg',
      ],
      customer_level_discounts: discounts,
    };

    const result = await saveItemBusinessLogic({
      formData,
      conversions: baseConversions(),
      baseUnit: 'PCS',
      isEditMode: false,
    });

    expect(result).toEqual({
      action: 'create',
      itemId: 'item-1',
      code: 'CAT-TYPE-PKG-DOS-MFR-001',
    });
    expect(itemDataServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        stock: 0,
        image_urls: ['https://cdn.example/existing.jpg'],
      })
    );
    expect(uploadFileMock).toHaveBeenCalledWith(
      'item_images',
      expect.any(File),
      expect.stringContaining('items/item-1/history/slot-0-')
    );
    expect(itemDataServiceMock.updateItemImages).toHaveBeenCalledWith(
      'item-1',
      ['https://cdn.example/item-1.jpg', 'https://cdn.example/existing.jpg']
    );
    expect(
      itemDataServiceMock.replaceCustomerLevelDiscounts
    ).toHaveBeenCalledWith('item-1', [
      { customer_level_id: 'lvl-1', discount_percentage: 5 },
      { customer_level_id: 'lvl-2', discount_percentage: 0 },
    ]);
  });

  it('updates items and handles update/create failures', async () => {
    const updateResult = await saveItemBusinessLogic({
      formData: {
        ...baseFormData(),
        code: '[XXX] - placeholder',
        customer_level_discounts: [
          { customer_level_id: 'lvl-1', discount_percentage: 9 },
        ],
      },
      conversions: baseConversions(),
      baseUnit: 'PCS',
      isEditMode: true,
      itemId: 'item-9',
    });

    expect(updateResult).toEqual({
      action: 'update',
      itemId: 'item-9',
      code: 'CAT-TYPE-PKG-DOS-MFR-001',
    });
    expect(itemDataServiceMock.updateItemFields).toHaveBeenCalledWith(
      'item-9',
      expect.objectContaining({ name: 'Paracetamol', base_unit: 'PCS' })
    );
    expect(
      itemDataServiceMock.replaceCustomerLevelDiscounts
    ).toHaveBeenCalledWith('item-9', [
      { customer_level_id: 'lvl-1', discount_percentage: 9 },
    ]);
    expect(loggerInfoMock).toHaveBeenCalled();
    expect(loggerDebugMock).toHaveBeenCalled();

    itemDataServiceMock.updateItemFields.mockResolvedValueOnce({
      error: new Error('update failed'),
    });
    await expect(
      saveItemBusinessLogic({
        formData: baseFormData(),
        conversions: baseConversions(),
        baseUnit: 'PCS',
        isEditMode: true,
        itemId: 'item-err',
      })
    ).rejects.toBeInstanceOf(Error);

    itemDataServiceMock.createItem.mockResolvedValueOnce({
      data: null,
      error: new Error('insert failed'),
    });
    await expect(
      saveItemBusinessLogic({
        formData: baseFormData(),
        conversions: baseConversions(),
        baseUnit: 'PCS',
        isEditMode: false,
      })
    ).rejects.toBeInstanceOf(Error);
  });

  it('saves related entities and reports domain errors', async () => {
    categoryServiceMock.create.mockResolvedValue({
      data: { id: 'cat' },
      error: null,
    });
    categoryServiceMock.getAll.mockResolvedValue({ data: [{ id: 'cat' }] });
    medicineTypeServiceMock.create.mockResolvedValue({
      data: { id: 'type' },
      error: null,
    });
    medicineTypeServiceMock.getAll.mockResolvedValue({
      data: [{ id: 'type' }],
    });
    itemPackageServiceMock.create.mockResolvedValue({
      data: { id: 'unit' },
      error: null,
    });
    itemPackageServiceMock.getAll.mockResolvedValue({ data: [{ id: 'unit' }] });
    itemDosageServiceMock.create.mockResolvedValue({
      data: { id: 'dosage' },
      error: null,
    });
    itemDosageServiceMock.getAll.mockResolvedValue({
      data: [{ id: 'dosage' }],
    });
    itemManufacturerServiceMock.create.mockResolvedValue({
      data: { id: 'manufacturer' },
      error: null,
    });
    itemManufacturerServiceMock.getAll.mockResolvedValue({
      data: [{ id: 'manufacturer' }],
    });

    await expect(
      saveEntityHelpers.saveCategory({ name: 'Analgesik' })
    ).resolves.toEqual({
      newCategory: { id: 'cat' },
      updatedCategories: [{ id: 'cat' }],
    });
    await expect(
      saveEntityHelpers.saveType({ name: 'Tablet' })
    ).resolves.toEqual({
      newType: { id: 'type' },
      updatedTypes: [{ id: 'type' }],
    });
    await expect(saveEntityHelpers.saveUnit({ name: 'Box' })).resolves.toEqual({
      newUnit: { id: 'unit' },
      updatedPackages: [{ id: 'unit' }],
    });
    await expect(
      saveEntityHelpers.saveDosage({ name: '500mg' })
    ).resolves.toEqual({
      newDosage: { id: 'dosage' },
      updatedDosages: [{ id: 'dosage' }],
    });
    await expect(
      saveEntityHelpers.saveManufacturer({ name: 'Acme Pharma' })
    ).resolves.toEqual({
      newManufacturer: { id: 'manufacturer' },
      updatedManufacturers: [{ id: 'manufacturer' }],
    });

    categoryServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: new Error('category failed'),
    });
    medicineTypeServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: new Error('type failed'),
    });
    itemPackageServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: new Error('unit failed'),
    });
    itemDosageServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: new Error('dosage failed'),
    });
    itemManufacturerServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: new Error('manufacturer failed'),
    });

    await expect(saveEntityHelpers.saveCategory({ name: 'x' })).rejects.toThrow(
      'Gagal menyimpan kategori baru.'
    );
    await expect(saveEntityHelpers.saveType({ name: 'x' })).rejects.toThrow(
      'Gagal menyimpan jenis item baru.'
    );
    await expect(saveEntityHelpers.saveUnit({ name: 'x' })).rejects.toThrow(
      'Gagal menyimpan satuan baru.'
    );
    await expect(saveEntityHelpers.saveDosage({ name: 'x' })).rejects.toThrow(
      'Gagal menyimpan sediaan baru.'
    );
    await expect(
      saveEntityHelpers.saveManufacturer({ name: 'x' })
    ).rejects.toThrow('Gagal menyimpan produsen baru.');
  });
});
