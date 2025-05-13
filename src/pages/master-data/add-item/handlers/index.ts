import { useEffect } from "react";
import {
    HandleSelectChangeProps,
    HandleMarginChangeProps,
    HandleSellPriceChangeProps,
    StartEditingMarginProps,
    StopEditingMarginProps,
    StartEditingMinStockProps,
    StopEditingMinStockProps,
} from "@/types";

export function handleSelectChange({
    originalHandleSelectChange,
    units,
    unitConversionHook,
}: HandleSelectChangeProps) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        originalHandleSelectChange(e);
        if (name === "unit_id" && value) {
            const selectedUnit = units.find((unit) => unit.id === value);
            if (selectedUnit) {
                unitConversionHook.setBaseUnit(selectedUnit.name);
            }
        }
    };
}

export function handleDropdownChange(
    handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
) {
    return (name: string, value: string) => {
        const syntheticEvent = {
            target: { name, value },
        } as React.ChangeEvent<HTMLSelectElement>;
        handleSelectChange(syntheticEvent);
    };
}

export function useBeforeUnload(isDirty: () => boolean) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty()) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isDirty]);
}

export function handleMarginChange({
    setMarginPercentage,
    formData,
    calculateSellPriceFromMargin,
    updateFormData,
}: HandleMarginChangeProps) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMarginPercentage(value);
        const margin = parseFloat(value);
        if (!isNaN(margin) && formData.base_price > 0) {
            const newSellPrice = calculateSellPriceFromMargin(margin);
            updateFormData({ sell_price: newSellPrice });
        }
    };
}

export function handleSellPriceChange({
    handleChange,
    calculateProfitPercentage,
    setMarginPercentage,
}: HandleSellPriceChangeProps) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange(e);
        setTimeout(() => {
            const profit = calculateProfitPercentage();
            if (profit !== null) {
                setMarginPercentage(profit.toFixed(1));
            }
        }, 0);
    };
}

export function startEditingMargin({
    calculateProfitPercentage,
    setMarginPercentage,
    setEditingMargin,
    marginInputRef,
}: StartEditingMarginProps) {
    return () => {
        const currentMargin = calculateProfitPercentage();
        setMarginPercentage(
            currentMargin !== null ? currentMargin.toFixed(1) : "0"
        );
        setEditingMargin(true);
        setTimeout(() => {
            if (marginInputRef.current) {
                marginInputRef.current.focus();
                marginInputRef.current.select();
            }
        }, 10);
    };
}

export function stopEditingMargin({
    setEditingMargin,
    marginPercentage,
    formData,
    calculateSellPriceFromMargin,
    updateFormData,
}: StopEditingMarginProps) {
    return () => {
        setEditingMargin(false);
        const margin = parseFloat(marginPercentage);
        if (!isNaN(margin) && formData.base_price > 0) {
            const newSellPrice = calculateSellPriceFromMargin(margin);
            updateFormData({ sell_price: newSellPrice });
        }
    };
}

export function handleMarginKeyDown(stopEditingMargin: () => void) {
    return (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === "Escape") {
            stopEditingMargin();
        }
    };
}

export function startEditingMinStock({
    formData,
    setMinStockValue,
    setEditingMinStock,
    minStockInputRef,
}: StartEditingMinStockProps) {
    return () => {
        setMinStockValue(String(formData.min_stock));
        setEditingMinStock(true);
        setTimeout(() => {
            if (minStockInputRef.current) {
                minStockInputRef.current.focus();
                minStockInputRef.current.select();
            }
        }, 10);
    };
}

export function stopEditingMinStock({
    setEditingMinStock,
    minStockValue,
    updateFormData,
    formData,
    setMinStockValue,
}: StopEditingMinStockProps) {
    return () => {
        setEditingMinStock(false);
        const stockValue = parseInt(minStockValue, 10);
        if (!isNaN(stockValue) && stockValue >= 0) {
            updateFormData({ min_stock: stockValue });
        } else {
            setMinStockValue(String(formData.min_stock));
        }
    };
}

export function handleMinStockChange(setMinStockValue: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        setMinStockValue(e.target.value);
    };
}

export function handleMinStockKeyDown(stopEditingMinStock: () => void) {
    return (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === "Escape") {
            stopEditingMinStock();
        }
    };
}
