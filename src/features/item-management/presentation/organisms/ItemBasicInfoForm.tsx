import { forwardRef } from 'react';
import Input from '@/components/input';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import { itemNameSchema } from '@/schemas/itemValidation';
import type { DropdownOption } from '@/types/components';

interface ItemBasicInfoFormProps {
  formData: {
    code: string;
    name: string;
    manufacturer_id: string;
    barcode: string;
    is_medicine: boolean;
    category_id: string;
    type_id: string;
    unit_id: string;
    dosage_id: string;
    description: string;
  };
  categories: DropdownOption[];
  types: DropdownOption[];
  units: DropdownOption[];
  dosages: DropdownOption[];
  manufacturers: DropdownOption[];
  loading: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onFieldChange: (field: string, value: boolean | string) => void;
  onDropdownChange: (field: string, value: string) => void;
  onAddNewCategory: (searchTerm?: string) => void;
  onAddNewType: (searchTerm?: string) => void;
  onAddNewUnit: (searchTerm?: string) => void;
  onAddNewDosage: (searchTerm?: string) => void;
  onAddNewManufacturer: (searchTerm?: string) => void;
}

const ItemBasicInfoForm = forwardRef<HTMLInputElement, ItemBasicInfoFormProps>(
  (
    {
      formData,
      categories,
      types,
      units,
      dosages,
      manufacturers,
      loading,
      onChange,
      onFieldChange,
      onDropdownChange,
      onAddNewCategory,
      onAddNewType,
      onAddNewUnit,
      onAddNewDosage,
      onAddNewManufacturer,
    },
    ref
  ) => {
    return (
      <div className="border-2 border-gray-200 rounded-lg mb-6 overflow-hidden">
        <div className="bg-gray-100 p-3 border-b-2 border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Data Umum</h2>
          {formData.code && (
            <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">
              Kode: {formData.code}
            </div>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <FormField
              label="Nama Item"
              className="md:col-span-2"
              required={true}
            >
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
              {loading && manufacturers.length === 0 ? (
                <Input value="Memuat produsen..." readOnly disabled />
              ) : (
                <Dropdown
                  name="manufacturer_id"
                  tabIndex={3}
                  value={formData.manufacturer_id}
                  onChange={value => onDropdownChange('manufacturer_id', value)}
                  options={manufacturers}
                  placeholder="Pilih Produsen"
                  onAddNew={onAddNewManufacturer}
                />
              )}
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
                value={formData.is_medicine ? 'obat' : 'non-obat'}
                onChange={value => {
                  if (value === 'obat') {
                    onFieldChange('is_medicine', true);
                  } else {
                    onFieldChange('is_medicine', false);
                    onFieldChange('has_expiry_date', false);
                  }
                }}
                options={[
                  { id: 'obat', name: 'Obat' },
                  { id: 'non-obat', name: 'Non-Obat' },
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
                  onChange={value => onDropdownChange('category_id', value)}
                  options={categories}
                  placeholder="Pilih Kategori"
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
                  onChange={value => onDropdownChange('type_id', value)}
                  options={types}
                  placeholder="Pilih Jenis"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={onAddNewType}
                />
              )}
            </FormField>

            <FormField label="Kemasan" required={true}>
              {loading && units.length === 0 ? (
                <Input value="Memuat kemasan..." readOnly disabled />
              ) : (
                <Dropdown
                  name="unit_id"
                  tabIndex={7}
                  value={formData.unit_id}
                  onChange={value => onDropdownChange('unit_id', value)}
                  options={units}
                  placeholder="Pilih Kemasan"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={onAddNewUnit}
                />
              )}
            </FormField>

            <FormField label="Sediaan" required={true}>
              {loading && dosages.length === 0 ? (
                <Input value="Memuat sediaan..." readOnly disabled />
              ) : (
                <Dropdown
                  name="dosage_id"
                  tabIndex={8}
                  value={formData.dosage_id}
                  onChange={value => onDropdownChange('dosage_id', value)}
                  options={dosages}
                  placeholder="Pilih Sediaan"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={onAddNewDosage}
                />
              )}
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
        </div>
      </div>
    );
  }
);

ItemBasicInfoForm.displayName = 'ItemBasicInfoForm';

export default ItemBasicInfoForm;
