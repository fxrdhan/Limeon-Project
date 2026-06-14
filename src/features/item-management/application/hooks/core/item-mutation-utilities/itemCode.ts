import type { ItemFormData } from '../../../../shared/types';
import { itemDataService } from '../../../../infrastructure/itemData.service';
import { itemMasterDataService } from '../../../../infrastructure/itemMasterData.service';
import { generateItemCodeWithSequence } from '../../utils/useItemCodeGenerator';

export const checkExistingCodes = async (
  pattern: string
): Promise<string[]> => {
  const { data, error } = await itemDataService.getItemCodesLike(pattern);

  if (error) throw error;
  return (
    data
      ?.map(item => item.code)
      .filter((code): code is string => Boolean(code)) || []
  );
};

export const generateItemCode = async (
  formData: ItemFormData
): Promise<string> => {
  const [categoryData, typeData, packageData, dosageData, manufacturerData] =
    await Promise.all([
      itemMasterDataService.getCategoryCode(formData.category_id),
      itemMasterDataService.getMedicineTypeCode(formData.type_id),
      itemMasterDataService.getPackageCode(formData.package_id),
      itemMasterDataService.getDosageCode(formData.dosage_id),
      itemMasterDataService.getManufacturerCode(formData.manufacturer_id),
    ]);

  const parts = [
    categoryData.data?.code,
    typeData.data?.code,
    packageData.data?.code,
    dosageData.data?.code,
    manufacturerData.data?.code,
  ].filter(Boolean);

  if (parts.length !== 5) {
    throw new Error(
      'Semua field kategori, jenis, kemasan, sediaan, dan produsen harus dipilih untuk generate code.'
    );
  }

  const baseCode = parts.join('-');

  return await generateItemCodeWithSequence(baseCode, checkExistingCodes);
};
