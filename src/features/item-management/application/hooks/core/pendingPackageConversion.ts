import type { ItemInventoryUnit, PackageConversion } from '@/types/database';

interface PendingPackageConversionFormData {
  inventory_unit_id: string;
  parent_inventory_unit_id: string;
  contains_quantity: number;
}

interface PrepareConversionsForSaveParams {
  conversions: PackageConversion[];
  pendingConversion: PendingPackageConversionFormData;
  selectableUnits: ItemInventoryUnit[];
  factorLookupUnits: ItemInventoryUnit[];
  baseInventoryUnitId: string;
  idFactory?: () => string;
}

interface PrepareConversionsForSaveResult {
  conversions: PackageConversion[];
  errorMessage?: string;
}

const defaultConversionIdFactory = () =>
  `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`;

const getConversionUnitId = (conversion: PackageConversion) =>
  conversion.inventory_unit_id || conversion.to_unit_id || conversion.unit.id;

const getPendingParentFactor = ({
  conversions,
  factorLookupUnits,
  parentInventoryUnitId,
}: {
  conversions: PackageConversion[];
  factorLookupUnits: ItemInventoryUnit[];
  parentInventoryUnitId: string;
}) => {
  const parentUnitExists = factorLookupUnits.some(
    unit => unit.id === parentInventoryUnitId
  );
  const parentConversion = conversions.find(
    conversion => getConversionUnitId(conversion) === parentInventoryUnitId
  );

  return parentUnitExists && parentConversion
    ? parentConversion.factor_to_base || 1
    : 1;
};

export const prepareConversionsForSave = ({
  conversions,
  pendingConversion,
  selectableUnits,
  factorLookupUnits,
  baseInventoryUnitId,
  idFactory = defaultConversionIdFactory,
}: PrepareConversionsForSaveParams): PrepareConversionsForSaveResult => {
  if (
    !pendingConversion.inventory_unit_id ||
    !pendingConversion.parent_inventory_unit_id ||
    pendingConversion.contains_quantity <= 0
  ) {
    return { conversions };
  }

  const selectedUnit = selectableUnits.find(
    unit => unit.id === pendingConversion.inventory_unit_id
  );

  if (!selectedUnit) {
    return { conversions, errorMessage: 'Unit tidak valid!' };
  }

  if (baseInventoryUnitId && selectedUnit.id === baseInventoryUnitId) {
    return {
      conversions,
      errorMessage: 'Unit tambahan tidak boleh sama dengan Unit Dasar!',
    };
  }

  const existingUnit = conversions.find(
    conversion => getConversionUnitId(conversion) === selectedUnit.id
  );

  if (existingUnit) {
    return {
      conversions,
      errorMessage: 'Unit tersebut sudah ada dalam struktur!',
    };
  }

  const factorToBase =
    getPendingParentFactor({
      conversions,
      factorLookupUnits,
      parentInventoryUnitId: pendingConversion.parent_inventory_unit_id,
    }) * pendingConversion.contains_quantity;

  return {
    conversions: [
      ...conversions,
      {
        id: idFactory(),
        unit: selectedUnit,
        unit_name: selectedUnit.name,
        to_unit_id: selectedUnit.id,
        inventory_unit_id: selectedUnit.id,
        parent_inventory_unit_id: pendingConversion.parent_inventory_unit_id,
        contains_quantity: pendingConversion.contains_quantity,
        factor_to_base: factorToBase,
        conversion_rate: factorToBase,
        base_price: 0,
        sell_price: 0,
      },
    ],
  };
};
