import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';
import { BaseService } from './base.service';
import {
  categoryService,
  medicineTypeService,
  itemPackageService,
  itemUnitService,
  itemDosageService,
  itemManufacturerService,
  supplierService,
  MasterDataService,
} from './masterData.service';

describe('MasterData services', () => {
  const makeResponse = <T>(
    data: T | null,
    error: PostgrestError | null = null
  ): ServiceResponse<T> => ({
    data,
    error,
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies getAll and search calls with expected options', async () => {
    const getAllSpy = vi
      .spyOn(BaseService.prototype, 'getAll')
      .mockResolvedValue(makeResponse([]));
    const searchSpy = vi
      .spyOn(BaseService.prototype, 'search')
      .mockResolvedValue(makeResponse([]));

    await categoryService.getActiveCategories();
    await medicineTypeService.getActiveTypes();
    await itemPackageService.getActivePackages();
    await itemUnitService.getActiveItemUnits();
    await itemDosageService.getActiveDosages();
    await itemManufacturerService.getActiveManufacturers();
    await supplierService.getActiveSuppliers();
    await supplierService.searchSuppliers('alpha');
    await supplierService.searchCategories('beta');
    await supplierService.searchTypes('gamma');
    await supplierService.searchUnits('delta');

    expect(getAllSpy).toHaveBeenCalledWith({
      select: 'id, code, name, description, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
    expect(searchSpy).toHaveBeenCalledWith(
      'alpha',
      ['name', 'contact_person', 'email', 'phone'],
      { orderBy: { column: 'name', ascending: true } }
    );
  });

  it('normalizes missing master data to empty arrays', async () => {
    const getAllSpy = vi.spyOn(BaseService.prototype, 'getAll');
    getAllSpy
      .mockResolvedValueOnce(makeResponse(null))
      .mockResolvedValueOnce(makeResponse([{ id: 'type-1' }]))
      .mockResolvedValueOnce(
        makeResponse(null, {
          message: 'err',
          details: '',
          hint: '',
          code: '',
        })
      )
      .mockResolvedValueOnce(makeResponse([{ id: 'sup-1' }]));

    const masterDataService = new MasterDataService();
    const result = await masterDataService.getAllMasterData();

    expect(result.categories).toEqual([]);
    expect(result.types).toEqual([{ id: 'type-1' }]);
    expect(result.packages).toEqual([]);
    expect(result.suppliers).toEqual([{ id: 'sup-1' }]);
    expect(result.errors.categories).toBeNull();
    expect(result.errors.packages).toEqual(
      expect.objectContaining({ message: 'err' })
    );
  });

  it('handles missing types and suppliers', async () => {
    const getAllSpy = vi.spyOn(BaseService.prototype, 'getAll');
    getAllSpy
      .mockResolvedValueOnce(makeResponse([{ id: 'cat-1' }]))
      .mockResolvedValueOnce(makeResponse(null))
      .mockResolvedValueOnce(makeResponse([{ id: 'pkg-1' }]))
      .mockResolvedValueOnce(makeResponse(null));

    const masterDataService = new MasterDataService();
    const result = await masterDataService.getAllMasterData();

    expect(result.categories).toEqual([{ id: 'cat-1' }]);
    expect(result.types).toEqual([]);
    expect(result.packages).toEqual([{ id: 'pkg-1' }]);
    expect(result.suppliers).toEqual([]);
  });
});
