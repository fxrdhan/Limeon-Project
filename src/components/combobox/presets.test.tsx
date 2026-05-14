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
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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

  it('keeps selected auto-scroll from hiding the first ranked search result', async () => {
    const categories = [
      { id: 'mineral', name: 'Mineral' },
      { id: 'mukolitik', name: 'Mukolitik' },
      { id: 'mydriatic', name: 'Mydriatic' },
      { id: 'medical-device', name: 'Medical Device' },
    ];

    render(
      <PharmaComboboxSelect
        items={categories}
        value={categories[1]}
        onValueChange={() => {}}
        item={{
          toLabel: category => category.name,
          toValue: category => category.id,
        }}
        field={{ name: 'category_id' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /mukolitik/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    const listbox = screen.getByRole('listbox');
    let scrollTop = 96;

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
    fireEvent.change(searchInput, { target: { value: 'm' } });
    const mineralOption = screen.getByRole('option', { name: /^mineral$/i });
    const mukolitikOption = screen.getByRole('option', {
      name: /^mukolitik$/i,
    });

    Object.defineProperty(mukolitikOption, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 146,
        height: 28,
        left: 0,
        right: 240,
        toJSON: () => {},
        top: 118,
        width: 240,
        x: 0,
        y: 118,
      }),
    });

    await new Promise<void>(resolve => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });

    await waitFor(() => {
      expect(searchInput.getAttribute('aria-activedescendant')).toBe(
        mineralOption.id
      );
      expect(scrollTop).toBe(0);
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
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
        items={suppliers}
        value={suppliers[1]}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
          isDisabled: supplier => Boolean(supplier.disabled),
        }}
        field={{ name: 'supplier_id' }}
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
        items={suppliers}
        value={suppliers[2]}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
          isDisabled: supplier => Boolean(supplier.disabled),
        }}
        field={{ name: 'supplier_id' }}
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
        items={suppliers}
        value={suppliers[1]}
        onValueChange={onValueChange}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
          items={suppliers}
          value={suppliers[0]}
          onValueChange={() => {
            screen.getByLabelText('Next field').focus();
          }}
          item={{
            toLabel: supplier => supplier.name,
            toValue: supplier => supplier.id,
          }}
          field={{ name: 'supplier_id' }}
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
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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

  it('keeps exact-match create detection in ranked search with limited visible options', () => {
    render(
      <PharmaComboboxSelect
        items={[
          { id: 'alpha', name: 'Alpha Supplier' },
          { id: 'supplier', name: 'Supplier' },
          { id: 'beta', name: 'Beta Supplier' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
        search={{ visibleItemLimit: 1 }}
        creation={{
          onCreate: () => {},
          label: 'Tambah supplier',
        }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Supplier' },
    });

    expect(screen.getByRole('option', { name: /^supplier$/i })).toBeTruthy();
    expect(
      screen.queryByRole('option', { name: /alpha supplier/i })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /tambah supplier/i })
    ).toBeNull();
  });

  it('rejects duplicate submitted values for form-bound comboboxes', () => {
    const duplicateSuppliers = [
      { id: 'duplicate-supplier', name: 'Supplier A' },
      { id: 'duplicate-supplier', name: 'Supplier B' },
    ];

    expect(() => {
      render(
        <PharmaComboboxSelect
          items={duplicateSuppliers}
          value={null}
          onValueChange={() => {}}
          item={{
            toLabel: supplier => supplier.name,
            toValue: supplier => supplier.id,
          }}
          field={{ name: 'duplicate_supplier_id' }}
        />
      );
    }).toThrow(
      'Duplicate item.toValue "duplicate-supplier" detected for duplicate_supplier_id'
    );
  });

  it('keeps the selected option visible when a visible item limit is applied', () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];

    render(
      <PharmaComboboxSelect
        items={suppliers}
        value={suppliers[2]}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
        search={{ visibleItemLimit: 2 }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier c/i }));

    expect(screen.getByRole('option', { name: /supplier a/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /supplier c/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /supplier b/i })).toBeNull();
  });

  it('virtualizes long option lists without changing keyboard selection flow', async () => {
    const longOptions = Array.from({ length: 150 }, (_, index) => {
      const optionNumber = String(index + 1).padStart(3, '0');

      return {
        id: `option-${optionNumber}`,
        name: `Virtual option ${optionNumber}`,
      };
    });
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={longOptions}
        value={null}
        onValueChange={onValueChange}
        item={{ toLabel: option => option.name, toValue: option => option.id }}
        field={{ name: 'virtualized_option_id' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /virtual option 001/i })
      ).toBeTruthy();
    });
    expect(screen.getAllByRole('option').length).toBeLessThan(
      longOptions.length
    );
    expect(
      screen.queryByRole('option', { name: /virtual option 150/i })
    ).toBeNull();

    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Virtual option 150' },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /virtual option 150/i })
      ).toBeTruthy();
    });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      longOptions[149],
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('keeps filtered option indices aligned with primitive active descendant', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
          { id: 'c', name: 'Supplier C' },
        ]}
        value={null}
        onValueChange={onValueChange}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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

  it('uses the first ranked search result as the active option while searching', async () => {
    const suppliers = [
      { id: 'best', name: 'Supplier Target' },
      { id: 'selected', name: 'Archived Supplier Target' },
    ];
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={suppliers}
        value={suppliers[1]}
        onValueChange={onValueChange}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
      />
    );

    fireEvent.click(
      screen.getByRole('combobox', { name: /archived supplier target/i })
    );
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Supplier' } });
    const bestOption = screen.getByRole('option', {
      name: /^supplier target$/i,
    });

    await waitFor(() => {
      expect(searchInput.getAttribute('aria-activedescendant')).toBe(
        bestOption.id
      );
    });

    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      suppliers[0],
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('selects filtered options through primitive keyboard handling', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={onValueChange}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
          { id: 'c', name: 'Supplier C' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Branch B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
        items={[{ id: 'a', name: 'Supplier A', code: 'SUP-A' }]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
        display={{
          renderOption: (supplier, state) => (
            <span>
              {state.label} {state.selected ? 'selected' : 'available'}
            </span>
          ),
          renderOptionMeta: supplier => supplier.code,
        }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    expect(screen.getByText(/supplier a available/i)).toBeTruthy();
    expect(screen.getByText('SUP-A')).toBeTruthy();
  });

  it('keeps custom popup classes separate from popup width matching', () => {
    const suppliers = [{ id: 'supplier-a', name: 'Supplier A' }];
    const baseProps = {
      items: suppliers,
      value: null,
      onValueChange: () => {},
      item: {
        toLabel: (supplier: (typeof suppliers)[number]) => supplier.name,
        toValue: (supplier: (typeof suppliers)[number]) => supplier.id,
      },
      field: {
        label: 'Supplier',
        name: 'supplier_id',
      },
    };
    const getPositioner = () => {
      const listbox = screen.getByRole('listbox');
      const popup = listbox.closest('[data-combobox-popup]');

      expect(popup).toBeTruthy();
      expect(popup?.parentElement).toBeTruthy();

      return popup?.parentElement as HTMLElement;
    };

    const defaultPopup = render(
      <PharmaComboboxSelect
        {...baseProps}
        popup={{
          className:
            'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl',
        }}
      />
    );
    fireEvent.click(screen.getByRole('combobox', { name: /supplier/i }));
    expect(getPositioner().style.width).toBe('var(--anchor-width)');
    defaultPopup.unmount();

    render(
      <PharmaComboboxSelect
        {...baseProps}
        popup={{
          className:
            'w-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl',
          matchAnchorWidth: false,
        }}
      />
    );
    fireEvent.click(screen.getByRole('combobox', { name: /supplier/i }));

    const customWidthPositioner = getPositioner();
    expect(customWidthPositioner.style.width).toBe('max-content');
    expect(customWidthPositioner.style.minWidth).toBe('var(--anchor-width)');
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
          items={['unpaid', 'paid']}
          value="unpaid"
          onValueChange={value => onEnumChange(value)}
          item={{
            toLabel: value => (value === 'unpaid' ? 'Belum Dibayar' : 'Lunas'),
            toValue: value => value,
          }}
          field={{ name: 'payment_status' }}
          display={{ indicator: 'radio' }}
          search={{ enabled: false }}
        />
        <PharmaComboboxSelect
          items={[0, 1]}
          value={0}
          onValueChange={value => onMonthChange(value)}
          item={{
            toLabel: value => (value === 0 ? 'Januari' : 'Februari'),
            toValue: value => value.toString(),
          }}
          field={{ label: 'Bulan', name: 'month-selector' }}
          display={{ indicator: 'none' }}
          search={{ enabled: false }}
        />
        <PharmaComboboxSelect
          items={suppliers}
          value={findComboboxItemByValue(
            suppliers,
            'supplier-a',
            item => item.id
          )}
          onValueChange={supplier => onSupplierChange(supplier?.id ?? '')}
          item={{
            toLabel: supplier => supplier.name,
            toValue: supplier => supplier.id,
          }}
          field={{ name: 'supplier_id' }}
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
