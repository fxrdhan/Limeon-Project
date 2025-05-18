/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import type { UnitConversion } from '@/types';
import { useUnitConversion } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRupiah, extractNumericValue, formatDateTime } from "@/lib/formatters";
import { useConfirmDialog } from "@/components/modules";
import type { Category, MedicineType, Unit, FormData } from '@/types';
import { generateTypeCode, generateUnitCode, generateCategoryCode, getUnitById } from "@/hooks/add-item/helper";

export const useAddItemForm = (itemId?: string, initialSearchQuery?: string) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [initialFormData, setInitialFormData] = useState<FormData | null>(null);
    const [initialUnitConversions, setInitialUnitConversions] = useState<UnitConversion[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<MedicineType[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [displayBasePrice, setDisplayBasePrice] = useState('');
    const [displaySellPrice, setDisplaySellPrice] = useState('');
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
    const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
    const [editingMargin, setEditingMargin] = useState(false);
    const [marginPercentage, setMarginPercentage] = useState<string>("0");
    const [editingMinStock, setEditingMinStock] = useState(false);
    const [minStockValue, setMinStockValue] = useState<string>("0");
    const unitConversionHook = useUnitConversion();
    const [formData, setFormData] = useState<FormData>({
        code: "",
        name: "",
        type_id: "",
        category_id: "",
        unit_id: "",
        rack: "",
        barcode: "",
        description: "",
        base_price: 0,
        sell_price: 0,
        min_stock: 10,
        is_active: true,
        is_medicine: true,
        has_expiry_date: false,
        updated_at: null,
    });

    const updateFormData = (newData: Partial<FormData>) => {
        if (newData.sell_price !== undefined) {
            setDisplaySellPrice(formatRupiah(newData.sell_price));
        }
        if (newData.base_price !== undefined) {
            setDisplayBasePrice(formatRupiah(newData.base_price));
        }
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
                    barcode: merged.barcode ?? "",
                    description: merged.description ?? "",
                    base_price: merged.base_price ?? 0,
                    sell_price: merged.sell_price ?? 0,
                    min_stock: merged.min_stock ?? 10,
                    is_active: merged.is_active ?? true,
                    is_medicine: merged.is_medicine ?? true,
                    has_expiry_date: merged.has_expiry_date ?? false,
                    updated_at: merged.updated_at ?? null,
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
                barcode: merged.barcode ?? "",
                description: merged.description ?? "",
                base_price: merged.base_price ?? 0,
                sell_price: merged.sell_price ?? 0,
                min_stock: merged.min_stock ?? 10,
                is_active: merged.is_active ?? true,
                is_medicine: merged.is_medicine ?? true,
                has_expiry_date: merged.has_expiry_date ?? false,
                updated_at: merged.updated_at ?? null,
            };
        });
    };

    useEffect(() => {
        fetchMasterData();
        if (itemId) {
            fetchItemData(itemId);
            setIsEditMode(true);
        } else {
            const defaultState: FormData = {
                code: "",
                name: initialSearchQuery || "",
                type_id: "",
                category_id: "",
                unit_id: "",
                rack: "",
                barcode: "",
                description: "",
                base_price: 0,
                sell_price: 0,
                min_stock: 10,
                is_active: true,
                is_medicine: true,
                has_expiry_date: false,
                updated_at: null,
            };
            setFormData(defaultState);
            setInitialFormData(defaultState);
            setDisplayBasePrice(formatRupiah(defaultState.base_price));
            setDisplaySellPrice(formatRupiah(defaultState.sell_price));
            if (initialSearchQuery) {
                setMarginPercentage("0");
            }
            unitConversionHook.resetConversions();
            unitConversionHook.setBaseUnit("");
            unitConversionHook.setBasePrice(0);
            unitConversionHook.setSellPrice(0);
        }
    }, [itemId, initialSearchQuery]);

    useEffect(() => {
        const generateItemCode = async () => {
            if (!formData.type_id || !formData.category_id || !formData.unit_id)
                return;
            const typeCode = generateTypeCode(formData.type_id, types);
            const unitCode = generateUnitCode(formData.unit_id, units);
            const categoryCode = generateCategoryCode(formData.category_id, categories);
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

    useEffect(() => {
        if (unitConversionHook.basePrice > 0 && unitConversionHook.conversions.length > 0) {
            unitConversionHook.recalculateBasePrices();
        }
    }, [unitConversionHook.basePrice, unitConversionHook.recalculateBasePrices, unitConversionHook.conversions.length, unitConversionHook]);

    useEffect(() => {
        unitConversionHook.setSellPrice(formData.sell_price || 0);
    }, [formData.sell_price, unitConversionHook]);

    const fetchMasterData = async () => {
        setLoading(true);
        try {
            const { data: categoriesData } = await supabase
                .from("item_categories")
                .select("id, name, description")
                .order("name");
            const { data: typesData } = await supabase
                .from("item_types")
                .select("id, name")
                .order("name");
            const { data: unitsData } = await supabase
                .from("item_units")
                .select("id, name, description")
                .order("name");
            if (categoriesData) setCategories(categoriesData);
            if (typesData) setTypes(typesData as MedicineType[]);
            if (unitsData) setUnits(unitsData);
        } catch (error: unknown) {
            console.error("Error fetching master data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemData = async (id: string) => {
        try {
            setLoading(true);
            const { data: itemData, error: itemError } = await supabase
                .from("items")
                .select(`
                    *, updated_at,
                    unit_conversions
                `)
                .eq("id", id)
                .single();
            if (itemError) throw itemError;
            if (!itemData) throw new Error("Item tidak ditemukan");
            setFormData({
                code: itemData.code || "",
                name: itemData.name || "",
                type_id: itemData.type_id || "",
                category_id: itemData.category_id || "",
                unit_id: itemData.unit_id || "",
                rack: itemData.rack || "",
                barcode: itemData.barcode || "",
                description: itemData.description || "",
                base_price: itemData.base_price || 0,
                sell_price: itemData.sell_price || 0,
                min_stock: itemData.min_stock || 10,
                is_active: itemData.is_active !== undefined ? itemData.is_active : true,
                is_medicine: itemData.is_medicine !== undefined ? itemData.is_medicine : true,
                has_expiry_date: itemData.has_expiry_date !== undefined ? itemData.has_expiry_date : false,
                updated_at: itemData.updated_at,
            });
            setInitialFormData({ ...itemData });
            const initialConversions = itemData.unit_conversions ? (typeof itemData.unit_conversions === 'string' ? JSON.parse(itemData.unit_conversions) : itemData.unit_conversions) : [];
            if (Array.isArray(initialConversions)) {
                setInitialUnitConversions(initialConversions);
            } else {
                setInitialUnitConversions([]);
            }
            setDisplayBasePrice(formatRupiah(itemData.base_price || 0));
            setDisplaySellPrice(formatRupiah(itemData.sell_price || 0));
            unitConversionHook.setBaseUnit(itemData.base_unit || "");
            unitConversionHook.setBasePrice(itemData.base_price || 0);
            unitConversionHook.setSellPrice(itemData.sell_price || 0);
            unitConversionHook.skipNextRecalculation();
            const currentConversions = [...unitConversionHook.conversions];
            for (const conv of currentConversions) {
                unitConversionHook.removeUnitConversion(conv.id);
            }
            let conversions = [];
            if (itemData.unit_conversions) {
                try {
                    conversions = typeof itemData.unit_conversions === 'string'
                        ? JSON.parse(itemData.unit_conversions)
                        : itemData.unit_conversions;
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
                            sellPrice: conv.sellPrice,
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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (name === "base_price" || name === "sell_price") {
            const numericInt = extractNumericValue(value);
            updateFormData({ [name]: numericInt });
            const formattedValue = formatRupiah(numericInt);
            if (name === "base_price") {
                setDisplayBasePrice(formattedValue);
                unitConversionHook.setBasePrice(numericInt);
            } else if (name === "sell_price") {
                setDisplaySellPrice(formattedValue);
                unitConversionHook.setSellPrice(numericInt);
            }
        } else if (type === "checkbox") {
            const { checked } = e.target as HTMLInputElement;
            updateFormData({ [name]: checked });
        } else if (type === "number") {
            updateFormData({ [name]: parseFloat(value) || 0 });
        } else {
            updateFormData({ [name]: value });
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const addCategoryMutation = useMutation({
        mutationFn: async (newCategory: { name: string; description: string }) => {
            const { data, error } = await supabase
                .from("item_categories")
                .insert(newCategory)
                .select('id, name, description')
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error) => {
            console.error("Error adding category:", error);
        },
    });

    const addTypeMutation = useMutation({
        mutationFn: async (newType: { name: string; description: string }) => {
            const { data, error } = await supabase
                .from("item_types")
                .insert(newType)
                .select("id, name, description")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
        },
        onError: (error) => {
            console.error("Error adding type:", error);
        },
    });

    const confirmDialog = useConfirmDialog();

    const addUnitMutation = useMutation({
        mutationFn: async (newUnit: { name: string; description: string }) => {
            const { data, error } = await supabase
                .from("item_units")
                .insert(newUnit)
                .select('id, name, description')
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
        },
        onError: (error) => {
            console.error("Error adding unit:", error);
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemIdToDelete: string) => {
            const { error } = await supabase.from("items").delete().eq("id", itemIdToDelete);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"], refetchType: "all" });
            navigate("/master-data/items");
        },
        onError: (error) => {
            console.error("Error deleting item:", error);
            alert("Gagal menghapus item. Silakan coba lagi.");
        },
    });

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
                    barcode: formData.barcode || null,
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
                const { error: deleteError } = await supabase
                    .from("unit_conversions")
                    .delete()
                    .eq("item_id", itemId);
                if (deleteError) {
                    console.error("Error deleting old unit conversions:", deleteError);
                    throw deleteError;
                }
                if (unitConversionHook.conversions.length > 0) {
                    const uniqueConversions = unitConversionHook.conversions.reduce((acc: UnitConversion[], current: UnitConversion) => {
                        const isDuplicate = acc.find((item: UnitConversion) => item.unit.name === current.unit.name);
                        if (!isDuplicate && current.unit && current.unit.name) {
                            acc.push(current);
                        } else if (isDuplicate) {
                            console.warn(`Duplicate unit conversion found for ${current.unit.name}, skipping...`);
                        }
                        return acc;
                    }, [] as UnitConversion[]);
                    const conversionRecords = uniqueConversions.map((uc: UnitConversion) => ({
                        item_id: itemId,
                        unit_name: uc.unit.name,
                        conversion_rate: uc.conversion,
                        base_price: uc.basePrice,
                        sell_price: uc.sellPrice,
                    }));
                    if (conversionRecords.length > 0) {
                        const { error: insertConversionError } = await supabase
                            .from("unit_conversions")
                            .insert(conversionRecords);
                        if (insertConversionError) {
                            console.error("Error inserting new unit conversions:", insertConversionError);
                            throw insertConversionError;
                        }
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
                    barcode: formData.barcode || null,
                    code: formData.code,
                    is_medicine: formData.is_medicine,
                    base_unit: unitConversionHook.baseUnit,
                    has_expiry_date: formData.has_expiry_date,
                };
                const { data: insertedItem, error: mainError } = await supabase
                    .from("items")
                    .insert(mainItemData)
                    .select("id")
                    .single();
                if (mainError) throw mainError;
                if (!insertedItem) throw new Error("Gagal mendapatkan ID item baru setelah insert.");
                const newItemId = insertedItem.id;
                if (unitConversionHook.conversions.length > 0) {
                    const conversionRecords = unitConversionHook.conversions.map((uc: UnitConversion) => ({
                        item_id: newItemId,
                        unit_name: uc.unit.name,
                        conversion_rate: uc.conversion,
                        base_price: uc.basePrice,
                        sell_price: uc.sellPrice,
                    }));
                    const { error: conversionError } = await supabase
                        .from("unit_conversions")
                        .insert(conversionRecords);
                    if (conversionError) {
                        console.error("Error saving unit conversions for new item:", conversionError);
                        throw conversionError;
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
        const formDataChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
        try {
            type ConversionForCompare = {
                to_unit_id?: string;
                [key: string]: unknown;
            };
            const currentConversionsForCompare = unitConversionHook.conversions
                .filter((item: UnitConversion) => item && item.unit)
                .map(({ unit, ...rest }: UnitConversion) => ({ ...rest, to_unit_id: unit.id }));
            const initialConversionsForCompare = Array.isArray(initialUnitConversions)
                ? initialUnitConversions
                    .filter(item => item && typeof item === 'object')
                    .map(item => ({
                        ...item,
                        to_unit_id: item.to_unit_id || item.unit?.id
                    }))
                : [];
            const safeSortByUnitId = (arr: ConversionForCompare[]) => {
                return [...arr].sort((a, b) => {
                    const idA = a?.to_unit_id || '';
                    const idB = b?.to_unit_id || '';
                    return idA.localeCompare(idB);
                });
            };
            const sortedCurrent = safeSortByUnitId(currentConversionsForCompare);
            const sortedInitial = safeSortByUnitId(initialConversionsForCompare);
            const conversionsChanged = JSON.stringify(sortedCurrent) !== JSON.stringify(sortedInitial);
            return formDataChanged || conversionsChanged;
        } catch (err) {
            console.error('Error in isDirty comparison:', err);
            return true;
        }
    };

    const handleCancel = () => {
        if (isDirty()) {
            confirmDialog.openConfirmDialog({
                title: "Konfirmasi Keluar",
                message: "Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang.",
                confirmText: "Tinggalkan",
                cancelText: "Batal",
                onConfirm: () => navigate("/master-data/items"),
                variant: "danger",
            });
        } else {
            navigate("/master-data/items");
        }
    };

    const handleSaveCategory = async (categoryData: { name: string; description: string }) => {
        try {
            const newCategory = await addCategoryMutation.mutateAsync(categoryData);
            const { data: updatedCategories } = await supabase.from("item_categories").select("id, name").order("name");
            if (updatedCategories) setCategories(updatedCategories);
            if (newCategory?.id) updateFormData({ category_id: newCategory.id });
            setIsAddEditModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan kategori baru.");
        }
    };

    const handleSaveType = async (typeData: { name: string; description: string }) => {
        try {
            const newType = await addTypeMutation.mutateAsync(typeData);
            const { data: updatedTypes } = await supabase.from("item_types").select("id, name").order("name");
            if (updatedTypes) setTypes(updatedTypes);
            if (newType?.id) updateFormData({ type_id: newType.id });
            setIsAddTypeModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan jenis item baru.");
        }
    };

    const handleSaveUnit = async (unitData: { name: string; description: string }) => {
        try {
            const newUnit = await addUnitMutation.mutateAsync(unitData);
            const { data: updatedUnits } = await supabase.from("item_units").select("id, name").order("name");
            if (updatedUnits) setUnits(updatedUnits);
            if (newUnit?.id) updateFormData({ unit_id: newUnit.id });
            setIsAddUnitModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan satuan baru.");
        }
    };

    const handleDeleteItem = () => {
        if (!itemId) return;
        confirmDialog.openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus item "${formData.name}"? Stok terkait akan terpengaruh.`,
            variant: "danger",
            confirmText: "Hapus",
            onConfirm: () => {
                deleteItemMutation.mutate(itemId);
            },
        });
    };

    const calculateProfitPercentage = () => {
        const { base_price, sell_price } = formData;
        if (base_price > 0 && sell_price >= 0) {
            return ((sell_price - base_price) / base_price) * 100;
        }
        return null;
    };

    const calculateSellPriceFromMargin = (margin: number) => {
        if (formData.base_price > 0) {
            const sellPrice = formData.base_price * (1 + margin / 100);
            return Math.round(sellPrice);
        }
        return 0;
    };

    const formattedUpdateAt = formData.updated_at ? formatDateTime(formData.updated_at) : "-";

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
        isDirty,
        addCategoryMutation,
        setCategories,
        addUnitMutation,
        setUnits,
        addTypeMutation,
        setTypes,
        isAddEditModalOpen,
        setIsAddEditModalOpen,
        isAddTypeModalOpen,
        setIsAddTypeModalOpen,
        isAddUnitModalOpen,
        setIsAddUnitModalOpen,
        editingMargin,
        setEditingMargin,
        marginPercentage,
        setMarginPercentage,
        editingMinStock,
        setEditingMinStock,
        minStockValue,
        setMinStockValue,
        handleSaveCategory,
        handleSaveType,
        handleSaveUnit,
        handleDeleteItem,
        calculateProfitPercentage,
        calculateSellPriceFromMargin,
        handleCancel,
        formattedUpdateAt,
    };
};