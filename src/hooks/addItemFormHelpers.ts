import { supabase } from "../lib/supabase";

interface MedicineType {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
}

export const generateTypeCode = (typeId: string, types: MedicineType[]): string => {
    const selectedType = types.find(type => type.id === typeId);
    if (!selectedType) return "X";

    const typeName = selectedType.name.toLowerCase();
    if (typeName.includes("bebas") && !typeName.includes("terbatas")) return "B";
    if (typeName.includes("bebas terbatas")) return "T";
    if (typeName.includes("keras")) return "K";
    if (typeName.includes("narkotika")) return "N";
    if (typeName.includes("fitofarmaka")) return "F";
    if (typeName.includes("herbal")) return "H";

    return selectedType.name.charAt(0).toUpperCase();
};

export const generateUnitCode = (unitId: string, units: Unit[]): string => {
    const selectedUnit = units.find(unit => unit.id === unitId);
    if (!selectedUnit) return "X";

    return selectedUnit.name.charAt(0).toUpperCase();
};

export const generateCategoryCode = (categoryId: string, categories: Category[]): string => {
    const selectedCategory = categories.find(category => category.id === categoryId);
    if (!selectedCategory) return "XX";

    const name = selectedCategory.name;

    if (name.toLowerCase().startsWith("anti")) {
        const baseName = name.slice(4);
        if (baseName.length > 0) {
            return "A" + baseName.charAt(0).toUpperCase();
        }
        return "A";
    } else {
        if (name.length >= 2) {
            return name.substring(0, 2).toUpperCase();
        } else if (name.length === 1) {
            return name.toUpperCase() + "X";
        } else {
            return "XX";
        }
    }
};

export const getUnitById = async (unitName: string) => {
    try {
        const { data } = await supabase
            .from("item_units")
            .select("id, name")
            .eq("name", unitName)
            .single();
        return data;
    } catch (error) {
        console.error("Error fetching unit:", error);
        return null;
    }
};
