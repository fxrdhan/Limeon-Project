/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUnitConversion } from "./useUnitConversion";
import type { UnitConversion } from "./useUnitConversion";
import { formatRupiah, extractNumericValue } from "../lib/formatters";

interface Category {
    id: string;
    name: string;
}

interface MedicineType {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

interface FormData {
    code: string;
    name: string;
    type_id: string;
    category_id: string;
    unit_id: string;
    rack: string;
    description: string;
    base_price: number;
    sell_price: number;
    min_stock: number;
    is_active: boolean;
    is_medicine: boolean;
    has_expiry_date: boolean;
}

export const useAddItemForm = (itemId?: string) => {
    const navigate = useNavigate();
    const [initialFormData, setInitialFormData] = useState<FormData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<MedicineType[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [displayBasePrice, setDisplayBasePrice] = useState('');
    const [displaySellPrice, setDisplaySellPrice] = useState('');

    const unitConversionHook = useUnitConversion();

    const [formData, setFormData] = useState<FormData>({
        code: "",
        name: "",
        type_id: "",
        category_id: "",
        unit_id: "",
        rack: "",
        description: "",
        base_price: 0,
        sell_price: 0,
        min_stock: 10,
        is_active: true,
        is_medicine: true,
        has_expiry_date: false,
    });

    const updateFormData = (newData: Partial<FormData>) => {
        if (!initialFormData && !loading && (itemId || !isEditMode)) {
            setInitialFormData(prev => {
                const merged = { ...(prev ?? formData), ...newData };
                return {
                    code: merged.code ?? "",
                    name: merged.name ?? "",
                    type_id: merged.type_id ?? "",
                    category_id: merged.category_id ?? "",
                    unit_id: merged.unit_id ?? "",
                    rack: merged.rack ?? "",
                    description: merged.description ?? "",
                    base_price: merged.base_price ?? 0,
                    sell_price: merged.sell_price ?? 0,
                    min_stock: merged.min_stock ?? 10,
                    is_active: merged.is_active ?? true,
                    is_medicine: merged.is_medicine ?? true,
                    has_expiry_date: merged.has_expiry_date ?? false,
                };
            });
        }
        setFormData(prev => {
            const merged = { ...prev, ...newData };
            return {
                code: merged.code ?? "",
                name: merged.name ?? "",
                type_id: merged.type_id ?? "",
                category_id: merged.category_id ?? "",
                unit_id: merged.unit_id ?? "",
                rack: merged.rack ?? "",
                description: merged.description ?? "",
                base_price: merged.base_price ?? 0,
                sell_price: merged.sell_price ?? 0,
                min_stock: merged.min_stock ?? 10,
                is_active: merged.is_active ?? true,
                is_medicine: merged.is_medicine ?? true,
                has_expiry_date: merged.has_expiry_date ?? false,
            };
        });
    };

    const generateTypeCode = (typeId: string): string => {
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

    const generateUnitCode = (unitId: string): string => {
        const selectedUnit = units.find(unit => unit.id === unitId);
        if (!selectedUnit) return "X";

        return selectedUnit.name.charAt(0).toUpperCase();
    };

    const generateCategoryCode = (categoryId: string): string => {
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

    useEffect(() => {
        fetchMasterData();
        if (itemId) {
            fetchItemData(itemId);
            setIsEditMode(true);
        }
        if (!itemId) {
            setInitialFormData(formData);
        }
    }, [itemId]);

    useEffect(() => {
        const generateItemCode = async () => {
            if (!formData.type_id || !formData.category_id || !formData.unit_id)
                return;

            const typeCode = generateTypeCode(formData.type_id);
            const unitCode = generateUnitCode(formData.unit_id);
            const categoryCode = generateCategoryCode(formData.category_id);

            const codePrefix = `${typeCode}${unitCode}${categoryCode}`;

            try {
                const { data } = await supabase
                    .from("items")
                    .select("code")
                    .ilike("code", `${codePrefix}%`)
                    .order("code", { ascending: false });

                let sequence = 1;

                if (data && data.length > 0) {
                    const lastSequenceStr = data[0].code.substring(codePrefix.length);
                    const lastSequence = parseInt(lastSequenceStr);

                    if (!isNaN(lastSequence)) {
                        sequence = lastSequence + 1;
                    }
                }

                const sequenceStr = sequence.toString().padStart(2, "0");
                const generatedCode = `${codePrefix}${sequenceStr}`;

                setFormData(prevFormData => ({
                    ...prevFormData,
                    code: generatedCode,
                }));
            } catch (error) {
                console.error("Error generating item code:", error);
            }
        };

        if (formData.type_id && formData.category_id && formData.unit_id &&
            categories.length > 0 && types.length > 0 && units.length > 0) {
            generateItemCode();
        }
    }, [formData.type_id, formData.category_id, formData.unit_id, categories, types, units]);

    const fetchMasterData = async () => {
        setLoading(true);
        try {
            const { data: categoriesData } = await supabase
                .from("item_categories")
                .select("id, name")
                .order("name");

            const { data: typesData } = await supabase
                .from("item_types")
                .select("id, name")
                .order("name");

            const { data: unitsData } = await supabase
                .from("item_units")
                .select("id, name")
                .order("name");

            if (categoriesData) setCategories(categoriesData);
            if (typesData) setTypes(typesData);
            if (unitsData) setUnits(unitsData);
        } catch (error) {
            console.error("Error fetching master data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemData = async (id: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("items")
                .select(`
                    *,
                    unit_conversions
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            if (!data) throw new Error("Item tidak ditemukan");

            setFormData({
                code: data.code || "",
                name: data.name || "",
                type_id: data.type_id || "",
                category_id: data.category_id || "",
                unit_id: data.unit_id || "",
                rack: data.rack || "",
                description: data.description || "",
                base_price: data.base_price || 0,
                sell_price: data.sell_price || 0,
                min_stock: data.min_stock || 10,
                is_active: data.is_active !== undefined ? data.is_active : true,
                is_medicine: data.is_medicine !== undefined ? data.is_medicine : true,
                has_expiry_date: data.has_expiry_date !== undefined ? data.has_expiry_date : false,
            });

            setInitialFormData(data);

            setDisplayBasePrice(formatRupiah(data.base_price || 0));
            setDisplaySellPrice(formatRupiah(data.sell_price || 0));

            unitConversionHook.setBaseUnit(data.base_unit || "");
            unitConversionHook.setBasePrice(data.base_price || 0);
            unitConversionHook.skipNextRecalculation();

            const currentConversions = [...unitConversionHook.conversions];
            for (const conv of currentConversions) {
                unitConversionHook.removeUnitConversion(conv.id);
            }

            let conversions = [];
            if (data.unit_conversions) {
                try {
                    conversions = typeof data.unit_conversions === 'string'
                        ? JSON.parse(data.unit_conversions)
                        : data.unit_conversions;
                } catch (e) {
                    console.error("Error parsing unit_conversions:", e);
                    conversions = [];
                }
            }

            if (Array.isArray(conversions)) {
                for (const conv of conversions) {
                    const unit = await getUnitById(conv.unit_name);
                    if (unit) {
                        unitConversionHook.addUnitConversion({
                            to_unit_id: unit.id,
                            unit_name: unit.name,
                            unit: unit,
                            conversion: conv.conversion_rate || 0,
                            basePrice: conv.base_price,
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching item data:", error);
            alert("Gagal memuat data item. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const getUnitById = async (unitName: string) => {
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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;

        if (name === "base_price" || name === "sell_price") {
            const numericInt = extractNumericValue(value);

            setFormData({
                ...formData,
                [name]: numericInt
            });

            const formattedValue = formatRupiah(numericInt);
            if (name === "base_price") {
                setDisplayBasePrice(formattedValue);
            } else if (name === "sell_price") {
                setDisplaySellPrice(formattedValue);
            }
        } else if (type === "checkbox") {
            const { checked } = e.target as HTMLInputElement;
            setFormData({
                ...formData,
                [name]: checked,
            });
        } else if (type === "number") {
            setFormData({
                ...formData,
                [name]: parseFloat(value) || 0,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEditMode) {
                const itemUpdateData = {
                    name: formData.name,
                    category_id: formData.category_id,
                    type_id: formData.type_id,
                    unit_id: formData.unit_id,
                    base_price: formData.base_price, 
                    sell_price: formData.sell_price,
                    min_stock: formData.min_stock,
                    description: formData.description || null,
                    is_active: formData.is_active,
                    rack: formData.rack || null,
                    code: formData.code,
                    is_medicine: formData.is_medicine,
                    base_unit: unitConversionHook.baseUnit,
                    has_expiry_date: formData.has_expiry_date,
                };

                const { error: updateError } = await supabase
                    .from("items")
                    .update(itemUpdateData)
                    .eq("id", itemId);

                if (updateError) throw updateError;

                await supabase
                    .from("unit_conversions")
                    .delete()
                    .eq("item_id", itemId);

                if (unitConversionHook.conversions.length > 0) {
                    const conversionRecords = unitConversionHook.conversions.map((uc: UnitConversion) => ({
                        item_id: itemId,
                        unit_name: uc.unit.name,
                        conversion_rate: uc.conversion,
                        base_price: uc.basePrice,
                        created_at: new Date()
                    }));

                    const { error: conversionError } = await supabase
                        .from("unit_conversions")
                        .insert(conversionRecords);

                    if (conversionError) {
                        console.error("Error saving unit conversions:", conversionError);
                    }
                }
            } else {
                const mainItemData = {
                    name: formData.name,
                    category_id: formData.category_id,
                    type_id: formData.type_id,
                    unit_id: formData.unit_id,
                    base_price: formData.base_price, 
                    sell_price: formData.sell_price,
                    stock: 0,
                    min_stock: formData.min_stock,
                    description: formData.description || null,
                    is_active: formData.is_active,
                    rack: formData.rack || null,
                    code: formData.code,
                    is_medicine: formData.is_medicine,
                    base_unit: unitConversionHook.baseUnit,
                    unit_conversions: JSON.stringify(unitConversionHook.conversions),
                    has_expiry_date: formData.has_expiry_date,
                };

                const { data: newItem, error: mainError } = await supabase
                    .from("items")
                    .insert(mainItemData)
                    .select("id")
                    .single();

                if (mainError) throw mainError;

                if (unitConversionHook.conversions.length > 0 && newItem) {
                    const conversionRecords = unitConversionHook.conversions.map((uc: UnitConversion) => ({
                        item_id: newItem.id,
                        unit_name: uc.unit.name,
                        conversion_rate: uc.conversion,
                        base_price: uc.basePrice,
                        created_at: new Date()
                    }));

                    const { error: conversionError } = await supabase
                        .from("unit_conversions")
                        .insert(conversionRecords);

                    if (conversionError) {
                        console.error("Error saving unit conversions:", conversionError);
                    }
                }
            }

            navigate("/master-data/items");
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Gagal menyimpan data item. Silakan coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    const isDirty = () => {
        if (!initialFormData) return false;
        return JSON.stringify(formData) !== JSON.stringify(initialFormData);
    };

    return {
        formData,
        displayBasePrice,
        displaySellPrice,
        categories,
        types,
        units,
        loading,
        saving,
        isEditMode,
        handleChange,
        handleSelectChange,
        handleSubmit,
        unitConversionHook,
        updateFormData,
        isDirty
    };
};