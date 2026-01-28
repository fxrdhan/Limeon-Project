import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import type { PackageConversion, UsePackageConversionReturn } from '@/types';
import type { ItemPackage } from '@/types/database';

export const usePackageConversion = (): UsePackageConversionReturn => {
  const [baseUnit, setBaseUnit] = useState<string>('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [packageConversions, setPackageConversions] = useState<
    PackageConversion[]
  >([]);
  const [availableUnits, setAvailableUnits] = useState<ItemPackage[]>([]);
  const [skipRecalculation, setSkipRecalculation] = useState<boolean>(false);

  const [packageConversionFormData, setPackageConversionFormData] = useState({
    unit: '',
    conversion_rate: 0,
  });

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase
        .from('item_packages')
        .select('id, name, description, updated_at')
        .order('name');

      if (data) {
        setAvailableUnits(data);
      }
    };

    fetchUnits();
  }, []);

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
      const calculatedBasePrice =
        packageConversion.base_price !== undefined
          ? packageConversion.base_price
          : basePrice / packageConversion.conversion_rate;

      const calculatedSellPrice =
        packageConversion.sell_price !== undefined
          ? packageConversion.sell_price
          : sellPrice / packageConversion.conversion_rate;

      const newPackageConversion: PackageConversion = {
        id:
          packageConversion.to_unit_id ||
          packageConversion.unit?.id ||
          `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        unit: packageConversion.unit,
        unit_name: packageConversion.unit_name,
        to_unit_id: packageConversion.to_unit_id,
        conversion_rate: packageConversion.conversion_rate,
        base_price: calculatedBasePrice,
        sell_price: calculatedSellPrice,
      };
      setPackageConversions(prevConversions => [
        ...prevConversions,
        newPackageConversion,
      ]);
    },
    [basePrice, sellPrice]
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
      const newBasePrice = basePrice > 0 ? basePrice / uc.conversion_rate : 0;
      const newSellPrice = sellPrice > 0 ? sellPrice / uc.conversion_rate : 0;
      return (
        Math.abs(uc.base_price - newBasePrice) > 0.001 ||
        Math.abs(uc.sell_price - newSellPrice) > 0.001
      );
    });

    if (needsUpdate) {
      setPackageConversions(prevConversions =>
        prevConversions.map(uc => ({
          ...uc,
          base_price: basePrice > 0 ? basePrice / uc.conversion_rate : 0,
          sell_price: sellPrice > 0 ? sellPrice / uc.conversion_rate : 0,
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
      unit: '',
      conversion_rate: 0,
    });
  }, []);

  return {
    baseUnit,
    setBaseUnit,
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
    resetConversions,
    setConversions: setPackageConversions,
  };
};
