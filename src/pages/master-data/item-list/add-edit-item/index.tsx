import UnitConversionManager from "@/components/tools/unit-converter";
import { useRef, useEffect } from "react";
import {
    FaArrowLeft,
    FaTrash,
    FaHistory,
    FaPen,
    FaQuestionCircle,
} from "react-icons/fa";
import {
    Input,
    Button,
    Dropdown,
    AddEditModal,
    FormSection,
    FormField,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DescriptiveTextarea,
    CardFooter,
    FormAction,
    Checkbox,
} from "@/components/modules";
import { useAddItemPageHandlers } from "@/handlers";

const AddItem = () => {
    const expiryCheckboxRef = useRef<HTMLLabelElement>(null);
    const {
        formData,
        displayBasePrice,
        displaySellPrice,
        categories,
        types,
        units,
        saving,
        loading,
        isEditMode,
        handleChange,
        handleSubmit,
        updateFormData,
        unitConversionHook,
        isAddEditModalOpen,
        setIsAddEditModalOpen,
        isAddTypeModalOpen,
        setIsAddTypeModalOpen,
        isAddUnitModalOpen,
        setIsAddUnitModalOpen,
        handleSaveCategory,
        handleSaveType,
        handleSaveUnit,
        editingMargin,
        marginPercentage,
        editingMinStock,
        minStockValue,
        handleDeleteItem,
        calculateProfitPercentage,
        handleCancel,
        formattedUpdateAt,
        addCategoryMutation,
        addUnitMutation,
        addTypeMutation,
        marginInputRef,
        setMarginPercentage,
        minStockInputRef,
        showFefoTooltip,
        setShowFefoTooltip,
        handleDropdownChange,
        handleMarginChange,
        handleSellPriceChange,
        startEditingMargin,
        stopEditingMargin,
        handleMarginKeyDown,
        startEditingMinStock,
        stopEditingMinStock,
        handleMinStockChange,
        handleMinStockKeyDown,
        deleteItemMutation,
    } = useAddItemPageHandlers(expiryCheckboxRef);

    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (nameInputRef.current && (isEditMode ? formData.name || !loading : !isEditMode)) {
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 50);
        }
    }, [isEditMode, formData.name, loading]);

    /*
    useEffect(() => {
        if (!isEditMode && nameInputRef.current) {
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 50);
        }
    }, [isEditMode]);
    */
    if (loading && !isEditMode) {
        if (isEditMode && !formData.name) {
            return (
                <Card>
                    <CardContent className="flex justify-center items-center h-40">
                        <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                        <span className="ml-3">Memuat data item...</span>
                    </CardContent>
                </Card>
            );
        }
    }

    const formIsInvalid =
        !formData.name.trim() ||
        !formData.category_id ||
        !formData.type_id ||
        !formData.unit_id ||
        formData.base_price <= 0 ||
        formData.sell_price < 0;

    const operationsPending =
        addTypeMutation.isPending || addUnitMutation.isPending || addCategoryMutation.isPending || deleteItemMutation.isPending;

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

                    <CardTitle className="flex-grow text-center">
                        {isEditMode ? "Edit Data Item" : "Tambah Data Item Baru"}
                    </CardTitle>

                    {isEditMode && formattedUpdateAt !== "-" && (
                        <span className="text-md text-gray-500 italic whitespace-nowrap flex items-center flex-shrink-0 ml-4">
                            <FaHistory className="mr-1" size={14} />{" "}
                            {formattedUpdateAt}
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
                                                ref={nameInputRef}
                                                value={formData.name}
                                                tabIndex={1}
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                            />
                                        </FormField>

                                        <FormField label="Barcode" className="md:col-span-1">
                                            <Input
                                                name="barcode"
                                                value={formData.barcode}
                                                tabIndex={2}
                                                onChange={handleChange}
                                                className="w-full"
                                                placeholder="Masukkan barcode item"
                                            />
                                        </FormField>

                                        <FormField label="Jenis Produk" className="md:col-span-1">
                                            <Dropdown
                                                name="is_medicine"
                                                tabIndex={3}
                                                value={formData.is_medicine ? "obat" : "non-obat"}
                                                onChange={(value) => {
                                                    if (value === "obat") {
                                                        updateFormData({ is_medicine: true });
                                                    } else {
                                                        updateFormData({
                                                            is_medicine: false,
                                                            has_expiry_date: false,
                                                        });
                                                    }
                                                }}
                                                options={[
                                                    { id: "obat", name: "Obat" },
                                                    { id: "non-obat", name: "Non-Obat" },
                                                ]}
                                                withRadio
                                                searchList={false}
                                            />
                                        </FormField>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <FormField label="Kategori">
                                            {loading && categories.length === 0 ? (
                                                <Input value="Memuat kategori..." readOnly disabled />
                                            ) : (
                                                <Dropdown
                                                    name="category_id"
                                                    tabIndex={4}
                                                    value={formData.category_id}
                                                    onChange={(value) =>
                                                        handleDropdownChange("category_id", value)
                                                    }
                                                    options={categories}
                                                    placeholder="-- Pilih Kategori --"
                                                    required
                                                    onAddNew={() => setIsAddEditModalOpen(true)}
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Jenis">
                                            {loading && types.length === 0 ? (
                                                <Input value="Memuat jenis..." readOnly disabled />
                                            ) : (
                                                <Dropdown
                                                    name="type_id"
                                                    tabIndex={5}
                                                    value={formData.type_id}
                                                    onChange={(value) =>
                                                        handleDropdownChange("type_id", value)
                                                    }
                                                    options={types}
                                                    placeholder="-- Pilih Jenis --"
                                                    required
                                                    onAddNew={() => setIsAddTypeModalOpen(true)}
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Satuan">
                                            {loading && units.length === 0 ? (
                                                <Input value="Memuat satuan..." readOnly disabled />
                                            ) : (
                                                <Dropdown
                                                    name="unit_id"
                                                    tabIndex={6}
                                                    value={formData.unit_id}
                                                    onChange={(value) =>
                                                        handleDropdownChange("unit_id", value)
                                                    }
                                                    options={units}
                                                    placeholder="-- Pilih Satuan --"
                                                    required
                                                    onAddNew={() => setIsAddUnitModalOpen(true)}
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Rak">
                                            <Input
                                                name="rack"
                                                tabIndex={7}
                                                value={formData.rack}
                                                onChange={handleChange}
                                                className="w-full"
                                            />
                                        </FormField>
                                    </div>

                                    <div>
                                        <DescriptiveTextarea
                                            label="Keterangan"
                                            tabIndex={8}
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Masukkan keterangan atau deskripsi tambahan untuk item ini..."
                                        />
                                    </div>
                                </FormSection>
                            </div>

                            <div className="w-full md:w-1/4">
                                <FormSection title="Pengaturan Tambahan">
                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField label="Status">
                                            <Dropdown
                                                name="is_active"
                                                tabIndex={9}
                                                value={formData.is_active ? "true" : "false"}
                                                onChange={(value) => {
                                                    updateFormData({ is_active: value === "true" });
                                                }}
                                                options={[
                                                    { id: "true", name: "Masih dijual" },
                                                    { id: "false", name: "Tidak Dijual" },
                                                ]}
                                                withRadio
                                                searchList={false}
                                            />
                                        </FormField>

                                        <FormField
                                            label="Stok Minimal:"
                                            className="flex items-center"
                                        >
                                            <div className="ml-2 flex-grow flex items-center">
                                                {editingMinStock ? (
                                                    <Input
                                                        className="max-w-20"
                                                        ref={minStockInputRef}
                                                        type="number"
                                                        value={minStockValue}
                                                        onChange={handleMinStockChange}
                                                        onBlur={stopEditingMinStock}
                                                        onKeyDown={handleMinStockKeyDown}
                                                        min="0"
                                                    />
                                                ) : (
                                                    <div
                                                        tabIndex={10}
                                                        className="group w-full pb-1 cursor-pointer flex items-center focus:outline-none"
                                                        onClick={startEditingMinStock}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                startEditingMinStock();
                                                            }
                                                        }}
                                                        title="Klik untuk mengubah stok minimal"
                                                    >
                                                        <span>{formData.min_stock}</span>
                                                        <FaPen
                                                            className="ml-2 text-gray-400 hover:text-primary group-focus:text-primary cursor-pointer transition-colors"
                                                            size={14}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEditingMinStock();
                                                            }}
                                                            title="Edit stok minimal"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </FormField>

                                        <div
                                            className={
                                                formData.is_medicine
                                                    ? ""
                                                    : "opacity-50 pointer-events-none"
                                            }
                                        >
                                            <Checkbox
                                                id="has_expiry_date"
                                                tabIndex={11}
                                                ref={expiryCheckboxRef}
                                                label="Memiliki Tanggal Kadaluarsa"
                                                checked={formData.has_expiry_date}
                                                disabled={!formData.is_medicine}
                                                onChange={(isChecked) => updateFormData({ has_expiry_date: isChecked })}
                                                className="py-1"
                                            />
                                            <div className="mt-1 text-sm text-gray-500 flex items-center">
                                                Akan digunakan metode FEFO (First Expired First Out)
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
                                                            Barang dengan tanggal kadaluarsa terdekat akan
                                                            dikeluarkan lebih dulu saat penjualan.
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
                                                    tabIndex={12}
                                                    value={displayBasePrice}
                                                    placeholder="Rp 0"
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        setTimeout(() => {
                                                            const profit = formData.base_price > 0 ? calculateProfitPercentage() : null;
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

                                        <div className="grid grid-cols-2 gap-6 focus:outline-none">
                                            <FormField label="Margin">
                                                <div className="flex items-center focus:outline-none">
                                                    {editingMargin ? (
                                                        <div className="flex items-center focus:outline-none">
                                                            <Input
                                                                className="max-w-20 focus:outline-none"
                                                                ref={marginInputRef}
                                                                type="number"
                                                                value={marginPercentage}
                                                                onChange={handleMarginChange}
                                                                onBlur={stopEditingMargin}
                                                                onKeyDown={handleMarginKeyDown}
                                                                step="0.1"
                                                            />
                                                            <span className="ml-2 text-lg font-medium">
                                                                %
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            tabIndex={13}
                                                            className={`group w-full py-2 cursor-pointer font-semibold flex items-center ${calculateProfitPercentage() !== null
                                                                ? calculateProfitPercentage()! >= 0
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                                : "text-gray-500"
                                                            } focus:outline-none`}
                                                            onClick={startEditingMargin}
                                                            title="Klik untuk mengubah margin"
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditingMargin(); }}}
                                                        >
                                                            {calculateProfitPercentage() !== null
                                                                ? `${calculateProfitPercentage()!.toFixed(1)} %`
                                                                : "-"}
                                                            <FaPen
                                                                className="ml-4 text-gray-400 hover:text-primary group-focus:text-primary cursor-pointer transition-colors"
                                                                size={14}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEditingMargin();
                                                                }}
                                                                title="Edit margin"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </FormField>

                                            <FormField label="Harga Jual">
                                                <Input
                                                    type="text"
                                                    name="sell_price"
                                                    tabIndex={14}
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
                                <UnitConversionManager
                                    tabIndex={15}
                                    unitConversionHook={unitConversionHook}
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter>
                        <FormAction
                            onCancel={handleCancel}
                            onDelete={isEditMode ? handleDeleteItem : undefined}
                            isSaving={saving}
                            isDeleting={deleteItemMutation.isPending}
                            isEditMode={isEditMode}
                            isDisabled={formIsInvalid || operationsPending}
                            saveText="Simpan"
                            updateText="Update"
                            deleteText={
                                <span className="flex items-center">
                                    <FaTrash className="mr-2" /> Hapus
                                </span>
                            }
                        />
                    </CardFooter>
                </form>

                <AddEditModal
                    isOpen={isAddEditModalOpen}
                    onClose={() => setIsAddEditModalOpen(false)}
                    onSubmit={handleSaveCategory}
                    isLoading={addCategoryMutation.isPending}
                />

                <AddEditModal
                    isOpen={isAddTypeModalOpen}
                    onClose={() => setIsAddTypeModalOpen(false)}
                    onSubmit={handleSaveType}
                    isLoading={addTypeMutation.isPending}
                    entityName="Jenis Item"
                />

                <AddEditModal
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
