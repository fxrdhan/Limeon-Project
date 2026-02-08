import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemBasicInfoForm from './ItemBasicInfoForm';

const getFieldHandlersMock = vi.hoisted(() => vi.fn());
const useItemCodeGeneratorMock = vi.hoisted(() => vi.fn());
const categoryFetcherFactoryMock = vi.hoisted(() => vi.fn());
const typeFetcherFactoryMock = vi.hoisted(() => vi.fn());
const packageFetcherFactoryMock = vi.hoisted(() => vi.fn());
const dosageFetcherFactoryMock = vi.hoisted(() => vi.fn());
const manufacturerFetcherFactoryMock = vi.hoisted(() => vi.fn());
const categoryHoverFetchMock = vi.hoisted(() => vi.fn());
const typeHoverFetchMock = vi.hoisted(() => vi.fn());
const packageHoverFetchMock = vi.hoisted(() => vi.fn());
const dosageHoverFetchMock = vi.hoisted(() => vi.fn());
const manufacturerHoverFetchMock = vi.hoisted(() => vi.fn());
const hoverResultMock = vi.hoisted(() => vi.fn());
const realtimeHandlers = vi.hoisted(() => ({
  onChange: vi.fn(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
}));

vi.mock('@/components/form-field', () => ({
  default: ({ label, children }: { label: string; children: ReactNode }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & {
      validate?: boolean;
      validationSchema?: unknown;
      showValidationOnBlur?: boolean;
      validationAutoHide?: boolean;
      validationAutoHideDelay?: number;
    }
  >(({ validate, ...props }, ref) => (
    <input
      ref={ref}
      data-testid={props.name ? `input-${props.name}` : 'input-generic'}
      data-validate={String(Boolean(validate))}
      {...props}
    />
  )),
}));

vi.mock('@/components/dropdown', () => ({
  default: ({
    name,
    value,
    onChange,
    onAddNew,
    onFetchHoverDetail,
    disabled,
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
    onAddNew?: (searchTerm?: string) => void;
    onFetchHoverDetail?: (value: string) => Promise<unknown>;
    disabled?: boolean;
  }) => (
    <div data-testid={`dropdown-${name}`}>
      <span>{`${name}:${value}`}</span>
      {name === 'is_medicine' ? (
        <>
          <button type="button" onClick={() => onChange('obat')}>
            medicine-obat
          </button>
          <button type="button" onClick={() => onChange('non-obat')}>
            medicine-non-obat
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(`${name}-next`)}
        >
          {`change-${name}`}
        </button>
      )}
      <button type="button" onClick={() => onAddNew?.('search-term')}>
        {`add-${name}`}
      </button>
      <button
        type="button"
        onClick={async () => {
          const result = await onFetchHoverDetail?.(`${name}-hover`);
          hoverResultMock(result);
        }}
      >
        {`hover-${name}`}
      </button>
    </div>
  ),
}));

vi.mock('../../application/hooks/utils', () => ({
  useItemCodeGenerator: useItemCodeGeneratorMock,
}));

vi.mock('../../shared/contexts/useItemFormContext', () => ({
  useItemRealtime: () => ({
    smartFormSync: {
      getFieldHandlers: getFieldHandlersMock,
    },
  }),
}));

vi.mock('@/utils/optimizedCategoryDetailFetcher', () => ({
  createOptimizedCategoryDetailFetcher: categoryFetcherFactoryMock,
  createOptimizedTypeDetailFetcher: typeFetcherFactoryMock,
  createOptimizedUnitDetailFetcher: packageFetcherFactoryMock,
  createOptimizedDosageDetailFetcher: dosageFetcherFactoryMock,
  createOptimizedManufacturerDetailFetcher: manufacturerFetcherFactoryMock,
}));

const baseProps = () => ({
  isEditMode: false,
  formData: {
    code: '',
    name: 'Paracetamol',
    manufacturer_id: 'm-1',
    is_medicine: true,
    category_id: 'c-1',
    type_id: 't-1',
    package_id: 'p-1',
    dosage_id: 'd-1',
  },
  categories: [{ id: 'c-1', name: 'Kategori A' }],
  types: [{ id: 't-1', name: 'Jenis A' }],
  packages: [{ id: 'p-1', name: 'Kemasan A' }],
  dosages: [{ id: 'd-1', name: 'Sediaan A' }],
  manufacturers: [{ id: 'm-1', name: 'Produsen A' }],
  loading: false,
  disabled: false,
  onChange: vi.fn(),
  onFieldChange: vi.fn(),
  onDropdownChange: vi.fn(),
  onAddNewCategory: vi.fn(),
  onAddNewType: vi.fn(),
  onAddNewUnit: vi.fn(),
  onAddNewDosage: vi.fn(),
  onAddNewManufacturer: vi.fn(),
});

describe('ItemBasicInfoForm', () => {
  beforeEach(() => {
    hoverResultMock.mockReset();
    getFieldHandlersMock.mockReset();
    useItemCodeGeneratorMock.mockReset();
    categoryFetcherFactoryMock.mockReset();
    typeFetcherFactoryMock.mockReset();
    packageFetcherFactoryMock.mockReset();
    dosageFetcherFactoryMock.mockReset();
    manufacturerFetcherFactoryMock.mockReset();
    categoryHoverFetchMock.mockReset();
    typeHoverFetchMock.mockReset();
    packageHoverFetchMock.mockReset();
    dosageHoverFetchMock.mockReset();
    manufacturerHoverFetchMock.mockReset();
    realtimeHandlers.onChange.mockReset();
    realtimeHandlers.onFocus.mockReset();
    realtimeHandlers.onBlur.mockReset();

    getFieldHandlersMock.mockReturnValue(realtimeHandlers);
    useItemCodeGeneratorMock.mockReturnValue({ generatedCode: 'ITM-001' });
    categoryHoverFetchMock.mockResolvedValue({ title: 'Kategori Detail' });
    typeHoverFetchMock.mockResolvedValue({ title: 'Jenis Detail' });
    packageHoverFetchMock.mockResolvedValue({ title: 'Kemasan Detail' });
    dosageHoverFetchMock.mockResolvedValue({ title: 'Sediaan Detail' });
    manufacturerHoverFetchMock.mockResolvedValue({ title: 'Produsen Detail' });
    categoryFetcherFactoryMock.mockReturnValue(categoryHoverFetchMock);
    typeFetcherFactoryMock.mockReturnValue(typeHoverFetchMock);
    packageFetcherFactoryMock.mockReturnValue(packageHoverFetchMock);
    dosageFetcherFactoryMock.mockReturnValue(dosageHoverFetchMock);
    manufacturerFetcherFactoryMock.mockReturnValue(manufacturerHoverFetchMock);
  });

  it('handles code generation, realtime name handlers, and product type changes', () => {
    const props = baseProps();

    render(<ItemBasicInfoForm {...props} />);

    expect(props.onFieldChange).toHaveBeenCalledWith('code', 'ITM-001');
    expect(screen.getByText('ITM-001')).toBeInTheDocument();

    const nameInput = screen.getByTestId('input-name');
    fireEvent.change(nameInput, { target: { value: 'Paracetamol Forte' } });
    fireEvent.focus(nameInput);
    fireEvent.blur(nameInput);

    expect(props.onChange).toHaveBeenCalled();
    expect(realtimeHandlers.onChange).toHaveBeenCalled();
    expect(realtimeHandlers.onFocus).toHaveBeenCalledTimes(1);
    expect(realtimeHandlers.onBlur).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('medicine-non-obat'));
    expect(props.onFieldChange).toHaveBeenCalledWith('is_medicine', false);
    expect(props.onFieldChange).toHaveBeenCalledWith('has_expiry_date', false);

    fireEvent.click(screen.getByText('medicine-obat'));
    expect(props.onFieldChange).toHaveBeenCalledWith('is_medicine', true);
  });

  it('keeps explicit edit code and shows loading placeholders when datasets are empty', () => {
    const props = baseProps();

    render(
      <ItemBasicInfoForm
        {...props}
        isEditMode={true}
        formData={{ ...props.formData, code: 'FIX-123' }}
        loading={true}
        categories={[]}
        types={[]}
        packages={[]}
        dosages={[]}
        manufacturers={[]}
      />
    );

    expect(screen.getByText('FIX-123')).toBeInTheDocument();
    expect(props.onFieldChange).not.toHaveBeenCalledWith('code', 'ITM-001');
    expect(screen.getByDisplayValue('Memuat produsen...')).toBeDisabled();
    expect(screen.getByDisplayValue('Memuat kategori...')).toBeDisabled();
    expect(screen.getByDisplayValue('Memuat jenis...')).toBeDisabled();
    expect(screen.getByDisplayValue('Memuat kemasan...')).toBeDisabled();
    expect(screen.getByDisplayValue('Memuat sediaan...')).toBeDisabled();
  });

  it('delegates dropdown changes, add-new actions, and hover detail fetchers', async () => {
    const props = baseProps();
    const { rerender } = render(<ItemBasicInfoForm {...props} />);

    fireEvent.click(screen.getByText('change-manufacturer_id'));
    fireEvent.click(screen.getByText('change-category_id'));
    fireEvent.click(screen.getByText('change-type_id'));
    fireEvent.click(screen.getByText('change-package_id'));
    fireEvent.click(screen.getByText('change-dosage_id'));

    expect(props.onDropdownChange).toHaveBeenCalledWith(
      'manufacturer_id',
      'manufacturer_id-next'
    );
    expect(props.onDropdownChange).toHaveBeenCalledWith(
      'category_id',
      'category_id-next'
    );
    expect(props.onDropdownChange).toHaveBeenCalledWith(
      'type_id',
      'type_id-next'
    );
    expect(props.onDropdownChange).toHaveBeenCalledWith(
      'package_id',
      'package_id-next'
    );
    expect(props.onDropdownChange).toHaveBeenCalledWith(
      'dosage_id',
      'dosage_id-next'
    );

    fireEvent.click(screen.getByText('add-manufacturer_id'));
    fireEvent.click(screen.getByText('add-category_id'));
    fireEvent.click(screen.getByText('add-type_id'));
    fireEvent.click(screen.getByText('add-package_id'));
    fireEvent.click(screen.getByText('add-dosage_id'));

    expect(props.onAddNewManufacturer).toHaveBeenCalledWith('search-term');
    expect(props.onAddNewCategory).toHaveBeenCalledWith('search-term');
    expect(props.onAddNewType).toHaveBeenCalledWith('search-term');
    expect(props.onAddNewUnit).toHaveBeenCalledWith('search-term');
    expect(props.onAddNewDosage).toHaveBeenCalledWith('search-term');

    fireEvent.click(screen.getByText('hover-manufacturer_id'));
    fireEvent.click(screen.getByText('hover-category_id'));
    fireEvent.click(screen.getByText('hover-type_id'));
    fireEvent.click(screen.getByText('hover-package_id'));
    fireEvent.click(screen.getByText('hover-dosage_id'));

    await Promise.resolve();

    expect(manufacturerHoverFetchMock).toHaveBeenCalledWith(
      'manufacturer_id-hover'
    );
    expect(categoryHoverFetchMock).toHaveBeenCalledWith('category_id-hover');
    expect(typeHoverFetchMock).toHaveBeenCalledWith('type_id-hover');
    expect(packageHoverFetchMock).toHaveBeenCalledWith('package_id-hover');
    expect(dosageHoverFetchMock).toHaveBeenCalledWith('dosage_id-hover');
    expect(hoverResultMock).toHaveBeenCalled();

    rerender(<ItemBasicInfoForm {...props} disabled={true} />);
    fireEvent.click(screen.getByText('add-category_id'));
    expect(props.onAddNewCategory).toHaveBeenCalledTimes(1);
  });
});
