import { forwardRef } from "react";
import Input from "@/components/input";
import Dropdown from "@/components/dropdown";
import FormSection from "@/components/form-section";
import FormField from "@/components/form-field";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import { ItemCodeField } from "../ui";
import { itemNameSchema } from "@/schemas/itemValidation";
import type { ItemBasicInfoFormProps } from "../../types";

const ItemBasicInfoForm = forwardRef<HTMLInputElement, ItemBasicInfoFormProps>(
  ({ 
    formData, 
    categories,
    types,
    units,
    loading,
    onCodeRegenerate, 
    onChange,
    onFieldChange,
    onDropdownChange,
    onAddNewCategory,
    onAddNewType,
    onAddNewUnit
  }, ref) => {
    return (
      <FormSection title="Data Umum">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <ItemCodeField code={formData.code} onRegenerate={onCodeRegenerate} />

          <FormField label="Nama Item" className="md:col-span-2" required={true}>
            <Input
              name="name"
              ref={ref}
              value={formData.name}
              tabIndex={1}
              onChange={onChange}
              className="w-full"
              validate={true}
              validationSchema={itemNameSchema}
              showValidationOnBlur={true}
              validationAutoHide={true}
              validationAutoHideDelay={3000}
              required
            />
          </FormField>

          <FormField label="Barcode" className="md:col-span-1">
            <Input
              name="barcode"
              value={formData.barcode}
              tabIndex={2}
              onChange={onChange}
              className="w-full"
              placeholder="Masukkan barcode item"
            />
          </FormField>

          <FormField label="Produsen" className="md:col-span-1">
            <Input
              name="manufacturer"
              value={formData.manufacturer}
              tabIndex={3}
              onChange={onChange}
              className="w-full"
              placeholder="Masukkan nama produsen"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <FormField
            label="Jenis Produk"
            className="md:col-span-1"
            required={true}
          >
            <Dropdown
              name="is_medicine"
              tabIndex={4}
              value={formData.is_medicine ? "obat" : "non-obat"}
              onChange={(value) => {
                if (value === "obat") {
                  onFieldChange("is_medicine", true);
                } else {
                  onFieldChange("is_medicine", false);
                  onFieldChange("has_expiry_date", false);
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

          <FormField label="Kategori" required={true}>
            {loading && categories.length === 0 ? (
              <Input value="Memuat kategori..." readOnly disabled />
            ) : (
              <Dropdown
                name="category_id"
                tabIndex={5}
                value={formData.category_id}
                onChange={(value) => onDropdownChange("category_id", value)}
                options={categories}
                placeholder="-- Pilih Kategori --"
                required
                validate={true}
                showValidationOnBlur={true}
                validationAutoHide={true}
                validationAutoHideDelay={3000}
                onAddNew={onAddNewCategory}
              />
            )}
          </FormField>

          <FormField label="Jenis" required={true}>
            {loading && types.length === 0 ? (
              <Input value="Memuat jenis..." readOnly disabled />
            ) : (
              <Dropdown
                name="type_id"
                tabIndex={6}
                value={formData.type_id}
                onChange={(value) => onDropdownChange("type_id", value)}
                options={types}
                placeholder="-- Pilih Jenis --"
                required
                validate={true}
                showValidationOnBlur={true}
                validationAutoHide={true}
                validationAutoHideDelay={3000}
                onAddNew={onAddNewType}
              />
            )}
          </FormField>

          <FormField label="Satuan" required={true}>
            {loading && units.length === 0 ? (
              <Input value="Memuat satuan..." readOnly disabled />
            ) : (
              <Dropdown
                name="unit_id"
                tabIndex={7}
                value={formData.unit_id}
                onChange={(value) => onDropdownChange("unit_id", value)}
                options={units}
                placeholder="-- Pilih Satuan --"
                required
                validate={true}
                showValidationOnBlur={true}
                validationAutoHide={true}
                validationAutoHideDelay={3000}
                onAddNew={onAddNewUnit}
              />
            )}
          </FormField>

          <FormField label="Rak">
            <Input
              name="rack"
              tabIndex={8}
              value={formData.rack}
              onChange={onChange}
              className="w-full"
            />
          </FormField>
        </div>

        <div>
          <DescriptiveTextarea
            label="Keterangan"
            tabIndex={9}
            name="description"
            value={formData.description}
            onChange={onChange}
            placeholder="Masukkan keterangan atau deskripsi tambahan untuk item ini..."
            expandOnClick={true}
          />
        </div>
      </FormSection>
    );
  }
);

ItemBasicInfoForm.displayName = "ItemBasicInfoForm";

export default ItemBasicInfoForm;