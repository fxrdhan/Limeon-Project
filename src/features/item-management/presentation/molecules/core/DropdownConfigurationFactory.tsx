/**
 * Dropdown Configuration Factory System
 * 
 * This factory eliminates massive duplication in dropdown configurations across forms,
 * particularly the 5 identical dropdowns in ItemBasicInfoForm (~25 lines each = 125 lines total).
 * 
 * Replaces:
 * - Duplicate dropdown configurations in ItemBasicInfoForm
 * - Similar patterns in other form components
 * - Repetitive loading checks, validation props, hover details, etc.
 * 
 * Benefits:
 * - Eliminates 100+ lines of duplicate dropdown configuration
 * - Consistent dropdown behavior across all forms
 * - Type-safe configuration system
 * - Easy to maintain and extend
 * - Centralized dropdown patterns
 */

import React from 'react';
import Dropdown from '@/components/dropdown';
import Input from '@/components/input';
import FormField from '@/components/form-field';
import type { DropdownOption, HoverDetailData } from '@/types/components';

// Type-safe dropdown props
type DropdownProps = React.ComponentProps<typeof Dropdown>;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Dropdown field configuration
 */
export interface DropdownFieldConfig {
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
  
  /** Additional dropdown props */
  dropdownProps?: Partial<Omit<DropdownProps, 'name' | 'value' | 'onChange' | 'options'>>;
}

/**
 * Smart dropdown props
 */
export interface SmartDropdownProps extends DropdownFieldConfig {
  /** Current value */
  value: string;
  
  /** Available options */
  options: DropdownOption[];
  
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
// SMART DROPDOWN COMPONENT
// ============================================================================

/**
 * Smart dropdown component with built-in loading states and consistent configuration
 * 
 * Handles loading states, validation, hover details, and other common patterns
 * automatically based on configuration.
 */
export function SmartDropdown({
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
  dropdownProps = {},
  onChange,
  onAddNew,
  onFetchHoverDetail,
}: SmartDropdownProps) {
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
  const finalLoadingMessage = loadingMessage || `Memuat ${label.toLowerCase()}...`;
  
  // Show loading state when data is loading and no options available
  const shouldShowLoading = showLoading && loading && options.length === 0;

  return (
    <FormField 
      label={label} 
      className={className}
      required={required}
    >
      {shouldShowLoading ? (
        <Input 
          value={finalLoadingMessage} 
          readOnly 
          disabled 
        />
      ) : (
        <Dropdown
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
          {...dropdownProps}
        />
      )}
    </FormField>
  );
}

// ============================================================================
// DROPDOWN CONFIGURATION PRESETS
// ============================================================================

/**
 * Standard entity dropdown configuration
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ENTITY_DROPDOWN_CONFIG: Partial<DropdownFieldConfig> = {
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
 * Required entity dropdown configuration
 */
// eslint-disable-next-line react-refresh/only-export-components
export const REQUIRED_ENTITY_DROPDOWN_CONFIG: Partial<DropdownFieldConfig> = {
  ...ENTITY_DROPDOWN_CONFIG,
  required: true,
};

// ============================================================================
// SPECIALIZED DROPDOWN FACTORIES
// ============================================================================

/**
 * Entity dropdown factory for common item management entities
 */
export interface EntityDropdownProps {
  entityType: 'categories' | 'types' | 'packages' | 'units' | 'dosages' | 'manufacturers';
  value: string;
  options: DropdownOption[];
  loading: boolean;
  tabIndex?: number;
  required?: boolean;
  onChange: (value: string) => void;
  onAddNew?: (searchTerm?: string) => void;
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  className?: string;
}

/**
 * Entity dropdown configurations
 */
const ENTITY_DROPDOWN_CONFIGS = {
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
 * Factory function to create entity dropdowns with consistent configuration
 * 
 * Eliminates the need to repeat dropdown configuration across multiple forms.
 */
export function EntityDropdown({
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
}: EntityDropdownProps) {
  const config = ENTITY_DROPDOWN_CONFIGS[entityType];
  
  return (
    <SmartDropdown
      {...config}
      {...ENTITY_DROPDOWN_CONFIG}
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
// BATCH DROPDOWN UTILITIES
// ============================================================================

/**
 * Props for batch dropdown management
 */
export interface BatchDropdownProps {
  /** Form data containing all field values */
  formData: Record<string, string>;
  
  /** All dropdown options */
  options: {
    categories: DropdownOption[];
    types: DropdownOption[];
    packages: DropdownOption[];
    units: DropdownOption[];
    dosages: DropdownOption[];
    manufacturers: DropdownOption[];
  };
  
  /** Loading states */
  loading: boolean;
  
  /** Change handler for all dropdowns */
  onDropdownChange: (field: string, value: string) => void;
  
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
 * Batch entity dropdown renderer
 * 
 * Renders multiple entity dropdowns with consistent configuration and automatic tab indexing.
 * Replaces the massive dropdown duplication in forms like ItemBasicInfoForm.
 */
export function BatchEntityDropdowns({
  formData,
  options,
  loading,
  onDropdownChange,
  onAddNew,
  hoverDetailFetchers,
  startingTabIndex = 1,
}: BatchDropdownProps) {
  const entityTypes: Array<keyof typeof ENTITY_DROPDOWN_CONFIGS> = [
    'categories', 'types', 'packages', 'units', 'dosages', 'manufacturers'
  ];
  
  return (
    <>
      {entityTypes.map((entityType, index) => {
        const config = ENTITY_DROPDOWN_CONFIGS[entityType];
        const fieldName = config.name as keyof typeof formData;
        
        return (
          <EntityDropdown
            key={entityType}
            entityType={entityType}
            value={formData[fieldName] || ''}
            options={options[entityType]}
            loading={loading}
            tabIndex={startingTabIndex + index}
            required={true}
            onChange={value => onDropdownChange(fieldName, value)}
            onAddNew={onAddNew[entityType]}
            onFetchHoverDetail={hoverDetailFetchers[entityType]}
          />
        );
      })}
    </>
  );
}