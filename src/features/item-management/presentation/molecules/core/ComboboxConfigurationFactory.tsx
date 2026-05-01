/**
 * Combobox Configuration Factory System
 *
 * This factory eliminates massive duplication in combobox configurations across forms,
 * particularly the 5 identical comboboxes in ItemBasicInfoForm (~25 lines each = 125 lines total).
 *
 * Replaces:
 * - Duplicate combobox configurations in ItemBasicInfoForm
 * - Similar patterns in other form components
 * - Repetitive loading checks, validation props, hover details, etc.
 *
 * Benefits:
 * - Eliminates 100+ lines of duplicate combobox configuration
 * - Consistent combobox behavior across all forms
 * - Type-safe configuration system
 * - Easy to maintain and extend
 * - Centralized combobox patterns
 */

import React from 'react';
import Combobox from '@/components/combobox';
import Input from '@/components/input';
import FormField from '@/components/form-field';
import type { ComboboxOption, HoverDetailData } from '@/types/components';

// Type-safe combobox props
type ComboboxProps = React.ComponentProps<typeof Combobox>;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Combobox field configuration
 */
export interface ComboboxFieldConfig {
  /** Field identifier */
  name: string;

  /** Display label */
  label: string;

  /** Tab index for keyboard navigation */
  tabIndex?: number;

  /** Placeholder text */
  placeholder?: string;

  /** Whether field is required */
  required?: boolean;

  /** Validation configuration */
  validation?: {
    enabled?: boolean;
    showOnBlur?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
  };

  /** Hover detail configuration */
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };

  /** Whether to show loading state */
  showLoading?: boolean;

  /** Loading message */
  loadingMessage?: string;

  /** CSS classes */
  className?: string;

  /** Additional combobox props */
  comboboxProps?: Partial<
    Omit<ComboboxProps, 'name' | 'value' | 'onChange' | 'options'>
  >;
}

/**
 * Smart combobox props
 */
export interface SmartComboboxProps extends ComboboxFieldConfig {
  /** Current value */
  value: string;

  /** Available options */
  options: ComboboxOption[];

  /** Loading state */
  loading: boolean;

  /** Change handler */
  onChange: (value: string) => void;

  /** Add new item handler */
  onAddNew?: (searchTerm?: string) => void;

  /** Hover detail fetcher */
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
}

// ============================================================================
// SMART COMBOBOX COMPONENT
// ============================================================================

/**
 * Smart combobox component with built-in loading states and consistent configuration
 *
 * Handles loading states, validation, hover details, and other common patterns
 * automatically based on configuration.
 */
export function SmartCombobox({
  name,
  label,
  value,
  options,
  loading,
  tabIndex,
  placeholder,
  required = false,
  validation = {},
  hoverDetail = {},
  showLoading = true,
  loadingMessage,
  className,
  comboboxProps = {},
  onChange,
  onAddNew,
  onFetchHoverDetail,
}: SmartComboboxProps) {
  // Default validation configuration
  const validationConfig = {
    enabled: true,
    showOnBlur: true,
    autoHide: true,
    autoHideDelay: 3000,
    ...validation,
  };

  // Default hover detail configuration
  const hoverDetailConfig = {
    enabled: true,
    delay: 400,
    ...hoverDetail,
  };

  // Generate loading message
  const finalLoadingMessage =
    loadingMessage || `Memuat ${label.toLowerCase()}...`;

  // Show loading state when data is loading and no options available
  const shouldShowLoading = showLoading && loading && options.length === 0;

  return (
    <FormField label={label} className={className} required={required}>
      {shouldShowLoading ? (
        <Input value={finalLoadingMessage} readOnly disabled />
      ) : (
        <Combobox
          name={name}
          tabIndex={tabIndex}
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
          required={required}
          validate={validationConfig.enabled}
          showValidationOnBlur={validationConfig.showOnBlur}
          validationAutoHide={validationConfig.autoHide}
          validationAutoHideDelay={validationConfig.autoHideDelay}
          onAddNew={onAddNew}
          enableHoverDetail={hoverDetailConfig.enabled}
          hoverDetailDelay={hoverDetailConfig.delay}
          onFetchHoverDetail={onFetchHoverDetail}
          {...comboboxProps}
        />
      )}
    </FormField>
  );
}

// ============================================================================
// COMBOBOX CONFIGURATION PRESETS
// ============================================================================

/**
 * Standard entity combobox configuration
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ENTITY_COMBOBOX_CONFIG: Partial<ComboboxFieldConfig> = {
  validation: {
    enabled: true,
    showOnBlur: true,
    autoHide: true,
    autoHideDelay: 3000,
  },
  hoverDetail: {
    enabled: true,
    delay: 400,
  },
  showLoading: true,
};

/**
 * Required entity combobox configuration
 */
// eslint-disable-next-line react-refresh/only-export-components
export const REQUIRED_ENTITY_COMBOBOX_CONFIG: Partial<ComboboxFieldConfig> = {
  ...ENTITY_COMBOBOX_CONFIG,
  required: true,
};

