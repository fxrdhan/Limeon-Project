import { FaChevronDown } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import UnitConversionManager from "@/components/tools/unit-converter";
import {
    FaArrowLeft,
    FaSave,
    FaTrash,
    FaHistory,
    FaPen,
    FaQuestionCircle,
} from "react-icons/fa";
import {
    Input,
    Button,
    Dropdown,
    AddCategoryModal,
    FormSection,
    FormField,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui";
import { useAddItemPageHandlers } from "@/pages/master-data/handlers";

const AddItem = () => {
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
        isAddCategoryModalOpen,
        setIsAddCategoryModalOpen,
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
        descriptionRef,
        marginInputRef,
        setMarginPercentage,
        minStockInputRef,
        showDescription,
        setShowDescription,
        isDescriptionHovered,
        setIsDescriptionHovered,
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
    } = useAddItemPageHandlers();

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
                                            <Dropdown
                                                name="category_id"
                                                value={formData.category_id}
                                                onChange={(value) =>
                                                    handleDropdownChange("category_id", value)
                                                }
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
                                                onChange={(value) =>
                                                    handleDropdownChange("type_id", value)
                                                }
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
                                                onChange={(value) =>
                                                    handleDropdownChange("unit_id", value)
                                                }
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
                                            <span className="mr-2 text-md text-blue-500 hover:text-blue-600">
                                                Keterangan
                                            </span>
                                            <motion.div
                                                animate={{
                                                    rotate:
                                                        showDescription || isDescriptionHovered ? 180 : 0,
                                                }}
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
                                                    <div
                                                        className="mt-2 min-h-[100px] max-h-[200px]"
                                                        ref={descriptionRef}
                                                    >
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
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    name="has_expiry_date"
                                                    checked={formData.has_expiry_date}
                                                    disabled={!formData.is_medicine}
                                                    onChange={handleChange}
                                                />
                                                <span className="ml-2">
                                                    Memiliki Tanggal Kadaluarsa
                                                </span>
                                            </label>
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
                                                            <span className="ml-4 text-lg font-medium">
                                                                %
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full py-2 cursor-pointer font-semibold flex items-center ${calculateProfitPercentage() !== null
                                                                ? calculateProfitPercentage()! >= 0
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                                : "text-gray-500"
                                                            }`}
                                                            onClick={startEditingMargin}
                                                            title="Klik untuk mengubah margin"
                                                        >
                                                            {calculateProfitPercentage() !== null
                                                                ? `${calculateProfitPercentage()!.toFixed(1)}%`
                                                                : "-"}
                                                            <FaPen
                                                                className="ml-4 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors"
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
                                    unitConversionHook={unitConversionHook}
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        {isEditMode ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleDeleteItem}
                                disabled={saving}
                                isLoading={saving}
                            >
                                <span className="flex items-center">
                                    <FaTrash className="mr-2" /> Hapus
                                </span>
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                {" "}
                                Batal{" "}
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={saving}
                            isLoading={saving}
                        >
                            <span className="flex items-center">
                                <FaSave className="mr-2" /> {isEditMode ? "Update" : "Simpan"}
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
