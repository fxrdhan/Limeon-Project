import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Item } from '../../types/database';
import ItemSearchBar from '.';

const buildItem = (overrides: Partial<Item> = {}): Item => ({
  id: overrides.id ?? 'item-1',
  name: overrides.name ?? 'Paracetamol',
  display_name: overrides.display_name ?? 'Paracetamol 500 mg',
  manufacturer: overrides.manufacturer ?? { name: 'Generik' },
  code: overrides.code ?? 'PRC-500',
  barcode: overrides.barcode ?? null,
  image_urls: overrides.image_urls ?? null,
  base_price: overrides.base_price ?? 5000,
  sell_price: overrides.sell_price ?? 6500,
  stock: overrides.stock ?? 12,
  package_conversions: overrides.package_conversions ?? [],
  inventory_units: overrides.inventory_units ?? [],
  category: overrides.category ?? { name: 'Obat' },
  type: overrides.type ?? { name: 'Tablet' },
  package: overrides.package ?? { name: 'Strip' },
  unit: overrides.unit ?? { name: 'Tablet' },
});

const renderControlledItemSearch = () => {
  const item = buildItem();
  const onSelectItem = vi.fn();
  const onOpenAddItemPortal = vi.fn();

  const Wrapper = () => {
    const [searchItem, setSearchItem] = useState('');

    return (
      <ItemSearchBar
        searchItem={searchItem}
        onSearchItemChange={setSearchItem}
        items={[item]}
        selectedItem={null}
        onSelectItem={onSelectItem}
        onOpenAddItemPortal={onOpenAddItemPortal}
        isAddItemButtonDisabled={false}
      />
    );
  };

  return {
    ...render(<Wrapper />),
    item,
    onOpenAddItemPortal,
    onSelectItem,
  };
};

describe('ItemSearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect = vi.fn();
        observe = vi.fn();
        unobserve = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not let a stale close timer hide a dropdown reopened by typing', async () => {
    renderControlledItemSearch();

    const input = screen.getByPlaceholderText('Cari nama atau kode item...');

    input.focus();
    fireEvent.change(input, { target: { value: 'para' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });

    expect(
      screen.getByRole('button', { name: /Paracetamol 500 mg/ }).textContent
    ).toContain('Paracetamol 500 mg');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'para' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(220);
    });

    expect(
      screen.getByRole('button', { name: /Paracetamol 500 mg/ }).textContent
    ).toContain('Paracetamol 500 mg');
  });
});
