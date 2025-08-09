import { forwardRef, useMemo } from 'react';
import Input from '@/components/input';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import { ItemCodeField } from '../atoms';
import { itemNameSchema } from '@/schemas/itemValidation';
import type { DropdownOption } from '@/types/components';
import {
  createOptimizedCategoryDetailFetcher,
  createOptimizedTypeDetailFetcher,
  createOptimizedUnitDetailFetcher,
  createOptimizedDosageDetailFetcher,
  createOptimizedManufacturerDetailFetcher,
} from '@/utils/optimizedCategoryDetailFetcher';

interface ItemBasicInfoFormProps {
  formData: {
    code: string;
    name: string;
    manufacturer_id: string;
    barcode: string;
    is_medicine: boolean;
    category_id: string;
    type_id: string;
    package_id: string;
    dosage_id: string;
    description: string;
    quantity: number;
    unit_id: string;
  };
  categories: DropdownOption[];
  types: DropdownOption[];
  packages: DropdownOption[];
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
      packages,
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
    // Create optimized detail fetchers using cached data
    const optimizedCategoryDetailFetcher = useMemo(() => {
      return createOptimizedCategoryDetailFetcher(categories);
    }, [categories]);

    const optimizedTypeDetailFetcher = useMemo(() => {
      return createOptimizedTypeDetailFetcher(types);
    }, [types]);

    const optimizedPackageDetailFetcher = useMemo(() => {
      return createOptimizedUnitDetailFetcher(packages);
    }, [packages]);

    const optimizedUnitDetailFetcher = useMemo(() => {
      return createOptimizedUnitDetailFetcher(units);
    }, [units]);

    const optimizedDosageDetailFetcher = useMemo(() => {
      return createOptimizedDosageDetailFetcher(dosages);
    }, [dosages]);

    const optimizedManufacturerDetailFetcher = useMemo(() => {
      return createOptimizedManufacturerDetailFetcher(manufacturers);
    }, [manufacturers]);

    return (
      <div className="border-2 border-gray-200 rounded-lg mb-6 overflow-hidden">
        <div className="bg-gray-100 p-3 border-b-2 border-gray-200">
          <h2 className="text-lg font-semibold">Data Umum</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <ItemCodeField code={formData.code} onChange={onChange} />

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
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedManufacturerDetailFetcher}
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
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedCategoryDetailFetcher}
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
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedTypeDetailFetcher}
                />
              )}
            </FormField>

            <FormField label="Kemasan" required={true}>
              {loading && packages.length === 0 ? (
                <Input value="Memuat kemasan..." readOnly disabled />
              ) : (
                <Dropdown
                  name="package_id"
                  tabIndex={7}
                  value={formData.package_id}
                  onChange={value => onDropdownChange('package_id', value)}
                  options={packages}
                  placeholder="Pilih Kemasan"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={onAddNewUnit}
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedPackageDetailFetcher}
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
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedDosageDetailFetcher}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FormField label="Jumlah" className="md:col-span-1">
              <Input
                name="quantity"
                type="number"
                value={formData.quantity.toString()}
                tabIndex={9}
                onChange={onChange}
                className="w-full"
                placeholder="Masukkan jumlah"
                min="0"
                step="1"
              />
            </FormField>

            <FormField label="Satuan Ukuran" className="md:col-span-1">
              {loading && units.length === 0 ? (
                <Input value="Memuat satuan..." readOnly disabled />
              ) : (
                <Dropdown
                  name="unit_id"
                  tabIndex={10}
                  value={formData.unit_id}
                  onChange={value => onDropdownChange('unit_id', value)}
                  options={units}
                  placeholder="Pilih Satuan"
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedUnitDetailFetcher}
                />
              )}
            </FormField>
          </div>

          <div>
            <DescriptiveTextarea
              label="Keterangan"
              tabIndex={11}
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
