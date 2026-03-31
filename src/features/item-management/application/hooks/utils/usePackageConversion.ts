import { useState, useEffect, useCallback } from 'react';
import type { PackageConversion, UsePackageConversionReturn } from '@/types';
import type { ItemInventoryUnit, InventoryUnitKind } from '@/types/database';
import { itemInventoryUnitService } from '@/services/api/masterData.service';
import {
  calculateFactorToBase,
  calculateUnitPricesFromBase,
} from '@/lib/item-units';

export const usePackageConversion = (): UsePackageConversionReturn => {
  const [baseUnit, setBaseUnit] = useState<string>('');
  const [baseInventoryUnitId, setBaseInventoryUnitId] = useState<string>('');
  const [baseUnitKind, setBaseUnitKind] =
    useState<InventoryUnitKind>('packaging');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [packageConversions, setPackageConversions] = useState<
    PackageConversion[]
  >([]);
  const [availableUnits, setAvailableUnits] = useState<ItemInventoryUnit[]>([]);
  const [skipRecalculation, setSkipRecalculation] = useState<boolean>(false);

  const [packageConversionFormData, setPackageConversionFormData] = useState({
    inventory_unit_id: '',
    parent_inventory_unit_id: '',
    contains_quantity: 0,
  });

  const refreshAvailableUnits = useCallback(async () => {
    const { data } = await itemInventoryUnitService.getActiveInventoryUnits();

    if (data) {
      setAvailableUnits(data);
    }
  }, []);

  useEffect(() => {
    void refreshAvailableUnits();
  }, [refreshAvailableUnits]);

  const addPackageConversion = useCallback(
    (
      packageConversion: Omit<
        PackageConversion,
        'id' | 'base_price' | 'sell_price'
      > & {
        base_price?: number;
        sell_price?: number;
      }
    ) => {
      const factorToBase =
        packageConversion.factor_to_base ||
        calculateFactorToBase(
          packageConversion.inventory_unit_id || packageConversion.to_unit_id,
          packageConversion.parent_inventory_unit_id || null,
          packageConversion.contains_quantity ||
            packageConversion.conversion_rate,
          packageConversions.map(conversion => ({
            inventory_unit_id:
              conversion.inventory_unit_id || conversion.to_unit_id,
            factor_to_base:
              conversion.factor_to_base || conversion.conversion_rate || 1,
          })),
          baseInventoryUnitId || packageConversion.to_unit_id
        );

      const resolvedPrices = calculateUnitPricesFromBase(
        {
          factor_to_base: factorToBase,
          base_price_override:
            packageConversion.base_price !== undefined
              ? packageConversion.base_price
              : packageConversion.base_price_override,
          sell_price_override:
            packageConversion.sell_price !== undefined
              ? packageConversion.sell_price
              : packageConversion.sell_price_override,
        },
        basePrice,
        sellPrice
      );

      const newPackageConversion: PackageConversion = {
        id:
          packageConversion.inventory_unit_id ||
          packageConversion.to_unit_id ||
          packageConversion.unit?.id ||
          `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        unit: packageConversion.unit,
        unit_name: packageConversion.unit_name,
        to_unit_id: packageConversion.to_unit_id,
        inventory_unit_id:
          packageConversion.inventory_unit_id || packageConversion.to_unit_id,
        parent_inventory_unit_id:
          packageConversion.parent_inventory_unit_id || null,
        contains_quantity:
          packageConversion.contains_quantity ||
          packageConversion.conversion_rate,
        factor_to_base: factorToBase,
        conversion_rate: factorToBase,
        base_price_override:
          packageConversion.base_price !== undefined
            ? packageConversion.base_price
            : packageConversion.base_price_override,
        sell_price_override:
          packageConversion.sell_price !== undefined
            ? packageConversion.sell_price
            : packageConversion.sell_price_override,
        base_price: resolvedPrices.basePrice,
        sell_price: resolvedPrices.sellPrice,
      };
      setPackageConversions(prevConversions => [
        ...prevConversions,
        newPackageConversion,
      ]);
    },
    [baseInventoryUnitId, basePrice, packageConversions, sellPrice]
  );

  const removePackageConversion = useCallback((id: string) => {
    setPackageConversions(prevConversions =>
      prevConversions.filter(uc => uc.id !== id)
    );
  }, []);

  const recalculateBasePrices = useCallback(() => {
    if (skipRecalculation) {
      setSkipRecalculation(false);
      return;
    }

    if ((basePrice <= 0 && sellPrice <= 0) || packageConversions.length === 0)
      return;

    const needsUpdate = packageConversions.some(uc => {
      const factorToBase = uc.factor_to_base || uc.conversion_rate || 1;
      const newBasePrice =
        uc.base_price_override != null
          ? uc.base_price_override
          : basePrice > 0
            ? basePrice * factorToBase
            : 0;
      const newSellPrice =
        uc.sell_price_override != null
          ? uc.sell_price_override
          : sellPrice > 0
            ? sellPrice * factorToBase
            : 0;
      return (
        Math.abs(uc.base_price - newBasePrice) > 0.001 ||
        Math.abs(uc.sell_price - newSellPrice) > 0.001
      );
    });

    if (needsUpdate) {
      setPackageConversions(prevConversions =>
        prevConversions.map(uc => ({
          ...uc,
          base_price:
            uc.base_price_override != null
              ? uc.base_price_override
              : basePrice > 0
                ? basePrice * (uc.factor_to_base || uc.conversion_rate || 1)
                : 0,
          sell_price:
            uc.sell_price_override != null
              ? uc.sell_price_override
              : sellPrice > 0
                ? sellPrice * (uc.factor_to_base || uc.conversion_rate || 1)
                : 0,
        }))
      );
    }
  }, [basePrice, sellPrice, skipRecalculation, packageConversions]);

  const skipNextRecalculation = useCallback(() => {
    setSkipRecalculation(true);
  }, []);

  const resetConversions = useCallback(() => {
    setPackageConversions([]);
    // Also reset the form data to clear input fields
    setPackageConversionFormData({
      inventory_unit_id: '',
      parent_inventory_unit_id: '',
      contains_quantity: 0,
    });
  }, []);

  return {
    baseUnit,
    baseInventoryUnitId,
    baseUnitKind,
    setBaseUnit,
    setBaseInventoryUnitId,
    setBaseUnitKind,
    basePrice,
    setBasePrice,
    sellPrice,
    setSellPrice,
    conversions: packageConversions,
    addPackageConversion,
    removePackageConversion,
    packageConversionFormData,
    setPackageConversionFormData,
    recalculateBasePrices,
    skipNextRecalculation,
    availableUnits,
    setAvailableUnits,
    refreshAvailableUnits,
    resetConversions,
    setConversions: setPackageConversions,
  };
};
