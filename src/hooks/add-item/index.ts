import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUnitConversion } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    formatRupiah,
    extractNumericValue,
    formatDateTime,
} from "@/lib/formatters";
import { useConfirmDialog } from "@/components/modules";
import type {
    UnitConversion,
    Category,
    MedicineType,
    Unit,
    FormData,
    UnitData,
    UseAddItemFormProps,
    DBUnitConversion,
} from "@/types";
import {
    generateTypeCode,
    generateUnitCode,
    generateCategoryCode,
} from "@/hooks/add-item/helper";

export const useAddItemForm = ({
    itemId,
    initialSearchQuery,
    onClose,
}: UseAddItemFormProps) => {
    const queryClient = useQueryClient();
    const [initialFormData, setInitialFormData] = useState<FormData | null>(null);
    const [initialUnitConversions, setInitialUnitConversions] = useState<
        UnitConversion[] | null
    >(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(Boolean(itemId));
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<MedicineType[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [displayBasePrice, setDisplayBasePrice] = useState("");
    const [displaySellPrice, setDisplaySellPrice] = useState("");
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

    const calculateProfitPercentage = (
        base_price?: number,
        sell_price?: number
    ) => {
        const currentBasePrice = base_price ?? formData.base_price;
        const currentSellPrice = sell_price ?? formData.sell_price;
        if (currentBasePrice > 0 && currentSellPrice >= 0) {
            return ((currentSellPrice - currentBasePrice) / currentBasePrice) * 100;
        }
        return null;
    };

    const setFormToPristineAddState = () => {
        const pristineState: FormData = {
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
        };
        setFormData({ ...pristineState });
        setDisplayBasePrice(formatRupiah(0));
        setDisplaySellPrice(formatRupiah(0));
        setMarginPercentage("0");
        setMinStockValue("10");
        unitConversionHook.resetConversions();
        unitConversionHook.setBaseUnit(
            units.find((u) => u.id === pristineState.unit_id)?.name || ""
        );
        unitConversionHook.setBasePrice(pristineState.base_price);
        unitConversionHook.setSellPrice(pristineState.sell_price);
        setInitialUnitConversions([]);
    };

    const updateFormData = (newData: Partial<FormData>) => {
        if (newData.sell_price !== undefined) {
            setDisplaySellPrice(formatRupiah(newData.sell_price));
        }
        if (newData.base_price !== undefined) {
            setDisplayBasePrice(formatRupiah(newData.base_price));
        }
        setFormData((prev) => {
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
            setIsEditMode(true);
            fetchItemData(itemId);
        } else {
            setIsEditMode(false);
            const pristineDefaultState: FormData = {
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
            };
            setInitialFormData(pristineDefaultState);

            const formDataForAddMode: FormData = {
                ...pristineDefaultState,
                name: initialSearchQuery || "",
            };
            setFormData(formDataForAddMode);
            setDisplayBasePrice(formatRupiah(formDataForAddMode.base_price));
            setDisplaySellPrice(formatRupiah(formDataForAddMode.sell_price));
            setMarginPercentage("0");
            unitConversionHook.resetConversions();
            unitConversionHook.setBaseUnit("");
            unitConversionHook.setBasePrice(0);
            unitConversionHook.setSellPrice(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId, initialSearchQuery]);

    useEffect(() => {
        const generateItemCode = async () => {
            if (!formData.type_id || !formData.category_id || !formData.unit_id)
                return;
            const typeCode = generateTypeCode(formData.type_id, types);
            const unitCode = generateUnitCode(formData.unit_id, units);
            const categoryCode = generateCategoryCode(
                formData.category_id,
                categories
            );
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
                setFormData((prevFormData) => ({
                    ...prevFormData,
                    code: generatedCode,
                }));
            } catch (error) {
                console.error("Error generating item code:", error);
            }
        };
        if (
            formData.type_id &&
            formData.category_id &&
            formData.unit_id &&
            categories.length > 0 &&
            types.length > 0 &&
            units.length > 0
        ) {
            generateItemCode();
        }
    }, [
        formData.type_id,
        formData.category_id,
        formData.unit_id,
        categories,
        types,
        units,
    ]);

    useEffect(() => {
        if (
            unitConversionHook.basePrice > 0 &&
            unitConversionHook.conversions.length > 0
        ) {
            unitConversionHook.recalculateBasePrices();
        }
    }, [
        unitConversionHook.basePrice,
        unitConversionHook.recalculateBasePrices,
        unitConversionHook.conversions.length,
        unitConversionHook,
    ]);

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
                .select(
                    `
                    *, updated_at,
                    unit_conversions
                `
                )
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
                is_medicine:
                    itemData.is_medicine !== undefined ? itemData.is_medicine : true,
                has_expiry_date:
                    itemData.has_expiry_date !== undefined
                        ? itemData.has_expiry_date
                        : false,
                updated_at: itemData.updated_at,
            });
            setInitialFormData({ ...formData });

            let parsedConversionsFromDB = [];
            if (itemData.unit_conversions) {
                try {
                    parsedConversionsFromDB =
                        typeof itemData.unit_conversions === "string"
                            ? JSON.parse(itemData.unit_conversions)
                            : itemData.unit_conversions;
                } catch (e) {
                    console.error("Error parsing unit_conversions from DB:", e);
                    parsedConversionsFromDB = [];
                }
            }

            if (Array.isArray(parsedConversionsFromDB)) {
                const mappedConversions = parsedConversionsFromDB.map(
                    (conv: DBUnitConversion) => {
                        const unitDetail = units.find(u => u.id === conv.to_unit_id) || units.find(u => u.name === conv.unit_name);
                        return {
                            id: conv.id || `${Date.now().toString()}-${Math.random().toString(36).slice(2,9)}`,
                            unit_name: conv.unit_name,
                            to_unit_id: unitDetail ? unitDetail.id : (conv.to_unit_id || ""),
                            unit: unitDetail ? { id: unitDetail.id, name: unitDetail.name } : { id: conv.to_unit_id || "", name: conv.unit_name || "Unknown Unit"},
                            conversion: conv.conversion_rate || 0,
                            basePrice: conv.base_price || 0,
                            sellPrice: conv.sell_price || 0,
                            conversion_rate: conv.conversion_rate || 0,
                        };
                    }
                );
                setInitialUnitConversions(mappedConversions);
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
                    conversions =
                        typeof itemData.unit_conversions === "string"
                            ? JSON.parse(itemData.unit_conversions)
                            : itemData.unit_conversions;
                } catch (e) {
                    console.error("Error parsing unit_conversions:", e);
                    conversions = [];
                }
            }
            if (Array.isArray(conversions)) {
                for (const conv of conversions) {
                    const unitDetail = units.find((u) => u.name === conv.unit_name);
                    if (unitDetail && typeof conv.conversion_rate === "number") {
                        unitConversionHook.addUnitConversion({
                            to_unit_id: unitDetail.id,
                            unit_name: unitDetail.name,
                            unit: { id: unitDetail.id, name: unitDetail.name },
                            conversion: conv.conversion_rate || 0,
                            basePrice: conv.base_price || 0,
                            sellPrice: conv.sell_price || 0,
                            conversion_rate: conv.conversion_rate || 0,
                        });
                    } else if (typeof conv.conversion_rate === "number") {
                        console.warn(
                            `Unit dengan nama "${conv.unit_name}" tidak ditemukan di daftar unit utama. Menggunakan placeholder.`
                        );
                        const placeholderUnit: UnitData = {
                            id:
                                conv.to_unit_id ||
                                `temp_id_${Date.now()}_${Math.random()
                                    .toString(36)
                                    .substr(2, 9)}`,
                            name: conv.unit_name || "Unknown Unit",
                        };
                        unitConversionHook.addUnitConversion({
                            to_unit_id: placeholderUnit.id,
                            unit_name: placeholderUnit.name,
                            unit: placeholderUnit,
                            conversion: conv.conversion_rate || 0,
                            basePrice: conv.base_price || 0,
                            sellPrice: conv.sell_price || 0,
                            conversion_rate: conv.conversion_rate || 0,
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
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
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
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const addCategoryMutation = useMutation({
        mutationFn: async (newCategory: { name: string; description: string }) => {
            const { data, error } = await supabase
                .from("item_categories")
                .insert(newCategory)
                .select("id, name, description")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
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
                .select("id, name, description")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["units"] });
        },
        onError: (error) => {
            console.error("Error adding unit:", error);
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemIdToDelete: string) => {
            const { error } = await supabase
                .from("items")
                .delete()
                .eq("id", itemIdToDelete);
            if (error) throw error;
        },
        onSuccess: () => {
            onClose();
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
                    unit_conversions: unitConversionHook.conversions.map((uc) => ({
                        unit_name: uc.unit.name,
                        to_unit_id: uc.to_unit_id,
                        conversion_rate: uc.conversion_rate,
                        base_price: uc.basePrice,
                        sell_price: uc.sellPrice,
                    })),
                };
                const { error: updateError } = await supabase
                    .from("items")
                    .update(itemUpdateData)
                    .eq("id", itemId);
                if (updateError) throw updateError;
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
                    unit_conversions: unitConversionHook.conversions.map((uc) => ({
                        unit_name: uc.unit.name,
                        to_unit_id: uc.to_unit_id,
                        conversion_rate: uc.conversion_rate,
                        base_price: uc.basePrice,
                        sell_price: uc.sellPrice,
                    })),
                };
                const { data: insertedItem, error: mainError } = await supabase
                    .from("items")
                    .insert(mainItemData)
                    .select("id")
                    .single();
                if (mainError) throw mainError;
                if (!insertedItem)
                    throw new Error("Gagal mendapatkan ID item baru setelah insert.");
            }
            queryClient.invalidateQueries({
                queryKey: ["items"],
                refetchType: "all",
            });
            onClose();
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Gagal menyimpan data item. Silakan coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    const isDirty = () => {
        if (!initialFormData) return false;
        const formDataChanged =
            JSON.stringify(formData) !== JSON.stringify(initialFormData);

        type ConversionForCompare = {
            to_unit_id: string;
            conversion_rate: number;
            basePrice: number;
            sellPrice: number;
        };

        const mapConversionForComparison = (conv: UnitConversion): ConversionForCompare | null => {
            if (!conv || !conv.unit || !conv.unit.id) return null;
            return {
                to_unit_id: conv.unit.id,
                conversion_rate: conv.conversion_rate,
                basePrice: conv.basePrice,
                sellPrice: conv.sellPrice,
            };
        };

        const currentConversionsForCompare = unitConversionHook.conversions
            .map(mapConversionForComparison)
            .filter(Boolean) as ConversionForCompare[];

        const initialConversionsForCompare = Array.isArray(initialUnitConversions)
            ? initialUnitConversions
                .map(mapConversionForComparison)
                .filter(Boolean) as ConversionForCompare[]
            : [];

        const safeSortByUnitId = (arr: ConversionForCompare[]) => {
            return [...arr].sort((a, b) => a.to_unit_id.localeCompare(b.to_unit_id));
        };

        const sortedCurrent = safeSortByUnitId(currentConversionsForCompare);
        const sortedInitial = safeSortByUnitId(initialConversionsForCompare);

        const conversionsChanged = JSON.stringify(sortedCurrent) !== JSON.stringify(sortedInitial);
        return formDataChanged || conversionsChanged;
    };

    const handleCancel = () => {
        if (isDirty()) {
            confirmDialog.openConfirmDialog({
                title: "Konfirmasi Keluar",
                message:
                    "Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang.",
                confirmText: "Tinggalkan",
                cancelText: "Batal",
                onConfirm: () => onClose(),
                variant: "danger",
            });
        } else {
            onClose();
        }
    };

    const handleSaveCategory = async (categoryData: {
        name: string;
        description: string;
    }) => {
        try {
            const newCategory = await addCategoryMutation.mutateAsync(categoryData);
            const { data: updatedCategories } = await supabase
                .from("item_categories")
                .select("id, name")
                .order("name");
            if (updatedCategories) setCategories(updatedCategories);
            if (newCategory?.id) updateFormData({ category_id: newCategory.id });
            setIsAddEditModalOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            alert("Gagal menyimpan kategori baru.");
        }
    };

    const handleSaveType = async (typeData: {
        name: string;
        description: string;
    }) => {
        try {
            const newType = await addTypeMutation.mutateAsync(typeData);
            const { data: updatedTypes } = await supabase
                .from("item_types")
                .select("id, name")
                .order("name");
            if (updatedTypes) setTypes(updatedTypes);
            if (newType?.id) updateFormData({ type_id: newType.id });
            setIsAddTypeModalOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            alert("Gagal menyimpan jenis item baru.");
        }
    };

    const handleSaveUnit = async (unitData: {
        name: string;
        description: string;
    }) => {
        try {
            const newUnit = await addUnitMutation.mutateAsync(unitData);
            const { data: updatedUnits } = await supabase
                .from("item_units")
                .select("id, name")
                .order("name");
            if (updatedUnits) setUnits(updatedUnits);
            if (newUnit?.id) updateFormData({ unit_id: newUnit.id });
            setIsAddUnitModalOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const calculateSellPriceFromMargin = (margin: number) => {
        if (formData.base_price > 0) {
            const sellPrice = formData.base_price * (1 + margin / 100);
            return Math.round(sellPrice);
        }
        return 0;
    };

    const resetForm = () => {
        if (isEditMode && initialFormData && initialUnitConversions) {
            setFormData({ ...initialFormData });
            setDisplayBasePrice(formatRupiah(initialFormData.base_price || 0));
            setDisplaySellPrice(formatRupiah(initialFormData.sell_price || 0));

            const profit = calculateProfitPercentage(
                initialFormData.base_price || 0,
                initialFormData.sell_price || 0
            );
            setMarginPercentage(profit !== null ? profit.toFixed(1) : "0");
            setMinStockValue(String(initialFormData.min_stock || 10));

            unitConversionHook.resetConversions();
            const baseUnitName =
                units.find((u) => u.id === initialFormData.unit_id)?.name || "";
            unitConversionHook.setBaseUnit(baseUnitName);
            unitConversionHook.setBasePrice(initialFormData.base_price || 0);
            unitConversionHook.setSellPrice(initialFormData.sell_price || 0);
            unitConversionHook.skipNextRecalculation();

            initialUnitConversions.forEach((convDataFromDB) => {
                const unitDetails = units.find(
                    (u) => u.name === convDataFromDB.unit_name
                );
                if (unitDetails && typeof convDataFromDB.conversion_rate === "number") {
                    unitConversionHook.addUnitConversion({
                        to_unit_id: unitDetails.id,
                        unit_name: unitDetails.name,
                        unit: unitDetails,
                        conversion: convDataFromDB.conversion,
                        basePrice: convDataFromDB.basePrice || 0,
                        sellPrice: convDataFromDB.sellPrice || 0,
                        conversion_rate: convDataFromDB.conversion_rate,
                    });
                }
            });
        } else {
            setFormToPristineAddState();
        }
    };

    const formattedUpdateAt = formData.updated_at
        ? formatDateTime(formData.updated_at)
        : "-";

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
        calculateSellPriceFromMargin,
        handleCancel,
        calculateProfitPercentage,
        formattedUpdateAt,
        deleteItemMutation,
        resetForm,
        confirmDialog,
    };
};
