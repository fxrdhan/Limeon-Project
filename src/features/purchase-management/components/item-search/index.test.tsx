import React, { createRef, useMemo, useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ItemSearchBar from './index';
import type { Item, ItemSearchBarRef } from '@/types';

const makeItem = (id: string, code: string, name: string): Item => ({
  id,
  name,
  code,
  manufacturer: { id: 'man-1', name: 'Manufacturer A' },
  barcode: null,
  image_urls: null,
  base_price: 1000,
  sell_price: 1200,
  stock: 20,
  base_unit: 'Unit',
  package_conversions: [],
  category: { name: 'Category A' },
  type: { name: 'Type A' },
  package: { name: 'Package A' },
  unit: { name: 'Unit' },
});

const SOURCE_ITEMS: Item[] = [
  makeItem('item-1', 'ITM-001', 'Paracetamol'),
  makeItem('item-2', 'ITM-002', 'Ibuprofen'),
  makeItem('item-3', 'ITM-003', 'Amoxicillin'),
];

interface HarnessProps {
  initialSearch?: string;
  sourceItems?: Item[];
  isAddItemButtonDisabled?: boolean;
  onSelectSpy?: (item: Item | null) => void;
  onOpenAddItemPortal?: () => void;
}

const TestHarness = ({
  initialSearch = '',
  sourceItems = SOURCE_ITEMS,
  isAddItemButtonDisabled = false,
  onSelectSpy = vi.fn(),
  onOpenAddItemPortal = vi.fn(),
}: HarnessProps) => {
  const [searchItem, setSearchItem] = useState(initialSearch);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const filteredItems = useMemo(() => {
    const keyword = searchItem.trim().toLowerCase();
    if (!keyword) return sourceItems;
    return sourceItems.filter(item =>
      `${item.code ?? ''} ${item.name}`.toLowerCase().includes(keyword)
    );
  }, [searchItem, sourceItems]);

  return (
    <div>
      <ItemSearchBar
        searchItem={searchItem}
        onSearchItemChange={setSearchItem}
        items={filteredItems}
        selectedItem={selectedItem}
        onSelectItem={item => {
          setSelectedItem(item);
          onSelectSpy(item);
        }}
        onOpenAddItemPortal={onOpenAddItemPortal}
        isAddItemButtonDisabled={isAddItemButtonDisabled}
      />
      <div data-testid="selected-item">{selectedItem?.name ?? 'none'}</div>
      <div data-testid="search-item">{searchItem}</div>
    </div>
  );
};

describe('ItemSearchBar (purchase management)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses input through imperative ref', () => {
    const ref = createRef<ItemSearchBarRef>();

    render(
      <ItemSearchBar
        ref={ref}
        searchItem=""
        onSearchItemChange={vi.fn()}
        items={[]}
        selectedItem={null}
        onSelectItem={vi.fn()}
        onOpenAddItemPortal={vi.fn()}
      />
    );

    act(() => {
      ref.current?.focus();
    });

    expect(
      screen.getByPlaceholderText('Cari nama atau kode item...')
    ).toHaveFocus();
  });

  it('opens dropdown on typing, selects item, and clears selected item when query changes', async () => {
    const onSelectSpy = vi.fn();
    render(<TestHarness onSelectSpy={onSelectSpy} />);

    const input = screen.getByPlaceholderText('Cari nama atau kode item...');
    act(() => {
      input.focus();
    });
    fireEvent.change(input, { target: { value: 'para' } });

    const rowLabel = await screen.findByText(/ITM-001/);
    fireEvent.click(rowLabel);

    expect(screen.getByTestId('selected-item')).toHaveTextContent(
      'Paracetamol'
    );
    expect(onSelectSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-1', name: 'Paracetamol' })
    );

    fireEvent.change(input, { target: { value: 'ibu' } });

    await waitFor(() => {
      expect(screen.getByTestId('selected-item')).toHaveTextContent('none');
      expect(onSelectSpy).toHaveBeenLastCalledWith(null);
    });
  });

  it('supports keyboard navigation and selection from dropdown list', async () => {
    render(<TestHarness initialSearch="i" />);

    const input = screen.getByPlaceholderText('Cari nama atau kode item...');
    act(() => {
      input.focus();
    });

    await screen.findByText(/ITM-002/);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'PageDown' });
    fireEvent.keyDown(input, { key: 'PageUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('selected-item')).toHaveTextContent(
      'Paracetamol'
    );
  });

  it('opens add-item portal from keyboard when no result and handles add button keyboard controls', async () => {
    const onOpenAddItemPortal = vi.fn();
    render(
      <TestHarness
        initialSearch="not-found-keyword"
        isAddItemButtonDisabled={false}
        onOpenAddItemPortal={onOpenAddItemPortal}
      />
    );

    const input = screen.getByPlaceholderText('Cari nama atau kode item...');
    const addButton = screen.getByRole('button', { name: /Tambah Item Baru/i });

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(addButton, { key: 'Enter' });

    addButton.focus();
    fireEvent.keyDown(addButton, { key: 'Escape' });

    await waitFor(() => {
      expect(onOpenAddItemPortal).toHaveBeenCalledTimes(2);
      expect(input).toHaveFocus();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
    });
  });

  it('closes dropdown from outside click, blur, and escape', async () => {
    render(<TestHarness initialSearch="item" />);

    const input = screen.getByPlaceholderText('Cari nama atau kode item...');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'itm' } });
    await screen.findByText(/ITM-001/);

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText(/ITM-001/)).not.toBeInTheDocument();
    });

    fireEvent.focus(input);
    await screen.findByText(/ITM-001/);
    fireEvent.blur(input, { relatedTarget: null });

    await waitFor(() => {
      expect(screen.queryByText(/ITM-001/)).not.toBeInTheDocument();
    });

    fireEvent.focus(input);
    await screen.findByText(/ITM-001/);
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText(/ITM-001/)).not.toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
    });
  });

  it('handles hover highlight and closes when search is cleared', async () => {
    render(<TestHarness initialSearch="para" />);

    const input = screen.getByPlaceholderText('Cari nama atau kode item...');
    fireEvent.focus(input);

    const row = await screen.findByText(/ITM-001/);
    fireEvent.mouseEnter(row);

    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText(/ITM-001/)).not.toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
    });
  });
});
