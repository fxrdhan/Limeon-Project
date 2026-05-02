import { forwardRef, useEffect, useRef, useState } from 'react';
import Input from '@/components/input';
import { PharmaComboboxSelect } from '@/components/combobox/presets';
import { findComboboxItemByValue } from '@/components/combobox/helpers';
import FormField from '@/components/form-field';
import { itemNameSchema } from '@/schemas/manual/itemValidation';
import type { ComboboxOption } from '@/types/components';
import {
  SECTION_HEADER_CLASS,
  SURFACE_CARD_CLASS,
} from '@/styles/uiPrimitives';
import { useItemCodeGenerator } from '../../application/hooks/utils';
import { useItemRealtime } from '../../shared/contexts/useItemFormContext';
import { inferDosageFromDisplayName } from '@/lib/item-dosage-inference';

interface ItemBasicInfoFormProps {
  isEditMode: boolean;
  formData: {
    code: string;
    display_name: string;
    name: string;
    manufacturer_id: string;
    is_medicine: boolean;
    category_id: string;
    type_id: string;
    package_id: string;
    dosage_id: string;
  };
  categories: ComboboxOption[];
  types: ComboboxOption[];
  packages: ComboboxOption[];
  dosages: ComboboxOption[];
  manufacturers: ComboboxOption[];
  loading: boolean;
  disabled?: boolean;
  onDisplayNameChange: (value: string) => void;
  onFieldChange: (field: string, value: boolean | string) => void;
  onDropdownChange: (field: string, value: string) => void;
  persistedDropdownName?: string | null;
  onPersistedDropdownClear?: () => void;
  freezePersistedDropdown?: boolean;
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
      onDisplayNameChange,
      onFieldChange,
      onDropdownChange,
      persistedDropdownName,
      onPersistedDropdownClear,
      onAddNewCategory,
      onAddNewType,
      onAddNewUnit,
      onAddNewDosage,
      onAddNewManufacturer,
    },
    ref
  ) => {
    const realtime = useItemRealtime();
    const nameFieldHandlers = realtime?.smartFormSync?.getFieldHandlers('name');
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [localDisplayName, setLocalDisplayName] = useState(
      formData.display_name
    );
    const previousDisplayNameRef = useRef(formData.display_name);

    useEffect(() => {
      const previousDisplayName = previousDisplayNameRef.current;
      const shouldSyncWhileFocused =
        isNameFocused &&
        (localDisplayName.length === 0 ||
          localDisplayName === previousDisplayName);

      if (!isNameFocused || shouldSyncWhileFocused) {
        setLocalDisplayName(formData.display_name);
      }
      previousDisplayNameRef.current = formData.display_name;
    }, [formData.display_name, isNameFocused, localDisplayName]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalDisplayName(e.target.value);
      onDisplayNameChange(e.target.value);
      nameFieldHandlers?.onChange(e);
    };

    const handleNameFocus = () => {
      setIsNameFocused(true);
      nameFieldHandlers?.onFocus();
    };

    const applyInferredDosage = (rawDisplayName: string) => {
      const dosage = inferDosageFromDisplayName(rawDisplayName, dosages);

      if (dosage && dosage.id !== formData.dosage_id) {
        onDropdownChange('dosage_id', dosage.id);
      }
    };

    const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsNameFocused(false);
      applyInferredDosage(e.currentTarget.value);
      nameFieldHandlers?.onBlur();
    };

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
    const productTypeItems = ['obat', 'non-obat'];
    const productTypeLabels = new Map([
      ['obat', 'Obat'],
      ['non-obat', 'Non-Obat'],
    ]);
    const renderEntityCombobox = (
      name: keyof typeof formData,
      tabIndex: number,
      value: string,
      items: ComboboxOption[],
      placeholder: string,
      onCreate: (searchTerm?: string) => void
    ) => (
      <PharmaComboboxSelect
        name={name}
        tabIndex={tabIndex}
        items={items}
        value={findComboboxItemByValue(items, value, item => item.id)}
        onValueChange={item => onDropdownChange(name, item?.id ?? '')}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder={placeholder}
        required
        validation={{ enabled: true, autoHide: true, autoHideDelay: 3000 }}
        createAction={
          disabled
            ? undefined
            : {
                onCreate,
                label: 'Tambah baru',
              }
        }
        open={persistedDropdownName === name ? true : undefined}
        onOpenChange={nextOpen => {
          if (!nextOpen) onPersistedDropdownClear?.();
        }}
        disabled={disabled}
      />
    );

    return (
      <div className={`${SURFACE_CARD_CLASS} mb-6`}>
        <div className={SECTION_HEADER_CLASS}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Data Umum
          </h2>
          <div className="text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
            {displayCode}
          </div>
        </div>
        <div className="p-4 md:p-5 space-y-5">
          <div className="flex flex-col gap-4">
            <FormField label="Nama Item" required={true}>
              <Input
                name="name"
                ref={ref}
                value={localDisplayName}
                tabIndex={1}
                onChange={handleNameChange}
                onFocus={handleNameFocus}
                onBlur={handleNameBlur}
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
              <PharmaComboboxSelect
                name="is_medicine"
                tabIndex={2}
                items={productTypeItems}
                value={formData.is_medicine ? 'obat' : 'non-obat'}
                onValueChange={value => {
                  if (value === null) return;
                  if (value === 'obat') {
                    onFieldChange('is_medicine', true);
                  } else {
                    onFieldChange('is_medicine', false);
                    onFieldChange('has_expiry_date', false);
                  }
                }}
                itemToStringLabel={value =>
                  productTypeLabels.get(value) ?? value
                }
                itemToStringValue={value => value}
                indicator="radio"
                searchable={false}
                disabled={disabled}
              />
            </FormField>

            <FormField label="Produsen" required={true}>
              {loading && manufacturers.length === 0 ? (
                <Input value="Memuat produsen..." readOnly disabled />
              ) : (
                renderEntityCombobox(
                  'manufacturer_id',
                  3,
                  formData.manufacturer_id,
                  manufacturers,
                  'Pilih Produsen',
                  onAddNewManufacturer
                )
              )}
            </FormField>

            <FormField label="Kategori" required={true}>
              {loading && categories.length === 0 ? (
                <Input value="Memuat kategori..." readOnly disabled />
              ) : (
                renderEntityCombobox(
                  'category_id',
                  4,
                  formData.category_id,
                  categories,
                  'Pilih Kategori',
                  onAddNewCategory
                )
              )}
            </FormField>

            <FormField label="Jenis" required={true}>
              {loading && types.length === 0 ? (
                <Input value="Memuat jenis..." readOnly disabled />
              ) : (
                renderEntityCombobox(
                  'type_id',
                  5,
                  formData.type_id,
                  types,
                  'Pilih Jenis',
                  onAddNewType
                )
              )}
            </FormField>

            <FormField label="Kemasan" required={true}>
              {loading && packages.length === 0 ? (
                <Input value="Memuat kemasan..." readOnly disabled />
              ) : (
                renderEntityCombobox(
                  'package_id',
                  6,
                  formData.package_id,
                  packages,
                  'Pilih Kemasan',
                  onAddNewUnit
                )
              )}
            </FormField>

            <FormField label="Sediaan" required={true}>
              {loading && dosages.length === 0 ? (
                <Input value="Memuat sediaan..." readOnly disabled />
              ) : (
                renderEntityCombobox(
                  'dosage_id',
                  7,
                  formData.dosage_id,
                  dosages,
                  'Pilih Sediaan',
                  onAddNewDosage
                )
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
