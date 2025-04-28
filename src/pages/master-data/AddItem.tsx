/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from "../../lib/supabase";
import { FaChevronDown } from "react-icons/fa";
import { Input } from "../../components/ui/Input";
import { useEffect, useState, useRef } from "react";
import { Button } from "../../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Dropdown } from "../../components/ui/Dropdown";
import { useNavigate, useParams } from "react-router-dom";
import { useAddItemForm } from "../../hooks/useAddItemForm";
import { AddCategoryModal } from "../../components/ui/AddEditModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { FormSection, FormField } from "../../components/ui/FormComponents"; // Pastikan FormField diimpor
import UnitConversionManager from "../../components/tools/UnitConversionManager";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card";
import { FaArrowLeft, FaSave, FaTrash, FaHistory, FaPen, FaQuestionCircle } from 'react-icons/fa';

const formatDateTime = (isoString: string | null | undefined): string => {
    if (!isoString) return "-";
    try {
        const date = new Date(isoString);
        return date.toLocaleString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return "Invalid Date";
    }
};

const AddItem = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const confirmDialog = useConfirmDialog();
    const [editingMargin, setEditingMargin] = useState(false);
    const [marginPercentage, setMarginPercentage] = useState<string>('0');
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
    const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [isDescriptionHovered, setIsDescriptionHovered] = useState(false);
    const [editingMinStock, setEditingMinStock] = useState(false);
    const [minStockValue, setMinStockValue] = useState<string>('0');
    const [showFefoTooltip, setShowFefoTooltip] = useState(false);
    const descriptionRef = useRef<HTMLDivElement>(null);
    const marginInputRef = useRef<HTMLInputElement>(null);
    const minStockInputRef = useRef<HTMLInputElement>(null);

    const {
        formData, displayBasePrice, displaySellPrice, categories, types, customerLevels, units,
        saving, loading, isEditMode, handleChange, handleSelectChange: originalHandleSelectChange, handleSubmit, updateFormData,
        unitConversionHook, isDirty, addCategoryMutation, setCategories, setTypes, addUnitMutation, setUnits
    } = useAddItemForm(id || undefined);

    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase.from("items").delete().eq("id", itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['items'],
                refetchType: 'all'
            });
            navigate("/master-data/items");
        },
        onError: (_error) => {
            alert("Gagal menghapus item. Silakan coba lagi.");
        },
    });

    const addTypeMutation = useMutation({
        mutationFn: async (newType: { name: string; description: string }) => {
            const { data, error } = await supabase
                .from("item_types")
                .insert(newType)
                .select('id, name, description')
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['types'] });
        },
        onError: (_error) => { },
    });

    const handleCancel = () => {
        if (isDirty()) {
            confirmDialog.openConfirmDialog({
                title: "Konfirmasi Keluar",
                message: "Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang.",
                confirmText: "Tinggalkan",
                cancelText: "Batal",
                onConfirm: () => navigate("/master-data/items"),
                variant: 'danger'
            });
        } else {
            navigate("/master-data/items");
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        originalHandleSelectChange(e);
        if (name === 'unit_id' && value) {
            const selectedUnit = units.find(unit => unit.id === value);
            if (selectedUnit) {
                unitConversionHook.setBaseUnit(selectedUnit.name);
            }
        }
    };

    const handleDropdownChange = (name: string, value: string) => {
        const syntheticEvent = {
            target: { name, value },
        } as React.ChangeEvent<HTMLSelectElement>;

        handleSelectChange(syntheticEvent);
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty()) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

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

    const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMarginPercentage(value);

        const margin = parseFloat(value);
        if (!isNaN(margin) && formData.base_price > 0) {
            const newSellPrice = calculateSellPriceFromMargin(margin);
            updateFormData({ sell_price: newSellPrice });
        }
    };

    const handleSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange(e);
        setTimeout(() => {
            const profit = calculateProfitPercentage();
            if (profit !== null) {
                setMarginPercentage(profit.toFixed(1));
            }
        }, 0);
    };

    const startEditingMargin = () => {
        const currentMargin = calculateProfitPercentage();
        setMarginPercentage(currentMargin !== null ? currentMargin.toFixed(1) : '0');
        setEditingMargin(true);
        setTimeout(() => {
            if (marginInputRef.current) {
                marginInputRef.current.focus();
                marginInputRef.current.select();
            }
        }, 10);
    };

    const stopEditingMargin = () => {
        setEditingMargin(false);

        const margin = parseFloat(marginPercentage);
        if (!isNaN(margin) && formData.base_price > 0) {
            const newSellPrice = calculateSellPriceFromMargin(margin);
            updateFormData({ sell_price: newSellPrice });
        }
    };

    const handleMarginKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            stopEditingMargin();
        }
    };

    const startEditingMinStock = () => {
        setMinStockValue(String(formData.min_stock));
        setEditingMinStock(true);
        setTimeout(() => {
            if (minStockInputRef.current) {
                minStockInputRef.current.focus();
                minStockInputRef.current.select();
            }
        }, 10);
    };

    const stopEditingMinStock = () => {
        setEditingMinStock(false);
        const stockValue = parseInt(minStockValue, 10);
        if (!isNaN(stockValue) && stockValue >= 0) {
            updateFormData({ min_stock: stockValue });
        } else {
            setMinStockValue(String(formData.min_stock));
        }
    };

    const handleMinStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMinStockValue(e.target.value);
    };

    const handleMinStockKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            stopEditingMinStock();
        }
    };

    const handleDelete = () => {
        if (!id) return;
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus item "${formData.name}"? Stok terkait akan terpengaruh.`,
            variant: 'danger',
            confirmText: "Hapus",
            onConfirm: () => {
                deleteItemMutation.mutate(id);
            }
        });
    };

    const handleSaveCategory = async (categoryData: { name: string; description: string }) => {
        try {
            const newCategory = await addCategoryMutation.mutateAsync(categoryData);
            const { data: updatedCategories } = await supabase
                .from("item_categories")
                .select("id, name")
                .order("name");
            if (updatedCategories) {
                setCategories(updatedCategories);
            }
            if (newCategory?.id) {
                updateFormData({ category_id: newCategory.id });
            }
            setIsAddCategoryModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan kategori baru.");
        }
    };

    const handleSaveType = async (typeData: { name: string; description: string }) => {
        try {
            const newType = await addTypeMutation.mutateAsync(typeData);
            const { data: updatedTypes } = await supabase
                .from("item_types")
                .select("id, name")
                .order("name");
            if (updatedTypes) {
                setTypes(updatedTypes);
            }
            if (newType?.id) {
                updateFormData({ type_id: newType.id });
            }
            setIsAddTypeModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan jenis item baru.");
        }
    };

    const handleSaveUnit = async (unitData: { name: string; description: string }) => {
        try {
            const newUnit = await addUnitMutation.mutateAsync(unitData);
            const { data: updatedUnits } = await supabase
                .from("item_units")
                .select("id, name")
                .order("name");
            if (updatedUnits) setUnits(updatedUnits);
            if (newUnit?.id) updateFormData({ unit_id: newUnit.id });
            setIsAddUnitModalOpen(false);
        } catch (error) {
            alert("Gagal menyimpan satuan baru.");
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center h-40">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="ml-3">Memuat data...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <div>
            <Card>
                <CardHeader className="flex items-center">
                    <Button
                        variant="text"
                        size="sm"
                        onClick={handleCancel}
                        className="text-gray-500 p-2 rounded-full transition-transform duration-200 ease-in-out hover:scale-110 active:scale-95 flex items-center"
                        title="Kembali ke Daftar Item"
                    >
                        <FaArrowLeft size={18} />
                        <span className="ml-2">Back</span>
                    </Button>

                    <CardTitle className="flex-grow text-center">{isEditMode ? 'Edit Data Item' : 'Tambah Data Item Baru'}</CardTitle>

                    {isEditMode && formData.updated_at && (
                        <span className="text-md text-gray-500 italic whitespace-nowrap flex items-center flex-shrink-0 ml-4">
                            <FaHistory className="mr-1" size={14} /> {formatDateTime(formData.updated_at)}
                        </span>
                    )}
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-4/5">
                                <FormSection title="Data Umum">
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                        <FormField label="Kode Item" className="md:col-span-1">
                                            <Input
                                                name="code"
                                                value={formData.code}
                                                readOnly={true}
                                                className="w-full"
                                            />
                                        </FormField>

                                        <FormField label="Nama Item" className="md:col-span-2">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                            />
                                        </FormField>

                                        <FormField label="Barcode" className="md:col-span-1">
                                            <Input
                                                name="barcode"
                                                value={formData.barcode}
                                                onChange={handleChange}
                                                className="w-full"
                                                placeholder="Masukkan barcode item"
                                            />
                                        </FormField>

                                        <FormField label="Jenis Produk" className="md:col-span-1">
                                            <Dropdown
                                                name="is_medicine"
                                                value={formData.is_medicine ? "obat" : "non-obat"}
                                                onChange={(value) => {
                                                    if (value === "obat") {
                                                        updateFormData({ is_medicine: true });
                                                    } else {
                                                        updateFormData({ is_medicine: false, has_expiry_date: false });
                                                    }
                                                }}
                                                options={[
                                                    { id: "obat", name: "Obat" },
                                                    { id: "non-obat", name: "Non-Obat" }
                                                ]}
                                                withRadio
                                                searchList={false}
                                            />
                                        </FormField>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <FormField label="Kategori">
                                            <Dropdown
                                                name="category_id"
                                                value={formData.category_id}
                                                onChange={(value) => handleDropdownChange("category_id", value)}
                                                options={categories}
                                                placeholder="-- Pilih Kategori --"
                                                required
                                                onAddNew={() => setIsAddCategoryModalOpen(true)}
                                            />
                                        </FormField>

                                        <FormField label="Jenis">
                                            {categories.length === 0 && (
                                                <span className="inline-block w-4 h-4 mr-2 border-t-2 border-primary rounded-full animate-spin"></span>
                                            )}
                                            <Dropdown
                                                name="type_id"
                                                value={formData.type_id}
                                                onChange={(value) => handleDropdownChange("type_id", value)}
                                                options={types}
                                                placeholder="-- Pilih Jenis --"
                                                required
                                                onAddNew={() => setIsAddTypeModalOpen(true)}
                                            />
                                        </FormField>

                                        <FormField label="Satuan">
                                            <Dropdown
                                                name="unit_id"
                                                value={formData.unit_id}
                                                onChange={(value) => handleDropdownChange("unit_id", value)}
                                                options={units}
                                                placeholder="-- Pilih Satuan --"
                                                required
                                                onAddNew={() => setIsAddUnitModalOpen(true)}
                                            />
                                        </FormField>

                                        <FormField label="Rak">
                                            <Input
                                                name="rack"
                                                value={formData.rack}
                                                onChange={handleChange}
                                                className="w-full"
                                            />
                                        </FormField>
                                    </div>

                                    <div className="mt-2 pt-2">
                                        <button
                                            type="button"
                                            onMouseEnter={() => setIsDescriptionHovered(true)}
                                            onMouseLeave={() => setIsDescriptionHovered(false)}
                                            className="flex items-center text-blue-500 transition-colors"
                                            onClick={() => setShowDescription(!showDescription)}
                                        >
                                            <span className="mr-2 text-md text-blue-500 hover:text-blue-600">Keterangan</span>
                                            <motion.div
                                                animate={{ rotate: (showDescription || isDescriptionHovered) ? 180 : 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="transform"
                                            >
                                                <FaChevronDown size={12} />
                                            </motion.div>
                                        </button>
                                        <AnimatePresence>
                                            {(showDescription || isDescriptionHovered) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                    onMouseEnter={() => setIsDescriptionHovered(true)}
                                                    onMouseLeave={() => setIsDescriptionHovered(false)}
                                                >
                                                    <div className="mt-2 min-h-[100px] max-h-[200px]" ref={descriptionRef}>
                                                        <textarea
                                                            name="description"
                                                            value={formData.description}
                                                            onChange={handleChange}
                                                            className="w-full h-full min-h-[100px] max-h-[200px] p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary focus:border-transparent"
                                                            rows={3}
                                                            onFocus={() => setShowDescription(true)}
                                                            onBlur={() => setShowDescription(false)}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                </FormSection>
                            </div>

                            <div className="w-full md:w-1/4">
                                <FormSection title="Diskon Level Pelanggan">
                                    {customerLevels.length === 0 ? (
                                        <p className="text-sm text-gray-500">Belum ada level pelanggan.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {customerLevels.map((level) => (
                                                <FormField key={level.id} label={`${level.level_name} (%)`}>
                                                    <Input
                                                        type="number"
                                                        name={`discount_level_${level.id}`}
                                                        value={formData.customer_level_discounts?.find(d => d.customer_level_id === level.id)?.discount_percentage ?? ''}
                                                        onChange={handleChange}
                                                        placeholder="0"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                    />
                                                </FormField>
                                            ))}
                                        </div>
                                    )}
                                </FormSection>
                                <FormSection title="Pengaturan Tambahan">
                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField label="Status">
                                            <Dropdown
                                                name="is_active"
                                                value={formData.is_active ? "true" : "false"}
                                                onChange={(value) => {
                                                    updateFormData({ is_active: value === "true" });
                                                }}
                                                options={[
                                                    { id: "true", name: "Masih dijual" },
                                                    { id: "false", name: "Tidak Dijual" }
                                                ]}
                                                withRadio
                                                searchList={false}
                                            />
                                        </FormField>

                                        <FormField label="Stok Minimal:" className="flex items-center">
                                            <div className="ml-2 flex-grow flex items-center">
                                                {editingMinStock ? (
                                                    <input
                                                        ref={minStockInputRef}
                                                        type="number"
                                                        value={minStockValue}
                                                        onChange={handleMinStockChange}
                                                        onBlur={stopEditingMinStock}
                                                        onKeyDown={handleMinStockKeyDown}
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                        min="0"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full pb-1 cursor-pointer flex items-center"
                                                        onClick={startEditingMinStock}
                                                        title="Klik untuk mengubah stok minimal"
                                                    >
                                                        <span>{formData.min_stock}</span>
                                                        <FaPen
                                                            className="ml-2 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors"
                                                            size={14}
                                                            onClick={(e) => { e.stopPropagation(); startEditingMinStock(); }}
                                                            title="Edit stok minimal"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </FormField>

                                        <div className={formData.is_medicine ? "" : "opacity-50 pointer-events-none"}>
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    name="has_expiry_date"
                                                    checked={formData.has_expiry_date}
                                                    disabled={!formData.is_medicine}
                                                    onChange={handleChange}
                                                />
                                                <span className="ml-2">Memiliki Tanggal Kadaluarsa</span>
                                            </label>
                                            <div className="mt-1 text-sm text-gray-500 flex items-center">
                                                Akan digunakan metode FEFO
                                                (First Expired First Out)
                                                <div
                                                    className="relative ml-1 inline-block"
                                                    onMouseEnter={() => setShowFefoTooltip(true)}
                                                    onMouseLeave={() => setShowFefoTooltip(false)}
                                                >
                                                    <FaQuestionCircle
                                                        className="text-gray-400 cursor-help"
                                                        size={14}
                                                    />
                                                    {showFefoTooltip && (
                                                        <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs p-2 bg-white text-gray-700 text-xs rounded-md shadow-lg z-10 border border-gray-200">
                                                            Barang dengan tanggal kadaluarsa terdekat akan dikeluarkan lebih dulu saat penjualan.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FormSection>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-1/4">
                                <FormSection title="Harga Pokok & Jual">
                                    <div className="flex flex-col space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField label="Satuan Dasar">
                                                <Input
                                                    type="text"
                                                    value={unitConversionHook.baseUnit}
                                                    readOnly={true}
                                                    className="w-full"
                                                />
                                            </FormField>

                                            <FormField label="Harga Pokok">
                                                <Input
                                                    type="text"
                                                    name="base_price"
                                                    value={displayBasePrice}
                                                    placeholder="Rp 0"
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        setTimeout(() => {
                                                            const profit = calculateProfitPercentage();
                                                            if (profit !== null) {
                                                                setMarginPercentage(profit.toFixed(1));
                                                            }
                                                        }, 0);
                                                    }}
                                                    min="0"
                                                    className="w-full"
                                                    required
                                                />
                                            </FormField>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <FormField label="Margin">
                                                <div className="flex items-center">
                                                    {editingMargin ? (
                                                        <div className="flex items-center w-full">
                                                            <input
                                                                ref={marginInputRef}
                                                                type="number"
                                                                value={marginPercentage}
                                                                onChange={handleMarginChange}
                                                                onBlur={stopEditingMargin}
                                                                onKeyDown={handleMarginKeyDown}
                                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                                step="0.1"
                                                            />
                                                            <span className="ml-4 text-lg font-medium">%</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center w-full">
                                                            <div
                                                                className={`w-full py-2 cursor-pointer font-semibold flex items-center ${calculateProfitPercentage() !== null ? calculateProfitPercentage()! >= 0 ? 'text-green-600' : 'text-red-600' : 'text-gray-500'}`}
                                                                onClick={startEditingMargin}
                                                                title="Klik untuk mengubah margin"
                                                            >
                                                                {calculateProfitPercentage() !== null ? `${calculateProfitPercentage()!.toFixed(1)}%` : '-'}
                                                                <FaPen
                                                                    className="ml-4 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors"
                                                                    size={14}
                                                                    onClick={(e) => { e.stopPropagation(); startEditingMargin(); }}
                                                                    title="Edit margin"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </FormField>
                                            
                                            <FormField label="Harga Jual">
                                                <Input
                                                    type="text"
                                                    name="sell_price"
                                                    value={displaySellPrice}
                                                    placeholder="Rp 0"
                                                    onChange={handleSellPriceChange}
                                                    min="0"
                                                    className="w-full"
                                                    required
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                </FormSection>
                            </div>

                            <div className="w-full md:w-3/4">
                                <UnitConversionManager unitConversionHook={unitConversionHook} />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        {isEditMode ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleDelete}
                                disabled={deleteItemMutation.isPending}
                                isLoading={deleteItemMutation.isPending}
                            >
                                <span className="flex items-center">
                                    <FaTrash className="mr-2" /> Hapus
                                </span>
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={handleCancel}> Batal </Button>
                        )}
                        <Button type="submit" disabled={saving || !isDirty()} isLoading={saving}>
                            <span className="flex items-center">
                                <FaSave className="mr-2" /> {isEditMode ? 'Update' : 'Simpan'}
                            </span>
                        </Button>
                    </CardFooter>
                </form>

                <AddCategoryModal
                    isOpen={isAddCategoryModalOpen}
                    onClose={() => setIsAddCategoryModalOpen(false)}
                    onSubmit={handleSaveCategory}
                    isLoading={addCategoryMutation.isPending}
                />

                <AddCategoryModal
                    isOpen={isAddTypeModalOpen}
                    onClose={() => setIsAddTypeModalOpen(false)}
                    onSubmit={handleSaveType}
                    isLoading={addTypeMutation.isPending}
                    entityName="Jenis Item"
                />

                <AddCategoryModal
                    isOpen={isAddUnitModalOpen}
                    onClose={() => setIsAddUnitModalOpen(false)}
                    onSubmit={handleSaveUnit}
                    isLoading={addUnitMutation.isPending}
                    entityName="Satuan"
                />
            </Card>
        </div>
    );
};

export default AddItem;
