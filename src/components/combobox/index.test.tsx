import React, { useState } from 'react';
import {
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
      name="fruit"
    >
      <Combobox.Label>Fruit</Combobox.Label>
      <Combobox.Trigger placeholder="Choose fruit" />
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.SearchInput placeholder="Search fruit" />
            <Combobox.List />
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

describe('Combobox primitive', () => {
  it('supports controlled value and writes a hidden form value', () => {
    const onValueChange = vi.fn();
    render(<BasicCombobox onValueChange={onValueChange} />);

    const trigger = screen.getByRole('button', { name: /fruit/i });
    expect(trigger.textContent).toContain('Apple');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /banana/i }));

    expect(onValueChange).toHaveBeenCalledWith('Banana');
    expect(
      screen.getByRole('button', { name: /fruit/i }).textContent
    ).toContain('Banana');
    expect(
      document.querySelector('input[name="fruit"]')?.getAttribute('value')
    ).toBe('Banana');
  });

  it('supports defaultValue and multiple selection', () => {
    render(
      <Combobox.Root
        items={fruitItems}
        defaultValue={['Apple']}
        multiple
        name="fruit"
      >
        <Combobox.Trigger />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('button', { name: /apple/i }));
    fireEvent.click(screen.getByRole('option', { name: /banana/i }));

    const hiddenValues = Array.from(
      document.querySelectorAll('input[name="fruit"]')
    ).map(input => input.getAttribute('value'));
    expect(hiddenValues).toEqual(['Apple', 'Banana']);
  });

  it('highlights and scrolls the last selected option when the popup opens', async () => {
    const scrollIntoView = vi.fn();
    const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView'
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(
        <Combobox.Root items={fruitItems} defaultValue="Cherry">
          <Combobox.Trigger />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      );

      fireEvent.click(screen.getByRole('button', { name: /cherry/i }));
      const cherryOption = screen.getByRole('option', { name: /cherry/i });

      await waitFor(() => {
        expect(cherryOption.hasAttribute('data-highlighted')).toBe(true);
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
      });
    } finally {
      if (scrollIntoViewDescriptor) {
        Object.defineProperty(
          HTMLElement.prototype,
          'scrollIntoView',
          scrollIntoViewDescriptor
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('supports object-valued items with custom equality and stringification', () => {
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
        <Combobox.Trigger />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('button', { name: /alpha copy/i }));
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

  it('filters from input and accepts caller-supplied filteredItems', () => {
    const { rerender } = render(<BasicCombobox />);

    fireEvent.click(screen.getByRole('button', { name: /fruit/i }));
    fireEvent.change(screen.getByPlaceholderText('Search fruit'), {
      target: { value: 'cher' },
    });
    expect(screen.getByRole('option', { name: /cherry/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /banana/i })).toBeNull();

    rerender(
      <Combobox.Root items={fruitItems} filteredItems={['Banana']}>
        <Combobox.Trigger />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );
    fireEvent.click(screen.getByRole('button', { name: /pilih/i }));
    expect(screen.getByRole('option', { name: /banana/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /apple/i })).toBeNull();
  });

  it('supports collection grouping and list-only popup composition', () => {
    render(
      <Combobox.Root items={fruitItems} filter={null}>
        <Combobox.Trigger>Open list</Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Collection label="Group A" items={['Apple']}>
                  {(item, index) => (
                    <Combobox.Item key={item} item={item} index={index} />
                  )}
                </Combobox.Collection>
                <Combobox.Collection label="Group B" items={['Banana']} />
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('button', { name: /open list/i }));
    expect(screen.getByText('Group A')).toBeTruthy();
    expect(screen.getByRole('option', { name: /apple/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /banana/i })).toBeTruthy();
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  it('flips the portal position above the trigger when bottom space is constrained', () => {
    render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Trigger>Open</Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const trigger = screen.getByRole('button', { name: /open/i });
    const popup = screen.getByRole('dialog');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(trigger, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 16,
        y: 90,
        top: 90,
        right: 136,
        bottom: 110,
        left: 16,
        width: 120,
        height: 20,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(popup, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        right: 120,
        bottom: 80,
        left: 0,
        width: 120,
        height: 80,
        toJSON: () => ({}),
      }),
    });

    fireEvent(window, new Event('resize'));

    expect(popup.parentElement?.getAttribute('data-side')).toBe('top');
    expect(popup.parentElement?.hasAttribute('data-positioned')).toBe(true);
    expect(popup.getAttribute('data-side')).toBe('top');
    expect(popup.hasAttribute('data-positioned')).toBe(true);
    expect(popup.style.maxHeight).toBe('78px');
  });

  it('reports highlight reasons and supports cancelable open and value events', () => {
    const onItemHighlighted = vi.fn();
    const onOpenChange = vi.fn((_: boolean, details) => details.cancel());
    const onValueChange = vi.fn((_: string | null, details) =>
      details.cancel()
    );

    const { rerender } = render(
      <Combobox.Root
        key="cancel-open"
        items={fruitItems}
        onOpenChange={onOpenChange}
        onItemHighlighted={onItemHighlighted}
      >
        <Combobox.Trigger>Open</Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: 'trigger-press' })
    );

    rerender(
      <Combobox.Root
        key="cancel-value"
        items={fruitItems}
        defaultOpen
        onValueChange={onValueChange}
        onItemHighlighted={onItemHighlighted}
      >
        <Combobox.Trigger>Open</Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.mouseEnter(screen.getByRole('option', { name: /banana/i }));
    expect(onItemHighlighted).toHaveBeenCalledWith(
      'Banana',
      expect.objectContaining({ reason: 'pointer', index: 1 })
    );
    fireEvent.click(screen.getByRole('option', { name: /banana/i }));
    expect(onValueChange).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /open/i })).toBeTruthy();
  });

  it('merges render props with refs, event handlers, classes, and styles', () => {
    const elementClick = vi.fn();
    const rootClick = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        render={(props, state) => (
          <div
            {...props}
            data-root-open={state.open}
            className={`${props.className ?? ''} custom-root`}
          />
        )}
        className="base-root"
        onClick={rootClick}
      >
        <Combobox.Trigger
          render={
            <button
              type="button"
              className="custom-trigger"
              style={{ color: 'red' }}
              onClick={elementClick}
            />
          }
        />
      </Combobox.Root>
    );

    const root = document.querySelector('.custom-root');
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(root?.className).toContain('base-root');
    expect(trigger.className).toContain('custom-trigger');
    expect(trigger.getAttribute('style')).toContain('color: red');
    expect(elementClick).toHaveBeenCalled();
    expect(rootClick).toHaveBeenCalled();
  });

  it('handles disabled, readOnly, required, and modal body scroll lock states', () => {
    const { rerender } = render(
      <Combobox.Root items={fruitItems} disabled required name="fruit">
        <Combobox.Trigger>Disabled</Combobox.Trigger>
      </Combobox.Root>
    );

    const disabledButton = screen.getByRole('button', {
      name: /disabled/i,
    }) as HTMLButtonElement;
    expect(disabledButton.disabled).toBe(true);
    expect(
      document.querySelector('input[name="fruit"]')?.hasAttribute('required')
    ).toBe(true);

    rerender(
      <Combobox.Root key="readonly" items={fruitItems} readOnly defaultOpen>
        <Combobox.Trigger>Read only</Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );
    fireEvent.click(screen.getByRole('option', { name: /banana/i }));
    expect(screen.getByRole('button', { name: /read only/i })).toBeTruthy();

    rerender(
      <Combobox.Root key="modal" items={fruitItems} defaultOpen modal>
        <Combobox.Trigger>Modal</Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });
});

describe('Combobox app presets', () => {
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

    const trigger = screen.getByRole('button', { name: /pilih kategori/i });
    fireEvent.blur(trigger);
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Analgesik' },
    });
    fireEvent.click(screen.getByRole('button', { name: /tambah kategori/i }));

    expect(onCreate).toHaveBeenCalledWith('Analgesik');
    expect(screen.getByText('Field ini wajib diisi')).toBeTruthy();
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

    fireEvent.click(screen.getByRole('button', { name: /belum dibayar/i }));
    fireEvent.click(screen.getByRole('option', { name: /lunas/i }));
    expect(onEnumChange).toHaveBeenCalledWith('paid');

    fireEvent.click(screen.getByRole('button', { name: /januari/i }));
    fireEvent.click(screen.getByRole('option', { name: /februari/i }));
    expect(onMonthChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: /supplier a/i }));
    const supplierList = screen.getAllByRole('listbox').at(-1);
    expect(supplierList).toBeTruthy();
    fireEvent.click(
      within(supplierList as HTMLElement).getByText('Supplier B')
    );
    expect(onSupplierChange).toHaveBeenCalledWith('supplier-b');
  });
});
