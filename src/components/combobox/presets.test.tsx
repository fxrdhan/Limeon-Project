import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { findComboboxItemByValue, PharmaComboboxSelect } from './index';
import {
  getPharmaComboboxOptionIndexSelector,
  pharmaComboboxOptionIndexAttribute,
} from './utils/preset-dom';

describe('Combobox app presets', () => {
  it('restores the selected visual highlight when search is cleared', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier b/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    let supplierB = screen.getByRole('option', { name: /supplier b/i });

    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.change(searchInput, { target: { value: 'Supplier C' } });
    await waitFor(() => {
      expect(
        screen
          .getByRole('option', { name: /supplier c/i })
          .querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.change(searchInput, { target: { value: '' } });
    const supplierA = screen.getByRole('option', { name: /supplier a/i });
    supplierB = screen.getByRole('option', { name: /supplier b/i });
    const supplierC = screen.getByRole('option', { name: /supplier c/i });

    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
    expect(
      supplierA.querySelector('[data-pharma-combobox-highlight]')
    ).toBeNull();
    expect(
      supplierC.querySelector('[data-pharma-combobox-highlight]')
    ).toBeNull();

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(
        supplierC.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('restores selected option scroll position when clearing search without index changes', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier b/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    const listbox = screen.getByRole('listbox');
    const selectedOption = screen.getByRole('option', { name: /supplier b/i });
    let scrollTop = 40;

    Object.defineProperty(listbox, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: value => {
        scrollTop = value;
      },
    });
    Object.defineProperty(listbox, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 200,
        height: 120,
        left: 0,
        right: 240,
        toJSON: () => {},
        top: 80,
        width: 240,
        x: 0,
        y: 80,
      }),
    });
    Object.defineProperty(selectedOption, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 130,
        height: 28,
        left: 0,
        right: 240,
        toJSON: () => {},
        top: 102,
        width: 240,
        x: 0,
        y: 102,
      }),
    });

    fireEvent.change(searchInput, { target: { value: 'Supplier' } });
    scrollTop = 99;
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(scrollTop).toBe(117);
    });
  });

  it('continues keyboard navigation from the selected visual highlight on open', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier b/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    const supplierB = screen.getByRole('option', { name: /supplier b/i });
    const supplierC = screen.getByRole('option', { name: /supplier c/i });

    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(
        supplierC.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('skips disabled items when navigating down from the selected visual highlight', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { disabled: true, id: 'c', name: 'Supplier C' },
      { id: 'd', name: 'Supplier D' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        isItemDisabled={supplier => Boolean(supplier.disabled)}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier b/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    const supplierB = screen.getByRole('option', { name: /supplier b/i });
    const supplierD = screen.getByRole('option', { name: /supplier d/i });

    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(
        supplierD.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('skips disabled items when navigating up from the selected visual highlight', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { disabled: true, id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
      { id: 'd', name: 'Supplier D' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[2]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        isItemDisabled={supplier => Boolean(supplier.disabled)}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier c/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    const supplierA = screen.getByRole('option', { name: /supplier a/i });
    const supplierC = screen.getByRole('option', { name: /supplier c/i });

    await waitFor(() => {
      expect(
        supplierC.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });

    await waitFor(() => {
      expect(
        supplierA.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('commits the current visual highlight with Enter from the search input', async () => {
    const onValueChange = vi.fn();
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[1]}
        onValueChange={onValueChange}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /supplier b/i });
    fireEvent.click(trigger);
    const searchInput = screen.getByPlaceholderText('Cari...');
    const supplierB = screen.getByRole('option', { name: /supplier b/i });

    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      suppliers[1],
      expect.objectContaining({ reason: 'item-press' })
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('does not steal focus when selection moves focus elsewhere', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
    ];

    render(
      <>
        <PharmaComboboxSelect
          name="supplier_id"
          items={suppliers}
          value={suppliers[0]}
          onValueChange={() => {
            screen.getByLabelText('Next field').focus();
          }}
          itemToStringLabel={supplier => supplier.name}
          itemToStringValue={supplier => supplier.id}
        />
        <input aria-label="Next field" />
      </>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier a/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');

    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Next field'));
    });
  });

  it('removes stale options immediately when search has no results', () => {
    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const listbox = screen.getByRole('listbox');
    expect(
      listbox.querySelector(`[${pharmaComboboxOptionIndexAttribute}]`)
    ).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'gada' },
    });

    expect(
      listbox.querySelector(`[${pharmaComboboxOptionIndexAttribute}]`)
    ).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Tidak ada data');
  });

  it('keeps exact-match create detection across limited visible options', () => {
    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'alpha', name: 'Alpha Supplier' },
          { id: 'supplier', name: 'Supplier' },
          { id: 'beta', name: 'Beta Supplier' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        visibleItemLimit={1}
        createAction={{ onCreate: () => {}, label: 'Tambah supplier' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Supplier' },
    });

    expect(
      screen.getByRole('option', { name: /alpha supplier/i })
    ).toBeTruthy();
    expect(screen.queryByRole('option', { name: /^supplier$/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /tambah supplier/i })
    ).toBeNull();
  });

  it('keeps the selected option visible when a visible item limit is applied', () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[2]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        visibleItemLimit={2}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier c/i }));

    expect(screen.getByRole('option', { name: /supplier a/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /supplier c/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /supplier b/i })).toBeNull();
  });

  it('keeps filtered option indices aligned with primitive active descendant', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
          { id: 'c', name: 'Supplier C' },
        ]}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Supplier B' } });
    const supplierB = screen.getByRole('option', { name: /supplier b/i });

    expect(supplierB.matches(getPharmaComboboxOptionIndexSelector(0))).toBe(
      true
    );
    await waitFor(() => {
      expect(searchInput.getAttribute('aria-activedescendant')).toBe(
        supplierB.id
      );
    });

    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('selects filtered options through primitive keyboard handling', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Supplier B' } });
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('preserves animated highlight background while pointer focus moves', async () => {
    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const supplierA = screen.getByRole('option', { name: /supplier a/i });
    const supplierB = screen.getByRole('option', { name: /supplier b/i });

    await waitFor(() => {
      expect(
        supplierA.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.mouseEnter(supplierB);
    expect(
      supplierA.querySelector('[data-pharma-combobox-highlight]')
    ).toBeNull();
    expect(
      supplierB.querySelector('[data-pharma-combobox-highlight]')
    ).toBeTruthy();

    fireEvent.mouseLeave(supplierB);
    expect(
      supplierB.querySelector('[data-pharma-combobox-highlight]')
    ).toBeTruthy();
  });

  it('continues keyboard navigation from the last pointer-highlighted option', async () => {
    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
          { id: 'c', name: 'Supplier C' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const supplierB = screen.getByRole('option', { name: /supplier b/i });
    const supplierC = screen.getByRole('option', { name: /supplier c/i });

    fireEvent.mouseEnter(supplierB);
    expect(
      supplierB.querySelector('[data-pharma-combobox-highlight]')
    ).toBeTruthy();

    fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
      key: 'ArrowDown',
    });

    await waitFor(() => {
      expect(
        supplierC.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('keeps list swap animation active while searching', () => {
    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Branch B' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Branch' },
    });

    const visibleOption = screen.getByRole('option', { name: /branch b/i });
    expect(
      visibleOption.parentElement?.getAttribute(
        'data-pharma-combobox-option-frame'
      )
    ).toBe('');
  });

  it('renders typed option content and metadata without requiring custom item DOM', () => {
    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[{ id: 'a', name: 'Supplier A', code: 'SUP-A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        renderOption={(supplier, state) => (
          <span>
            {state.label} {state.selected ? 'selected' : 'available'}
          </span>
        )}
        renderOptionMeta={supplier => supplier.code}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    expect(screen.getByText(/supplier a available/i)).toBeTruthy();
    expect(screen.getByText('SUP-A')).toBeTruthy();
  });

  it('covers enum radio-style, calendar text, and purchase object selects', () => {
    const onEnumChange = vi.fn();
    const onMonthChange = vi.fn();
    const onSupplierChange = vi.fn();
    const suppliers = [
      { id: 'supplier-a', name: 'Supplier A' },
      { id: 'supplier-b', name: 'Supplier B' },
    ];

    render(
      <>
        <PharmaComboboxSelect
          name="payment_status"
          items={['unpaid', 'paid']}
          value="unpaid"
          onValueChange={value => onEnumChange(value)}
          itemToStringLabel={value =>
            value === 'unpaid' ? 'Belum Dibayar' : 'Lunas'
          }
          itemToStringValue={value => value}
          searchable={false}
          indicator="radio"
        />
        <PharmaComboboxSelect
          label="Bulan"
          name="month-selector"
          items={[0, 1]}
          value={0}
          onValueChange={value => onMonthChange(value)}
          itemToStringLabel={value => (value === 0 ? 'Januari' : 'Februari')}
          itemToStringValue={value => value.toString()}
          searchable={false}
          indicator="none"
        />
        <PharmaComboboxSelect
          name="supplier_id"
          items={suppliers}
          value={findComboboxItemByValue(
            suppliers,
            'supplier-a',
            item => item.id
          )}
          onValueChange={supplier => onSupplierChange(supplier?.id ?? '')}
          itemToStringLabel={supplier => supplier.name}
          itemToStringValue={supplier => supplier.id}
        />
      </>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /belum dibayar/i }));
    fireEvent.click(screen.getByRole('option', { name: /lunas/i }));
    expect(onEnumChange).toHaveBeenCalledWith('paid');

    fireEvent.click(screen.getByRole('combobox', { name: /bulan januari/i }));
    fireEvent.click(screen.getByRole('option', { name: /februari/i }));
    expect(onMonthChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('combobox', { name: /supplier a/i }));
    const supplierList = screen.getAllByRole('listbox').at(-1);
    expect(supplierList).toBeTruthy();
    fireEvent.click(
      within(supplierList as HTMLElement).getByText('Supplier B')
    );
    expect(onSupplierChange).toHaveBeenCalledWith('supplier-b');
  });
});
