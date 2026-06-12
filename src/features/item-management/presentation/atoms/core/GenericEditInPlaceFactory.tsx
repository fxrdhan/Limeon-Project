/**
 * Generic Edit-in-Place Component Factory
 *
 * Provides a configurable foundation for inline editing components such as
 * margin and minimum-stock editors.
 */

import React, { useRef, useEffect } from 'react';
import { TbPencil } from 'react-icons/tb';
import Input from '@/components/input';
import FormField from '@/components/form-field';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Display value formatter function
 */
export type DisplayFormatter<T = unknown> = (
  value: T,
  config?: EditInPlaceConfig<T>
) => string;

/**
 * Value parser function - converts string input to typed value
 */
export type ValueParser<T = unknown> = (
  input: string,
  config?: EditInPlaceConfig<T>
) => T;

/**
 * Display style calculator - determines styling based on value
 */
export type StyleCalculator<T = unknown> = (
  value: T,
  config?: EditInPlaceConfig<T>
) => {
  textColor?: string;
  className?: string;
};

/**
 * Edit-in-place field configuration
 */
export interface EditInPlaceConfig<T = unknown> {
  /** Field label */
  label: string;

  /** Input type */
  inputType: 'number' | 'text' | 'currency';

  /** Input constraints */
  inputProps?: {
    min?: string | number;
    max?: string | number;
    step?: string | number;
    placeholder?: string;
  };

  /** Display formatting */
  display: {
    formatter: DisplayFormatter<T>;
    emptyDisplay?: string;
    styleCalculator?: StyleCalculator<T>;
  };

  /** Input parsing */
  parser?: ValueParser<T>;

  /** CSS classes */
  classes?: {
    container?: string;
    input?: string;
    display?: string;
    label?: string;
    icon?: string;
    value?: string;
  };

  /** Icon size (px) */
  iconSize?: number;

  /** Accessibility */
  accessibility?: {
    editTitle?: string;
    displayTitle?: string;
  };
}

/**
 * Generic edit-in-place component props
 */
export interface GenericEditInPlaceProps<T = unknown> {
  /** Whether currently in edit mode */
  isEditing: boolean;

  /** Current typed value */
  value: T;

  /** Current string representation for input */
  inputValue: string;

  /** Tab index for keyboard navigation */
  tabIndex?: number;

  /** Event handlers */
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  /** Configuration */
  config: EditInPlaceConfig;

  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// GENERIC EDIT-IN-PLACE COMPONENT
// ============================================================================

/**
 * Generic edit-in-place component that handles all common patterns
 *
 * Provides focus management, keyboard handling, and consistent UI patterns
 * while allowing full customization through the configuration system.
 */
export function GenericEditInPlace<T = unknown>({
  isEditing,
  value,
  inputValue,
  tabIndex,
  onStartEdit,
  onStopEdit,
  onChange,
  onKeyDown,
  config,
  disabled = false,
}: GenericEditInPlaceProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Calculate display styling
  const displayStyle = config.display.styleCalculator
    ? config.display.styleCalculator(value, config)
    : {};

  // Format display value
  const displayValue = config.display.formatter(value, config);
  const showEmpty =
    displayValue === '' || displayValue === null || displayValue === undefined;
  const finalDisplayValue = showEmpty
    ? config.display.emptyDisplay || '-'
    : displayValue;

  // Accessibility
  const editTitle =
    config.accessibility?.editTitle || `Edit ${config.label.toLowerCase()}`;
  const displayTitle =
    config.accessibility?.displayTitle ||
    `Click to edit ${config.label.toLowerCase()}`;
  const iconSize = config.iconSize ?? 14;

  return (
    <FormField label={config.label} className={config.classes?.label}>
      <div
        className={`flex items-center focus:outline-hidden ${config.classes?.container || ''}`}
      >
        {isEditing ? (
          <div className="flex items-center focus:outline-hidden">
            <Input
              className={`max-w-20 focus:outline-hidden ${config.classes?.input || ''}`}
              ref={inputRef}
              type={config.inputType}
              value={inputValue}
              onChange={onChange}
              onBlur={onStopEdit}
              onKeyDown={onKeyDown}
              readOnly={disabled}
              {...config.inputProps}
            />
            {config.inputType === 'number' &&
              config.label.toLowerCase().includes('margin') && (
                <span className="ml-2 text-lg font-medium">%</span>
              )}
          </div>
        ) : (
          <div
            tabIndex={disabled ? undefined : tabIndex}
            className={`group w-full py-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} font-semibold flex items-center focus:outline-hidden ${displayStyle.textColor || 'text-slate-900'} ${displayStyle.className || ''} ${config.classes?.display || ''}`}
            onClick={disabled ? undefined : onStartEdit}
            role="button"
            title={disabled ? undefined : displayTitle}
            onKeyDown={e => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onStartEdit();
              }
            }}
          >
            <span className={config.classes?.value || ''}>
              {finalDisplayValue}
            </span>
            {!disabled && (
              <TbPencil
                className={`ml-4 text-slate-400 group-hover:text-primary group-focus:text-primary cursor-pointer transition-colors ${config.classes?.icon || ''}`}
                size={iconSize}
                onClick={e => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                title={editTitle}
              />
            )}
          </div>
        )}
      </div>
    </FormField>
  );
}

