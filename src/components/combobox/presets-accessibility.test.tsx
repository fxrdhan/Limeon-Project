import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import FormField from '../form-field';
import { PharmaComboboxSelect } from './index';

type EntityItem = { id: string; name: string };

describe('Combobox app preset accessibility', () => {
  it('passes external field labeling to the trigger without labeling popup search as the field', () => {
    render(
      <>
        <label id="supplier-label" htmlFor="supplier-trigger">
          Supplier
        </label>
        <PharmaComboboxSelect<EntityItem>
          items={[{ id: 'supplier-a', name: 'Supplier A' }]}
          value={null}
          onValueChange={() => {}}
          item={{ toLabel: item => item.name, toValue: item => item.id }}
          field={{
            id: 'supplier-trigger',
            name: 'supplier_id',
            aria: { labelledBy: 'supplier-label' },
          }}
          display={{ placeholder: 'Pilih Supplier' }}
        />
      </>
    );

    const trigger = screen.getByLabelText(/supplier/i);
    expect(trigger.id).toBe('supplier-trigger');
    expect(trigger.getAttribute('aria-labelledby')).toContain('supplier-label');

    fireEvent.click(trigger);
    const searchInput = screen.getByRole('searchbox', {
      name: /cari supplier id/i,
    });
    expect(searchInput.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('labels the preset listbox from the effective field label source', () => {
    const baseProps = {
      items: [{ id: 'supplier-a', name: 'Supplier A' }],
      value: null,
      onValueChange: () => {},
      item: {
        toLabel: (item: EntityItem) => item.name,
        toValue: (item: EntityItem) => item.id,
      },
      field: {
        name: 'supplier_id',
      },
      display: {
        placeholder: 'Pilih Supplier',
      },
    };
    const expectListboxLabelledByText = (labelText: string) => {
      const listbox = screen.getByRole('listbox');
      const labelId = listbox.getAttribute('aria-labelledby');

      expect(labelId).toBeTruthy();
      expect(document.getElementById(labelId as string)?.textContent).toBe(
        labelText
      );
      expect(listbox.hasAttribute('aria-label')).toBe(false);
    };

    const standalone = render(
      <PharmaComboboxSelect<EntityItem>
        {...baseProps}
        field={{ ...baseProps.field, label: 'Supplier' }}
      />
    );
    fireEvent.click(
      screen.getByRole('combobox', { name: /supplier pilih supplier/i })
    );
    expectListboxLabelledByText('Supplier');
    standalone.unmount();

    const externalLabel = render(
      <>
        <label id="supplier-external-label" htmlFor="supplier-external-trigger">
          Supplier External
        </label>
        <PharmaComboboxSelect<EntityItem>
          {...baseProps}
          field={{
            ...baseProps.field,
            id: 'supplier-external-trigger',
            aria: { labelledBy: 'supplier-external-label' },
          }}
        />
      </>
    );
    fireEvent.click(
      screen.getByRole('combobox', {
        name: /supplier external pilih supplier/i,
      })
    );
    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      'supplier-external-label'
    );
    externalLabel.unmount();

    const ariaLabel = render(
      <PharmaComboboxSelect<EntityItem>
        {...baseProps}
        field={{
          ...baseProps.field,
          aria: { label: 'Supplier picker' },
        }}
      />
    );
    fireEvent.click(
      screen.getByRole('combobox', { name: /^supplier picker$/i })
    );
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe(
      'Supplier picker'
    );
    expect(
      screen.getByRole('searchbox', { name: /^Cari Supplier picker$/i })
    ).toBeTruthy();
    expect(screen.getByRole('listbox').hasAttribute('aria-labelledby')).toBe(
      false
    );
    ariaLabel.unmount();

    render(
      <FormField label="Supplier Field">
        <PharmaComboboxSelect<EntityItem> {...baseProps} />
      </FormField>
    );
    fireEvent.click(
      screen.getByRole('combobox', {
        name: /supplier field pilih supplier/i,
      })
    );
    expectListboxLabelledByText('Supplier Field');
  });

  it('keeps empty status outside the listbox in the standard preset composition', () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        items={[]}
        value={null}
        onValueChange={() => {}}
        item={{ toLabel: item => item.name, toValue: item => item.id }}
        field={{ name: 'category_id' }}
        display={{ placeholder: 'Pilih kategori' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    const listbox = screen.getByRole('listbox');
    const emptyStatus = screen.getByRole('status');
    expect(listbox.contains(emptyStatus)).toBe(false);
  });

  it('uses an explicit preset label as the fallback accessible name', () => {
    render(
      <PharmaComboboxSelect
        items={[0, 1]}
        value={0}
        onValueChange={() => {}}
        item={{
          toLabel: value => (value === 0 ? 'Januari' : 'Februari'),
          toValue: value => value.toString(),
        }}
        field={{ label: 'Bulan', name: 'month-selector' }}
        display={{ placeholder: 'Pilih bulan' }}
        search={{ enabled: false }}
      />
    );

    expect(
      screen.getByRole('combobox', { name: /bulan januari/i })
    ).toBeTruthy();
  });

  it('uses the preset name before a generic placeholder for fallback accessible names', () => {
    render(
      <PharmaComboboxSelect
        items={['supplier-a']}
        value={null}
        onValueChange={() => {}}
        item={{ toLabel: value => value, toValue: value => value }}
        field={{ name: 'supplier_id' }}
        display={{ placeholder: 'Pilih' }}
        search={{ enabled: false }}
      />
    );

    expect(
      screen.getByRole('combobox', { name: /supplier id pilih/i })
    ).toBeTruthy();
  });

  it('does not render a hidden form value when preset name is omitted', () => {
    render(
      <PharmaComboboxSelect
        items={['active', 'inactive']}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: value => (value === 'active' ? 'Aktif' : 'Tidak aktif'),
          toValue: value => value,
        }}
        display={{ placeholder: 'Pilih status' }}
      />
    );

    expect(
      screen.getByRole('combobox', { name: /pilih status/i })
    ).toBeTruthy();
    expect(document.querySelector('input[type="hidden"]')).toBeNull();
  });
});