// ============================================================================
// SPECIALIZED COMBOBOX FACTORIES
// ============================================================================

/**
 * Entity combobox factory for common item management entities
 */
export interface EntityComboboxProps {
  entityType:
    | 'categories'
    | 'types'
    | 'packages'
    | 'units'
    | 'dosages'
    | 'manufacturers';
  value: string;
  options: ComboboxOption[];
  loading: boolean;
  tabIndex?: number;
  required?: boolean;
  onChange: (value: string) => void;
  onAddNew?: (searchTerm?: string) => void;
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  className?: string;
}

/**
 * Entity combobox configurations
 */
const ENTITY_COMBOBOX_CONFIGS = {
  categories: {
    name: 'category_id',
    label: 'Kategori',
    placeholder: 'Pilih Kategori',
  },
  types: {
    name: 'type_id',
    label: 'Jenis',
    placeholder: 'Pilih Jenis',
  },
  packages: {
    name: 'package_id',
    label: 'Kemasan',
    placeholder: 'Pilih Kemasan',
  },
  units: {
    name: 'unit_id',
    label: 'Satuan',
    placeholder: 'Pilih Satuan',
  },
  dosages: {
    name: 'dosage_id',
    label: 'Sediaan',
    placeholder: 'Pilih Sediaan',
  },
  manufacturers: {
    name: 'manufacturer_id',
    label: 'Produsen',
    placeholder: 'Pilih Produsen',
  },
} as const;

/**
 * Factory function to create entity comboboxes with consistent configuration
 *
 * Eliminates the need to repeat combobox configuration across multiple forms.
 */
export function EntityCombobox({
  entityType,
  value,
  options,
  loading,
  tabIndex,
  required = false,
  onChange,
  onAddNew,
  onFetchHoverDetail,
  className,
}: EntityComboboxProps) {
  const config = ENTITY_COMBOBOX_CONFIGS[entityType];

  return (
    <SmartCombobox
      {...config}
      {...ENTITY_COMBOBOX_CONFIG}
      value={value}
      options={options}
      loading={loading}
      tabIndex={tabIndex}
      required={required}
      className={className}
      onChange={onChange}
      onAddNew={onAddNew}
      onFetchHoverDetail={onFetchHoverDetail}
    />
  );
}

// ============================================================================
// BATCH COMBOBOX UTILITIES
// ============================================================================

/**
 * Props for batch combobox management
 */
export interface BatchComboboxProps {
  /** Form data containing all field values */
  formData: Record<string, string>;

  /** All combobox options */
  options: {
    categories: ComboboxOption[];
    types: ComboboxOption[];
    packages: ComboboxOption[];
    units: ComboboxOption[];
    dosages: ComboboxOption[];
    manufacturers: ComboboxOption[];
  };

  /** Loading states */
  loading: boolean;

  /** Change handler for all comboboxes */
  onComboboxChange: (field: string, value: string) => void;

  /** Add new handlers */
  onAddNew: {
    categories?: (searchTerm?: string) => void;
    types?: (searchTerm?: string) => void;
    packages?: (searchTerm?: string) => void;
    units?: (searchTerm?: string) => void;
    dosages?: (searchTerm?: string) => void;
    manufacturers?: (searchTerm?: string) => void;
  };

  /** Hover detail fetchers */
  hoverDetailFetchers: {
    categories?: (id: string) => Promise<HoverDetailData | null>;
    types?: (id: string) => Promise<HoverDetailData | null>;
    packages?: (id: string) => Promise<HoverDetailData | null>;
    units?: (id: string) => Promise<HoverDetailData | null>;
    dosages?: (id: string) => Promise<HoverDetailData | null>;
    manufacturers?: (id: string) => Promise<HoverDetailData | null>;
  };

  /** Starting tab index */
  startingTabIndex?: number;
}

/**
 * Batch entity combobox renderer
 *
 * Renders multiple entity comboboxes with consistent configuration and automatic tab indexing.
 * Replaces the massive combobox duplication in forms like ItemBasicInfoForm.
 */
export function BatchEntityComboboxes({
  formData,
  options,
  loading,
  onComboboxChange,
  onAddNew,
  hoverDetailFetchers,
  startingTabIndex = 1,
}: BatchComboboxProps) {
  const entityTypes: Array<keyof typeof ENTITY_COMBOBOX_CONFIGS> = [
    'categories',
    'types',
    'packages',
    'units',
    'dosages',
    'manufacturers',
  ];

  return (
    <>
      {entityTypes.map((entityType, index) => {
        const config = ENTITY_COMBOBOX_CONFIGS[entityType];
        const fieldName = config.name as keyof typeof formData;

        return (
          <EntityCombobox
            key={entityType}
            entityType={entityType}
            value={formData[fieldName] || ''}
            options={options[entityType]}
            loading={loading}
            tabIndex={startingTabIndex + index}
            required={true}
            onChange={value => onComboboxChange(fieldName, value)}
            onAddNew={onAddNew[entityType]}
            onFetchHoverDetail={hoverDetailFetchers[entityType]}
          />
        );
      })}
    </>
  );
}
