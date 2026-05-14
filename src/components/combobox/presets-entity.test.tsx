import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import FormField from '../form-field';
import { PharmaComboboxSelect, PharmaEntityComboboxSelect } from './index';

type EntityItem = { id: string; name: string };

describe('Combobox entity preset', () => {
  it('inherits FormField labels through layout wrappers', () => {
    render(
      <FormField label="Unit Dasar" required>
        <div className="space-y-2">
          <PharmaEntityComboboxSelect
            items={[]}
            valueId=""
            onValueIdChange={() => {}}
            field={{ name: 'base_inventory_unit_id' }}
            display={{ placeholder: 'Pilih Unit Dasar' }}
          />
        </div>
      </FormField>
    );

    const trigger = screen.getByRole('combobox', {
      name: /unit dasar pilih unit dasar/i,
    });
    expect(trigger.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('lets entity selects work with scalar form ids', () => {
    const onValueIdChange = vi.fn();
    const suppliers = [
      { id: 'supplier-a', name: 'Supplier A' },
      { id: 'supplier-b', name: 'Supplier B' },
    ];

    render(
      <PharmaEntityComboboxSelect
        items={suppliers}
        valueId="supplier-a"
        onValueIdChange={onValueIdChange}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier a/i }));
    fireEvent.click(screen.getByRole('option', { name: /supplier b/i }));

    expect(onValueIdChange).toHaveBeenCalledWith(
      'supplier-b',
      suppliers[1],
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('keeps an entity value selected when the selected item is outside the option list', () => {
    render(
      <PharmaEntityComboboxSelect
        items={[]}
        valueId="supplier-a"
        selectedItem={{ id: 'supplier-a', name: 'Supplier A' }}
        onValueIdChange={() => {}}
        validation={{ enabled: true, autoHide: false }}
        field={{ name: 'supplier_id', required: true }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /supplier a/i });
    expect(
      document.querySelector('input[name="supplier_id"]')?.getAttribute('value')
    ).toBe('supplier-a');

    fireEvent.blur(trigger, { relatedTarget: document.body });
    expect(trigger.getAttribute('aria-invalid')).toBeNull();
  });

  it('preserves an entity scalar value while the selected item is unavailable', () => {
    render(
      <PharmaEntityComboboxSelect
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        validation={{ enabled: true, autoHide: false }}
        field={{ name: 'supplier_id', required: true }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilihan tersimpan');
    expect(trigger.textContent).not.toContain('supplier-a');
    expect(
      document.querySelector('input[name="supplier_id"]')?.getAttribute('value')
    ).toBe('supplier-a');

    fireEvent.blur(trigger, { relatedTarget: document.body });
    expect(trigger.getAttribute('aria-invalid')).toBeNull();
  });

  it('does not pass unavailable entity fallback values through custom label formatters', () => {
    const itemToStringLabel = vi.fn((supplier: EntityItem & { code: string }) =>
      supplier.code.toUpperCase()
    );

    render(
      <PharmaEntityComboboxSelect<EntityItem & { code: string }>
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        item={{ toLabel: itemToStringLabel, toValue: supplier => supplier.id }}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilihan tersimpan');
    expect(trigger.textContent).not.toContain('supplier-a');
    expect(itemToStringLabel).not.toHaveBeenCalled();
    expect(
      document.querySelector('input[name="supplier_id"]')?.getAttribute('value')
    ).toBe('supplier-a');
  });

  it('does not pass unavailable entity fallback values through custom value comparisons', () => {
    const supplier = {
      id: 'supplier-b',
      name: 'Supplier B',
      code: 'supplier-b',
    };
    const itemToStringValue = vi.fn(
      (item: EntityItem & { code: string }) => item.code
    );
    const isItemEqualToValue = vi.fn(
      (
        item: EntityItem & { code: string },
        value: EntityItem & { code: string }
      ) => item.code === value.code
    );

    render(
      <PharmaEntityComboboxSelect<EntityItem & { code: string }>
        items={[supplier]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        item={{
          toValue: itemToStringValue,
          isEqualToValue: isItemEqualToValue,
        }}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilihan tersimpan');
    expect(
      document.querySelector('input[name="supplier_id"]')?.getAttribute('value')
    ).toBe('supplier-a');

    fireEvent.click(trigger);
    expect(screen.getByRole('option', { name: /supplier b/i })).toBeTruthy();
    expect(itemToStringValue.mock.calls.every(([item]) => 'code' in item)).toBe(
      true
    );
    expect(
      isItemEqualToValue.mock.calls.every(([item, value]) => {
        return 'code' in item && 'code' in value;
      })
    ).toBe(true);
  });

  it('does not pass unavailable entity fallback values through custom empty checks', () => {
    const isValueEmpty = vi.fn(
      (supplier: (EntityItem & { code: string }) | null) =>
        supplier ? supplier.code === '' : true
    );

    render(
      <PharmaEntityComboboxSelect<EntityItem & { code: string }>
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        item={{ toValue: supplier => supplier.id, isValueEmpty: isValueEmpty }}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilihan tersimpan');
    expect(trigger.textContent).not.toContain('supplier-a');
    expect(isValueEmpty).not.toHaveBeenCalled();
  });

  it('does not pass unavailable entity fallback values through custom hover detail mappers', () => {
    const itemToHoverDetailData = vi.fn(
      (supplier: EntityItem & { code: string }) => ({
        description: supplier.code.toUpperCase(),
      })
    );

    render(
      <PharmaEntityComboboxSelect<EntityItem & { code: string }>
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        hoverDetail={{ enabled: true, delay: 0 }}
        item={{
          toValue: supplier => supplier.id,
          toHoverDetailData: itemToHoverDetailData,
        }}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilihan tersimpan');

    expect(() => {
      fireEvent.mouseEnter(trigger);
    }).not.toThrow();
    expect(itemToHoverDetailData).not.toHaveBeenCalled();
    expect(
      document.querySelector('input[name="supplier_id"]')?.getAttribute('value')
    ).toBe('supplier-a');
  });

  it('passes real selected items outside the option list through custom hover detail mappers', () => {
    const supplier = {
      id: 'supplier-a',
      name: 'Supplier A',
      code: 'SA',
    };
    const itemToHoverDetailData = vi.fn(
      (item: EntityItem & { code: string }) => ({
        description: item.code,
      })
    );

    render(
      <PharmaEntityComboboxSelect<EntityItem & { code: string }>
        items={[]}
        valueId="supplier-a"
        selectedItem={supplier}
        onValueIdChange={() => {}}
        hoverDetail={{ enabled: true, delay: 0 }}
        item={{
          toValue: item => item.id,
          toHoverDetailData: itemToHoverDetailData,
        }}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih supplier' }}
      />
    );

    fireEvent.mouseEnter(screen.getByRole('combobox', { name: /supplier a/i }));

    expect(itemToHoverDetailData).toHaveBeenCalledWith(supplier);
  });

  it('accepts readonly option arrays in generic and entity presets', () => {
    const suppliers = [
      { id: 'supplier-a', name: 'Supplier A' },
    ] as const satisfies readonly EntityItem[];
    const statusItems = ['active', 'inactive'] as const;

    render(
      <>
        <PharmaEntityComboboxSelect
          items={suppliers}
          valueId="supplier-a"
          onValueIdChange={() => {}}
          field={{ name: 'supplier_id' }}
          display={{ placeholder: 'Pilih supplier' }}
        />
        <PharmaComboboxSelect<(typeof statusItems)[number]>
          items={statusItems}
          value="active"
          onValueChange={() => {}}
          item={{
            toLabel: value => (value === 'active' ? 'Aktif' : 'Tidak aktif'),
            toValue: value => value,
          }}
          field={{ name: 'status' }}
          display={{ placeholder: 'Pilih status' }}
          search={{ enabled: false }}
        />
      </>
    );

    expect(screen.getByRole('combobox', { name: /supplier a/i })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /aktif/i })).toBeTruthy();
  });
});
