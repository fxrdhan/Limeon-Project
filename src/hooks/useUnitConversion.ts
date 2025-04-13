import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface UnitConversion {
    unit_name: string;
    to_unit_id: string;
    id: string;
    unit: {
        id: string;
        name: string;
    };
    conversion: number;
    basePrice: number;
}

export interface UseUnitConversionReturn {
    conversions: UnitConversion[];
    baseUnit: string;
    setBaseUnit: React.Dispatch<React.SetStateAction<string>>;
    basePrice: number;
    setBasePrice: React.Dispatch<React.SetStateAction<number>>;
    addUnitConversion: (unitConversion: Omit<UnitConversion, "id"> & { basePrice?: number }) => void;
    removeUnitConversion: (id: string) => void;
    unitConversionFormData: {
        unit: string;
        conversion: number;
    };
    setUnitConversionFormData: React.Dispatch<React.SetStateAction<{
        unit: string;
        conversion: number;
    }>>;
    recalculateBasePrices: () => void;
    skipNextRecalculation: () => void;
    availableUnits: UnitData[];
    resetConversions: () => void;
}

export interface UnitData {
    id: string;
    name: string;
}

export const useUnitConversion = (): UseUnitConversionReturn => {
    const [baseUnit, setBaseUnit] = useState<string>("");
    const [basePrice, setBasePrice] = useState<number>(0);
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

    const addUnitConversion = useCallback((unitConversion: Omit<UnitConversion, "id"> & { basePrice?: number }) => {
        const calculatedBasePrice = unitConversion.basePrice !== undefined 
            ? unitConversion.basePrice 
            : basePrice / unitConversion.conversion;
        
        const newUnitConversion: UnitConversion = {
            ...unitConversion,
            id: Date.now().toString(),
            basePrice: calculatedBasePrice,
        };
        setUnitConversions(prevConversions => [...prevConversions, newUnitConversion]);
    }, [basePrice]);

    const removeUnitConversion = useCallback((id: string) => {
        setUnitConversions(prevConversions => prevConversions.filter(uc => uc.id !== id));
    }, []);

    const recalculateBasePrices = useCallback(() => {
        if (skipRecalculation) {
            setSkipRecalculation(false);
            return;
        }
        
        if (basePrice <= 0 || unitConversions.length === 0) return;
        
        setUnitConversions(prevConversions => 
            prevConversions.map(uc => ({
                ...uc,
                basePrice: basePrice > 0 ? (basePrice / uc.conversion) : 0
            }))
        );
    }, [basePrice, skipRecalculation, unitConversions.length]);

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