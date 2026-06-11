import {
  categoryService,
  itemDosageService,
  itemManufacturerService,
  itemPackageService,
  medicineTypeService,
} from '@/services/api/masterData.service';

export const saveEntityHelpers = {
  async saveCategory(categoryData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newCategory, error } =
      await categoryService.create(categoryData);

    if (error) throw new Error('Gagal menyimpan kategori baru.');

    const { data: updatedCategories } = await categoryService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return {
      newCategory: newCategory ?? undefined,
      updatedCategories: updatedCategories || [],
    };
  },

  async saveType(typeData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newType, error } = await medicineTypeService.create(typeData);

    if (error) throw new Error('Gagal menyimpan jenis item baru.');

    const { data: updatedTypes } = await medicineTypeService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return { newType: newType ?? undefined, updatedTypes: updatedTypes || [] };
  },

  async saveUnit(unitData: {
    code?: string;
    name: string;
    description?: string;
  }) {
    const { data: newUnit, error } = await itemPackageService.create(unitData);

    if (error) throw new Error('Gagal menyimpan satuan baru.');

    const { data: updatedPackages } = await itemPackageService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return {
      newUnit: newUnit ?? undefined,
      updatedPackages: updatedPackages || [],
    };
  },

  async saveDosage(dosageData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newDosage, error } =
      await itemDosageService.create(dosageData);

    if (error) throw new Error('Gagal menyimpan sediaan baru.');

    const { data: updatedDosages } = await itemDosageService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return {
      newDosage: newDosage ?? undefined,
      updatedDosages: updatedDosages || [],
    };
  },

  async saveManufacturer(manufacturerData: {
    code?: string;
    name: string;
    address?: string;
  }) {
    const { data: newManufacturer, error } =
      await itemManufacturerService.create(manufacturerData);

    if (error) throw new Error('Gagal menyimpan produsen baru.');

    const { data: updatedManufacturers } = await itemManufacturerService.getAll(
      {
        select: 'id, code, name, address, created_at, updated_at',
        orderBy: { column: 'name', ascending: true },
      }
    );

    return {
      newManufacturer: newManufacturer ?? undefined,
      updatedManufacturers: updatedManufacturers || [],
    };
  },
};
