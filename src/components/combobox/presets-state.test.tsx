import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PharmaComboboxSelect } from './index';
import {
  defaultComboboxLargeListVisibleItemLimit,
  getComboboxSearchEntries,
  getComboboxSearchState,
  getDuplicateComboboxOptionValue,
} from './utils/preset-state';

describe('Combobox app preset state interactions', () => {
  it('ranks searched options by deterministic match quality', () => {
    const items = [
      { id: 'substring', name: 'ArchivedSupplier' },
      { id: 'word-prefix', name: 'Alpha Supplier' },
      { id: 'prefix', name: 'Supplier Alpha' },
      { id: 'exact', name: 'Supplier' },
    ];
    const searchState = getComboboxSearchState({
      isSameItem: (item, value) => item.id === value.id,
      items,
      normalizedInputValue: 'Supplier',
      searchEntries: getComboboxSearchEntries(items, item => item.name),
      selectedValue: null,
    });

    expect(searchState.visibleItems.map(item => item.id)).toEqual([
      'exact',
      'prefix',
      'word-prefix',
      'substring',
    ]);
    expect(searchState.hasExactItem).toBe(true);
  });

  it('keeps empty searches in original item order', () => {
    const items = [
      { id: 'b', name: 'Supplier B' },
      { id: 'a', name: 'Supplier A' },
    ];
    const searchState = getComboboxSearchState({
      isSameItem: (item, value) => item.id === value.id,
      items,
      normalizedInputValue: '',
      searchEntries: getComboboxSearchEntries(items, item => item.name),
      selectedValue: null,
    });

    expect(searchState.visibleItems.map(item => item.id)).toEqual(['b', 'a']);
  });

  it('bounds unconfigured large option lists while preserving ranked order', () => {
    const items = Array.from({ length: 220 }, (_, index) => ({
      id: `supplier-${index}`,
      name: `Supplier ${index.toString().padStart(3, '0')}`,
    }));
    const searchState = getComboboxSearchState({
      isSameItem: (item, value) => item.id === value.id,
      items,
      normalizedInputValue: 'Supplier',
      searchEntries: getComboboxSearchEntries(items, item => item.name),
      selectedValue: null,
    });

    expect(searchState.visibleItems).toHaveLength(
      defaultComboboxLargeListVisibleItemLimit
    );
    expect(searchState.visibleItems[0]?.id).toBe('supplier-0');
    expect(
      searchState.visibleItems.at(defaultComboboxLargeListVisibleItemLimit - 1)
        ?.id
    ).toBe(`supplier-${defaultComboboxLargeListVisibleItemLimit - 1}`);
  });

  it('keeps a matching selected option visible when ranked results are limited', () => {
    const items = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
      { id: 'c', name: 'Supplier C' },
    ];
    const searchState = getComboboxSearchState({
      isSameItem: (item, value) => item.id === value.id,
      items,
      normalizedInputValue: 'Supplier',
      searchEntries: getComboboxSearchEntries(items, item => item.name),
      selectedValue: items[2],
      visibleItemLimit: 2,
    });

    expect(searchState.visibleItems.map(item => item.id)).toEqual(['a', 'c']);
  });

  it('keeps exact-match state when selected matches replace limited results', () => {
    const items = [
      { id: 'exact', name: 'Supplier' },
      { id: 'selected', name: 'Archived Supplier' },
    ];
    const searchState = getComboboxSearchState({
      isSameItem: (item, value) => item.id === value.id,
      items,
      normalizedInputValue: 'Supplier',
      searchEntries: getComboboxSearchEntries(items, item => item.name),
      selectedValue: items[1],
      visibleItemLimit: 1,
    });

    expect(searchState.visibleItems.map(item => item.id)).toEqual(['selected']);
    expect(searchState.hasExactItem).toBe(true);
  });

  it('matches acronyms, consonant skeletons, subsequences, and typo fuzzy fallbacks', () => {
    const items = [{ id: 'paracetamol-tablet', name: 'Paracetamol Tablet' }];
    const searchEntries = getComboboxSearchEntries(items, item => item.name);
    const getVisibleIds = (query: string) =>
      getComboboxSearchState({
        isSameItem: (item, value) => item.id === value.id,
        items,
        normalizedInputValue: query,
        searchEntries,
        selectedValue: null,
      }).visibleItems.map(item => item.id);

    expect(getVisibleIds('pt')).toEqual(['paracetamol-tablet']);
    expect(getVisibleIds('prctml')).toEqual(['paracetamol-tablet']);
    expect(getVisibleIds('pct')).toEqual(['paracetamol-tablet']);
    expect(getVisibleIds('paracitamol')).toEqual(['paracetamol-tablet']);
  });

  it('detects duplicate submitted option values without collapsing options', () => {
    const duplicateValue = getDuplicateComboboxOptionValue(
      [
        { id: 'supplier-a', name: 'Supplier A' },
        { id: 'supplier-a', name: 'Supplier A duplicate' },
      ],
      supplier => supplier.id
    );

    expect(duplicateValue).toBe('supplier-a');
    expect(
      getDuplicateComboboxOptionValue(
        [
          { id: 'supplier-a', name: 'Supplier A' },
          { id: 'supplier-b', name: 'Supplier B' },
        ],
        supplier => supplier.id
      )
    ).toBeNull();
  });

  it('preserves cancelable details for preset value changes', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={(item, details) => {
          onValueChange(item, details);
          details.cancel();
        }}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Supplier B' },
    });
    fireEvent.click(screen.getByRole('option', { name: /supplier b/i }));

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ reason: 'item-press' })
    );
    expect((searchInput as HTMLInputElement).value).toBe('Supplier B');
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('preserves cancelable details for preset open changes', () => {
    const onOpenChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={[{ id: 'a', name: 'Supplier A' }]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
        interaction={{
          onOpenChange: (nextOpen, details) => {
            onOpenChange(nextOpen, details);
            details.cancel();
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: expect.any(String) })
    );
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lets callers declare disabled items without relying on object shape', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={['active', 'archived']}
        value={null}
        onValueChange={onValueChange}
        item={{
          toLabel: value => (value === 'active' ? 'Aktif' : 'Diarsipkan'),
          toValue: value => value,
          isDisabled: value => value === 'archived',
        }}
        field={{ name: 'status' }}
        search={{ enabled: false }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const disabledOption = screen.getByRole('option', { name: /diarsipkan/i });

    expect(disabledOption.hasAttribute('data-disabled')).toBe(true);
    fireEvent.click(disabledOption);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('selects non-searchable preset options from trigger keyboard state', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={['active', 'inactive']}
        value={null}
        onValueChange={onValueChange}
        item={{
          toLabel: value => (value === 'active' ? 'Aktif' : 'Tidak aktif'),
          toValue: value => value,
        }}
        field={{ name: 'status' }}
        search={{ enabled: false }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => {
      const activeDescendant = trigger.getAttribute('aria-activedescendant');
      expect(activeDescendant).toBeTruthy();
      expect(
        document.getElementById(activeDescendant as string)?.textContent
      ).toBe('Tidak aktif');
    });

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      'inactive',
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('continues non-searchable trigger navigation from the selected option', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={['active', 'inactive', 'paused']}
        value="inactive"
        onValueChange={onValueChange}
        item={{
          toLabel: value => {
            if (value === 'active') return 'Aktif';
            if (value === 'inactive') return 'Tidak aktif';
            return 'Ditahan';
          },
          toValue: value => value,
        }}
        field={{ name: 'status' }}
        search={{ enabled: false }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /tidak aktif/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const activeDescendant = trigger.getAttribute('aria-activedescendant');
      expect(activeDescendant).toBeTruthy();
      expect(
        document.getElementById(activeDescendant as string)?.textContent
      ).toBe('Tidak aktif');
    });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => {
      const activeDescendant = trigger.getAttribute('aria-activedescendant');
      expect(activeDescendant).toBeTruthy();
      expect(
        document.getElementById(activeDescendant as string)?.textContent
      ).toBe('Ditahan');
    });

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      'paused',
      expect.objectContaining({ reason: 'item-press' })
    );
  });
});