// ============================================================================
// PREDEFINED CONFIGURATIONS
// ============================================================================

/**
 * Configuration for margin percentage fields
 */
const MARGIN_CONFIG: EditInPlaceConfig = {
  label: 'Margin',
  inputType: 'number',
  inputProps: {
    step: 0.1,
  },
  display: {
    formatter: (value: unknown) => {
      const numValue = value as number | null;
      if (numValue === null || numValue === undefined) return '';
      return `${numValue.toFixed(1)} %`;
    },
    styleCalculator: (value: unknown) => ({
      textColor:
        (value as number | null) !== null
          ? (value as number) >= 0
            ? 'text-green-600'
            : 'text-red-600'
          : 'text-slate-500',
    }),
    emptyDisplay: '-',
  },
  accessibility: {
    editTitle: 'Edit margin',
    displayTitle: 'Click to edit margin',
  },
};

/**
 * Configuration for minimum stock fields
 */
const MIN_STOCK_CONFIG: EditInPlaceConfig = {
  label: 'Stok Minimal:',
  inputType: 'number',
  inputProps: {
    min: 0,
  },
  display: {
    formatter: (value: unknown) => (value as number).toString(),
    emptyDisplay: '0',
  },
  classes: {
    label: 'flex items-center',
    container: 'ml-2 grow',
    display: 'pb-1',
    value: 'relative -top-1',
    icon: 'relative -top-1',
  },
  iconSize: 18,
  accessibility: {
    editTitle: 'Edit stok minimal',
    displayTitle: 'Click to edit minimum stock',
  },
};

type SpecializedEditInPlaceProps<T> = Omit<
  GenericEditInPlaceProps<T>,
  'config'
> & {
  config?: Partial<EditInPlaceConfig>;
};

const mergeEditInPlaceConfig = (
  defaultConfig: EditInPlaceConfig,
  config?: Partial<EditInPlaceConfig>
): EditInPlaceConfig =>
  ({
    ...defaultConfig,
    ...config,
    classes: {
      ...defaultConfig.classes,
      ...config?.classes,
    },
    display: {
      ...defaultConfig.display,
      ...config?.display,
    },
    inputProps: {
      ...defaultConfig.inputProps,
      ...config?.inputProps,
    },
    accessibility: {
      ...defaultConfig.accessibility,
      ...config?.accessibility,
    },
  }) as EditInPlaceConfig;

// ============================================================================
// SPECIALIZED COMPONENT FACTORIES
// ============================================================================

/**
 * Margin editor component factory
 */
export function MarginEditInPlace(
  props: SpecializedEditInPlaceProps<number | null>
) {
  const { config, ...genericProps } = props;
  return (
    <GenericEditInPlace
      {...genericProps}
      config={mergeEditInPlaceConfig(MARGIN_CONFIG, config)}
    />
  );
}

/**
 * Minimum stock editor component factory
 */
export function MinStockEditInPlace(
  props: SpecializedEditInPlaceProps<number>
) {
  const { config, ...genericProps } = props;
  return (
    <GenericEditInPlace
      {...genericProps}
      config={mergeEditInPlaceConfig(MIN_STOCK_CONFIG, config)}
    />
  );
}
