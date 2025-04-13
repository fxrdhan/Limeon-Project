import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { FaArrowLeft, FaSave, FaTrash, FaHistory } from 'react-icons/fa';
import { FormSection, FormField } from "../../components/ui/FormComponents";
import { useAddItemForm } from "../../hooks/useAddItemForm";
import UnitConversionManager from "../../components/tools/UnitConversionManager";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { supabase } from "../../lib/supabase";

const selectClassName = "bg-white w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
const addButtonClassName = "ml-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600";
const textareaClassName = "w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

const formatDateTime = (isoString: string | null | undefined): string => {
    if (!isoString) return "-";
    try {
        const date = new Date(isoString);
        return date.toLocaleString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const marginInputRef = useRef<HTMLInputElement>(null);

    const {
        formData, displayBasePrice, displaySellPrice, categories, types, units,
        saving, loading, isEditMode, handleChange, handleSelectChange: originalHandleSelectChange, handleSubmit, updateFormData,
        unitConversionHook, isDirty
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
            console.log("Item berhasil dihapus.");
            navigate("/master-data/items");
        },
        onError: (error) => {
            console.error("Error deleting item:", error);
            alert("Gagal menghapus item. Silakan coba lagi.");
        },
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
        handleChange(e); // Update the form data with the new selling price
        
        // Calculate and update the margin percentage
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
                            <div className="w-full md:w-3/4">
                                <FormSection title="Data Umum">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <FormField label="Kode Item" className="md:col-span-1">
                                            <Input
                                                name="code"
                                                value={formData.code}
                                                readOnly={true}
                                                className="w-full"
                                            />
                                        </FormField>
                                        
                                        <FormField label="Nama Item" className="md:col-span-3">
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                            />
                                        </FormField>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormField label="Kategori">
                                            <div className="flex">
                                                <select
                                                    name="category_id"
                                                    value={formData.category_id}
                                                    onChange={handleSelectChange}
                                                    className={selectClassName}
                                                    required
                                                >
                                                    <option value="">-- Pilih Kategori --</option>
                                                    {categories.map((category) => (
                                                        <option key={category.id} value={category.id}>
                                                            {category.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className={addButtonClassName}
                                                    onClick={() => navigate("/master-data/categories/add")}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </FormField>

                                        <FormField label="Jenis">
                                            <div className="flex">
                                                {categories.length === 0 && (
                                                    <span className="inline-block w-4 h-4 mr-2 border-t-2 border-primary rounded-full animate-spin"></span>
                                                )}
                                                <select
                                                    name="type_id" 
                                                    value={formData.type_id}
                                                    onChange={handleSelectChange}
                                                    className={selectClassName}
                                                    required
                                                >
                                                    <option value="">-- Pilih Jenis --</option>
                                                    {types.map((type) => (
                                                        <option key={type.id} value={type.id}>
                                                            {type.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className={addButtonClassName}
                                                    onClick={() => navigate("/master-data/types/add")}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </FormField>
                                        
                                        <FormField label="Satuan">
                                            <div className="flex">
                                                <select
                                                    name="unit_id"
                                                    value={formData.unit_id}
                                                    onChange={handleSelectChange}
                                                    className={selectClassName}
                                                    required
                                                >
                                                    <option value="">-- Pilih Satuan --</option>
                                                    {units.map((unit) => (
                                                        <option key={unit.id} value={unit.id}>
                                                            {unit.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className={addButtonClassName}
                                                    onClick={() => navigate("/master-data/units/add")}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </FormField>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormField label="Jenis Produk">
                                            <div className="space-x-6 mt-6">
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="is_medicine"
                                                        checked={formData.is_medicine}
                                                        onChange={() => updateFormData({ is_medicine: true })}
                                                        className="form-radio h-5 w-5 text-primary"
                                                    />
                                                    <span className="ml-2">Obat</span>
                                                </label>
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="is_medicine"
                                                        checked={!formData.is_medicine}
                                                        onChange={() => updateFormData({ is_medicine: false, has_expiry_date: false })}
                                                        className="form-radio h-5 w-5 text-primary"
                                                    />
                                                    <span className="ml-2">Non-Obat</span>
                                                </label>
                                            </div>
                                        </FormField>

                                        <FormField label="Rak">
                                            <Input
                                                name="rack"
                                                value={formData.rack}
                                                onChange={handleChange}
                                                className="w-full"
                                            />
                                        </FormField>
                                        
                                        <FormField label="Keterangan">
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                className={textareaClassName}
                                                rows={1}
                                                style={{ height: "49px", minHeight: "49px", resize: "vertical" }}
                                            />
                                        </FormField>
                                    </div>
                                </FormSection>
                            </div>

                            <div className="w-full md:w-1/4">
                                <FormSection title="Pengaturan Tambahan">
                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField label="Status Jual">
                                            <div className="space-x-6">
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="is_active"
                                                        checked={formData.is_active}
                                                        onChange={() => updateFormData({ is_active: true })}
                                                    />
                                                    <span className="ml-2">Masih dijual</span>
                                                </label>
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="is_active"
                                                        checked={!formData.is_active}
                                                        onChange={() => updateFormData({ is_active: false })}
                                                    />
                                                    <span className="ml-2">Tidak Dijual</span>
                                                </label>
                                            </div>
                                        </FormField>

                                        <FormField label="Stok Minimal">
                                            <Input
                                                type="number"
                                                name="min_stock"
                                                value={formData.min_stock}
                                                onChange={handleChange}
                                                className="w-full"
                                                onFocus={(e) => e.target.select()}
                                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                                required
                                            />
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
                                            <div className="mt-1 text-sm text-gray-500">
                                                Jika dicentang, obat ini akan menggunakan metode FEFO
                                                (First Expired First Out)
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
                                                            <span className="ml-1 text-lg font-medium">%</span>
                                                        </div>
                                                    ) : (
                                                        <span 
                                                            className={`w-full p-2 border border-gray-300 rounded-md cursor-pointer ${calculateProfitPercentage() !== null ? calculateProfitPercentage()! >= 0 ? 'text-green-600' : 'text-red-600' : 'text-gray-500'}`}
                                                            onClick={startEditingMargin}
                                                            title="Klik untuk mengubah margin"
                                                        >
                                                            {calculateProfitPercentage() !== null ? `${calculateProfitPercentage()!.toFixed(1)}%` : '-'}
                                                        </span>
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
                        <Button type="submit" disabled={saving} isLoading={saving}>
                            <span className="flex items-center">
                                <FaSave className="mr-2" /> {isEditMode ? 'Update' : 'Simpan'}
                            </span>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default AddItem;
