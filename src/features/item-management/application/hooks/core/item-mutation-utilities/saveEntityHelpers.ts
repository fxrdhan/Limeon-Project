import { itemMasterDataService } from '../../../../infrastructure/itemMasterData.service';

export const saveEntityHelpers = {
  async saveCategory(categoryData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newCategory, error } =
      await itemMasterDataService.createCategory(categoryData);

    if (error) throw new Error('Gagal menyimpan kategori baru.');

    const { data: updatedCategories } =
      await itemMasterDataService.listCategories();

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
    const { data: newType, error } =
      await itemMasterDataService.createType(typeData);

    if (error) throw new Error('Gagal menyimpan jenis item baru.');

    const { data: updatedTypes } = await itemMasterDataService.listTypes();

    return { newType: newType ?? undefined, updatedTypes: updatedTypes || [] };
  },

  async saveUnit(unitData: {
    code?: string;
    name: string;
    description?: string;
  }) {
    const { data: newUnit, error } =
      await itemMasterDataService.createPackage(unitData);

    if (error) throw new Error('Gagal menyimpan satuan baru.');

    const { data: updatedPackages } =
      await itemMasterDataService.listPackages();

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
      await itemMasterDataService.createDosage(dosageData);

    if (error) throw new Error('Gagal menyimpan sediaan baru.');

    const { data: updatedDosages } = await itemMasterDataService.listDosages();

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
      await itemMasterDataService.createManufacturer(manufacturerData);

    if (error) throw new Error('Gagal menyimpan produsen baru.');

    const { data: updatedManufacturers } =
      await itemMasterDataService.listManufacturers();

    return {
      newManufacturer: newManufacturer ?? undefined,
      updatedManufacturers: updatedManufacturers || [],
    };
  },
};
