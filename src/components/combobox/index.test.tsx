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
import FormField from '../form-field';
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
} from '../shared/keyboard-pinned-highlight';
import {
  Combobox,
  findComboboxItemByValue,
  PharmaComboboxSelect,
  PharmaEntityComboboxSelect,
} from './index';
import { getComboboxKeyboardHighlightScrollTarget } from './hooks/use-combobox-keyboard-highlight-scroll';
import { setupUserEvent } from '../../test/user-event';

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
            <Combobox.List<string>>
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
  it('uses the local primitive value and item contract', async () => {
    const onValueChange = vi.fn();
    const user = setupUserEvent();
    render(<BasicCombobox onValueChange={onValueChange} />);

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: /banana/i }));

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
              <Combobox.List<{ id: string; name: string }>>
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

  it('keeps label htmlFor aligned with a custom primitive trigger id', async () => {
    render(
      <Combobox.Root items={fruitItems}>
        <Combobox.Label>Fruit</Combobox.Label>
        <Combobox.Trigger id="fruit-trigger">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
      </Combobox.Root>
    );

    await waitFor(() => {
      expect(screen.getByText('Fruit').getAttribute('for')).toBe(
        'fruit-trigger'
      );
    });
  });

  it('keeps custom primitive label ids connected to trigger and listbox aria', async () => {
    render(
      <Combobox.Root items={fruitItems}>
        <Combobox.Label id="custom-fruit-label">Fruit</Combobox.Label>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
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

    const trigger = await screen.findByRole('combobox', { name: /^fruit$/i });
    expect(trigger.getAttribute('aria-labelledby')).toBe('custom-fruit-label');

    fireEvent.click(trigger);

    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      'custom-fruit-label'
    );
  });

  it('keeps highlight event cancellation state observable', async () => {
    const onHighlightCanceled = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        onItemHighlighted={(item, details) => {
          if (!item) return;

          details.cancel();
          onHighlightCanceled(details.isCanceled);
        }}
        autoHighlight
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
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

    await waitFor(() => {
      expect(onHighlightCanceled).toHaveBeenCalledWith(true);
    });
  });

  it('lets callers cancel highlight changes before state commits', async () => {
    const onItemHighlighted = vi.fn(
      (_item: string | undefined, details: { cancel: () => void }) => {
        details.cancel();
      }
    );

    render(
      <Combobox.Root
        items={fruitItems}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        onItemHighlighted={onItemHighlighted}
        autoHighlight
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
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

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(onItemHighlighted).toHaveBeenCalled();
    });
    expect(trigger.getAttribute('aria-activedescendant')).toBeNull();
    expect(
      screen
        .getByRole('option', { name: /apple/i })
        .hasAttribute('data-highlighted')
    ).toBe(false);
  });

  it('keeps required semantics out of the hidden submitted value', () => {
    render(
      <Combobox.Root
        items={fruitItems}
        value="Apple"
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        name="required_fruit"
        required
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
      </Combobox.Root>
    );

    const hiddenInput = document.querySelector('input[name="required_fruit"]');
    expect(hiddenInput?.getAttribute('value')).toBe('Apple');
    expect(hiddenInput?.hasAttribute('required')).toBe(false);
  });

  it('filters with the native input and accepts caller-supplied filteredItems', async () => {
    const user = setupUserEvent();
    const { rerender } = render(<BasicCombobox />);

    await user.click(screen.getByRole('combobox', { name: /fruit/i }));
    await user.type(screen.getByPlaceholderText('Search fruit'), 'cher');
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
              <Combobox.List<string>>
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

  it('uses Floating UI sizing variables for the primitive popup', async () => {
    const innerHeightDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'innerHeight'
    );
    const innerWidthDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'innerWidth'
    );

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    });

    try {
      render(<BasicCombobox />);

      const trigger = screen.getByRole('combobox', { name: /fruit/i });
      Object.defineProperty(trigger, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          bottom: 590,
          height: 30,
          left: 16,
          right: 216,
          toJSON: () => {},
          top: 560,
          width: 200,
          x: 16,
          y: 560,
        }),
      });

      fireEvent.click(trigger);

      const listbox = await screen.findByRole('listbox');
      const positioner = listbox.parentElement?.parentElement;
      expect(positioner?.style.position).toBe('fixed');
      expect(positioner?.style.width).toBe('var(--anchor-width)');
      expect(positioner?.style.maxHeight).toBe('var(--available-height)');
      expect(positioner?.style.overflow).toBe('visible');
    } finally {
      if (innerHeightDescriptor) {
        Object.defineProperty(window, 'innerHeight', innerHeightDescriptor);
      }
      if (innerWidthDescriptor) {
        Object.defineProperty(window, 'innerWidth', innerWidthDescriptor);
      }
    }
  });

  it('uses root autocomplete as the primitive input default', () => {
    const AutoCompleteCombobox = ({
      inputAutoComplete,
    }: {
      inputAutoComplete?: string;
    }) => (
      <Combobox.Root items={fruitItems} defaultOpen autoComplete="off">
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input
                placeholder="Search fruit"
                autoComplete={inputAutoComplete}
              />
              <Combobox.List<string>>
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
    const { rerender } = render(<AutoCompleteCombobox />);

    expect(
      screen.getByPlaceholderText('Search fruit').getAttribute('autocomplete')
    ).toBe('off');

    rerender(<AutoCompleteCombobox inputAutoComplete="new-password" />);

    expect(
      screen.getByPlaceholderText('Search fruit').getAttribute('autocomplete')
    ).toBe('new-password');
  });

  it('focuses the first popup control when primitive initialFocus is enabled', async () => {
    render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus>
              <Combobox.Input placeholder="Search fruit" />
              <Combobox.List<string>>
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

    const searchInput = screen.getByPlaceholderText('Search fruit');
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
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
    fireEvent.blur(trigger, { relatedTarget: document.body });
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
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    const validationDescriptionId = trigger.getAttribute('aria-describedby');
    expect(validationDescriptionId).toBeTruthy();
    expect(
      document.getElementById(validationDescriptionId as string)?.textContent
    ).toBe('Field ini wajib diisi');
  });

  it('offers create action for non-exact searches even when partial matches exist', () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="medicine_id"
        items={[{ id: 'amox-250', name: 'Amoxicillin 250' }]}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        createAction={{ onCreate, label: 'Tambah obat' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Amox' } });

    expect(
      screen.getByRole('option', { name: /amoxicillin 250/i })
    ).toBeTruthy();
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onCreate).toHaveBeenCalledWith('Amox');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('does not mark required fields invalid while focus stays inside the popup', () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'category-a', name: 'Kategori A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        required
        validation={{ enabled: true, autoHide: false }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    fireEvent.click(trigger);
    const searchInput = screen.getByPlaceholderText('Cari...');

    fireEvent.blur(trigger, { relatedTarget: searchInput });
    expect(trigger.getAttribute('aria-invalid')).toBeNull();

    fireEvent.blur(searchInput, { relatedTarget: document.body });
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
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
    fireEvent.blur(trigger, { relatedTarget: document.body });

    expect(trigger.getAttribute('aria-invalid')).toBe('true');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /^aktif$/i }));

    expect(onValueChange).toHaveBeenCalledWith(
      'active',
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('preserves cancelable details for preset value changes', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={(item, details) => {
          onValueChange(item, details);
          details.cancel();
        }}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
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
        name="supplier_id"
        items={[{ id: 'a', name: 'Supplier A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        onOpenChange={(nextOpen, details) => {
          onOpenChange(nextOpen, details);
          details.cancel();
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
        name="status"
        items={['active', 'archived']}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={value =>
          value === 'active' ? 'Aktif' : 'Diarsipkan'
        }
        itemToStringValue={value => value}
        isItemDisabled={value => value === 'archived'}
        searchable={false}
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
        name="status"
        items={['active', 'inactive']}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={value =>
          value === 'active' ? 'Aktif' : 'Tidak aktif'
        }
        itemToStringValue={value => value}
        searchable={false}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
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

    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: 'escape-key' })
    );
    expect((searchInput as HTMLInputElement).value).toBe('Supplier B');
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
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

  it('keeps arrow navigation from visually activating the popup search input', () => {
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
    const searchInput = screen.getByPlaceholderText('Cari...');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(true);

    fireEvent.keyDown(searchInput, { key: 'b' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(false);

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(true);

    fireEvent.pointerDown(searchInput);
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(false);
  });

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

    fireEvent.click(screen.getByRole('combobox', { name: /supplier b/i }));
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
    expect(listbox.querySelector('[data-pharma-combobox-index]')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'gada' },
    });

    expect(listbox.querySelector('[data-pharma-combobox-index]')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Tidak ada data');
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

  it('pins the visual highlight to the list edge during keyboard scroll', () => {
    const root = document.createElement('div');
    const listbox = document.createElement('div');
    const optionA = document.createElement('div');
    const optionB = document.createElement('div');

    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 32 },
      scrollHeight: { configurable: true, value: 66 },
      scrollTop: { configurable: true, value: 0 },
    });
    Object.defineProperties(optionA, {
      offsetTop: { configurable: true, value: 0 },
      offsetHeight: { configurable: true, value: 28 },
    });
    Object.defineProperties(optionB, {
      offsetTop: { configurable: true, value: 34 },
      offsetHeight: { configurable: true, value: 28 },
    });
    Object.defineProperty(root, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 220,
        toJSON: () => {},
        top: 0,
        width: 220,
        x: 0,
        y: 0,
      }),
    });
    Object.defineProperty(listbox, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 72,
        height: 32,
        left: 8,
        right: 208,
        toJSON: () => {},
        top: 40,
        width: 200,
        x: 8,
        y: 40,
      }),
    });
    Object.defineProperty(optionA, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 70,
        height: 28,
        left: 8,
        right: 208,
        toJSON: () => {},
        top: 42,
        width: 200,
        x: 8,
        y: 42,
      }),
    });

    const scrollTarget = getKeyboardScrollTarget({
      container: listbox,
      itemCount: 2,
      targetElement: optionB,
      targetIndex: 1,
    });
    expect(scrollTarget).toEqual({ direction: 'down', scrollTop: 34 });
    expect(
      getKeyboardPinnedHighlightFrame({
        container: listbox,
        frameRootElement: root,
        scrollDirection: scrollTarget?.direction ?? 'down',
        sourceElement: optionA,
        targetElement: optionB,
      })
    ).toEqual({
      height: 28,
      left: 8,
      top: 40,
      width: 200,
    });
  });

  it('forces wrapped keyboard scroll to the exact list edges', () => {
    const listbox = document.createElement('div');
    const targetOption = document.createElement('div');

    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 32 },
      scrollHeight: { configurable: true, value: 96 },
      scrollTop: { configurable: true, value: 12 },
    });
    Object.defineProperties(targetOption, {
      offsetTop: { configurable: true, value: 16 },
      offsetHeight: { configurable: true, value: 12 },
    });

    expect(
      getComboboxKeyboardHighlightScrollTarget({
        container: listbox,
        itemCount: 5,
        sourceIndex: 4,
        targetElement: targetOption,
        targetIndex: 0,
      })
    ).toEqual({ direction: 'up', scrollTop: 0, wrapped: true });
    expect(
      getComboboxKeyboardHighlightScrollTarget({
        container: listbox,
        itemCount: 5,
        sourceIndex: 0,
        targetElement: targetOption,
        targetIndex: 4,
      })
    ).toEqual({ direction: 'down', scrollTop: 64, wrapped: true });
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

  it('reports hover detail fetch failures without dropping base option data', async () => {
    const fetchError = new Error('fetch failed');
    const onFetchHoverDetail = vi.fn(async () => {
      throw fetchError;
    });
    const onFetchHoverDetailError = vi.fn();

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
        onFetchHoverDetailError={onFetchHoverDetailError}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    fireEvent.mouseEnter(screen.getByRole('option', { name: /analgesik/i }));

    await waitFor(() => {
      expect(onFetchHoverDetailError).toHaveBeenCalledWith(
        fetchError,
        'analgesik'
      );
    });
    expect(screen.getAllByText('Analgesik').length).toBeGreaterThan(0);
  });

  it('does not run close cleanup when a controlled popup stays open', async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: 'Supplier B',
      description: 'Detail Supplier B',
    }));

    try {
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
          hoverDetail={{ enabled: true, delay: 0 }}
          onFetchHoverDetail={onFetchHoverDetail}
          open
          onOpenChange={onOpenChange}
        />
      );

      const supplierB = screen.getByRole('option', { name: /supplier b/i });
      fireEvent.mouseEnter(supplierB);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onFetchHoverDetail).toHaveBeenCalledWith('b');
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );

      fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
        key: 'Escape',
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(onOpenChange).toHaveBeenCalledWith(
        false,
        expect.objectContaining({ reason: 'escape-key' })
      );
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );
    } finally {
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
