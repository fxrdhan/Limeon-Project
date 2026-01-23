import { forwardRef, useMemo, useEffect } from 'react';
import Input from '@/components/input';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import { itemNameSchema } from '@/schemas/manual/itemValidation';
import type { DropdownOption } from '@/types/components';
import { useItemCodeGenerator } from '../../application/hooks/utils';
import {
  createOptimizedCategoryDetailFetcher,
  createOptimizedTypeDetailFetcher,
  createOptimizedUnitDetailFetcher,
  createOptimizedDosageDetailFetcher,
  createOptimizedManufacturerDetailFetcher,
} from '@/utils/optimizedCategoryDetailFetcher';

interface ItemBasicInfoFormProps {
  isEditMode: boolean;
  formData: {
    code: string;
    name: string;
    manufacturer_id: string;
    is_medicine: boolean;
    category_id: string;
    type_id: string;
    package_id: string;
    dosage_id: string;
  };
  categories: DropdownOption[];
  types: DropdownOption[];
  packages: DropdownOption[];
  dosages: DropdownOption[];
  manufacturers: DropdownOption[];
  loading: boolean;
  disabled?: boolean;
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
      isEditMode,
      formData,
      categories,
      types,
      packages,
      dosages,
      manufacturers,
      loading,
      disabled = false,
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
    // Generate item code based on selected values
    const codeGeneration = useItemCodeGenerator({
      categoryId: formData.category_id,
      typeId: formData.type_id,
      packageId: formData.package_id,
      dosageId: formData.dosage_id,
      manufacturerId: formData.manufacturer_id,
      categories,
      types,
      packages,
      dosages,
      manufacturers,
    });

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

    const optimizedDosageDetailFetcher = useMemo(() => {
      return createOptimizedDosageDetailFetcher(dosages);
    }, [dosages]);

    const optimizedManufacturerDetailFetcher = useMemo(() => {
      return createOptimizedManufacturerDetailFetcher(manufacturers);
    }, [manufacturers]);

    // Update formData.code whenever the generated code changes
    useEffect(() => {
      if (!codeGeneration.generatedCode) return;

      const shouldUpdateCode =
        !isEditMode ||
        !formData.code?.trim() ||
        formData.code.includes('[XXX]') ||
        formData.code.includes('-...');

      if (shouldUpdateCode && codeGeneration.generatedCode !== formData.code) {
        onFieldChange('code', codeGeneration.generatedCode);
      }
    }, [
      codeGeneration.generatedCode,
      formData.code,
      isEditMode,
      onFieldChange,
    ]);

    const displayCode =
      isEditMode &&
      formData.code?.trim() &&
      !formData.code.includes('[XXX]') &&
      !formData.code.includes('-...')
        ? formData.code
        : codeGeneration.generatedCode || formData.code || 'Auto-generated';

    return (
      <div className="rounded-xl border border-slate-200 bg-white mb-6 overflow-hidden">
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Data Umum
          </h2>
          <div className="text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
            {displayCode}
          </div>
        </div>
        <div className="p-4 md:p-5 space-y-5">
          <div className="flex flex-col gap-4">
            <FormField label="Nama Item" required={true}>
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
                readOnly={disabled}
              />
            </FormField>

            <FormField label="Tipe Produk" required={true}>
              <Dropdown
                name="is_medicine"
                tabIndex={2}
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
                disabled={disabled}
              />
            </FormField>

            <FormField label="Produsen" required={true}>
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
                  onAddNew={disabled ? undefined : onAddNewManufacturer}
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedManufacturerDetailFetcher}
                  disabled={disabled}
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                />
              )}
            </FormField>

            <FormField label="Kategori" required={true}>
              {loading && categories.length === 0 ? (
                <Input value="Memuat kategori..." readOnly disabled />
              ) : (
                <Dropdown
                  name="category_id"
                  tabIndex={4}
                  value={formData.category_id}
                  onChange={value => onDropdownChange('category_id', value)}
                  options={categories}
                  placeholder="Pilih Kategori"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={disabled ? undefined : onAddNewCategory}
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedCategoryDetailFetcher}
                  disabled={disabled}
                />
              )}
            </FormField>

            <FormField label="Jenis" required={true}>
              {loading && types.length === 0 ? (
                <Input value="Memuat jenis..." readOnly disabled />
              ) : (
                <Dropdown
                  name="type_id"
                  tabIndex={5}
                  value={formData.type_id}
                  onChange={value => onDropdownChange('type_id', value)}
                  options={types}
                  placeholder="Pilih Jenis"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={disabled ? undefined : onAddNewType}
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedTypeDetailFetcher}
                  disabled={disabled}
                />
              )}
            </FormField>

            <FormField label="Kemasan" required={true}>
              {loading && packages.length === 0 ? (
                <Input value="Memuat kemasan..." readOnly disabled />
              ) : (
                <Dropdown
                  name="package_id"
                  tabIndex={6}
                  value={formData.package_id}
                  onChange={value => onDropdownChange('package_id', value)}
                  options={packages}
                  placeholder="Pilih Kemasan"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={disabled ? undefined : onAddNewUnit}
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedPackageDetailFetcher}
                  disabled={disabled}
                />
              )}
            </FormField>

            <FormField label="Sediaan" required={true}>
              {loading && dosages.length === 0 ? (
                <Input value="Memuat sediaan..." readOnly disabled />
              ) : (
                <Dropdown
                  name="dosage_id"
                  tabIndex={7}
                  value={formData.dosage_id}
                  onChange={value => onDropdownChange('dosage_id', value)}
                  options={dosages}
                  placeholder="Pilih Sediaan"
                  required
                  validate={true}
                  showValidationOnBlur={true}
                  validationAutoHide={true}
                  validationAutoHideDelay={3000}
                  onAddNew={disabled ? undefined : onAddNewDosage}
                  enableHoverDetail={true}
                  hoverDetailDelay={400}
                  onFetchHoverDetail={optimizedDosageDetailFetcher}
                  disabled={disabled}
                />
              )}
            </FormField>
          </div>
        </div>
      </div>
    );
  }
);

ItemBasicInfoForm.displayName = 'ItemBasicInfoForm';

export default ItemBasicInfoForm;
