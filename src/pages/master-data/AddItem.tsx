import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/Card";
import { FormActions } from "../../components/ui/FormActions";
import { Input } from "../../components/ui/Input";
import { FormSection, FormField } from "../../components/ui/FormComponents";
import { useAddItemForm } from "../../hooks/useAddItemForm";
import UnitConversionManager from "../../components/tools/UnitConversionManager";

// Style constants
const inputClassName = "w-full";
const selectClassName = "bg-white w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
const addButtonClassName = "ml-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600";
const radioGroupClassName = "space-x-6";
const textareaClassName = "w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

const AddItem = () => {
    const navigate = useNavigate();

    const {
        formData, displayBasePrice, categories, types, units,
        saving, handleChange, handleSelectChange: originalHandleSelectChange, handleSubmit, updateFormData,
        unitConversionHook
    } = useAddItemForm();

    // Modified handleSelectChange to update baseUnit automatically
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        originalHandleSelectChange(e);
        
        // Set baseUnit automatically when unit_id changes
        if (name === 'unit_id' && value) {
            const selectedUnit = units.find(unit => unit.id === value);
            if (selectedUnit) {
                unitConversionHook.setBaseUnit(selectedUnit.name);
            }
        }
    };

    // Efek untuk memperbarui basePrice pada unitConversionHook saat harga pokok berubah
    useEffect(() => {
        // Perbarui nilai basePrice di unitConversionHook ketika formData.base_price berubah
        if (formData.base_price > 0) {
            unitConversionHook.setBasePrice(formData.base_price);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.base_price]);

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Tambah Data Item Baru</CardTitle>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <FormSection title="Data Umum">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Kode Item">
                                    <Input
                                        name="code"
                                        value={formData.code}
                                        disabled={true}
                                        className={inputClassName}
                                        style={formData.code === "" ? {
                                            background: 'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #e0e0e0 10px, #e0e0e0 20px)'
                                        } : {}}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Nama Item">
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={inputClassName}
                                    required
                                />
                            </FormField>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                <FormField label="Rak">
                                    <Input
                                        name="rack"
                                        value={formData.rack}
                                        onChange={handleChange}
                                        className={inputClassName}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Jenis Produk">
                                <div className={radioGroupClassName}>
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

                            <FormField label="Keterangan">
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={textareaClassName}
                                    rows={3}
                                />
                            </FormField>
                        </FormSection>

                        <FormSection title="Harga Pokok">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField label="Satuan Dasar">
                                    <Input
                                        type="text"
                                        value={unitConversionHook.baseUnit}
                                        readOnly
                                        className={inputClassName}
                                    />
                                </FormField>
                                
                                <FormField label="Harga Pokok">
                                    <Input
                                        type="text"
                                        name="base_price"
                                        value={displayBasePrice}
                                        placeholder="Rp 0"
                                        onChange={handleChange}
                                        min="0"
                                        className={inputClassName}
                                        required
                                    />
                                </FormField>
                            </div>
                        </FormSection>

                        <UnitConversionManager unitConversionHook={unitConversionHook} />

                        <FormSection title="Pengaturan Tambahan">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Status Jual">
                                    <div className={radioGroupClassName}>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={() => updateFormData({ is_active: true })}
                                                className="form-radio h-5 w-5 text-primary"
                                            />
                                            <span className="ml-2">Masih dijual</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name="is_active"
                                                checked={!formData.is_active}
                                                onChange={() => updateFormData({ is_active: false })}
                                                className="form-radio h-5 w-5 text-primary"
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
                                        className={inputClassName}
                                        required
                                    />
                                </FormField>
                            </div>

                            <div className={formData.is_medicine ? "" : "opacity-50 pointer-events-none"}>
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        name="has_expiry_date"
                                        checked={formData.has_expiry_date}
                                        disabled={!formData.is_medicine}
                                        onChange={handleChange}
                                        className="form-checkbox h-5 w-5 text-primary"
                                    />
                                    <span className="ml-2">Memiliki Tanggal Kadaluarsa</span>
                                </label>
                                <div className="mt-1 text-sm text-gray-500">
                                    Jika dicentang, obat ini akan menggunakan metode FEFO
                                    (First Expired First Out)
                                </div>
                            </div>
                        </FormSection>
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        <FormActions
                            onCancel={() => navigate("/master-data/items")}
                            isDisabled={false}
                            isSaving={saving}
                        />
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default AddItem;
