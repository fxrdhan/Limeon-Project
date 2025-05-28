import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import type { UnitConversion, UseUnitConversionReturn, UnitData } from '@/types';

export const useUnitConversion = (): UseUnitConversionReturn => {
    const [baseUnit, setBaseUnit] = useState<string>("");
    const [basePrice, setBasePrice] = useState<number>(0);
    const [sellPrice, setSellPrice] = useState<number>(0);
    const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);
    const [availableUnits, setAvailableUnits] = useState<UnitData[]>([]);
    const [skipRecalculation, setSkipRecalculation] = useState<boolean>(false);

    const [unitConversionFormData, setUnitConversionFormData] = useState({
        unit: "",
        conversion: 0,
    });

    useEffect(() => {
        const fetchUnits = async () => {
            const { data } = await supabase
                .from("item_units")
                .select("id, name")
                .order("name");
            
            if (data) {
                setAvailableUnits(data);
            }
        };

        fetchUnits();
    }, []);

    const addUnitConversion = useCallback((unitConversion: Omit<UnitConversion, "id"> & { basePrice?: number, sellPrice?: number }) => {
        const calculatedBasePrice = unitConversion.basePrice !== undefined 
            ? unitConversion.basePrice 
            : basePrice / unitConversion.conversion;
        
        const calculatedSellPrice = unitConversion.sellPrice !== undefined
            ? unitConversion.sellPrice
            : sellPrice / unitConversion.conversion;
        
        const newUnitConversion: UnitConversion = {
            ...unitConversion,
            id: `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
            basePrice: calculatedBasePrice,
            sellPrice: calculatedSellPrice,
        };
        setUnitConversions(prevConversions => [...prevConversions, newUnitConversion]);
    }, [basePrice, sellPrice]);

    const removeUnitConversion = useCallback((id: string) => {
        setUnitConversions(prevConversions => prevConversions.filter(uc => uc.id !== id));
    }, []);

    const recalculateBasePrices = useCallback(() => {
        if (skipRecalculation) {
            setSkipRecalculation(false);
            return;
        }
        
        if ((basePrice <= 0 && sellPrice <= 0) || unitConversions.length === 0) return;
        
        // Check if any values actually need to be updated to avoid unnecessary state updates
        const needsUpdate = unitConversions.some(uc => {
            const newBasePrice = basePrice > 0 ? (basePrice / uc.conversion) : 0;
            const newSellPrice = sellPrice > 0 ? (sellPrice / uc.conversion) : 0;
            return Math.abs(uc.basePrice - newBasePrice) > 0.001 || 
                    Math.abs(uc.sellPrice - newSellPrice) > 0.001;
        });
        
        if (needsUpdate) {
            setUnitConversions(prevConversions => 
                prevConversions.map(uc => ({
                    ...uc,
                    basePrice: basePrice > 0 ? (basePrice / uc.conversion) : 0,
                    sellPrice: sellPrice > 0 ? (sellPrice / uc.conversion) : 0
                }))
            );
        }
    }, [basePrice, sellPrice, skipRecalculation, unitConversions]);

    const skipNextRecalculation = useCallback(() => {
        setSkipRecalculation(true);
    }, []);

    const resetConversions = useCallback(() => {
        setUnitConversions([]);
    }, []);

    return {
        baseUnit,
        setBaseUnit,
        basePrice,
        setBasePrice,
        sellPrice,
        setSellPrice,
        conversions: unitConversions,
        addUnitConversion,
        removeUnitConversion,
        unitConversionFormData,
        setUnitConversionFormData,
        recalculateBasePrices,
        skipNextRecalculation,
        availableUnits,
        resetConversions
    };
};