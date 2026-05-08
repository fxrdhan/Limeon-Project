import React, { useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { findComboboxItemByValue } from './helpers';
import { Combobox } from './index';
import { PharmaComboboxSelect } from './presets';

const fruitItems = ['Apple', 'Banana', 'Cherry'];
type EntityItem = { id: string; name: string };

function BasicCombobox({
  onValueChange,
}: {
  onValueChange?: (value: string | null) => void;
}) {
  const [value, setValue] = useState<string | null>('Apple');

  return (
    <Combobox.Root
      items={fruitItems}
      value={value}
      onValueChange={(nextValue, details) => {
        setValue(nextValue);
        onValueChange?.(nextValue);
        expect(details.reason).toBe('item-press');
      }}
      itemToStringLabel={item => item}
      itemToStringValue={item => item}
      name="fruit"
      autoHighlight
    >
      <Combobox.Label>Fruit</Combobox.Label>
      <Combobox.Trigger>
        <Combobox.Value placeholder="Choose fruit" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup initialFocus={false}>
            <Combobox.Input placeholder="Search fruit" />
            <Combobox.List>
              {(item, index) => (
                <Combobox.Item key={item} value={item} index={index}>
                  {item}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

describe('Combobox primitive', () => {
  it('uses the official Base UI value and item contract', () => {
    const onValueChange = vi.fn();
    render(<BasicCombobox onValueChange={onValueChange} />);

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /banana/i }));

    expect(onValueChange).toHaveBeenCalledWith('Banana');
    expect(trigger.textContent).toContain('Banana');
    expect(
      document.querySelector('input[name="fruit"]')?.getAttribute('value')
    ).toBe('Banana');
  });

  it('keeps object values native while using custom equality and stringification', () => {
    const items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];
    const selected = { id: 'a', name: 'Alpha copy' };
    const onValueChange = vi.fn();

    render(
      <Combobox.Root
        items={items}
        value={selected}
        onValueChange={onValueChange}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        isItemEqualToValue={(item, value) => item.id === value.id}
        name="entity_id"
      >
        <Combobox.Trigger aria-label="Entity">
          <Combobox.Value placeholder="Choose entity" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List>
                {(item, index) => (
                  <Combobox.Item key={item.id} value={item} index={index}>
                    {item.name}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /entity/i }));
    expect(
      screen
        .getByRole('option', { name: /alpha/i })
        .hasAttribute('data-selected')
    ).toBe(true);
    fireEvent.click(screen.getByRole('option', { name: /beta/i }));

    expect(onValueChange).toHaveBeenCalledWith(
      items[1],
      expect.objectContaining({ reason: 'item-press' })
    );
    expect(
      document.querySelector('input[name="entity_id"]')?.getAttribute('value')
    ).toBe('a');
  });

  it('filters with the native input and accepts caller-supplied filteredItems', () => {
    const { rerender } = render(<BasicCombobox />);

    fireEvent.click(screen.getByRole('combobox', { name: /fruit/i }));
    fireEvent.change(screen.getByPlaceholderText('Search fruit'), {
      target: { value: 'cher' },
    });
    expect(screen.getByRole('option', { name: /cherry/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /banana/i })).toBeNull();

    rerender(
      <Combobox.Root items={fruitItems} filteredItems={['Banana']}>
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input placeholder="Search fruit" />
              <Combobox.List>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );
    fireEvent.click(screen.getByRole('combobox', { name: /fruit/i }));
    expect(screen.getByPlaceholderText('Search fruit')).toBeTruthy();
    expect(screen.getByRole('option', { name: /banana/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /apple/i })).toBeNull();
  });
});

describe('Combobox app presets', () => {
  it('passes external field labeling to the trigger without labeling popup search as the field', () => {
    render(
      <>
        <label id="supplier-label" htmlFor="supplier-trigger">
          Supplier
        </label>
        <PharmaComboboxSelect<EntityItem>
          id="supplier-trigger"
          name="supplier_id"
          aria-labelledby="supplier-label"
          items={[{ id: 'supplier-a', name: 'Supplier A' }]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          placeholder="Pilih Supplier"
        />
      </>
    );

    const trigger = screen.getByLabelText(/supplier/i);
    expect(trigger.id).toBe('supplier-trigger');
    expect(trigger.getAttribute('aria-labelledby')).toContain('supplier-label');

    fireEvent.click(trigger);
    const searchInput = screen.getByRole('combobox', {
      name: /cari pilih supplier/i,
    });
    expect(searchInput.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('keeps empty status outside the listbox in the standard preset composition', () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
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
        label="Bulan"
        name="month-selector"
        items={[0, 1]}
        value={0}
        onValueChange={() => {}}
        itemToStringLabel={value => (value === 0 ? 'Januari' : 'Februari')}
        itemToStringValue={value => value.toString()}
        placeholder="Pilih bulan"
        searchable={false}
      />
    );

    expect(
      screen.getByRole('combobox', { name: /bulan januari/i })
    ).toBeTruthy();
  });

  it('covers an entity field with validation and add-new action', () => {
    const onCreate = vi.fn();
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        required
        validation={{ enabled: true, autoHide: false }}
        createAction={{ onCreate, label: 'Tambah kategori' }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    fireEvent.blur(trigger);
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Analgesik' },
    });
    const createButton = screen.getByRole('button', {
      name: /tambah kategori/i,
    });
    expect(screen.getByRole('listbox').contains(createButton)).toBe(false);
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledWith('Analgesik');
    expect(screen.getByText('Field ini wajib diisi')).toBeTruthy();
  });

  it('creates a missing entity from the search input with Enter', () => {
    const onCreate = vi.fn();
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        createAction={{ onCreate, label: 'Tambah kategori' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Antibiotik' },
    });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith('Antibiotik');
  });

  it('lets scalar selects declare a non-null empty sentinel', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="status"
        items={['active', 'inactive']}
        value=""
        onValueChange={onValueChange}
        itemToStringLabel={value =>
          value === 'active'
            ? 'Aktif'
            : value === 'inactive'
              ? 'Tidak aktif'
              : ''
        }
        itemToStringValue={value => value}
        placeholder="Pilih status"
        required
        validation={{ enabled: true, autoHide: false }}
        isValueEmpty={value => value === ''}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih status/i });
    fireEvent.blur(trigger);

    expect(screen.getByText('Field ini wajib diisi')).toBeTruthy();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /^aktif$/i }));

    expect(onValueChange).toHaveBeenCalledWith('active');
  });

  it('resets searchable preset input when the popup closes without a selection', () => {
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

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Supplier B' },
    });
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();

    fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
      key: 'Escape',
    });
    fireEvent.click(trigger);

    expect(
      (screen.getByPlaceholderText('Cari...') as HTMLInputElement).value
    ).toBe('');
    expect(screen.getByRole('option', { name: /supplier a/i })).toBeTruthy();
  });

  it('moves and preserves the visual highlight while hovering options', async () => {
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

    fireEvent.pointerLeave(screen.getByRole('listbox'));
    fireEvent.mouseLeave(screen.getByRole('listbox'));

    await waitFor(() => {
      expect(
        supplierA.querySelector('[data-pharma-combobox-highlight]')
      ).toBeNull();
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('routes trigger typing into the open searchable input', () => {
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

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'b' });

    const searchInput = screen.getByPlaceholderText('Cari...');
    expect((searchInput as HTMLInputElement).value).toBe('b');
    expect(document.activeElement).toBe(searchInput);
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
    expect(screen.getByRole('option', { name: /branch b/i })).toBeTruthy();
  });

  it('restores selected highlight when a search is cleared', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Branch B' },
    ];

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={suppliers}
        value={suppliers[0]}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /supplier a/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');

    fireEvent.change(searchInput, { target: { value: 'b' } });
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
    });

    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(
        screen
          .getByRole('option', { name: /supplier a/i })
          .querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
    expect(
      screen
        .getByRole('option', { name: /branch b/i })
        .querySelector('[data-pharma-combobox-highlight]')
    ).toBeNull();
  });

  it('routes trigger arrow keys to option navigation', async () => {
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

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    const supplierB = screen.getByRole('option', { name: /supplier b/i });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(document.activeElement).not.toBe(
      screen.getByPlaceholderText('Cari...')
    );
    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });
  });

  it('ignores stale option hover while navigating with arrow keys until the mouse moves', async () => {
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

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    const supplierA = screen.getByRole('option', { name: /supplier a/i });
    const supplierB = screen.getByRole('option', { name: /supplier b/i });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
    });

    fireEvent.mouseEnter(supplierA);
    expect(
      supplierA.querySelector('[data-pharma-combobox-highlight]')
    ).toBeNull();
    expect(
      supplierB.querySelector('[data-pharma-combobox-highlight]')
    ).toBeTruthy();

    fireEvent.mouseMove(listbox, { clientX: 1, clientY: 1 });
    fireEvent.mouseEnter(supplierA);

    expect(
      supplierA.querySelector('[data-pharma-combobox-highlight]')
    ).toBeTruthy();
  });

  it('keeps searchable preset input when a controlled popup remains open', () => {
    const onOpenChange = vi.fn();
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
        open
        onOpenChange={onOpenChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Supplier B' },
    });
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect((searchInput as HTMLInputElement).value).toBe('Supplier B');
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
  });

  it('shows hover detail data for preset entity options', async () => {
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: 'Analgesik',
      description: 'Detail kategori obat',
    }));

    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'analgesik', name: 'Analgesik' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        hoverDetail={{ enabled: true, delay: 0 }}
        onFetchHoverDetail={onFetchHoverDetail}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    fireEvent.mouseEnter(screen.getByRole('option', { name: /analgesik/i }));

    await waitFor(() => {
      expect(onFetchHoverDetail).toHaveBeenCalledWith('analgesik');
    });
    await waitFor(() => {
      expect(
        screen.getAllByText('Detail kategori obat').length
      ).toBeGreaterThan(0);
    });
  });

  it('coalesces rapid hover detail switches to the final option', async () => {
    vi.useFakeTimers();
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: `Supplier ${id.toUpperCase()}`,
      description: `Detail ${id}`,
    }));

    try {
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
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          hoverDetail={{ enabled: true, delay: 0 }}
          onFetchHoverDetail={onFetchHoverDetail}
        />
      );

      fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
      const supplierA = screen.getByRole('option', { name: /supplier a/i });
      const supplierB = screen.getByRole('option', { name: /supplier b/i });
      const supplierC = screen.getByRole('option', { name: /supplier c/i });

      fireEvent.mouseEnter(supplierA);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(onFetchHoverDetail).toHaveBeenCalledWith('a');

      onFetchHoverDetail.mockClear();
      fireEvent.mouseEnter(supplierB);
      fireEvent.mouseEnter(supplierC);

      expect(onFetchHoverDetail).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(79);
      });
      expect(onFetchHoverDetail).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(onFetchHoverDetail).toHaveBeenCalledTimes(1);
      expect(onFetchHoverDetail).toHaveBeenCalledWith('c');
    } finally {
      vi.useRealTimers();
    }
  });

  it('defers hover detail content changes until list scrolling settles', async () => {
    vi.useFakeTimers();
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: id,
      description: `Detail ${id}`,
    }));

    try {
      render(
        <PharmaComboboxSelect<EntityItem>
          name="supplier_id"
          items={[
            { id: 'a', name: 'Supplier A' },
            { id: 'b', name: 'Supplier B' },
          ]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          hoverDetail={{ enabled: true, delay: 0 }}
          onFetchHoverDetail={onFetchHoverDetail}
        />
      );

      fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
      const listbox = screen.getByRole('listbox');
      const supplierA = screen.getByRole('option', { name: /supplier a/i });
      const supplierB = screen.getByRole('option', { name: /supplier b/i });

      fireEvent.mouseEnter(supplierA);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(onFetchHoverDetail).toHaveBeenCalledWith('a');

      onFetchHoverDetail.mockClear();
      fireEvent.scroll(listbox);
      fireEvent.mouseEnter(supplierB);

      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
      expect(onFetchHoverDetail).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(119);
      });
      expect(onFetchHoverDetail).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(onFetchHoverDetail).toHaveBeenCalledWith('b');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores stale pending hover targets after fast list scroll', async () => {
    vi.useFakeTimers();
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: id,
      description: `Detail ${id}`,
    }));
    const restoreCallbacks: Array<() => void> = [];
    const createRect = ({
      bottom,
      height,
      left,
      right,
      top,
      width,
    }: {
      bottom: number;
      height: number;
      left: number;
      right: number;
      top: number;
      width: number;
    }): DOMRect =>
      ({
        bottom,
        height,
        left,
        right,
        top,
        width,
        x: left,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
    const setElementRect = (
      element: HTMLElement,
      rect: ReturnType<typeof createRect>
    ) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        element,
        'getBoundingClientRect'
      );

      Object.defineProperty(element, 'getBoundingClientRect', {
        configurable: true,
        value: () => rect,
      });

      restoreCallbacks.push(() => {
        if (descriptor) {
          Object.defineProperty(element, 'getBoundingClientRect', descriptor);
          return;
        }

        Reflect.deleteProperty(element, 'getBoundingClientRect');
      });
    };

    try {
      render(
        <PharmaComboboxSelect<EntityItem>
          name="supplier_id"
          items={[
            { id: 'a', name: 'Supplier A' },
            { id: 'b', name: 'Supplier B' },
          ]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          hoverDetail={{ enabled: true, delay: 0 }}
          onFetchHoverDetail={onFetchHoverDetail}
        />
      );

      fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
      const listbox = screen.getByRole('listbox');
      const supplierB = screen.getByRole('option', { name: /supplier b/i });
      const elementFromPointDescriptor = Object.getOwnPropertyDescriptor(
        document,
        'elementFromPoint'
      );
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: () => null,
      });
      restoreCallbacks.push(() => {
        if (elementFromPointDescriptor) {
          Object.defineProperty(
            document,
            'elementFromPoint',
            elementFromPointDescriptor
          );
          return;
        }

        Reflect.deleteProperty(document, 'elementFromPoint');
      });
      setElementRect(
        listbox,
        createRect({
          bottom: 200,
          height: 100,
          left: 0,
          right: 260,
          top: 100,
          width: 260,
        })
      );
      setElementRect(
        supplierB,
        createRect({
          bottom: 280,
          height: 40,
          left: 0,
          right: 260,
          top: 240,
          width: 260,
        })
      );

      fireEvent.scroll(listbox);
      fireEvent.mouseEnter(supplierB);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(120);
      });

      expect(onFetchHoverDetail).not.toHaveBeenCalled();
    } finally {
      restoreCallbacks.reverse().forEach(restore => restore());
      vi.useRealTimers();
    }
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

    fireEvent.click(screen.getByRole('combobox', { name: /januari/i }));
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
