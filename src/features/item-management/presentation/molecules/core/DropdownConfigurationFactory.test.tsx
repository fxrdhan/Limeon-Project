import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BatchEntityDropdowns,
  EntityDropdown,
  SmartDropdown,
} from './DropdownConfigurationFactory';

const dropdownProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const inputProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('@/components/form-field', () => ({
  default: ({
    children,
    label,
    required,
    className,
  }: {
    children: React.ReactNode;
    label: string;
    required?: boolean;
    className?: string;
  }) => (
    <div
      data-testid={`field-${label}`}
      data-required={required ? 'true' : 'false'}
      className={className}
    >
      {children}
    </div>
  ),
}));

vi.mock('@/components/input', () => ({
  default: (props: Record<string, unknown>) => {
    inputProps.push(props);
    return (
      <input
        data-testid="loading-input"
        value={String(props.value ?? '')}
        readOnly
      />
    );
  },
}));

vi.mock('@/components/dropdown', () => ({
  default: (props: Record<string, unknown>) => {
    dropdownProps.push(props);
    return (
      <button
        type="button"
        data-testid={`dropdown-${String(props.name)}`}
        onClick={() => (props.onChange as (v: string) => void)?.('picked')}
      >
        {String(props.placeholder ?? props.name)}
      </button>
    );
  },
}));

describe('DropdownConfigurationFactory', () => {
  beforeEach(() => {
    dropdownProps.length = 0;
    inputProps.length = 0;
  });

  it('renders SmartDropdown loading state with generated message', () => {
    render(
      <SmartDropdown
        name="category_id"
        label="Kategori"
        value=""
        options={[]}
        loading={true}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('loading-input')).toHaveValue(
      'Memuat kategori...'
    );
    expect(dropdownProps).toHaveLength(0);
  });

  it('renders SmartDropdown as Dropdown and applies merged defaults/overrides', () => {
    const onChange = vi.fn();
    const onAddNew = vi.fn();
    const onFetchHoverDetail = vi.fn(async () => null);

    render(
      <SmartDropdown
        name="manufacturer_id"
        label="Produsen"
        value="m-1"
        options={[{ value: 'm-1', label: 'Produsen A' }]}
        loading={false}
        required={true}
        className="custom-field"
        validation={{ autoHideDelay: 999 }}
        hoverDetail={{ delay: 222 }}
        onChange={onChange}
        onAddNew={onAddNew}
        onFetchHoverDetail={onFetchHoverDetail}
      />
    );

    const props = dropdownProps.at(-1);
    expect(props).toMatchObject({
      name: 'manufacturer_id',
      value: 'm-1',
      required: true,
      validate: true,
      showValidationOnBlur: true,
      validationAutoHide: true,
      validationAutoHideDelay: 999,
      enableHoverDetail: true,
      hoverDetailDelay: 222,
    });

    fireEvent.click(screen.getByTestId('dropdown-manufacturer_id'));
    expect(onChange).toHaveBeenCalledWith('picked');
    expect(screen.getByTestId('field-Produsen')).toHaveClass('custom-field');
    expect(screen.getByTestId('field-Produsen')).toHaveAttribute(
      'data-required',
      'true'
    );
  });

  it('maps EntityDropdown configuration by entity type', () => {
    const onChange = vi.fn();

    render(
      <EntityDropdown
        entityType="dosages"
        value=""
        options={[]}
        loading={false}
        onChange={onChange}
      />
    );

    const props = dropdownProps.at(-1);
    expect(props).toMatchObject({
      name: 'dosage_id',
      placeholder: 'Pilih Sediaan',
      required: false,
    });
  });

  it('renders batch dropdowns with tab sequence and field-aware change handlers', () => {
    const onDropdownChange = vi.fn();
    const onAddNew = {
      categories: vi.fn(),
      manufacturers: vi.fn(),
    };
    const hoverDetailFetchers = {
      categories: vi.fn(async () => null),
      manufacturers: vi.fn(async () => null),
    };

    render(
      <BatchEntityDropdowns
        formData={{
          category_id: 'c-1',
          type_id: '',
          package_id: '',
          unit_id: '',
          dosage_id: '',
          manufacturer_id: '',
        }}
        options={{
          categories: [{ value: 'c-1', label: 'Cat 1' }],
          types: [],
          packages: [],
          units: [],
          dosages: [],
          manufacturers: [],
        }}
        loading={false}
        startingTabIndex={5}
        onDropdownChange={onDropdownChange}
        onAddNew={onAddNew}
        hoverDetailFetchers={hoverDetailFetchers}
      />
    );

    expect(dropdownProps).toHaveLength(6);
    expect(dropdownProps[0]).toMatchObject({
      name: 'category_id',
      tabIndex: 5,
      required: true,
      onAddNew: onAddNew.categories,
      onFetchHoverDetail: hoverDetailFetchers.categories,
    });
    expect(dropdownProps[5]).toMatchObject({
      name: 'manufacturer_id',
      tabIndex: 10,
      onAddNew: onAddNew.manufacturers,
      onFetchHoverDetail: hoverDetailFetchers.manufacturers,
    });

    fireEvent.click(screen.getByTestId('dropdown-category_id'));
    expect(onDropdownChange).toHaveBeenCalledWith('category_id', 'picked');
  });
});
