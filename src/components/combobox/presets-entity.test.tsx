import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import FormField from '../form-field';
import { PharmaEntityComboboxSelect } from './index';

type EntityItem = { id: string; name: string };

describe('Combobox entity preset', () => {
  it('inherits FormField labels through layout wrappers', () => {
    render(
      <FormField label="Unit Dasar" required>
        <div className="space-y-2">
          <PharmaEntityComboboxSelect
            name="base_inventory_unit_id"
            items={[]}
            valueId=""
            onValueIdChange={() => {}}
            placeholder="Pilih Unit Dasar"
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
        name="supplier_id"
        items={suppliers}
        valueId="supplier-a"
        onValueIdChange={onValueIdChange}
        placeholder="Pilih supplier"
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
        name="supplier_id"
        items={[]}
        valueId="supplier-a"
        selectedItem={{ id: 'supplier-a', name: 'Supplier A' }}
        onValueIdChange={() => {}}
        placeholder="Pilih supplier"
        required
        validation={{ enabled: true, autoHide: false }}
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
        name="supplier_id"
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        placeholder="Pilih supplier"
        required
        validation={{ enabled: true, autoHide: false }}
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
        name="supplier_id"
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        itemToStringLabel={itemToStringLabel}
        itemToStringValue={supplier => supplier.id}
        placeholder="Pilih supplier"
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

  it('does not pass unavailable entity fallback values through custom empty checks', () => {
    const isValueEmpty = vi.fn(
      (supplier: (EntityItem & { code: string }) | null) =>
        supplier ? supplier.code === '' : true
    );

    render(
      <PharmaEntityComboboxSelect<EntityItem & { code: string }>
        name="supplier_id"
        items={[]}
        valueId="supplier-a"
        onValueIdChange={() => {}}
        itemToStringValue={supplier => supplier.id}
        isValueEmpty={isValueEmpty}
        placeholder="Pilih supplier"
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilihan tersimpan');
    expect(trigger.textContent).not.toContain('supplier-a');
    expect(isValueEmpty).not.toHaveBeenCalled();
  });
});
